// ==== TriggerActions.js
import { AppState, getPactBetween } from '../shared/GameState.js';

/**
 * Вспомогательный метод разрешения участников события
 */
function resolveEntity(role, context) {
    if (role === 'player') return AppState.player;
    if (context && context[role]) return context[role];
    return AppState.entities?.[AppState.play?.activeCharacterId];
}

export const ActionExecutors = {
    // 1. Создать/удалить флаг
    set_flag(action, context) {
        if (!AppState.flags) AppState.flags = {};

        if (action.operation === 'delete') {
            delete AppState.flags[action.param];
            console.log(`[Trigger Action] Сюжетный флаг "${action.param}" удален.`);
        } else {
            AppState.flags[action.param] = action.value === true;
            console.log(`[Trigger Action] Сюжетный флаг "${action.param}" изменен на: ${action.value}`);
        }
    },

    // 2. Спаун/исчезание персонажа с клетки (персонаж, клетка)
    character_presence(action, context) {
        const charId = action.character_id;
        if (!charId) return;

        if (action.operation === 'despawn') {
            // Мгновенно убираем персонажа из памяти карты
            delete AppState.entities[charId];
            console.log(`[Trigger Action] Персонаж "${charId}" убран с карты.`);
        }
        else if (action.operation === 'spawn') {
            // Спавним нового персонажа из шаблона админки по координатам q, r
            if (action.template) {
                const template = AppState.characters[action.template];

                AppState.characters[charId] = JSON.parse(JSON.stringify(template));
                AppState.characters[charId].id = charId;
                AppState.characters[charId].mapPosition = { q: action.q, r: action.r };
                AppState.entities[charId] = AppState.characters[charId];
                console.log(`[Trigger Action] Персонаж "${charId}" успешно заспавнен на гекс [${action.q}, ${action.r}].`);
            }
        }

        AppState.engine.renderMap();
    },

    // 3. Урон/смерть персонажа (персонаж, урон)
    character_damage(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char || !char.stats) return;

        if (action.operation === 'kill') {
            char.stats.hp = 0;
            console.log(`[Trigger Action] Персонаж ${char.name} принудительно уничтожен триггером.`);
        } else {
            const dmgValue = parseInt(action.value) || 0;
            char.stats.hp = Math.max(0, char.stats.hp - dmgValue);

            // Спавним красивый всплывающий текст урона через твой UI
            if (AppState.engine?.spawnPopupText) {
                AppState.engine.spawnPopupText(char, `-${dmgValue}`, 0xff3333);
            }
            console.log(`[Trigger Action] Триггер нанес ${dmgValue} урона персонажу ${char.name}.`);
        }

        // Обработка смерти
        if (char.stats.hp <= 0 && char.id) {
            if(AppState.characters[char.id]) AppState.characters[char.id].isDead = true;
            if(AppState.objects[char.id]) AppState.objects[char.id].isDead = true;
            delete AppState.entities[char.id];
            if (AppState.engine?.flashDamage) AppState.engine.flashDamage(char.id);
        }

        AppState.engine.renderMap();
    },

    // 4. Перемещение персонажа с клетки на клетка (МГНОВЕННЫЙ ТЕЛЕПОРТ)
    character_teleport(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char) return;

        // Если в экшене явно переданы q2 и r2 — телепортируем туда, иначе берем из конфига назначения
        const targetQ = action.q2 !== undefined ? action.q2 : action.q;
        const targetR = action.r2 !== undefined ? action.r2 : action.r;

        char.mapPosition = { q: targetQ, r: targetR };
        console.log(`[Trigger Action] ${char.name} мгновенно телепортирован на гекс [${targetQ}, ${targetR}].`);

        AppState.engine.renderMap();;
    },

    // 5. Движение (родное, по функциям) персонажа с клетки на клетку (ПЛАВНЫЙ ХОД)
    character_walk(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char || !char.id || !AppState.engine?.movementManager) return;

        const targetQ = action.q2 !== undefined ? action.q2 : action.q;
        const targetR = action.r2 !== undefined ? action.r2 : action.r;

        console.log(`[Trigger Action] Запуск нативного движения для ${char.name} к точке [${targetQ}, ${targetR}]...`);

        // Вызываем твой рабочий менеджер перемещений.
        // Он сам посчитает путь A* и запишет его в char.currentActivePath, как ты исправил баг
        AppState.engine.movementManager.moveCharacterToTile(char.id, { q: targetQ, r: targetR });
    },

    // 4.б (Дубль 4 в твоем списке). Получение/удаление предмета (персонаж, предмет, количество)
    modify_inventory(action, context) {
        const char = resolveEntity(action.character_role || 'player', context);
        if (!char) return;
        if (!char.inventory) char.inventory = {};

        const itemId = action.item_id;
        const amount = parseInt(action.value) || 1;

        if (action.operation === 'remove') {
            if (char.inventory[itemId]) {
                char.inventory[itemId] = Math.max(0, char.inventory[itemId] - amount);
                if (char.inventory[itemId] === 0) delete char.inventory[itemId]; // чистим ноль
                console.log(`[Trigger Action] Из инвентаря ${char.name || 'игрока'} изъято ${amount} шт. [${itemId}].`);
            }
        } else {
            // Добавление предмета
            char.inventory[itemId] = (char.inventory[itemId] || 0) + amount;
            if (AppState.engine?.spawnPopupText) {
                AppState.engine.spawnPopupText(char, `+${amount} ${itemId}`, 0xffd166);
            }
            console.log(`[Trigger Action] В инвентарь ${char.name || 'игрока'} добавлено ${amount} шт. [${itemId}].`);
        }
    },

    // 5.б (Дубль 5 в твоем списке). Изменение пакта дипломатии (фракция 1, фракция 2, пакт)
    modify_diplomatic_pact(action, context) {
        const f1 = action.faction1 || AppState.player?.faction;
        const f2 = action.faction2;
        if (!f1 || !f2) return;

        if (!AppState.pacts) AppState.pacts = {};
        if (!AppState.pacts[f1]) AppState.pacts[f1] = {};

        // Мутируем глобальную матрицу дипломатических отношений
        AppState.pacts[f1][f2] = action.value; // 'WAR', 'ALLIANCE', 'NONE'

        // Зеркально обновляем отношение второй фракции к первой для честной симуляции
        if (!AppState.pacts[f2]) AppState.pacts[f2] = {};
        AppState.pacts[f2][f1] = action.value;

        console.log(`[Trigger Action] Дипломатический пакт между ${f1} и ${f2} изменен на: ${action.value}`);
    },

    // 6. Изменение отношений персонажей (перс1, перс2, отношение)
    modify_relations(action, context) {
        const char1 = resolveEntity(action.character1_role || 'subject', context); // Кто получает
        const char2 = resolveEntity(action.character2_role || 'target', context);  // Кто испытывает отношение
        if (!char1?.id || !char2?.id) return;

        if (!char2.social) char2.social = { relations: {}, romance: {} };
        if (!char2.social.relations) char2.social.relations = {};

        const modValue = parseInt(action.value) || 0;
        const currentOpinion = char2.social.relations[char1.id] || 0;

        // Мутируем отношение
        char2.social.relations[char1.id] = currentOpinion + modValue;

        if (AppState.engine?.spawnPopupText) {
            const color = modValue > 0 ? 0x2ea44f : 0xff3333;
            AppState.engine.spawnPopupText(char2, `Отношение к ${char1.name}: ${modValue > 0 ? '+' : ''}${modValue}`, color);
        }
        console.log(`[Trigger Action] Отношение ${char2.name} к ${char1.name} изменилось на ${modValue}. Текущее: ${char2.social.relations[char1.id]}`);
    },

    // 7. Изменение романа (перс 1, перс 2, статус)
    modify_romance(action, context) {
        const char1 = resolveEntity(action.character1_role || 'subject', context);
        const char2 = resolveEntity(action.character2_role || 'target', context);
        if (!char1?.id || !char2?.id) return;

        if (!char1.social) char1.social = { relations: {}, romance: {} };
        if (!char1.social.romance) char1.social.romance = {};

        char1.social.romance[char2.id] = action.value === true;
        console.log(`[Trigger Action] Романтический статус ${char1.name} с ${char2.name} изменен на: ${action.value}`);
    },

    // 8. Персонаж использует навык (перс, навык)
    execute_skill_cast(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char || !char.id || !AppState.engine?.skillManager) return;

        // Если в экшене передана конкретная клетка-цель, бьем туда, иначе берем позицию цели из контекста
        const targetTile = action.target_tile || (context.target ? context.target.mapPosition : char.mapPosition);

        console.log(`[Trigger Action] Сюжетный принудительный каст навыка "${action.skill_id}" персонажем ${char.name}...`);
        AppState.engine.skillManager.castSkill(char.id, action.skill_id, targetTile, null);
    },

    // 9. Персонаж использует предмет (перс, предмет)
    execute_use_item(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char || !char.inventory) return;

        const itemId = action.item_id;

        // Проверяем физическое наличие вещи в хэш-таблице инвентаря
        if ((char.inventory[itemId] || 0) > 0) {
            char.inventory[itemId]--;
            if (char.inventory[itemId] === 0) delete char.inventory[itemId];

            console.log(`[Trigger Action] ${char.name} использовал предмет [${itemId}] через триггер.`);

            // Если у предмета прописан мгновенный эффект вызова экшена — запускаем его
            if (action.item_effect_triggers) {
                TriggerManager.executeTriggers(action.item_effect_triggers, context);
            }
        } else {
            console.warn(`[Trigger Action] Персонаж ${char.name} не имеет предмета [${itemId}] для использования.`);
        }
    },

    // 10. Открывается диалог (перс 1, перс 2, сцена)
    execute_open_dialogue(action, context) {
        if (!AppState.engine?.dialogManager) {
            console.warn(`[Trigger Action] Не найден dialogManager в AppState.engine.`);
            return;
        }

        const char1 = resolveEntity(action.character1_role || 'subject', context);
        const char2 = resolveEntity(action.character2_role || 'target', context);

        console.log(`[Trigger Action] Перехват экрана! Открытие диалоговой сцены "${action.scene_id}"...`);
        // Запускаем твой диалоговый движок, передавая участников диалога для подстановки имен в реплики
        AppState.engine.dialogManager.trigger(action.scene_id, { character1: char1, character2: char2 });
    },

    // 11. Получение опыта (персонаж 1, опыт)
    add_experience(action, context) {
        const char = resolveEntity(action.character_role || 'subject', context);
        if (!char || !char.stats) return;

        const expAmount = parseInt(action.value) || 0;
        char.stats.exp = (char.stats.exp || 0) + expAmount;

        if (AppState.engine?.spawnPopupText) {
            AppState.engine.spawnPopupText(char, `+${expAmount} EXP`, 0x3498db);
        }
        console.log(`[Trigger Action] Персонаж ${char.name} получил +${expAmount} опыта.`);

        // Твоя внутренняя функция проверки левелапа, если она есть в статах
        if (AppState.engine?.checkLevelUp) {
            AppState.engine.checkLevelUp(char);
        }
    },

    // 12. Срабатывание конкретного триггера (ЦЕПНАЯ РЕАКЦИЯ)
    trigger_chain_call(action, context) {
        console.log(`[Trigger Action] Цепная реакция: Принудительный запуск вложенного триггера [${action.target_trigger_id}]`);

        // Ищем вложенный триггер в базе данных стейта
        const nextTrigger = AppState.triggers?.[action.target_trigger_id];
        if (nextTrigger) {
            // Вызываем проверку условий и выполнение вложенного триггера, пробрасывая тот же контекст
            if (TriggerManager.evaluateConditions(nextTrigger.conditions, context)) {
                TriggerManager.executeTriggers(nextTrigger.actions, context);
            }
        } else {
            console.warn(`[Trigger Action] Вложенный триггер [${action.target_trigger_id}] не найден в AppState.triggers.`);
        }
    },

    // 13. Статус квеста/подквеста (квест, статус, подквест?)
    modify_quest_state(action, context) {
        const quest = AppState.quests?.[action.quest_id];
        if (!quest) {
            console.warn(`[Trigger Action] Квест "${action.quest_id}" не найден в AppState.quests.`);
            return;
        }

        // А. Изменение общего статуса квеста
        if (action.operation === 'set_quest_status') {
            quest.status = action.value; // 'active', 'completed', 'failed'
            console.log(`[Trigger Action] Статус глобального квеста "${action.quest_id}" изменен на: ${action.value}`);

            // Если квест активирован, добавляем его ID игроку, если его там еще нет
            if (action.value === 'active' && AppState.player?.quests) {
                if (!AppState.player.quests.includes(action.quest_id)) {
                    AppState.player.quests.push(action.quest_id);
                }
            }
        }
        // Б. Изменение статуса конкретного подзадания (objective)
        else if (action.operation === 'set_objective_status') {
            const obj = quest.objectives?.find(o => o.id === action.objective_id);
            if (obj) {
                obj.status = action.value; // 'active', 'completed', 'locked'
                console.log(`[Trigger Action] Подквест "${action.objective_id}" внутри квеста "${action.quest_id}" сменил статус на: ${action.value}`);
            } else {
                console.warn(`[Trigger Action] Подквест "${action.objective_id}" не найден в квесте "${action.quest_id}".`);
            }
        }
        // В. Принудительное изменение счетчика прогресса подквеста (например, выдать +1 траву по сюжету)
        else if (action.operation === 'modify_objective_progress') {
            const obj = quest.objectives?.find(o => o.id === action.objective_id);
            if (obj && obj.type === 'count') {
                obj.current = Math.min(obj.target, (obj.current || 0) + (parseInt(action.value) || 1));
                console.log(`[Trigger Action] Прогресс подквеста "${action.objective_id}": ${obj.current} / ${obj.target}`);
            } else {
                console.warn(`[Trigger Action] Подквест "${action.objective_id}" не найден или не является счетчиком.`);
            }
        }

        // Обновляем HTML квестового трекера на HUD игры
        if (AppState.engine?.uiManager?.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    },

    // 14. Экшен: добавить в пати
    add_to_party(action, context) {
        const leaderId = action.leader_id || AppState.play?.activeCharacterId || 'rafael';
        // Вызываем менеджер персонажей для честного набора с затиранием координат
        AppState.engine?.CharacterManager.joinGroup(action.character_id, leaderId, action.count || 1, action.is_new === true);
    },

    // 15. Экшен: убрать из пати
    remove_from_party(action, context) {
        const leaderId = action.leader_id || AppState.play?.activeCharacterId || 'rafael';
        // Вызываем менеджер персонажей для честного роспуска/высадки на карту
        AppState.engine?.CharacterManager.leaveGroup(action.character_id, leaderId);
    },

    give_experience(action, context) {
        const amount = parseInt(action.value || action.amount || 0, 10);
        const leaderId = action.leader_id || AppState.play?.activeCharacterId || 'rafael';

        if (amount <= 0) return;

        console.log(`[TriggerActions] 📜 Получена квестовая награда: +${amount} опыта для отряда ${leaderId}`);

        // Квестовый опыт ВСЕГДА начисляется мгновенно ('instant'), минуя боевые отложенные буферы
        if (AppState.engine.CharacterLevelUpManager) {
            AppState.engine.CharacterLevelUpManager.distributeExperience(amount, leaderId, 'instant');
        }
    },
};



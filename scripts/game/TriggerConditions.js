// ==== TriggerConditions.js
import { AppState, getPactBetween } from '../shared/GameState.js';

function resolveEntity(role, context) {
    if (role === 'player') return AppState.player;
    if (context && context[role]) return context[role];
    // Фолбэк на текущего активного персонажа
    return AppState.entities?.[AppState.play?.activeCharacterId];
}

/**
 * Универсальное сравнение чисел по оператору
 */
function compare(left, operator, right) {
    const l = parseFloat(left) || 0;
    const r = parseFloat(right) || 0;
    if (operator === '>=') return l >= r;
    if (operator === '<=') return l <= r;
    if (operator === '==') return l == r;
    if (operator === '>') return l > r;
    if (operator === '<') return l < r;
    if (operator === '!=') return l != r;
    return false;
}

export const ConditionValidators = {


    // 1. Попадание в область видимости (персонаж, цель)
    vision(cond, context) {
        const source = resolveEntity(cond.character_role || 'subject', context);
        const target = resolveEntity(cond.target_role || 'target', context);

        if (!source?.mapPosition || !target?.mapPosition) return false;

        // СТРОГИЙ ФИКС: Используем исключительно твой AppState.engine.hexMath
        if (!AppState.engine?.hexMath) {
            console.warn("[TriggerSystem] КРИТИКА: AppState.engine.hexMath не инициализирован!");
            return false;
        }

        if(source.id==='gromm4' && target.id==='rafael') {
            console.log("=========== vision TRIGGER =======", source.id, target.id);
        }


        // Вычисляем точную дистанцию между гексами через твой движок
        // const calculatedDist = AppState.engine.hexMath.getDistance(source.mapPosition, target.mapPosition);

        // Сравниваем полученную дистанцию с требуемой из админки (cond.distance)
        // console.log(calculatedDist, context.dist, source.id, target.id);
        // return compare(calculatedDist, cond.operator || '<=', context.dist);
        return true;
    },

    // 2. Попадание на гекс (персонаж, гекс)
    tile_enter(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        const currentTile = context.tile || char?.mapPosition;
        if (!currentTile) return false;

        // ПРОВЕРКА КООРДИНАТ ГЕКСА
        const isCorrectTile = currentTile.q == cond.q && currentTile.r == cond.r;
        if (!isCorrectTile) return false;

        // ИСПРАВЛЕНИЕ: Если в админке указан конкретный character_id (например, "rafael"),
        // принудительно проверяем, что наступил именно он, приводя оба значения к нижнему регистру
        if (cond.character_id && char) {
            return String(char.id).toLowerCase() === String(cond.character_id).toLowerCase();
        }

        return true;
    },

    // 3. Уход с гекса (персонаж, гекс)
    tile_leave(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        const previousTile = context.previousTile || context.tile;
        if (!previousTile) return false;
        return previousTile.q == cond.q && previousTile.r == cond.r;
    },

    // 4. Вступление в бой (персонаж 1, персонаж 2)
    combat_start(cond, context) {
        const char1 = resolveEntity(cond.character1_role || 'subject', context);
        const char2 = resolveEntity(cond.character2_role || 'target', context);
        if (!char1 || !char2) return false;

        // Если в конфиге админки указаны конкретные ID, проверяем их совпадение
        const match1 = cond.character1_id ? char1.id === cond.character1_id : true;
        const match2 = cond.character2_id ? char2.id === cond.character2_id : true;
        return match1 && match2;
    },

    // 5. ХП граница (персонаж, процент)
    hp_percent_limit(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        if (!char?.stats?.maxHp) return false;

        const currentHpPercent = (char.stats.hp / char.stats.maxHp) * 100;
        return compare(currentHpPercent, cond.operator, cond.value);
    },

    // 6. Персонаж умер (персонаж)
    character_dead(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        if (cond.character_id && char?.id !== cond.character_id) return false;
        return !char || char.stats?.hp <= 0;
    },

    // 7. Начало разговора с персонажем (персонаж 1, персонаж 2, сцена)
    dialogue_start(cond, context) {
        const char1 = resolveEntity(cond.character1_role || 'subject', context);
        const char2 = resolveEntity(cond.character2_role || 'target', context);
        if (!char1 || !char2 || !context.sceneId) return false;

        const matchScene = cond.scene_id ? context.sceneId === cond.scene_id : true;
        const matchChar1 = cond.character1_id ? char1.id === cond.character1_id : true;
        const matchChar2 = cond.character2_id ? char2.id === cond.character2_id : true;
        return matchScene && matchChar1 && matchChar2;
    },

    // 8. Выбор варианта ответа (персонаж 1, персонаж 2, сцена, вариант)
    dialogue_option_select(cond, context) {
        if (!context.sceneId || !context.optionId) return false;

        const char1 = resolveEntity(cond.character1_role || 'subject', context);
        const char2 = resolveEntity(cond.character2_role || 'target', context);

        const matchScene = cond.scene_id ? context.sceneId === cond.scene_id : true;
        const matchOption = cond.option_id ? context.optionId === cond.option_id : true;
        const matchChar1 = cond.character1_id ? char1?.id === cond.character1_id : true;
        const matchChar2 = cond.character2_id ? char2?.id === cond.character2_id : true;

        return matchScene && matchOption && matchChar1 && matchChar2;
    },

    // 9. Отношение с персонажем (персонаж 1 - кто получает, персонаж 2 - кто испытывает)
    character_relation(cond, context) {
        const receiver = resolveEntity(cond.receiver_role || 'subject', context); // Персонаж 1
        const experiencer = resolveEntity(cond.experiencer_role || 'target', context); // Персонаж 2
        if (!receiver?.id || !experiencer?.id) return false;

        const opinionValue = experiencer.social?.relations?.[receiver.id] || 0;
        return compare(opinionValue, cond.operator, cond.value);
    },

    // 10. Роман с персонажем (персонаж 1 - кто сделал, персонаж 2 - с кем)
    character_romance(cond, context) {
        const initiator = resolveEntity(cond.initiator_role || 'subject', context); // Персонаж 1
        const partner = resolveEntity(cond.partner_role || 'target', context); // Персонаж 2
        if (!initiator?.id || !partner?.id) return false;

        const hasActiveRomance = !!initiator.social?.romance?.[partner.id];
        return hasActiveRomance === (cond.value === true);
    },

    // 11. Пакт с фракцией (фракция 1, фракция 2, пакт)
    diplomatic_pact(cond, context) {
        // Если фракции не переданы, берем фракцию игрока как дефолт
        const f1 = cond.faction1 || AppState.player?.faction;
        const f2 = cond.faction2 || context.targetFaction;
        if (!f1 || !f2) return false;

        const pact = getPactBetween(f1, f2);
        return pact === cond.value;
    },

    // 12. Проверка флага
    flag(cond, context) {
        // Защита, если story_flags еще не созданы в стейте
        if (!AppState.flags) AppState.flags = {};

        // Считываем реальное булево значение флага из памяти игрока
        const playerFlagState = !!AppState.flags[cond.param];

        // Сравниваем с тем, что требует админка (value: false или true)
        return playerFlagState === (cond.value === true);
    },

    // Алиас/дубликат для защиты, если где-то в триггерах написано story_flag
    story_flag(cond, context) {
        return this.flag(cond, context);
    },

    // 13. Проверка квеста, его подквестов, статусов
    quest_state(cond, context) {
        const quest = AppState.quests?.[cond.quest_id];
        if (!quest) return false;

        // А. Проверка общего статуса квеста (active, completed, failed)
        if (cond.check === 'status') {
            return quest.status === cond.value;
        }

        // Б. Проверка статуса конкретного подквеста (active, completed, locked)
        if (cond.check === 'objective_status') {
            const obj = quest.objectives?.find(o => o.id === cond.objective_id);
            return obj && obj.status === cond.value;
        }

        // В. Проверка счетчика прогресса подквеста (для собирательных задач)
        if (cond.check === 'objective_progress') {
            const obj = quest.objectives?.find(o => o.id === cond.objective_id);
            if (!obj || obj.type !== 'count') return false;
            return compare(obj.current, cond.operator, cond.value);
        }

        return false;
    },

    // 14. Проверка статов (персонаж, стат, число)
    // 14. Проверка статов (персонаж, стат, число/строка)
    character_stat(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        if (!char) return false;

        // ИСПРАВЛЕНИЕ: Сначала ищем параметр на верхнем уровне объекта (например, char.id или char.faction).
        // Если там его нет — лезем во вложенный узел char.stats (например, char.stats.atk)
        let currentValue = undefined;

        if (char[cond.param] !== undefined) {
            currentValue = char[cond.param];
        } else if (char.stats && char.stats[cond.param] !== undefined) {
            currentValue = char.stats[cond.param];
        }

        // Если параметр вообще нигде не найден, возвращаем false
        if (currentValue === undefined) return false;

        // Если мы сравниваем строки (например, ID или Фракции), приводим к нижнему регистру для защиты от ошибок регистра
        if (typeof currentValue === 'string' || typeof cond.value === 'string') {
            if (cond.operator === '==') {
                return String(currentValue).toLowerCase() === String(cond.value).toLowerCase();
            }
            if (cond.operator === '!=') {
                return String(currentValue).toLowerCase() !== String(cond.value).toLowerCase();
            }
        }

        // Для числовых параметров используем стандартное математическое сравнение
        return compare(currentValue, cond.operator, cond.value);
    },


    // 15. Проверка инвентаря (персонаж, предмет, статус/число)
    character_inventory(cond, context) {
        const char = resolveEntity(cond.character_role || 'player', context);
        if (!char?.inventory) return false;

        const currentCount = char.inventory[cond.item_id] || 0;
        return compare(currentCount, cond.operator || '>=', cond.value || 1);
    },

    // 16. Проверка уровня (персонаж, уровень)
    character_level(cond, context) {
        const char = resolveEntity(cond.character_role || 'subject', context);
        if (!char?.stats) return false;

        const currentLevel = char.stats.level || 1;
        return compare(currentLevel, cond.operator, cond.value);
    },

    in_party(cond, context) {
        const leader = resolveEntity(cond.leader_role || 'subject', context);
        if (!leader || !leader.units) return false;

        const hasUnit = !!leader.units[cond.character_id];
        return hasUnit === (cond.value === true); // true — должен быть, false — должен отсутствовать
    },

    // 18. Проверка: нет в пати (Удобный синоним для админки)
    not_in_party(cond, context) {
        const leader = resolveEntity(cond.leader_role || 'subject', context);
        if (!leader || !leader.units) return true;
        return !leader.units[cond.character_id];
    },
};

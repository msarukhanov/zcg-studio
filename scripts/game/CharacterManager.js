// ==== CharacterManager.js
import { AppState } from '../shared/GameState.js';

export const CharacterManager = {
    /**
     * 1. Увеличение параметров за очки прокачки
     */
    upgradeStat(charId, statParam) {
        const char = AppState.entities?.[charId];
        if (!char || !char.stats || (char.stats.stat_points || 0) <= 0) return false;

        char.stats.stat_points--;
        char.stats[statParam] = (char.stats[statParam] || 0) + 1;

        if (statParam === 'hp') {
            char.stats.maxHp = (char.stats.maxHp || 100) + 10;
            char.stats.hp = (char.stats.hp || 100) + 10;
        }

        console.log(`[CharacterManager] Прокачан стат "${statParam}" у ${char.name}. Осталось очков: ${char.stats.stat_points}`);
        this._triggerUIRefresh();
        return true;
    },

    /**
     * 2. Надевание предмета из рюкзака персонажа на самого себя
     */
    equipItem(charId, itemId) {
        const char = AppState.entities?.[charId];
        const backpack = char?.backpack; // СТРОГИЙ ФИКС: Рюкзак теперь внутри персонажа!

        if (!backpack || !backpack[itemId] || backpack[itemId] <= 0) return false;

        const itemConfig = AppState.items?.[itemId];
        if (!itemConfig || itemConfig.category !== 'equipment' || !itemConfig.slot) {
            console.warn(`[CharacterManager] Предмет [${itemId}] нельзя надеть.`);
            return false;
        }

        if (!char.inventory) char.inventory = []; // Инвентарь надетых вещей тоже внутри персонажа!

        // Проверяем занятость слота на кукле конкретного персонажа
        const alreadyEquippedId = char.inventory.find(equippedId => {
            return AppState.items?.[equippedId]?.slot === itemConfig.slot;
        });

        if (alreadyEquippedId) {
            this.unequipItem(charId, alreadyEquippedId);
        }

        // Забираем из персонального рюкзака
        backpack[itemId]--;
        if (backpack[itemId] === 0) delete backpack[itemId];

        // Кладим в персональный инвентарь надетых вещей
        char.inventory.push(itemId);
        console.log(`[CharacterManager] Предмет [${itemId}] надет на персонажа ${char.name} в слот [${itemConfig.slot}]`);

        this.applyItemBonuses(charId, itemId, true);
        this._triggerUIRefresh();
        return true;
    },

    /**
     * 3. Снятие предмета с куклы обратно в рюкзак персонажа
     */
    unequipItem(charId, itemId) {
        const char = AppState.entities?.[charId];
        const inventory = char?.inventory || [];
        const index = inventory.indexOf(itemId);
        if (index === -1) return false;

        // Удаляем из массива надетых
        inventory.splice(index, 1);

        if (!char.backpack) char.backpack = {};

        // Возвращаем в рюкзак этого же персонажа
        char.backpack[itemId] = (char.backpack[itemId] || 0) + 1;

        this.applyItemBonuses(charId, itemId, false);
        console.log(`[CharacterManager] Предмет [${itemId}] снят у персонажа ${char.name} в его рюкзак.`);

        this._triggerUIRefresh();
        return true;
    },

    /**
     * Вспомогательный метод пересчета статов
     */
    applyItemBonuses(charId, itemId, isEquipping) {
        const itemConfig = AppState.items?.[itemId];
        if (!itemConfig || !itemConfig.stats) return;

        const char = AppState.entities?.[charId];
        if (!char || !char.stats) return;

        Object.keys(itemConfig.stats).forEach(statKey => {
            const val = parseInt(itemConfig.stats[statKey]) || 0;
            const modifier = isEquipping ? val : -val;

            if (statKey === 'hp') {
                char.stats.maxHp = (char.stats.maxHp || 100) + modifier;
                char.stats.hp = Math.min(char.stats.maxHp, (char.stats.hp || 100) + (isEquipping ? modifier : 0));
            } else {
                char.stats[statKey] = (char.stats[statKey] || 0) + modifier;
            }
        });
    },

    castSkillFromBook(skillId, char) {
        if (!AppState.engine?.skillManager) return;
        if (AppState.engine.ScreenManager) AppState.engine.ScreenManager.clearCurrentScreen();
        AppState.engine.skillManager.selectSkillForCast(skillId);
    },


    // castSkillFromBook(skillId, casterId) {
    //     const skillConfig = AppState.skills?.[skillId];
    //     const caster = AppState.characters?.[casterId || AppState.play?.activeCharacterId];
    //     if (!skillConfig || !caster) return;
    //
    //     const currentLevelData = skillConfig.levels[0]; // Берем 1 уровень для теста
    //
    //     // 🌟 ЕСЛИ СПОСОБНОСТЬ ТРЕБУЕТ ВЫБОРА ИЗ МЕНЮ
    //     if (skillConfig.targeting.target_mode === "menu") {
    //         console.log(`[CharacterManager] Открытие строительного меню для ${caster.name}`);
    //
    //         // Вызываем визуальный менеджер, чтобы нарисовать модалку со списком построек
    //         // Мы передаем туда массив allowed_structures и данные кастера
    //         this._renderBuildSelectionMenu(currentLevelData.allowed_structures, skillId, caster.id);
    //         return;
    //     }
    //
    //
    //
    //     // Обычные боевые скиллы (типа spider_shot) идут ниже как раньше...
    // },


    // ==== CharacterManager.js (Дополнение логики отряда)

    /**
     * 👥 1.1. НАБОР В ГРУППУ (Добавить в units)
     * @param {string} charId - ID нанимаемого персонажа/юнита из AppState.characters
     * @param {string} leaderId - ID лидера группы (например, 'rafael')
     * @param {number} count - Количество (для стакающихся юнитов)
     * @param {boolean} isNew - Флаг, создается ли юнит с нуля
     */
    joinGroup(charId, leaderId, count = 1, isNew = false) {
        const leader = AppState.entities?.[leaderId];
        const targetChar = AppState.characters?.[charId];

        if (!leader) return false;
        if (!targetChar && !isNew) return false;

        // Если у персонажа прописан параметр cost — убавляем золото (Заглушка экономики)
        const unitCost = targetChar?.stats?.cost || 0;
        if (unitCost > 0) {
            console.log(`[CharacterManager] Снято золота за наем: ${unitCost * count} (Заглушка экономики)`);
            // AppState.player.gold -= (unitCost * count);
        }

        if (!leader.units) leader.units = {};

        // Записываем/плюсуем количество в отряд лидера
        leader.units[charId] = (leader.units[charId] || 0) + count;

        const isTacticalMode = AppState.game_settings.battleType === "tactical";
        const isTacticalMap = AppState.map.mapId === 'tactical_arena';
        // Если это существующий уникальный персонаж с большой карты — стираем ему пространственный контекст
        if (!isNew && targetChar && isTacticalMode && !isTacticalMap) {
            delete targetChar.mapId;
            if (targetChar.mapPosition) {
                delete targetChar.mapPosition.q;
                delete targetChar.mapPosition.r;
            }
            console.log(`[CharacterManager] Персонаж [${charId}] убран с карты и присоединен к отряду ${leader.name}`);
        }

        // 🚀 ИНТЕГРАЦИЯ ТРИГГЕРОВ: Оповещаем шину, что состав группы изменился
        if (AppState.engine?.triggerManager?.processEvent) {
            AppState.engine.triggerManager.processEvent('party_changed', {
                subject: leader,
                target: targetChar || { id: charId }
            });
        }
        window.renderMap();
        this._triggerUIRefresh();
        return true;
    },

    /**
     * 👥 1.2. РОСПУСК ИЗ ГРУППЫ (Выгнать из units)
     * @param {string} charId - ID выгоняемого персонажа/юнита
     * @param {string} leaderId - ID лидера группы
     */
    leaveGroup(charId, leaderId) {
        const leader = AppState.entities?.[leaderId];
        if (!leader || !leader.units || !leader.units[charId]) return false;

        const targetChar = AppState.entities?.[charId];
        const hasCost = targetChar?.stats?.cost > 0;

        if (hasCost || !targetChar) {
            // А. ЕСЛИ ЭТО ЮНИТ (был cost) — просто стираем этот стак без возврата на карту
            delete leader.units[charId];
            console.log(`[CharacterManager] Массовый юнит [${charId}] полностью распущен из армии.`);
        } else {
            // Б. ЕСЛИ ЭТО СЮЖЕТНЫЙ ПЕРСОНАЖ — выбрасываем его на карту в ту же точку, где стоит лидер
            delete leader.units[charId];

            const isTacticalMode = AppState.game_settings.battleType === "tactical";
            const isTacticalMap = AppState.map.mapId === 'tactical_arena';
            // Если это существующий уникальный персонаж с большой карты — стираем ему пространственный контекст
            if (isTacticalMode && !isTacticalMap) {
                targetChar.mapId = leader.mapId || AppState.map?.mapId;
                targetChar.mapPosition = {
                    q: leader.mapPosition.q,
                    r: leader.mapPosition.r
                };
                console.log(`[CharacterManager] Персонаж [${charId}] покинул отряд и высажен на гекс [${leader.mapPosition.q}, ${leader.mapPosition.r}]`);
            }
        }

        // 🚀 ИНТЕГРАЦИЯ ТРИГГЕРОВ: Оповещаем шину об изменении состава группы
        if (AppState.engine?.triggerManager?.processEvent) {
            AppState.engine.triggerManager.processEvent('party_changed', {
                subject: leader,
                target: targetChar || { id: charId }
            });
        }

        this._triggerUIRefresh();
        return true;
    },


    // ==== Добавь в CharacterManager.js

    /**
     * 📦 1.3. ОБМЕН ПРЕДМЕТАМИ (Универсальный трансфер для обмена и торговли)
     * @param {string} fromCharId - ID того, кто отдает вещь
     * @param {string} toCharId - ID того, кто забирает вещь
     * @param {string} itemId - ID передаваемого предмета
     * @param {number} amount - Количество
     */
    transferItem(fromCharId, toCharId, itemId, amount = 1) {
        const fromChar = AppState.entities?.[fromCharId];
        const toChar = AppState.entities?.[toCharId];

        if (!fromChar || !toChar || !fromChar.backpack || !fromChar.backpack[itemId]) return false;

        const availableCount = fromChar.backpack[itemId];
        const actualAmount = Math.min(availableCount, amount);

        // Забираем у донора
        fromChar.backpack[itemId] -= actualAmount;
        if (fromChar.backpack[itemId] <= 0) {
            delete fromChar.backpack[itemId];
        }

        // Инициализируем рюкзак приемника, если его не было
        if (!toChar.backpack) toChar.backpack = {};

        // Отдаем приемнику
        toChar.backpack[itemId] = (toChar.backpack[itemId] || 0) + actualAmount;

        console.log(`[CharacterManager] Передано [${itemId}] x${actualAmount} от ${fromChar.name} к ${toChar.name}`);

        this._triggerUIRefresh();
        return true;
    },



    _triggerUIRefresh() {
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        if (AppState.engine?.ScreenManager?.currentScreenId === 'character_screen') {
            AppState.engine.ScreenManager.renderScreen('character_screen');
        }
        if (AppState.engine?.ScreenManager?.currentScreenId === 'character_transfer') {
            AppState.engine.ScreenManager.renderScreen('character_transfer');
        }
    }
};

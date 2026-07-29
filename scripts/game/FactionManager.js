// ==== scripts/engine/FactionManager.js
import { AppState, getPactBetween } from '../shared/GameState.js';

export class FactionManager {
    constructor() {
        // Пусто! Всё хранится в AppState.pacts и AppState.relations
    }

    getPact(factionA, factionB) {
        return getPactBetween(factionA, factionB);
    }

    getOpinion(fromFaction, toFaction) {
        if (fromFaction === toFaction) return 100;
        if (!AppState.relations[fromFaction]) return -100;
        return AppState.relations[fromFaction][toFaction] !== undefined ? AppState.relations[fromFaction][toFaction] : 0;
    }

    changeOpinion(fromFaction, toFaction, delta) {
        if (fromFaction === toFaction || !AppState.relations[fromFaction]) return;
        if (AppState.relations[fromFaction][toFaction] !== undefined) {
            AppState.relations[fromFaction][toFaction] = Math.min(Math.max(AppState.relations[fromFaction][toFaction] + delta, -100), 100);
        }
    }

    changePact(factionA, factionB, newPact) {
        if (!AppState.pacts[factionA] || !AppState.pacts[factionB]) return;

        // 🌟 СТРОГИЙ DATA-DRIVEN ФИКС ДЛЯ АСИММЕТРИЧНОГО ВАССАЛИТЕТА
        if (newPact === 'VASSAL_OWNER') {
            // Фракция A становится Сювереном над фракцией B
            AppState.pacts[factionA][factionB] = 'SUZERAIN';
            AppState.pacts[factionB][factionA] = 'VASSAL';
        } else if (newPact === 'WAR' || newPact === 'PEACE') {
            // Симметричные базовые пакты
            AppState.pacts[factionA][factionB] = newPact;
            AppState.pacts[factionB][factionA] = newPact;
        } else {
            AppState.pacts[factionA][factionB] = newPact;
            AppState.pacts[factionB][factionA] = newPact;
        }

        console.log(`📜 [State] Пакт изменен между ${factionA} и ${factionB} -> [${newPact}]`);
    }


    /**
     * 💰 ТВОЙ МЕТОД: Чтение текущего статуса торговли между фракциями
     */
    getTrade(factionA, factionB) {
        if (!factionA || !factionB) return null;
        // Защита от пустых пактов
        if (!AppState.pacts[factionA] || !AppState.pacts[factionA][factionB]) return null;

        // Гарантируем, что узел в матрице торговли существует, чтобы не было краша
        if (!AppState.trade) AppState.trade = {};
        if (!AppState.trade[factionA]) AppState.trade[factionA] = {};

        return AppState.trade[factionA][factionB] !== undefined ? AppState.trade[factionA][factionB] : false;
    }

    /**
     * 🔀 МЕТОД: Заключить или разорвать торговое соглашение
     * @param {string} factionA - Первая фракция
     * @param {string} factionB - Вторая фракция
     * @param {boolean} status - true (заключить), false (разорвать)
     */
    changeTrade(factionA, factionB, status) {
        if (!AppState.trade) AppState.trade = {};
        if (!AppState.trade[factionA]) AppState.trade[factionA] = {};
        if (!AppState.trade[factionB]) AppState.trade[factionB] = {};

        // Зеркально записываем статус в двухстороннюю матрицу торговли
        AppState.trade[factionA][factionB] = status;
        AppState.trade[factionB][factionA] = status;

        console.log(`🪵 [Trade] Торговое соглашение между ${factionA} и ${factionB} -> [${status ? 'ВКЛ' : 'ВЫКЛ'}]`);
    }


    // ==== Допиши внутрь класса FactionManager в FactionManager.js

    /**
     * 🥾 ТВОЙ МЕТОД: Чтение статуса права прохода войск
     */
    getMilitaryAccess(factionA, factionB) {
        if (!factionA || !factionB) return null;
        if (!AppState.pacts[factionA] || !AppState.pacts[factionA][factionB]) return null;

        if (this.getPact(factionA, factionB) === 'ALLIANCE') {
            return true;
        }

        if (!AppState.militaryAccess) AppState.militaryAccess = {};
        if (!AppState.militaryAccess[factionA]) AppState.militaryAccess[factionA] = {};

        return AppState.militaryAccess[factionA][factionB] !== undefined ? AppState.militaryAccess[factionA][factionB] : false;
    }

    /**
     * 🗺️ МЕТОД: Заключить или расторгнуть право прохода войск
     */
    changeMilitaryAccess(factionA, factionB, status) {
        if (!AppState.militaryAccess) AppState.militaryAccess = {};
        if (!AppState.militaryAccess[factionA]) AppState.militaryAccess[factionA] = {};
        if (!AppState.militaryAccess[factionB]) AppState.militaryAccess[factionB] = {};

        // Синхронизируем двухстороннюю матрицу прохода
        AppState.militaryAccess[factionA][factionB] = status;
        AppState.militaryAccess[factionB][factionA] = status;

        if (newPact === 'WAR') {
            this.changeMilitaryAccess(factionA, factionB, false);
        }

        console.log(`🥾 [Access] Право прохода между ${factionA} и ${factionB} -> [${status ? 'ВКЛ' : 'ВЫКЛ'}]`);
    }


    /**
     * 💸 🌟 НОВЫЙ МЕТОД: СБОР ДАНИ С ВАССАЛОВ (Интегрируется в секундный тикер дохода)
     * Вычитает 20% секундного золотого дохода (production.gold) у вассала и передает сюверену
     */
    collectVassalTributes() {
        Object.keys(AppState.factions).forEach(factionId => {
            const currentPacts = AppState.pacts[factionId];
            if (!currentPacts) return;

            // Ищем, кому текущая фракция приходится вассалом
            Object.keys(currentPacts).forEach(targetFactionId => {
                if (currentPacts[targetFactionId] === 'VASSAL') {
                    // targetFactionId — это Сюверен для factionId!
                    const vassal = AppState.factions[factionId];
                    const suzerain = AppState.factions[targetFactionId];

                    if (!vassal || !suzerain) return;

                    // Рассчитываем дань: 20% от текущего секундного производства золота
                    const tribute = Math.round((vassal.production?.gold || 0) * 0.2);

                    if (tribute > 0 && vassal.resources.gold >= tribute) {
                        vassal.resources.gold -= tribute;
                        suzerain.resources.gold += tribute;
                        console.log(`💸 [Tribute] Вассал [${factionId}] выплатил ${tribute} золота сюверену [${targetFactionId}]`);
                    }
                }
            });
        });
    }


    /**
     * 🗺️ ВЫЧИСЛЕНИЕ ВЛАДЕЛЬЦА КЛЕТКИ / ТЕРРИТОРИИ ПО ИЕРАРХИИ КОНФИГОВ
     * @param {Object} tile - Объект клетки из AppState.map.tiles
     * @returns {string} ID фракции-владельца (например, 'darkwood', 'orcs') или '' (нейтрально)
     */
    getTileFaction(tile) {
        if (!tile) return '';
        // 1. Наивысший приоритет: Прямое указание фракции на самой клетке (если не по провинциям)
        if (tile.faction) {
            return tile.faction;
        }

        // 2. Второй приоритет: Иерархия Провинции
        if (tile.province && AppState.provinces?.[tile.province]) {
            const province = AppState.provinces[tile.province];
            if (province.faction) {
                return province.faction;
            }

            // 3. Третий приоритет: Иерархия Региона (если провинция нейтральна, но у региона есть хозяин)
            if (province.region && AppState.regions?.[province.region]) {
                const region = AppState.regions[province.region];
                if (region.faction) {
                    return region.faction;
                }
            }
        }

        // Если везде пусто — территория абсолютно нейтральна
        return '';
    }

    /**
     * 🚩 СИСТЕМА ПОЛИТИЧЕСКОГО ЗАХВАТА ОБЪЕКТОВ И ПРОВИНЦИЙ
     * @param {Object} mapObject - Объект на карте (город, шахта, порт) из AppState.entities / objects
     * @param {string} attackerFactionId - ID фракции, которая наступила на объект ногами
     */
    claimObjectTerritory(mapObject, tile, attackerFactionId) {
        // if (!mapObject || !attackerFactionId) return;
        if (!mapObject) return;

        // Если объект уже принадлежит этой фракции — ничего не делаем
        if (mapObject.faction === attackerFactionId) return;

        console.log(`🚩 [Macro-Strategy] Объект "${mapObject.name}" (Тип: ${mapObject.type}) перехвачен фракцией [${attackerFactionId}]`);

        // 1. Меняем владельца самого инстанса объекта
        mapObject.faction = attackerFactionId;
        tile.faction = attackerFactionId;

        // 2. 🏛️ ЕСЛИ ЭТО ГОРОД С ПРИВЯЗКОЙ К ПРОВИНЦИИ — АВТОМАТИЧЕСКИ АННЕКСИРУЕМ ВСЮ ПРОВИНЦИЮ!
        if (mapObject.type === 'city' && mapObject.province) {
            const provId = mapObject.province;
            if (AppState.provinces?.[provId]) {
                AppState.provinces[provId].faction = attackerFactionId;
                console.log(`🏛️ [Province] Вся провинция "${AppState.provinces[provId].name}" перешла под контроль [${attackerFactionId}] вместе с городами и шахтами!`);
            }
        }

        // Сплывающий текст над захваченным объектом
        if (AppState.engine?.spawnPopupText) {
            AppState.engine.spawnPopupText(mapObject, "+Conquered!", 0x2ea44f);
        }

        // Обновляем все UI слои (включая верхний виджет ресурсов и левую панель персонажей)
        if (AppState.engine?.uiManager?.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    }


    /**
     * 📊 ОБНОВЛЕНИЕ И МУТАЦИЯ ОБЩЕГО ДОХОДА ФРАКЦИИ
     * Пересчитывает базовый доход, налоги с объектов и вассалов и жестко пишет в faction.production
     * @param {string} factionId - ID фракции (например, 'darkwood')
     */
    updateFactionProduction(factionId) {
        const faction = AppState.factions?.[factionId];
        if (!faction) return;

        // 1. Инициализируем или сбрасываем объект производства к дефолту.
        // За основу берем твои стартовые хардкод-значения из паспорта (или ставим 0, если их нет)
        // Чтобы не стереть изначальные базовые налоги фракции, мы можем хранить их в отдельном поле,
        // либо просто собирать заново по объектам. Если у тебя в конфиге прописаны стартовые, берем их:
        const baseGold = factionId === 'darkwood' ? 10 : (factionId === 'elvinar' ? 10 : (factionId === 'lorencia' ? 500 : 0));
        const baseWood = (factionId === 'darkwood' || factionId === 'elvinar') ? 2 : 0;
        const baseFood = factionId === 'elvinar' ? 500 : (factionId === 'orcs' ? 100 : 0);

        const newProduction = {
            gold: baseGold,
            wood: baseWood,
            ore: 0,
            food: baseFood
        };

        // 2. Сканируем ВСЕ объекты на карте (города, шахты, порты)
        const allObjects = Object.values(AppState.objects || {})
            .concat(Object.values(AppState.entities || {}));

        allObjects.forEach(obj => {
            if (!obj || !obj.production) return;

            // Вычисляем хозяина объекта. Сначала прямое поле .faction, затем по провинции тайла
            let objOwner = obj.faction || '';

            if (!objOwner && obj.province && AppState.provinces?.[obj.province]) {
                objOwner = AppState.provinces[obj.province].faction || '';
            }

            // Если этот экономический объект наш — плюсуем его доход к новой госматрице
            if (objOwner === factionId) {
                Object.entries(obj.production).forEach(([res, amount]) => {
                    if (newProduction[res] !== undefined) {
                        newProduction[res] += amount;
                    }
                });
            }
        });

        // 3. Плюсуем дань от вассалов из твоей матрицы пактов
        if (AppState.pacts?.[factionId]) {
            Object.entries(AppState.pacts[factionId]).forEach(([targetId, role]) => {
                if (role === 'SUZERAIN') {
                    // Находим базовое производство золота вассала
                    const vassalBaseGold = AppState.factions?.[targetId]?.production?.gold || 0;
                    newProduction.gold += Math.round(vassalBaseGold * 0.2);
                }
            });
        }

        // 🚀 КРИТИЧЕСКИЙ ШАГ: Жестко перезаписываем стейт фракции!
        // Теперь все виджеты и тикеры будут читать эти готовые посчитанные цифры
        faction.production = newProduction;

        return newProduction;

        console.log(`📊 [Macro-Economy] Доходы фракции [${factionId}] успешно пересчитаны:`, faction.production);
    }

    /**
     * 🏛️ ПОЛУЧЕНИЕ ИЗОЛИРОВАННОГО ОТЧЁТА ПО КАЖДОЙ ПРОВИНЦИИ ДЛЯ UI
     */
    getControlledProvincesReport(factionId) {
        const report = [];
        if (!AppState.provinces) return report;

        Object.entries(AppState.provinces).forEach(([pId, province]) => {
            if (province.faction === factionId) {
                const provProd = { gold: 0, wood: 0, ore: 0, food: 0 };

                const provObjects = Object.values(AppState.objects || {})
                    .concat(Object.values(AppState.entities || {}))
                    .filter(obj => obj && obj.province === pId);

                provObjects.forEach(obj => {
                    if (obj.production) {
                        Object.entries(obj.production).forEach(([res, amount]) => {
                            if (provProd[res] !== undefined) provProd[res] += amount;
                        });
                    }
                });

                report.push({
                    id: pId,
                    name: province.name,
                    production: provProd
                });
            }
        });

        return report;
    }


}

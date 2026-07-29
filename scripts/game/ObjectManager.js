// ==== scripts/engine/ObjectManager.js
import { AppState } from '../shared/GameState.js';


export const ObjectManager = {
    // Реестр базовых шаблонов объектов (чертежи из админки)
    _templates: {},

    init(templatesConfig) {

    },

    /**
     * 🏗️ 1. СТРОИТЕЛЬСТВО / СПАВН ОБЪЕКТА
     * @param {string} templateId - Идентификатор типа здания (например, 'elf_camp_t1')
     * @param {string} mapId - На какой карте строим
     * @param {number} q, r - Координаты размещения
     * @param {string} ownerFaction - Кто владелец (игрок, нейтрал, орки)
     */
    spawnObject(templateId, q, r, ownerFaction = 'neutral') {
        const template = AppState.ConfigObject[templateId];
        const mapId = AppState.map.mapId;
        if (!template) {
            console.error(`[ObjectManager] Шаблон объекта "${templateId}" не найден.`);
            return null;
        }

        // 1.1. Валидация ресурсов (Если строит игрок)
        if (ownerFaction === AppState.player?.faction) {
            if (!this._checkAndConsumeResources(template.buildCost)) {
                console.warn("[ObjectManager] Недостаточно ресурсов для постройки.");
                return null;
            }
        }

        // 1.2. Генерируем уникальный сквозной ID инстанса в памяти
        const instanceId = `${templateId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 1.3. Сборка живого инстанса на основе глубокого клонирования чертежа
        const newObject = JSON.parse(JSON.stringify(template));

        Object.assign(newObject, {
            id: instanceId,
            name: template.name || template.type,
            templateId: templateId,
            faction: ownerFaction,
            mapId: mapId,
            mapPosition: { q: parseInt(q, 10), r: parseInt(r, 10) },
            vision: newObject.vision || {current:1},
            level: 1, // Стартовый уровень постройки
            units: newObject.units || {}, // Гарнизон
            backpack: newObject.backpack || {} // Локальный склад предметов
        });

        // 1.4. Прописываем объект в глобальную базу данных игры
        if (!AppState.objects) AppState.objects = {};
        AppState.objects[instanceId] = newObject;

        // 1.5. Если строим на текущей активной карте — мгновенно подсаживаем ссылку в рабочий индекс
        if (mapId === AppState.map?.mapId) {
            AppState.entities[instanceId] = newObject;
        }

        console.log(`[ObjectManager] Объект [${instanceId}] успешно построен на (${q},${r})`);

        // Перерисовываем мир, чтобы PixiJS зарендерил спрайт нового здания
        AppState.engine.MapManager.refreshWorldRender();
        return newObject;
    },

    /**
     * 🏹 2. НАЙМ / ПРОИЗВОДСТВО ЮНИТОВ (Produce)
     * @param {string} instanceId - ID конкретного здания на карте
     * @param {string} unitId - ID нанимаемого отряда из базы данных существ
     * @param {number} count - Сколько штук нанимаем
     */
    produceUnits(instanceId, unitId, count = 1) {
        const obj = AppState.objects?.[instanceId] || AppState.entities?.[instanceId];
        if (!obj) return false;

        // Проверяем, умеет ли это здание в его текущем состоянии нанимать данный тип юнитов
        if (!obj.allowedProduction || !obj.allowedProduction.includes(unitId)) {
            console.warn(`[ObjectManager] Здание [${obj.name}] не умеет производить юнитов типа "${unitId}".`);
            return false;
        }

        const unitTemplate = AppState.characters?.[unitId];
        const singleCost = unitTemplate?.stats?.cost || 0;
        const totalCost = singleCost * count;

        // Вычитаем золото/ресурсы за наем юнитов
        if (!this._checkAndConsumeResources({ gold: totalCost })) {
            console.warn("[ObjectManager] Недостаточно золота для найма отряда.");
            return false;
        }

        // Добавляем юнитов во внутренний гарнизон здания
        if (!obj.units) obj.units = {};
        obj.units[unitId] = (obj.units[unitId] || 0) + count;

        console.log(`[ObjectManager] В гарнизон здания [${obj.name}] успешно добавлено ${count}x "${unitId}"`);
        return true;
    },

    /**
     * 📈 3. РАЗВИТИЕ / АПГРЕЙД ЗДАНИЯ (Upgrade)
     * @param {string} instanceId - ID эволюционирующего здания
     */
    upgradeStructure(instanceId) {
        const obj = AppState.objects?.[instanceId] || AppState.entities?.[instanceId];
        if (!obj) return false;

        const nextLevel = Number(obj.level || 1) + 1;
        // Ищем в чертеже параметры для следующего уровня (из массива или объекта конфига уровней)
        const upgradeConfig = obj.upgradeLevels?.[nextLevel];

        if (!upgradeConfig) {
            console.log(`[ObjectManager] Здание [${obj.name}] уже достигло максимального уровня razvoja.`);
            return false;
        }

        // Проверяем и списываем цену апгрейда
        if (!this._checkAndConsumeResources(upgradeConfig.upgradeCost)) {
            console.warn(`[ObjectManager] Недостаточно ресурсов для улучшения здания до ${nextLevel} уровня.`);
            return false;
        }

        // Мутируем статы и возможности здания под конфиг нового уровня
        obj.level = nextLevel;
        // if (upgradeConfig.name) obj.name = upgradeConfig.name;
        if (upgradeConfig.allowedProduction) obj.allowedProduction = upgradeConfig.allowedProduction;

        // Если апгрейд увеличивает прочность стен/здания
        if (obj.stats && upgradeConfig.bonusHp) {
            obj.stats.maxHp += upgradeConfig.bonusHp;
            obj.stats.hp += upgradeConfig.bonusHp;
        }

        if (upgradeConfig.bonusProduction && obj.production) {
            Object.entries(upgradeConfig.bonusProduction).forEach(([resKey, amt]) => {
                obj.production[resKey] = (obj.production[resKey] || 0) + amt;
            });
        }

        if (upgradeConfig.goods) {
            obj.goods = JSON.parse(JSON.stringify(upgradeConfig.goods));
        }

        console.log(`[ObjectManager] Здание [${instanceId}] успешно улучшено до уровня ${obj.level} (${obj.name})`);
        AppState.engine.MapManager.refreshWorldRender();
        return true;
    },

    /**
     * 💰 Вспомогательный метод: Проверка баланса и жесткое списание ресурсов игрока
     */
    _checkAndConsumeResources(costConfig) {
        if (!costConfig) return true; // Бесплатно
        // if (!AppState.player.resources) AppState.player.resources = { gold: 0, wood: 0, ore: 0 };
        //
        // const res = AppState.player.resources;
        //
        // // Первая фаза: Сверка баланса
        // for (const [resType, amount] of Object.entries(costConfig)) {
        //     if ((res[resType] || 0) < amount) return false;
        // }
        //
        // // Вторая фаза: Честное списание
        // for (const [resType, amount] of Object.entries(costConfig)) {
        //     res[resType] -= amount;
        // }

        const faction = AppState.factions?.[AppState.player.faction];
        if (!faction || !faction.resources) {
            console.warn(`[ObjectManager] Фракция "${factionId}" или её склад ресурсов не найдены.`);
            return false;
        }

        const factionRes = faction.resources;

        // Фаза 1: Сверка баланса по фракционному паспорту
        for (const [resType, amount] of Object.entries(costConfig)) {
            if ((factionRes[resType] || 0) < amount) {
                return false; // У фракции не хватает золота, дерева, руды или еды!
            }
        }

        // Фаза 2: Списание со склада фракции
        for (const [resType, amount] of Object.entries(costConfig)) {
            factionRes[resType] -= amount;
        }

        return true;
    }
};

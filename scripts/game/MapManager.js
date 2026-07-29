// ==== MapManager.js
import { AppState } from '../shared/GameState.js';
import {HexTile} from '../shared/MapData.js';

export const MapManager = {
    /**
     * 🗺️ 1. ГЛОБАЛЬНОЕ СМЕНА ИГРОВОЙ КАРТЫ (Генерация/Подгрузка слоев)
     * @param {string} targetMapId - ID карты, на которую переходим (например, 'tactical_arena' или 'world_map')
     */
    switchMap(targetMapId) {
        if (!AppState.maps) AppState.maps = {};
        const currentMapId = AppState.map?.mapId;

        // Бэкапим тайлы текущей карты перед уходом
        if (currentMapId && AppState.map.tiles) {
            AppState.maps[currentMapId] = {
                mapId: currentMapId,
                tiles: new Map(AppState.map.tiles)
            };
        }

        // Инициализируем целевую карту в реестре
        if (!AppState.maps[targetMapId]) {
            AppState.maps[targetMapId] = {
                mapId: targetMapId,
                tiles: new Map()
            };
        }

        // Переключаем активный корневой указатель AppState
        AppState.map = {
            mapId: targetMapId,
            tiles: AppState.maps[targetMapId].tiles
        };

        // =========================================================================
        // 🔄 СБОРКА ИНДЕКСА ТЕКУЩЕЙ КАРТЫ (Объединяем персонажей и объекты)
        // =========================================================================
        this._rebuildEntitiesIndex(targetMapId);
        // =========================================================================

        console.log(`[MapManager] Движок переключился на карту: "${targetMapId}". Индекс entities пересобран.`);
    },

    newMap() {
        if (!AppState.maps) AppState.maps = {};
        const ids = Object.keys(AppState.maps);

        let userInput = "";
        let isValid = false;

        while (!isValid) {
            userInput = prompt("Enter unique id");

            if (userInput === null) {
                return; // Просто выходим из функции, если пользователь нажал Отмену
            }

            userInput = userInput.trim();

            if (userInput !== "" && !ids.includes(userInput)) {
                isValid = true;

                // Записываем новую карту под валидным ID (например, пустой объект или дефолтную структуру)
                AppState.maps[userInput] = {
                    id: userInput,
                    created: new Date()
                };

                console.log(`Map with id "${userInput}" successfully created!`);

                const currentMapId = userInput;

                AppState.maps[currentMapId] = {
                    mapId: currentMapId,
                    tiles: new Map()
                };

                // const tile = {
                //     q:0,r:0,col:0,row:0,height:1,
                //     type: 'water', imageIndex:0
                // };;
                const tile = new HexTile(0,0,0,0);
                tile.height = 1;  tile.imageIndex = 0;  tile.type = 'water';

                AppState.maps[currentMapId].tiles.set(`0,0`, tile);

                AppState.map = AppState.maps[currentMapId];

                this._rebuildEntitiesIndex(currentMapId);

                window.renderMap();
                // =========================================================================

                console.log(`[MapManager] Движок переключился на карту: "${currentMapId}". Индекс entities пересобран.`);
            } else {
                alert("Invalid id! Please try again.");
            }
        }
    },

    saveMap() {
        console.log(AppState);

        const StateKeys = [
            "sizes",

            // "config",
            "turn_settings",
            "maps",
            "map",
            "game_settings",
            "sound",

            "entities",
            "characters",
            "objects",
            "factions",
            "pacts",
            "relations",
            "combat_formulas",
            "projectiles",
            "items",
            "pets",
            "effects",
            "skills",
            "hero_elements",
            "hero_categories",
            "classes",
            "dialogs",
            "triggers",
            "quests",
            "ui",
            "localization"
        ];

        const SaveFile = {};
        StateKeys.forEach(key=>{
            SaveFile[key] = AppState[key];
        });

        Object.keys(AppState.maps).forEach(mapId=>{
            SaveFile.maps[mapId].tiles = [...AppState.maps[mapId].tiles];
        });
        console.log(SaveFile);
        localStorage.setItem('zcgstudio_temp', JSON.stringify(SaveFile));
    },

    loadMap() {
        const temp = localStorage.getItem('zcgstudio_temp');
        if(!temp) return;
        try {
            const SaveFile = JSON.parse(temp);

            delete SaveFile['config'];
            console.log(SaveFile);

            Object.keys(SaveFile).forEach(key=>{
                if(!['factions','characters','pacts', 'ui', "localization"].includes(key)) {
                    AppState[key] = SaveFile[key];
                }

                if(key==='characters') {
                    Object.keys(SaveFile.characters || {}).forEach(ck=>{
                        if(!AppState[key][ck]) {
                            AppState[key][ck] = SaveFile[key][ck];
                        }
                    });
                }
            });

            Object.keys(SaveFile.maps).forEach(mapId=>{
                AppState.maps[mapId] = SaveFile.maps[mapId];
                AppState.maps[mapId].tiles = new Map(SaveFile.maps[mapId].tiles);
            });

            AppState.map.tiles = null;

            if(window.init) window.init();

        } catch(e) {
            console.error(e);
        }
    },

    /**
     * 🏃‍♂️ 2. ТЕЛЕПОРТАЦИЯ ПЕРСОНАЖА (И его сопартийцев) НА КАРТУ И КЛЕТКУ
     */
    teleportCharacter(charId, targetMapId, q, r) {
        const char = AppState.characters?.[charId];
        if (!char) return false;

        const targetQ = parseInt(q, 10);
        const targetR = parseInt(r, 10);

        // Переносим лидера
        char.mapId = targetMapId;
        char.mapPosition = { q: targetQ, r: targetR };
        char.action = 'idle';
        char.currentActivePath = [];
        char.currentMovementVisualPath = [];

        console.log(targetMapId, targetQ, targetR, char);

        console.log(JSON.parse(JSON.stringify(char.mapPosition)));

        // Переносим уникальных сопартийцев на соседние гексы
        if (char.units) {
            console.log(char.units);
            Object.keys(char.units).forEach(uId => {
                const companion = AppState.characters[uId];
                const isUniqueCompanion = companion && !!companion.mapId;
                console.log(companion, isUniqueCompanion);
                if (isUniqueCompanion) {
                    // 1. СНАЧАЛА жестко меняем карту сопартийцу, чтобы рендерер не стёр его спрайт
                    companion.mapId = targetMapId;

                    // 2. СТРОГИЙ ФИКС КОНТЕКСТА: Вызываем метод напрямую через MapManager, а не через теряющийся this!
                    AppState.engine.MapManager.teleportCharacter(uId, targetMapId, q, r);
                }
            });
            this._rebuildEntitiesIndex(targetMapId);
        }

        // Если телепортировали активного игрока — пересобираем объектный индекс entities под новую карту
        if (charId === AppState.play?.activeCharacterId || charId === AppState.player?.character) {

            this._rebuildEntitiesIndex(targetMapId);
            AppState.engine.playerClickManager.executeCharacterSelect(AppState.play?.activeCharacterId);
        }

        return true;
    },

    /**
     * ⚙️ Вспомогательный метод: Сборка объектного хэша ссылок для текущего экрана
     */
    _rebuildEntitiesIndex(mapId) {
        // СТРОГИЙ ФИКС: Очищаем старый индекс как ОБЪЕКТ
        AppState.entities = {};

        // 1. Собираем живые ссылки из реестра персонажей (characters)
        if (AppState.characters) {
            Object.values(AppState.characters).forEach(char => {
                if (char && char.mapId === mapId && !char.isDead) {
                    AppState.entities[char.id] = char;
                }
            });
        }

        // 2. Собираем живые ссылки из реестра интерактивных объектов (objects)
        if (AppState.objects) {
            Object.values(AppState.objects).forEach(obj => {
                if (obj && obj.mapId === mapId && !obj.isDead) {

                    const baseTemplate = AppState.ConfigObject?.[obj.type] ? JSON.parse(JSON.stringify(AppState.ConfigObject[obj.type])) : {};
                    // const mergedData = Object.assign({}, obj, baseTemplate);
                    const mergedData = Object.assign({}, baseTemplate, obj);
                    Object.assign(obj, mergedData);

                    AppState.entities[obj.id] = obj;
                }
            });
        }

        // Считаем количество ключей в объекте для отладочного лога
        const entitiesCount = Object.keys(AppState.entities).length;
        console.log(`[MapManager] Живых сущностей (Entities) на карте "${mapId}": ${entitiesCount}`, AppState.entities);
    },


    /**
     * 🔄 3. ПРИНУДИТЕЛЬНЫЙ ПОЛНЫЙ ПЕРЕРЕНДЕР ВСЕЙ ГРАФИКИ И КАМЕРЫ
     * Вызывается после любых манипуляций с картами
     */
    refreshWorldRender(focusCharId = null) {
        // Запускаем твой очищающий Pixi-рендерер worldMapContainer.removeChildren()
        if (window.renderMap) {
            window.renderMap();
        }

        // Центрируем камеру на выбранном или текущем активном персонаже игрока
        const charId = focusCharId || AppState.play?.activeCharacterId || AppState.player?.character;
        const targetChar = AppState.entities?.[charId];

        if (targetChar && AppState.engine?.centerCameraOnCharacter) {
            AppState.engine.centerCameraOnCharacter(targetChar);

            AppState.engine.playerClickManager.executeCharacterSelect(charId);
        }

        // Обновляем туман войны
        if (AppState.engine?.visionManager?.updateFogOfWar) {
            AppState.engine.visionManager.updateFogOfWar();
        }

        // Обновляем шкалы HUD интерфейса
        if (AppState.engine?.uiManager?.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    },

    getTile(q, r) {
        return AppState.map.tiles.get(`${q},${r}`);
    },

    /**
     * 🗺️ ВЫДЕЛЕННАЯ ФУНКЦИЯ ОТРИСОВКИ ПОЛИТИЧЕСКИХ ГРАНИЦ И ЗАЛИВКИ ТЕРРИТОРИИ
     * @param {Object} tile - Объект текущей клетки (гекса) из AppState.map.tiles
     * @param {PIXI.Graphics} strokeGraphics - Графический объект рамки этого гекса
     * @param {Object} hexMath - Твой инстанс HexMath для получения вершин
     */

    /**
     * 🗺️ ОТРИСОВКА ПОЛИТИЧЕСКИХ ГРАНИЦ И ЗАЛИВКИ ТЕРРИТОРИИ ПО ИЕРАРХИИ ПРОВИНЦИЙ
     */

    drawFactionBorders(tile) {
        const graphics = new PIXI.Graphics();
        const faction1 = AppState.engine.factionManager.getTileFaction(tile);

        if (!faction1) return;


        if(tile.q===10 && tile.r===9) {
            console.log('faction1', faction1);
        }

        const fillColor = 0x0077ff;
        const strokeColor = 0x00dfff;
        const fillAlpha = 0.3;

        // const points = AppState.engine.hexMath.getHexCornerPoints(tile.visualX, tile.visualY);
        const points = AppState.engine.hexMath.getHexCornerPoints(0, 0);

        // 2. Рисуем фон
        graphics.beginFill(fillColor, fillAlpha);
        graphics.drawPolygon(points);
        graphics.endFill();

        const neighborCoords = AppState.engine.hexMath.getNeighbors(tile.q, tile.r);

        // 4. Безопасное создание массива индексов стартовых углов граней
        const startAngleIndices = [5, 0, 4, 1, 3, 2];
        // 5. Проверяем соседей
        for (let i = 0; i < 6; i++) {
            const nCoord = neighborCoords[i];

            // Поиск соседа по ключу q_r
            const neighbor = AppState.map.tiles.get(`${nCoord.q},${nCoord.r}`);
            if(!neighbor || !neighbor.type) continue;

            const faction2 = AppState.engine.factionManager.getTileFaction(neighbor);

            if(tile.q===10 && tile.r===9) {
                console.log('faction2', neighbor, {faction2});
            }

            if (faction1 !== faction2) {
                const p1Idx = startAngleIndices[i];
                const p2Idx = (p1Idx + 1) % 6;

                const x1 = points[p1Idx * 2];
                const y1 = points[p1Idx * 2 + 1];
                const x2 = points[p2Idx * 2];
                const y2 = points[p2Idx * 2 + 1];

                // Отрисовка сочной линии
                graphics.lineStyle(3, strokeColor, 1.0);
                graphics.moveTo(x1, y1);
                graphics.lineTo(x2, y2);
                graphics.lineStyle(0);
            }
        }


        return graphics;
    },

    refreshMapPoliticsVisuals() {
        if (!AppState.map?.tiles) return;

        Object.values(AppState.map.tiles).forEach(tile => {
            if (tile && tile.graphicsObj) {
                // Очищаем старые линии полигона тайла
                tile.graphicsObj.clear();
                // Заново вызываем наш пограничный прогон!
                this.drawFactionBorders(tile, tile.graphicsObj, tile.screenX, tile.screenY);
            }
        });
    }

};

// ==== ArenaManager.js
import { AppState } from '../shared/GameState.js';
import { MapData, HexTile } from '../shared/MapData.js';


const width = 10;
const height = 5;

export const ArenaManager = {
    // Локальный регистр для хранения базового здоровья одной единицы в стаке
    _singleHpRegistry: {},

    /**
     * ⚔️ 1. ВХОД НА ТАКТИЧЕСКУЮ АРЕНУ
     */
    /**
     * ⚔️ 1. ВХОД НА ТАКТИЧЕСКУЮ АРЕНУ (Динамические размеры)
     */
    enterTacticalArena(playerLeaderId, enemyLeaderId) {
        const playerLeader = AppState.entities?.[playerLeaderId];
        const enemyLeader = AppState.entities?.[enemyLeaderId];

        if (!playerLeader || !enemyLeader) {
            console.error("[ArenaManager] Не найден один из лидеров для старта боя.");
            return;
        }

        // 1. Сохраняем старые глобальные координаты и текущий ID карты мира
        playerLeader.mapPositionOld = { q: playerLeader.mapPosition.q, r: playerLeader.mapPosition.r, mapId: AppState.map.mapId };
        enemyLeader.mapPositionOld = { q: enemyLeader.mapPosition.q, r: enemyLeader.mapPosition.r, mapId: AppState.map.mapId };

        playerLeader.statsOld = JSON.parse(JSON.stringify({ vision: playerLeader.vision, movement: playerLeader.movement }));
        enemyLeader.statsOld = JSON.parse(JSON.stringify({ vision: enemyLeader.vision, movement: enemyLeader.movement }));

        const maxDist = width+height;



        // Считываем биом клетки боя
        const currentQ = enemyLeader.mapPosition.q;
        const currentR = enemyLeader.mapPosition.r;
        const globalTile = AppState.map.tiles.get(`${currentQ},${currentR}`) || AppState.map.tiles.get(`${currentQ}_${currentR}`);
        const combatBiome = globalTile?.type || globalTile?.terrain || 'grass';

        // Переключаем AppState на структуру новой тактической карты
        // AppState.maps[AppState.map.mapId].tiles = JSON.parse(JSON.stringify(AppState.map.tiles));

        // AppState.map = {
        //     mapId: 'tactical_arena',
        // };
        //
        // AppState.maps['tactical_arena'] = {
        //     mapId: 'tactical_arena',
        //     tiles: new Map()
        // };

        AppState.engine.MapManager.switchMap('tactical_arena');

        // Генерируем арену динамическим методом, пробрасывая размеры
        this._generateArenaMap(width, height, combatBiome);

        this._singleHpRegistry = {};

        const playerCol = 1;
        // Враг всегда на предпоследнем правом столбце, независимо от ширины (width - 2)
        const enemyCol = width - 2;

        console.log(playerLeaderId, enemyLeaderId);

        AppState.engine.MapManager.teleportCharacter(playerLeaderId, 'tactical_arena', 1, 4 - Math.floor(1 / 2));
        AppState.engine.MapManager.teleportCharacter(enemyLeaderId, 'tactical_arena', width - 2, 4 - Math.floor((width - 2) / 2));
        AppState.engine.MapManager._rebuildEntitiesIndex('tactical_arena');

        console.log(AppState.characters);

        console.log(AppState.entities);

        // 2. РАСПАКОВКА И РАССТАНОВКА ВОЙСК НА НОВОЙ КАРТЕ (Пробрасываем height для центрирования)
        this._unpackArmy(playerLeader, 'player', playerCol, height);
        this._unpackArmy(enemyLeader, 'enemy', enemyCol, height);

        // Подменяем живые тайлы в AppState на сгенерированную арену
        // AppState.map.tiles = AppState.maps['tactical_arena'].tiles;


        if (AppState.game_settings?.battleOpenMap === true) {
            playerLeader.vision.current = maxDist;
            enemyLeader.vision.current = maxDist;
            console.log("[ArenaManager] 👁️ Оверрайд: Включен battleOpenMap. Обзор увеличен до 99.");
        }

        // Б. Если включен свободный ход — выставляем бесконечные очки передвижения
        if (AppState.game_settings?.battleFreeMove === true) {
            playerLeader.movement.current = maxDist;
            enemyLeader.movement.current = maxDist;

            console.log("[ArenaManager] 🥾 Оверрайд: Включен battleFreeMove. Передвижение увеличено до 99.");
        }

        console.log(`[ArenaManager] Тактическая арена ${width}x${height} [${combatBiome}] успешно сформирована.`);

        setTimeout(()=>{

            const container = AppState.engine?.worldMapContainer || AppState.engine?.mapContainer;

            if (container) {
                // Размер одного твоего гекса в пикселях. Подставь сюда константу из своего движка (например, 32, 48 или 64)
                const hexSize = AppState.sizes.hex;

                // Рассчитываем примерные габариты всей тактической арены в пикселях
                // Для flat-top hex ширина шага это hexSize * 1.5, высота — hexSize * Math.sqrt(3)
                const totalMapWidth = width * (hexSize * 1.5);
                const totalMapHeight = height * (hexSize * Math.sqrt(3));

                // Находим идеальные пиксельные отступы, чтобы карта встала ровно по центру
                const offsetX = Math.max(0, (window.innerWidth - totalMapWidth) / 2);
                const offsetY = Math.max(0, (window.innerHeight - totalMapHeight) / 2);

                // Физически сдвигаем контейнер PixiJS на экране
                container.x = offsetX;
                container.y = offsetY;

                console.log(`[ArenaManager] Арена отцентрирована. Отступы на холсте PixiJS: X=${offsetX}px, Y=${offsetY}px`);
            }
            AppState.engine.MapManager.refreshWorldRender();
            // if (AppState.engine?.uiManager?.updateAll) {
            //     AppState.engine.uiManager.updateAll();
            // }
            //
            // AppState.engine.playerClickManager.executeCharacterSelect(AppState.player?.character);
            //
            // window.renderMap();
            if(window.resumeTicker) window.resumeTicker();
        }, 100);
    },

    /**
     * ТВОЯ РОДНАЯ И ПРАВИЛЬНАЯ ГЕНЕРАЦИЯ КАРТЫ АРЕНЫ (С КЛЮЧОМ ЧЕРЕЗ ЗАПАТУЮ)
     */
    _generateArenaMap(width, height, terrain) {
        for (let col = 0; col < width; col++) {
            for (let row = 0; row < height; row++) {
                const q = col;
                const r = row - Math.floor(col / 2);

                // Создаем тайл на основе твоего класса
                const tile = new HexTile(q, r, col, row);

                if (terrain) {
                    tile.type = terrain;
                } else {
                    tile.type = 'grass';
                }

                tile.height = 1;

                const config = AppState.ConfigTerrain[tile.type];
                if (config && config.images && config.images.length > 0) {
                    tile.imageIndex = Math.floor(Math.random() * config.images.length);
                }

                // Записываем строго по ключу через запятую "q,r"
                AppState.maps['tactical_arena'].tiles.set(`${q},${r}`, tile);
            }
        }
    },

    /**
     * 🔧 Вспомогательный метод расстановки отрядов по строкам (row)
     */
    /**
     * 🔧 Вспомогательный метод расстановки отрядов по строкам (row)
     */
    _unpackArmy(leader, teamSide, spawnCol, mapHeight) {
        const unitsConfig = leader.units || {};
        const unitIds = Object.keys(unitsConfig);

        // Считаем общее количество отрядов в этой банде (лидер + его юниты)
        const totalSquads = 1 + unitIds.length;

        // =========================================================================
        // АВТОМАТИЧЕСКИЙ РАСЧЕТ СТАРТОВОЙ СТРОКИ
        // =========================================================================
        // Находим центральную строку арены и сдвигаем старт вверх наполовину размера армии,
        // чтобы отряды сели ровно посередине вертикальной оси, сколько бы их ни было
        const centerRow = Math.floor(mapHeight / 2);
        let currentRow = Math.max(0, centerRow - Math.floor(totalSquads / 2));

        // Выставляем живого оригинального лидера без клонирования
        this._setupOriginalUnit(leader, spawnCol, currentRow, 1);
        currentRow++;

        // Расставляем массовые стаки из армии лидера по следующим строчкам row
        unitIds.forEach(itemId => {
            // Защита, чтобы при слишком большой армии не вылететь за нижний край сетки (height - 1)
            if (currentRow >= mapHeight) return;

            const rawNum = unitsConfig[itemId] || 1;
            const battleUnitId = `btl_${teamSide}_${itemId}`;

            this._setupTacticalUnit(itemId, battleUnitId, spawnCol, currentRow, rawNum);
            currentRow++;
        });
    },

    /**
     * 🔧 Настройка оригинальных лидеров под твою геометрию col/row
     */
    _setupOriginalUnit(leaderObject, col, row, stackCount) {
        // СТРОГИЙ ФИКС: Работаем напрямую с переданным живым объектом лидера,
        // вообще не пытаясь искать его в AppState.characters по строковым ID!
        if (!leaderObject) return;

        leaderObject.mapId = 'tactical_arena';
        leaderObject.currentMovementVisualPath = [];

        // Вычисляем гексагональные координаты СТРОГО по формуле твоей функции генерации карты!
        leaderObject.mapPosition = {
            q: col,
            r: row - Math.floor(col / 2)
        };

        const singleHp = leaderObject.stats?.hp || 100;
        this._singleHpRegistry[leaderObject.id] = singleHp;
        leaderObject.num = stackCount;

        if (leaderObject.stats) {
            leaderObject.stats.ap = leaderObject.stats.speed || 10;
        }

        console.log(`[ArenaManager] Лидер [${leaderObject.id}] успешно встал на Col:${col}, Row:${row} -> (${leaderObject.mapPosition.q}, ${leaderObject.mapPosition.r})`);
    },

    /**
     * 🔧 Настройка тактических стаков под твою геометрию col/row
     */
    _setupTacticalUnit(originalId, battleId, col, row, stackCount) {
        const baseChar = AppState.entities?.[originalId];
        if (!baseChar) return;

        const tacticalUnit = JSON.parse(JSON.stringify(baseChar));
        tacticalUnit.id = battleId;
        tacticalUnit.original_id = originalId;
        tacticalUnit.num = stackCount;

        // Вычисляем гексагональные координаты СТРОГО по формуле твоей функции генерации карты!
        tacticalUnit.mapPosition = {
            q: col,
            r: row - Math.floor(col / 2)
        };

        const singleHp = tacticalUnit.stats?.hp || 100;
        this._singleHpRegistry[battleId] = singleHp;

        if (tacticalUnit.stats) {
            tacticalUnit.stats.maxHp = (tacticalUnit.stats.maxHp || singleHp) * stackCount;
            tacticalUnit.stats.hp = singleHp * stackCount;
            tacticalUnit.stats.ap = tacticalUnit.stats.speed || 10;
        }

        AppState.entities[battleId] = tacticalUnit;
        console.log(`[ArenaManager] Боевой стак [${battleId}] успешно встал на Col:${col}, Row:${row} -> (${tacticalUnit.mapPosition.q}, ${tacticalUnit.mapPosition.r})`);
    },

    /**
     * 📊 Обновление количества живых в стаке при получении урона
     */
    updateStackState(battleUnitId) {
        const char = AppState.entities?.[battleUnitId];
        const singleHp = this._singleHpRegistry[battleUnitId];
        if (!char || !char.stats || !singleHp) return;

        if (char.stats.hp <= 0) {
            char.num = 0;
            return;
        }
        char.num = Math.ceil(char.stats.hp / singleHp);
    },

    /**
     * 🚪 3. ВЫХОД С ТАКТИЧЕСКОЙ АРЕНЫ И СБОР ПОТЕРЬ
     */
    // ==== Добавь этот метод внутрь объекта ArenaManager в файле ArenaManager.js

    /**
     * 📊 ПРОВЕРКА ОКОНЧАНИЯ ТАКТИЧЕСКОГО БОЯ
     * Вызывается из CombatManager после смерти любого юнита
     */
    /**
     * 📊 АВТОНОМНАЯ ПРОВЕРКА ОКОНЧАНИЯ ТАКТИЧЕСКОГО БОЯ
     * @param {Object} victim - Объект персонажа, который только что погиб
     */
    checkBattleEnd(victim) {
        if (!victim) return false;

        // 1. Автоматически находим в памяти текущих лидеров по наличию сохраненного стратегического контекста
        let playerLeaderId = null;
        let enemyLeaderId = null;

        Object.values(AppState.entities).forEach(char => {
            // Лидер игрока имеет старый контекст и его ID совпадает с активным героем (или фракцией игрока)
            if (char && char.mapPositionOld) {
                if (char.id === AppState.play?.activeCharacterId || char.id === AppState.player?.character) {
                    playerLeaderId = char.id;
                } else {
                    enemyLeaderId = char.id;
                }
            }
        });

        // Если лидеров в памяти уже нет (например, стерли раньше), подставляем фолбэки
        if (!playerLeaderId) playerLeaderId = AppState.play?.activeCharacterId || 'rafael';

        // 2. Собираем список всех оставшихся в живых бойцов на тактической арене
        const activeTacticalUnits = Object.values(AppState.entities).filter(c => {
            return c && c.mapId === 'tactical_arena' && c.stats?.hp > 0 && c.id !== victim.id;
        });

        // 3. Проверяем, остался ли хоть кто-то живой с каждой стороны
        const isPlayerAlive = activeTacticalUnits.some(c => c.id === playerLeaderId || c.id.startsWith('btl_player_'));
        const isEnemyAlive = activeTacticalUnits.some(c => c.id === enemyLeaderId || c.id.startsWith('btl_enemy_'));

        console.log(`[ArenaManager] Погиб: ${victim.name}. Живые союзники: ${isPlayerAlive}, Живые враги: ${isEnemyAlive}`);

        if(AppState.characters[victim.id]) AppState.characters[victim.id].isDead = true;
        if(AppState.objects[victim.id]) AppState.objects[victim.id].isDead = true;




        delete AppState.entities[victim.id];

        // 4. ФИКСАЦИЯ ИТОГОВ БОЯ
        // А. Победа игрока: Наши живы, вражеская команда стёрта под ноль
        if (isPlayerAlive && !isEnemyAlive) {
            console.log("[ArenaManager] 🎉 Все силы противника разбиты. Выход с арены.");
            this.exitTacticalArena(playerLeaderId, enemyLeaderId);
            return true;
        }

        // Б. Поражение игрока: Все отряды игрока на арене уничтожены
        if (!isPlayerAlive) {
            console.log("[ArenaManager] 💀 Силы игрока полностью уничтожены. Выход с арены.");
            this.exitTacticalArena(playerLeaderId, enemyLeaderId);
            return true;
        }

        // Бой продолжается
        return false;
    },


    exitTacticalArena(playerLeaderId, enemyLeaderId) {
        const playerLeader = AppState.entities?.[playerLeaderId];
        const enemyLeader = AppState.entities?.[enemyLeaderId];
        if (!playerLeader && !enemyLeader) return;
        if(window.stopTicker) window.stopTicker();

        const winnerLeader = playerLeader || enemyLeader;
        const isPlayerWinner = winnerLeader.id === AppState.player?.character;

        // 1. Фиксируем выживших юнитов в units
        if (winnerLeader.units) {
            const currentUnits = winnerLeader.units;
            Object.keys(currentUnits).forEach(itemId => {
                const battleId = `btl_player_${itemId}`;
                const tacticalChar = AppState.entities?.[battleId];

                if (!tacticalChar || tacticalChar.stats?.hp <= 0 || (tacticalChar.num || 0) <= 0) {
                    delete currentUnits[itemId];
                } else {
                    currentUnits[itemId] = tacticalChar.num;
                }
            });
        }

        // 2. Очищаем временных тактических бойцов из памяти characters
        Object.keys(AppState.entities).forEach(id => {
            if (id.startsWith('btl_')) delete AppState.entities[id];
        });

        if(!isPlayerWinner) {
            // game over / respawn
        }

        const oldMapId = winnerLeader.mapPositionOld.mapId;
        AppState.engine.MapManager.switchMap(oldMapId);
        AppState.engine.MapManager.teleportCharacter(winnerLeader.id, oldMapId, winnerLeader.mapPositionOld.q, winnerLeader.mapPositionOld.r);

        // AppState.map.mapId = winnerLeader.mapPositionOld.mapId;
        // AppState.map.tiles = AppState.maps[winnerLeader.mapPositionOld.mapId].tiles;
        //
        // winnerLeader.mapId = winnerLeader.mapPositionOld.mapId;
        // winnerLeader.mapPosition = { q: winnerLeader.mapPositionOld.q, r: winnerLeader.mapPositionOld.r };
        // winnerLeader.currentMovementVisualPath = [];

        delete winnerLeader.mapPositionOld;

        if (winnerLeader.statsOld) {
            winnerLeader.vision = JSON.parse(JSON.stringify(winnerLeader.statsOld.vision));
            winnerLeader.movement = JSON.parse(JSON.stringify(winnerLeader.statsOld.movement));
            console.log(JSON.parse(JSON.stringify(winnerLeader)));
            delete winnerLeader.statsOld; // Чистим временный объект
        }

        if (AppState.play.currentBattleXpPool > 0) {
            console.log(`[ArenaManager] Бой завершён победой! Вскрытие буфера опыта: +${AppState.play.currentBattleXpPool}`);

            AppState.engine.CharacterLevelUpManager.distributeExperience(AppState.play.currentBattleXpPool, winnerLeader.id, 'win');

            // Сбрасываем пул для следующих сражений
            AppState.play.currentBattleXpPool = 0;
        }

        setTimeout(()=>{

            const container = AppState.engine?.worldMapContainer || AppState.engine?.mapContainer;

            if (container) {
                container.x = 0;
                container.y = 0;
            }

            AppState.engine.MapManager.refreshWorldRender();
            //
            // if (AppState.engine.centerCameraOnCharacter) {
            //     AppState.engine.centerCameraOnCharacter(AppState.player?.character);
            // }
            //
            // if (AppState.engine.visionManager?.updateFogOfWar) {
            //     AppState.engine.visionManager.updateFogOfWar();
            // }
            //
            // if (AppState.engine.pathRenderer?.drawMovementZone) {
            //     AppState.engine.pathRenderer.drawMovementZone();
            // }
            //
            // if (AppState.engine?.uiManager?.updateAll) {
            //     AppState.engine.uiManager.updateAll();
            // }
            //
            // AppState.engine.playerClickManager.executeCharacterSelect(AppState.player?.character);
            //
            // window.renderMap();
            if(window.resumeTicker) window.resumeTicker();
        }, 100);
    }
};
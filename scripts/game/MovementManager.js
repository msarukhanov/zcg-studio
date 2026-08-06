import { AppState, getActiveMap, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';


export class MovementManager {
    constructor() {
        // Конструктор абсолютно пуст, никакого Prop Drilling
    }

    getMovementCost(fromTile, toTile) {
        const config = AppState.ConfigTerrain[toTile.type];
        let cost = config ? config.movementCost : 1;
        if (toTile.height - fromTile.height === 0.5) cost += 1;
        return cost;
    }

    canStepBetween(fromTile, toTile, characterObj) {
        if (!characterObj || !characterObj.faction) return false;
        if (toTile.type==='air') return true;

        // 1. ПЕРЕПАД ВЫСОТЫ И ЛАНДШАФТ
        if (toTile.height - fromTile.height > 0.5) return false;

        const terrainConfig = AppState.ConfigTerrain[toTile.type];
        const movementTerrains = characterObj.movementTerrains || [];

        // if (!terrainConfig || (!terrainConfig.passable && !movementTerrains.includes(toTile.type)) ) return false;
        if (!terrainConfig || !movementTerrains.includes(toTile.type)) return false;

        // 3. ДИПЛОМАТИЯ ДЛЯ ЮНИТОВ НА ГЕКСЕ
        let hasEnemyOnTile = false;
        let hasAllyOnTile = false;
        let hasOtherOnTile = false;
        let isTileBlockedByObject = false;

        // СТРОГИЙ ФИКС: Перебираем сущности текущей карты через for...of
        for (const char of Object.values(AppState.entities)) {
            if (char && char.mapPosition && char.mapPosition.q === toTile.q && char.mapPosition.r === toTile.r) {

                // Если это живой персонаж с фракцией — проверяем дипломатию
                if (char.faction && !char.isDead) {
                    const pact = getPactBetween(characterObj.faction, char.faction);
                    if (pact === DiplomaticPacts.WAR && char.stats?.hp > 0) {
                        hasEnemyOnTile = true;
                        continue;
                    }
                    // if (pact === DiplomaticPacts.ALLIANCE && char.stats?.hp > 0) {
                    //     hasAllyOnTile = true;
                    //     continue;
                    // }
                }

                // Если у объекта явно прописано блокирование движения (blocksMovement: true)
                if (char.blocksMovement === true) {
                    isTileBlockedByObject = true;
                }
            }
        }

        // ВЫСТАВЛЯЕМ СТРОГИЙ ПРИОРИТЕТ ДЛЯ АЛГОРИТМА А*
        if (hasEnemyOnTile) return "enemy";
        // if (hasAllyOnTile)  return "ally";

        if (isTileBlockedByObject) return "blocked";

        // Если никаких препятствий нет — клетка абсолютно свободна для шага
        return "walkable";
    }

    getReachableTiles(characterObj) {
        const startTile = getTileFromState(characterObj.mapPosition.q, characterObj.mapPosition.r);
        if (!startTile) return [];

        const hexMath = AppState.engine.hexMath;
        const currentMap = getActiveMap();

        // Очищаем старые флаги отрисовки атаки перед расчетом
        if (currentMap && currentMap.tiles) {
            currentMap.tiles.forEach(tile => {
                delete tile.isEnemyTarget;
            });
        }

        const reachable = [];
        const queue = [startTile];
        const gScore = new Map();
        gScore.set(startTile, 0);

        while (queue.length > 0) {
            queue.sort((a, b) => (gScore.get(a) || 0) - (gScore.get(b) || 0));
            const current = queue.shift();
            const currentCost = gScore.get(current) || 0;

            // СТРОГИЙ ФИКС: Если на прошлом шаге Дейкстра наткнулась на врага,
            // мы обрываем этот путь! Алгоритм не имеет права строить маршруты СКВОЗЬ врагов.
            if (current.isEnemyTarget) continue;

            const isStart = (current.q === startTile.q && current.r === startTile.r);
            if (!isStart) {
                // ПРИКАЗ ВЫПОЛНЕН НАМЕРТВО: В массив reachable пушатся только пустые клетки или союзники!
                // Враги и нейтралы никогда не попадут сюда в качестве доступных для остановки клеток,
                // поэтому орк физически потеряет возможность завершить движение на гексе Эрин!
                if (current.isEnemyTarget !== true) {
                    if (!reachable.includes(current)) reachable.push(current);
                }
            }

            const neighborsCoords = hexMath.getNeighbors(current.q, current.r);
            for (const coord of neighborsCoords) {
                const neighbor = getTileFromState(coord.q, coord.r);
                if (!neighbor) continue;

                const isDiscovered = AppState.player.exploredTiles.has(`${neighbor.q},${neighbor.r}`) ||
                    AppState.play.visibleTiles.has(`${neighbor.q},${neighbor.r}`);
                if (!isDiscovered) continue;

                const stepResult = this.canStepBetween(current, neighbor, characterObj);
                if (!stepResult) continue;

                const nextCost = currentCost + this.getMovementCost(current, neighbor);

                if (nextCost <= characterObj.movement.current) {
                    if (nextCost < (gScore.get(neighbor) || Infinity)) {
                        gScore.set(neighbor, nextCost);

                        // 1. ЕСЛИ НА КЛЕТКЕ ВРАГ: Подсвечиваем красным для атаки, но блокируем проход сквозь него
                        if (stepResult === "enemy") {
                            neighbor.isEnemyTarget = true;
                            if (!reachable.includes(neighbor)) reachable.push(neighbor);
                            // В queue НЕ пушим! Путь сквозь врага закрыт.
                        }

                        // 2. ЕСЛИ НА КЛЕТКЕ ОБЪЕКТ (Руины, Сундук, Стена):
                        // Снимаем таргет атаки, пушим в reachable (чтобы персонаж МОГ наступить на клетку и запустить диалог/обыск),
                        // но КАТЕГОРИЧЕСКИ НЕ пушим в queue, чтобы алгоритм не строил путь СКВОЗЬ этот объект дальше!
                        else if (stepResult === "blocked") {
                            neighbor.isEnemyTarget = false;
                            if (!reachable.includes(neighbor)) reachable.push(neighbor);
                        }

                        // 3. ЕСЛИ НА КЛЕТКЕ СОЮЗНИК: Проход сквозь него разрешен в мирное время
                        else if (stepResult === "ally") {
                            neighbor.isEnemyTarget = false;
                            if (!reachable.includes(neighbor)) reachable.push(neighbor);
                            if (!queue.includes(neighbor)) queue.push(neighbor);
                        }

                        // 4. ЕСЛИ КЛЕТКА СВОБОДНА: Полная свобода перемещения и развития путей A*
                        else if (stepResult === "walkable") {
                            neighbor.isEnemyTarget = false;
                            if (!reachable.includes(neighbor)) reachable.push(neighbor);
                            if (!queue.includes(neighbor)) queue.push(neighbor);
                        }
                        // =========================================================================
                    }
                }
            }
        }

        return reachable;
    }

    /**
     * Алгоритм поиска пути A* с обходом врагов
     */
    findPath(startQ, startR, targetQ, targetR, activeCharacter) {
        const startTile = getTileFromState(startQ, startR);
        const targetTile = getTileFromState(targetQ, targetR);

        if (!startTile || !targetTile) return null;
        if (startTile === targetTile) return [startTile];

        const hexMath = AppState.engine.hexMath;

        const openSet = [startTile];
        const closedSet = new Set();
        const cameFrom = new Map();

        const gScore = new Map();
        gScore.set(startTile, 0);

        const fScore = new Map();
        fScore.set(startTile, hexMath.getDistance(startTile, targetTile));

        while (openSet.length > 0) {
            openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
            const current = openSet.shift();
            closedSet.add(`${current.q},${current.r}`);

            if (current === targetTile) {
                const totalPath = [current];
                let curr = current;
                while (cameFrom.has(curr)) {
                    curr = cameFrom.get(curr);
                    totalPath.unshift(curr);
                }
                return totalPath;
            }

            const neighborsCoords = hexMath.getNeighbors(current.q, current.r);
            for (const coord of neighborsCoords) {
                const neighbor = getTileFromState(coord.q, coord.r);
                if (!neighbor) continue;

                const neighborKey = `${neighbor.q},${neighbor.r}`;
                if (closedSet.has(neighborKey)) continue;

                const isNeighborDiscovered = AppState.player.exploredTiles.has(neighborKey) ||
                    AppState.play.visibleTiles.has(neighborKey);
                if (!isNeighborDiscovered) continue;
                if (!this.canStepBetween(current, neighbor, activeCharacter)) continue;

                const tentativeGScore = (gScore.get(current) || 0) + this.getMovementCost(current, neighbor);

                if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    fScore.set(neighbor, tentativeGScore + hexMath.getDistance(neighbor, targetTile));

                    if (!openSet.includes(neighbor)) openSet.push(neighbor);
                }
            }
        }
        return null;
    }

    /**
     * ЛОГИКА ДВИЖЕНИЯ: Рассчитывает путь, списывает MP и ставит персонажа на рельсы анимации
     * @param {string} charId - ID ходящего персонажа (например, 'rafael')
     */
    startCharacterMovement(charId) {
        const char = AppState.entities[charId];

        if (window.selectionMarkerRef) window.selectionMarkerRef.visible = false;
        // Защита: если персонаж уже идет или пути нет — игнорируем
        if (!char || char.action === 'move' || !char.currentActivePath || char.currentActivePath.length < 2) return;

        const startTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
        let lastTile = startTile;

        const visualPathQueue = [];
        let remainingMP = char.movement.current;

        const isRealtime = AppState.turn_settings?.turn_mode === "realtime";

        // Симулируем пошаговый проход по маршруту A*, проверяя цену каждого гекса
        for (let i = 1; i < char.currentActivePath.length; i++) {
            const nextTile = char.currentActivePath[i];
            const cost = this.getMovementCost(lastTile, nextTile);

            if (remainingMP >= cost) {
                if(!isRealtime) {
                    remainingMP -= cost;
                }
                visualPathQueue.push(nextTile); // Добавляем гекс в очередь для поочередного обхода
                lastTile = nextTile;
            } else {
                break; // Закончились очки хода на этот раунд
            }
        }

        // Если Рафаэль успевает продвинуться хотя бы на одного соседа вперед
        if (visualPathQueue.length > 0) {
            // Извлекаем САМЫЙ ПЕРВЫЙ гекс из сформированной очереди для расчета направления взгляда
            const firstNextTile = visualPathQueue[0];
            // 1. Списываем очки движения сразу (накатываем правила игры)
            char.cachedReachableTiles = null; // Зачищаем кэш Дейкстры в стейте напрямую
            char.movement.current = remainingMP;

            // 2. Включаем режим плавного поочередного движения в стейте!
            char.action = 'move';
            char.currentMovementVisualPath = visualPathQueue;
            char.movementLerpTime = 0; // Обнуляем прогресс микро-шага

            // 3. Очищаем глобальный стейт путей A*
            char.currentActivePath = [];
        }
    }


    animateMovement(char, deltaMS) {
        let needRedraw = false;
        if (char.action !== 'move' || !char.currentMovementVisualPath || !char.currentMovementVisualPath.length) return needRedraw;

        const hexMath = AppState.engine.hexMath;
        const movementManager = AppState.engine.movementManager;
        const playerClickManager = AppState.engine.playerClickManager;

        const nextTile = char.currentMovementVisualPath[0];

        if (AppState.turn_settings?.turn_mode === "realtime") {
            const currentTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);

            if(char.type !== 'projectile') {
                // Проверяем клетку, к которой юнит летит ПРЯМО СЕЙЧАС в этом кадре
                const stepCheck = this.canStepBetween(currentTile, nextTile, char);

                if (stepCheck !== "walkable" && nextTile.type!=='air') {
                    console.log(`🏃‍♂️ [Movement Grid Lock] Путь перекрыт! Гекс (${nextTile.q}, ${nextTile.r}) занят статусом [${stepCheck}]. Экстренная остановка ${char.name}.`);

                    char.currentMovementVisualPath = [];
                    char.action = 'idle';
                    char.actionType = '';

                    if (char.mvmReadyTimer !== undefined) {
                        char.mvmReadyTimer = 0;
                    }
                    needRedraw = true;
                    return needRedraw;
                }
            }
            else {
                for (const id of Object.keys(AppState.entities)) {
                    const c = AppState.entities[id];
                    if (c.stats && c.id!==char.owner_id && c.mapPosition.q === currentTile.q && c.mapPosition.r === currentTile.r) {
                        console.log(c);

                        char.currentMovementVisualPath = [];
                        char.action = 'idle';
                        char.actionType = '';

                        if(char.onMovementComplete) char.onMovementComplete(c.id);
                        break;
                    }
                }
            }
        }

        needRedraw = true;

        const fromPixel = hexMath.cubeToPixel(char.mapPosition.q, char.mapPosition.r);
        const fromTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
        const fromLiftY = fromTile ? (fromTile.height - 1) * (hexMath.size * 0.25) : 0;
        const startX = fromPixel.x;
        const startY = fromPixel.y - fromLiftY;

        const toPixel = hexMath.cubeToPixel(nextTile.q, nextTile.r);
        const toLiftY = (nextTile.height - 1) * (hexMath.size * 0.25);
        const endX = toPixel.x;
        const endY = toPixel.y - toLiftY;

        // Поворот взгляда змейкой
        // char.direction = '';
        // char.directionV = '';

        if (AppState.map.gridMode === 'square') {
            // Определяем горизонталь
            if (nextTile.q > char.mapPosition.q) char.direction = 'right';
            else if (nextTile.q < char.mapPosition.q) char.direction = 'left';

            // Определяем вертикаль
            if (nextTile.r > char.mapPosition.r) char.directionV = 'forward';
            else if (nextTile.r < char.mapPosition.r) char.directionV = 'back';

            // Если у вас спрайты только 4-сторонние (нет отдельных диагональных анимаций),
            // то здесь можно сделать фолбек, например:
            if (char.directionV && !char.direction) {
                char.direction = char.directionV; // приоритет чистой вертикали
            }
        } else {
            // Твой оригинальный рабочий код для обычного RTS режима гексов
            if (nextTile.q > char.mapPosition.q) { char.direction = 'right'; }
            else if (nextTile.q < char.mapPosition.q) { char.direction = 'left'; }
            else if (nextTile.r > char.mapPosition.r) { char.direction = 'forward'; }
            else if (nextTile.r < char.mapPosition.r) { char.direction = 'back'; }
        }

        // 3. Расчет шага интерполяции
        let stepDuration;

        if(char.actionType === 'jump') {
            stepDuration = AppState.animation?.jumpPerHexTime || 500;
        }
        else if(char.actionType === 'run') {
            stepDuration = AppState.animation?.runPerHexTime || 500;
        }
        else if(char.actionType === 'dash') {
            stepDuration = AppState.animation?.dashPerHexTime || 200;
        }
        else if(char.actionType === 'fall') {
            stepDuration = AppState.animation?.fallPerHexTime || 200;
        }
        else {
            stepDuration = AppState.animation?.movePerHexTime || 1000;
        }

        char.movementLerpTime += deltaMS / stepDuration;

        // 4. Плавно смещаем пиксели фишки
        if (char.movementLerpTime < 1.0) {
            char.visualX = startX + (endX - startX) * char.movementLerpTime;
            char.visualY = startY + (endY - startY) * char.movementLerpTime;
        }
        else {
            // 5. МИКРО-ШАГ ЗАВЕРШЕН: Юнит наступил на гекс соседа
            char.visualX = endX;
            char.visualY = endY;
            char.movementLerpTime = 0;

            char.mapPosition.q = nextTile.q;
            char.mapPosition.r = nextTile.r;

            char.currentMovementVisualPath.shift();

            if (char.id === AppState.play?.activeCharacterId) {
                if (AppState.engine.visionManager) AppState.engine.visionManager.updateFogOfWar();
                AppState.engine.triggerManager.processEvent('tile_enter', {
                    subject: char,      // Кто наступил (например, Рафаэль)
                    tile: char.mapPosition    // На какой гекс наступил (3:2)
                });
            }

            // =========================================================================
            // 🚪 АВТОМАТИЧЕСКИЙ ПЕРЕХОД ПО КАРТАМ (Входы/Выходы через mapTo)
            // =========================================================================
            // Проверяем это ТОЛЬКО для активного персонажа игрока, чтобы боты случайно не улетали в порталы

            // =========================================================================


            // 6. МАРШРУТ ПОЛНОСТЬЮ ЗАВЕРШЕН: Очередь пуста, юнит остановился
            if (char.currentMovementVisualPath.length === 0) {
                char.action = 'idle'; // Переводим в покой
                char.actionType = ''; // Переводим в покой

                if(char.onMovementComplete) {
                    char.onMovementComplete(char)
                }
            }

            if (char.id === AppState.play?.activeCharacterId) {
                const currentQ = char.mapPosition.q;
                const currentR = char.mapPosition.r;

                let objectUnderFeet = null;
                Object.values(AppState.entities).forEach(entity => {
                    if (entity && entity.mapPosition && entity.mapPosition.q === currentQ && entity.mapPosition.r === currentR) {
                        // Нас интересуют только интерактивные сущности, а не сам Рафаэль
                        if (entity.id !== char.id) {
                            objectUnderFeet = entity;
                        }
                    }
                });
                const activeChar = AppState.entities[AppState.play.activeCharacterId];
                const reachableTiles = this.getReachableTiles(activeChar);
                AppState.play.cachedReachableTiles = reachableTiles;

                if (playerClickManager) {
                    const finalTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
                    if (finalTile) {
                        playerClickManager.executeCharacterSelect(char.id);
                    }
                }

                AppState.engine.uiManager.renderInteractionMenu();
            }

            if (char.action === 'idle' && !AppState.map.isPlatformerMode) {
                const currentDir = AppState.engine.inputManager?.getHexGridInput();

                if (currentDir) {
                    // Вызываем ваш родной метод. Он проверит canStepBetween,
                    // переведет в 'move' и закинет тайл в массив для следующего кадра.
                    AppState.engine.inputManager._triggerRTSMovement(currentDir);

                    if (char.action === 'move') {
                        needRedraw = true;
                    }
                }
            }
        }

        return needRedraw;
    }
}
import { MovementManager } from './MovementManager.js'; // Ваша старая реализация
import { AppState, getTileFromState } from '../shared/GameState.js';

export class PlatformerMovementManager extends MovementManager {
    constructor(config = {}) {
        super();
        // Физические константы по умолчанию
        this.gravity = config.gravity || 0.5;
        this.jumpForce = config.jumpForce || -10;
        this.moveSpeed = config.moveSpeed || 4;
        this.terminalVelocity = config.terminalVelocity || 12;
    }

    updateCharacter(charObj) {
        // Если персонаж уже летит по дуге, падает или просто шагает — не мешаем анимации

        if (charObj.action === 'move' || (charObj.currentMovementVisualPath && charObj.currentMovementVisualPath.length > 0)) return;

        const input = AppState.engine.inputManager.getPlatformerInput();
        const currentQ = charObj.mapPosition.q;
        const currentR = charObj.mapPosition.r;

        const currentTile = getTileFromState(currentQ, currentR);
        if (!currentTile) return;

        const isGrounded = currentTile.type !== 'air';

        if (!isGrounded) {
            const nextTileDown = getTileFromState(currentQ, currentR + 1);
            if (nextTileDown) {
                charObj.currentMovementVisualPath = [nextTileDown];
                charObj.action = 'move';
                return;
            }
        }

        if (input.jump && isGrounded) {
            let dir = 1;
            if (input.left) dir = -1;
            else if (input.right) dir = 1;

            const jumpPath = [];
            let checkQ = currentQ;
            let checkR = currentR;
            let hitObstacle = false;

            const arcOffsets = [
                { q: 0,   r: -1 }, // Шаг 1: строго вверх
                { q: dir, r: -1 }, // Шаг 2: по диагонали
                { q: dir, r: -1 }  // Шаг 3: по диагонали
            ];

            for (const offset of arcOffsets) {
                checkQ += offset.q;
                checkR += offset.r;

                const testTile = getTileFromState(checkQ, checkR);

                // Если на пути дуги встала твердая плитка земли или стена (тип НЕ 'air') — траектория прерывается
                if (!testTile || testTile.type !== 'air') {
                    hitObstacle = true;
                    break;
                }

                // Клетка — чистый воздух, добавляем её в наш маршрут полета
                jumpPath.push(testTile);
            }

            // Если нам удалось рассчитать хотя бы один честный шаг вверх — запускаем полет!
            if (jumpPath.length > 0) {
                charObj.currentMovementVisualPath = jumpPath; // Скармливаем всю дугу аниматору!
                charObj.action = 'move';
                charObj.actionType = 'jump';
                return;
            }
        }

        if (input.dash && dir !== 0) {
            const dashPath = [];
            let checkQ = currentQ;
            let checkR = currentR;

            // Строим прямую траекторию на 3 шага вперед
            for (let i = 0; i < 3; i++) {
                checkQ += dir; // Смещаемся строго по горизонтали

                const testTile = getTileFromState(checkQ, checkR);

                // Если на пути дэша стена — врезаемся и останавливаем рывок
                if (!testTile || testTile.type !== 'air') {
                    break;
                }

                dashPath.push(testTile);
            }

            if (dashPath.length > 0) {
                charObj.currentMovementVisualPath = dashPath; // Скармливаем рывок аниматору
                charObj.action = 'move';
                charObj.actionType = 'dash';

                // Мгновенно обновляем сеточные координаты в финальную точку дэша
                const lastDashTile = dashPath[dashPath.length - 1];
                charObj.mapPosition.q = lastDashTile.q;
                charObj.mapPosition.r = lastDashTile.r;
                return;
            }
        }

        let walkOffsetQ = 0;
        if (input.left) walkOffsetQ = -1;
        else if (input.right) walkOffsetQ = 1;

        if (walkOffsetQ !== 0) {
            const nextTile = getTileFromState(currentQ + walkOffsetQ, currentR);
            if (nextTile) {
                const stepCheck = this.canStepBetween(currentTile, nextTile, charObj);
                if (stepCheck === "walkable" || stepCheck === "ally" || nextTile.type==='air') {
                    charObj.currentMovementVisualPath = [nextTile];
                    charObj.action = 'move';
                }
            }
        }
    }


    /**
     * Хелпер для определения абсолютной непроходимости клетки в режиме платформера
     */
    isTileImpasseForPlatformer(tile, charObj) {
        // Перебираем сущности на этой клетке (стены, заблокированные объекты)
        for (const char of Object.values(AppState.entities)) {
            if (char && char.mapPosition && char.mapPosition.q === tile.q && char.mapPosition.r === tile.r) {
                if (char.blocksMovement === true) return true; // Объект "Стена" или "Руины"
            }
        }

        // Проверка базового типа ландшафта из вашей AppState конфигурации
        const terrainConfig = AppState.ConfigTerrain[tile.type];
        const movementTerrains = charObj.movementTerrains || [];
        if (!terrainConfig || !movementTerrains.includes(tile.type)) return true;

        return false;
    }

    getCharacterBounds(x, y, width, height) {
        return {
            left: x - width / 2,
            right: x + width / 2,
            top: y - height,
            bottom: y
        };
    }

    getBotPlatformerNeighbors(q, r) {
        const validNeighbors = [];
        const currentTile = getTileFromState(q, r);
        const groundUnder = getTileFromState(q, r + 1);

        const isGrounded = groundUnder && this.isTileImpasseForPlatformer(groundUnder);

        // 1. Если под ботом пусто — он может ТОЛЬКО падать вниз
        if (!isGrounded) {
            const tileBelow = getTileFromState(q, r + 1);
            if (tileBelow && !this.isTileImpasseForPlatformer(tileBelow)) {
                return [{ q, r: r + 1 }]; // Падаем
            }
        }

        // 2. Если бот стоит на земле, он может идти влево/вправо
        const sides = [{ q: q + 1, r }, { q: q - 1, r }];
        for (const side of sides) {
            const targetTile = getTileFromState(side.q, side.r);
            if (targetTile && !this.isTileImpasseForPlatformer(targetTile)) {
                validNeighbors.push(side);
            }
        }

        // 3. Возможность прыжка (если клетка сверху и по диагонали свободны)
        if (isGrounded) {
            const upTile = getTileFromState(q, r - 1);
            if (upTile && !this.isTileImpasseForPlatformer(upTile)) {
                // Добавляем ячейки платформ слева/справа сверху
                // А* построит цепочку прыжка ячейка за ячейкой
            }
        }

        return validNeighbors;
    }

}

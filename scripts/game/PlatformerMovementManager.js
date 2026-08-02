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

    /**
     * Основной игровой цикл для режима платформера (вызывать в update/tick игры)
     * @param {Object} charObj - Объект персонажа
     * @param {Object} input - Ввод игрока { left: bool, right: bool, jump: bool }
     * @param {number} deltaTime - Время кадра
     */
    updatePlatformer(charObj, input, deltaTime) {
        if (!charObj.physics) {
            // Инициализируем физическое состояние, если его нет
            charObj.physics = { x: 0, y: 0, vx: 0, vy: 0, isGrounded: false };
            // Синхронизируем стартовую позицию платформера из гекса
            const startTile = getTileFromState(charObj.mapPosition.q, charObj.mapPosition.r);
            if (startTile) {
                charObj.physics.x = startTile.pixelX || 0; // Предполагается наличие экранных координат
                charObj.physics.y = startTile.pixelY || 0;
            }
        }

        const p = charObj.physics;

        // 1. ГОРИЗОНТАЛЬНОЕ ПЕРЕМЕЩЕНИЕ (Влево / Вправо)
        if (input.left) {
            p.vx = -this.moveSpeed;
        } else if (input.right) {
            p.vx = this.moveSpeed;
        } else {
            p.vx = 0; // Быстрая остановка (можно заменить на трение)
        }

        // 2. ГРАВИТАЦИЯ
        p.vy += this.gravity;
        if (p.vy > this.terminalVelocity) p.vy = this.terminalVelocity;

        // 3. ПРЫЖОК
        if (input.jump && p.isGrounded) {
            p.vy = this.jumpForce;
            p.isGrounded = false;
        }

        // ПРИМЕНЕНИЕ ДВИЖЕНИЯ С ПРОВЕРКОЙ КОЛЛИЗИЙ (Раздельное по осям X и Y)

        // Смещение по X (Стены)
        p.x += p.vx;
        this.resolveCollisions(charObj, 'x');

        // Смещение по Y (Пол и Потолок)
        p.y += p.vy;
        p.isGrounded = false; // Сбрасываем перед проверкой
        this.resolveCollisions(charObj, 'y');

        // 4. СИНХРОНИЗАЦИЯ ОБРАТНО В ГЕКСЫ
        // Переводим текущие (x,y) координаты платформера в гекс (q,r)
        const currentHexCoords = AppState.engine.hexMath.pixelToHex(p.x, p.y);
        const nextTile = getTileFromState(currentHexCoords.q, currentHexCoords.r);

        if (nextTile && (nextTile.q !== charObj.mapPosition.q || nextTile.r !== charObj.mapPosition.r)) {
            const currentTile = getTileFromState(charObj.mapPosition.q, charObj.mapPosition.r);

            // Используем вашу старую проверку проходимости ландшафта и высот!
            const stepResult = this.canStepBetween(currentTile, nextTile, charObj);

            if (stepResult === "walkable" || stepResult === "ally") {
                // Если клетка проходима — обновляем позицию на стратегической карте
                charObj.mapPosition.q = nextTile.q;
                charObj.mapPosition.r = nextTile.r;

                // Опционально: списываем MP в пошаговом режиме платформера
                if (AppState.turn_settings?.turn_mode !== "realtime") {
                    const cost = this.getMovementCost(currentTile, nextTile);
                    charObj.movement.current -= cost;
                }
            } else {
                // Если наткнулись на стену/врага на уровне гексов — откатываем физическую позицию назад
                p.x -= p.vx;
                p.vx = 0;
            }
        }
    }

    /**
     * Разрешение коллизий с сеткой гексов на основе хитбоксов
     */
    resolveCollisions(charObj, axis) {
        const p = charObj.physics;
        const bounds = this.getCharacterBounds(p.x, p.y, charObj.width || 32, charObj.height || 48);

        // Проверяем ключевые точки хитбокса (углы)
        const pointsToCheck = axis === 'x'
            ? [ { x: bounds.left, y: bounds.top }, { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom } ]
            : [ { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top }, { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom } ];

        for (const pt of pointsToCheck) {
            const hexCoords = AppState.engine.hexMath.pixelToHex(pt.x, pt.y);
            const tile = getTileFromState(hexCoords.q, hexCoords.r);

            if (!tile) continue;

            // Используем старую логику: проверяем заблокирован ли гекс объектом/ландшафтом
            const isBlocked = this.isTileImpasseForPlatformer(tile, charObj);

            if (isBlocked) {
                if (axis === 'x') {
                    if (p.vx > 0) p.x -= (bounds.right - (tile.pixelX - tile.width / 2)); // Упор в стену справа
                    if (p.vx < 0) p.x += ((tile.pixelX + tile.width / 2) - bounds.left); // Упор в стену слева
                    p.vx = 0;
                    break;
                }
                if (axis === 'y') {
                    if (p.vy > 0) { // Приземление на платформу / пол
                        p.y -= (bounds.bottom - (tile.pixelY - tile.height / 2));
                        p.isGrounded = true;
                        p.vy = 0;
                    } else if (p.vy < 0) { // Удар головой об потолок
                        p.y += ((tile.pixelY + tile.height / 2) - bounds.top);
                        p.vy = 0;
                    }
                    break;
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
}

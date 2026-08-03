import { AppState, getTileFromState } from '../shared/GameState.js';

export class InputManager {
    constructor() {
        this.inputState = {
            // Платформер
            left: false,
            right: false,
            jump: false,
            down: false,

            // RTS / Пошаговый режим (6 направлений гекса)
            hexDirection: null // 'N', 'NE', 'SE', 'S', 'SW', 'NW' (Север, Северо-Восток и т.д.)
        };

        this._bindKeyboard();
    }

    getPlatformerInput() {
        return this.inputState;
    }

    getHexGridInput() {
        return this.inputState.hexDirection;
    }

    // Сеттеры для платформера
    setLeft(val) {
        this.inputState.left = val;
        // if (val) this._triggerRTSMovement('NW'); // Имитируем команду "влево"
    }
    setRight(val) {
        this.inputState.right = val;
        // if (val) this._triggerRTSMovement('NE'); // Имитируем команду "вправо"
    }
    setJump(val) {
        this.inputState.jump = val;
        // if (val) this._triggerRTSMovement('N');  // Имитируем команду "вверх/прыжок"
    }
    setDown(val) {
        this.inputState.down = val;
        // if (val) this._triggerRTSMovement('S');  // Имитируем команду "вниз"
    }

    // Сеттер для гексагональной сетки
    setHexDirection(dir) {
        if (this.inputState.hexDirection !== dir) {
            this.inputState.hexDirection = dir;
            if (dir) {
                // Триггерим движение в RTS режиме при смене направления на джойстике
                this._triggerRTSMovement(dir);
            }
        }
    }

    _triggerRTSMovement(dir) {
        console.log(dir);
        const activeCharId = AppState.play?.activeCharacterId || 'rafael';
        const char = AppState.characters[activeCharId];
        // if (!char || char.action === 'move') return;
        if (!char) return;

        let offset = { q: 0, r: 0 };
        const gridMode = AppState.map?.gridMode; // Наша переменная 'square' | 'pointyHex' | 'flatHex'

        // =========================================================================
        // 🧱 РЕЖИМ ПЛАТФОРМЕРА НА КВАДРАТНОЙ СЕТКЕ
        // =========================================================================
        if (AppState.map.isPlatformerMode && gridMode === 'square') {
            // В квадратах всё прямолинейно: q - это X (горизонталь), r - это Y (вертикаль)
            const platformerSquareDirections = {
                'NW': { q: -1, r: 0 }, // Движение влево
                'SW': { q: -1, r: 0 }, // Движение влево
                'NE': { q: 1,  r: 0 }, // Движение вправо
                'SE': { q: 1,  r: 0 }, // Движение вправо
                'N':  { q: 0,  r: -1 },// Прыжок / Вверх (уменьшаем r)
                'S':  { q: 0,  r: 1 }  // Падение / Вниз (увеличиваем r)
            };
            offset = platformerSquareDirections[dir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧱 РЕЖИМ ПЛАТФОРМЕРА НА ГЕКСАХ (Старый костыльный вариант, если решите оставить)
        // =========================================================================
        else if (AppState.map.isPlatformerMode) {
            const currentR = char.mapPosition.r;
            // Здесь должна быть дефиниция переменной isRowOdd, которой не было в вашем коде!
            const isRowOdd = currentR % 2 !== 0;

            const platformerHexDirections = {
                'NW': { q: -1, r: 0 }, 'NE': { q: 1, r: 0 },
                'SW': { q: -1, r: 0 }, 'SE': { q: 1, r: 0 },
                'N': isRowOdd ? { q: 0, r: -1 } : { q: -1, r: -1 },
                'S': isRowOdd ? { q: 0, r: 1 }  : { q: -1, r: 1 }
            };
            offset = platformerHexDirections[dir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧭 СТАНДАРТНЫЙ РЕЖИМ RTS СТРАТЕГИИ
        // =========================================================================
        else {
            // Настраиваем направления в зависимости от типа гексов (Pointy или Flat)
            if (gridMode === 'pointyHex') {
                // Канонические направления для гексов углом вверх
                const pointyDirections = {
                    'N':  { q: 0,  r: -1 }, // Строго вверх
                    'NE': { q: 1,  r: -1 }, // Право-вверх
                    'SE': { q: 1,  r: 0 },  // Право-вниз
                    'S':  { q: 0,  r: 1 },  // Строго вниз
                    'SW': { q: -1, r: 1 },  // Лево-вниз
                    'NW': { q: -1, r: 0 }   // Лево-вверх
                };
                offset = pointyDirections[dir] || { q: 0, r: 0 };
            } else {
                // Твой оригинальный код для гексов ребром вверх
                const rtsDirections = {
                    'N':  { q: 0,  r: -1 },
                    'NE': { q: 1,  r: -1 },
                    'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1 },
                    'SW': { q: -1, r: 1 },
                    'NW': { q: -1, r: 0 }
                };
                offset = rtsDirections[dir] || { q: 0, r: 0 };
            }
        }

        if (offset.q === 0 && offset.r === 0) return;

        const targetQ = char.mapPosition.q + offset.q;
        const targetR = char.mapPosition.r + offset.r;

        const currentTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
        const nextTile = getTileFromState(targetQ, targetR);

        if (currentTile && nextTile) {
            const stepCheck = AppState.engine.movementManager.canStepBetween(currentTile, nextTile, char);
            if (stepCheck === "walkable" || stepCheck === "ally") {
                char.currentMovementVisualPath = [nextTile];
                char.action = 'move';
            }
        }
    }


    _bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (AppState.map.isPlatformerMode) {
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.setLeft(true);
                if (e.code === 'KeyD' || e.code === 'ArrowRight') this.setRight(true);
                if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') this.setJump(true);
                if (e.code === 'KeyS' || e.code === 'ArrowDown') this.setDown(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (AppState.map.isPlatformerMode) {
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.setLeft(false);
                if (e.code === 'KeyD' || e.code === 'ArrowRight') this.setRight(false);
                if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') this.setJump(false);
                if (e.code === 'KeyS' || e.code === 'ArrowDown') this.setDown(false);
            }
        });
    }
}

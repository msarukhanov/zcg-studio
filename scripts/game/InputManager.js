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
    setLeft(val) { this.inputState.left = val; }
    setRight(val) { this.inputState.right = val; }
    setJump(val) { this.inputState.jump = val; }
    setDown(val) { this.inputState.down = val; }

    // Сеттер для гексагональной сетки
    setHexDirection(dir) {
        if (this.inputState.hexDirection !== dir) {
            this.inputState.hexDirection = dir;
            if (dir && !AppState.isPlatformerMode) {
                // Триггерим движение в RTS режиме при смене направления на джойстике
                this._triggerRTSMovement(dir);
            }
        }
    }

    /**
     * Превращает направление джойстика в физический шаг на гексагональной карте
     */
    _triggerRTSMovement22(dir) {
        const activeCharId = AppState.play?.activeCharacterId || 'rafael';
        const char = AppState.characters[activeCharId];
        if (!char || char.action === 'move') return;

        // Векторы смещения для гексов ребром вверх (Flat-topped, cube/axial coords)
        const directions = {
            'N':  { q: 0,  r: -1 },
            'NE': { q: 1,  r: -1 },
            'SE': { q: 1,  r: 0  },
            'S':  { q: 0,  r: 1  },
            'SW': { q: -1, r: 1  },
            'NW': { q: -1, r: 0  }
        };

        const offset = directions[dir];
        if (!offset) return;

        const targetQ = char.mapPosition.q + offset.q;
        const targetR = char.mapPosition.r + offset.r;

        // Получаем тайлы из вашего GameState
        const currentTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
        const nextTile = getTileFromState(targetQ, targetR);

        if (currentTile && nextTile) {
            const stepCheck = AppState.engine.movementManager.canStepBetween(currentTile, nextTile, char);
            if (stepCheck === "walkable" || stepCheck === "ally") {
                // Заталкиваем тайл в старый массив пути, чтобы ваш Pixi-лерп запустил анимацию хода
                char.currentMovementVisualPath = [nextTile];
                char.action = 'move';
            }
        }
    }

    _triggerRTSMovement(dir) {
        const activeCharId = AppState.play?.activeCharacterId || 'rafael';
        const char = AppState.characters[activeCharId];
        if (!char || char.action === 'move') return;

        let offset = { q: 0, r: 0 };

        // =========================================================================
        // 🕹️ РЕЖИМ ПЛАТФОРМЕРА: Шаги по выпрямленной горизонтальной кирпичной кладке
        // =========================================================================
        if (AppState.isPlatformerMode) {
            const currentR = char.mapPosition.r;
            const isRowOdd = Math.abs(currentR) % 2 === 1;

            // Матрица шагов для выпрямленных Flat-topped гексов (Row-offset)
            const platformerDirections = {
                // Влево / Вправо по ровной линии ряда r
                'NW': { q: -1, r: 0 },
                'NE': { q: 1,  r: 0 },
                'SW': { q: -1, r: 0 },
                'SE': { q: 1,  r: 0 },

                // Вверх / Прыжок (Векторы зависят от четности строки r под ногами!)
                'N': isRowOdd
                    ? { q: 0, r: -1 }  // Для нечетных строк
                    : { q: -1, r: -1 }, // Для четных строк

                // Вниз / Падение
                'S': isRowOdd
                    ? { q: 0, r: 1 }   // Для нечетных строк
                    : { q: -1, r: 1 }  // Для четных строк
            };

            offset = platformerDirections[dir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧭 СТАНДАРТНЫЙ РЕЖИМ RTS СТРАТЕГИИ (Твой оригинальный код, без изменений)
        // =========================================================================
        else {
            const rtsDirections = {
                'N':  { q: 0,  r: -1 },
                'NE': { q: 1,  r: -1 },
                'SE': { q: 1,  r: 0  },
                'S':  { q: 0,  r: 1  },
                'SW': { q: -1, r: 1  },
                'NW': { q: -1, r: 0  }
            };
            offset = rtsDirections[dir] || { q: 0, r: 0 };
        }

        if (offset.q === 0 && offset.r === 0) return;

        const targetQ = char.mapPosition.q + offset.q;
        const targetR = char.mapPosition.r + offset.r;

        // Твой оригинальный и неприкосновенный код лерпа и проверки пути
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
            if (AppState.isPlatformerMode) {
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.setLeft(true);
                if (e.code === 'KeyD' || e.code === 'ArrowRight') this.setRight(true);
                if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') this.setJump(true);
                if (e.code === 'KeyS' || e.code === 'ArrowDown') this.setDown(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (AppState.isPlatformerMode) {
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.setLeft(false);
                if (e.code === 'KeyD' || e.code === 'ArrowRight') this.setRight(false);
                if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') this.setJump(false);
                if (e.code === 'KeyS' || e.code === 'ArrowDown') this.setDown(false);
            }
        });
    }
}

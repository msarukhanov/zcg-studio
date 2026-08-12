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
        if (!char) return;

        let offset = { q: 0, r: 0 };
        const gridMode = AppState.map?.gridMode; // Наша переменная 'square' | 'pointyHex' | 'flatHex'

        // =========================================================================
        // 👁️ УНИВЕРСАЛЬНЫЙ РЕЖИМ ОТ ПЕРВОГО ЛИЦАДЛЯ ВСЕХ ТИПОВ СЕТОК
        // =========================================================================
        if (AppState.play.isFirstPersonMode) {
            const camSettings = AppState.engine.cameraSettings;

            // Нормализуем угол fpYaw, чтобы он всегда был в диапазоне от 0 до 360 градусов
            let normalizedYaw = camSettings.fpYaw % 360;
            if (normalizedYaw < 0) normalizedYaw += 360;

            // ---------------------------------------------------------------------
            // КЕЙС 1: КВАРДАТНАЯ СЕТКА (Square Grid) в первом лице
            // ---------------------------------------------------------------------
            // ---------------------------------------------------------------------
            // КЕЙС 1: КВАРДАТНАЯ СЕТКА (Square Grid) в первом лице
            // ---------------------------------------------------------------------
            if (gridMode === 'square') {
                // Массив из 4 основных направлений, которые использует ваша квадратная сетка
                // 'N' - Вперед, 'NE' - Вправо, 'S' - Назад, 'NW' - Влево
                const baseSquareDirs = ['N', 'NE', 'S', 'NW'];

                // Находим индекс исходного относительного нажатия WASD
                let baseIndex = baseSquareDirs.indexOf(dir);
                if (baseIndex === -1) {
                    // Если прилетели альтернативные или чистые стороны света с клавиатуры:
                    if (dir === 'W' || dir === 'SW') baseIndex = 3;  // Влево (A)
                    if (dir === 'E' || dir === 'SE') baseIndex = 1;  // Вправо (D)
                    else baseIndex = 0; // По умолчанию Вперед
                }

                // Вычисляем сектор поворота головы камеры (4 сектора по 90 градусов)
                const squareSector = Math.round(normalizedYaw / 90) % 4;

                // Сдвигаем индекс нажатия по кругу на угол поворота камеры
                let finalIndex = (baseIndex + squareSector) % 4;

                // Получаем итоговую строку направления, которую гарантированно поймет ваш конфиг!
                const targetDir = baseSquareDirs[finalIndex];

                // Назначаем точные квадратные смещения q и r для результирующего направления
                const squareDirections = {
                    'NW': { q: -1, r: 0 }, // Чистый стрейф влево по экрану
                    'NE': { q: 1,  r: 0 }, // Чистый стрейф вправо по экрану
                    'N':  { q: 0,  r: -1 },// Идем прямо вперед
                    'S':  { q: 0,  r: 1 }  // Идем прямо назад
                };
                offset = squareDirections[targetDir] || { q: 0, r: 0 };
            }

            // ---------------------------------------------------------------------
            // КЕЙС 2: ГЕКСАГОНАЛЬНАЯ СЕТКА (Pointy или Flat Hex) в первом лице
            // ---------------------------------------------------------------------
            else {
                // В гексагональной сетке 6 направлений по 60 градусов (360 / 6)
                const hexClockwiseDirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

                let baseIndex = hexClockwiseDirs.indexOf(dir);
                if (baseIndex === -1) {
                    // Фолбеки для WASD маппинга
                    if (dir === 'W') baseIndex = 4; // Сдвиг на вест
                    if (dir === 'E') baseIndex = 1; // Сдвиг на ист
                    else baseIndex = 0;
                }

                const sectorShift = Math.round(normalizedYaw / 60);
                let finalIndex = (baseIndex + sectorShift) % 6;
                const targetDir = hexClockwiseDirs[finalIndex];

                const rtsDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1  }, 'SW': { q: -1, r: 1  }, 'NW': { q: -1, r: 0 }
                };
                offset = rtsDirections[targetDir] || { q: 0, r: 0 };
            }
        }
        // =========================================================================
        // 🧱 ОРИГИНАЛЬНЫЙ РЕЖИМ ПЛАТФОРМЕРА НА КВАДРАТНОЙ СЕТКЕ (Вид сверху/сбоку)
        // =========================================================================
        else if (AppState.map.isPlatformerMode && gridMode === 'square') {
            const platformerSquareDirections = {
                'NW': { q: -1, r: 0 }, 'SW': { q: -1, r: 0 },
                'NE': { q: 1,  r: 0 }, 'SE': { q: 1,  r: 0 },
                'N':  { q: 0,  r: -1 }, 'S':  { q: 0,  r: 1 }
            };
            offset = platformerSquareDirections[dir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧱 ОРИГИНАЛЬНЫЙ РЕЖИМ ПЛАТФОРМЕРА НА ГЕКСАХ (Вид сверху/сбоку)
        // =========================================================================
        else if (AppState.map.isPlatformerMode) {
            const currentR = char.mapPosition.r;
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
        // 🧭 СТАНДАРТНЫЙ ОРИГИНАЛЬНЫЙ РЕЖИМ RTS СТРАТЕГИИ
        // =========================================================================
        else {
            if (gridMode === 'pointyHex') {
                const pointyDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1 },  'SW': { q: -1, r: 1 },  'NW': { q: -1, r: 0 }
                };
                offset = pointyDirections[dir] || { q: 0, r: 0 };
            } else {
                const rtsDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1 },  'SW': { q: -1, r: 1 },  'NW': { q: -1, r: 0 }
                };
                offset = rtsDirections[dir] || { q: 0, r: 0 };
            }
        }

        // --- ФИНАЛЬНЫЙ БЛОК ПЕРЕМЕЩЕНИЯ (Ваш оригинальный код без изменений) ---
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


    _triggerRTSMovement222(dir) {
        console.log(dir);
        const activeCharId = AppState.play?.activeCharacterId || 'rafael';
        const char = AppState.characters[activeCharId];
        if (!char) return;

        let offset = { q: 0, r: 0 };
        const gridMode = AppState.map?.gridMode; // 'square' | 'pointyHex' | 'flatHex'

        // =========================================================================
        // 👁️ РЕЖИМ ОТ ПЕРВОГО ЛИЦА (ЧЕСТНЫЙ СДВИГ СЕКТОРОВ НАПРАВЛЕНИЯ ПО fpYaw)
        // =========================================================================
        if (AppState.play.isFirstPersonMode && !AppState.map.isPlatformerMode) {
            const camSettings = AppState.engine.cameraSettings;

            // Базовый канонический массив 6 направлений гексов по кругу (360 градусов)
            const hexClockwiseDirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

            // Находим индекс исходного нажатия (например, нажали W -> 'N' -> индекс 0)
            let baseIndex = hexClockwiseDirs.indexOf(dir);
            if (baseIndex === -1) baseIndex = 0;

            // Вычисляем, на сколько секторов по 60 градусов развернута голова камеры
            // Нормализуем угол, чтобы он всегда был положительным (от 0 до 360)
            let normalizedYaw = camSettings.fpYaw % 360;
            if (normalizedYaw < 0) normalizedYaw += 360;

            // Находим количество шагов сдвига по кругу (округляем к ближайшему сектору)
            const sectorShift = Math.round(normalizedYaw / 60);

            // Сдвигаем индекс направления: если идем вперед (+), если стрейфим — индекс уже учитывает базу
            // Для WASD: W('N') двигает вперед, S('S') назад, A('NW'/'SW') влево, D('NE'/'SE') вправо
            let finalIndex = (baseIndex + sectorShift) % 6;

            // Получаем итоговое направление на карте с учетом разворота головы
            const targetDir = hexClockwiseDirs[finalIndex];

            // Назначаем стандартные смещения q и r для этого итогового направления
            const rtsDirections = {
                'N':  { q: 0,  r: -1 },
                'NE': { q: 1,  r: -1 },
                'SE': { q: 1,  r: 0 },
                'S':  { q: 0,  r: 1 },
                'SW': { q: -1, r: 1 },
                'NW': { q: -1, r: 0 }
            };

            offset = rtsDirections[targetDir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧱 РЕЖИМ ПЛАТФОРМЕРА НА КВАДРАТНОЙ СЕТКЕ (Ваш оригинал)
        // =========================================================================
        else if (AppState.map.isPlatformerMode && gridMode === 'square') {
            const platformerSquareDirections = {
                'NW': { q: -1, r: 0 }, 'SW': { q: -1, r: 0 },
                'NE': { q: 1,  r: 0 }, 'SE': { q: 1,  r: 0 },
                'N':  { q: 0,  r: -1 }, 'S':  { q: 0,  r: 1 }
            };
            offset = platformerSquareDirections[dir] || { q: 0, r: 0 };
        }
        // =========================================================================
        // 🧱 РЕЖИМ ПЛАТФОРМЕРА НА ГЕКСАХ (Ваш оригинал)
        // =========================================================================
        else if (AppState.map.isPlatformerMode) {
            const currentR = char.mapPosition.r;
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
        // 🧭 СТАНДАРТНЫЙ РЕЖИМ RTS СТРАТЕГИИ (Ваш оригинал)
        // =========================================================================
        else {
            if (gridMode === 'pointyHex') {
                const pointyDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1 },  'SW': { q: -1, r: 1 },  'NW': { q: -1, r: 0 }
                };
                offset = pointyDirections[dir] || { q: 0, r: 0 };
            } else {
                const rtsDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1 },  'SW': { q: -1, r: 1 },  'NW': { q: -1, r: 0 }
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


    _triggerRTSMovement222(dir) {
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

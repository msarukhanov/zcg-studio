import { AppState, getTileFromState } from './GameState.js';

export class HexMath {
    /**
     * @param {number} size - Расстояние от центра гекса до его вершины (уголка) в пикселях
     */
    constructor(size = 35) {
        this.size = size;
        // Для Flat-topped гекса (плоский верх)
        this.width = 2 * this.size;
        this.height = Math.sqrt(3) * this.size;

        this.squareSize = this.size * Math.sqrt(3);

        // Фиксируем контекст функций, чтобы они не теряли this при кликах мыши
        this.cubeToPixel = this.cubeToPixel.bind(this);
        this.pixelToCube = this.pixelToCube.bind(this);
        this.getHexCornerPoints = this.getHexCornerPoints.bind(this);
        this.hexRound = this.hexRound.bind(this);
        this.get3DHexFromPixel = this.get3DHexFromPixel.bind(this);
    }

    cubeToPixel(q, r) {
        const mode = AppState.map.gridMode; // 'pointyHex' | 'flatHex' | 'square'

        if (mode === 'square') {
            // Возвращаем ЦЕНТР квадрата, чтобы anchor.set(0.5) у спрайтов работал идеально
            const x = q * this.squareSize + (this.squareSize / 2);
            const y = r * this.squareSize + (this.squareSize / 2);
            return { x, y };
        }

        if (mode === 'pointyHex') {
            // 📐 Математика для гексов УГЛОМ вверх (Pointy-topped)
            const x = this.size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
            const y = this.size * (3/2 * r);
            return { x, y };
        }

        const x = this.size * (3/2 * q);
        const y = this.size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        return { x, y };
    }

    pixelToCube(x, y) {
        const mode = AppState.map.gridMode;

        if (mode === 'square') {
            // Делим пиксели на размер ячейки и округляем до ближайшего целого тайла
            const q = Math.floor(x / this.squareSize);
            const r = Math.floor(y / this.squareSize);
            return { q, r }; // По факту это {x, y} вашей квадратной сетки
        }

        if (mode === 'pointyHex') {
            // 📐 Обратная матрица для гексов УГЛОМ вверх
            const q = (Math.sqrt(3)/3 * x - 1/3 * y) / this.size;
            const r = (2/3 * y) / this.size;
            return this.hexRound(q, r, -q - r);
        }

        // Твой оригинальный рабочий код для обычного RTS режима (НЕПРИКОСНОВЕННЫЙ)
        const q = (2/3 * x) / this.size;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.size;
        return this.hexRound(q, r, -q - r);
    }



    /**
     * ПРАВИЛЬНОЕ ГЕКСАГОНАЛЬНОЕ ОКРУГЛЕНИЕ (СТАНДАРТ RED BLOB GAMES)
     */
    hexRound(q, r, s) {
        // Сначала округляем к ближайшему целому в меньшую сторону (Math.floor)
        // сдвигая на 0.5, чтобы получить правильный знак для гексов
        let qi = Math.floor(Math.round(q));
        let ri = Math.floor(Math.round(r));
        let si = Math.floor(Math.round(s));

        // Вычисляем точные дробные отклонения от осей
        const qDiff = Math.abs(qi - q);
        const rDiff = Math.abs(ri - r);
        const sDiff = Math.abs(si - s);

        // Находим ось с наибольшим отклонением и пересчитываем её через две другие,
        // чтобы железно соблюдалось правило: q + r + s = 0
        if (qDiff > rDiff && qDiff > sDiff) {
            qi = -ri - si;
        } else if (rDiff > sDiff) {
            ri = -qi - si;
        }

        return { q: qi, r: ri };
    }


    /**
     * Генерирует массив из 6 точек для Flat-topped гекса (плоский верх)
     */
    getHexCornerPoints(centerX, centerY) {
        const mode = AppState.map.gridMode;

        if (mode === 'square') {
            // Вместо 6 точек возвращаем 4 угла квадрата для drawPolygon
            const h = this.squareSize / 2;
            return [
                centerX - h, centerY - h, // Левый верхний
                centerX + h, centerY - h, // Правый верхний
                centerX + h, centerY + h, // Правый нижний
                centerX - h, centerY + h  // Левый нижний
            ];
        }

        const points = [];
        // 🔄 Если pointyHex — смещаем стартовый угол на 30 градусов. Если ваш оригинал — стартуем с 0 градусов.
        const startAngleModifier = (mode === 'pointyHex') ? 30 : 0;

        for (let i = 0; i < 6; i++) {
            const angleRad = (Math.PI / 180) * (60 * i + startAngleModifier);
            points.push(
                centerX + this.size * Math.cos(angleRad),
                centerY + this.size * Math.sin(angleRad)
            );
        }
        return points;
    }

    /**
     * Считывает 3D-гекс под курсором мыши напрямую из глобального AppState
     */
    get3DHexFromPixel(mouseX, mouseY) {

        const worldMapContainer = AppState.engine.worldMapContainer;
        if (!worldMapContainer) return null;

        const currentZoom = AppState.camera.currentZoom;
        const heightStep = AppState.config.heightStep;

        // Вычисляем локальные пиксели внутри контейнера карты с обязательным учетом ЗУМА
        const localX = (mouseX - worldMapContainer.x) / currentZoom;
        const localY = (mouseY - worldMapContainer.y) / currentZoom;

        const maxPossibleHeight = 10; // Сканируем до максимального уровня высоты инспектора

        // Сканируем слои рельефа сверху вниз
        for (let h = maxPossibleHeight; h >= 1; h--) {
            // Виртуально опускаем координату Y для текущего проверяемого слоя
            const flatY = localY + (h - 1) * heightStep;

            // Переводим скорректированные пиксели в кубические координаты q, r
            const cube = this.pixelToCube(localX, flatY);

            // ИСПРАВЛЕНИЕ: Читаем гекс напрямую из Единого Источника Правды AppState!
            const tile = getTileFromState(cube.q, cube.r);

            // Если гекс существует в базе данных и его высота действительно доходит до этого уровня h
            if (tile && tile.height >= h) {
                return tile; // Нашли конкретный приподнятый гекс рельефа
            }
        }

        // Если на верхних слоях ничего не нашли, проверяем базовый уровень земли
        const baseCube = this.pixelToCube(localX, localY);
        return getTileFromState(baseCube.q, baseCube.r) || null;
    }

    getNeighbors(q, r) {
        const mode = AppState.map.gridMode; // 'pointyHex' | 'flatHex' | 'square'

        if (mode === 'square') {
            // Если нужны только 4 направления (без диагоналей):
            // return [{ q: q+1, r: r }, { q: q-1, r: r }, { q: q, r: r+1 }, { q: q, r: r-1 }];

            // Канонические 8 направлений для квадратной сетки:
            return [
                { q: q + 1, r: r },     // Право
                { q: q - 1, r: r },     // Лево
                { q: q,     r: r + 1 }, // Низ
                { q: q,     r: r - 1 }, // Верх
                { q: q + 1, r: r + 1 }, // Диагональ: право-низ
                { q: q - 1, r: r - 1 }, // Диагональ: лево-верх
                { q: q + 1, r: r - 1 }, // Диагональ: право-верх
                { q: q - 1, r: r + 1 }  // Диагональ: лево-низ
            ];
        }

        if (mode === 'pointyHex') {
            // 📐 Смещения для гексов УГЛОМ вверх (Pointy-topped)
            return [
                { q: q + 1, r: r },     // Право-низ
                { q: q,     r: r + 1 }, // Строго вниз
                { q: q - 1, r: r + 1 }, // Лево-низ
                { q: q - 1, r: r },     // Лево-верх
                { q: q,     r: r - 1 }, // Строго вверх
                { q: q + 1, r: r - 1 }  // Право-верх
            ];
        }

        // 🛡️ Ваш ОРИГИНАЛЬНЫЙ массив направлений для гексов ребром вверх
        const directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];
        return directions.map(dir => ({ q: q + dir.q, r: r + dir.r }));
    }


    /**
     * Каноническое кубическое расстояние между двумя гексами
     */
    getDistance(a, b) {
        const mode = AppState.map.gridMode;

        if (mode === 'square') {
            const dq = Math.abs(a.q - b.q);
            const dr = Math.abs(a.r - b.r);

            // Если вы разрешили ходить по диагоналям (8 направлений):
            // Используется метрика Чебышева. Расстояние до любого из 8 соседей равно 1.
            return Math.max(dq, dr);

            // Если ходить можно ТОЛЬКО прямо/вбок (4 направления):
            // Раскомментируйте Манхэттенское расстояние:
            // return dq + dr;
        }

        // Для обоих типов гексов (Pointy и Flat) математика расстояния одинакова,
        // так как топология графа не меняется, меняется только проекция на экран.
        const sA = -a.q - a.r;
        const sB = -b.q - b.r;
        return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(sA - sB)) / 2;
    }

    /**
     * Линейная интерполяция для float-координат гексов
     */
    hexLerp(a, b, t) {
        return {
            q: a.q + (b.q - a.q) * t,
            r: a.r + (b.r - a.r) * t
        };
    }

    /**
     * Возвращает массив кубических координат (q, r) линии луча между стартом и целью
     * с применением эпсилон-смещения против промахов округления на стыках граней
     */
    getHexLine(start, target) {

        const mode = AppState.map.gridMode;

        const distance = this.getDistance(start, target);
        const results = [];

        const epsilonQ = 1e-6;
        const epsilonR = -2e-6;

        if (mode === 'square') {
            for (let i = 0; i <= distance; i++) {
                const t = distance === 0 ? 0 : i / distance;

                // Обычный линейный интерполятор для осей X (q) и Y (r)
                const lerpQ = start.q + (target.q - start.q) * t + epsilonQ;
                const lerpR = start.r + (target.r - start.r) * t + epsilonR;

                results.push({
                    q: Math.round(lerpQ),
                    r: Math.round(lerpR)
                });
            }
            return results; // Возвращает массив координат [{q, r}, ...] для квадратов
        }

        for (let i = 0; i <= distance; i++) {
            const t = distance === 0 ? 0 : i / distance;
            const lerpPos = this.hexLerp(start, target, t);

            const q = lerpPos.q + epsilonQ;
            const r = lerpPos.r + epsilonR;

            results.push(this.hexRound(q, r, -q - r));
        }
        return results; // Возвращает массив координат [{q, r}, {q, r}...] от старта до финиша включительно
    }

}

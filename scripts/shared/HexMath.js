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

        // Фиксируем контекст функций, чтобы они не теряли this при кликах мыши
        this.cubeToPixel = this.cubeToPixel.bind(this);
        this.pixelToCube = this.pixelToCube.bind(this);
        this.getHexCornerPoints = this.getHexCornerPoints.bind(this);
        this.hexRound = this.hexRound.bind(this);
        this.get3DHexFromPixel = this.get3DHexFromPixel.bind(this);
    }

    /**
     * Переводит кубические координаты (q, r) в экранные пиксели (x, y)
     * Используется для сетки Flat-topped (плоский верх, острые угла в бока)
     */
    cubeToPixel(q, r) {
        const x = this.size * (3/2 * q);
        const y = this.size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        return { x, y };
    }

    /**
     * ПЕРЕВОД ПИКСЕЛЕЙ В КООРДИНАТЫ ГЕКСА (То, чего не хватало)
     * Переводит локальные пиксели карты (x, y) обратно в кубические координаты (q, r)
     */
    /**
     * Переводит локальные пиксели карты (x, y) в кубические координаты (q, r)
     */
    pixelToCube(x, y) {
        // Точная инверсия Flat-topped матрицы
        const q = (2/3 * x) / this.size;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.size;

        // Передаем все три оси в правильный алгоритм гексагонального округления
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
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angleRad = (Math.PI / 180) * (60 * i);
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
        // Точная матрица смещений для Flat-topped гексов (Odd-Q)
        const directions = [
            { q: 1,  r: 0  }, // Справа вверху
            { q: 1,  r: -1 }, // Справа внизу
            { q: 0,  r: -1 }, // Строго вверху
            { q: -1, r: 0  }, // Слева внизу
            { q: -1, r: 1  }, // Слева вверху
            { q: 0,  r: 1  }  // Строго внизу
        ];

        return directions.map(dir => ({
            q: q + dir.q,
            r: r + dir.r
        }));
    }

    /**
     * Каноническое кубическое расстояние между двумя гексами
     */
    getDistance(a, b) {
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
        const distance = this.getDistance(start, target);
        const results = [];

        // Эпсилон-смещение для защиты от скольжения луча по ребрам гексов
        const epsilonQ = 1e-6;
        const epsilonR = -2e-6;

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

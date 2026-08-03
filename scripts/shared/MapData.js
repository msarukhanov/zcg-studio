
import { AppState } from '../shared/GameState.js';
/**
 * УНИВЕРСАЛЬНЫЙ КЛАСС ИНТЕРАКТИВНОГО ОБЪЕКТА (Города, Шахты, Лавки, Развалины)
 */
export class WorldObject {
    constructor(id, type, name, innerMapId = null) {
        this.id = id;                     // Уникальный ID объекта
        this.type = type;                 // Тип из ObjectConfig (city, mine, shop, ruins)
        this.name = name;                 // Кастомное имя (например, "Торговая лавка Боба")

        this.innerMapId = innerMapId;     // ID внутренней карты, если опционально есть вложенность
        this.garrisonUnits = [];          // Юниты, которые зашли ВНУТРЬ объекта (в укрытие/гарнизон)
    }
}

export class HexTile {
    constructor(q, r, col, row) {
        this.q = q; this.r = r;

        this.type = 'grass';
        this.height = 1;
        this.imageIndex = 0;

        // Метаданные для регионов
        this.region = null; this.province = null; this.faction = null; this.population = 0;

        // Юниты, которые стоят НА клетке (снаружи объекта)
        this.units = [];

        // =========================================================================
        // 🏰 УНИВЕРСАЛЬНЫЙ СЛОЙ ОБЪЕКТОВ (ВМЕСТО СТАРОГО СТРОГОГО SETTLEMENT)
        // =========================================================================
        this.worldObject = null; // Может хранить экземпляр WorldObject или быть null
    }

    /**
     * Пример метода для основания поселения на этом гексе
     */
    foundSettlement(name, type = 'village', startPop = 1000) {
        this.settlement = {
            name: name,
            type: type, // village, town, city, capital
            level: 1
        };
        this.population = startPop;
    }
}

/**
 * Управляющий класс для хранения всей карты в памяти.
 */
export class MapData {
    constructor(cols = 12, rows = 8, tiles = null, terrain=null) {
        this.cols = cols;
        this.rows = rows;

        // Хранилище гексов. Ключом будет строка "q,r" для мгновенного поиска по координатам
        if(!tiles) {
            this.tiles = new Map();
            this.generateBlankMap(terrain);
        }
        else {
            this.tiles = tiles;
        }
    }

    /**
     * Генерирует чистую карту-заглушку заданного размера
     */

    generateBlankMap(terrain=null) {
        this.tiles.clear();

        // 1. Первый проход: Генерируем базовую сетку (все гексы плоские, дефолтная высота 1)
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                const q = col;
                const r = row - Math.floor(col / 2);

                const tile = new HexTile(q, r, col, row);

                if(terrain)  {
                    tile.type = terrain;
                    tile.height = 1;
                }
                else {
                    if (row === 0 || col === 0 || row === this.rows - 1 || col === this.cols - 1) {
                        tile.type = 'water';
                        tile.height = 1; // Вода всегда на базовом уровне
                    } else {
                        tile.type = 'grass';
                        tile.height = 1;
                    }
                }



                const config = AppState.ConfigTerrain[tile.type];
                if (config && config.images && config.images.length > 0) {
                    tile.imageIndex = Math.floor(Math.random() * config.images.length);
                }

                this.tiles.set(`${q},${r}`, tile);
            }
        }

        // // 2. Второй проход: Генерируем возвышенности (Холмы/Плато)
        // const hillCenters = [
        //     { col: 4, row: 3, maxH: 2.0 }, // Этот холм будет с плавными шагами
        //     { col: 8, row: 4, maxH: 3.0 }  // Этот холм будет с крутыми обрывами
        // ];
        //
        // hillCenters.forEach(center => {
        //     this.tiles.forEach(tile => {
        //         if (tile.type === 'water') return;
        //
        //         const dist = (Math.abs(center.col - tile.col) +
        //             Math.abs(center.col + center.row - tile.col - tile.row) +
        //             Math.abs(center.row - tile.row)) / 2;
        //
        //         // Для первого холма делаем шаг перепада высоты ровно 0.5 на каждый гекс удаления
        //         if (dist === 0) {
        //             tile.height = center.maxH;
        //         } else if (dist === 1) {
        //             tile.height = Math.max(tile.height, center.maxH - 0.5); // Станет 1.5
        //         } else if (dist === 2) {
        //             tile.height = Math.max(tile.height, center.maxH - 1.0); // Станет 1.0
        //         }
        //
        //         if (tile.height >= 3) {
        //             tile.type = 'mountain';
        //             tile.imageIndex = 0;
        //         }
        //     });
        // });
    }

    /**
     * Быстрый поиск тайла по кубическим координатам
     */
    getTile(q, r) {
        return this.tiles.get(`${q},${r}`);
    }
}

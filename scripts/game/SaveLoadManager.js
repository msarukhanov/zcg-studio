// ==== scripts/engine/SaveLoadManager.js
import { AppState } from '../shared/GameState.js';
import { MapManager } from './MapManager.js';

export const SaveLoadManager = {
    // Ссылка на закэшированное дефолтное состояние игры (чертеж New Game)
    _initialStateSnapshot: null,

    /**
     * Запоминает чистый снимок состояния сразу при старте New Game.
     * Вызывается ОДИН раз в самом начале игры, когда AppState еще чист.
     */
    captureInitialState(initialState) {
        this._initialStateSnapshot = JSON.parse(JSON.stringify(initialState));
        console.log("[SaveLoadManager] Эталонный снимок InitialState успешно сохранен в памяти.");
    },

    /**
     * 💾 1. СОХРАНЕНИЕ: Сборка дельты и запись в IndexedDB
     * @param {string} slotId - Идентификатор слота (например, 'slot_1', 'auto_save')
     */
    async saveGame(slotId = 'slot_1') {
        if (!this._initialStateSnapshot) {
            console.error("[SaveLoadManager] Ошибка: InitialState не зафиксирован. Сейв невозможен.");
            return false;
        }

        console.log(`[SaveLoadManager] Начинается сборка дельты для слота: ${slotId}...`);

        // Собираем точечные изменения по главным узлам AppState
        const saveBundle = {
                slotId: slotId,
                timestamp: Date.now(),
                currentMapId: AppState.map?.mapId || 'world_map',

            // Генерируем дельты только для динамических узлов стейта
            factions: this._getDelta(this._initialStateSnapshot.factions, AppState.factions),
            characters: this._getDelta(this._initialStateSnapshot.characters, AppState.characters),
            objects: this._getDelta(this._initialStateSnapshot.objects, AppState.objects),

            // Если у тебя есть глобальные флаги квестов, сохраняем их целиком (они обычно весят мало)
            flags: AppState.flags ? { ...AppState.flags } : {}
        };

        // Записываем собранный бандл в твою IndexedDB
        try {
            const db = await this._getDB();
            await this._writeToStore(db, 'save_slots', slotId, saveBundle);
            console.log(`[SaveLoadManager] ИГРА УСПЕШНО СОХРАНЕНА в слот "${slotId}".`);
            return true;
        } catch (err) {
            console.error(`[SaveLoadManager] Не удалось записать сейв в базу данных:`, err);
            return false;
        }
    },

    /**
     * 📂 2. ЗАГРУЗКА: Извлечение дельты и накат поверх эталона
     * @param {string} slotId - Какой слот загружаем
     */
    async loadGame(slotId = 'slot_1') {
        try {
            const db = await this._getDB();
            const saveBundle = await this._readFromStore(db, 'save_slots', slotId);

            if (!saveBundle) {
                console.warn(`[SaveLoadManager] Сейв в слоте "${slotId}" не найден.`);
                return false;
            }

            console.log(`[SaveLoadManager] Сейв найден. Начинается сброс мира и накат патча...`);

            console.log(saveBundle);

            // 2.1. Глубоко клонируем эталонный InitialState, полностью очищая текущую оперативную память
            const resetState = JSON.parse(JSON.stringify(this._initialStateSnapshot));

            // 2.2. Накатываем сохраненные мутации поверх чистого чертежа мира
            this._applyDelta(resetState.factions, saveBundle.factions);
            this._applyDelta(resetState.characters, saveBundle.characters);
            this._applyDelta(resetState.objects, saveBundle.objects);

            if (saveBundle.flags) {
                resetState.flags = { ...saveBundle.flags };
            }

            // 2.3. Синхронизируем глобальные ссылки AppState на восстановленные объекты
            AppState.factions = resetState.factions;
            AppState.characters = resetState.characters;
            AppState.objects = resetState.objects;
            AppState.flags = resetState.flags;

            // 2.4. Переключаем карту и принудительно пересобираем объектный индекс AppState.entities текущего экрана
            window.init2();

            // MapManager.switchMap(saveBundle.currentMapId);
            // MapManager.refreshWorldRender();

            console.log(`[SaveLoadManager] ИГРА УСПЕШНО ЗАГРУЖЕНА из слота "${slotId}".`);
            return true;
        } catch (err) {
            console.error(`[SaveLoadManager] Критическая ошибка при загрузке игры:`, err);
            return false;
        }
    },

    /**
     * 📂 5. ПОЛУЧЕНИЕ СПИСКА ВСЕХ СЕЙВОВ (Для экрана загрузки)
     * @returns {Promise<Array>} Массив объектов с метаданными сейвов
     */
    async getAllSaves() {
        try {
            const db = await this._getDB();

            return new Promise((resolve, reject) => {
                const tx = db.transaction('save_slots', 'readonly');
                const store = tx.objectStore('save_slots');

                // Встроенный метод IndexedDB, который вытаскивает ВСЕ объекты из хранилища разом
                const req = store.getAll();

                req.onsuccess = () => {
                    const saveList = req.result || [];

                    // Сортируем список: самые свежие сохранения (по timestamp) будут вверху списка
                    saveList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                    resolve(saveList);
                };

                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.error(`[SaveLoadManager] Не удалось получить список сохранений:`, err);
            return [];
        }
    },


    /**
     * 🧮 Вспомогательный метод: Генерация дифференциального JSON-объекта (Diff)
     */
    _getDelta(base, current) {
        if (!base || !current) return current;
        const delta = {};
        let hasChanges = false;

        // Шаг А: Сканируем текущее состояние на предмет изменений и новых объектов
        Object.keys(current).forEach(key => {
            const baseVal = base[key];
            const curVal = current[key];

            // Если объекта раньше не было — это постройка или труп моба, забираем целиком
            if (baseVal === undefined) {
                delta[key] = curVal;
                hasChanges = true;
                return;
            }

            // Если значение является массивом (например, char.skills) — пишем целиком при любых изменениях
            if (Array.isArray(curVal)) {
                if (JSON.stringify(baseVal) !== JSON.stringify(curVal)) {
                    delta[key] = curVal;
                    hasChanges = true;
                }
                return;
            }

            // Если это вложенный объект (например, char.stats или char.mapPosition)
            if (curVal && typeof curVal === 'object') {
                const subDelta = this._getDelta(baseVal, curVal);
                if (subDelta && Object.keys(subDelta).length > 0) {
                    delta[key] = subDelta;
                    hasChanges = true;
                }
                return;
            }

            // Для плоских примитивов (числа, строки, булевы)
            if (baseVal !== curVal) {
                delta[key] = curVal;
                hasChanges = true;
            }
        });

        // Шаг Б: Проверяем, не было ли что-то удалено из базового стейта
        Object.keys(base).forEach(key => {
            if (current[key] === undefined) {
                delta[key] = { _deleted: true }; // Специальный маркер удаления для патчера
                hasChanges = true;
            }
        });

        return hasChanges ? delta : null;
    },

    /**
     * 🛠️ Вспомогательный метод: Накатывание (Мутация) дельты поверх базового объекта
     */
    _applyDelta(baseTarget, deltaPatch) {
        if (!baseTarget || !deltaPatch) return;

        Object.keys(deltaPatch).forEach(key => {
            const patchVal = deltaPatch[key];

            // Обработка маркера удаления
            if (patchVal && patchVal._deleted === true) {
                delete baseTarget[key];
                return;
            }

            // Если значения не было в базе, или это массив, или примитив — просто записываем/перезаписываем его
            if (baseTarget[key] === undefined || Array.isArray(patchVal) || typeof patchVal !== 'object' || patchVal === null) {
                baseTarget[key] = patchVal;
                return;
            }

            // Если это глубокий вложенный объект — спускаемся рекурсивно дальше
            this._applyDelta(baseTarget[key], patchVal);
        });
    },

    /**
     * 🗄️ Подключение к IndexedDB (Интеграция с твоей схемой имени базы данных)
     */
    _getDB() {
        console.log("????");
        return new Promise((resolve, reject) => {
            const dbName = (window.Game?.gameId || '') + 'ZCGS_GameAssetsDB';
            // Поднимаем версию до 2, чтобы сработал апгрейд для нового хранилища сохранений
            const request = indexedDB.open(dbName, 2);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Твое старое хранилище ресурсов картинок
                if (!db.objectStoreNames.contains('resources')) {
                    db.createObjectStore('resources');
                }
                // 🌟 Наше новое хранилище под дельта-сейвы
                if (!db.objectStoreNames.contains('save_slots')) {
                    db.createObjectStore('save_slots');
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    _writeToStore(db, storeName, key, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    _readFromStore(db, storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};

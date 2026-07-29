import { AppState } from '../shared/GameState.js';

export class AssetGalleryManager {
    constructor() {
        if (!window.gameAssets) {
            window.gameAssets = {};
        }
        // Твоя регулярка валидных расширений файлов
        this.allowedExtensions = /\.(png|jpg|jpeg|webp|svg|glb|mp4|m4a|mov|webm|mp3|wav|ogg)(\?.*)?$/i;

        // Кэш оперативной памяти для быстрого рендера картинок в галерее админки
        if (!AppState.assetGallery) {
            AppState.assetGallery = {};
        }
    }

    /**
     * 🏛️ 1. ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ (Твой оригинальный метод)
     */
    _initDB() {
        return new Promise((resolve, reject) => {
            const dbName = (window.Game?.gameId || '') + 'ZCGS_GameAssetsDB';
            const request = indexedDB.open(dbName, 2);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('resources')) {
                    db.createObjectStore('resources');
                }
                if (!db.objectStoreNames.contains('save_slots')) {
                    db.createObjectStore('save_slots');
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * 💾 2. ИЗВЛЕЧЕНИЕ / СКАЧИВАНИЕ ФАЙЛА (Твой оригинальный метод)
     */
    async _fetchBlobUrl(db, url) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) {
            return url;
        }

        return new Promise((resolve) => {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');
            const req = store.get(url);

            req.onsuccess = async () => {
                if (req.result) {
                    resolve(URL.createObjectURL(req.result));
                } else {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        const blob = await res.blob();

                        const writeTx = db.transaction('resources', 'readwrite');
                        writeTx.objectStore('resources').put(blob, url);

                        resolve(URL.createObjectURL(blob));
                    } catch (err) {
                        console.error(`[AssetGallery] Не удалось скачать ресурс [${url}]:`, err);
                        resolve(url);
                    }
                }
            };

            req.onerror = () => resolve(url);
        });
    }
    
    /**
     * 🚀 3. АВТОМАТИЧЕСКАЯ ИНДЕКСАЦИЯ КЭША (ГЛУБОКИЙ ПАРСИНГ ПУТЕЙ)
     * Сканирует твою таблицу 'resources' и раскладывает ассеты по точным папкам любой вложенности
     */
    async loadGalleryFromCache() {
        try {
            const db = await this._initDB();

            return new Promise((resolve) => {
                const tx = db.transaction('resources', 'readonly');
                const store = tx.objectStore('resources');
                const requestKeys = store.getAllKeys();

                requestKeys.onsuccess = async () => {
                    const cachedUrls = requestKeys.result || [];

                    for (const url of cachedUrls) {
                        if (typeof url === 'string' && this.allowedExtensions.test(url)) {

                            const liveBlobUrl = await this._fetchBlobUrl(db, url);

                            // Нормализуем путь, убирая стартовую точку-папку для единообразия вкладок
                            const normalizedUrl = url.replace(/^\.\//, '');

                            // 🚀 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Вырезаем всю цепочку подпапок целиком!
                            // Находим индекс последнего слеша перед именем файла
                            const lastSlashIndex = normalizedUrl.lastIndexOf('/');

                            // Если слеш есть, категорией становится весь путь до него: "assets/images/heroes/fullheight"
                            // Если слеша нет (файл в корне), пишем в категорию "root"
                            const dynamicCategory = lastSlashIndex !== -1
                                ? normalizedUrl.substring(0, lastSlashIndex)
                                : 'root';

                            // Регистрируем ассет в глобальной памяти галереи
                            AppState.assetGallery[url] = {
                                id: url, // Сам путь — это твой жесткий ID ключа
                                name: normalizedUrl.substring(lastSlashIndex + 1), // Вырезаем только чистое имя файла с расширением
                                path: url,
                                blobUrl: liveBlobUrl,
                                category: dynamicCategory // 🌌 Вкладка-папка будет называться "assets/images/heroes/fullheight"
                            };
                        }
                    }
                    console.log(`[AssetGallery] Индексация подпапок завершена. Всего файлов в реестре:`, Object.keys(AppState.assetGallery).length);
                    resolve(true);
                };

                requestKeys.onerror = () => resolve(false);
            });
        } catch (error) {
            console.error('[AssetGallery] Ошибка сканирования подпапок кэша:', error);
            return false;
        }
    }

    /**
     * 📥 4. ИМПОРТ НОВОГО ФАЙЛА С КОМПЬЮТЕРА В ЛЮБУЮ ГЛУБОКУЮ ПОДПАПКУ
     * @param {File} file - Ванильный HTML5 File из инпута
     * @param {string} category - Полный путь выбранной папки-категории (например, "assets/images/heroes/fullheight")
     */
    async uploadLocalFile(file, category = 'assets/images/objects') {
        const db = await this._initDB();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const arrayBuffer = e.target.result;
                const blob = new Blob([arrayBuffer], { type: file.type });

                // Убираем лишние точки и слеши с краев категории, подстраиваясь под твой каноничный вид путей
                const cleanCategory = category.replace(/^\.\//, '').replace(/\/$/, '');
                const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');

                // 🚀 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Сохраняем точный путь вложенности в ключе ресурсов!
                const virtualPath = `./${cleanCategory}/${safeName}`;

                // Пишем Blob в твою родную таблицу 'resources' под сгенерированным путем-ключом
                const writeTx = db.transaction('resources', 'readwrite');
                const store = writeTx.objectStore('resources');
                const putRequest = store.put(blob, virtualPath);

                putRequest.onsuccess = () => {
                    const liveBlobUrl = URL.createObjectURL(blob);

                    const newAsset = {
                        id: virtualPath,
                        name: file.name,
                        path: virtualPath,
                        blobUrl: liveBlobUrl,
                        category: cleanCategory
                    };

                    AppState.assetGallery[virtualPath] = newAsset;
                    resolve(newAsset);
                };

                putRequest.onerror = () => reject(putRequest.error);
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }


    /**
     * 🗑️ 5. УДАЛЕНИЕ АССЕТА ИЗ ГАЛЕРЕИ И КЭША RESOURCES
     */
    async deleteAsset(assetPath) {
        const db = await this._initDB();
        return new Promise((resolve) => {
            const tx = db.transaction('resources', 'readwrite');
            const store = tx.objectStore('resources');
            const req = store.delete(assetPath);

            req.onsuccess = () => {
                // Вычищаем из оперативной памяти
                if (AppState.assetGallery?.[assetPath]) {
                    delete AppState.assetGallery[assetPath];
                }
                resolve(true);
            };
            req.onerror = () => resolve(false);
        });
    }
}

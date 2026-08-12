//==== AssetLoaderManager.js
import { AppState } from '../shared/GameState.js'; // или ваш путь к GameState / конфигурациям

export class AssetLoaderManager {
    constructor() {
        if (!window.gameAssets) {
            window.gameAssets = {};
        }
        this.allowedExtensions = /\.(png|jpg|jpeg|webp|svg|glb|mp4|m4a|mov|webm|mp3|wav|ogg)(\?.*)?$/i;
    }

    /**
     * 1. Инициализация базы данных IndexedDB
     */
    _initDB() {
        return new Promise((resolve, reject) => {
            // Game.gameId берется из вашего глобального контекста
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
     * 2. Извлечение файла из IndexedDB или скачивание с сервера
     */
    async _fetchBlobUrl(db, url) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) {
            return url;
        }

        const url2 = url.replace("/play","").replace("/editor","");

        return new Promise((resolve) => {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');
            const req = store.get(url2);

            req.onsuccess = async () => {
                if (req.result) {
                    // Файл найден в локальном кэше IndexedDB
                    resolve(URL.createObjectURL(req.result));
                } else {
                    // Файла нет в кэше — качаем из сети
                    try {
                        const currentPath2 = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                        const currentPath = currentPath2.replace("/play","").replace("/editor","");

                        const res = await fetch(currentPath + url2);
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        const blob = await res.blob();

                        // Сохраняем скачанный Blob в IndexedDB для будущих запусков
                        const writeTx = db.transaction('resources', 'readwrite');
                        writeTx.objectStore('resources').put(blob, url2);

                        resolve(URL.createObjectURL(blob));
                    } catch (err) {
                        // console.error(`[AssetLoader] Не удалось скачать ресурс [${url2}]:`, err);
                        resolve(url); // Фолбэк на сеть в случае сбоя
                    }
                }
            };

            req.onerror = () => resolve(url);
        });
    }

    /**
     * 3. Рекурсивный сбор всех уникальных путей из ваших конфигов
     */
    _collectUniqueUrls(obj, uniquePaths = new Set()) {
        if (!obj || typeof obj !== 'object') return uniquePaths;

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];

                if (typeof val === 'string' && val.trim() !== '') {
                    const originalStr = val.trim();
                    let cleanUrl = originalStr;
                    const isCssUrl = originalStr.startsWith('url(');

                    if (isCssUrl) {
                        cleanUrl = originalStr.replace(/^url\(['"]?|['"]?\)$/g, '').trim();
                    }

                    // Фильтр от мусора и эмодзи
                    if (cleanUrl.length < 4 || (!cleanUrl.includes('.') && !cleanUrl.includes('/'))) {
                        continue;
                    }

                    if (!this.allowedExtensions.test(cleanUrl)) {
                        continue;
                    }

                    uniquePaths.add(cleanUrl);
                } else if (typeof val === 'object') {
                    this._collectUniqueUrls(val, uniquePaths);
                }
            }
        }
        return uniquePaths;
    }

    /**
     * 🚀 ГЛАВНАЯ ТОЧКА ВХОДА: Одновременный кэш и регистрация во всех движках
     */
    async loadAllGameAssets() {

        // const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        // await PIXI.Assets.init({ basePath: currentPath });
        const currentPath2 = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

        const currentPath = currentPath2.replace("/play","").replace("/editor","");

        await PIXI.Assets.init({ basePath: currentPath });

        const uniquePaths = new Set();
        this._collectUniqueUrls(AppState.ConfigTerrain, uniquePaths);
        this._collectUniqueUrls(AppState.ConfigObject, uniquePaths);
        if(AppState.ConfigCharacter) {
            this._collectUniqueUrls(AppState.ConfigCharacter, uniquePaths);
        }
        else if(AppState.characters) {
            this._collectUniqueUrls(AppState.characters, uniquePaths);
        }
        this._collectUniqueUrls(AppState.ConfigProjectiles, uniquePaths);

        // this._collectUniqueUrls(AppState.characters, uniquePaths);
        if(AppState.ui?.landscape) {
            const lsScreens = {};
            AppState.ui.landscape.forEach(s => {
                lsScreens[s.id] = s;
            });
            this._collectUniqueUrls(lsScreens, uniquePaths)
        }
        if(AppState.ui?.portrait) {
            AppState.ui.portrait.forEach(s=>this._collectUniqueUrls({s}, uniquePaths));
        }
        // this._collectUniqueUrls(AppState.objects, uniquePaths);
        this._collectUniqueUrls(AppState.playerGallery, uniquePaths);

        this._collectUniqueUrls(AppState.effects, uniquePaths);
        this._collectUniqueUrls(AppState.skills, uniquePaths);
        this._collectUniqueUrls(AppState.dialogs, uniquePaths);
        this._collectUniqueUrls(AppState.sound, uniquePaths);

        const assetsArray = Array.from(uniquePaths);
        const totalFiles = assetsArray.length;
        let loadedCount = 0;

        let db = null;
        try { db = await this._initDB(); } catch (err) { console.error(err); }

        const pixiLoadQueue = [];
        AppState.engine.threeTextureCache = {};

        for (const path of assetsArray) {
            if (window.gameAssets[path] && window.gameAssets[path] !== 'loading') continue;

            window.gameAssets[path] = 'loading';
            const isCssForm = `url("${path}")`;

            const processAssetPromise = (async () => {
                let finalSrc = path;
                if (db) {
                    finalSrc = await this._fetchBlobUrl(db, path);
                }

                // Записываем финальный blob в глобальный кэш
                window.gameAssets[path] = finalSrc;
                window.gameAssets[isCssForm] = `url("${finalSrc}")`;

                const lowerPath = path.toLowerCase();

                // 1. ОБРАБОТКА 3D МОДЕЛЕЙ (GLB)
                if (lowerPath.endsWith('.glb')) {
                    PIXI.Assets.add({ alias: path, src: finalSrc });
                    await PIXI.Assets.load(path);
                    return;
                }

                // 2. ОБРАБОТКА ВИДЕО (mp4, mov, webm)
                if (lowerPath.endsWith('.mp4')|| lowerPath.endsWith('.mov') || lowerPath.endsWith('.webm')) {
                    await new Promise((resolve) => {
                        const video = document.createElement('video');
                        video.preload = 'metadata'; // 🌟 СТРОГИЙ ФИКС: Считываем только метаданные, чтобы не вешать мобильную память!
                        video.onloadedmetadata = () => resolve(); // Ждем только заголовки файла
                        video.onerror = () => {
                            console.warn(`[AssetLoader] Ошибка видео ${path}, фолбэк на сеть.`);
                            resolve();
                        };
                        video.src = finalSrc;
                    });
                }
                // 3. ОБРАБОТКА АУДИО (mp3, m4a, wav, ogg)
                else if (lowerPath.endsWith('.mp3') || lowerPath.endsWith('.m4a')  || lowerPath.endsWith('.wav') || lowerPath.endsWith('.ogg')) {
                    await new Promise((resolve) => {
                        const audio = new Audio();
                        audio.preload = 'metadata'; // 🌟 СТРОГИЙ ФИКС: Читаем только метаданные для тяжелых часовых треков!

                        // Браузер мгновенно прочитает структуру Blob-файла из IndexedDB,
                        // поймет, что файл не битый, и сразу пропустит загрузку дальше!
                        audio.onloadedmetadata = () => resolve();

                        audio.onerror = () => {
                            console.warn(`[AssetLoader] Ошибка аудио ${path}, фолбэк на сеть.`);
                            resolve();
                        };
                        audio.src = finalSrc;
                    });
                }
                // 4. ОБРАБОТКА КАРТИНОК И ТЕКСТУР PIXI
                else {
                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            try {
                                const texture = PIXI.Texture.from(img);

                                PIXI.Assets.cache.set(path, texture);

                                // Дублируем в старый кэш для полной безопасности
                                PIXI.Texture.addToCache(texture, path);

                            } catch (e) { console.warn(e); }
                            resolve();
                        };
                        img.onerror = () => {
                            PIXI.Assets.add({ alias: path, src: path });
                            resolve();
                        };
                        img.src = finalSrc;
                    });

                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            try {
                                // Создаем 3D текстуру из загруженной HTML-картинки
                                const texture = new THREE.Texture(img);
                                texture.needsUpdate = true; // Сигнал для видеокарты загрузить пиксели

                                // Для пиксель-арта и четких тайлов отключаем размытие при масштабировании
                                texture.magFilter = THREE.NearestFilter;
                                texture.minFilter = THREE.NearestFilter;

                                // Сохраняем в наш новый кэш по пути файла (path)
                                AppState.engine.threeTextureCache[path] = texture;

                            } catch (e) {
                                console.warn("Ошибка создания 3D текстуры:", e);
                            }
                            resolve();
                        };
                        img.onerror = () => {
                            console.error("Не удалось загрузить картинку:", finalSrc);
                            resolve();
                        };
                        img.src = finalSrc;
                    });
                }

                loadedCount++;

                const loadingNode = document.getElementById('loading-num');
                const progressFill = document.getElementById('progress-fill');
                const percent = Math.round((loadedCount / totalFiles) * 100);

                // Обновляем проценты в текстовой строке
                if (loadingNode) {
                    loadingNode.innerHTML = `${percent}%`;
                }

                // Плавно сдвигаем двухцветную закругленную шкалу
                if (progressFill) {
                    progressFill.style.width = `${percent}%`;
                }

                // Триггер завершения загрузки пакета файлов
                if (loadedCount === totalFiles) {
                    setTimeout(() => {
                        if (window.loaderControl && typeof window.loaderControl.end === 'function') {
                            window.loaderControl.end();
                        }
                    }, 250);
                }

            })();

            pixiLoadQueue.push(processAssetPromise);
        }




        await Promise.all(pixiLoadQueue);

        // Хвосты для GLB, если они были в очереди
        const remainingAssets = assetsArray.filter(p => p.endsWith('.glb'));
        if (remainingAssets.length > 0) {
            try { await PIXI.Assets.load(remainingAssets); } catch (err) { console.warn(err); }
        }

        console.log(`✅ [AssetLoaderManager] Все ${totalFiles} ресурсов (включая медиа) успешно готовы!`);
    }


    /**
     * 3. 🚀 СКАНИРОВАНИЕ ВСЕХ КЭШИРОВАННЫХ АССЕТОВ ДЛЯ ГАЛЕРЕИ
     * Пробегается по твоей таблице 'resources' и собирает массив для вывода превьюшек в админке
     */
    async getAllCachedAssets() {
        const db = await this._initDB();
        return new Promise((resolve) => {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');

            // Используем нативный метод getAllKeys для сбора всех строк-путей
            const reqKeys = store.getAllKeys();

            reqKeys.onsuccess = async () => {
                const urls = reqKeys.result || [];
                const galleryItems = [];

                // Для каждого найденного пути генерируем живую blob-ссылку для отображения в сетке Галереи
                for (const url of urls) {
                    if (this.allowedExtensions.test(url)) {
                        const blobUrl = await this._fetchBlobUrl(db, url);

                        // Определяем категорию по имени папки (objects, heroes, terrain) для фильтрации во вкладках
                        let category = 'objects';
                        if (url.includes('/heroes/') || url.includes('/char/')) category = 'heroes';
                        if (url.includes('/terrain/') || url.includes('/tiles/')) category = 'terrain';
                        if (url.includes('/ui/') || url.includes('/icons/')) category = 'ui';

                        galleryItems.push({
                            id: url, // Сам путь — это жесткий ID для записи в CatalogManager
                            name: url.substring(url.lastIndexOf('/') + 1), // Имя файла для подписи карточки
                            url: url,
                            blobUrl: blobUrl,
                            category: category
                        });
                    }
                }
                resolve(galleryItems);
            };

            reqKeys.onerror = () => resolve([]);
        });
    }

    /**
     * 📥 4. ПРЯМАЯ ЗАПИСЬ ФАЙЛА С КОМПЬЮТЕРА В ТВОЙ ИНДЕКСЕД-ДБ
     * Вызывается, когда геймдизайнер нажимает в галерее кнопку "Загрузить картинку"
     * @param {File} file - HTML5 объект файла с компьютера
     * @param {string} category - Выбранная вкладка админки ('heroes', 'objects', 'terrain', 'ui')
     */
    async saveUserAssetToGallery(file, category = 'objects') {
        const db = await this._initDB();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const arrayBuffer = e.target.result;
                const blob = new Blob([arrayBuffer], { type: file.type });

                // Генерируем уникальный виртуальный путь-ключ строго под твою архитектуру resources
                const virtualPath = `./assets/user/${category}/img_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

                // Открываем транзакцию на запись в твою родную таблицу ресурсов ресурсы
                const writeTx = db.transaction('resources', 'readwrite');
                const store = writeTx.objectStore('resources');

                // Кладем Blob под виртуальным путем-ключом
                const req = store.put(blob, virtualPath);

                req.onsuccess = () => {
                    // Создаем живую ссылку для немедленного отображения без перезагрузки
                    const blobUrl = URL.createObjectURL(blob);

                    console.log(`[AssetLoader] Пользовательский файл успешно импортирован в кэш: ${virtualPath}`);
                    resolve({
                        id: virtualPath,
                        name: file.name,
                        url: virtualPath,
                        blobUrl: blobUrl,
                        category: category
                    });
                };

                req.onerror = () => reject(req.error);
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

}

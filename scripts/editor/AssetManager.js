import { AppState } from '../shared/GameState.js';

export class AssetManager {
    constructor() {
        this.allowedExtensions = /\.(png|jpg|jpeg|webp|svg|glb|mp4|m4a|mov|webm|mp3|wav|ogg)(\?.*)?$/i;
        this.modalElement = null;

        // Текущая папка, внутри которой находится пользователь. По умолчанию — корень
        this.currentDirectory = 'assets';

        if (!AppState.assetGallery) {
            AppState.assetGallery = {};
        }
    }

    /**
     * 🧱 ЧАСТЬ 1: ОТКРЫТИЕ КАРКАСА МОДАЛКИ (ФАЙЛОВЫЙ ПРОВОДНИК)
     * @param {Function} onSelectCallback - Функция, вызываемая при выборе картинки для инпута
     */
    async openGalleryModal(onSelectCallback = null) {
        this.closeGalleryModal();
        const currentLang = AppState.game_settings?.language || 'en';

        // Принудительно сканируем IndexedDB перед рендером
        await AppState.engine.AssetGalleryManager.loadGalleryFromCache();

        // Главный родительский оверлей
        const overlay = document.createElement('div');
        overlay.id = 'asset-gallery-modal';
        overlay.style.pointerEvents = 'auto';
        Object.assign(overlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 8, 12, 0.97)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: '10000', fontFamily: 'sans-serif'
        });
        this.modalElement = overlay;

        // Фиксированный круглый крестик закрытия окна
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10005'
        });
        closeBtn.onclick = () => this.closeGalleryModal();
        overlay.appendChild(closeBtn);

        // Центральная большая доска проводника (Широкий экран на 95%)
        const board = document.createElement('div');
        Object.assign(board.style, {
            width: '95%', maxWidth: '1100px', height: '85vh',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', overflow: 'hidden'
        });
        overlay.appendChild(board);

        // Хедер панели управления
        const header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', padding: '15px 20px', backgroundColor: '#161d2a',
            borderBottom: '2px solid #232d38', display: 'flex', alignItems: 'center', boxSizing: 'border-box'
        });
        board.appendChild(header);

        // Заголовок в зависимости от режима (Обзор или Picker)
        const title = document.createElement('h3');
        title.textContent = onSelectCallback ? '🎯 PICK ASSET' : '🗂️ FILE BROWSER';
        title.style.cssText = 'color:#ffd166; margin:0; font-size:13px; font-weight:bold; letter-spacing:1px;';
        header.appendChild(title);

        // Кнопка шага НАЗАД (Вверх по дереву папок)
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '⬆️ Up';
        Object.assign(upBtn.style, {
            padding: '5px 12px', backgroundColor: '#232d38', color: '#fff', border: '1px solid #2d394b',
            borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '20px'
        });
        header.appendChild(upBtn);

        // Индикатор пути (Хлебные крошки)
        const pathBreadcrumb = document.createElement('span');
        pathBreadcrumb.style.cssText = 'color:#8a92a6; font-size:12px; font-family:monospace; margin-left:15px; font-weight:bold;';
        header.appendChild(pathBreadcrumb);

        // Основной контейнер под файловую сетку (Занимает 100% ширины)
        const gridPanel = document.createElement('div');
        Object.assign(gridPanel.style, {
            width: '100%', flex: '1', padding: '20px', display: 'flex', flexDirection: 'column',
            gap: '15px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: '#090d14'
        });
        board.appendChild(gridPanel);

        // Скрытый системный инпут для выбора локальных файлов с ПК
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        gridPanel.appendChild(fileInput);

        // Кнопка загрузки новых файлов прямо в текущую подпапку проводника
        const uploadBtn = document.createElement('button');
        uploadBtn.textContent = currentLang === 'ru' ? '📥 Загрузить файл сюда' : '📥 Upload File Here';
        Object.assign(uploadBtn.style, {
            width: 'fit-content', padding: '10px 20px', backgroundColor: '#2ea44f', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
        });
        uploadBtn.onclick = () => fileInput.click();
        gridPanel.appendChild(uploadBtn);

        // =========================================================================
        // 📁+ КНОПКА СОЗДАНИЯ НОВОЙ ПАПКИ В ХЕДЕРЕ
        // =========================================================================
        const createFolderBtn = document.createElement('button');
        createFolderBtn.innerHTML = '📁+';
        Object.assign(createFolderBtn.style, {
            padding: '5px 12px', backgroundColor: '#1b2432', color: '#2ea44f', border: '1px solid #2d394b',
            borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '10px'
        });
        header.appendChild(createFolderBtn);

        createFolderBtn.onclick = () => {
            const folderName = prompt(currentLang === 'ru' ? 'Введите имя новой папки:' : 'Enter new folder name:');
            if (folderName && folderName.trim() !== '') {
                const cleanFolderName = folderName.trim().replace(/[^a-zA-Z0-9_]/g, '_');

                // Создаем виртуальный путь для новой папки: "assets/images/new_folder"
                const newFolderPath = `${this.currentDirectory}/${cleanFolderName}`;

                // Чтобы пустая папка зафиксировалась в кэше и не исчезла,
                // мы создаем в ней невидимый технический маркер-заглушку в AppState.assetGallery
                if (!AppState.assetGallery) AppState.assetGallery = {};
                AppState.assetGallery[`${newFolderPath}/.keep`] = {
                    id: `${newFolderPath}/.keep`,
                    name: '.keep',
                    path: `${newFolderPath}/.keep`,
                    blobUrl: '',
                    category: newFolderPath // Путь папки пишется в категорию
                };

                console.log(`[AssetManager] Создана виртуальная папка: ${newFolderPath}`);
                refreshFileBrowser(); // Мгновенно перерисовываем проводник, папка появится в сетке!
            }
        };

        const exportZipBtn = document.createElement('button');
        exportZipBtn.innerHTML = '📦 Backup ZIP';
        Object.assign(exportZipBtn.style, {
            padding: '5px 12px', backgroundColor: '#1b2432', color: '#ffd166', border: '1px solid #2d394b',
            borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '10px'
        });
        header.appendChild(exportZipBtn);

        exportZipBtn.onclick = async () => {
            exportZipBtn.textContent = '⌛ Packing...';
            exportZipBtn.disabled = true;

            // Вызываем наш новый метод бэкапа базы данных
            await this.exportGalleryToZip();

            exportZipBtn.textContent = '📦 Backup ZIP';
            exportZipBtn.disabled = false;
        };

        // Сама сетка, где будут рендериться папки и файлы вместе
        const assetsGrid = document.createElement('div');
        Object.assign(assetsGrid.style, {
            width: '100%', flex: '1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px', alignContent: 'start'
        });
        gridPanel.appendChild(assetsGrid);

        // =========================================================================
        // 🗂️ ЧАСТЬ 2: ДВИЖОК СКАНИРОВАНИЯ ДИРЕКТОРИЙ И ОТРИСОВКИ СЕТКИ (ПРОВОДНИК)
        // =========================================================================
        const refreshFileBrowser = () => {
            assetsGrid.innerHTML = ''; // Полностью вычищаем старый экран

            // Синхронизируем строку хлебных крошек в шапке
            pathBreadcrumb.textContent = ` > ${this.currentDirectory}`;

            // Если мы в самом корне ("assets"), блокируем кнопку "Up"
            const isRoot = this.currentDirectory === 'assets';
            upBtn.style.opacity = isRoot ? '0.4' : '1';
            upBtn.style.cursor = isRoot ? 'not-allowed' : 'pointer';

            const allAssets = Object.values(AppState.assetGallery || {});

            // Наборы для уникализации папок и отбора файлов
            const subFoldersInCurrentDir = new Set();
            const filesInCurrentDir = [];

            const currentDirWithSlash = this.currentDirectory + '/';

            allAssets.forEach(asset => {
                // Нормализуем категорию ассета (убираем стартовые "./" если они есть)
                const assetCategory = asset.category.replace(/^\.\//, '');

                // Проверяем, относится ли ассет к нашей текущей ветке
                if (assetCategory.startsWith(this.currentDirectory)) {

                    // Случай А: Файл лежит ПРЯМО в текущей папке
                    if (assetCategory === this.currentDirectory) {
                        filesInCurrentDir.push(asset);
                    }
                    // Случай Б: Файл лежит в глубокой подпапке текущей папки
                    else if (assetCategory.startsWith(currentDirWithSlash)) {
                        // Отрезаем текущую директорию: "assets/images/heroes" -> "heroes"
                        const relativePart = assetCategory.substring(currentDirWithSlash.length);
                        // Берем только имя следующей подпапки (до первого слеша)
                        const nextFolderName = relativePart.split('/')[0];

                        if (nextFolderName) {
                            subFoldersInCurrentDir.add(nextFolderName);
                        }
                    }
                }
            });

            // ---------------------------------------------------------------------
            // 📁 А. СНАЧАЛА РЕНДЕРИМ ВСЕ ОБНАРУЖЕННЫЕ ПОДПАПКИ
            // ---------------------------------------------------------------------
            // ---------------------------------------------------------------------
            // 📁 А. СНАЧАЛА РЕНДЕРИМ ВСЕ ОБНАРУЖЕННЫЕ ПОДПАПКИ (С КАСКАДНЫМ УДАЛЕНИЕМ)
            // ---------------------------------------------------------------------
            Array.from(subFoldersInCurrentDir).sort().forEach(folderName => {
                const folderCard = document.createElement('div');
                Object.assign(folderCard.style, {
                    padding: '12px', backgroundColor: '#161d2a', border: '1px solid #2d394b',
                    borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    boxSizing: 'border-box', cursor: 'pointer', position: 'relative'
                });

                // Иконка папки
                const iconHolder = document.createElement('div');
                iconHolder.style.cssText = 'font-size: 38px; display:flex; align-items:center; justify-content:center; height:65px;';
                iconHolder.innerHTML = '📁';
                folderCard.appendChild(iconHolder);

                // Имя папки
                const nameLabel = document.createElement('div');
                nameLabel.textContent = folderName;
                nameLabel.style.cssText = 'color:#fff; font-size:11px; font-weight:bold; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace;';
                folderCard.appendChild(nameLabel);

                // 🗑️ КНОПКА КАСКАДНОГО УДАЛЕНИЯ ПАПКИ В УГЛУ КАРТОЧКИ
                const delFolderBtn = document.createElement('span');
                delFolderBtn.innerHTML = '🗑️';
                delFolderBtn.style.cssText = 'position:absolute; top:4px; right:4px; font-size:10px; cursor:pointer; background:rgba(0,0,0,0.7); padding:2px; border-radius:3px; z-index:10; opacity:0.5; transition:opacity 0.15s;';
                delFolderBtn.onmouseenter = () => delFolderBtn.style.opacity = '1';
                delFolderBtn.onmouseleave = () => delFolderBtn.style.opacity = '0.5';

                delFolderBtn.onclick = async (e) => {
                    e.stopPropagation(); // Запрещаем проваливаться внутрь папки при попытке её удалить!

                    const targetFolderToDestroy = `${this.currentDirectory}/${folderName}`;
                    const confirmMsg = currentLang === 'ru'
                        ? `ВНИМАНИЕ! Удалить папку "${folderName}" и НАВСЕГДА СТЕРЕТЬ все файлы внутри неё из кэша?`
                        : `WARNING! Delete folder "${folderName}" and CACHE-WIPE all nested files inside permanently?`;

                    if (confirm(confirmMsg)) {
                        const allAssets = Object.values(AppState.assetGallery || {});

                        // Собираем все файлы, которые лежат внутри удаляемой папки
                        const assetsInFolder = allAssets.filter(asset => asset.category.startsWith(targetFolderToDestroy));

                        // Асинхронно вырезаем каждый вложенный файл из твоей IndexedDB resources
                        for (const asset of assetsInFolder) {
                            await this.deleteAsset(asset.path);
                        }

                        // Удаляем невидимый маркер удержания папки, если он был
                        if (AppState.assetGallery[`${targetFolderToDestroy}/.keep`]) {
                            delete AppState.assetGallery[`${targetFolderToDestroy}/.keep`];
                        }

                        console.log(`[AssetManager] Папка каскадно удалена со всем содержимым: ${targetFolderToDestroy}`);
                        refreshFileBrowser(); // Полный перерендер сетки
                    }
                };
                folderCard.appendChild(delFolderBtn);

                // КЛИК ПО КАРТОЧКЕ — ПРОВАЛИВАЕМСЯ ВНУТРЬ ПАПКИ
                folderCard.onclick = () => {
                    this.currentDirectory = `${this.currentDirectory}/${folderName}`;
                    refreshFileBrowser();
                };

                assetsGrid.appendChild(folderCard);
            });


            // ---------------------------------------------------------------------
            // 🖼️ Б. СЛЕДОМ РЕНДЕРИМ ВСЕ ФАЙЛЫ ВНУТРИ ТЕКУЩЕЙ ПАПКИ
            // ---------------------------------------------------------------------
            // ---------------------------------------------------------------------
            // 🖼️ Б. СЛЕДОМ РЕНДЕРИМ ВСЕ ФАЙЛЫ ВНУТРИ ТЕКУЩЕЙ ПАПКИ (С ПОДДЕРЖКОЙ АУДИО/ВИДЕО)
            // ---------------------------------------------------------------------
            // ---------------------------------------------------------------------
            // 🖼️ Б. СЛЕДОМ РЕНДЕРИМ ВСЕ ФАЙЛЫ (ИНТЕРАКТИВНЫЙ МЕДИА-ЦЕНТР + RENAME)
            // ---------------------------------------------------------------------
            filesInCurrentDir.sort((a, b) => a.name.localeCompare(b.name)).forEach(asset => {
                const fileCard = document.createElement('div');
                Object.assign(fileCard.style, {
                    padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                    borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    boxSizing: 'border-box', position: 'relative', cursor: 'default', width: '100%'
                });

                // Универсальный контейнер превью ассета (Разворачиваем до 90px высоты для плееров)
                const mediaHolder = document.createElement('div');
                Object.assign(mediaHolder.style, {
                    width: '100%', height: '90px', backgroundColor: '#090d14', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', boxSizing: 'border-box'
                });

                const lowerName = asset.name.toLowerCase();

                // 1. ДИНАМИЧЕСКИЙ ДАТА-ДРИВЕН МЕДИА-ПЛЕЕР
                if (/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(lowerName)) {
                    // Картинка
                    mediaHolder.innerHTML = `<img src="${asset.blobUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
                }
                else if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(lowerName)) {
                    // 🎵 АУДИО: Интегрируем нативный мини-плеер!
                    mediaHolder.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:100%;">
                            <span style="font-size:16px;">🎵</span>
                            <audio controls src="${asset.blobUrl}" style="width:100%; height:24px; scale:0.95;"></audio>
                        </div>
                    `;
                    // Останавливаем всплытие клика на элементы плеера, чтобы при регулировке громкости модалка не закрывалась
                    mediaHolder.querySelector('audio').onmousedown = (e) => e.stopPropagation();
                }
                else if (/\.(mp4|webm|mov)(\?.*)?$/i.test(lowerName)) {
                    // 🎬 ВИДЕО: Встраиваем мини-видеоплеер с контроллерами
                    mediaHolder.innerHTML = `
                        <video controls muted src="${asset.blobUrl}" style="max-width:100%; max-height:100%; object-fit:contain;"></video>
                    `;
                    mediaHolder.querySelector('video').onmousedown = (e) => e.stopPropagation();
                }
                else {
                    // 3D-модели или JSON
                    mediaHolder.innerHTML = `<div style="font-size:24px; color:#6a737d;">📄</div>`;
                }

                fileCard.appendChild(mediaHolder);

                // БЛОК ИМЕНИ ФАЙЛА С КНОПКОЙ ПЕРЕИМЕНОВАНИЯ (✏️)
                const nameWrapper = document.createElement('div');
                nameWrapper.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:6px; width:100%; overflow:hidden;';

                const nameLabel = document.createElement('div');
                nameLabel.textContent = asset.name;
                nameLabel.style.cssText = 'color:#fff; font-size:10px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; flex:1;';
                nameWrapper.appendChild(nameLabel);

                // ✏️ КНОПКА ДИНАМИЧЕСКОГО ПЕРЕИМЕНОВАНИЯ ФАЙЛА
                const renameBtn = document.createElement('span');
                renameBtn.innerHTML = '✏️';
                renameBtn.style.cssText = 'font-size:10px; cursor:pointer; opacity:0.6; transition:opacity 0.15s;';
                renameBtn.onmouseenter = () => renameBtn.style.opacity = '1';
                renameBtn.onmouseleave = () => renameBtn.style.opacity = '0.6';

                renameBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const newName = prompt(currentLang === 'ru' ? 'Введите новое имя файла (с расширением!):' : 'Enter new filename (with extension!):', asset.name);

                    if (newName && newName.trim() !== '' && newName !== asset.name) {
                        const validatedName = newName.trim();

                        // Меняем имя в оперативной памяти
                        asset.name = validatedName;

                        // Считаем новый виртуальный путь (ключ) на основе текущей папки
                        const parts = asset.path.split('/');
                        parts[parts.length - 1] = validatedName;
                        const newPath = parts.join('/');

                        // Перезаписываем данные в IndexedDB через твой метод (удаляем старый ключ, пишем новый)
                        const db = await this._initDB();
                        const tx = db.transaction('resources', 'readwrite');
                        const store = tx.objectStore('resources');

                        // Достаем Blob по старому пути
                        const getReq = store.get(asset.path);
                        getReq.onsuccess = () => {
                            if (getReq.result) {
                                // Записываем этот же Blob под новым именем-ключом
                                store.put(getReq.result, newPath);
                                // Удаляем старый ключ, чтобы не плодить дубликаты
                                store.delete(asset.path);

                                // Синхронизируем ссылки в реестре AppState
                                delete AppState.assetGallery[asset.path];
                                asset.id = newPath;
                                asset.path = newPath;
                                AppState.assetGallery[newPath] = asset;

                                console.log(`[AssetManager] Файл успешно переименован в: ${newPath}`);
                                refreshFileBrowser(); // Полный мгновенный ререндер проводника
                            }
                        };
                    }
                };
                nameWrapper.appendChild(renameBtn);
                fileCard.appendChild(nameWrapper);

                // УТИЛИТАРНЫЕ КНОПКИ УПРАВЛЕНИЯ В УГЛАХ КАРТОЧКИ
                // Кнопка удаления (🗑️)
                const delBtn = document.createElement('span');
                delBtn.innerHTML = '🗑️';
                delBtn.style.cssText = 'position:absolute; top:4px; right:4px; font-size:10px; cursor:pointer; background:rgba(0,0,0,0.7); padding:2px; border-radius:3px; z-index:10;';
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить файл ${asset.name} из кэша?`)) {
                        await this.deleteAsset(asset.path);
                        refreshFileBrowser();
                    }
                };
                fileCard.appendChild(delBtn);

                // Кнопка ВЫБОРА АССЕТА (🎯) — появляется только если мы открыли Галерею в режиме Picker
                if (onSelectCallback) {
                    const pickBtn = document.createElement('button');
                    pickBtn.textContent = currentLang === 'ru' ? 'Выбрать' : 'Select';
                    Object.assign(pickBtn.style, {
                        width: '100%', padding: '4px', backgroundColor: '#3498db', border: 'none',
                        borderRadius: '3px', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto'
                    });
                    pickBtn.onclick = (e) => {
                        e.stopPropagation();
                        onSelectCallback(asset.path); // Прокидываем путь в форму инпута
                        this.closeGalleryModal(); // Схлопываем проводник
                    };
                    fileCard.appendChild(pickBtn);
                } else {
                    // Если просто режим просмотра — клик по карточке подсвечивает её рамкой
                    fileCard.onclick = () => {
                        Array.from(assetsGrid.children).forEach(c => c.style.borderColor = '#2d394b');
                        fileCard.style.borderColor = '#3498db';
                    };
                }

                assetsGrid.appendChild(fileCard);
            });
        };

        // =========================================================================
        // 📥 ЧАСТЬ 3: НАВИГАЦИЯ, ИМПОРТ ФАЙЛОВ И МОНТИРОВАНИЕ ОВЕРЛЕЯ В DOM
        // =========================================================================

        // Обработчик кнопки "Up" (Подняться на один уровень выше по дереву папок)
        upBtn.onclick = () => {
            if (this.currentDirectory === 'assets') return; // Выше корня подняться нельзя

            const parts = this.currentDirectory.split('/');
            parts.pop(); // Отрезаем имя последней подпапки
            this.currentDirectory = parts.join('/');

            refreshFileBrowser(); // Перерендериваем сетку для нового уровня
        };

        // Событие отправки нового файла с диска ПК прямо в текущую директорию проводника
        fileInput.onchange = async () => {
            if (fileInput.files.length > 0) {
                const uploadedFile = fileInput.files[0];
                uploadBtn.textContent = '⌛ Загрузка...';
                uploadBtn.disabled = true;

                try {
                    // 🚀 Передаем текущий глубокий путь проводника в качестве категории!
                    // Файл запишется в твою indexedDB resources ровно туда, где ты сейчас стоишь
                    await AppState.engine.AssetGalleryManager.uploadLocalFile(uploadedFile, this.currentDirectory);

                    // Мгновенно обновляем браузер файлов, чтобы новая картинка появилась в сетке
                    refreshFileBrowser();
                } catch (err) {
                    console.error('[AssetManager] Ошибка импорта файла в resources:', err);
                    alert('Ошибка сохранения файла в IndexedDB resources');
                }

                uploadBtn.textContent = currentLang === 'ru' ? '📥 Загрузить файл сюда' : '📥 Upload File Here';
                uploadBtn.disabled = false;
                fileInput.value = ''; // Сбрасываем инпут
            }
        };

        // Запускаем первичный цикл сканирования и рендеринга проводника
        refreshFileBrowser();

        // Монтируем готовое модальное окно на страницу админки редактора
        document.body.appendChild(overlay);
    }

    /**
     * ❌ ЗАКРЫТИЕ ОКНА ГАЛЕРЕИ ИЗ DOM ДЕРЕВА БРАУЗЕРА
     */
    closeGalleryModal() {
        const oldModal = document.getElementById('asset-gallery-modal');
        if (oldModal) oldModal.remove();
        this.modalElement = null;
    }

    /**
     * 📦 МАСШТАБНЫЙ БЭКАП: ЭКСПОРТ ВСЕЙ ГАЛЕРЕИ INDEXEDDB В ZIP-АРХИВ
     * Вытаскивает все бинарники из таблицы 'resources' и пакует с сохранением вложенности папок
     */
    async exportGalleryToZip() {
        if (!window.JSZip) {
            alert('Библиотека JSZip не подключена! Добавьте CDN-скрипт в head.');
            return;
        }

        console.log('[AssetManager] Запуск каскадной сборки ZIP-архива ресурсов...');
        const zip = new window.JSZip();

        // 1. Инициализируем твою нативную базу данных
        const db = await this._initDB();

        return new Promise((resolve) => {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');

            // Запрашиваем абсолютно все ключи-пути и сами Blob-файлы из твоей таблицы ресурсов
            // Используем openCursor, чтобы не перегружать оперативную память смартфона при больших объемах
            const cursorRequest = store.openCursor();
            let packedFilesCount = 0;

            cursorRequest.onsuccess = async (e) => {
                const cursor = e.target.result;

                if (cursor) {
                    const urlPath = cursor.key; // Например, "./assets/images/heroes/fullheight/lizzy.png"
                    const blobData = cursor.value; // Живой бинарный Blob из IndexedDB

                    // Проверяем файл по твоей регулярке разрешенных расширений, игнорируя системные маркеры .keep
                    if (typeof urlPath === 'string' && this.allowedExtensions.test(urlPath) && !urlPath.endsWith('.keep')) {

                        // Нормализуем путь для ZIP-архива: убираем стартовые "./" или "assets/",
                        // чтобы внутри архива не плодилась мусорная корневая папка
                        const zipInternalPath = urlPath.replace(/^\.\/?assets\//i, '').replace(/^assets\//i, '');

                        // 🚀 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Передаем Blob напрямую в JSZip!
                        // Библиотека сама автоматически создаст всю цепочку вложенных подпапок на основе слешей в пути
                        zip.file(zipInternalPath, blobData);
                        packedFilesCount++;
                    }

                    cursor.continue(); // Переходим к следующему файлу в IndexedDB
                } else {
                    // КУРСОР ЗАВЕРШИЛ СКАНИРОВАНИЕ БАЗЫ — СБОРКА АРХИВА
                    if (packedFilesCount === 0) {
                        alert(AppState.game_settings?.language === 'ru' ? 'В кэше ресурсов нет подходящих файлов для экспорта.' : 'No asset files found in cache to export.');
                        resolve(false);
                        return;
                    }

                    console.log(`[AssetManager] Скан базы завершен. Упаковывается файлов: ${packedFilesCount}. Генерируем архив...`);

                    // Асинхронно сжимаем все файлы в один монолитный Blob-архив
                    zip.generateAsync({ type: 'blob' }).then((content) => {
                        // Создаем скрытую ссылку в DOM для автоматического скачивания файла на ПК
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(content);

                        // Имя архива привязываем к ID текущего проекта Game.gameId
                        const gameProjectName = window.Game?.gameId || 'twa_game';
                        link.download = `${gameProjectName}_assets_backup_${Date.now()}.zip`;

                        document.body.appendChild(link);
                        link.click(); // Симулируем клик — браузер начнет скачивание архива
                        link.remove(); // Чистим DOM

                        console.log(`[AssetManager] ZIP-архив успешно собран и скачан.`);
                        resolve(true);
                    });
                }
            };

            cursorRequest.onerror = (err) => {
                console.error('[AssetManager] Критическая ошибка сборки ZIP:', err);
                resolve(false);
            };
        });
    }

    getAssetUrl(pathOrId) {
        if (!pathOrId) return ''; // Возвращаем пустоту, если поле не заполнено

        // Если это старый захардкоженный путь — возвращаем его без изменений
        if (pathOrId.startsWith('./') || pathOrId.includes('/')) {
            return pathOrId;
        }

        // Если это ID ассета — ищем его в оперативной памяти галереи и берем готовый blobUrl
        const cachedAsset = AppState.assetGallery?.[pathOrId];
        if (cachedAsset && cachedAsset.blobUrl) {
            return cachedAsset.blobUrl;
        }

        // Фолбэк: если ничего не совпало, возвращаем исходную строку
        return pathOrId;
    }
}

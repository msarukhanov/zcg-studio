import { AppState } from '../shared/GameState.js';

export class CatalogManager {
    constructor() {
        this.currentCatalogKey = null; // Текущий активный каталог (например, 'provinces')
        this.modalElement = null;

        // Список всех поддерживаемых каталогов для верхнего переключателя режимов

        this.availableCatalogs = [
            { key: 'ConfigTerrain', nameRu: '🌲 Ландшафты', nameEn: '🌲 Terrain' },
            { key: 'provinces', nameRu: '🏛️ Провинции', nameEn: '🏛️ Provinces' },
            { key: 'regions', nameRu: '🗺️ Регионы', nameEn: '🗺️ Regions' },
            { key: 'objects', nameRu: '🏰 Объекты', nameEn: '🏰 Objects' },
            { key: 'characters', nameRu: '👥 Персонажи', nameEn: '👥 Characters' },
            { key: 'factions', nameRu: '👥 Фракции', nameEn: '👥 Factions' },
        ];

        this.catalogSelectMap = {
            'faction': 'factions',   // Ключ 'faction' потянет выпадающий список из AppState.factions
            'region': 'regions',     // Ключ 'region' потянет выпадающий список из AppState.regions
            'province': 'provinces',  // 🚀 Пример расширения: ключ 'province' теперь ТОЖЕ станет селектом!

            'leaderCharId': 'characters', // Свяжет поле лидера фракции со списком всех персонажей в базе
            'type': 'ConfigTerrain'
        };
    }

    /**
     * 🛠️ 1. ЯДРО МУТАЦИИ ДАННЫХ (CRUD)
     */
    addElement(catalogKey, itemChanges) {
        if (!AppState[catalogKey]) AppState[catalogKey] = {};
        const newId = itemChanges.id ? itemChanges.id.trim() : `new_item_${Date.now()}`;

        AppState[catalogKey][newId] = this._deepCopy(itemChanges);
        AppState[catalogKey][newId].id = newId; // Гарантируем равенство ключа и ID
        console.log(`[Catalog] Добавлен элемент в ${catalogKey}:`, AppState[catalogKey][newId]);
        this._triggerGlobalUpdates();
    }

    updateElement(catalogKey, itemId, itemChanges) {
        if (!AppState[catalogKey] || !AppState[catalogKey][itemId]) return;

        if (itemChanges.id && itemChanges.id !== itemId) {
            delete AppState[catalogKey][itemId];
            this.addElement(catalogKey, itemChanges);
        } else {
            AppState[catalogKey][itemId] = this._deepMerge(AppState[catalogKey][itemId], itemChanges);
            console.log(`[Catalog] Обновлен элемент в ${catalogKey} [${itemId}]:`, AppState[catalogKey][itemId]);
            this._triggerGlobalUpdates();
        }
    }

    deleteElement(catalogKey, itemId) {
        if (!AppState[catalogKey] || !AppState[catalogKey][itemId]) return;
        delete AppState[catalogKey][itemId];
        console.log(`[Catalog] Удален элемент из ${catalogKey} [${itemId}]`);
        this._triggerGlobalUpdates();
    }

    /**
     * 🖥️ 2. АВТОГЕНЕРАЦИЯ МОДАЛЬНОГО ОКНА ИНТЕРФЕЙСА С ВЕРХНИМ ТАБ-БАРOM
     */
    openCatalogModal(catalogKey) {
        this.currentCatalogKey = catalogKey;
        const currentLang = AppState.game_settings?.language || 'en';

        // Ищем старый оверлей, если он уже открыт — не пересоздаём body, а просто чистим доску внутри
        let overlay = document.getElementById('catalog-editor-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'catalog-editor-modal';
            overlay.style.pointerEvents = 'auto';
            Object.assign(overlay.style, {
                position: 'absolute', inset: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(7, 10, 15, 0.95)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
            });
            document.body.appendChild(overlay);

            // Фиксированный крестик закрытия модалки поверх всего

        }
        overlay.innerHTML = ''; // Сносим старое содержимое при переключении режима

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10000'
        });
        closeBtn.onclick = () => { overlay.remove(); this.modalElement = null; };
        overlay.appendChild(closeBtn);

        this.modalElement = overlay;

        // Корневая доска
        const board = document.createElement('div');
        Object.assign(board.style, {
            width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', boxSizing: 'border-box', overflow: 'hidden'
        });
        overlay.appendChild(board);

        // =========================================================================
        // 🔄 2.1. ВЕРХНИЙ ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ КАТАЛОГА (ТАБ-БАР)
        // =========================================================================
        const tabBar = document.createElement('div');
        Object.assign(tabBar.style, {
            width: '100%', padding: '12px 20px', backgroundColor: '#161d2a',
            borderBottom: '1px solid #232d38', display: 'flex', gap: '10px', boxSizing: 'border-box'
        });
        board.appendChild(tabBar);

        this.availableCatalogs.forEach(cat => {
            const tabBtn = document.createElement('button');
            tabBtn.textContent = currentLang === 'ru' ? cat.nameRu : cat.nameEn;

            const isActive = cat.key === this.currentCatalogKey;
            Object.assign(tabBtn.style, {
                padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: isActive ? '#3498db' : '#1b2432',
                border: isActive ? '1px solid #5faee3' : '1px solid #2d394b',
                borderRadius: '4px', color: '#fff', transition: 'background-color 0.15s'
            });

            // На ходу переключаем категорию каталога без перезакрытия модалки!
            tabBtn.onclick = () => this.openCatalogModal(cat.key);
            tabBar.appendChild(tabBtn);
        });

        // Контейнер для двух колонок (Список + Форма) под таб-баром
        const workspace = document.createElement('div');
        Object.assign(workspace.style, { display: 'flex', width: '100%', flex: '1', overflow: 'hidden' });
        board.appendChild(workspace);

        // ЛЕВАЯ КОЛОНКА: Список элементов
        const leftPanel = document.createElement('div');
        Object.assign(leftPanel.style, {
            width: '30%', borderRight: '1px solid #232d38', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box'
        });
        workspace.appendChild(leftPanel);

        const scrollList = document.createElement('div');
        Object.assign(scrollList.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
        leftPanel.appendChild(scrollList);

        // ПРАВАЯ КОЛОНКА: Форма динамического редактирования
        const rightPanel = document.createElement('div');
        Object.assign(rightPanel.style, {
            width: '70%', padding: '20px', display: 'flex', flexDirection: 'column',
            gap: '15px', boxSizing: 'border-box', overflowY: 'auto'
        });
        workspace.appendChild(rightPanel);

        // Функция обновления списка слева
        const refreshList = () => {
            scrollList.innerHTML = '';
            const items = AppState[this.currentCatalogKey] || {};

            Object.keys(items).forEach(id => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                    borderRadius: '4px', color: '#fff', fontSize: '13px', cursor: 'pointer',
                    fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                });
                row.textContent = items[id].name || id;

                const delIcon = document.createElement('span');
                delIcon.innerHTML = '🗑️';
                delIcon.style.cursor = 'pointer';
                delIcon.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(currentLang === 'ru' ? `Удалить ${id}?` : `Delete ${id}?`)) {
                        this.deleteElement(this.currentCatalogKey, id);
                        refreshList();
                        rightPanel.innerHTML = '';
                    }
                };
                row.appendChild(delIcon);

                row.onclick = () => {
                    this._renderForm(rightPanel, this.currentCatalogKey, id, items[id], refreshList);
                };
                scrollList.appendChild(row);
            });
        };

        // Кнопка "Добавить Новый" внизу списка
        const addBtn = document.createElement('button');
        addBtn.textContent = currentLang === 'ru' ? '➕ Добавить новую запись' : '➕ Add New Item';
        Object.assign(addBtn.style, {
            width: '100%', padding: '12px', backgroundColor: '#2ea44f', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginTop: 'auto'
        });
        addBtn.onclick = () => {
            const template = this._generateTemplateFromCatalog(this.currentCatalogKey);
            this._renderForm(rightPanel, this.currentCatalogKey, null, template, refreshList);
        };
        leftPanel.appendChild(addBtn);

        refreshList();
    }

    /**
     * 🪵 3. РЕНДЕР ФОРМЫ С АВТОМАТИЧЕСКИМИ SELECT-ИНПУТАМИ ДЛЯ СВЯЗАННЫХ ПОЛЕЙ
     */
    _renderForm(targetContainer, catalogKey, itemId, itemData, onSaveCallback) {
        targetContainer.innerHTML = '';
        const currentLang = AppState.game_settings?.language || 'en';

        const formTitle = document.createElement('h3');
        formTitle.textContent = itemId ? `${currentLang === 'ru' ? 'Редактирование:' : 'Editing:'} ${itemId}` : (currentLang === 'ru' ? 'Новая запись' : 'New Item');
        formTitle.style.cssText = 'color:#fff; margin:0 0 10px 0; font-size:15px;';
        targetContainer.appendChild(formTitle);

        const formFieldsRegistry = [];

        const formWrapper = document.createElement('div');
        Object.assign(formWrapper.style, { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' });

        // const buildFieldsInputs = (obj, parentPath = [], containerElement = formWrapper) => {
        //     Object.entries(obj).forEach(([key, value]) => {
        //         const currentPath = [...parentPath, key];
        //         const pathString = currentPath.join('.');
        //
        //         const row = document.createElement('div');
        //         Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' });
        //
        //         const label = document.createElement('label');
        //         label.textContent = pathString.toUpperCase();
        //         label.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace;';
        //         row.appendChild(label);
        //
        //         // А. Логика для вложенных объектов
        //         if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        //             const groupWrapper = document.createElement('div');
        //             Object.assign(groupWrapper.style, {
        //                 padding: '10px 15px', borderLeft: '2px solid #34495e',
        //                 backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px'
        //             });
        //             row.appendChild(groupWrapper);
        //             buildFieldsInputs(value, currentPath, groupWrapper);
        //         }
        //         // Б. 🌟 ЗАЩИЩЁННЫЙ ВЫПАДАЮЩИЙ СПИСОК (SELECT) ДЛЯ СВЯЗАННЫХ КЛЮЧЕЙ 'faction' ИЛИ 'region'
        //         // Б. 🌟 УНИВЕРСАЛЬНЫЙ ДИНАМИЧЕСКИЙ СЕЛЕКТ БЕЗ ХАРДКОДА ПО КАРТЕ МАППИНГА
        //         else if (this.catalogSelectMap && this.catalogSelectMap[key]) {
        //             const select = document.createElement('select');
        //             Object.assign(select.style, {
        //                 padding: '8px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
        //                 borderRadius: '4px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
        //             });
        //
        //             // Автоматически добавляем пустую дефолтную строку
        //             const optEmpty = document.createElement('option');
        //             optEmpty.value = '';
        //             optEmpty.textContent = currentLang === 'ru' ? '— Нейтрально / Пусто —' : '— Neutral / None —';
        //             select.appendChild(optEmpty);
        //
        //             // Динамически определяем имя источника данных в AppState (factions, regions, provinces и т.д.)
        //             const sourceDataKey = this.catalogSelectMap[key];
        //             const availableItems = AppState[sourceDataKey] || {};
        //
        //             // Заполняем выпадающий список на основе актуальных ключей из базы данных
        //             Object.keys(availableItems).forEach(sourceId => {
        //                 const opt = document.createElement('option');
        //                 opt.value = sourceId;
        //                 opt.textContent = availableItems[sourceId].name ? `${availableItems[sourceId].name} (${sourceId})` : sourceId;
        //                 if (sourceId === value) opt.selected = true;
        //                 select.appendChild(opt);
        //             });
        //
        //             row.appendChild(select);
        //             formFieldsRegistry.push({ path: currentPath, inputElement: select, originalType: 'string' });
        //         }
        //         // В. Логика для обычных текстовых полей
        //         else {
        //             const input = document.createElement('input');
        //             input.value = value !== undefined ? value : '';
        //             Object.assign(input.style, {
        //                 padding: '8px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
        //                 borderRadius: '4px', color: '#fff', fontSize: '13px', boxSizing: 'border-box'
        //             });
        //
        //             if (key === 'id' && itemId) {
        //                 input.disabled = true;
        //                 input.style.opacity = '0.5';
        //             }
        //
        //             row.appendChild(input);
        //             formFieldsRegistry.push({ path: currentPath, inputElement: input, originalType: typeof value });
        //         }
        //
        //         containerElement.appendChild(row);
        //     });
        // };
        //
        // buildFieldsInputs(itemData);

                // =========================================================================
        // 🚀 ИСПРАВЛЕННЫЙ РЕКУРСИВНЫЙ ДВИЖОК СБОРКИ ФОРМЫ С ИНТЕГРАЦИЕЙ ГАЛЕРЕИ
        // =========================================================================
        const buildFieldsInputs = (obj, parentPath = [], containerElement = formWrapper) => {
            Object.entries(obj).forEach(([key, value]) => {
                const currentPath = [...parentPath, key];
                const pathString = currentPath.join('.');

                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' });

                const label = document.createElement('label');
                label.textContent = pathString.toUpperCase();
                label.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace;';
                row.appendChild(label);

                // --- ЛОГИКА ОПРЕДЕЛЕНИЯ МЕДИА-ПОЛЕЙ ДЛЯ ГАЛЕРЕИ ---
                const lowerKey = key.toLowerCase();
                const isMediaKey = lowerKey.includes('image') ||
                                   lowerKey.includes('icon') ||
                                   lowerKey.includes('avatar') ||
                                   lowerKey.includes('bg') ||
                                   lowerKey.includes('backgroundImage') ||
                                   lowerKey.includes('audio') ||
                                   lowerKey.includes('sound') ||
                                   lowerKey.includes('music') ||
                                   lowerKey.includes('texture');



                // --- 🚀 ТОЧЕЧНЫЙ ДАТА-ДРИВЕН ФИКС: ПРОВЕРКА ПЕРВОГО ЭЛЕМЕНТА МАССИВА ---
                // Твоя регулярка расширений из AssetLoaderManager
                const extRegex = /\.(png|jpg|jpeg|webp|svg|glb|mp4|m4a|mov|webm|mp3|wav|ogg)(\?.*)?$/i;

                const isStringPath = typeof value === 'string' && extRegex.test(value.toLowerCase());

                // 1. Проверяем, является ли значение массивом, и является ли его ПЕРВЫЙ элемент медиа-файлом
                const isAssetArray = Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && extRegex.test(value[0].toLowerCase());

                // 2. Проверяем, пустой ли это массив, но имя ключа жестко намекает на анимацию/кадры (left, right, anim, frames)
                const isPossibleEmptyAssetArray = Array.isArray(value) && value.length === 0 &&
                    (lowerKey.includes('anim') || lowerKey.includes('frame') || lowerKey.includes('left') || lowerKey.includes('right') || lowerKey.includes('back') || lowerKey.includes('forw') || lowerKey.includes('track') || lowerKey.includes('audio'));


                // А. Логика для вложенных объектов
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const groupWrapper = document.createElement('div');
                    Object.assign(groupWrapper.style, {
                        padding: '10px 15px', borderLeft: '2px solid #34495e',
                        backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px'
                    });
                    row.appendChild(groupWrapper);
                    buildFieldsInputs(value, currentPath, groupWrapper);
                }
                // Б. ЗАЩИЩЁННЫЙ ВЫПАДАЮЩИЙ СПИСОК (SELECT) ДЛЯ СВЯЗАННЫХ КЛЮЧЕЙ
                else if (this.catalogSelectMap && this.catalogSelectMap[key]) {
                    const select = document.createElement('select');
                    Object.assign(select.style, {
                        padding: '8px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '4px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                    });

                    const optEmpty = document.createElement('option');
                    optEmpty.value = '';
                    optEmpty.textContent = currentLang === 'ru' ? '— Нейтрально / Пусто —' : '— Neutral / None —';
                    select.appendChild(optEmpty);

                    const sourceDataKey = this.catalogSelectMap[key];
                    const availableItems = AppState[sourceDataKey] || {};

                    Object.keys(availableItems).forEach(sourceId => {
                        const opt = document.createElement('option');
                        opt.value = sourceId;
                        opt.textContent = availableItems[sourceId].name ? `${availableItems[sourceId].name} (${sourceId})` : sourceId;
                        if (sourceId === value) opt.selected = true;
                        select.appendChild(opt);
                    });

                    row.appendChild(select);
                    formFieldsRegistry.push({ path: currentPath, inputElement: select, originalType: 'string' });
                }
                // В-1. 📜 ЛОГИКА ДЛЯ МАССИВОВ КАРТИНОК / АНИМАЦИЙ / ЗВУКОВ ЛЮБОЙ ДЛИНЫ
                else if (isAssetArray || isPossibleEmptyAssetArray) {
                    const arrayContainer = document.createElement('div');
                    Object.assign(arrayContainer.style, {
                        width: '100%', border: '1px dashed #2d394b', borderRadius: '4px', padding: '10px',
                        backgroundColor: 'rgba(20,26,39,0.2)', display: 'flex', flexDirection: 'column', gap: '6px', boxSizing: 'border-box'
                    });

                    // Контейнер под живой интерактивный список строк-кадров
                    const rowsList = document.createElement('div');
                    Object.assign(rowsList.style, { display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' });
                    arrayContainer.appendChild(rowsList);

                    // Метод динамического ререндера элементов внутри массива
                    const refreshArrayRowsUI = () => {
                        rowsList.innerHTML = '';

                        value.forEach((pathString, index) => {
                            const itemRow = document.createElement('div');
                            Object.assign(itemRow.style, {
                                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                backgroundColor: '#111622', padding: '4px 8px', borderRadius: '4px', border: '1px solid #1b2432', boxSizing: 'border-box'
                            });

                            // Визуальный индекс кадра, [1]
                            const idx = document.createElement('span');
                            idx.textContent = `[${index}]`;
                            idx.style.cssText = 'color:#6a737d; font-size:10px; font-family:monospace;';
                            itemRow.appendChild(idx);

                            // Крошечный квадрат-превью
                            const miniPreview = document.createElement('div');
                            Object.assign(miniPreview.style, {
                                width: '28px', height: '26px', backgroundColor: '#090d14', borderRadius: '2px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: '0'
                            });

                            const liveUrl = AppState.engine?.AssetManager ? AppState.engine.AssetManager.getAssetUrl(pathString) : pathString;
                            if (/\.(png|jpg|jpeg|webp|svg)/i.test(pathString.toLowerCase())) {
                                miniPreview.innerHTML = `<img src="${liveUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
                            } else {
                                miniPreview.innerHTML = '<span style="font-size:12px;">🎵</span>';
                            }
                            itemRow.appendChild(miniPreview);

                            // 🥷 СКРЫТЫЙ ИНПУТ: Даем ему точный индексный путь, например: "animations.idle.left.0"
                            const hiddenInput = document.createElement('input');
                            hiddenInput.type = 'hidden';
                            hiddenInput.value = pathString;
                            itemRow.appendChild(hiddenInput);

                            // Текст пути кадра. Клик по нему вызывает перезапись из галереи
                            const pathLabel = document.createElement('span');
                            pathLabel.textContent = pathString || '— [Empty Element] —';
                            pathLabel.style.cssText = 'color:#fff; font-size:11px; font-family:monospace; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;';

                            pathLabel.onclick = () => {
                                if (AppState.engine?.AssetManager) {
                                    AppState.engine.AssetManager.openGalleryModal((selectedPath) => {
                                        value[index] = selectedPath; // Переписываем строку в твоем itemData массиве
                                        hiddenInput.value = selectedPath; // Обновляем инпут для сохранения
                                        refreshArrayRowsUI(); // Локальный ререндер списка
                                    });
                                }
                            };
                            itemRow.appendChild(pathLabel);

                            // Кнопка быстрого удаления элемента из массива (✕)
                            const removeBtn = document.createElement('span');
                            removeBtn.innerHTML = '✕';
                            removeBtn.style.cssText = 'color:#e74c3c; font-size:12px; cursor:pointer; font-weight:bold; padding:0 4px;';
                            removeBtn.onclick = () => {
                                value.splice(index, 1); // Удаляем из оригинального массива по ссылке
                                refreshArrayRowsUI();
                            };
                            itemRow.appendChild(removeBtn);

                            rowsList.appendChild(itemRow);

                            // 🚀 СВЯЩЕННЫЙ РЕЕСТР: Регистрируем скрытый инпут кадра под его точным индексным путем!
                            formFieldsRegistry.push({ path: [...currentPath, index], inputElement: hiddenInput, originalType: 'string' });
                        });
                    };

                    // Кнопка добавления нового элемента в конец массива
                    const addBtn = document.createElement('button');
                    addBtn.textContent = '+ Add Element to Array';
                    Object.assign(addBtn.style, {
                        width: '100%', padding: '6px', backgroundColor: '#1b2432', color: '#2ea44f',
                        border: '1px dashed #2ea44f', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
                    });

                    addBtn.onclick = () => {
                        if (AppState.engine?.AssetManager) {
                            AppState.engine.AssetManager.openGalleryModal((selectedPath) => {
                                value.push(selectedPath); // Пушим в оригинальный массив по ссылке
                                refreshArrayRowsUI();
                            });
                        }
                    };
                    arrayContainer.appendChild(addBtn);

                    refreshArrayRowsUI();
                    row.appendChild(arrayContainer);
                }
                // В. 🔮 ИНТЕГРАЦИЯ: ОДИНОЧНЫЕ КАРТИНКИ ИЛИ ЗВУКИ С ВЫЗОВОМ ГАЛЕРЕИ (ASSET PICKER)
                // В-2. 🔮 ЛОГИКА ДЛЯ ОДИНОЧНЫХ КАРТИНКЕК / ЗВУКОВ / АССЕТОВ (ВЫЗОВ ГАЛЕРЕИ)
                else if (typeof value === 'string' && (isMediaKey || isStringPath)) {
                    // 1. Создаем интерактивный контейнер-карточку для превью
                    const pickerCard = document.createElement('div');
                    Object.assign(pickerCard.style, {
                        width: '100%', minHeight: '54px', backgroundColor: '#141a27', border: '1px solid #2d394b',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '12px',
                        boxSizing: 'border-box', cursor: 'pointer', transition: 'border-color 0.15s'
                    });
                    pickerCard.onmouseenter = () => pickerCard.style.borderColor = '#3498db';
                    pickerCard.onmouseleave = () => pickerCard.style.borderColor = '#2d394b';

                    // 2. Внутренний квадрат под вывод мини-картинки/иконки медиа
                    const mediaPreview = document.createElement('div');
                    Object.assign(mediaPreview.style, {
                        width: '40px', height: '40px', backgroundColor: '#090d14', borderRadius: '3px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: '0'
                    });
                    pickerCard.appendChild(mediaPreview);

                    // 3. Информационный текстовый блок пути
                    const pathInfo = document.createElement('div');
                    pathInfo.style.cssText = 'flex:1; overflow:hidden; display:flex; flex-direction:column; gap:2px;';

                    const pathText = document.createElement('div');
                    pathText.style.cssText = 'color:#fff; font-size:11px; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';

                    const actionHint = document.createElement('div');
                    actionHint.textContent = currentLang === 'ru' ? 'Кликните для выбора из галереи 🗂️' : 'Click to browse gallery 🗂️';
                    actionHint.style.cssText = 'color:#6a737d; font-size:9px; font-style:italic;';

                    pathInfo.appendChild(pathText);
                    pathInfo.appendChild(actionHint);
                    pickerCard.appendChild(pathInfo);

                    // 4. СКРЫТЫЙ ИНПУТ: Служит мостом для твоей системы сбора полей formFieldsRegistry
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.value = value !== undefined ? value : '';
                    pickerCard.appendChild(hiddenInput);

                    // Функция обновления визуала карточки на основе текущего пути
                    const refreshPreviewDisplay = (pathValue) => {
                        mediaPreview.innerHTML = '';
                        pathText.textContent = pathValue || '— [Empty] —';

                        if (!pathValue || pathValue.trim() === '') {
                            mediaPreview.innerHTML = '<span style="color:#4f5b66; font-size:14px;">❓</span>';
                            return;
                        }

                        const lowerVal = pathValue.toLowerCase();
                        // Берем blobUrl через AssetManager (твой лоадер), если это сгенерированный ID, или путь
                        const liveUrl = AppState.engine?.AssetManager ? AppState.engine.AssetManager.getAssetUrl(pathValue) : pathValue;

                        if (/\.(png|jpg|jpeg|webp|svg)/i.test(lowerVal)) {
                            mediaPreview.innerHTML = `<img src="${liveUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
                        } else if (/\.(mp3|wav|ogg|m4a|mp4|webm)/i.test(lowerVal)) {
                            mediaPreview.innerHTML = '<span style="font-size:16px;">🎵</span>';
                        } else {
                            mediaPreview.innerHTML = '<span style="font-size:16px;">📦</span>'; // Фолбэк для 3D моделей .glb
                        }
                    };

                    // НАЖАТИЕ НА КАРТОЧКУ — Открываем твой AssetManager в режиме Picker
                    pickerCard.onclick = () => {
                        if (AppState.engine?.AssetManager) {
                            AppState.engine.AssetManager.openGalleryModal((selectedPath) => {
                                hiddenInput.value = selectedPath; // Записываем выбранный путь в скрытый инпут
                                refreshPreviewDisplay(selectedPath); // Перерисовываем мини-превью в форме
                            });
                        } else {
                            alert('AssetManager не найден в AppState.engine');
                        }
                    };

                    refreshPreviewDisplay(value);
                    row.appendChild(pickerCard);

                    // 🚀 СВЯЩЕННЫЙ РЕЕСТР: Регистрируем скрытый инпут под точным глубоким путем поля!
                    formFieldsRegistry.push({ path: currentPath, inputElement: hiddenInput, originalType: 'string' });
                }
                // Г. Логика для обычных текстовых полей, чисел и массивов (Твой родной код)
                else {
                    const input = document.createElement('input');
                    input.value = value !== undefined ? value : '';

                    if (key === 'id' && itemId) {
                        input.disabled = true;
                        input.style.opacity = '0.5';
                    }

                    row.appendChild(input);
                    formFieldsRegistry.push({ path: currentPath, inputElement: input, originalType: typeof value });
                }containerElement.appendChild(row);
            });
        };
        buildFieldsInputs(itemData);
        targetContainer.appendChild(formWrapper);

        // Кнопка СОХРАНИТЬ
        const saveBtn = document.createElement('button');
        saveBtn.textContent = currentLang === 'ru' ? '💾 Сохранить изменения' : '💾 Save Changes';
        Object.assign(saveBtn.style, {
            width: '100%', padding: '12px', backgroundColor: '#3498db', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '20px'
        });

        saveBtn.onclick = () => {
            const compiledData = {};

            formFieldsRegistry.forEach(field => {
                let rawValue = field.inputElement.value;
                let typedValue = rawValue;
                if (field.originalType === 'number') {
                    typedValue = rawValue === '' ? 0 : Number(rawValue);
                }
                this._setDeepValueByPath(compiledData, field.path, typedValue);
            });

            if (itemId) {
                this.updateElement(catalogKey, itemId, compiledData);
            } else {
                this.addElement(catalogKey, compiledData);
            }

            onSaveCallback();
            targetContainer.innerHTML = `<div style="color:#2ea44f; margin-top:20px; font-weight:bold; font-size:14px; text-align:center;">✓ Успешно сохранено!</div>`;
        };
        targetContainer.appendChild(saveBtn);
    }

    /**
     * 🧩 4. ВНУТРЕННИЕ ВСПОМОГАТЕЛЬНЫЕ СИСТЕМНЫЕ МЕТОДЫ
     */
    _generateTemplateFromCatalog(catalogKey) {
        const catalog = AppState[catalogKey];
        if (!catalog) return { id: '', name: '' };

        const firstEntry = Object.values(catalog)[0];
        if (!firstEntry) return { id: '', name: '' };

        const createEmptyClone = (obj) => {
            const emptyObj = {};
            Object.keys(obj).forEach(key => {
                if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    emptyObj[key] = createEmptyClone(obj[key]);
                } else {
                    emptyObj[key] = typeof obj[key] === 'number' ? 0 : '';
                }
            });
            return emptyObj;
        };

        return createEmptyClone(firstEntry);
    }

    _setDeepValueByPath(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    _triggerGlobalUpdates() {
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        if (window.renderMap) window.renderMap();
    }

    _deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

    _deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (target && typeof target === 'object' && source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object') {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this._deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
}


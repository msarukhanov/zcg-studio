import {AppState} from '../shared/GameState.js';

export class EditorWidgetFactory {
    /**
     * 🛠️ 1. ГЕНЕРАЦИЯ УНИВЕРСАЛЬНОГО МЕДИА-ИНПУТА (КАРТИНКА / ЗВУК)
     * @param {string} key - Имя ключа поля (например, 'image', 'icon', 'ambient')
     * @param {string} currentValue - Текущее текстовое значение пути (например, './assets/logo.png')
     * @param {Function} onChangeCallback - Колбэк, возвращающий новый путь при выборе из галереи
     * @returns {HTMLElement} - Готовый DOM-элемент интерактивного виджета
     */
    static createMediaPicker(key, currentValue, onChangeCallback) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginBottom: '10px',
            boxSizing: 'border-box'
        });

        // Метка с именем поля
        const label = document.createElement('label');
        label.textContent = key.toUpperCase();
        label.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; font-family:monospace;';
        container.appendChild(label);

        // Интерактивная карточка-превью
        const pickerCard = document.createElement('div');
        Object.assign(pickerCard.style, {
            width: '100%',
            minHeight: '60px',
            backgroundColor: '#141a27',
            border: '1px solid #2d394b',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            gap: '12px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            transition: 'border-color 0.15s'
        });
        pickerCard.onmouseenter = () => pickerCard.style.borderColor = '#3498db';
        pickerCard.onmouseleave = () => pickerCard.style.borderColor = '#2d394b';
        container.appendChild(pickerCard);

        // Внутренний контейнер для медиа (Картинка или Иконка звука)
        const mediaPreview = document.createElement('div');
        Object.assign(mediaPreview.style, {
            width: '50px',
            height: '50px',
            backgroundColor: '#090d14',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: '0'
        });
        pickerCard.appendChild(mediaPreview);

        // Текстовый блок с текущим путем файла
        const pathInfo = document.createElement('div');
        pathInfo.style.cssText = 'flex:1; overflow:hidden; display:flex; flex-direction:column; gap:2px;';

        const pathText = document.createElement('div');
        pathText.style.cssText = 'color:#fff; font-size:11px; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';

        const actionHint = document.createElement('div');
        actionHint.textContent = AppState.game_settings?.language === 'ru' ? 'Кликните для выбора из галереи 🗂️' : 'Click to select from gallery 🗂️';
        actionHint.style.cssText = 'color:#6a737d; font-size:10px; font-style:italic;';

        pathInfo.appendChild(pathText);
        pathInfo.appendChild(actionHint);
        pickerCard.appendChild(pathInfo);

        // Функция локального обновления мини-виджета при смене пути
        const updateWidgetView = (pathValue) => {
            mediaPreview.innerHTML = '';
            pathText.textContent = pathValue || '— [Empty]';

            if (!pathValue || pathValue.trim() === '') {
                mediaPreview.innerHTML = '<span style="color:#4f5b66; font-size:16px;">❓</span>';
                return;
            }

            const lower = pathValue.toLowerCase();
            // Получаем реальную blob-ссылку через твой AssetManager, если это ID, или оставляем путь
            const liveUrl = AppState.engine?.AssetManager ? AppState.engine.AssetManager.getAssetUrl(pathValue) : pathValue;

            if (/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(lower)) {
                mediaPreview.innerHTML = `<img src="${liveUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
            } else if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(lower)) {
                mediaPreview.innerHTML = '<span style="font-size:20px;">🎵</span>';
            } else if (/\.(mp4|webm|mov)(\?.*)?$/i.test(lower)) {
                mediaPreview.innerHTML = '<span style="font-size:20px;">🎬</span>';
            } else {
                mediaPreview.innerHTML = '<span style="font-size:20px;">📄</span>';
            }
        };

        // КЛИК ПО КАРТОЧКЕ — ВЫЗЫВАЕМ ТВОЙ АССЕТ-ПИ КЕР ИЗ ASSETMANAGER!
        pickerCard.onclick = () => {
            if (AppState.engine?.AssetManager) {
                // Открываем галерею, передавая колбэк обработки выбора файла
                AppState.engine.AssetManager.openGalleryModal((selectedPath) => {
                    updateWidgetView(selectedPath); // Обновляем мини-превью в форме
                    onChangeCallback(selectedPath); // Передаем измененное значение в CatalogManager стейт
                });
            } else {
                alert('AssetManager не инициализирован в AppState.engine');
            }
        };

        updateWidgetView(currentValue);
        return container;
    }

    /**
     * 📜 2. ГЕНЕРАЦИЯ ДИНАМИЧЕСКОГО СПИСКА ДЛЯ МАССИВОВ АССЕТОВ (НАПРИМЕР, КАДРЫ АНИМАЦИЙ)
     * @param {string} key - Имя ключа массива (например, 'left', 'forward')
     * @param {Array} currentArray - Текущий массив строк-путей из JSON
     * @param {Function} onArrayChangeCallback - Колбэк, возвращающий обновленный массив
     * @returns {HTMLElement} - Готовый DOM-блок списка с кнопкой добавления кадра
     */
    static createMediaArrayPicker(key, currentArray, onArrayChangeCallback) {
        const arr = Array.isArray(currentArray) ? [...currentArray] : [];

        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            width: '100%',
            border: '1px dashed #232d38',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '12px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(20,26,39,0.3)'
        });

        const title = document.createElement('div');
        title.textContent = `${key.toUpperCase()} (ARRAY ASSETS - ${arr.length})`;
        title.style.cssText = 'color:#3498db; font-size:10px; font-weight:bold; font-family:monospace; margin-bottom:8px; border-bottom:1px solid #232d38; padding-bottom:4px;';
        wrapper.appendChild(title);

        const listContainer = document.createElement('div');
        Object.assign(listContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            width: '100%'
        });
        wrapper.appendChild(listContainer);

        // Отрисовка строк массива кадров
        const renderArrayRows = () => {
            listContainer.innerHTML = '';

            arr.forEach((path, index) => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#111622',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    border: '1px solid #1b2432',
                    boxSizing: 'border-box'
                });

                // Индекс кадра
                const idxLabel = document.createElement('span');
                idxLabel.textContent = `[${index}]`;
                idxLabel.style.cssText = 'color:#6a737d; font-size:10px; font-family:monospace;';
                row.appendChild(idxLabel);

                // Мини-превьюшка кадра
                const miniPreview = document.createElement('div');
                Object.assign(miniPreview.style, {
                    width: '26px',
                    height: '26px',
                    backgroundColor: '#090d14',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: '0'
                });

                const liveUrl = AppState.engine?.AssetManager ? AppState.engine.AssetManager.getAssetUrl(path) : path;
                if (/\.(png|jpg|jpeg|webp|svg)/i.test(path.toLowerCase())) {
                    miniPreview.innerHTML = `<img src="${liveUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
                } else {
                    miniPreview.innerHTML = '<span style="font-size:11px;">📄</span>';
                }
                row.appendChild(miniPreview);

                // Строка пути кадра
                const pathLabel = document.createElement('span');
                pathLabel.textContent = path;
                pathLabel.style.cssText = 'color:#fff; font-size:10px; font-family:monospace; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;';

                // Клик по тексту пути позволяет ПЕРЕВЫБРАТЬ этот конкретный кадр из галереи
                pathLabel.onclick = () => {
                    if (AppState.engine?.AssetManager) {
                        AppState.engine.AssetManager.openGalleryModal((newPath) => {
                            arr[index] = newPath;
                            onArrayChangeCallback(arr);
                            renderArrayRows();
                        });
                    }
                };
                row.appendChild(pathLabel);

                // Кнопка удаления кадра из массива (✕)
                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '✕';
                removeBtn.style.cssText = 'color:#e74c3c; font-size:12px; cursor:pointer; font-weight:bold; padding:0 4px;';
                removeBtn.onclick = () => {
                    arr.splice(index, 1); // Удаляем кадр из локального массива
                    onArrayChangeCallback(arr); // Передаем наверх в стейт
                    renderArrayRows(); // Локальный перерендер строк
                };
                row.appendChild(removeBtn);

                listContainer.appendChild(row);
            });
        };

        // Кнопка "+ Добавить кадр/ресурс" в конец массива
        const addFrameBtn = document.createElement('button');
        addFrameBtn.textContent = '+ Add Array Element';
        Object.assign(addFrameBtn.style, {
            width: '100%',
            padding: '6px',
            backgroundColor: '#1b2432',
            color: '#2ea44f',
            border: '1px dashed #2ea44f',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            marginTop: '8px'
        });
        addFrameBtn.onclick = () => {
            if (AppState.engine?.AssetManager) {
                AppState.engine.AssetManager.openGalleryModal((newPath) => {
                    arr.push(newPath);
                    onArrayChangeCallback(arr);
                    renderArrayRows();
                });
            }
        };
        wrapper.appendChild(addFrameBtn);
        renderArrayRows();
        return wrapper;
    }
}
import { AppState } from '../shared/GameState.js';

export class ScreenEditor {
    constructor() {
        this.currentScreenId = null;  // Текущий редактируемый экран (например, 'main_menu')
        this.currentWidgetId = null;  // Текущий редактируемый виджет внутри экрана
        this.modalElement = null;

        this.availableActions = [
            { id: '', nameRu: '— Нет действия / Заглушка —', nameEn: '— No Action / Dummy —' },
            { id: 'new_game', nameRu: '🚀 Новая Игра (new_game)', nameEn: '🚀 New Game (new_game)' },
            { id: 'load_game', nameRu: '💾 Загрузить Игру (load_game)', nameEn: '💾 Load Game (load_game)' },
            { id: 'open_faction_screen', nameRu: '🏛️ Экран Фракции (open_faction_screen)', nameEn: '🏛️ Faction Screen (open_faction_screen)' },
            { id: 'open_diplomacy_screen', nameRu: '🤝 Экран Дипломатии (open_diplomacy_screen)', nameEn: '🤝 Diplomacy Screen (open_diplomacy_screen)' },
            { id: 'open_character_screen', nameRu: '👤 Экран Персонажа (open_character_screen)', nameEn: '👤 Character Screen (open_character_screen)' }
        ];
    }

    /**
     * 🖥️ 1. ГЕНЕРАЦИЯ ГЛАВНОГО ОКНА РЕДАКТОРА ИНТЕРФЕЙСОВ
     */
    openEditorModal() {
        this._removeExistingModal();
        const currentLang = AppState.game_settings?.language || 'en';

        // Инициализируем ветку UI в AppState, если её вдруг нет
        if (!AppState.ui) AppState.ui = {};
        if (!AppState.ui.landscape) AppState.ui.landscape = [];

        // Корневой оверлей модалки
        const overlay = document.createElement('div');
        overlay.id = 'screen-editor-modal';
        overlay.style.pointerEvents = 'auto';
        Object.assign(overlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 8, 12, 0.97)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
        });
        this.modalElement = overlay;

        // Фиксированный круглый крестик закрытия
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10000'
        });
        closeBtn.onclick = () => this._removeExistingModal();
        overlay.appendChild(closeBtn);

        // Главная доска редактора (Трехпанельная: Экраны -> Виджеты -> Форма)
        const board = document.createElement('div');
        Object.assign(board.style, {
            width: '95%', maxWidth: '1200px', height: '95vh', // 🌟 Растягиваем на всю высоту
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column', // 🚀 СТРОГИЙ ФИКС: Выстраиваем верх и низ вертикально!
            position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', overflow: 'hidden'
        });
        overlay.appendChild(board);

        const topHalf = document.createElement('div');
        Object.assign(topHalf.style, {
            width: '100%', height: '50%', display: 'flex', borderBottom: '2px solid #232d38', boxSizing: 'border-box'
        });
        board.appendChild(topHalf);

        // ПАНЕЛЬ 1 (Левая, 25%): Список Экранов
        const screensPanel = document.createElement('div');
        Object.assign(screensPanel.style, { width: '25%', borderRight: '1px solid #232d38', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' });


        const scrTitle = document.createElement('h4');
        scrTitle.textContent = currentLang === 'ru' ? '🖥️ ЭКРАНЫ' : '🖥️ SCREENS';
        scrTitle.style.cssText = 'color:#ffd166; margin:0; font-size:12px; letter-spacing:1px; font-weight:bold;';
        screensPanel.appendChild(scrTitle);

        const screensScroll = document.createElement('div');
        Object.assign(screensScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
        screensPanel.appendChild(screensScroll);

        // ПАНЕЛЬ 2 (Средняя, 25%): Список Виджетов текущего экрана
        const widgetsPanel = document.createElement('div');
        Object.assign(widgetsPanel.style, { width: '25%', borderRight: '1px solid #232d38', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', backgroundColor: '#141a27' });


        const widTitle = document.createElement('h4');
        widTitle.textContent = currentLang === 'ru' ? '🧩 ВИДЖЕТЫ ЭКРАНА' : '🧩 SCREEN WIDGETS';
        widTitle.style.cssText = 'color:#3498db; margin:0; font-size:12px; letter-spacing:1px; font-weight:bold;';
        widgetsPanel.appendChild(widTitle);

        const widgetsScroll = document.createElement('div');
        widgetsScroll.id = 'widgetsScroll';
        Object.assign(widgetsScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
        widgetsPanel.appendChild(widgetsScroll);

        // ПАНЕЛЬ 3 (Правая, 50%): Динамическая форма параметров (поля верстки и стилей)
        const formPanel = document.createElement('div');
        Object.assign(formPanel.style, { width: '50%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', boxSizing: 'border-box', overflowY: 'auto' });


        // Вспомогательный метод обновления средней панели (Виджетов)
        const refreshWidgetsList = (screenObj) => {
            widgetsScroll.innerHTML = '';
            if (!screenObj || !screenObj.widgets) return;

            screenObj.widgets.forEach((widget, wIdx) => {
                const wRow = document.createElement('div');
                Object.assign(wRow.style, {
                    padding: '8px 10px', backgroundColor: widget.id === this.currentWidgetId ? '#232d38' : '#1b2432',
                    border: widget.id === this.currentWidgetId ? '1px solid #34495e' : '1px solid #2d394b',
                    borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                });
                wRow.textContent = `${widget.id} (${widget.type})`;

                // Кнопка удаления виджета
                const delWid = document.createElement('span');
                delWid.innerHTML = '🗑️';
                delWid.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(currentLang === 'ru' ? 'Удалить этот виджет?' : 'Delete this widget?')) {
                        screenObj.widgets.splice(wIdx, 1);
                        refreshWidgetsList(screenObj);
                        formPanel.innerHTML = '';
                        this._triggerGlobalUpdates();
                    }
                };
                wRow.appendChild(delWid);

                wRow.onclick = () => {
                    this.currentWidgetId = widget.id;
                    refreshWidgetsList(screenObj);
                    this._renderDynamicForm(formPanel, widget, () => {
                        refreshWidgetsList(screenObj);
                    });
                };
                widgetsScroll.appendChild(wRow);
            });
        };

        // Функция обновления левой панели (Экранов)
        const refreshScreensList = () => {
            screensScroll.innerHTML = '';
            AppState.ui.landscape.forEach((screen, sIdx) => {
                const sRow = document.createElement('div');
                Object.assign(sRow.style, {
                    padding: '10px', backgroundColor: screen.id === this.currentScreenId ? '#232d38' : '#1b2432',
                    border: screen.id === this.currentScreenId ? '1px solid #34495e' : '1px solid #2d394b',
                    borderRadius: '4px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold'
                });
                sRow.textContent = screen.id;

                // Кнопка удаления экрана целиком
                const delScr = document.createElement('span');
                delScr.innerHTML = '🗑️';
                delScr.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(currentLang === 'ru' ? `Удалить экран ${screen.id}?` : `Delete screen ${screen.id}?`)) {
                        AppState.ui.landscape.splice(sIdx, 1);
                        this.currentScreenId = null;
                        this.currentWidgetId = null;
                        refreshScreensList();
                        widgetsScroll.innerHTML = '';
                        formPanel.innerHTML = '';
                        this._triggerGlobalUpdates();
                    }
                };
                sRow.appendChild(delScr);

                sRow.onclick = () => {
                    this.currentScreenId = screen.id;
                    this.currentWidgetId = null;
                    refreshScreensList();

                    // При клике на экран по дефолту открываем форму редактирования САМОГО экрана (его фоны, размеры)
                    this._renderDynamicForm(formPanel, screen, () => {
                        refreshScreensList();
                    });

                    // И подгружаем список его внутренних кнопок/элементов в центр
                    refreshWidgetsList(screen);
                    this.renderEmulatorLivePreview();
                };
                screensScroll.appendChild(sRow);
            });
        };

        // Кнопка "➕ Новый Экран" внизу левой панели
        const addScrBtn = document.createElement('button');
        addScrBtn.textContent = currentLang === 'ru' ? '➕ Создать Экран' : '➕ Create Screen';
        Object.assign(addScrBtn.style, { width: '100%', padding: '10px', backgroundColor: '#2ea44f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' });
        addScrBtn.onclick = () => {
            const newScreen = { id: `screen_${Date.now()}`, backgroundImage: '', bg_width: 1200, scrollable: false, active_width: 1000, widgets: [] };
            AppState.ui.landscape.push(newScreen);
            this.currentScreenId = newScreen.id;
            refreshScreensList();
            this._renderDynamicForm(formPanel, newScreen, () => refreshScreensList());
            refreshWidgetsList(newScreen);
            this._triggerGlobalUpdates();
        };
        screensPanel.appendChild(addScrBtn);

        // Кнопка "➕ Новый Виджет" внизу средней панели
        const addWidBtn = document.createElement('button');
        addWidBtn.textContent = currentLang === 'ru' ? '➕ Создать Виджет' : '➕ Create Widget';
        Object.assign(addWidBtn.style, { width: '100%', padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' });
        addWidBtn.onclick = () => {
            const screenObj = AppState.ui.landscape.find(s => s.id === this.currentScreenId);
            if (!screenObj) {
                alert(currentLang === 'ru' ? 'Сначала выберите экран слева!' : 'Select a screen first!');
                return;
            }
            const newWidget = {
                id: `btn_${Date.now()}`, type: 'button', label_loc_key: '', action: '',
                layout: { top: '50px', left: '50px', width: '120px', height: '40px', textColor: '#ffffff', textSize: '14px', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #fff', borderRadius: '4px' }
            };
            if (!screenObj.widgets) screenObj.widgets = [];
            screenObj.widgets.push(newWidget);
            this.currentWidgetId = newWidget.id;
            refreshWidgetsList(screenObj);
            this._renderDynamicForm(formPanel, newWidget, () => refreshWidgetsList(screenObj));
            this._triggerGlobalUpdates();
        };
        widgetsPanel.appendChild(addWidBtn);

        // Инициализируем отрисовку списков при открытии
        refreshScreensList();

        topHalf.appendChild(screensPanel);
        topHalf.appendChild(widgetsPanel);
        topHalf.appendChild(formPanel);
        // =========================================================================
        // 📺 ТОЧЕЧНЫЙ ФИКС: РЕАЛТАЙМ ЭМУЛЯТОР ИНТЕРФЕЙСА (Снизу)
        // =========================================================================
        const bottomHalf = document.createElement('div');
        Object.assign(bottomHalf.style, {
            width: '100%', height: '50%', backgroundColor: '#090d14', padding: '15px',
            boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative'
        });
        board.appendChild(bottomHalf);

        // const emuViewport = document.createElement('div');
        // emuViewport.id = 'emulator-viewport-canvas';
        // Object.assign(emuViewport.style, {
        //     flex: '1', width: '100%', maxWidth: '800px', margin: '0 auto',
        //     backgroundColor: '#000', border: '1px dashed #3a4759', borderRadius: '4px',
        //     position: 'relative', overflow: 'hidden', backgroundPosition: 'center', backgroundSize: 'cover'
        // });
        // bottomHalf.appendChild(emuViewport);

        const phoneFrame = document.createElement('div');
        Object.assign(phoneFrame.style, {
            width: '100%', maxWidth: '780px', height: '90%', margin: '0 auto',
            backgroundColor: '#1e2530', border: '10px solid #2d3846', borderRadius: '32px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6), inset 0 2px 5px rgba(255,255,255,0.1)',
            position: 'relative', display: 'flex', alignItems: 'center', padding: '0 25px', boxSizing: 'border-box'
        });
        bottomHalf.appendChild(phoneFrame);

        // Динамик/Камера слева (Имитация челки/грани)
        const phoneNotch = document.createElement('div');
        Object.assign(phoneNotch.style, {
            position: 'absolute', left: '8px', width: '6px', height: '40px',
            backgroundColor: '#111622', borderRadius: '3px'
        });
        phoneFrame.appendChild(phoneNotch);

        // 🚀 ТВОЙ КАН ОНИЧНЫЙ ВЬЮПОРТ (Экран телефона)
        const emuViewport = document.createElement('div');
        emuViewport.id = 'emulator-viewport-canvas';
        Object.assign(emuViewport.style, {
            flex: '1', height: '100%', backgroundColor: '#000',
            position: 'relative', overflow: 'hidden', backgroundPosition: 'center', backgroundSize: 'cover',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        });
        phoneFrame.appendChild(emuViewport);

        // Сенсорная кнопка Home справа
        const phoneHomeBtn = document.createElement('div');
        Object.assign(phoneHomeBtn.style, {
            position: 'absolute', right: '6px', width: '14px', height: '14px',
            border: '1px solid #3a4759', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.2)'
        });
        phoneFrame.appendChild(phoneHomeBtn);

        document.body.appendChild(overlay);
    }

    /**
     * 🪵 2. БЕЗХАРДКОДНЫЙ ДИНАМИЧЕСКИЙ РЕНДЕР ФОРМЫ (РЕКУРСИЯ ПО КЛЮЧАМ СТИЛЕЙ)
     */
    _renderDynamicForm(targetContainer, dataObject, onSaveCallback) {
        targetContainer.innerHTML = '';
        const currentLang = AppState.game_settings?.language || 'en';

        const title = document.createElement('h3');
        title.textContent = `${currentLang === 'ru' ? 'Параметры объекта:' : 'Object Properties:'} ${dataObject.id}`;
        title.style.cssText = 'color:#fff; margin:0 0 15px 0; font-size:14px; border-bottom:1px solid #232d38; padding-bottom:8px;';
        targetContainer.appendChild(title);

        const formFieldsRegistry = [];
        const formWrapper = document.createElement('div');
        Object.assign(formWrapper.style, { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' });

        const buildInputsRecursively = (obj, parentPath = [], container = formWrapper) => {
            Object.entries(obj).forEach(([key, value]) => {
                // Массив 'widgets' внутри экрана мы пропускаем, так как для него есть отдельная средняя панель
                if (key === 'widgets') return;

                const currentPath = [...parentPath, key];
                const pathString = currentPath.join('.');

                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' });

                const label = document.createElement('label');
                label.textContent = pathString.toUpperCase();
                label.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace;';
                row.appendChild(label);

                // А. Вложенные хэши (например, layout: { top, left, border })
                // А. Вложенные хэши
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const group = document.createElement('div');
                    Object.assign(group.style, {
                        padding: '10px 15px', borderLeft: '2px solid #34495e',
                        backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px'
                    });
                    row.appendChild(group);
                    buildInputsRecursively(value, currentPath, group);
                }
                // Б. 🌟 ЗАЩИЩЁННЫЙ ВЫПАДАЮЩИЙ СПИСОК (SELECT) ДЛЯ СИСТЕМНЫХ ЭКШЕНОВ КНОПОК
                else if (key === 'action') {
                    const select = document.createElement('select');
                    Object.assign(select.style, {
                        padding: '8px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '4px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
                    });

                    // Генерируем опции на основе нашего массива из конструктора
                    this.availableActions.forEach(act => {
                        const opt = document.createElement('option');
                        opt.value = act.id;
                        opt.textContent = currentLang === 'ru' ? act.nameRu : act.nameEn;
                        if (act.id === value) opt.selected = true;
                        select.appendChild(opt);
                    });

                    row.appendChild(select);
                    // Сборщик данных без проблем заберет выбранный .value из этого тега select
                    formFieldsRegistry.push({ path: currentPath, inputElement: select, originalType: 'string' });
                }
                // В. Логика для плоских полей параметров разметки
                else {
                    const input = document.createElement('input');
                    input.value = value !== undefined ? value : '';

                    row.appendChild(input);
                    formFieldsRegistry.push({ path: currentPath, inputElement: input, originalType: typeof value });
                }


                container.appendChild(row);
            });
        };

        buildInputsRecursively(dataObject);
        targetContainer.appendChild(formWrapper);

        // Кнопка сохранения параметров формы
        const saveBtn = document.createElement('button');
        saveBtn.textContent = currentLang === 'ru' ? '💾 Сохранить стили' : '💾 Save Layout';
        Object.assign(saveBtn.style, {
            width: '100%', padding: '12px', backgroundColor: '#3498db', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '15px'
        });

        saveBtn.onclick = () => {
            // Собираем измененные стили и разметку обратно в JS-объект
            formFieldsRegistry.forEach(field => {
                let rawValue = field.inputElement.value;
                let typedValue = rawValue;

                // Поддержка булевых значений чекбоксов/флагов (например, scrollable: true/false)
                if (field.originalType === 'boolean') {
                    typedValue = rawValue.trim().toLowerCase() === 'true';
                } else if (field.originalType === 'number') {
                    typedValue = rawValue === '' ? 0 : Number(rawValue);
                }

                this._setDeepValueByPath(dataObject, field.path, typedValue);
            });

            onSaveCallback();
            this._triggerGlobalUpdates();

            this.renderEmulatorLivePreview();

            // Короткий красивый флэш об успешном сохранении
            const successFlash = document.createElement('div');
            successFlash.textContent = '✓ Сохранено';
            successFlash.style.cssText = 'color:#2ea44f; font-size:12px; font-weight:bold; margin-top:5px; text-align:center;';
            targetContainer.appendChild(successFlash);
            this.renderEmulatorLivePreview();
            setTimeout(() => successFlash.remove(), 1500);
        };
        targetContainer.appendChild(saveBtn);

        this.renderEmulatorLivePreview();
    }


    renderEmulatorLivePreview() {
        // Ищем контейнер эмулятора на странице
        const emuViewport = document.getElementById('emulator-viewport-canvas');
        if (!emuViewport) return;

        const currentLang = AppState.game_settings?.language || 'en';
        emuViewport.innerHTML = ''; // Полностью вычищаем пустой див

        // Загружаем список экранов из нашего единственного источника правды
        const landscapeScreens = AppState.ui?.landscape || [];
        if (landscapeScreens.length === 0) {
            emuViewport.innerHTML = `<div style="color:#4f5b66; font-size:12px; text-align:center; margin-top:15%; font-style:italic;">Нет доступных экранов</div>`;
            return;
        }

        // Если текущий ID экрана не выбран — принудительно инициализируем его первым элементом
        if (!this.currentScreenId && landscapeScreens.length > 0) {
            this.currentScreenId = landscapeScreens[0].id;
        }

        // Ищем активный экран в базе данных
        const activeScreen = landscapeScreens.find(s => s.id === this.currentScreenId);
        if (!activeScreen) return;

        // 🖼️ НАКАТЫВАЕМ ФОН ПРЯМО НА ДИВ ЭМУЛЯТОРА
        if (activeScreen.backgroundImage) {
            emuViewport.style.backgroundImage = `url('${activeScreen.backgroundImage}')`;
            emuViewport.style.backgroundSize = 'cover';
            emuViewport.style.backgroundPosition = 'center';
        } else {
            emuViewport.style.backgroundImage = 'none';
            emuViewport.style.backgroundColor = '#111622';
        }

        // 🧩 ОТРЕНДЕРИВАЕМ ВСЕ ВЛОЖЕННЫЕ ВИДЖЕТЫ ЭКРАНА
        // if (activeScreen.widgets && Array.isArray(activeScreen.widgets)) {
        //     activeScreen.widgets.forEach(widget => {
        //         if (widget.type === 'button') {
        //             const btn = document.createElement('button');
        //
        //             // Извлекаем текст кнопки с поддержкой локализации
        //             let buttonText = widget.id;
        //             if (widget.label_loc_key) {
        //                 buttonText = AppState.localization?.ui?.[currentLang]?.[widget.label_loc_key] || widget.label_loc_key;
        //             }
        //             btn.textContent = buttonText;
        //
        //             // Безопасно вытаскиваем стили из ветки layout
        //             const lay = widget.layout || {};
        //
        //             // Применяем CSS стили прямо из твоего JSON конфига
        //             Object.assign(btn.style, {
        //                 position: 'absolute',
        //                 top: lay.top || '0px',
        //                 left: lay.left || '0px',
        //                 width: lay.width || 'auto',
        //                 height: lay.height || 'auto',
        //                 color: lay.textColor || '#fff',
        //                 fontSize: lay.textSize || '14px',
        //                 backgroundColor: lay.backgroundColor || 'rgba(0,0,0,0.5)',
        //                 border: lay.border || '1px solid #fff',
        //                 borderRadius: lay.borderRadius || '4px',
        //                 boxSizing: 'border-box',
        //                 textAlign: lay.textPosition || 'center',
        //                 zIndex: lay.zIndex || '1',
        //                 cursor: 'pointer',
        //                 pointerEvents: 'none' // Кнопки внутри эмулятора не должны кликаться
        //             });
        //
        //             // Если этот виджет сейчас выделен геймдизайнером для редактирования — включаем рамку-акцент
        //             if (widget.id === this.currentWidgetId) {
        //                 btn.style.boxShadow = '0 0 15px #3498db, inset 0 0 5px #3498db';
        //                 btn.style.borderColor = '#3498db';
        //             }
        //
        //             emuViewport.appendChild(btn);
        //         }
        //     });
        // }

        if (activeScreen.widgets) {
            activeScreen.widgets.forEach(widget => {
                if (widget.type === 'button') {
                    const btn = document.createElement('button');

                    let buttonText = widget.id;
                    if (widget.label_loc_key) {
                        buttonText = AppState.localization?.ui?.[currentLang]?.[widget.label_loc_key] || widget.label_loc_key;
                    }
                    btn.textContent = buttonText;

                    const lay = widget.layout || {};
                    Object.assign(btn.style, {
                        position: 'absolute',
                        top: lay.top || '0%',
                        left: lay.left || '0%',
                        width: lay.width || 'auto',
                        height: lay.height || 'auto',
                        color: lay.textColor || '#fff',
                        fontSize: lay.textSize || '14px',
                        backgroundColor: lay.backgroundColor || 'rgba(0,0,0,0.5)',
                        border: lay.border || '1px solid #fff',
                        borderRadius: lay.borderRadius || '4px',
                        boxSizing: 'border-box',
                        textAlign: lay.textPosition || 'center',
                        zIndex: lay.zIndex || '1',
                        cursor: 'grab', // Иконка хваталщика мыши
                        touchAction: 'none', // Защита от скролла на мобилках при перетаскивании
                        userSelect: 'none'
                    });

                    // Хайлайт активного виджета
                    const isActiveWidget = widget.id === this.currentWidgetId;
                    // =========================================================================
                    // 🔀 ИСПРАВЛЕННАЯ ФИЗИКА DRAG & DROP + РЕСАЙЗ ПО ПРОЦЕНТАМ (%)
                    // =========================================================================

                    // Если виджет выделен в админке, добавляем ему маркер ресайза в угол
                    if (isActiveWidget) {
                        const resizeHandle = document.createElement('div');
                        resizeHandle.id = 'widget-resize-handle';
                        Object.assign(resizeHandle.style, {
                            position: 'absolute', right: '0', bottom: '0',
                            width: '10px', height: '10px', backgroundColor: '#3498db',
                            cursor: 'se-resize', zIndex: '10', borderRadius: '2px 0 4px 0'
                        });
                        btn.appendChild(resizeHandle);

                        // 📐 СТАРТ РЕСАЙЗА ПРИ КЛИКЕ НА МАРКЕР
                        resizeHandle.onmousedown = (resizeEvent) => {
                            resizeEvent.stopPropagation(); // Запрещаем кнопке тащиться при ресайзе!
                            resizeEvent.preventDefault();

                            const rect = emuViewport.getBoundingClientRect();
                            const startWidth = btn.offsetWidth;
                            const startHeight = btn.offsetHeight;
                            const startX = resizeEvent.clientX;
                            const startY = resizeEvent.clientY;

                            const resizeMoveHandler = (moveEvent) => {
                                // Вычисляем дельту движения мыши в пикселях
                                const deltaX = moveEvent.clientX - startX;
                                const deltaY = moveEvent.clientY - startY;

                                // Считаем новые размеры в пикселях, не давая кнопке сжаться в ноль
                                const newWidthPx = Math.max(30, startWidth + deltaX);
                                const newHeightPx = Math.max(15, startHeight + deltaY);

                                // Переводим пиксели в чистые проценты от ширины и высоты экрана смартфона
                                const percentWidth = (newWidthPx / rect.width) * 100;
                                const percentHeight = (newHeightPx / rect.height) * 100;

                                const finalWidthStr = `${percentWidth.toFixed(1)}%`;
                                const finalHeightStr = `${percentHeight.toFixed(1)}%`;

                                // 1. Визуально меняем габариты на экране
                                btn.style.width = finalWidthStr;
                                btn.style.height = finalHeightStr;

                                // 2. Записываем в стейт AppState
                                if (!widget.layout) widget.layout = {};
                                widget.layout.width = finalWidthStr;
                                widget.layout.height = finalHeightStr;

                                // 3. Дублируем в инпуты формы сверху в реальном времени
                                const allInputs = document.querySelectorAll('input');
                                allInputs.forEach(input => {
                                    const label = input.previousSibling;
                                    if (label && label.textContent === 'LAYOUT.WIDTH') input.value = finalWidthStr;
                                    if (label && label.textContent === 'LAYOUT.HEIGHT') input.value = finalHeightStr;
                                });
                            };

                            const resizeUpHandler = () => {
                                document.removeEventListener('mousemove', resizeMoveHandler);
                                document.removeEventListener('mouseup', resizeUpHandler);
                                this._triggerGlobalUpdates();
                            };

                            document.addEventListener('mousemove', resizeMoveHandler);
                            document.addEventListener('mouseup', resizeUpHandler);
                        };
                    }

                    // 🔀 ПЕРЕМЕЩЕНИЕ ВИДЖЕТА (DRAG)
                    // 🔀 ПЕРЕМЕЩЕНИЕ ВИДЖЕТА (DRAG)
                    btn.onmousedown = (e) => {
                        // 🚀 СТРОГИЙ ФИКС: Если кликнули по маркеру ресайза — перемещение намертво игнорируем!
                        if (e.target.id === 'widget-resize-handle') return;

                        e.preventDefault();

                        if (!isActiveWidget) {
                            this.currentWidgetId = widget.id;
                            const oldList= document.getElementById('widgetsScroll');
                            if (oldList) {
                                const rows = Array.from(oldList.querySelectorAll('div'));
                                const targetRow = rows.find(row => row.textContent && row.textContent.includes(widget.id));
                                if (targetRow) targetRow.click();
                            }
                        }

                        btn.style.cursor = 'grabbing';
                        const rect = emuViewport.getBoundingClientRect();
                        const btnRect = btn.getBoundingClientRect();

                        // Фикс улетания курсора: Запоминаем точку хвата внутри самой кнопки
                        const grabOffsetX = e.clientX - btnRect.left;
                        const grabOffsetY = e.clientY - btnRect.top;

                        const moveHandler = (moveEvent) => {
                            const localX = moveEvent.clientX - rect.left - grabOffsetX;
                            const localY = moveEvent.clientY - rect.top - grabOffsetY;

                            const percentLeft = Math.min(100, Math.max(0, (localX / rect.width) * 100));
                            const percentTop = Math.min(100, Math.max(0, (localY / rect.height) * 100));

                            const finalLeftStr = `${percentLeft.toFixed(1)}%`;
                            const finalTopStr = `${percentTop.toFixed(1)}%`;

                            btn.style.left = finalLeftStr;
                            btn.style.top = finalTopStr;

                            if (!widget.layout) widget.layout = {};
                            widget.layout.left = finalLeftStr;
                            widget.layout.top = finalTopStr;

                            const allInputs = document.querySelectorAll('input');
                            allInputs.forEach(input => {
                                const parentLabel = input.previousSibling;
                                if (parentLabel && parentLabel.textContent === 'LAYOUT.LEFT') input.value = finalLeftStr;
                                if (parentLabel && parentLabel.textContent === 'LAYOUT.TOP') input.value = finalTopStr;
                            });
                        };

                        const upHandler = () => {
                            btn.style.cursor = 'grab';
                            document.removeEventListener('mousemove', moveHandler);
                            document.removeEventListener('mouseup', upHandler);
                            this._triggerGlobalUpdates();
                        };

                        document.addEventListener('mousemove', moveHandler);
                        document.addEventListener('mouseup', upHandler);
                    };

                    // =========================================================================
                    // 📐 СОЗДАНИЕ ПОЛЗУНКА РЕСАЙЗА (СТРОГО ПОСЛЕ НАЗНАЧЕНИЯ ДРАГА BUTTON)
                    // =========================================================================
                    if (isActiveWidget) {
                        // Кнопка должна стать relative, чтобы абсолютный маркер сел четко в ее угол
                        btn.style.position = 'absolute';

                        const resizeHandle = document.createElement('div');
                        resizeHandle.id = 'widget-resize-handle';

                        // Задаем контрастный, заметный неоново-синий квадрат в правом нижнем углу кнопки
                        Object.assign(resizeHandle.style, {
                            position: 'absolute',
                            right: '0px',
                            bottom: '0px',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#3498db',
                            border: '1px solid #fff',
                            boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                            cursor: 'se-resize',
                            zIndex: '5000', // Поверх всего содержимого кнопки
                            borderRadius: '3px 0 0 0'
                        });

                        btn.appendChild(resizeHandle);

                        // 📐 СТАРТ РЕСАЙЗА
                        resizeHandle.onmousedown = (resizeEvent) => {
                            resizeEvent.stopPropagation(); // Гарантируем, что кнопка не начнет тащиться
                            resizeEvent.preventDefault();

                            const rect = emuViewport.getBoundingClientRect();
                            const startWidth = btn.offsetWidth;
                            const startHeight = btn.offsetHeight;
                            const startX = resizeEvent.clientX;
                            const startY = resizeEvent.clientY;

                            const resizeMoveHandler = (moveEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                const deltaY = moveEvent.clientY - startY;

                                const newWidthPx = Math.max(30, startWidth + deltaX);
                                const newHeightPx = Math.max(15, startHeight + deltaY);

                                const percentWidth = (newWidthPx / rect.width) * 100;
                                const percentHeight = (newHeightPx / rect.height) * 100;

                                const finalWidthStr = `${percentWidth.toFixed(1)}%`;
                                const finalHeightStr = `${percentHeight.toFixed(1)}%`;

                                btn.style.width = finalWidthStr;
                                btn.style.height = finalHeightStr;

                                if (!widget.layout) widget.layout = {};
                                widget.layout.width = finalWidthStr;
                                widget.layout.height = finalHeightStr;

                                const allInputs = document.querySelectorAll('input');
                                allInputs.forEach(input => {
                                    const label = input.previousSibling;
                                    if (label && label.textContent === 'LAYOUT.WIDTH') input.value = finalWidthStr;
                                    if (label && label.textContent === 'LAYOUT.HEIGHT') input.value = finalHeightStr;
                                });
                            };

                            const resizeUpHandler = () => {
                                document.removeEventListener('mousemove', resizeMoveHandler);
                                document.removeEventListener('mouseup', resizeUpHandler);
                                this._triggerGlobalUpdates();
                            };

                            document.addEventListener('mousemove', resizeMoveHandler);
                            document.addEventListener('mouseup', resizeUpHandler);
                        };
                    }

                    emuViewport.appendChild(btn);

                }
            });
        }


    }

    /**
     * 🧩 3. ВНУТРЕННИЕ МЕТОДЫ ОПЕРАЦИЙ
     */
    _setDeepValueByPath(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    _removeExistingModal() {
        const oldModal = document.getElementById('screen-editor-modal');
        if (oldModal) oldModal.remove();
        this.modalElement = null;
    }

    _triggerGlobalUpdates() {
        // Принудительно заставляем интерфейс перерендериться на основе обновленного JSON-конфига AppState.ui
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    }
}


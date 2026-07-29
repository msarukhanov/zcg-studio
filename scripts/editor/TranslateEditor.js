import { AppState } from '../shared/GameState.js';

export const TranslateEditor = {

    currentLocCategory: 'ui',
    stateLocKey: null,

    editorViewLang: '',

    openTranslateModal() {

        if (!this.editorViewLang) {
            this.editorViewLang = AppState.game_settings?.language || 'en';
        }

        // =========================================================================
        // 🎨 1. КОРНЕВОЙ ОВЕРЛЕЙ МОДАЛЬНОГО ОКНА (ТВОЙ СТАНДАРТ)
        // =========================================================================
        const overlay = document.createElement('div');
        overlay.id = 'translate-editor-modal';
        overlay.style.pointerEvents = 'auto';
        Object.assign(overlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 8, 12, 0.96)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
        });

        // ❌ ФИКСИРОВАННЫЙ КРУГЛЫЙ КРЕСТИК ЗАКРЫТИЯ ВСЕГО ОКНА
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10005'
        });
        closeBtn.onclick = () => {
            overlay.remove(); // Нативно сносим оверлей из DOM
            if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        };
        overlay.appendChild(closeBtn);

        // Центральная большая доска-коробка редактора ( maxWidth: 1100px, height: 85vh )
        const board = document.createElement('div');
        Object.assign(board.style, {
            width: '95%', maxWidth: '1100px', height: '85vh',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', overflow: 'hidden', padding: '25px', boxSizing: 'border-box'
        });
        overlay.appendChild(board);

        // =========================================================================
        // 📱 2. ТВОЙ ОРИГИНАЛЬНЫЙ HTML-УЗЕЛ ВНУТРИ ДОСКИ
        // =========================================================================
        // <div id="view-localization" class="view-panel">
        const viewPanel = document.createElement('div');
        viewPanel.id = 'view-localization';
        viewPanel.className = 'view-panel';
        Object.assign(viewPanel.style, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '15px', boxSizing: 'border-box' });
        board.appendChild(viewPanel);

        const topControlBar = document.createElement('div');
        Object.assign(topControlBar.style, {
            display: 'flex', alignItems: 'center', gap: '15px', width: '100%',
            paddingBottom: '10px', borderBottom: '1px solid #232d38', flexShrink: '0'
        });
        viewPanel.appendChild(topControlBar);

        // Метка для выпадающего списка
        const langLabel = document.createElement('label');
        langLabel.textContent = 'LANG:';
        langLabel.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace;';
        topControlBar.appendChild(langLabel);

        // Сам дропдаун выбора языковых паков (На основе AppState.languages)
        const langSelect = document.createElement('select');
        Object.assign(langSelect.style, {
            padding: '6px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
            borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer'
        });

        const availableLangs = AppState.languages || ['en', 'ru'];
        const activeEditorLang = this.editorViewLang || 'en';

        availableLangs.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang.toUpperCase();
            if (lang === activeEditorLang) opt.selected = true;
            langSelect.appendChild(opt);
        });

        // 🚀 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Меняем язык ТОЛЬКО внутри админки!
        langSelect.onchange = () => {
            // 1. Мутируем строго внутреннее свойство класса редактора
            this.editorViewLang = langSelect.value;
            console.log(`[TranslateEditor] Локальный просмотрщик админки переключен на: ${this.editorViewLang.toUpperCase()}`);

            // 2. Без багов обновляем только модалку редактора для пересчета бэджей
            overlay.remove();
            this.openTranslateModal();
        };
        topControlBar.appendChild(langSelect);

        // <div class="tabs-header">
        const tabsHeader = document.createElement('div');
        tabsHeader.className = 'tabs-header';
        Object.assign(tabsHeader.style, {
            display: 'flex',
            gap: '8px',
            width: '100%',
            overflowX: 'auto',          // Включаем горизонтальную прокрутку, если табы не влезают
            whiteSpace: 'nowrap',       // Запрещаем кнопкам падать на вторую строчку
            flexShrink: '0',            // Защищаем шапку табов от вертикального сжатия
            scrollbarWidth: 'none',     // Скрываем уродливый скроллбар в Firefox
            msOverflowStyle: 'none'     // Скрываем скроллбар в IE/Edge
        });
        topControlBar.appendChild(tabsHeader);

        // 🚀 СТРОГИЙ ДАТА-ДРИВЕН СБОР: Вытаскиваем вкладки напрямую из ключей твоего AppState.localization!
        if (!AppState.localization) AppState.localization = {};
        const dynamicCategories = Object.keys(AppState.localization);

        // Безопасная инициализация, если база локалей пустая
        if (dynamicCategories.length === 0) {
            AppState.localization.ui = {};
            dynamicCategories.push('ui');
        }

        // Фиксируем активный дефолтный таб в контексте, если он сбросился
        if (!this.currentCategory || !dynamicCategories.includes(this.currentCategory)) {
            this.currentCategory = dynamicCategories[0];
        }

        // Рендерим табы динамическим циклом из объекта
        dynamicCategories.forEach(catId => {
            const tabBtn = document.createElement('button');
            const isActive = catId === this.currentCategory;

            tabBtn.className = `tab-btn ${isActive ? 'active' : ''}`;

            // Мапим дефолтные имена из твоего HTML, для новых веток пишем просто имя ключа в верхнем регистре
            const labelsMap = {  };
            tabBtn.textContent = labelsMap[catId] || `📁 ${catId.toUpperCase()}`;

            // Твои фирменные инлайн-стили табов редактора
            Object.assign(tabBtn.style, {
                padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: isActive ? '#3498db' : '#1b2432',
                border: isActive ? '1px solid #5faee3' : '1px solid #2d394b',
                borderRadius: '4px', color: '#fff', transition: 'background-color 0.15s'
            });

            // Нативный биндинг переключения на твой метод switchLocCategory
            tabBtn.onclick = (event) => {
                this.switchLocCategory(catId, event);

                // 2. Точечно переключаем визуальную подсветку активного таба прямо в DOM
                tabsHeader.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    // Возвращаем дефолтный темный стиль для неактивных табов
                    b.style.backgroundColor = '#1b2432';
                    b.style.borderColor = '#2d394b';
                });

                tabBtn.classList.add('active');
                // Подсвечиваем активный таб твоим синим цветом
                tabBtn.style.backgroundColor = '#3498db';
                tabBtn.style.borderColor = '#5faee3';
            };
            tabsHeader.appendChild(tabBtn);
        });

        // <div class="crud-container" style="height: calc(100vh - 200px);">
        const crudContainer = document.createElement('div');
        crudContainer.className = 'crud-container';
        crudContainer.style.height = 'calc(100vh - 200px)';
        Object.assign(crudContainer.style, { display: 'flex', width: '100%', flex: '1', gap: '15px', boxSizing: 'border-box', overflow: 'hidden' });
        viewPanel.appendChild(crudContainer);

        // <div class="crud-sidebar">
        const crudSidebar = document.createElement('div');
        crudSidebar.className = 'crud-sidebar';
        Object.assign(crudSidebar.style, { width: '30%', borderRight: '1px solid #232d38', paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' });
        crudContainer.appendChild(crudSidebar);

        // <div class="crud-sidebar-header">
        const crudSidebarHeader = document.createElement('div');
        crudSidebarHeader.className = 'crud-sidebar-header';
        Object.assign(crudSidebarHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' });
        crudSidebar.appendChild(crudSidebarHeader);

        // <span class="card-title" id="loc-sidebar-title">UI Dictionary</span>
        const sidebarTitle = document.createElement('span');
        sidebarTitle.className = 'card-title';
        sidebarTitle.id = 'loc-sidebar-title';
        sidebarTitle.style.cssText = 'color:#ffd166; font-size:13px; font-weight:bold; font-family:monospace;';

        sidebarTitle.textContent = `${this.currentCategory.toUpperCase()} Dictionary`;
        crudSidebarHeader.appendChild(sidebarTitle);

        // <button class="primary" style="padding: 4px 8px; font-size: 11px;" onclick="createNewLocKey()">+ Add Key</button>
        const addKeyBtn = document.createElement('button');
        addKeyBtn.className = 'primary';
        Object.assign(addKeyBtn.style, { padding: '4px 8px', fontSize: '11px', backgroundColor: '#2ea44f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' });
        addKeyBtn.textContent = '+ Add Key';
        addKeyBtn.onclick = () => {
            if (typeof this.createNewLocKey === 'function') {
                this.createNewLocKey();
            }
        };
        crudSidebarHeader.appendChild(addKeyBtn);

        // <ul class="crud-list" id="loc-keys-list"></ul>
        const keysList = document.createElement('ul');
        keysList.id = 'loc-keys-list';
        keysList.className = 'crud-list';
        Object.assign(keysList.style, { listStyle: 'none', padding: '0', margin: '0', flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
        crudSidebar.appendChild(keysList);

        // <div class="crud-editor" id="loc-key-editor"></div>
        const keyEditor = document.createElement('div');
        keyEditor.id = 'loc-key-editor';
        keyEditor.className = 'crud-editor';
        Object.assign(keyEditor.style, { width: '70%', padding: '15px', backgroundColor: '#0e121b', border: '1px solid #232d38', borderRadius: '6px', boxSizing: 'border-box', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' });
        crudContainer.appendChild(keyEditor);

        // Нативно выплескиваем готовое модальное окно на страницу админки редактора
        document.body.appendChild(overlay);

        this.switchLocCategory('ui');
    },

    renderLocKeysList() {
        // Находим целевой контейнер сайдбара по его ID из твоего HTML шаблона
        const listContainer = document.getElementById('loc-keys-list');
        if (!listContainer) return;

        listContainer.innerHTML = ''; // Атомарно вычищаем старый список

        // Вызываем твои нативные методы извлечения ключей и корня текущей категории локализации
        const keys = this.getLocKeysFromCategory() || [];
        const root = this.getLocCategoryRoot() || {};

        keys.forEach(key => {
            // <li class="crud-list-item">
            const listItem = document.createElement('li');
            listItem.className = `crud-list-item ${this.stateLocKey === key ? 'active' : ''}`;

            // Задаем твои фирменные инлайн-стили для элементов списка в сайдбаре
            Object.assign(listItem.style, {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', marginBottom: '4px', backgroundColor: this.stateLocKey === key ? '#232d38' : '#1b2432',
                border: this.stateLocKey === key ? '1px solid #34495e' : '1px solid #2d394b',
                borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.1s, border-color 0.1s'
            });

            // 1. Левая часть: Строгий текстовый ID ключа словаря
            // <span style="font-family:monospace; font-size:12px;">
            const keySpan = document.createElement('span');
            keySpan.textContent = key;
            keySpan.style.cssText = 'font-family:monospace; font-size:12px; color:#fff; font-weight:bold;';
            listItem.appendChild(keySpan);

            // 2. Правая часть: Умное извлечение превью текста (Сначала EN, если нет — RU, если нет — пусто)
            // const previewText = (root['en'] && root['en'][key]) ? root['en'][key] : ((root['ru'] && root['ru'][key]) ? root['ru'][key] : '');
            // 🚀 СТРОГИЙ ФИКС: Вытаскиваем превью текста строго по выбранному в селекте языку админки!
            const viewLang = this.editorViewLang || 'en';
            const previewText = root[viewLang] && root[viewLang][key] ? root[viewLang][key] : '';


            if (previewText) {
                // Если перевод существует — нарезаем первые 20 символов
                const truncated = previewText.length > 20 ? previewText.substring(0, 20) + '...' : previewText;

                // <span class="badge" style="...">
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'badge';
                badgeSpan.textContent = truncated;

                // Твои инлайн-стили бэджа превью
                Object.assign(badgeSpan.style, {
                    maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: '10px', backgroundColor: '#141a27', color: '#8a92a6', padding: '2px 6px',
                    borderRadius: '3px', border: '1px solid #2d394b', fontFamily: 'sans-serif'
                });
                listItem.appendChild(badgeSpan);
            }

            // 🚀 СТРОГИЙ СНАЙПЕРСКИЙ БИНДИНГ: Привязываем клик напрямую на метод твоего класса!
            listItem.onclick = (event) => {
                event.stopPropagation();
                if (typeof this.selectLocKey === 'function') {
                    this.selectLocKey(key);
                }
            };

            listContainer.appendChild(listItem);
        });
    },

    switchLocCategory(category, evt) {
        // Синхронизируем имя свойства с твоим базовым конструктором (currentCategory или currentLocCategory)
        this.currentLocCategory = category;
        this.currentCategory = category; // Для кросс-совместимости с табами
        this.stateLocKey = null;

        // 🚀 СТРОГИЙ ФИКС ОПЕЧАТКИ: Заменяем несуществующий evt.AppState на нативный evt.target!
        if (evt && evt.target && evt.target.parentElement) {
            const parent = evt.target.parentElement;
            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            evt.target.classList.add('active');
        }

        const sidebarTitle = document.getElementById('loc-sidebar-title');
        if (sidebarTitle) {
            sidebarTitle.innerText = `${category.toUpperCase()} Dictionary`;
        }

        const keyEditor = document.getElementById('loc-key-editor');
        if (keyEditor) keyEditor.innerHTML = '';

        this.renderLocKeysList();
    },

    getLocCategoryRoot() {
        if (!AppState.localization) AppState.localization = {};
        // Синхронизируем чтение с активным свойством категории
        const activeCat = this.currentLocCategory || this.currentCategory || 'ui';
        if (!AppState.localization[activeCat]) {
            AppState.localization[activeCat] = {};
        }
        return AppState.localization[activeCat];
    },

    getLocKeysFromCategory() {
        const root = this.getLocCategoryRoot();
        const uniqueKeys = new Set();
        const langs = AppState.languages || ['en', 'ru'];

        langs.forEach(lang => {
            if (root[lang]) {
                Object.keys(root[lang]).forEach(k => uniqueKeys.add(k));
            }
        });

        return Array.from(uniqueKeys);
    },

    createNewLocKey() {
        const root = this.getLocCategoryRoot();
        const keys = this.getLocKeysFromCategory();
        const activeCat = this.currentLocCategory || this.currentCategory || 'ui';
        let newKey = `new_${activeCat}_key_${keys.length}`;

        while (keys.includes(newKey)) {
            newKey = `new_${activeCat}_key_${Date.now()}`;
        }

        const langs = AppState.languages || ['en', 'ru'];
        langs.forEach(lang => {
            if (!root[lang]) root[lang] = {};
            root[lang][newKey] = "";
        });

        this.stateLocKey = newKey;
        this.renderLocKeysList();
        this.selectLocKey(newKey);
    },

    deleteLocKey(key) {
        if (!confirm(`Are you sure you want to delete localization key: ${key}?`)) return;

        const root = this.getLocCategoryRoot();
        const langs = AppState.languages || ['en', 'ru'];
        langs.forEach(lang => {
            if (root[lang]) {
                delete root[lang][key];
            }
        });

        this.stateLocKey = null;
        document.getElementById('loc-key-editor').innerHTML = '';
        this.renderLocKeysList();
    },

    renameLocKey(oldKey, newKey) {
        if (!newKey || oldKey === newKey) return;
        const root = this.getLocCategoryRoot();
        const keys = this.getLocKeysFromCategory();

        if (keys.includes(newKey)) {
            alert(`Error: Localization key "${newKey}" already exists in this category!`);
            this.renderLocKeysList();
            this.selectLocKey(oldKey);
            return;
        }

        const langs = AppState.languages || ['en', 'ru'];
        langs.forEach(lang => {
            if (root[lang]) {
                if (root[lang][oldKey] !== undefined) {
                    root[lang][newKey] = root[lang][oldKey];
                    delete root[lang][oldKey];
                } else {
                    root[lang][newKey] = "";
                }
            }
        });

        this.stateLocKey = newKey;
        this.renderLocKeysList();
        this.selectLocKey(newKey);
    },

    // =========================================================================
    // 🖥️ ИСПРАВЛЕННЫЙ МЕТОД ИНСПЕКТОРА (НА ТИВНЫЙ DOM РЕНДЕР БЕЗ КРАША ФОКУСА)
    // =========================================================================
    selectLocKey(key) {
        this.stateLocKey = key;

        // Перерисовываем только левую панель, подсвечивая активную строку
        const listContainer = document.getElementById('loc-keys-list');
        if (listContainer) {
            Array.from(listContainer.children).forEach(li => {
                const isCurrent = li.firstChild && li.clearTextContext === key || li.innerText.startsWith(key);
                li.className = `crud-list-item ${isCurrent ? 'active' : ''}`;
                li.style.backgroundColor = isCurrent ? '#232d38' : '#1b2432';
                li.style.borderColor = isCurrent ? '#3498db' : '#2d394b';
            });
        }

        const ed = document.getElementById('loc-key-editor');
        if (!ed) return;
        ed.innerHTML = ''; // Чистим правое рабочее поле

        const root = this.getLocCategoryRoot();

        // 1. Шапка инспектора
        const headerFlex = document.createElement('div');
        headerFlex.className = 'card-header-flex';
        Object.assign(headerFlex.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px' });

        const titleSpan = document.createElement('span');
        titleSpan.className = 'card-title';
        titleSpan.style.cssText = 'font-family:monospace; color:#ffd166; font-weight:bold; font-size:13px;';
        titleSpan.textContent = `Loc Key: ${key}`;
        headerFlex.appendChild(titleSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger';
        deleteBtn.textContent = 'Delete Phrase Key';
        Object.assign(deleteBtn.style, { padding: '5px 12px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' });
        deleteBtn.onclick = () => this.deleteLocKey(key);
        headerFlex.appendChild(deleteBtn);
        ed.appendChild(headerFlex);

        // 2. Инпут переименования системного ключа строки
        const formGrid = document.createElement('div');
        formGrid.className = 'form-grid';

        const groupKey = document.createElement('div');
        groupKey.className = 'form-group full-width';
        groupKey.style.cssText = 'display:flex; flex-direction:column; gap:4px; width:100%;';

        const labelKey = document.createElement('label');
        labelKey.textContent = 'Localization System Dictionary Key String';
        labelKey.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold;';
        groupKey.appendChild(labelKey);

        const inputKey = document.createElement('input');
        inputKey.type = 'text';
        inputKey.value = key;
        inputKey.onchange = () => this.renameLocKey(key, inputKey.value);
        groupKey.appendChild(inputKey);
        formGrid.appendChild(groupKey);
        ed.appendChild(formGrid);

        // 3. Подсекция языковых паков переводов
        const subSection = document.createElement('div');
        subSection.className = 'sub-section';
        subSection.style.marginTop = '20px';

        const subTitle = document.createElement('div');
        subTitle.className = 'sub-section-title';
        subTitle.textContent = 'Active Language Pack Translations';
        subTitle.style.cssText = 'color:#3498db; font-size:11px; font-weight:bold; letter-spacing:0.5px; border-bottom:1px solid #232d38; padding-bottom:4px;';
        subSection.appendChild(subTitle);

        const inputsWrapper = document.createElement('div');
        inputsWrapper.style.marginTop = '15px';
        subSection.appendChild(inputsWrapper);

        const langs = AppState.languages || ['en', 'ru'];
        langs.forEach(lang => {
            if (!root[lang]) root[lang] = {};
            if (root[lang][key] === undefined) root[lang][key] = "";

            const textGroup = document.createElement('div');
            textGroup.className = 'form-group full-width';
            textGroup.style.cssText = 'display:flex; flex-direction:column; gap:4px; width:100%; margin-bottom:12px;';

            const textLabel = document.createElement('label');
            textLabel.innerHTML = `<span style="background:#3498db; color:#fff; font-size:9px; padding:2px 5px; borderRadius:3px; fontWeight:bold; marginRight:6px;">${lang.toUpperCase()}</span> Translation text`;
            textLabel.style.cssText = 'color:#8a92a6; font-size:11px;';
            textGroup.appendChild(textLabel);

            const textarea = document.createElement('textarea');
            textarea.value = root[lang][key];
            textarea.style.cssText = 'padding:10px; backgroundColor:#1b2432; border:1px solid #2d394b; borderRadius:4px; color:#fff; fontSize:13px; minHeight:60px; fontFamily:sans-serif; resize:vertical; outline:none;';

            // 🚀 СНАЙПЕРСКИЙ ФИКС БАГА ФОКУСА:
            // При вводе буквы мы мутируем стейт и точечно обновляем только бэдж в левой панели,
            // вообще НЕ перерисовывая саму правую панель! Фокус ввода железно остается на месте!
            textarea.oninput = () => {
                root[lang][key] = textarea.value;

                // Находим строчку в левом списке и точечно переписываем бэдж превьюшки
                if (typeof this.renderLocKeysList === 'function') {
                    this.renderLocKeysList();
                }
            };
            textGroup.appendChild(textarea);
            inputsWrapper.appendChild(textGroup);
        });
        ed.appendChild(subSection);
    }
}
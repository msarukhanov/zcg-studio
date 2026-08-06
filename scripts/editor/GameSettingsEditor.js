import { AppState } from '../shared/GameState.js';

export class GameSettingsEditor {
    constructor() {
        this.currentTab = 'main'; // 'game_settings' или 'turn_settings'
        this.modalElement = null;

        // Реестр выпадающих списков для конкретных путей в объекте настроек
        this.selectOptionsRegistry = {
            'turn_settings.turn_by': [
                { value: 'character', labelRu: 'По персонажам (character)', labelEn: 'By Character (character)' },
                { value: 'team', labelRu: 'По командам (team)', labelEn: 'By Team (team)' },
                { value: 'faction', labelRu: 'По фракциям (faction)', labelEn: 'By Faction (faction)' }
            ],
            'turn_settings.turn_mode': [
                { value: 'realtime', labelRu: 'Реальное время (realtime)', labelEn: 'Realtime (realtime)' },
                { value: 'turn-based', labelRu: 'Пошагово (turn-based)', labelEn: 'Turn-based (turn-based)' }
            ],
            'game_settings.playerType': [
                { value: 'character', labelRu: 'Персонаж (character)', labelEn: 'Character (character)' },
                { value: 'team', labelRu: 'Команда (team)', labelEn: 'Team (team)' },
                { value: 'faction', labelRu: 'Фракция (faction)', labelEn: 'Faction (faction)' }
            ],
            'game_settings.playerAttack': [
                { value: 'manual', labelRu: 'Вручную (manual)', labelEn: 'Manual (manual)' },
                { value: 'auto', labelRu: 'Автоматически (auto)', labelEn: 'Auto (auto)' }
            ],
            'game_settings.playerCamera': [
                { value: 'fixed', labelRu: 'Фиксированная (fixed)', labelEn: 'Fixed (fixed)' },
                { value: 'free', labelRu: 'Свободная (free)', labelEn: 'Free (free)' }
            ],
            'game_settings.battleType': [
                { value: 'instant', labelRu: 'Мгновенный бой (instant)', labelEn: 'Instant (instant)' },
                { value: 'tactical', labelRu: 'Тактический бой (tactical)', labelEn: 'Tactical (tactical)' }
            ],
            'game_settings.killExpTiming': [
                { value: 'instant', labelRu: 'Мгновенно (instant)', labelEn: 'Instant (instant)' },
                { value: 'win', labelRu: 'После победы (win)', labelEn: 'On Win (win)' }
            ],
            'main.genres': {
                isMultiSelect: true, // Флаг, указывающий форме рендерить чекбоксы вместо обычного селекта
                options: [
                    { id: 'rpg', nameRu: '⚔️ Ролевая игра (RPG)', nameEn: '⚔️ Role-Playing Game (RPG)' },
                    { id: 'strategy', nameRu: 'Стратегия', nameEn: 'Strategy' },
                    { id: 'visual_novel', nameRu: 'Визуальная новелла', nameEn: 'Visual Novel' },

                    { id: 'fantasy', value: 'fantasy', labelRu: 'Фэнтези', labelEn: 'Fantasy' },
                    { id: 'romance', value: 'romance', labelRu: 'Романтика', labelEn: 'Romance' },
                    { id: 'sci_fi', value: 'sci_fi', labelRu: 'Научная фантастика', labelEn: 'Sci-Fi' },
                    { id: 'cyberpunk', value: 'cyberpunk', labelRu: 'Киберпанк', labelEn: 'Cyberpunk' },
                    { id: 'mystery', value: 'mystery', labelRu: 'Детектив / Мистика', labelEn: 'Mystery' },
                    { id: 'horror', value: 'horror', labelRu: 'Хоррор / Ужасы', labelEn: 'Horror' },
                    { id: 'historical', value: 'historical', labelRu: 'Исторический', labelEn: 'Historical' },
                    { id: 'steampunk', value: 'steampunk', labelRu: 'Стимпанк', labelEn: 'Steampunk' },
                    { id: 'post_apocalyptic', value: 'post_apocalyptic', labelRu: 'Постапокалипсис', labelEn: 'Post-Apocalyptic' },
                    { id: 'thriller', value: 'thriller', labelRu: 'Триллер', labelEn: 'Thriller' },
                    { id: 'comedy', value: 'comedy', labelRu: 'Комедия', labelEn: 'Comedy' },
                    { id: 'slice_of_life', value: 'slice_of_life', labelRu: 'Повседневность', labelEn: 'Slice of Life' },
                    { id: 'drama', value: 'drama', labelRu: 'Драма', labelEn: 'Drama' },
                    { id: 'mythology', value: 'mythology', labelRu: 'Мифология / Сказка', labelEn: 'Mythology' }
                ]
            },
            'main.MovementControls': {
                isMultiSelect: true,
                options: [
                    { value: 'click', labelRu: 'Клик мышью / Тап (Click/Tap)', labelEn: 'Click/Tap' },
                    { value: 'joystick', labelRu: 'Виртуальный джойстик (Joystick)', labelEn: 'Virtual Joystick' },
                    { value: 'keyboard', labelRu: 'Клавиатура WASD / Стрелки', labelEn: 'Keyboard WASD/Arrows' }
                ]
            }
        };
    }

    /**
     * Открытие модального окна редактора настроек
     * @param {string} mode - 'new' (создание новой игры) или 'edit' (редактирование текущей)
     */
    openEditorModal(mode = 'edit') {
        this._removeExistingModal();
        const currentLang = AppState.game_settings?.language || AppState.game_settings?.ui?.lang || 'en';

        // Корневой оверлей модалки
        const overlay = document.createElement('div');
        overlay.id = 'game-settings-editor-modal';
        overlay.style.pointerEvents = 'auto';
        Object.assign(overlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 8, 12, 0.97)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
        });
        this.modalElement = overlay;

        // Кнопка закрытия окна
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10000'
        });
        closeBtn.onclick = () => this._removeExistingModal();
        overlay.appendChild(closeBtn);

        // Главный контейнер (доска) редактора
        const board = document.createElement('div');
        board.id = 'settings-editor-board';
        Object.assign(board.style, {
            width: '95%', maxWidth: '1000px', height: '90vh',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', overflow: 'hidden'
        });
        overlay.appendChild(board);
        document.body.appendChild(overlay);

        // В зависимости от режима рендерим либо Мастер Создания (Wizard), либо сразу Панель Настроек
        if (mode === 'new') {
            this._renderWizardScreen(board, currentLang);
        } else {
            this._renderMainEditorInterface(board, currentLang);
        }
    }

    /**
     * ЭКРАН МАСТЕРА СОЗДАНИЯ (Шаг 1: Имя проекта и Выбор шаблонов)
     */
    _renderWizardScreen(boardContainer, currentLang) {
        boardContainer.innerHTML = '';
        boardContainer.style.justifyContent = 'center';
        boardContainer.style.alignItems = 'center';

        const wizardWrapper = document.createElement('div');
        Object.assign(wizardWrapper.style, {
            width: '100%',
            maxWidth: '900px', // Увеличиваем лимит, чтобы карточки выстраивались в красивые ряды по 3-4 штуки
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: '#fff',
            boxSizing: 'border-box'
        });

        const title = document.createElement('h2');
        title.textContent = currentLang === 'ru' ? 'Создание новой игры' : 'Create New Game';
        title.style.margin = '0 0 10px 0';
        wizardWrapper.appendChild(title);

        // Поле ввода имени игры
        const nameGroup = document.createElement('div');
        Object.assign(nameGroup.style, { display: 'flex', flexDirection: 'column', gap: '6px' });

        const nameLabel = document.createElement('label');
        nameLabel.textContent = currentLang === 'ru' ? 'НАЗВАНИЕ ИГРЫ:' : 'GAME TITLE:';
        nameLabel.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; letter-spacing:0.5px;grid-column: 1 / -1';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = 'New Game';
        Object.assign(nameInput.style, {
            padding: '12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
            borderRadius: '4px', color: '#fff', fontSize: '14px', outline: 'none', maxWidth:'320px'
        });

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        wizardWrapper.appendChild(nameGroup);

        const genresGroup = document.createElement('div');
        Object.assign(genresGroup.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            marginTop: '15px',
            width: '100%'
        });

        const genresLabel = document.createElement('label');
        genresLabel.textContent = currentLang === 'ru' ? 'ВЫБЕРИТЕ ЖАНРЫ ИГРЫ' : 'SELECT GAME GENRES';
        genresLabel.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; letter-spacing:0.5px;grid-column: 1 / -1;';
        genresGroup.appendChild(genresLabel);

        // Данные берем из структуры, аналогичной нашему selectOptionsRegistry
        const wizardGenres = this.selectOptionsRegistry['main.genres'].options;

        const selectedGenresSet = new Set();

        wizardGenres.forEach(genre => {
            const row = document.createElement('label');
            Object.assign(row.style, {
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                backgroundColor: '#161d2a', border: '1px solid #232d38', borderRadius: '4px',
                cursor: 'pointer', transition: 'border-color 0.2s'
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cursor = 'pointer';
            checkbox.onclick = () => {
                if (checkbox.checked) {
                    selectedGenresSet.add(genre.id);
                    row.style.borderColor = '#2ea44f'; // Подсветим зеленым для отличия от шаблонов
                } else {
                    selectedGenresSet.delete(genre.id);
                    row.style.borderColor = '#232d38';
                }
            };

            const txt = document.createElement('span');
            txt.textContent = currentLang === 'ru' ? genre.labelRu : genre.labelEn;
            txt.style.fontSize = '13px';

            row.appendChild(checkbox);
            row.appendChild(txt);
            genresGroup.appendChild(row);
        });

        wizardWrapper.appendChild(genresGroup);

        // Секция выбора шаблонов
        const templateGroup = document.createElement('div');
        Object.assign(templateGroup.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', // Колонки будут адаптироваться под ширину
            gap: '12px',
            marginTop: '10px',
            width: '100%' // Убираем ограничение в 500px, даем занять всю доступную ширину доски
        });

        const templateLabel = document.createElement('label');
        templateLabel.textContent = currentLang === 'ru' ? 'ВЫБЕРИТЕ ШАБЛОНЫ ЖАНРОВ (Можно несколько):' : 'SELECT GAME TEMPLATES (Multi-select):';
        templateLabel.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; letter-spacing:0.5px;grid-column: 1 / -1;';
        templateGroup.appendChild(templateLabel);

        const templates = [
            { id: 'rpg', nameRu: '⚔️ Ролевая игра (RPG)', nameEn: '⚔️ Role-Playing Game (RPG)' },
            { id: 'strategy', nameRu: '🧠 Стратегия (Strategy)', nameEn: '🧠 Strategy' },
            { id: 'visual_novel', nameRu: '📖 Визуальная новелла (Novel)', nameEn: '📖 Visual Novel' }
        ];

        const selectedTemplates = new Set();

        templates.forEach(tpl => {
            const row = document.createElement('label');
            Object.assign(row.style, {
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                backgroundColor: '#161d2a', border: '1px solid #232d38', borderRadius: '4px',
                cursor: 'pointer', transition: 'border-color 0.2s'
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cursor = 'pointer';
            checkbox.onclick = () => {
                if (checkbox.checked) {
                    selectedTemplates.add(tpl.id);
                    row.style.borderColor = '#3498db';
                } else {
                    selectedTemplates.delete(tpl.id);
                    row.style.borderColor = '#232d38';
                }
            };

            const txt = document.createElement('span');
            txt.textContent = currentLang === 'ru' ? tpl.nameRu : tpl.nameEn;
            txt.style.fontSize = '13px';

            row.appendChild(checkbox);
            row.appendChild(txt);
            templateGroup.appendChild(row);
        });

        wizardWrapper.appendChild(templateGroup);

        // Кнопка подтверждения
        const submitBtn = document.createElement('button');
        submitBtn.textContent = currentLang === 'ru' ? 'Создать игру и настроить ➔' : 'Create Game & Open Settings ➔';
        Object.assign(submitBtn.style, {
            width: '280px', // Компактный размер для аккуратного вида
            alignSelf: 'center', // Центрируем кнопку внутри flex-контейнера wizardWrapper
            padding: '14px',
            backgroundColor: '#2ea44f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            marginTop: '25px',
            textAlign: 'center'
        });

        submitBtn.onclick = () => {
            const gameName = nameInput.value.trim() || 'Untitled Game';

            // Записываем метаданные в AppState
            if (!AppState.main) AppState.main = {};
            AppState.main.name = gameName;
            AppState.main.templates = Array.from(selectedTemplates);
            AppState.main.genres = Array.from(selectedGenresSet);

            let Map = false;
            let Dialogs = false;
            let Multiplayer = false;
            let Inventory = false;
            let Quests = false;

// Если шаблоны не выбраны, ставим базовый набор
            if (AppState.main.templates.length === 0) {
                Map = true;
                Dialogs = true;
                Inventory = true;
            } else {
                // Включаем фичи, если выбран соответствующий шаблон
                if (AppState.main.templates.includes('rpg')) {
                    Map = true;
                    Dialogs = true;
                    Inventory = true;
                    Quests = true;
                }
                if (AppState.main.templates.includes('strategy')) {
                    Map = true;
                    Multiplayer = true; // Стратегии часто подразумевают мультиплеер
                    Quests = true;
                }
                if (AppState.main.templates.includes('visual_novel')) {
                    Dialogs = true;
                    // Для чистой новеллы карта и инвентарь по умолчанию false,
                    // но если выбран еще и RPG (RPG + VN), то условия выше их включат!
                }
            }

// 2. Применяем дефолты в AppState.main
            Object.assign(AppState.main, {
                genres: Array.from(selectedGenresSet),

                version: "0.0.1",
                description: "Game description...",

                MovementControls: ['click'],
                Grid: true,
                MovementCells: true,
                MovementLine: true,

                Map,
                Dialogs,
                Multiplayer,
                Inventory,
                Quests
            });

            // Инициализируем настройки дефолтными значениями
            this._applyTemplateAndInitSettings();

            // Переключаем интерфейс на основной трехпанельный редактор настроек
            boardContainer.style.justifyContent = 'stretch';
            boardContainer.style.alignItems = 'stretch';
            this._renderMainEditorInterface(boardContainer, currentLang);
        };

        wizardWrapper.appendChild(submitBtn);
        boardContainer.appendChild(wizardWrapper);
    }

    /**
     * НАПОЛНЕНИЕ APPSTATE ДЕФОЛТНЫМИ НАСТРОЙКАМИ ПРИ СОЗДАНИИ
     */
    _applyTemplateAndInitSettings() {

        if (!AppState.main) AppState.main = {};

        // Сохраняем имя и жанры, которые уже пришли из формы Мастера,
        // и подмешиваем новые дефолтные геймплейные параметры:

        // Базовые настройки ходов
        AppState.turn_settings = {
            free_roam: true,
            turn_by: 'character',
            turn_mode: 'realtime',
            virtual_turn_ms: 1000,
            realtime_tick_ms: 16
        };

        // Базовые игровые настройки
        AppState.game_settings = {
            playerType: 'faction',
            playAs: [],
            playerAttack: 'manual',
            playerCamera: 'fixed',
            playerZoom: false,
            battleType: 'instant',
            battleOpenMap: true,
            battleFreeMove: true,
            ui: {
                character: 'left-top',
                lang: 'en'
            },
            nextLevelXpFormula: "100 * Math.pow(L, 1.5)",
            killExpFormula: "10 * Math.pow(L1, 1.5) / Math.pow(L2, 1.5)",
            killExpShare: true,
            killExpTiming: 'instant',
            audio: {
                music: { mute: true, volume: 70, currentTrack: null },
                sfx:   { mute: false, volume: 80 },
                speech:{ mute: false, volume: 100 }
            }
        }

        AppState.animation = {
            "framesPerSecond": 60,
            "attackTime":1000,
            "castTime":1000,
            "movePerHexTime":1000,
            "runPerHexTime":500,
            "jumpPerHexTime":500,
            "fallPerHexTime":200,
            "dashPerHexTime":200
        };

        // Логику подмешивания специфичных для шаблонов полей можно дописать здесь
        // (Например, если AppState.project_meta.templates включает 'rpg')
    }

    /**
     * ГЕНЕРАЦИЯ ОСНОВНОГО ИНТЕРФЕЙСА РЕДАКТОРА НАСТРОЕК (ДВЕ ПАНЕЛИ: ТАБЫ -> ФОРМА)
     */
    _renderMainEditorInterface(boardContainer, currentLang) {
        boardContainer.innerHTML = '';

        // Верхняя шапка с мета-информацией о проекте
        const header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', padding: '15px 20px', backgroundColor: '#161d2a',
            borderBottom: '2px solid #232d38', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', boxSizing: 'border-box'
        });

        const info = document.createElement('div');
        const projName = AppState.project_meta?.name || (currentLang === 'ru' ? 'Редактирование настроек' : 'Edit Game Settings');
        const projTpl = AppState.project_meta?.templates?.length
            ? `[${AppState.project_meta.templates.join(', ').toUpperCase()}]`
            : '';
        info.innerHTML = `<span style="color:#fff; font-weight:bold; font-size:14px;">${projName}</span> <span style="color:#3498db; font-size:12px; font-weight:bold; margin-left:8px;">${projTpl}</span>`;
        header.appendChild(info);
        boardContainer.appendChild(header);

        // Основное рабочее пространство (Табы слева, Форма справа)
        const workspace = document.createElement('div');
        Object.assign(workspace.style, { width: '100%', flex: '1', display: 'flex', overflow: 'hidden' });
        boardContainer.appendChild(workspace);

        // ПАНЕЛЬ 1: Список объектов из AppState (Вкладки/Табы)
        const tabsPanel = document.createElement('div');
        Object.assign(tabsPanel.style, {
            width: '30%', borderRight: '1px solid #232d38', padding: '15px',
            display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', backgroundColor: '#111622'
        });

        const panelTitle = document.createElement('h4');
        panelTitle.textContent = currentLang === 'ru' ? '⚙️ КОНФИГУРАЦИИ' : '⚙️ CONFIGURATIONS';
        panelTitle.style.cssText = 'color:#ffd166; margin:0 0 5px 0; font-size:12px; letter-spacing:1px; font-weight:bold;';
        tabsPanel.appendChild(panelTitle);

        const tabsScroll = document.createElement('div');
        Object.assign(tabsScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' });
        tabsPanel.appendChild(tabsScroll);
        workspace.appendChild(tabsPanel);

        // ПАНЕЛЬ 2: Форма параметров выбранного объекта
        const formPanel = document.createElement('div');
        Object.assign(formPanel.style, {
            width: '70%', padding: '20px', display: 'flex', flexDirection: 'column',
            gap: '15px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: '#141a27'
        });
        workspace.appendChild(formPanel);

        // Массив доступных корневых объектов-конфигов в AppState
        const availableTabs = [
            { id: 'main', nameRu: 'Главное', nameEn: 'Main' }, // Добавлено!
            { id: 'game_settings', nameRu: 'Основные настройки', nameEn: 'General Settings' },
            { id: 'animation', nameRu: 'Настройки анимации', nameEn: 'Animation Settings' },
            { id: 'turn_settings', nameRu: 'Настройки ходов', nameEn: 'Turn Settings' },
        ];

        // Функция обновления отображения вкладок
        const refreshTabsList = () => {
            tabsScroll.innerHTML = '';
            availableTabs.forEach(tab => {
                const tRow = document.createElement('div');
                const isSelected = tab.id === this.currentTab;
                Object.assign(tRow.style, {
                    padding: '12px 15px', backgroundColor: isSelected ? '#232d38' : '#1b2432',
                    border: isSelected ? '1px solid #34495e' : '1px solid #2d394b',
                    borderRadius: '4px', color: '#fff', fontSize: '13px', cursor: 'pointer',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center'
                });
                tRow.textContent = currentLang === 'ru' ? tab.nameRu : tab.nameEn;

                tRow.onclick = () => {
                    this.currentTab = tab.id;
                    refreshTabsList();
                    renderFormForCurrentTab();
                };
                tabsScroll.appendChild(tRow);
            });
        };

        const renderFormForCurrentTab = () => {
            if (!AppState[this.currentTab]) AppState[this.currentTab] = {};

            // =========================================================================
            // 🛡️ БЕЗОПАСНОЕ ПОДМЕШИВАНИЕ ДЕФОЛТОВ (Только для отсутствующих полей)
            // =========================================================================
            if (this.currentTab === 'main') {
                const mainDefaults = {
                    game_name: "New Game",
                    genres: [],
                    version: "1.0.0",
                    description: "",
                    Map: true,
                    Dialogs: true,
                    Multiplayer: false,
                    Inventory: true,
                    Quests: true,
                    MovementControls: ['click'],
                    Grid: true,
                    MovementCells: true,
                    MovementLine: true
                };

                // Пробегаемся по дефолтам: если поля в AppState.main нет, то лениво добавляем его
                Object.keys(mainDefaults).forEach(key => {
                    if (AppState.main[key] === undefined) {
                        AppState.main[key] = mainDefaults[key];
                    }
                });
            }
            // Подстраховка дефолтов для game_settings, если вы будете открывать старые сейвы
            else if (this.currentTab === 'game_settings') {
                const gameDefaults = {
                    playerType: 'faction',
                    playAs: [],
                    playerAttack: 'manual',
                    playerCamera: 'fixed',
                    playerZoom: false,
                    battleType: 'instant',
                    battleOpenMap: true,
                    battleFreeMove: true,
                    nextLevelXpFormula: "100 * Math.pow(L, 1.5)",
                    killExpFormula: "10 * Math.pow(L1, 1.5) / Math.pow(L2, 1.5)",
                    killExpShare: true,
                    killExpTiming: 'instant'
                };

                Object.keys(gameDefaults).forEach(key => {
                    if (AppState.game_settings[key] === undefined) {
                        AppState.game_settings[key] = gameDefaults[key];
                    }
                });
            }
            else if (this.currentTab === 'animation') {
                const gameDefaults = {
                    "framesPerSecond": 60,
                    "attackTime":1000,
                    "castTime":1000,
                    "movePerHexTime":1000,
                    "runPerHexTime":500,
                    "jumpPerHexTime":500,
                    "fallPerHexTime":200,
                    "dashPerHexTime":200
                };

                Object.keys(gameDefaults).forEach(key => {
                    if (AppState.animation[key] === undefined) {
                        AppState.animation[key] = gameDefaults[key];
                    }
                });
            }

            // --- ДАЛЬШЕ ИДЕТ ВАШ СТАНДАРТНЫЙ КОД ОТРЕНДЕРА ФОРМЫ ---
            const targetDataObj = AppState[this.currentTab];

            // Очищаем панель перед рендером (как в вашем файле ScreenEditor)
            formPanel.innerHTML = '';

            this._renderDynamicForm(formPanel, targetDataObj, this.currentTab, currentLang, () => {
                if (AppState.engine?.settingsManager?.update) {
                    AppState.engine.settingsManager.update();
                }
            });
        };


        // Запуск начальной отрисовки
        refreshTabsList();
        renderFormForCurrentTab();
    }

    /**
     * БЕЗХАРДКОДНЫЙ ДИНАМИЧЕСКИЙ РЕНДЕР ФОРМЫ (РЕКУРСИЯ ПО КЛЮЧАМ ОБЪЕКТА)
     */
    _renderDynamicForm(targetContainer, dataObject, rootKey, currentLang, onSaveCallback) {
        targetContainer.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = currentLang === 'ru' ? `Параметры секции: ${rootKey}` : `Properties for: ${rootKey}`;
        title.style.cssText = 'color:#fff; margin:0 0 15px 0; font-size:14px; border-bottom:1px solid #232d38; padding-bottom:8px;';
        targetContainer.appendChild(title);

        const formFieldsRegistry = [];
        const formWrapper = document.createElement('div');
        Object.assign(formWrapper.style, { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' });

        const mapFieldsGroup = document.createElement('div');
        mapFieldsGroup.id = 'main-map-dependent-fields';
        Object.assign(mapFieldsGroup.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: '100%'
        });

        const buildInputsRecursively = (obj, parentPath = [], container = formWrapper) => {
            Object.entries(obj).forEach(([key, value]) => {
                const currentPath = [...parentPath, key];
                const fullPathString = [rootKey, ...currentPath].join('.');

                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' });

                const label = document.createElement('label');
                label.textContent = currentPath.join('.').toUpperCase();
                label.style.cssText = 'color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace;';
                row.appendChild(label);

                const registryMatch = this.selectOptionsRegistry[fullPathString];
                if (registryMatch && registryMatch.isMultiSelect) {
                    const checkboxContainer = document.createElement('div');
                    Object.assign(checkboxContainer.style, {
                        display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px',
                        backgroundColor: '#1b2432', border: '1px solid #2d394b', borderRadius: '4px'
                    });

                    registryMatch.options.forEach(opt => {
                        const itemLabel = document.createElement('label');
                        Object.assign(itemLabel.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '13px' });

                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.value = opt.value;
                        cb.className = 'multi-select-item-checkbox'; // маркер для сбора данных

                        // Проверяем, выбран ли жанр в текущем массиве AppState
                        if (Array.isArray(value) && value.includes(opt.value)) {
                            cb.checked = true;
                        }

                        itemLabel.appendChild(cb);
                        itemLabel.appendChild(document.createTextNode(currentLang === 'ru' ? opt.labelRu : opt.labelEn));
                        checkboxContainer.appendChild(itemLabel);
                    });

                    row.appendChild(checkboxContainer);


                    // Регистрируем элемент, помечая его специальным типом 'multiselect'
                    formFieldsRegistry.push({ path: currentPath, inputElement: checkboxContainer, originalType: 'multiselect' });
                }
                else if (fullPathString === 'game_settings.playAs') {
                    const checkboxContainer = document.createElement('div');
                    checkboxContainer.id = 'multiselect-play-as-container';
                    Object.assign(checkboxContainer.style, {
                        display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px',
                        backgroundColor: '#1b2432', border: '1px solid #2d394b', borderRadius: '4px'
                    });

                    // Определяем источник данных на основе текущего playerType
                    const currentPlayerType = AppState.game_settings?.playerType || 'character';
                    let availableSource = [];

                    if (currentPlayerType === 'character') {
                        // Загружаем из AppState.characters (ожидаем массив объектов типа { id: '...', name: '...' })
                        availableSource = Object.keys(AppState.characters || {});
                    } else if (currentPlayerType === 'faction') {
                        // Загружаем из AppState.factions
                        availableSource = Object.keys(AppState.factions || []);
                    } else {
                        // Загружаем из AppState.teams или любой другой ветки
                        availableSource = Object.keys(AppState.characters || []);
                    }

                    // Рендерим чекбоксы на основе динамического источника
                    availableSource.forEach(item => {
                        const itemLabel = document.createElement('label');
                        Object.assign(itemLabel.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '13px' });

                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.value = item.id;
                        cb.className = 'multi-select-item-checkbox'; // этот класс используется в saveBtn.onclick для сбора данных

                        // Проверяем, выбрано ли уже это значение в массиве playAs
                        if (Array.isArray(value) && value.includes(item.id)) {
                            cb.checked = true;
                        }

                        itemLabel.appendChild(cb);
                        itemLabel.appendChild(document.createTextNode(item.name || item.id));
                        checkboxContainer.appendChild(itemLabel);
                    });

                    row.appendChild(checkboxContainer);


                    // Регистрируем элемент в вашем реестре как 'multiselect'
                    formFieldsRegistry.push({ path: currentPath, inputElement: checkboxContainer, originalType: 'multiselect' });
                    return; // Выходим из итерации для этого поля
                }
                // А. Обработка вложенных объектов (например, ui или audio)
                else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const group = document.createElement('div');
                    Object.assign(group.style, {
                        padding: '10px 15px', borderLeft: '2px solid #34495e',
                        backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px'
                    });
                    row.appendChild(group);


                    // Рекурсивный спуск вглубь объекта настроек
                    buildInputsRecursively(value, currentPath, group);
                }
                // Б. Логика для полей, зарегистрированных как Выпадающий список (SELECT)
                else if (this.selectOptionsRegistry[fullPathString]) {
                    const select = document.createElement('select');
                    select.id = fullPathString;
                    Object.assign(select.style, {
                        padding: '10px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '4px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                    });

                    select.addEventListener('change', () => {
                        // 1. Сначала записываем измененный playerType в объект данных
                        this._setDeepValueByPath(dataObject, currentPath, select.value);

                        // 2. ТОЧЕЧНОЕ ОБНОВЛЕНИЕ ПО ID:
                        if (fullPathString === 'game_settings.playerType') {
                            const targetContainer = this.modalElement.querySelector('#multiselect-play-as-container');

                            if (targetContainer) {
                                let availableSource = [];
                                const newType = select.value; // 'character', 'faction' или 'team'

                                // Определяем источник данных на основе нового выбранного типа
                                if (newType === 'character') {
                                    availableSource = AppState.characters || [];
                                } else if (newType === 'faction') {
                                    availableSource = AppState.factions || [];
                                } else {
                                    availableSource = AppState.teams || [];
                                }

                                // Очищаем только внутренности контейнера playAs, не трогая остальную форму!
                                targetContainer.innerHTML = '';

                                // Генерируем новые чекбоксы
                                availableSource.forEach(item => {
                                    const itemLabel = document.createElement('label');
                                    Object.assign(itemLabel.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '13px' });

                                    const cb = document.createElement('input');
                                    cb.type = 'checkbox';
                                    cb.value = item.id;
                                    cb.className = 'multi-select-item-checkbox';

                                    // Так как тип изменился (например, с воинов на фракции), сбрасываем старый массив выбранного
                                    // или оставляем пустым, так как старые id персонажей не подойдут к фракциям
                                    AppState.game_settings.playAs = [];

                                    itemLabel.appendChild(cb);
                                    itemLabel.appendChild(document.createTextNode(item.name || item.id));
                                    targetContainer.appendChild(itemLabel);
                                });
                            }
                        }
                    });

                    // Заполнение опций селекта из реестра
                    this.selectOptionsRegistry[fullPathString].forEach(opt => {
                        const optionTag = document.createElement('option');
                        optionTag.value = opt.value;
                        optionTag.textContent = currentLang === 'ru' ? opt.labelRu : opt.labelEn;
                        if (opt.value === value) optionTag.selected = true;
                        select.appendChild(optionTag);
                    });

                    row.appendChild(select);

                    formFieldsRegistry.push({ path: currentPath, inputElement: select, originalType: 'string' });
                }
                // В. Логика для логических флагов (ЧЕКБОКСЫ для boolean значений)
                else if (typeof value === 'boolean') {
                    const checkboxLabel = document.createElement('label');
                    Object.assign(checkboxLabel.style, {
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                        backgroundColor: '#1b2432', border: '1px solid #2d394b', borderRadius: '4px', cursor: 'pointer'
                    });

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = value;
                    checkbox.style.cursor = 'pointer';

                    checkbox.addEventListener('change', () => {
                        // 1. Запись текущего состояния в JS-объект (Ваш существующий код)
                        this._setDeepValueByPath(dataObject, currentPath, checkbox.checked);

                        // 2. ДИНАМИЧЕСКОЕ СКРЫТИЕ ПО ID:
                        if (fullPathString === 'main.Map') {
                            const dependentGroup = this.modalElement.querySelector('#main-map-dependent-fields');
                            if (dependentGroup) {
                                // Если галочка стоит — показываем блок настроек, если снята — полностью скрываем
                                dependentGroup.style.display = checkbox.checked ? 'flex' : 'none';
                            }
                        }
                    });

                    const statusText = document.createElement('span');
                    statusText.textContent = value ? 'TRUE' : 'FALSE';
                    statusText.style.cssText = 'color:#fff; font-size:12px; font-weight:bold; font-family:monospace;';

                    checkbox.onchange = () => {
                        statusText.textContent = checkbox.checked ? 'TRUE' : 'FALSE';
                    };

                    checkboxLabel.appendChild(checkbox);
                    checkboxLabel.appendChild(statusText);
                    row.appendChild(checkboxLabel);


                    formFieldsRegistry.push({ path: currentPath, inputElement: checkbox, originalType: 'boolean' });
                }
                else if (key === 'description') {
                    // Для описания создаем просторную текстовую область textarea
                    const textarea = document.createElement('textarea');
                    Object.assign(textarea.style, {
                        padding: '10px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '4px', color: '#fff', fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'sans-serif'
                    });
                    textarea.value = value || '';

                    row.appendChild(textarea);

                    formFieldsRegistry.push({ path: currentPath, inputElement: textarea, originalType: typeof value });
                }
                // Г. Стандартные плоские поля (числа, строки, математические формулы)
                else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = value !== undefined ? value : '';
                    Object.assign(input.style, {
                        padding: '10px 12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '4px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                    });

                    row.appendChild(input);

                    formFieldsRegistry.push({ path: currentPath, inputElement: input, originalType: typeof value });
                }

                const mapDependentKeys = ['MovementControls', 'Grid', 'MovementCells', 'MovementLine'];

                if (rootKey === 'main' && mapDependentKeys.includes(key)) {
                    // Складываем эти поля в отдельную группу для карты
                    mapFieldsGroup.appendChild(row);
                } else {
                    container.appendChild(row);
                }
            });
            if (rootKey === 'main' && AppState.main?.Map) {
                container.appendChild(mapFieldsGroup);
                const hasMapActive = AppState.main?.Map === true;
                mapFieldsGroup.style.display = hasMapActive ? 'flex' : 'none';
            }
        };

        buildInputsRecursively(dataObject);
        targetContainer.appendChild(formWrapper);

        // Кнопка сохранения параметров формы
        const saveBtn = document.createElement('button');
        saveBtn.textContent = currentLang === 'ru' ? '💾 Сохранить конфигурацию' : '💾 Save Settings';
        Object.assign(saveBtn.style, {
            width: '100%', padding: '12px', backgroundColor: '#3498db', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
            fontSize: '13px', marginTop: '15px'
        });

        saveBtn.onclick = () => {
            // Собираем измененные данные обратно в JS-объект AppState[rootKey]
            formFieldsRegistry.forEach(field => {
                let typedValue;
                if (field.originalType === 'boolean') {
                    typedValue = field.inputElement.checked;
                }
                else if (field.originalType === 'number') {
                    const rawVal = field.inputElement.value;
                    typedValue = rawVal === '' ? 0 : Number(rawVal);
                }
                else if (field.originalType === 'multiselect') {
                    const checkedBoxes = field.inputElement.querySelectorAll('.multi-select-item-checkbox:checked');
                    typedValue = Array.from(checkedBoxes).map(cb => cb.value);
                }
                else {
                    typedValue = field.inputElement.value;
                }
                this._setDeepValueByPath(dataObject, field.path, typedValue);
            });

            if (rootKey === 'main') {
                // Если геймдизайнер включил флаг hasMap, проверяем и инициализируем AppState.maps
                if (AppState.main && AppState.main.Map === true) {
                    if (!AppState.maps) {
                        AppState.maps = {
                            'world_map': {
                                mapId: 'world_map',
                                tiles: new Map() // Пустая Hex-сетка, готовая к наполнению
                            }
                        };
                        AppState.maps.world_map.tiles.set('0,0', {
                            "q": 0,
                            "r": 0,
                            "col": 0,
                            "row": 0,
                            "type": "ocean",
                            "height": 1,
                            "imageIndex": 1,
                            "region": null,
                            "province": null,
                            "faction": null,
                            "population": 0,
                            "units": [],
                            "worldObject": null
                        });
                    }
                }
            }

            onSaveCallback();

            // Индикация успешного сохранения
            const successFlash = document.createElement('div');
            successFlash.textContent = currentLang === 'ru' ? '✓ Настройки успешно сохранены' : '✓ Settings Saved Successfully';
            successFlash.style.cssText = 'color:#2ea44f; font-size:12px; font-weight:bold; margin-top:8px; text-align:center;';
            targetContainer.appendChild(successFlash);
            setTimeout(() => successFlash.remove(), 1500);
        };

        targetContainer.appendChild(saveBtn);
    }

    /**
     * Вспомогательный метод глубокой мутации JS-объектов
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

    /**
     * Удаление модального окна из DOM
     */
    _removeExistingModal() {
        const oldModal = document.getElementById('game-settings-editor-modal');
        if (oldModal) oldModal.remove();
        this.modalElement = null;
    }
}

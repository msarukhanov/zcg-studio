import { AppState } from '../shared/GameState.js';

export function renderSettingsScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    const activeScreenId = screenManager.currentScreenId || 'main_menu';

    // 1. Закрываем старое меню штатным методом без innerHTML костылей
    screenManager.clearCurrentScreen();

    // 2. Создаем чистый независимый оверлей настроек поверх карты/фона
    const settingsWrapper = document.createElement('div');
    settingsWrapper.id = 'screen-system_settings_menu';
    settingsWrapper.style.pointerEvents = 'auto';
    Object.assign(settingsWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100vh',
        backgroundColor: 'rgba(12, 17, 24, 0.98)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // Центральная доска настроек
    const board = document.createElement('div');
    Object.assign(board.style, {
        width: '340px', padding: '25px', backgroundColor: '#111622',
        border: '1px solid #3a4759', borderRadius: '8px', display: 'flex',
        flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', position: 'relative'
    });

    const title = document.createElement('h3');
    title.textContent = _t('ui.btn_game_settings');
    title.style.cssText = 'color:#fff; text-align:center; margin:0 0 5px 0; font-size:14px; letter-spacing:1px;';
    board.appendChild(title);

    // --- Вспомогательный метод для создания красивых строк управления ---
    const createSettingRow = (labelText, controlElement) => {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' });
        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.cssText = 'color:#a0a5b5; font-size:12px; font-weight:bold;';
        row.appendChild(label);
        row.appendChild(controlElement);
        return row;
    };

    // =========================================================================
    // 🌐 1. УПРАВЛЕНИЕ ЯЗЫКОМ (RU / EN)
    // =========================================================================
    const langBtn = document.createElement('button');
    langBtn.textContent = AppState.game_settings.language === 'ru' ? '🇷🇺 Русский' : '🇺🇸 English';
    Object.assign(langBtn.style, { padding: '6px 14px', backgroundColor: '#2c3e50', border: '1px solid #3a4759', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });

    langBtn.onclick = () => {
        // Переключаем язык в стейте
        AppState.engine.TranslateManager.setLanguage(AppState.game_settings.language === 'ru' ? 'en' : 'ru');
        AppState.game_settings.language = AppState.game_settings.language === 'ru' ? 'en' : 'ru';


        // Перерисовываем экран настроек, чтобы мгновенно обновить тексты!
        screenManager.rootContainer.removeChild(settingsWrapper);
        screenManager.handleWidgetAction('open_settings');
    };
    board.appendChild(createSettingRow(_t('ui.game_language'), langBtn));

    // =========================================================================
    // 🖥️ 2.5. КНОПКА ПЕРЕКЛЮЧЕНИЯ ПОЛНОЭКРАННОГО РЕЖИМА (БРАУЗЕР / TELEGRAM)
    // =========================================================================
    const fsBtn = document.createElement('button');
    fsBtn.textContent = _t('ui.full_screen');

    Object.assign(fsBtn.style, {
        padding: '6px 14px',
        backgroundColor: '#2c3e50',
        border: '1px solid #3a4759',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer'
    });

    fsBtn.onclick = () => {
        const isTelegram = typeof window.Telegram !== 'undefined' && window.Telegram?.WebApp;

        if (isTelegram) {
            const tg = window.Telegram.WebApp;
            if (!tg.isExpanded) {
                tg.expand(); // Нативный разворот в Telegram TWA [|]
            }
            if (typeof tg.enableClosingConfirmation === 'function') {
                tg.enableClosingConfirmation(); // Защита от случайного свайпа-закрытия
            }
        } else {
            // Фолбэк для обычных браузеров [|]
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn(`[ScreenManager] Не удалось включить Fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
    };

    const fsLabel = _t('ui.not_full_screen');
    board.appendChild(createSettingRow(fsLabel, fsBtn));
    // =========================================================================

    // =========================================================================
    // 🔊 2. УПРАВЛЕНИЕ АУДИОКАНАЛАМИ С ПОЛЗУНКАМИ ГРОМКОСТИ
    // =========================================================================
    const audioChannels = [
        { key: 'music', label: _t('ui.music') },
        { key: 'sfx', label: _t('ui.sfx') },
        { key: 'speech', label:  _t('ui.speech') }
    ];

    audioChannels.forEach(chan => {
        const cfg = AppState.game_settings.audio[chan.key];

        // Создаем контейнер для элементов управления (кнопка + ползунок)
        const controlsContainer = document.createElement('div');
        Object.assign(controlsContainer.style, {
            display: 'flex', alignItems: 'center', gap: '8px', width: '180px'
        });

        // 1. Иконка-тумблер быстрого Mute
        const muteIconBtn = document.createElement('button');
        muteIconBtn.textContent = cfg.mute ? '❌' : '🔊';
        Object.assign(muteIconBtn.style, {
            padding: '4px 8px', backgroundColor: cfg.mute ? '#e74c3c' : '#34495e',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'
        });

        // 2. Ползунок громкости (HTML5 Range Input)
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = cfg.volume !== undefined ? cfg.volume : 70;
        Object.assign(volumeSlider.style, {
            flex: '1', height: '6px', cursor: 'pointer', accentColor: '#2ea44f'
        });

        // Логика переключения Mute по иконке
        muteIconBtn.onclick = () => {
            cfg.mute = !cfg.mute;
            muteIconBtn.textContent = cfg.mute ? '❌' : '🔊';
            muteIconBtn.style.backgroundColor = cfg.mute ? '#e74c3c' : '#34495e';

            // Визуально глушим ползунок, если включен Mute
            volumeSlider.style.opacity = cfg.mute ? '0.4' : '1';

            if (window.AudioManager?.syncSettings) window.AudioManager.syncSettings();
        };

        // Логика изменения ползунка (срабатывает ПРИ ПЕРЕМЕЩЕНИИ пальца/мыши)
        volumeSlider.oninput = (e) => {
            const newVolume = parseInt(e.target.value, 10);
            cfg.volume = newVolume;

            // Если игрок двигает ползунок, автоматически снимаем Mute, если он был включен
            if (cfg.mute && newVolume > 0) {
                cfg.mute = false;
                muteIconBtn.textContent = '🔊';
                muteIconBtn.style.backgroundColor = '#34495e';
                volumeSlider.style.opacity = '1';
            }

            // Дёргаем микшер для мгновенного изменения громкости часового трека в реальном времени!
            if (window.AudioManager?.syncSettings) window.AudioManager.syncSettings();
        };

        // Начальное состояние прозрачности ползунка
        volumeSlider.style.opacity = cfg.mute ? '0.4' : '1';

        controlsContainer.appendChild(muteIconBtn);
        controlsContainer.appendChild(volumeSlider);

        board.appendChild(createSettingRow(chan.label, controlsContainer));
    });


    // =========================================================================
    // ⬅️ 3. КНОПКА «НАЗАД» С ПОЛНЫМ ВОССТАНОВЛЕНИЕМ МЕНЮ ИЗ JSON
    // =========================================================================
    const backBtn = document.createElement('button');
    backBtn.textContent = _t('ui.saveExit');
    Object.assign(backBtn.style, {
        marginTop: '10px', padding: '10px', backgroundColor: '#34495e', border: '1px solid #4f5d73',
        borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%'
    });

    backBtn.onclick = () => {
        screenManager.rootContainer.removeChild(settingsWrapper); // Чисто сносим оверлей настроек
        screenManager.renderScreen(activeScreenId, AppState); // Восстанавливаем старое меню по его JSON-конфигу!

        // Если в игре есть глобальный uiManager.updateAll(), дёргаем его, чтобы обновить верхний виджет ресурсов под новый язык
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    };
    board.appendChild(backBtn);

    // saveWrapper = settingsWrapper; // Используем локальную переменную или монтируем в корень напрямую
    settingsWrapper.appendChild(board);
    screenManager.rootContainer.appendChild(settingsWrapper);
}
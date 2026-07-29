import { AppState } from '../shared/GameState.js';

export function renderSavesScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    const currentLang = AppState.game_settings?.language || 'en';
    const saves = AppState.player.saves || [];

    // 1. Запоминаем ID экрана, из которого мы уходим, чтобы потом вернуться назад
    const previousScreenId = screenManager.currentScreenId || 'main_menu';

    // 2. СТРОГИЙ ФИКС: Гасим старое меню твоим родным методом!
    // Никаких innerHTML = '', все старые кнопки аккуратно удаляются из памяти.
    screenManager.clearCurrentScreen();

    // 3. Строим абсолютно изолированный новый оверлей для сейвов с нуля
    const saveWrapper = document.createElement('div');
    saveWrapper.id = 'screen-save_slots_menu';
    saveWrapper.style.pointerEvents = 'auto';
    Object.assign(saveWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100vh',
        backgroundColor: 'rgba(12, 17, 24, 0.98)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: '999', fontFamily: 'sans-serif'
    });

    // Центральная доска для списка сейвов
    const board = document.createElement('div');
    Object.assign(board.style, {
        width: '320px', padding: '25px', backgroundColor: '#111622',
        border: '1px solid #34495e', borderRadius: '8px', display: 'flex',
        flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', position: 'relative'
    });

    const title = document.createElement('h3');
    title.textContent = _t('ui.select_save_slot');
    title.style.cssText = 'color:#fff; text-align:center; margin:0 0 15px 0; font-size:15px;';
    board.appendChild(title);

    const scrollBox = document.createElement('div');
    Object.assign(scrollBox.style, {
        display: 'flex', flexDirection: 'column', gap: '8px',
        maxHeight: '260px', overflowY: 'auto', boxSizing: 'border-box', width: '100%'
    });

    // Если сохранений нет
    if (!saves || saves.length === 0) {
        const noSavesText = document.createElement('div');
        noSavesText.textContent = _t('ui.no_save_slots');
        noSavesText.style.cssText = 'color:#6a737d; text-align:center; font-size:12px; padding:20px 0;';
        scrollBox.appendChild(noSavesText);
    } else {
        // Рендерим кнопки сохранений
        saves.forEach(save => {
            const saveBtn = document.createElement('button');
            const dateText = new Date(save.timestamp).toLocaleString('en-US');
            saveBtn.textContent = `${save.slotId} [${dateText}]`;

            Object.assign(saveBtn.style, {
                width: '100%', padding: '12px', backgroundColor: 'rgba(44, 62, 80, 0.5)',
                border: '1px solid #3a4759', borderRadius: '6px', color: '#fff',
                fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center',
                marginBottom: '4px', boxSizing: 'border-box'
            });

            // Клик по сейву загружает дельту
            saveBtn.onclick = async () => {
                const success = await AppState.engine.SaveLoadManager.loadGame(save.slotId);
                if (success) {
                    screenManager.rootContainer.removeChild(saveWrapper); // Сносим экран сейвов
                    if (window.resumeTicker) window.resumeTicker();
                }
            };
            scrollBox.appendChild(saveBtn);
        });
    }
    board.appendChild(scrollBox);

    // Кнопка «Назад» — возвращает в Главное или In-Game меню по его ID
    const backBtn = document.createElement('button');
    backBtn.textContent = _t('ui.saves_back');
    Object.assign(backBtn.style, {
        marginTop: '15px', padding: '8px 24px', backgroundColor: '#e74c3c',
        border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px',
        fontWeight: 'bold', cursor: 'pointer', width: '100%'
    });

    backBtn.onclick = () => {
        screenManager.rootContainer.removeChild(saveWrapper);
        screenManager.renderScreen(previousScreenId, AppState);
    };
    board.appendChild(backBtn);

    saveWrapper.appendChild(board);
    screenManager.rootContainer.appendChild(saveWrapper); // Монтируем экран в корень
}
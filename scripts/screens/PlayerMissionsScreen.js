import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}


// ОБНОВЛЕНО: Глобальный сессионный стейт переименован с QuestsState на MissionsState
export const MissionsState = {
    activeBoard: 'daily' // Текущая доска: 'daily' | 'weekly' | 'daily_login'
};

/**
 * 📋 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер экрана Заданий и Миссий
 */
export function renderPlayerMissionsScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Читаем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    // Помним, что в UI-конфиге ищем по старому ID доски экспедиций, либо по дефолтам
    const screenSettings = configUi[orientation]?.find(w => w.id === 'player_missions') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "220px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const gap = listSettings.gap || "8px";

    const currentBoard = MissionsState.activeBoard;

    // =========================================================================
    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (БЕЗ МУТАЦИИ AppState)
    // =========================================================================
    if (!AppState.missions_data_pack) {
        if (!AppState.config) AppState.config = {};

        // Мокаем каталоги и рецепты наград в AppState.config.missions
        AppState.config.missions = {
            daily_login_calendars: {
                'standard_monthly': {
                    rewards: [
                        { resources: { gold: 1000 } },
                        { items: [{ itemId: 'potion_energy', amount: 2 }] },
                        { resources: { diamond: 50 } },
                        { items: [{ itemId: 'crystal_sh_01', amount: 1 }] },
                        { resources: { gold: 5000 } }
                    ]
                }
            },
            daily: {
                milestones: [
                    { points_required: 20, reward_box: 'box_r_01' },
                    { points_required: 60, reward_box: 'box_sr_01' },
                    { points_required: 100, reward_box: 'box_ssr_01' }
                ],
                task_pool: {
                    't_gacha_01': { title_loc: { ru: 'Призвать героя 1 раз', en: 'Summon 1 Hero' }, target_count: 1, points_reward: 10 },
                    't_bounty_02': { title_loc: { ru: 'Завершить 2 экспедиции', en: 'Complete 2 Bounties' }, target_count: 2, points_reward: 20 }
                }
            },
            weekly: {
                milestones: [
                    { points_required: 50, reward_box: 'box_week_01' },
                    { points_required: 150, reward_box: 'box_week_02' }
                ],
                task_pool: {
                    't_win_campaign': { title_loc: { ru: 'Победить в Кампании 10 раз', en: 'Win 10 Campaign Stages' }, target_count: 10, points_reward: 50 }
                }
            }
        };

        // Мокаем живые состояния игрока
        AppState.daily_login = { current_day_idx: 2, is_today_claimed: false };
        AppState.missions_player_state = {
            daily: { points: 65, tasks: { 't_gacha_01': 1, 't_bounty_02': 1 }, claimed_milestones: [0] },
            weekly: { points: 20, tasks: { 't_win_campaign': 4 }, claimed_milestones: [] }
        };
        AppState.missions_data_pack = true; // Заперли инициализацию
    }

    // =========================================================================
    // 🔍 ПРОВЕРКА КАРКАСА (ЗАЩИТА ОТ ЦИКЛИЧЕСКИХ МИГАНИЙ ПРИ ОБНОВЛЕНИЯХ)
    // =========================================================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-player_missions');

    if (screenWrapper) {
        // Каркас готов! Точечно обновляем центральную сцену
        updateMissionsDynamicShowcase(screenWrapper, currentBoard, headerHeight, headerBg, gap);
        return;
    }

    // --- ЕСЛИ ЭКРАНА ЕЩЕ НЕТ (ПЕРВЫЙ ВХОД), СТРОИМ СТАЦИОНАРНЫЙ КАРКАС ---
    // ОБНОВЛЕНО: Отправка стартового сокет-пакета переведена на 'missions'
    sendSocket('missions', 'getMissionsState', {});

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'player_missions';

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-player_missions';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'row', boxSizing: 'border-box',
        userSelect: 'none', zIndex: '500', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВАЯ КОЛОНКА: САЙДБАР ВКЛАДОК (ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'q-sidebar';
    Object.assign(sidebar.style, {
        display: 'flex', flexDirection: 'column', borderRight: '1px solid #252525',
        padding: '10px', boxSizing: 'border-box', height: '100%', width: sidebarWidth,
        flexShrink: '0', backgroundColor: 'rgba(10,10,10,.8)', gap: '10px', pointerEvents: 'auto'
    });

    const sidebarTitle = document.createElement('div');
    Object.assign(sidebarTitle.style, { fontSize: '11px', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' });
    sidebarTitle.textContent = _t('player_missions.q_boards_hub') || 'Mission Command';
    sidebar.appendChild(sidebarTitle);

    // Описываем структуру вкладок
    const boardsConfig = [
        { id: 'daily', icon: '☀️', label: _t('player_missions.q_daily_board') || 'Daily', activeBg: 'linear-gradient(135deg, #1b263b, #111)', activeBorder: '#2196f3', textColor: '#2196f3' },
        { id: 'weekly', icon: '🌙', label: _t('player_missions.q_weekly_board') || 'Weekly', activeBg: 'linear-gradient(135deg, #2a1b08, #111)', activeBorder: '#ffcc00', textColor: '#ffcc00' },
        { id: 'daily_login', icon: '📅', label: _t('player_missions.q_calendar_tab') || 'Login Rewards', activeBg: 'linear-gradient(135deg, #132a13, #111)', activeBorder: '#4ecca3', textColor: '#4ecca3' }
    ];

    boardsConfig.forEach(b => {
        const isSelected = currentBoard === b.id;

        const tabBtn = document.createElement('div');
        tabBtn.className = 'q-tab-btn';
        tabBtn.setAttribute('data-board', b.id);

        Object.assign(tabBtn.style, {
            width: '100%', height: '44px', background: isSelected ? b.activeBg : '#0c0c0c',
            border: `1px solid ${isSelected ? b.activeBorder : '#222'}`, borderRadius: '6px',
            padding: '0 12px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '10px', transition: 'all 0.2s', flexShrink: '0'
        });

        tabBtn.innerHTML = `<span style="font-size: 18px;">${b.icon}</span><b style="font-size: 12px; color: ${isSelected ? b.textColor : '#aaa'};">${b.label}</b>`;

        tabBtn.onclick = (e) => {
            e.stopPropagation();
            if (MissionsState.activeBoard === b.id) return;

            MissionsState.activeBoard = b.id;

            // Локально перебиваем рамки кнопок в сайдбаре без сноса экрана
            sidebar.querySelectorAll('.q-tab-btn').forEach(btn => {
                const bId = btn.getAttribute('data-board');
                const meta = boardsConfig.find(t => t.id === bId);
                const isBtnSelected = bId === b.id;
                Object.assign(btn.style, { background: isBtnSelected ? meta.activeBg : '#0c0c0c', borderColor: isBtnSelected ? meta.activeBorder : '#222' });
                btn.querySelector('b').style.color = isBtnSelected ? meta.textColor : '#aaa';
            });

            // ОБНОВЛЕНО: Отправка сокетов свитча переведена на 'missions'
            sendSocket('missions', 'getMissionsState', {});
            renderPlayerMissionsScreen(); // Точечный перезапуск
        };

        sidebar.appendChild(tabBtn);
    });
    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 🧱 2. ПРАВАЯ ЗОНА: СТАТИЧНЫЙ СЛОТ ДЛЯ КОНТЕНТА ВЫБРАННОЙ ДОСКИ
    // =========================================================================
    const centerAreaSlot = document.createElement('div');
    centerAreaSlot.className = 'q-center-area-slot';
    Object.assign(centerAreaSlot.style, {
        display: 'flex', flexDirection: 'column', flex: '1', height: '100%',
        backgroundColor: 'rgba(20,20,20,.8)', overflow: 'hidden', padding: '15px', boxSizing: 'border-box'
    });
    screenWrapper.appendChild(centerAreaSlot);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Запускаем первичное точечное вливание списков
    updateMissionsDynamicShowcase(screenWrapper, currentBoard, headerHeight, headerBg, gap);
}

/**
 * 🔄 ТОЧЕЧНОЕ ОБНОВЛЕНИЕ КОНТЕНТА ДОСОК (КАЛЕНДАРЬ ИЛИ СПИСКИ МИССИЙ С ШКАЛОЙ ВЕХ)
 */
function updateMissionsDynamicShowcase(screenWrapper, currentBoard, headerHeight, headerBg, gap) {
    const centerSlot = screenWrapper.querySelector('.q-center-area-slot');
    if (!centerSlot) return;

    centerSlot.innerHTML = ''; // Сносим только контент доски
    const isCalendar = currentBoard === 'daily_login';

    // =========================================================================
    // 📅 РЕЖИМ А: КАЛЕНДАРЬ НАГРАД ЗА ВХОД (DAILY LOGIN)
    // =========================================================================
    if (isCalendar) {
        const calendarId = "standard_monthly";
        const configCalendar = AppState.config?.missions?.daily_login_calendars?.[calendarId] || { rewards: [] };
        const pLogin = AppState.daily_login || { current_day_idx: 0, is_today_claimed: false };

        const calendarWrapper = document.createElement('div');
        Object.assign(calendarWrapper.style, { display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', width: '100%' });

        // Шапка календаря
        const calHeader = document.createElement('div');
        Object.assign(calHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '12px', boxSizing: 'border-box', pointerEvents: 'auto', marginTop: '45px' });
        calHeader.innerHTML = `<div style="text-align: left;"><b style="font-size: 13px; color: #fff; display: block;">${_t('player_missions.q_calendar_title') || 'Божественный Календарь'}</b><span style="font-size: 10px; color: #555;">${_t('player_missions.q_calendar_desc') || 'Заходите в игру каждый день и получайте дары Олимпа.'}</span></div>`;

        const claimBtn = document.createElement('button');
        claimBtn.id = 'q-btn-claim-daily';
        claimBtn.disabled = pLogin.is_today_claimed;
        claimBtn.textContent = pLogin.is_today_claimed ? (_t('player_missions.q_calendar_claimed') || 'Получено ✓') : (_t('player_missions.q_calendar_btn_claim') || 'Забрать Дар');

        Object.assign(claimBtn.style, {
            background: pLogin.is_today_claimed ? '#1a1a1a' : 'linear-gradient(135deg, #4ecca3, #218c65)',
            border: pLogin.is_today_claimed ? '1px solid #333' : 'none',
            color: pLogin.is_today_claimed ? '#555' : '#fff',
            padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: pLogin.is_today_claimed ? 'default' : 'pointer'
        });

        claimBtn.onclick = (e) => {
            e.stopPropagation();
            claimBtn.disabled = true;
            sendSocket('missions', 'claimDailyLogin', { calendarId: 'standard_monthly' });
        };
        calHeader.appendChild(claimBtn);
        calendarWrapper.appendChild(calHeader);

        // Сетка дней
        const grid = document.createElement('div');
        Object.assign(grid.style, { flex: '1', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '8px', background: '#070707', border: '1px solid #1f1f1f', borderRadius: '6px', padding: '10px', boxSizing: 'border-box', pointerEvents: 'auto' });

        configCalendar.rewards.forEach((node, index) => {
            const isClaimed = index < pLogin.current_day_idx || (index === pLogin.current_day_idx && pLogin.is_today_claimed);
            const isCurrent = index === pLogin.current_day_idx && !pLogin.is_today_claimed;

            let rewardText = "";
            if (node.resources) {
                Object.entries(node.resources).forEach(([k, v]) => rewardText += `${v} ${_t(`res_${k}`) || k} `);
            } else if (node.items) {
                node.items.forEach(i => rewardText += `${i.amount}x ${_t(`item_${i.itemId}`) || i.itemId} `);
            }

            let cellBg = "#141414";
            let cellBorder = "1px solid #222";
            if (isCurrent) { cellBg = "linear-gradient(135deg, #1b263b, #0d1117)"; cellBorder = "1px solid #2196f3"; }
            else if (isClaimed) { cellBg = "#080808"; }

            const cell = document.createElement('div');
            Object.assign(cell.style, { background: cellBg, border: cellBorder, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '65px', opacity: isClaimed ? '0.5' : '1' });

            cell.innerHTML = `
                <span style="font-size: 9px; color: ${isCurrent ? '#2196f3' : '#555'}; font-weight: bold; font-family: monospace;">${_t('player_missions.q_calendar_day') || 'День'} ${index + 1}</span>
                <span style="font-size: 16px;">${isClaimed ? '✅' : '🎁'}</span>
                <span style="font-size: 9px; color: #aaa; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;" title="${rewardText.trim()}">${rewardText.trim()}</span>
            `;
            grid.appendChild(cell);
        });

        calendarWrapper.appendChild(grid);
        centerSlot.appendChild(calendarWrapper);
        return;
    }

    // =========================================================================
    // ⚔️ РЕЖИМ Б: ДОСКИ DAILY / WEEKLY ЗАДАНИЙ С ШКАЛОЙ АКТИВНОСТИ
    // =========================================================================
    const boardConfig = AppState.config?.missions?.[currentBoard] || { milestones: [], task_pool: {} };
    const playerBoardState = AppState.missions_player_state?.[currentBoard] || { points: 0, tasks: {}, claimed_milestones: [] };

    // --- 1. ВЕРХНЯЯ ШКАЛА ПРОГРЕССА С СУНДУКАМИ ВЕХ ---
    const milestones = boardConfig.milestones || [];
    const maxPoints = milestones.length > 0 ? Math.max(...milestones.map(m => m.points_required || 100)) : 100;
    const progressPercent = Math.min(100, (playerBoardState.points / maxPoints) * 100);

    const activityBar = document.createElement('div');
    Object.assign(activityBar.style, { width: '100%', background: '#111', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '15px 20px 10px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px', minHeight: '60px', marginTop: '45px', pointerEvents: 'auto' });

    activityBar.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 11px; color: #aaa; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${_t('player_missions.q_tracker_title') || 'Очки Активности'}</span><b style="font-size: 12px; font-family: monospace; color: #ffcc00; background: rgba(0,0,0,0.4); padding: 2px 8px; border: 1px solid #222; border-radius: 4px;">${playerBoardState.points} PTS</b></div>`;

    const trackLine = document.createElement('div');
    Object.assign(trackLine.style, { width: '100%', height: '8px', background: '#050505', border: '1px solid #1f1f1f', borderRadius: '4px', position: 'relative', marginTop: '10px' });

    const fillLine = document.createElement('div');
    Object.assign(fillLine.style, { width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ffcc00, #ff763b)', borderRadius: '4px' });
    trackLine.appendChild(fillLine);

    // Расставляем сундуки-вехи по шкале
    milestones.forEach((m, idx) => {
        const reqPoints = m.points_required || 0;
        const isReached = playerBoardState.points >= reqPoints;
        const isClaimed = playerBoardState.claimed_milestones?.includes(idx);
        const leftPercent = (reqPoints / maxPoints) * 100;

        let chestIcon = '🔒';
        let statusColor = '#555';
        if (isClaimed) { chestIcon = '🎁'; statusColor = '#4ecca3'; }
        else if (isReached) { chestIcon = '⭐'; statusColor = '#ffcc00'; }

        const chestNode = document.createElement('div');
        chestNode.className = 'q-chest-node';
        Object.assign(chestNode.style, { position: 'absolute', left: `${leftPercent}%`, transform: 'translateX(-50%)', top: '-14px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: (isReached && !isClaimed) ? 'pointer' : 'default' });
        chestNode.innerHTML = `<span style="font-size: 18px; filter: drop-shadow(0 0 5px ${statusColor});">${chestIcon}</span><span style="font-size: 8px; font-family: monospace; color: ${isReached ? '#fff' : '#444'}; font-weight: bold; margin-top: 1px;">${reqPoints}</span>`;

        if (isReached && !isClaimed) {
            chestNode.onclick = (e) => {
                e.stopPropagation();
                sendSocket('missions', 'claimMilestone', { boardType: currentBoard, milestoneIdx: idx });
            };
        }
        trackLine.appendChild(chestNode);
    });
    activityBar.appendChild(trackLine);
    centerSlot.appendChild(activityBar);

    // --- 2. НИЖНИЙ СПИСОК МИССИЙ (TASK POOL) ---
    const listHeader = document.createElement('div');
    Object.assign(listHeader.style, { width: '100%', height: headerHeight, display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', borderBottom: '1px solid #1f1f1f', background: headerBg, borderRadius: '6px 6px 0 0', flexShrink: '0', pointerEvents: 'auto' });
    listHeader.innerHTML = `<div style="font-size: 11px; color: #2196f3; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">📋 ${_t('player_missions.q_registry_title') || 'Список Поручений'}</div>`;
    centerSlot.appendChild(listHeader);

    const taskListContainer = document.createElement('div');
    Object.assign(taskListContainer.style, { flex: '1', overflowY: 'auto', background: '#070707', border: '1px solid #1f1f1f', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' });

    const taskPool = boardConfig.task_pool || {};
    const taskKeys = Object.keys(taskPool);

    if (taskKeys.length === 0) {
        taskListContainer.innerHTML = `<div style="margin: auto; color: #444; font-size: 12px; font-style: italic;">${_t('player_missions.q_no_missions') || 'Поручений нет'}</div>`;
    } else {
        taskKeys.forEach(tKey => {
            const task = taskPool[tKey];
            const progress = playerBoardState.tasks?.[tKey] || 0;
            const target = task.target_count || 1;
            const isDone = progress >= target;

            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '50px', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', opacity: isDone ? '0.6' : '1' });

            const lang = AppState.config?.default_lang || 'en';
            const title = task.title_loc?.[lang] || tKey;

            row.innerHTML = `
                <div style="text-align: left; min-width: 0; flex: 1;">
                    <b style="font-size: 12px; color: #fff; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</b>
                    <span style="font-size: 10px; color: #555; font-family: monospace;">${_t('player_missions.q_task_payout') || 'Награда'}: <span style="color:#ffcc00;">+${task.points_reward || 10} ${_t('player_missions.q_pts_short') || 'PTS'}</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px; flex-shrink: 0;">
                    <b style="font-family: monospace; font-size: 12px; color: ${isDone ? '#4ecca3' : '#64dfdf'}; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 4px; border: 1px solid #1a1a1a;">${progress} / ${target}</b>
                    <span style="font-size: 16px; width: 20px; text-align: center;">${isDone ? '✅' : '⏳'}</span>
                </div>
            `;
            taskListContainer.appendChild(row);
        });
    }
    centerSlot.appendChild(taskListContainer);
}


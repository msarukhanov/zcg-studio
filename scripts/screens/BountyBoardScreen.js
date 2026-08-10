import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}


// Выносим указатель живого таймера доски, как в твоем оригинале
let bountyIntervalTimer = null;

/**
 * 🦅 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер Доски Экспедиций (Заказов)
 */
export function renderBountyBoardScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Читаем адаптивные UI настройки экрана из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'bounty_board') || {};
    const listSettings = screenSettings.list_settings || {};

    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const gap = listSettings.gap || "8px";

    // 🛠️ СИСТЕМНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (БЕЗ МУТАЦИИ AppState)
    if (!AppState.bounty_missions || AppState.bounty_missions.length === 0) {
        AppState.bounty_missions = [
            { instance_id: 'bm_1', mission_template_id: 'm_gold_easy', status: 'available', end_at: 0, assigned_heroes: [] },
            { instance_id: 'bm_2', mission_template_id: 'm_shard_hard', status: 'dispatched', end_at: Date.now() + 15000, assigned_heroes: ['rafael'] },
            { instance_id: 'bm_3', mission_template_id: 'm_gems_medium', status: 'dispatched', end_at: Date.now() - 5000, assigned_heroes: ['erin'] }
        ];

        if (!AppState.config) AppState.config = {};
        AppState.config.bounty_board = {
            refresh_cost: { amount: 10, resource: "diamond" },
            mission_pool: {
                'm_gold_easy': { rarity: 'R', title_loc: { ru: 'Подавление разбойников', en: 'Bandit Suppression' }, requirements: { min_hero_level: 10, slots_count: 1 }, rewards: { resources: { gold: 5000 } } },
                'm_gems_medium': { rarity: 'SSR', title_loc: { ru: 'Поиск тайника Артефактов', en: 'Artifact Cache' }, requirements: { min_hero_level: 40, required_class_id: 'warrior', slots_count: 1 }, rewards: { resources: { diamond: 100 } } },
                'm_shard_hard': { rarity: 'UR', title_loc: { ru: 'Охота на Древнего Дракона', en: 'Ancient Dragon Hunt' }, requirements: { min_hero_level: 80, required_element_id: 'fire', slots_count: 2 }, rewards: { items: [{ itemId: 'crystal_sh_01', amount: 3 }] } }
            }
        };
    }

    const activeMissions = AppState.bounty_missions || [];
    const boardConfig = AppState.config?.bounty_board || {};
    const poolConfig = boardConfig.mission_pool || {};
    const rerollCost = boardConfig.refresh_cost || { amount: 10, resource: "diamond" };

    // =========================================================================
    // 🔍 ПРОВЕРКА КАРКАСА (МГНОВЕННЫЙ РАЗРЫВ КРУГОВЫХ ПЕРЕРИСОВОК ИНТЕРВАЛА)
    // =========================================================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-bounty_board');

    if (screenWrapper) {
        // Каркас готов! Точечно обновляем список контрактов и перезапускаем интервал
        updateBountyDynamicMissionsList(screenWrapper, activeMissions, poolConfig, gap);
        return;
    }

    // --- ПЕРВЫЙ ВХОД: СТРОИМ СТАЦИОНАРНЫЙ КАРКАС ЭКРАНА ---
    // На самом первом входе шлем сетевой запрос на прогрев доски без траты алмазов
    sendSocket('bounty', 'refreshBoard', { isPaidReroll: false });

    // Чистим старый интервал таймера при пересоздании, как в оригинале
    destroyBountyScreen();

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-bounty_board';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        userSelect: 'none', zIndex: '500', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a'
    });

    // --- СТАТИЧНЫЙ ВЕРХНИЙ ИНФО-ХЕДЕР ДОСКИ ЗАКАЗОВ ---
    const boardHeader = document.createElement('div');
    Object.assign(boardHeader.style, {
        width: '100%', height: headerHeight, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 60px 0 15px', boxSizing: 'border-box',
        borderBottom: '1px solid #1f1f1f', background: headerBg, flexShrink: '0', pointerEvents: 'auto'
    });

    const titleDiv = document.createElement('div');
    Object.assign(titleDiv.style, { fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' });
    titleDiv.textContent = `🦅 ${_t('bounty_board.bb_dispatch_center') || 'Dispatch Center'}`;
    boardHeader.appendChild(titleDiv);

    // Кнопка реролла доски за алмазы
    const rerollResourceName = _t(`res_${rerollCost.resource}`) || rerollCost.resource;
    const rerollBtn = document.createElement('button');
    rerollBtn.id = 'bb-btn-reroll';
    Object.assign(rerollBtn.style, { background: '#222', border: '1px solid #ffcc00', color: '#ffcc00', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', pointerEvents: 'auto' });
    rerollBtn.textContent = `🔄 ${_t('bounty_board.bb_btn_refresh') || 'Refresh'} (${rerollCost.amount} ${rerollResourceName})`;

    rerollBtn.onclick = (e) => {
        e.stopPropagation();
        sendSocket('bounty', 'refreshBoard', { isPaidReroll: true });
    };
    boardHeader.appendChild(rerollBtn);
    screenWrapper.appendChild(boardHeader);

    // Слот-контейнер для вливания строк экспедиций (сдвинут на 60px вниз под топ-бары)
    const listSlotContainer = document.createElement('div');
    listSlotContainer.className = 'bb-missions-list-slot';
    Object.assign(listSlotContainer.style, { flex: '1', overflowY: 'auto', padding: '30px 12px 12px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: gap, pointerEvents: 'auto' });
    screenWrapper.appendChild(listSlotContainer);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Запускаем первичное наполнение списка миссий и старт живого таймера
    updateBountyDynamicMissionsList(screenWrapper, activeMissions, poolConfig, gap);
}

/**
 * 🧹 ЭКСПОРТ ДЕСТРУКТОРА ОЧИСТКИ ИНТЕРВАЛА ПРИ СМЕНЕ ЭКРАНА
 */
export function destroyBountyScreen() {
    if (bountyIntervalTimer) {
        clearInterval(bountyIntervalTimer);
        bountyIntervalTimer = null;
    }
}

/**
 * 🔄 ТОЧЕЧНОЕ НАПОЛНЕНИЕ КОНТРАКТОВ И ИНИЦИАЛИЗАЦИЯ ЖИВОГО ТАЙМЕРА ЭКСПЕДИЦИЙ
 */
function updateBountyDynamicMissionsList(screenWrapper, activeMissions, poolConfig, gap) {
    const listSlot = screenWrapper.querySelector('.bb-missions-list-slot');
    if (!listSlot) return;

    listSlot.innerHTML = ''; // Очищаем только строки контрактов

    if (activeMissions.length === 0) {
        const emptyBox = document.createElement('div');
        Object.assign(emptyBox.style, { margin: 'auto', color: '#444', fontSize: '12px', fontStyle: 'italic' });
        emptyBox.textContent = _t('bounty_board.bb_no_missions') || 'No active missions found...';
        listSlot.appendChild(emptyBox);
        return;
    }

    const rarityColors = { "R": "#4caf50", "SR": "#2196f3", "SSR": "#e94560", "UR": "#ffeb3b" };

    // Генерируем строки миссий на чистом JS
    activeMissions.forEach(m => {
        const meta = poolConfig[m.mission_template_id];
        if (!meta) return;

        const badgeBg = rarityColors[meta.rarity || "R"] || "#444";
        const fontColor = meta.rarity === 'UR' ? '#000' : '#fff';

        // 1. Формируем текст наград
        let rewardsText = [];
        if (meta.rewards?.resources) {
            Object.entries(meta.rewards.resources).forEach(([k, v]) => {
                rewardsText.push(`🔮 ${v} ${_t(`res_${k}`) || k}`);
            });
        }
        if (meta.rewards?.items) {
            meta.rewards.items.forEach(i => {
                rewardsText.push(`📦 ${i.amount}x ${_t(`item_${i.itemId}`) || i.itemId}`);
            });
        }

        // 2. Локализуем требования по классам и стихиям героев
        const req = meta.requirements || {};
        const className = req.required_class_id ? (_t(`class_${req.required_class_id}`) || req.required_class_id) : '';
        const elementName = req.required_element_id ? (_t(`elem_${req.required_element_id}`) || req.required_element_id) : '';
        const condText = `${_t('bounty_board.bb_req') || 'Req'}: Lv.${req.min_hero_level || 1} ${className} ${elementName}`.trim();

        // 3. Собираем ноду строки
        const rowNode = document.createElement('div');
        Object.assign(rowNode.style, {
            width: '100%', minHeight: '52px', background: '#141414', border: '1px solid #1f1f1f',
            borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px',
            boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0'
        });

        // Контент слева (Редкость + Название + Награды)
        const leftBlock = document.createElement('div');
        Object.assign(leftBlock.style, { display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0', flex: '1', textAlign: 'left' });

        const badge = document.createElement('span');
        Object.assign(badge.style, { background: badgeBg, color: fontColor, fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold', minWidth: '36px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: '0' });
        badge.textContent = meta.rarity || 'R';
        leftBlock.appendChild(badge);

        const txtDiv = document.createElement('div');
        Object.assign(txtDiv.style, { minWidth: '0', flex: '1' });

        const lang = AppState.config?.default_lang || 'en';
        const missionTitle = meta.title_loc?.[lang] || m.mission_template_id;
        txtDiv.innerHTML = `
            <b style="font-size:12px; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${missionTitle}</b>
            <span style="font-size:10px; color:#555; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${condText} | ${_t('bounty_board.bb_rewards') || 'Rewards'}: ${rewardsText.join(', ')}</span>
        `;
        leftBlock.appendChild(txtDiv);
        rowNode.appendChild(leftBlock);

        // Правый блок действий (Кнопки Отправки, Таймеры или Сдача контракта)
        const actionsSlot = document.createElement('div');
        actionsSlot.className = 'bb-actions-slot';
        actionsSlot.style.flexShrink = '0';

        const now = Date.now();

        if (m.status === 'available') {
            // КНОПКА ОТПРАВКИ ГЕРОЕВ
            const dispatchBtn = document.createElement('button');
            dispatchBtn.textContent = _t('bounty_board.bb_dispatch') || 'Dispatch';
            Object.assign(dispatchBtn.style, { background: 'linear-gradient(135deg, #2196f3, #1565c0)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });

            dispatchBtn.onclick = (e) => {
                e.stopPropagation();
                // Логика автоподбора свободных героев из AppState.characters
                const requiredSlotsCount = meta.requirements?.slots_count || 1;
                const busyHeroes = [];
                activeMissions.forEach(mission => {
                    if (m.status === 'dispatched' && mission.assigned_heroes) busyHeroes.push(...mission.assigned_heroes);
                });

                // Вспоминаем, что персонажи игрока теперь лежат в объекте AppState.characters (rafael: {...})
                const allHeroesArray = Object.keys(AppState.characters || {});
                const freeHeroesArray = allHeroesArray.filter(charId => !busyHeroes.includes(charId));

                if (freeHeroesArray.length < requiredSlotsCount) {
                    return alert(`${_t('bounty_board.bb_alert_no_heroes') || 'Недостаточно свободных героев'}: ${requiredSlotsCount}`);
                }

                const selectedHeroIds = freeHeroesArray.slice(0, requiredSlotsCount);
                sendSocket('bounty', 'dispatchHeroes', { instanceId: m.instance_id, heroIdsArray: selectedHeroIds });
            };
            actionsSlot.appendChild(dispatchBtn);
        }
        else if (m.status === 'dispatched') {
            if (now >= m.end_at) {
                // КНОПКА СДАЧИ ЗАДАНИЯ И СБОРА НАГРАД
                const claimBtn = document.createElement('button');
                claimBtn.textContent = _t('bounty_board.bb_claim') || 'Claim';
                Object.assign(claimBtn.style, { background: 'linear-gradient(135deg, #4ecca3, #2b9371)', border: 'none', color: '#12122c', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
                claimBtn.onclick = (e) => { e.stopPropagation(); sendSocket('bounty', 'claimReward', { instanceId: m.instance_id }); };
                actionsSlot.appendChild(claimBtn);
            } else {
                // ТАЙМЕР ОБРАТНОГО ОТСЧЕТА + КНОПКА СБРОСА ЗА АЛМАЗЫ
                const timerWrapper = document.createElement('div');
                Object.assign(timerWrapper.style, { display: 'flex', alignItems: 'center', gap: '6px' });

                const countdownNode = document.createElement('span');
                countdownNode.className = 'bb-countdown-node';
                countdownNode.setAttribute('data-end', m.end_at);
                countdownNode.setAttribute('data-id', m.instance_id);
                Object.assign(countdownNode.style, { fontFamily: 'monospace', fontSize: '11px', color: '#aaa', background: '#1f1f1f', padding: '6px 12px', border: '1px solid #333', borderRadius: '4px', display: 'inline-block' });

                const msLeft = Math.max(0, m.end_at - now);
                const hrs = Math.floor(msLeft / 3600000);
                const mins = Math.floor((msLeft % 3600000) / 60000);
                const secs = Math.floor((msLeft % 60000) / 1000);
                countdownNode.innerText = `⏳ ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                timerWrapper.appendChild(countdownNode);

                const speedUpBtn = document.createElement('button');
                Object.assign(speedUpBtn.style, { background: 'linear-gradient(135deg, #ffcc00, #b38f00)', border: 'none', color: '#12122c', padding: '6px 10px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' });
                const currentCost = Math.max(5, Math.ceil(msLeft / 600000));
                speedUpBtn.innerHTML = `⚡ <span>${currentCost}</span> 💎`;

                speedUpBtn.onclick = (e) => {
                    e.stopPropagation();
                    speedUpBtn.disabled = true; // Защита от спама кликов по сети
                    sendSocket('bounty', 'speedUpMission', { instanceId: m.instance_id });
                };
                timerWrapper.appendChild(speedUpBtn);
                actionsSlot.appendChild(timerWrapper);
            }
        }

        rowNode.appendChild(actionsSlot);
        listSlot.appendChild(rowNode);
    });

    // --- ИНИЦИАЛИЗАЦИЯ ЖИВОГО ИНТЕРВАЛА ОБНОВЛЕНИЯ СЕКУНД ---
    if (window.bountyIntervalTimer) { clearInterval(window.bountyIntervalTimer); window.bountyIntervalTimer = null; }

    const activeTimerNodes = listSlot.querySelectorAll('.bb-countdown-node');
    if (activeTimerNodes.length > 0) {
        window.bountyIntervalTimer = setInterval(() => {
            const currentTime = Date.now();
            let liveTimersCount = 0;

            activeTimerNodes.forEach(node => {
                const endTimestamp = Number(node.getAttribute('data-end')) || 0;
                const remainingMs = endTimestamp - currentTime;

                if (remainingMs <= 0) {
                    const instId = node.getAttribute('data-id');
                    const parentSlot = node.closest('.bb-actions-slot');
                    if (parentSlot) {
                        parentSlot.innerHTML = '';
                        const claimBtn = document.createElement('button');
                        claimBtn.textContent = _t('bounty_board.bb_claim') || 'Claim';
                        Object.assign(claimBtn.style, { background: 'linear-gradient(135deg, #4ecca3, #2b9371)', border: 'none', color: '#12122c', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
                        claimBtn.onclick = (e) => { e.stopPropagation(); sendSocket('bounty', 'claimReward', { instanceId: instId }); };
                        parentSlot.appendChild(claimBtn);
                    }
                } else {
                    liveTimersCount++;
                    const h = Math.floor(remainingMs / 3600000);
                    const m = Math.floor((remainingMs % 3600000) / 60000);
                    const s = Math.floor((remainingMs % 60000) / 1000);
                    node.innerText = `⏳ ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

                    // Обновляем циферку стоимости на кнопке спидапа рядом
                    const speedUpBtnNode = node.nextElementSibling;
                    if (speedUpBtnNode) {
                        const nextCost = Math.max(5, Math.ceil(remainingMs / 600000));
                        speedUpBtnNode.innerHTML = `⚡ <span>${nextCost}</span> 💎`;
                    }
                }
            });

            if (liveTimersCount === 0) { clearInterval(window.bountyIntervalTimer); window.bountyIntervalTimer = null; }
        }, 1000);
    }
}



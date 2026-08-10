import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}

// Глобальный сессионный стейт вкладок гильдии
export const GuildsState = {
    currentTab: 'search_guilds' // Дефолт: 'search_guilds' | 'create_guild' | 'guild_roster' | 'guild_tributes' | 'guild_shop' | 'guild_requests'
};

/**
 * 🛡️ ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер экрана Гильдий
 */
export function renderGuildsScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Читаем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'guilds') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "220px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const gap = listSettings.gap || "8px";

    const myProfile = AppState.player || {};

    // ДЛЯ ТЕСТА: Чтобы проверить режим ВНУТРИ клана, поменяй null на "gods_clan"
    const myGuildId = myProfile.guild_id || true;

    // Смена вкладки по умолчанию, если игрок имеет клан
    if (myGuildId && (GuildsState.currentTab === 'search_guilds' || GuildsState.currentTab === 'create_guild')) {
        GuildsState.currentTab = 'roster';
    }

    // =========================================================================
    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (БЕЗ МУТАЦИИ AppState)
    // =========================================================================
    let currentTabDataList = [];
    const activeTab = GuildsState.currentTab;

    if (!myGuildId) {
        if (activeTab === 'search_guilds') {
            currentTabDataList = AppState.guilds_search_list || [
                { id: 'g_1', name: 'Olympus', level: 5, membersCount: 28, conditions: { min_level: 40 } },
                { id: 'g_2', name: 'Asgard', level: 3, membersCount: 14, conditions: { min_level: 10 } }
            ];
        }
    } else {
        // Игрок находится в клане

    }

    if (!AppState.active_guild) {
        AppState.active_guild = {
            name: 'Olympus',
            level: 5,
            members: [
                { id: myProfile.id || 'me', nickname: myProfile.nickname || 'Traveler', level: myProfile.level || 50, combat_power: 450000, rank: 'leader' },
                { id: 'm_2', nickname: 'Erin_God', level: 112, combat_power: 890000, rank: 'officer' },
                { id: 'm_3', nickname: 'Newbie', level: 25, combat_power: 34000, rank: 'member' }
            ]
        };
        AppState.guild_incoming_requests = [
            { id: 'req_1', nickname: 'WannabeGod', level: 45, combat_power: 210000, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp' }
        ];
    }

    // =========================================================================
    // 🔍 ПРОВЕРКА КАРКАСА (ЗАЩИТА ОТ МИГАНИЯ СТРОБОСКОПА)
    // =========================================================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-guilds');

    if (screenWrapper) {
        // Каркас уже на месте — просто точечно вливаем строки данных!
        updateGuildsDynamicContent(screenWrapper, currentTabDataList, gap, myProfile);
        return;
    }

    // --- ЕСЛИ ЭКРАНА ЕЩЕ НЕТ (ПЕРВЫЙ ВХОД), СТРОИМ КАРКАС ---
    screenManager.currentScreenId = 'guild_hub';

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-guilds';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: '500',
        fontFamily: 'sans-serif',
        backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВАЯ КОЛОНКА: ДИНАМИЧЕСКИЙ САЙДБАР (ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'g-sidebar';
    Object.assign(sidebar.style, {
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #252525',
        padding: '10px',
        boxSizing: 'border-box',
        height: '100%',
        width: sidebarWidth,
        flexShrink: '0',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        gap: '10px',
        pointerEvents: 'auto'
    });

    const sidebarTitle = document.createElement('div');
    Object.assign(sidebarTitle.style, { fontSize: '11px', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin_bottom: '4px', marginBottom: '4px' });
    sidebarTitle.textContent = myGuildId ? (_t('guilds.g_alliance_hub') || 'Alliance Hub') : (_t('guilds.g_recruitment'));
    sidebar.appendChild(sidebarTitle);

    // Конфигурируем массив вкладок в зависимости от статуса игрока в клане
    let tabsConfig = [];
    if (!myGuildId) {
        tabsConfig = [
            { id: 'search_guilds', icon: '🔍', label: _t('guilds.g_search') || 'Search Guilds', activeBg: 'linear-gradient(135deg, #1b263b, #111)', activeBorder: '#2196f3', textColor: '#2196f3' },
            { id: 'create_guild', icon: '🛡️', label: _t('guilds.g_create') || 'Found Guild', activeBg: 'linear-gradient(135deg, #2a1b08, #111)', activeBorder: '#ffcc00', textColor: '#ffcc00' }
        ];
    } else {
        const currentGuild = AppState.active_guild || { members: [] };
        const myMemberNode = currentGuild.members?.find(m => String(m.id) === String(myProfile.id)) || {};
        const isManager = myMemberNode.rank === 'leader' || myMemberNode.rank === 'officer';

        tabsConfig = [
            { id: 'roster', icon: '📊', label: _t('guilds.g_roster') || 'Guild Roster', activeBg: 'linear-gradient(135deg, #1b263b, #111)', activeBorder: '#2196f3', textColor: '#2196f3' },
            { id: 'tributes', icon: '💰', label: _t('guilds.g_tributes') || 'Tributes', activeBg: 'linear-gradient(135deg, #2a1b08, #111)', activeBorder: '#ffcc00', textColor: '#ffcc00' },
            { id: 'shop', icon: '📦', label: _t('guilds.g_treasury') || 'Treasury', activeBg: 'linear-gradient(135deg, #3a1130, #111)', activeBorder: '#e91e63', textColor: '#e91e63' }
        ];

        if (isManager) {
            tabsConfig.push({ id: 'requests', icon: '📥', label: _t('guilds.g_requests') || 'Applications', activeBg: 'linear-gradient(135deg, #0f3026, #111)', activeBorder: '#4ecca3', textColor: '#4ecca3' });
        }
    }

    tabsConfig.forEach(tab => {
        const isSelected = GuildsState.currentTab === tab.id;

        const tabBtn = document.createElement('div');
        tabBtn.className = 'g-tab-btn';
        tabBtn.setAttribute('data-tab', tab.id);

        Object.assign(tabBtn.style, {
            width: '100%', height: '44px', background: isSelected ? tab.activeBg : '#0c0c0c',
            border: `1px solid ${isSelected ? tab.activeBorder : '#222'}`, borderRadius: '6px',
            padding: '0 12px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '10px', transition: 'all 0.2s', flexShrink: '0'
        });

        tabBtn.innerHTML = `<span style="font-size: 18px;">${tab.icon}</span><b style="font-size: 12px; color: ${isSelected ? tab.textColor : '#aaa'};">${tab.label}</b>`;

        tabBtn.onclick = (e) => {
            e.stopPropagation();
            if (GuildsState.currentTab === tab.id) return;

            GuildsState.currentTab = tab.id;

            // Локальный свитч бордеров кнопок без сноса всего дерева
            sidebar.querySelectorAll('.g-tab-btn').forEach(btn => {
                const bId = btn.getAttribute('data-tab');
                const meta = tabsConfig.find(t => t.id === bId);
                const isBtnSelected = bId === tab.id;
                Object.assign(btn.style, { background: isBtnSelected ? meta.activeBg : '#0c0c0c', borderColor: isBtnSelected ? meta.activeBorder : '#222' });
                btn.querySelector('b').style.color = isBtnSelected ? meta.textColor : '#aaa';
            });

            // Сетевые сокеты
            if (tab.id === 'search_guilds') sendSocket('guilds', 'searchGuilds', {});
            else if (tab.id === 'requests') sendSocket('guilds', 'getGuildRequests', {});

            // Реактивный перезапуск
            renderGuildsScreen();
        };

        sidebar.appendChild(tabBtn);
    });

    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 👥 2. ЦЕНТРАЛЬНАЯ ОБЛАСТЬ: СЛОТ ДЛЯ ОПЕРАЦИЙ КЛАНА
    // =========================================================================
    const centerArea = document.createElement('div');
    centerArea.className = 'g-center-area';
    Object.assign(centerArea.style, { display: 'flex', flexDirection: 'column', flex: '1', height: '100%', backgroundColor: 'rgba(10, 10, 10, 0.5)', overflow: 'hidden' });

    centerArea.innerHTML = `
        <div class="g-center-header" style="width: 100%; height: ${headerHeight}; display: flex; align-items: center; padding: 0 15px; box-sizing: border-box; border-bottom: 1px solid #1f1f1f; background: ${headerBg}; flex-shrink: 0; pointer-events: auto;">
            <div style="font-size: 12px; color: #ffcc00; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                🛡️ <span class="g-header-title">Guild Operations Command</span>
            </div>
        </div>
        <div class="g-scroll-container" style="flex: 1; overflow-y: auto; padding: 20px 10px 10px 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: ${gap}; pointer-events: auto;"></div>
    `;
    screenWrapper.appendChild(centerArea);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Первичное точечное заселение контента
    updateGuildsDynamicContent(screenWrapper, currentTabDataList, gap, myProfile, myGuildId);
}

/**
 * 🔄 ФУНКЦИЯ ТОЧЕЧНОГО ОБНОВЛЕНИЯ КОНТЕНТА (ПОДДЕРЖКА ВСЕХ 6 ВКЛАДОК)
 */
function updateGuildsDynamicContent(screenWrapper, currentTabDataList, gap, myProfile, myGuildId) {
    const scrollContainer = screenWrapper.querySelector('.g-scroll-container');
    const headerTitleNode = screenWrapper.querySelector('.g-header-title');
    if (!scrollContainer) return;

    scrollContainer.innerHTML = ''; // Очищаем исключительно список, каркас не трогаем
    const activeTab = GuildsState.currentTab;

    if (headerTitleNode) headerTitleNode.textContent = _t(`guilds.g_${activeTab}`) || activeTab.replace('_', ' ').toUpperCase();

    // =========================================================================
    // 🔍 ТАБ 1: ПОИСК КЛАНОВ (ЕСЛИ НЕТ КЛАНА)
    // =========================================================================
    if (activeTab === 'search_guilds') {
        if (currentTabDataList.length === 0) {
            scrollContainer.innerHTML = `<div style="margin:auto; color:#444; font-size:12px; font-style:italic;">${_t('guilds.g_no_guilds') || 'No active guilds found...'}</div>`;
            return;
        }
        currentTabDataList.forEach(g => {
            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '54px', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0' });
            row.innerHTML = `<div style="display:flex; align-items:center; gap:12px; text-align:left;"><span style="font-size:24px;">🛡️</span><div><b style="font-size:13px; color:#fff;">${g.name} <span style="font-size:10px; color:#ffcc00;">Lvl.${g.level}</span></b><div style="font-size:10px; color:#555;">${_t('guilds.g_members') || 'Members'}: ${g.membersCount} | ${_t('guilds.g_req') || 'Req'}: Lv.${g.conditions?.min_level || 1}+</div></div></div>`;

            const joinBtn = document.createElement('button');
            joinBtn.textContent = _t('guilds.g_btn_join') || 'Join Clan';
            Object.assign(joinBtn.style, { background: 'linear-gradient(135deg, #2196f3, #1565c0)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
            joinBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'applyToGuild', { targetGuildId: g.id }); };

            row.appendChild(joinBtn);
            scrollContainer.appendChild(row);
        });
    }
    // =========================================================================
    // 🛠️ ТАБ 2: СОЗДАНИЕ КЛАНА (ЕСЛИ НЕТ КЛАНА)
    // =========================================================================
    else if (activeTab === 'create_guild') {
        const formBox = document.createElement('div');
        Object.assign(formBox.style, { margin: 'auto', width: '100%', maxWidth: '320px', background: '#111', border: '1px solid #222', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' });
        formBox.innerHTML = `<b style="font-size:14px; color:#ffcc00; text-align:center;">${_t('guilds.g_create_title') || 'Establish New Guild Node'}</b><div style="display:flex; flex-direction:column; gap:4px; text-align:left;"><span style="font-size:11px; color:#666;">${_t('guilds.g_input_signature') || 'Guild Name Signature'}</span><input type="text" id="g-input-name" placeholder="${_t('guilds.g_placeholder') || 'Enter guild name...'}" style="width:100%; height:36px; background:#050505; border:1px solid #333; border-radius:4px; padding:0 10px; color:#fff; box-sizing:border-box; font-size:12px;"></div>`;

        const createBtn = document.createElement('button');
        createBtn.textContent = _t('guilds.g_btn_create_cost') || 'Create Clan (500 Diamonds)';
        Object.assign(createBtn.style, { width: '100%', height: '38px', background: 'linear-gradient(135deg, #ffcc00, #b38f00)', border: 'none', color: '#12122c', fontWeight: 'bold', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' });
        createBtn.onclick = (e) => {
            e.stopPropagation();
            const input = formBox.querySelector('#g-input-name');
            const name = input ? input.value.trim() : '';
            if (!name) return alert(_t('guilds.g_err_empty_name') || 'Введите название клана');
            sendSocket('guilds', 'createGuild', { guildName: name });
        };

        formBox.appendChild(createBtn);
        scrollContainer.appendChild(formBox);
    }

    // =========================================================================
    // 📊 ТАБ 3: РОСТЕР УЧАСТНИКОВ КЛАНА (ФАЗА Б: ИГРОК В КЛАНЕ)
    // =========================================================================
    else if (activeTab === 'roster') {
        const currentGuild = AppState.active_guild || { members: [] };
        const myNode = currentGuild.members?.find(m => String(m.id) === String(myProfile.id)) || {};

        currentGuild.members?.forEach(m => {
            const isMe = String(m.id) === String(myProfile.id);
            const rankLabels = { 'leader': '👑 Leader', 'officer': '⚔️ Officer', 'member': '🛡️ Member' };

            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '50px', background: isMe ? 'linear-gradient(90deg, #1b263b, #141414)' : '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0' });
            row.innerHTML = `<div style="display:flex; align-items:center; gap:12px; text-align:left;"><span style="font-size:11px; font-family:monospace; color:#666;">[${_t('guilds.g_level_short') || 'Lv.'}${m.level || 1}]</span><b style="font-size:12px; color:#fff;">${m.nickname}</b><span style="font-size:10px; color:#555; font-family:monospace;">⚔️ ${m.combat_power || 0}</span></div>`;

            const actionContainer = document.createElement('div');

            // Лидер управляет всеми через селектор должностей
            if (myNode.rank === 'leader' && !isMe) {
                Object.assign(actionContainer.style, { display: 'flex', alignItems: 'center', gap: '8px' });

                const select = document.createElement('select');
                select.className = 'g-rank-select';
                select.setAttribute('data-uid', m.id);
                Object.assign(select.style, { background: '#161616', border: '1px solid #333', color: '#fff', fontSize: '11px', padding: '3px', borderRadius: '4px', pointerEvents: 'auto' });
                select.innerHTML = `<option value="member" ${m.rank === 'member' ? 'selected' : ''}>Member</option><option value="officer" ${m.rank === 'officer' ? 'selected' : ''}>Officer</option>`;
                select.onchange = () => sendSocket('guilds', 'changeRank', { targetMemberId: m.id, newRank: select.value });

                const kickBtn = document.createElement('button');
                kickBtn.textContent = _t('guilds.g_btn_kick') || 'Kick';
                Object.assign(kickBtn.style, { background: '#222', border: '1px solid #e94560', color: '#e94560', padding: '3px 8px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' });
                kickBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'kickMember', { targetMemberId: m.id }); };

                actionContainer.appendChild(select);
                actionContainer.appendChild(kickBtn);
            }
            // Офицер может кикать только обычных мемберов
            else if (myNode.rank === 'officer' && m.rank === 'member' && !isMe) {
                const kickBtn = document.createElement('button');
                kickBtn.textContent = _t('guilds.g_btn_kick') || 'Kick';
                Object.assign(kickBtn.style, { background: '#222', border: '1px solid #e94560', color: '#e94560', padding: '3px 8px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' });
                kickBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'kickMember', { targetMemberId: m.id }); };
                actionContainer.appendChild(kickBtn);
            }
            // Обычный текст ранга для всех остальных случаев
            else {
                actionContainer.innerHTML = `<span style="font-size:11px; color:#ffcc00; font-family:monospace;">${_t(`guilds.g_rank_${m.rank}`) || rankLabels[m.rank] || rankLabels['member']}</span>`;
            }

            row.appendChild(actionContainer);
            scrollContainer.appendChild(row);
        });

        // Нижние системные кнопки Росспуска / Выхода из клана
        const ctrlBtn = document.createElement('button');
        if (myNode.rank === 'leader') {
            ctrlBtn.textContent = `⚠️ ${_t('guilds.g_btn_disband') || 'Disband Guild'}`;
            Object.assign(ctrlBtn.style, { marginTop: '10px', width: '100%', height: '34px', background: '#222', border: '1px solid #e94560', color: '#e94560', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', flexShrink: '0' });
            ctrlBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'disbandGuild', {}); };
        } else {
            ctrlBtn.textContent = _t('guilds.g_btn_leave') || 'Leave Guild';
            Object.assign(ctrlBtn.style, { marginTop: '10px', width: '100%', height: '34px', background: '#222', border: '1px solid #aaa', color: '#aaa', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', flexShrink: '0' });
            ctrlBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'leaveGuild', {}); };
        }
        scrollContainer.appendChild(ctrlBtn);
    }
    // =========================================================================
    // 💰 ТАБ 4: ЕЖЕДНЕВНЫЕ ВНОСЫ (TRIBUTES)
    // =========================================================================
    else if (activeTab === 'tributes') {
        const donationModes = AppState.guild_system?.donation_modes || {};
        const donationKeys = Object.keys(donationModes);

        if (donationKeys.length === 0) {
            scrollContainer.innerHTML = `<div style="margin:auto; color:#444; font-size:12px; font-style:italic;">${_t('guilds.g_no_tributes') || 'No donation tributes configured...'}</div>`;
            return;
        }

        donationKeys.forEach(tKey => {
            const d = donationModes[tKey];
            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '58px', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0' });
            row.innerHTML = `<div style="text-align:left;"><b style="font-size:12px; color:#fff; text-transform:uppercase; font-family:monospace;">${tKey.replace('_', ' ')}</b><div style="font-size:10px; color:#666; margin-top:2px;">Gives: <span style="color:#4ecca3;">+${d.rewards?.guild_exp || 0} Exp</span> | <span style="color:#e91e63;">+${d.rewards?.guild_coin || 0} Coins</span></div></div>`;

            const tributeBtn = document.createElement('button');
            tributeBtn.textContent = `${_t('guilds.g_btn_cost') || 'Cost:'} ${d.cost?.amount} ${d.cost?.resource}`;
            Object.assign(tributeBtn.style, { background: 'linear-gradient(135deg, #ffcc00, #b38f00)', border: 'none', color: '#12122c', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
            tributeBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'submitTribute', { tributeId: tKey }); };

            row.appendChild(tributeBtn);
            scrollContainer.appendChild(row);
        });
    }
    // =========================================================================
    // 📦 ТАБ 5: СОКРОВИЩНИЦА КЛАНА (МАГАЗИН / SHOP)
    // =========================================================================
    else if (activeTab === 'guild_shop') {
        const shopSlots =  AppState.guild_system?.shop?.slots || [];
        const shopsState = myProfile.shopsState || {};

        if (shopSlots.length === 0) {
            scrollContainer.innerHTML = `<div style="margin:auto; color:#444; font-size:12px; font-style:italic;">${_t('guilds.g_no_treasury') || 'Guild Treasury is currently empty...'}</div>`;
            return;
        }

        shopSlots.forEach(s => {
            const buyCount = shopsState[`guild_${s.slotId}`] || 0;
            const isLimit = buyCount >= (s.buy_limit || 1);

            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '58px', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0' });
            row.innerHTML = `<div style="text-align:left;"><b style="font-size:12px; color:#fff;">📦 Item: ${s.itemId} <span style="font-size:10px; color:#666;">(x${s.amount})</span></b><div style="font-size:10px; color:#555; margin-top:2px;">Limit: ${buyCount}/${s.buy_limit || 1}</div></div>`;

            const buyBtn = document.createElement('button');
            buyBtn.disabled = isLimit;
            if (isLimit) {
                buyBtn.textContent = _t('guilds.g_btn_sold_out') || 'Sold Out';
                Object.assign(buyBtn.style, { background: '#1a1a1a', border: '1px solid #333', color: '#555', padding: '6px 14px', fontSize: '11px', borderRadius: '4px', cursor: 'default' });
            } else {
                buyBtn.textContent = `${_t('guilds.g_btn_cost') || 'Cost:'} ${s.cost} Coins`;
                Object.assign(buyBtn.style, { background: 'linear-gradient(135deg, #e91e63, #951c30)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
                buyBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'buyTreasuryItem', { slotId: s.slotId, count: 1 }); };
            }

            row.appendChild(buyBtn);
            scrollContainer.appendChild(row);
        });
    }
    // =========================================================================
    // 📥 ТАБ 6: ЗАЯВКИ НА ВСТУПЛЕНИЕ (ПАНЕЛЬ ОФИЦЕРОВ / ЛИДЕРА)
    // =========================================================================
    else if (activeTab === 'guild_requests') {
        const reqList = AppState.guild_incoming_requests || [];

        if (reqList.length === 0) {
            scrollContainer.innerHTML = `<div style="margin:auto; color:#444; font-size:12px; font-style:italic;">${_t('guilds.g_no_requests') || 'No pending application requests...'}</div>`;
            return;
        }

        reqList.forEach(r => {
            const row = document.createElement('div');
            Object.assign(row.style, { width: '100%', height: '54px', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '12px', flexShrink: '0' });

            const leftBlock = document.createElement('div');
            Object.assign(leftBlock.style, { display: 'flex', alignItems: 'center', gap: '12px' });

            if (r.avatar_icon) {
                const img = document.createElement('img');
                Object.assign(img.style, { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #333', objectFit: 'cover' });
                img.src = window.gameAssets?.[r.avatar_icon] || r.avatar_icon;
                leftBlock.appendChild(img);
            }

            const txt = document.createElement('b');
            Object.assign(txt.style, { fontSize: '12px', color: '#fff', textAlign: 'left' });
            txt.innerHTML = `${r.nickname} <span style="font-size:10px; color:#555;">${_t('guilds.g_level_short') || 'Lv.'}${r.level} [⚔️${r.combat_power || 0}]</span>`;
            leftBlock.appendChild(txt);
            row.appendChild(leftBlock);

            const btnGroup = document.createElement('div');
            Object.assign(btnGroup.style, { display: 'flex', gap: '8px' });

            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = _t('guilds.g_btn_accept') || 'Accept';
            Object.assign(acceptBtn.style, { background: 'linear-gradient(135deg, #4ecca3, #2b9371)', border: 'none', color: '#12122c', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' });
            acceptBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'handleRequest', { candidateId: r.id, action: 'accept' }); };

            const declineBtn = document.createElement('button');
            declineBtn.textContent = _t('guilds.g_btn_decline') || 'Decline';
            Object.assign(declineBtn.style, { background: '#222', border: '1px solid #e94560', color: '#e94560', padding: '5px 12px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' });
            declineBtn.onclick = (e) => { e.stopPropagation(); sendSocket('guilds', 'handleRequest', { candidateId: r.id, action: 'decline' }); };

            btnGroup.appendChild(acceptBtn);
            btnGroup.appendChild(declineBtn);
            row.appendChild(btnGroup);
            scrollContainer.appendChild(row);
        });
    }
}

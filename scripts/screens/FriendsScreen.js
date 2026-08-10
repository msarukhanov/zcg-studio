import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}

// Глобальный сессионный стейт вкладок друзей
export const FriendsState = {
    currentTab: 'active_friends' // Вкладки: 'active_friends' | 'inbound_requests' | 'add_recommendations' | 'blacklist'
};

/**
 * 👥 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер экрана Друзей
 */
export function renderFriendsScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Считываем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'friends') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "220px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const gap = listSettings.gap || "8px";

    // ==========================================
    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (БЕЗ МУТАЦИИ AppState)
    // ==========================================
    let currentTabDataList = [];
    const activeTab = FriendsState.currentTab;

    if (activeTab === 'active_friends') {
        currentTabDataList = AppState.friends || [
            { id: 'f_1', nickname: 'Zeus_Gamer', level: 85, isOnline: true, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp', isHeartSent: false },
            { id: 'f_2', nickname: 'Athena_77', level: 92, isOnline: false, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp', isHeartSent: true }
        ];
    } else if (activeTab === 'inbound_requests') {
        currentTabDataList = AppState.friend_requests || [
            { id: 'r_1', nickname: 'Newbie_Player', level: 12, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp' }
        ];
    } else if (activeTab === 'add_recommendations') {
        currentTabDataList = AppState.friend_recommendations || [
            { id: 'rec_1', nickname: 'Hades_Top', level: 104, combat_power: 742000, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp' },
            { id: 'rec_2', nickname: 'Poseidon_X', level: 99, combat_power: 611200, avatar_icon: './assets/images/heroes/heroAvatars/eleniel.webp' }
        ];
    } else if (activeTab === 'blacklist') {
        currentTabDataList = AppState.blacklist || [
            { id: 'b_1', nickname: 'Toxic_User_99' }
        ];
    }

    // ==========================================
    // 🔍 ПРОВЕРКА КАРКАСА (ЗАЩИТА ОТ МИГАНИЯ СТРОБОСКОПА)
    // ==========================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-friends');

    if (screenWrapper) {
        // Каркас уже есть — просто точечно перерисовываем скролл-зону!
        updateFriendsDynamicList(screenWrapper, currentTabDataList, gap, headerHeight, headerBg);
        return;
    }

    // --- ЕСЛИ ЭКРАНА ЕЩЕ НЕТ (ПЕРВЫЙ ВХОД), СОЗДАЕМ КАРКАС ---
    screenManager.currentScreenId = 'friends';

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-friends';
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
    // 🧱 ЛЕВАЯ КОЛОНКА: САЙДБАР С ЧЕТЫРЬМЯ ВКЛАДКАМИ (ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'fr-sidebar';
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
    Object.assign(sidebarTitle.style, { fontSize: '11px', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' });
    sidebarTitle.textContent = _t('friends.fr_social_hub') || 'Social Hub';
    sidebar.appendChild(sidebarTitle);

    // Описываем структуру вкладок сайдбара
    const tabsConfig = [
        { id: 'active_friends', icon: '🤝', label: _t('friends.fr_my_friends') || 'My Friends', activeBg: 'linear-gradient(135deg, #1b263b, #111)', activeBorder: '#2196f3', textColor: '#2196f3' },
        { id: 'inbound_requests', icon: '📥', label: _t('friends.fr_requests') || 'Requests', activeBg: 'linear-gradient(135deg, #0f3026, #111)', activeBorder: '#4ecca3', textColor: '#4ecca3' },
        { id: 'add_recommendations', icon: '🔍', label: _t('friends.fr_find_players') || 'Find Players', activeBg: 'linear-gradient(135deg, #2a1b08, #111)', activeBorder: '#ffcc00', textColor: '#ffcc00' },
        { id: 'blacklist', icon: '⛔', label: _t('friends.fr_blacklist') || 'Blacklist', activeBg: 'linear-gradient(135deg, #3a1111, #111)', activeBorder: '#e94560', textColor: '#e94560' }
    ];

    tabsConfig.forEach(tab => {
        const isSelected = FriendsState.currentTab === tab.id;

        const tabBtn = document.createElement('div');
        tabBtn.className = 'fr-tab-btn';
        tabBtn.setAttribute('data-tab', tab.id);

        Object.assign(tabBtn.style, {
            width: '100%',
            height: '44px',
            background: isSelected ? tab.activeBg : '#0c0c0c',
            border: `1px solid ${isSelected ? tab.activeBorder : '#222'}`,
            borderRadius: '6px',
            padding: '0 12px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            flexShrink: '0'
        });

        tabBtn.innerHTML = `<span style="font-size: 18px;">${tab.icon}</span><b style="font-size: 12px; color: ${isSelected ? tab.textColor : '#aaa'};">${tab.label}</b>`;

        tabBtn.onclick = (e) => {
            e.stopPropagation();
            if (FriendsState.currentTab === tab.id) return;

            FriendsState.currentTab = tab.id;

            // Нативно переключаем подсветку кнопок в сайдбаре на лету без общего перерендера
            sidebar.querySelectorAll('.fr-tab-btn').forEach(btn => {
                const bId = btn.getAttribute('data-tab');
                const meta = tabsConfig.find(t => t.id === bId);
                const isBtnSelected = bId === tab.id;
                Object.assign(btn.style, {
                    background: isBtnSelected ? meta.activeBg : '#0c0c0c',
                    borderColor: isBtnSelected ? meta.activeBorder : '#222'
                });
                btn.querySelector('b').style.color = isBtnSelected ? meta.textColor : '#aaa';
            });

            // Отправляем сокеты согласно выбранной вкладке из старой логики
            if (tab.id === 'add_recommendations') {
                sendSocket('friends', 'getRecommendations', {});
            } else if (tab.id === 'inbound_requests') {
                sendSocket('friends', 'getInboundRequests', {});
            } else {
                sendSocket('friends', 'getFullFriendsDataPack', {});
            }

            // Запускаем реактивное обновление контента под новую вкладку
            renderFriendsScreen();
        };

        sidebar.appendChild(tabBtn);
    });

    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 👥 2. ЦЕНТРАЛЬНАЯ ОБЛАСТЬ: ШАБЛОН КОНТЕНТА И СЛОТЫ ДЛЯ СТРОК
    // =========================================================================
    const centerArea = document.createElement('div');
    centerArea.className = 'fr-center-area';
    Object.assign(centerArea.style, {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        height: '100%',
        backgroundColor: 'rgba(10, 10, 10, 0.5)',
        overflow: 'hidden'
    });

    // Строим заголовок и скролл-контейнер
    centerArea.innerHTML = `
        <div class="fr-center-header" style="width: 100%; height: ${headerHeight}; display: flex; align-items: center; padding: 0 15px; box-sizing: border-box; border-bottom: 1px solid #1f1f1f; background: ${headerBg}; flex-shrink: 0; pointer-events: auto;">
            <div style="font-size: 12px; color: #2196f3; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                👥 <span class="fr-header-title">Social Registry Matrix</span>
            </div>
        </div>
        <div class="fr-scroll-container" style="flex: 1; overflow-y: auto; padding: 20px 10px 10px 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: ${gap}; pointer-events: auto;"></div>
    `;
    screenWrapper.appendChild(centerArea);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Первичное точечное наполнение списка строками данных
    updateFriendsDynamicList(screenWrapper, currentTabDataList, gap);
}

/**
 * 🔄 УМНЫЙ РЕАКТИВНЫЙ ОБНОВЛЯЕМЫЙ КОНТЕНТ (ОБНОВЛЕНИЕ СТРОК БЕЗ МИГАНИЯ)
 */
function updateFriendsDynamicList(screenWrapper, currentTabDataList, gap) {
    const scrollContainer = screenWrapper.querySelector('.fr-scroll-container');
    const headerTitleNode = screenWrapper.querySelector('.fr-header-title');
    if (!scrollContainer) return;

    scrollContainer.innerHTML = ''; // Очищаем исключительно список строк

    const activeTab = FriendsState.currentTab;

    // Обновляем текст заголовка в зависимости от активного таба
    if (headerTitleNode) {
        if (activeTab === 'active_friends') headerTitleNode.textContent = _t('friends.fr_my_friends') || 'My Friends';
        else if (activeTab === 'inbound_requests') headerTitleNode.textContent = _t('friends.fr_requests') || 'Friend Requests';
        else if (activeTab === 'add_recommendations') headerTitleNode.textContent = _t('friends.fr_find_players') || 'Find New Players';
        else if (activeTab === 'blacklist') headerTitleNode.textContent = _t('friends.fr_blacklist') || 'Blacklist';
    }

    if (currentTabDataList.length === 0) {
        const emptyBox = document.createElement('div');
        Object.assign(emptyBox.style, { margin: 'auto', color: '#444', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' });

        if (activeTab === 'active_friends') emptyBox.textContent = _t('friends.fr_no_friends') || 'Your friends list is empty...';
        else if (activeTab === 'inbound_requests') emptyBox.textContent = _t('friends.fr_no_requests') || 'No inbound friend requests...';
        else if (activeTab === 'add_recommendations') emptyBox.textContent = _t('friends.fr_no_recommendations') || 'No recommendations found...';
        else if (activeTab === 'blacklist') emptyBox.textContent = _t('friends.fr_blacklist_empty') || 'Blacklist is clear.';

        scrollContainer.appendChild(emptyBox);
        return;
    }

    // Генерируем строки на чистом JS
    currentTabDataList.forEach(item => {
        const rowNode = document.createElement('div');
        Object.assign(rowNode.style, {
            width: '100%',
            height: '54px',
            background: '#141414',
            border: '1px solid #1f1f1f',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            boxSizing: 'border-box',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: '0'
        });

        // Левая часть: аватар, имя, уровень/сила
        const leftBlock = document.createElement('div');
        Object.assign(leftBlock.style, { display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' });

        if (item.avatar_icon) {
            const avatarImg = document.createElement('img');
            Object.assign(avatarImg.style, { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #333', objectFit: 'cover' });
            avatarImg.src = window.gameAssets?.[item.avatar_icon] || item.avatar_icon || './assets/images/heroes/heroAvatars/eleniel.webp';
            leftBlock.appendChild(avatarImg);
        }

        const infoDiv = document.createElement('div');
        Object.assign(infoDiv.style, { display: 'flex', flexDirection: 'column', textAlign: 'left' });

        const nameB = document.createElement('b');
        Object.assign(nameB.style, { fontSize: '12px', color: '#fff' });
        nameB.innerHTML = `${item.nickname} <span style="font-size:10px; color:#555; font-weight:normal;">${_t('friends.fr_level_short') || 'Lv.'}${item.level || 0}</span>`;
        infoDiv.appendChild(nameB);

        // Показываем статус сети для вкладки друзей, или Силу для рекомендаций
        if (activeTab === 'active_friends') {
            const statusSpan = document.createElement('span');
            if (item.isOnline) {
                statusSpan.style.color = '#4caf50';
                statusSpan.style.fontSize = '11px';
                statusSpan.textContent = `● ${_t('friends.fr_status_online') || 'Online'}`;
            } else {
                statusSpan.style.color = '#555';
                statusSpan.style.fontSize = '10px';
                statusSpan.textContent = _t('friends.fr_status_offline') || 'Offline';
            }
            infoDiv.appendChild(statusSpan);
        } else if (activeTab === 'add_recommendations' && item.combat_power) {
            const powerSpan = document.createElement('span');
            Object.assign(powerSpan.style, { fontSize: '10px', color: '#555' });
            powerSpan.textContent = `⚔️ ${_t('friends.fr_combat_power') || 'Power'}: ${item.combat_power.toLocaleString()}`;
            infoDiv.appendChild(powerSpan);
        }

        leftBlock.appendChild(infoDiv);
        rowNode.appendChild(leftBlock);

        // Правая часть: Управляющие кнопки действий
        const actionsDiv = document.createElement('div');
        Object.assign(actionsDiv.style, { display: 'flex', gap: '8px' });

        const createBtn = (text, bg, border, color, actionName, isDisabled = false) => {
            const btn = document.createElement('button');
            btn.className = 'fr-action-btn';
            btn.textContent = text;
            Object.assign(btn.style, {
                padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: isDisabled ? 'default' : 'pointer', background: bg, border: border, color: color
            });
            btn.disabled = isDisabled;

            if (!isDisabled) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    // Чистые сокет-интенты из оригинального файла
                    if (actionName === 'heart') sendSocket('friends', 'sendHeart', { friendId: item.id });
                    else if (actionName === 'remove') sendSocket('friends', 'removeFriend', { friendId: item.id });
                    else if (actionName === 'accept') sendSocket('friends', 'acceptRequest', { friendId: item.id });
                    else if (actionName === 'decline') sendSocket('friends', 'declineRequest', { friendId: item.id });
                    else if (actionName === 'request') sendSocket('friends', 'sendFriendRequest', { targetFriendId: item.id });
                    else if (actionName === 'block') sendSocket('friends', 'blockUser', { targetId: item.id });
                    else if (actionName === 'unblock') sendSocket('friends', 'unblockUser', { targetId: item.id });
                };
            }
            return btn;
        };

        // Разделяем наборы кнопок по вкладкам хаба
        if (activeTab === 'active_friends') {
            if (item.isHeartSent) {
                actionsDiv.appendChild(createBtn(_t('friends.fr_btn_heart_sent') || 'Sent ✓', '#1a1a1a', '1px solid #333', '#555', 'heart', true));
            } else {
                actionsDiv.appendChild(createBtn(_t('friends.fr_btn_heart_gift') || '❤️ Gift', '#222', '1px solid #ff4081', '#ff4081', 'heart'));
            }
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_remove') || 'Remove', '#222', '1px solid #444', '#aaa', 'remove'));
        }
        else if (activeTab === 'inbound_requests') {
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_accept') || 'Accept', 'linear-gradient(135deg, #4ecca3, #2b9371)', 'none', '#12122c', 'accept'));
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_decline') || 'Decline', '#222', '1px solid #e94560', '#e94560', 'decline'));
        }
        else if (activeTab === 'add_recommendations') {
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_send_request') || 'Send Request', 'linear-gradient(135deg, #ffcc00, #b38f00)', 'none', '#12122c', 'request'));
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_block') || 'Block', '#222', '1px solid #e94560', '#e94560', 'block'));
        }
        else if (activeTab === 'blacklist') {
            actionsDiv.appendChild(createBtn(_t('friends.fr_btn_unblock') || 'Unblock', '#222', '1px solid #444', '#aaa', 'unblock'));
        }

        rowNode.appendChild(actionsDiv);
        scrollContainer.appendChild(rowNode);
    });
}


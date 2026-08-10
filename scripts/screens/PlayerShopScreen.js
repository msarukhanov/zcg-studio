import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}


// Глобальный кэш-стейт текущей сессии магазина
const ShopFilters = {
    currentShopId: 'random_market', // ID активного магазина
    shopsData: {}                   // Локальный кэш состояний витрин, пришедших от бэка
};

/**
 * 🛒 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер экрана Игрового Магазина
 */
export function renderPlayerShopScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Вытягиваем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'player_shop') || {};
    const listSettings = screenSettings.list_settings || {};

    const gridColumns = listSettings.grid_columns || 4;
    const rowHeight = listSettings.grid_row_height || "155px";
    const gap = listSettings.gap || "2%";
    const padding = listSettings.padding || "12px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#1a1a1a";

    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (уберется автоматически при наличии данных)
    if (!AppState.config?.catalog?.shops || Object.keys(AppState.config.catalog.shops).length === 0) {
        if (!AppState.config) AppState.config = {};
        if (!AppState.config.catalog) AppState.config.catalog = {};

        // Мокаем лавки в каталоге
        AppState.config.catalog.shops = {
            'random_market': { order: 1, title_loc: 'Бродячий Торговец', desc_loc: 'Случайные товары со всего света', requirements: { player_level: 1, vip_level: 0 }, refresh_settings: { auto_refresh_interval_ms: 14400000, manual_refresh_cost: { amount: 50 } }, poolId: 'p_market' },
            'vip_bazaar': { order: 2, title_loc: 'VIP Базар', desc_loc: 'Божественные артефакты для избранных', requirements: { player_level: 50, vip_level: 3 }, refresh_settings: { auto_refresh_interval_ms: 0 }, poolId: 'p_vip' }
        };

        // Мокаем состояние витрины от бэкенда в кэш
        ShopFilters.shopsData['random_market'] = {
            is_locked: false,
            state: {
                last_auto_refresh: Date.now() - 3600000, // час назад
                showcase: [
                    { slotId: 'slot_01', itemId: 'potion_energy', amount: 5, bought_count: 0, buy_limit: 3, cost: { resource: 'diamond', amount: 150 }, old_cost: { amount: 300 } },
                    { slotId: 'slot_02', itemId: 'sword_olympus', amount: 1, bought_count: 1, buy_limit: 1, cost: { resource: 'diamond', amount: 5000 } },
                    { slotId: 'slot_03', itemId: 'crystal_sh_01', amount: 10, bought_count: 2, buy_limit: 5, cost: { resource: 'gold', amount: 25000 } }
                ]
            }
        };

        if (!AppState.player) AppState.player = { level: 10, vip_level: 0, resources: { gold: 100000, diamond: 800 } };
        if (!AppState.ConfigItems) {
            AppState.ConfigItems = {
                'potion_energy': { icon: '🧪', title_loc: 'Зелье Нектара' },
                'sword_olympus': { icon: '⚔️', title_loc: 'Меч Олимпа' },
                'crystal_sh_01': { icon: '💎', title_loc: 'Осколок Звезд' }
            };
        }
    }

    // Обработка данных ответа сокета, если они прилетели в глобальный Game.shop или AppState.shop
    const socketShopPack = AppState.shop;
    if (socketShopPack) {
        const activeId = ShopFilters.currentShopId;
        if (socketShopPack.error) {
            console.error(`[Shop Socket Error]: ${socketShopPack.error}`);
        } else if (!socketShopPack.is_locked) {
            ShopFilters.shopsData[activeId] = { is_locked: false, state: socketShopPack.state };
        } else {
            ShopFilters.shopsData[activeId] = { is_locked: true };
        }
        AppState.shop = null; // Погасили буфер
    }

    const activeShopId = ShopFilters.currentShopId;
    const activeShopConfig = AppState.config?.catalog?.shops?.[activeShopId];
    const cachedShopNode = ShopFilters.shopsData[activeShopId] || {};

    // Сортируем лавки по порядку из конфига
    const sortedShops = Object.entries(AppState.config?.catalog?.shops || {})
.sort((a, b) => (a.order || 0) - (b.order || 0));

    // =========================================================================
    // 🔍 ПРОВЕРКА КАРКАСА (МГНОВЕННЫЙ РАЗРЫВ РЕНДЕР-ПЕТЛИ ТАЙМЕРОВ)
    // =========================================================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-player_shop');

    if (screenWrapper) {
        // Каркас готов! Точечно обновляем заголовок, витрину и перезапускаем таймеры
        updateShopDynamicShowcase(screenWrapper, cachedShopNode, activeShopConfig, gridColumns, rowHeight, gap, padding, headerHeight, headerBg);
        return;
    }

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-player_shop';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'row', boxSizing: 'border-box',
        userSelect: 'none', zIndex: '500', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВОЕ МЕНЮ: САЙДБАР МАГАЗИНОВ (СТРОИТСЯ СТРОГО ОДИН РАЗ)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar-filters';
    Object.assign(sidebar.style, {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderRight: '1px solid #333', padding: '5px', boxSizing: 'border-box',
        height: '100%', width: '110px', flexShrink: '0', backgroundColor: 'rgba(20, 20, 20, 0.8)'
    });

    const tabsContainer = document.createElement('div');
    Object.assign(tabsContainer.style, { display: 'flex', flexDirection: 'column', width: '100%', gap: '6px', pointerEvents: 'auto', overflowY: 'auto', flex: '1' });

    sortedShops.forEach(([id, s]) => {
        const isActive = activeShopId === id;
        const pLevel = AppState.player?.level || 1;
        const pVip = AppState.player?.vip_level || 0;
        const isTabLocked = (pLevel < s.requirements?.player_level) || (pVip < s.requirements?.vip_level);

        const btn = document.createElement('button');
        btn.className = 'btn-shop-tab';
        btn.setAttribute('data-shop-id', id);
        Object.assign(btn.style, {
            width: '100%', minHeight: '45px', background: isActive ? '#ffcc00' : '#111',
            color: isActive ? '#000' : '#fff', border: `2px solid ${isActive ? '#ffcc00' : '#444'}`,
            borderRadius: '6px', padding: '4px', cursor: 'pointer', font_weight: 'bold',
            fontSize: '11px', fontWeight: 'bold', flexShrink: '0'
        });

        btn.textContent = `${isTabLocked ? '🔒 ' : ''}${_loc(s.title_loc)}`;

        btn.onclick = (e) => {
            e.stopPropagation();
            if (ShopFilters.currentShopId === id) return;
            ShopFilters.currentShopId = id;

            // Запрашиваем состояние новой лавки у бэка
            sendSocket('shop', 'getShopState', { shopId: id });

            // Переключаем подсветку кнопок на лету
            sidebar.querySelectorAll('.btn-shop-tab').forEach(b => {
                const bId = b.getAttribute('data-shop-id');
                const isBActive = bId === id;
                b.style.background = isBActive ? '#ffcc00' : '#111';
                b.style.color = isBActive ? '#000' : '#fff';
                b.style.borderColor = isBActive ? '#ffcc00' : '#444';
            });

            renderPlayerShopScreen(); // Перезапускаем точечный рендерер контента
        };

        tabsContainer.appendChild(btn);
    });
    sidebar.appendChild(tabsContainer);
    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // ПРАВАЯ ЗОНА: СТАТИЧЕСКИЕ ПУСТЫЕ СЛОТЫ ПОД ЗАСЕЛЕНИЕ ВИТРИНЫ
    // =========================================================================
    const rightContentArea = document.createElement('div');
    rightContentArea.className = 'shop-right-content-area';
    Object.assign(rightContentArea.style, { display: 'flex', flexDirection: 'column', flex: '1', height: '100%', overflow: 'hidden' });

    rightContentArea.innerHTML = `
        <div class="shop-header-slot"></div>
        <div class="shop-grid-container-slot" style="flex:1;"></div>
    `;
    screenWrapper.appendChild(rightContentArea);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Запускаем первичное наполнение созданной пустой витрины товарами
    updateShopDynamicShowcase(screenWrapper, cachedShopNode, activeShopConfig, gridColumns, rowHeight, gap, padding, headerHeight, headerBg);
}

/**
 * 🔄 ТОЧЕЧНОЕ ОБНОВЛЕНИЕ ВИТРИНЫ МАГАЗИНА И ЗАПУСК ТАЙМЕРОВ ОБРАТНОГО ОТСЧЕТА
 */
/**
 * 🔄 ТОЧЕЧНОЕ ОБНОВЛЕНИЕ ВИТРИНЫ МАГАЗИНА (СТРОГО ПО КОНФИГУ PLAYER_SHOP)
 */
function updateShopDynamicShowcase(screenWrapper, cachedShopNode, activeShopConfig, gridColumns, rowHeight, gap, padding, headerHeight, headerBg) {
    const headerSlot = screenWrapper.querySelector('.shop-header-slot');
    const gridSlot = screenWrapper.querySelector('.shop-grid-container-slot');
    if (!headerSlot || !gridSlot) return;

    // Снова вытягиваем актуальный card_layout для отрисовки карточек
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'player_shop') || {};
    const listSettings = screenSettings.list_settings || {};
    const cardLayout = listSettings.card_layout || {};

    // --- 1. ОБНОВЛЕНИЕ ХЕДЕРА МАГАЗИНА (ТАЙМЕРЫ + КНОПКА СБРОСА) ---
    headerSlot.innerHTML = '';
    const headerWrapper = document.createElement('div');
    Object.assign(headerWrapper.style, {
        width: '100%', height: headerHeight, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 60px 0 15px', boxSizing: 'border-box',
        borderBottom: '1px solid #333', background: headerBg, flexShrink: '0', pointerEvents: 'auto'
    });

    const titleDiv = document.createElement('div');
    Object.assign(titleDiv.style, { fontSize: '14px', color: '#ffcc00', fontWeight: 'bold' });
    titleDiv.innerHTML = `🛒 <span>${activeShopConfig ? _loc(activeShopConfig.title_loc) : ''}</span>`;
    headerWrapper.appendChild(titleDiv);

    const rightControls = document.createElement('div');
    Object.assign(rightControls.style, { display: 'flex', alignItems: 'center', gap: '15px' });

    const autoRefreshInterval = activeShopConfig?.refresh_settings?.auto_refresh_interval_ms || 0;
    if (autoRefreshInterval > 0) {
        const timerContainer = document.createElement('div');
        Object.assign(timerContainer.style, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' });
        timerContainer.innerHTML = `<span>${_t('next_refresh') || 'Сброс через'}:</span> <span id="shop-auto-refresh-timer" style="color: #fff; font-weight: bold;">--:--:--</span>`;
        rightControls.appendChild(timerContainer);
    }

    const manualRefreshCost = activeShopConfig?.refresh_settings?.manual_refresh_cost;
    if (manualRefreshCost) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'btn-shop-manual-refresh';
        Object.assign(refreshBtn.style, { height: '26px', padding: '0 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' });
        refreshBtn.innerHTML = `<span>${_t('refresh_btn') || 'Обновить'}</span> <span style="color: #ffcc00;">${manualRefreshCost.amount} 💎</span>`;
        refreshBtn.onclick = (e) => {
            e.stopPropagation();
            sendSocket('shop', 'refreshShopManual', { shopId: ShopFilters.currentShopId });
        };
        rightControls.appendChild(refreshBtn);
    }
    headerWrapper.appendChild(rightControls);
    headerSlot.appendChild(headerWrapper);

    // --- 2. ОБНОВЛЕНИЕ СЕТКИ ТОВАРОВ (GRID ВИТРИНЫ) ---
    gridSlot.innerHTML = '';
    const serverState = cachedShopNode.state;

    if (cachedShopNode.is_locked) {
        const reqs = activeShopConfig?.requirements || { player_level: 0, vip_level: 0 };
        gridSlot.innerHTML = `<div style="color:#ff4444; padding:40px; width:100%; text-align:center; font-size:14px; font-weight:bold;">🔒 ${_t('shop_locked_msg') || 'Магазин заблокирован'} (Требуется: Ур. ${reqs.player_level}, VIP ${reqs.vip_level})</div>`;
        return;
    }

    if (!serverState || !serverState.showcase || serverState.showcase.length === 0) {
        gridSlot.innerHTML = `<div style="color:#aaa; padding:20px; width:100%; text-align:center; font-size:12px;">${_t('loading') || 'Загрузка'}...</div>`;
        return;
    }

    const gridContainer = document.createElement('div');
    Object.assign(gridContainer.style, {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gridAutoRows: 'max-content', // ИСПРАВЛЕНО: Даем карточкам самим определять высоту через их личный aspectRatio
        gap: gap, width: '100%', height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: padding, pointerEvents: 'auto'
    });

    serverState.showcase.forEach(slot => {
        const itemProto = AppState.ConfigItems?.[slot.itemId] || AppState.config?.catalog?.items?.[slot.itemId];
        const isSoldOut = slot.bought_count >= slot.buy_limit;
        const isCash = slot.cost.resource === 'usd';
        const displayPrice = isCash ? `$${slot.cost.amount.toFixed(2)}` : slot.cost.amount;

        let currencyIcon = '🔮';
        if (isCash) currencyIcon = '💵';
        else if (slot.cost.resource === 'gold') currencyIcon = '💰';
        else if (slot.cost.resource === 'diamond') currencyIcon = '💎';

        const card = document.createElement('div');
        card.className = `shop-card ${isSoldOut ? '' : 'shop-card-clickable'}`;
        card.setAttribute('data-slot-id', slot.slotId);

        console.log(cardLayout.aspectRatio);
        // УЧИТЫВАЕМ ВСЕ НАСТРОЙКИ КАРТОЧКИ ИЗ КОНФИГА: backgroundColor, borderRadius, height, aspectRatio
        Object.assign(card.style, {
            background: cardLayout.backgroundColor || '#1e1e1e',
            border: '1px solid #444',
            borderRadius: cardLayout.borderRadius || '8px',
            height: cardLayout.height || '100%',
            aspectRatio: cardLayout.aspectRatio || '9 / 16', // Учитываем соотношение сторон 9:16
            padding: '10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', boxSizing: 'border-box', textAlign: 'center',
            opacity: isSoldOut ? '0.5' : '1'
        });

        card.innerHTML = `
            <div style="position: absolute; top: 5px; right: 8px; font-size: 10px; color: #888;">${slot.bought_count}/${slot.buy_limit}</div>
            <div style="font-size: 36px; margin-top: 10px; position: relative;">
                ${itemProto?.icon || '📦'}
                <span style="position: absolute; bottom: -5px; right: -10px; background: rgba(0,0,0,0.8); color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 10px; font-weight: bold;">x${slot.amount}</span>
            </div>
            <!-- УЧИТЫВАЕМ РАЗМЕР ШРИФТА ДЛЯ НАЗВАНИЯ ИЗ JSON (title_font_size) -->
            <div style="font-size: ${cardLayout.title_font_size || '12px'}; color: #fff; margin: 10px 0 5px 0; font-weight: bold; min-height: 32px; display: flex; align-items: center; justify-content: center;">${itemProto ? _loc(itemProto.title_loc) : slot.itemId}</div>
            <div style="min-height: 14px; font-size: 10px; color: #666; text-decoration: line-through;">${slot.old_cost ? (isCash ? `$${slot.old_cost.amount.toFixed(2)}` : slot.old_cost.amount) : ''}</div>
        `;

        if (isSoldOut) {
            // УЧИТЫВАЕМ ЦВЕТА ОФОРМЛЕНИЯ РАСПРОДАННОГО ТОВАРА ИЗ JSON (sold_out_bg, sold_out_color)
            card.innerHTML += `<div style="width: 100%; height: 26px; background: ${cardLayout.sold_out_bg || '#333333'}; color: ${cardLayout.sold_out_color || '#ff3333'}; font-weight: bold; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px;">SOLD OUT</div>`;
        } else {
            const buyBtn = document.createElement('button');
            // УЧИТЫВАЕМ АЦЕНТНЫЙ ЦВЕТ И ШРИФТ ЦЕНЫ ИЗ JSON (accent_color, price_font_size)
            Object.assign(buyBtn.style, {
                width: '100%', height: '26px',
                background: cardLayout.accent_color || '#ffcc00',
                color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold',
                fontSize: cardLayout.price_font_size || '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            });
            buyBtn.innerHTML = `<span>${displayPrice}</span> <span>${currencyIcon}</span>`;

            card.onclick = (e) => {
                e.stopPropagation();
                openBuyModal(ShopFilters.currentShopId, slot, (newResources, newState) => {
                    ShopFilters.shopsData[ShopFilters.currentShopId].state = newState;
                    if (AppState.player) AppState.player.resources = newResources;
                    renderPlayerShopScreen();
                });
            };
            card.appendChild(buyBtn);
        }
        gridContainer.appendChild(card);
    });
    gridSlot.appendChild(gridContainer);

    // --- 3. ИНИЦИАЛИЗАЦИЯ И ТИКЕР ТАЙМЕРА ОБРАТНОГО ОТСЧЕТА ---
    if (window.shopTimerInterval) { clearInterval(window.shopTimerInterval); window.shopTimerInterval = null; }

    const timerElement = screenWrapper.querySelector('#shop-auto-refresh-timer');
    if (timerElement && serverState?.last_auto_refresh && autoRefreshInterval > 0) {
        const nextRefreshTime = serverState.last_auto_refresh + autoRefreshInterval;

        const updateTimerTicker = () => {
            const diff = nextRefreshTime - Date.now();
            if (diff <= 0) {
                clearInterval(window.shopTimerInterval);
                sendSocket('shop', 'getShopState', { shopId: ShopFilters.currentShopId });
                return;
            }
            const sec = Math.floor((diff / 1000) % 60);
            const min = Math.floor((diff / (1000 * 60)) % 60);
            const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
            timerElement.innerText = `${String(hrs).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        };
        updateTimerTicker();
        window.shopTimerInterval = setInterval(updateTimerTicker, 1000);
    }
}

/**
 * 🪙 МОДАЛЬНОЕ ОКНО ПОКУПКИ ТОВАРОВ С ВЫБОРОМ КОЛИЧЕСТВА И МАТЕМАТИКОЙ КОШЕЛЬКА
 */
export function openBuyModal(shopId, slotItem, onSuccessCallback) {
    const itemProto = AppState.ConfigItems?.[slotItem.itemId] || AppState.config?.catalog?.items?.[slotItem.itemId];

    // 1. РАСЧЕТ МАКСИМАЛЬНОГО ДОСТУПНОГО КОЛИЧЕСТВА ДЛЯ ПОКУПКИ
    const isCash = slotItem.cost.resource === 'usd';
    const remainingLimit = slotItem.buy_limit - slotItem.bought_count;
    let maxByWallet = remainingLimit;

    if (!isCash) {
        const playerBalance = parseInt(AppState.player?.resources?.[slotItem.cost.resource]) || 0;
        if (slotItem.cost.amount > 0) {
            maxByWallet = Math.floor(playerBalance / slotItem.cost.amount);
        }
    }

    // Итоговый максимум: сколько доступно по лимиту товара И сколько игрок может себе позволить
    const absoluteMax = Math.min(remainingLimit, maxByWallet);
    let currentCount = absoluteMax > 0 ? 1 : 0;

    // Сборка иконок валют
    let currencyIcon = '🔮';
    if (isCash) currencyIcon = '💵';
    else if (slotItem.cost.resource === 'gold') currencyIcon = '💰';
    else if (slotItem.cost.resource === 'diamond') currencyIcon = '💎';

    const itemTitle = itemProto ? _loc(itemProto.title_loc) : slotItem.itemId;
    const itemDesc = itemProto ? _loc(itemProto.desc_loc) : '';

    // =========================================================================
    // 📐 ГЕНЕРАЦИЯ ЭЛЕМЕНТОВ ИНТЕРФЕЙСА МОДАЛЬНОГО ОКНА (ЧИСТЫЙ DOM)
    // =========================================================================
    const overlay = document.createElement('div');
    overlay.id = 'shop-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.8)', zIndex: '9999', display: 'flex',
        alignItems: 'center', justifycontent: 'center', justifyContent: 'center', pointerEvents: 'auto'
    });

    const modalBox = document.createElement('div');
    Object.assign(modalBox.style, {
        background: '#111', border: '2px solid #333', borderRadius: '8px',
        width: '340px', padding: '15px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative'
    });

    const mTitle = document.createElement('h2');
    Object.assign(mTitle.style, { margin: '0', fontSize: '16px', color: '#ffcc00', textAlign: 'center' });
    mTitle.textContent = _t('shop_modal_title') || 'Подтверждение покупки';
    modalBox.appendChild(mTitle);

    // Карточка товара внутри модалки
    const cardInfo = document.createElement('div');
    Object.assign(cardInfo.style, { background: '#1a1a1a', border: '1px solid #222', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' });

    const iconWrapper = document.createElement('div');
    Object.assign(iconWrapper.style, { fontSize: '42px', position: 'relative' });
    iconWrapper.textContent = itemProto?.icon || '📦';

    const totalAmountBadge = document.createElement('span');
    Object.assign(totalAmountBadge.style, { position: 'absolute', bottom: '-2px', right: '-8px', background: 'rgba(0,0,0,0.9)', color: '#fff', fontSize: '11px', padding: '1px 5px', border_radius: '10px', borderRadius: '10px', fontWeight: 'bold' });
    iconWrapper.appendChild(totalAmountBadge);
    cardInfo.appendChild(iconWrapper);

    const nameNode = document.createElement('div');
    Object.assign(nameNode.style, { fontSize: '13px', color: '#fff', fontWeight: 'bold' });
    nameNode.textContent = itemTitle;
    cardInfo.appendChild(nameNode);

    const descNode = document.createElement('div');
    Object.assign(descNode.style, { fontSize: '11px', color: '#aaa', textAlign: 'center', minHeight: '24px', padding: '0 5px' });
    descNode.textContent = itemDesc;
    cardInfo.appendChild(descNode);
    modalBox.appendChild(cardInfo);

    // Панель селектора количества (- / + / MAX)
    const counterRow = document.createElement('div');
    Object.assign(counterRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#0a0a0a', border: '1px solid #222', padding: '6px', borderRadius: '6px' });

    const createModalBtn = (text, color, onClickAction) => {
        const b = document.createElement('button');
        b.textContent = text;
        Object.assign(b.style, { height: '30px', background: '#222', color: color, border: '1px solid #444', borderRadius: '4px', font_weight: 'bold', fontWeight: 'bold', cursor: 'pointer', padding: '0 10px' });
        b.onclick = (e) => { e.stopPropagation(); onClickAction(); updateModalData(); };
        return b;
    };

    const countDisplayDiv = document.createElement('div');
    Object.assign(countDisplayDiv.style, { flex: '1', text_align: 'center', textAlign: 'center', fontSize: '16px', color: '#fff', fontWeight: 'bold' });

    const txtCount = document.createElement('span');
    const txtLimitLabel = document.createElement('span');
    Object.assign(txtLimitLabel.style, { fontSize: '11px', color: '#666', fontWeight: 'normal' });
    txtLimitLabel.textContent = ` / ${remainingLimit}`;
    countDisplayDiv.appendChild(txtCount);
    countDisplayDiv.appendChild(txtLimitLabel);

    const btnMinus = createModalBtn('-', '#fff', () => { if (currentCount > 1) currentCount--; });
    const btnPlus = createModalBtn('+', '#fff', () => { if (currentCount < absoluteMax) currentCount++; });
    const btnMax = createModalBtn('MAX', '#ffcc00', () => { currentCount = absoluteMax; });
    btnMinus.style.width = '32px';
    btnPlus.style.width = '32px';

    counterRow.appendChild(btnMinus);
    counterRow.appendChild(countDisplayDiv);
    counterRow.appendChild(btnPlus);
    counterRow.appendChild(btnMax);
    modalBox.appendChild(counterRow);

    // Строка итоговой цены
    const costRow = document.createElement('div');
    Object.assign(costRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', font_size: '12px', fontSize: '12px', padding: '0 5px', color: '#aaa' });
    costRow.innerHTML = `<span>${_t('shop_total_cost') || 'Итоговая стоимость'}:</span>`;

    const totalCostDiv = document.createElement('div');
    Object.assign(totalCostDiv.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold', color: '#fff' });
    const txtTotalCost = document.createElement('span');
    totalCostDiv.appendChild(txtTotalCost);
    totalCostDiv.innerHTML += `<span>${currencyIcon}</span>`;
    costRow.appendChild(totalCostDiv);
    modalBox.appendChild(costRow);

    // Кнопки Отмена / Купить
    const actionRow = document.createElement('div');
    Object.assign(actionRow.style, { display: 'flex', gap: '10px', marginTop: '5px' });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = _t('cancel') || 'Отмена';
    Object.assign(btnCancel.style, { flex: '1', height: '34px', background: '#111', color: '#aaa', border: '1px solid #333', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' });
    btnCancel.onclick = (e) => { e.stopPropagation(); overlay.remove(); };
    actionRow.appendChild(btnCancel);

    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = _t('buy') || 'Купить';
    Object.assign(btnConfirm.style, { flex: '1', height: '34px', background: '#ffcc00', color: '#000', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' });

    btnConfirm.onclick = (e) => {
        e.stopPropagation();
        if (currentCount <= 0) return;
        overlay.remove();

        const method = isCash ? 'buyItemCashFake' : 'buyItemVirtual';
        sendSocket('item', method, {
            shopId: shopId,
            slotId: slotItem.slotId,
            count: currentCount
        });
    };
    actionRow.appendChild(btnConfirm);
    modalBox.appendChild(actionRow);

    // --- 3. ДИНАМИЧЕСКИЙ ОБНОВЛЯЕМЫЙ СТАТУС ВНУТРИ ОКНА ---
    const updateModalData = () => {
        txtCount.innerText = currentCount;

        // Пересчитываем общее количество штук лута на выдачу
        modalBox.querySelector('#modal-item-total-amount').innerText = `x${slotItem.amount * currentCount}`;

        // Пересчитываем полную цену
        const rawCost = slotItem.cost.amount * currentCount;
        modalBox.querySelector('#modal-txt-total-cost').innerText = isCash ? rawCost.toFixed(2) : rawCost;

        // Блокировка кнопки, если выбран ноль
        if (currentCount <= 0) {
            Object.assign(btnConfirm.style, { background: '#333', color: '#666', pointerEvents: 'none' });
        } else {
            Object.assign(btnConfirm.style, { background: '#ffcc00', color: '#000', pointerEvents: 'auto' });
        }
    };

    // Первичная инициализация полей
    updateModalData();

    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
}


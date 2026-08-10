import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}


// Единое сессионное состояние фильтрации и выбранного предмета
export const InventoryState = {
    currentCategory: 'all', // 'all' | 'equipment' | 'consumable' | 'material'
    selectedItemId: null    // ID подсвеченного предмета, который отображается в 3-й колонке
};

// Храним локальное количество для массовых операций выбранного в данный момент предмета
let currentActionCount = 1;

/**
 * 🎒 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер экрана Инвентаря
 */
export function renderPlayerInventoryScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Вытягиваем настройки сетки из конфига UI в AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'inventory') || {};
    const listSettings = screenSettings.list_settings || {};

    const gridColumns = listSettings.grid_columns || 5;
    const rowHeight = listSettings.grid_row_height || "70px";
    const gap = listSettings.gap || "8px";
    const padding = listSettings.padding || "10px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#1a1a1a";
    const sidebarWidth = listSettings.sidebar_width || "110px";
    const detailsWidth = listSettings.details_panel_width || "260px";

    const rarityColors = { "UR": "#e63946", "SSR": "#ff9800", "SR": "#9c27b0", "R": "#2196f3" };

    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (уберется автоматически при наличии данных)
    if (!AppState.player || !AppState.player.inventory || Object.keys(AppState.player.inventory).length === 0) {
        if (!AppState.player) AppState.player = {};
        AppState.player.inventory = {
            'sword_olympus': 1,
            'chest_gods_x10': 5,
            'crystal_sh_01': 142,
            'potion_energy': 12
        };
        // Мокаем каталог ConfigCharacters или ConfigItems, если его нет
        AppState.ConfigItems = {
            'sword_olympus': { category: 'equipment', rarity: 'UR', icon: '⚔️', title_loc: 'Меч Олимпа', desc_loc: 'Древний клинок, выкованный в недрах вулкана.', stats: { atk: 550, crit: 15 }, is_usable: false },
            'chest_gods_x10': { category: 'consumable', rarity: 'SSR', icon: '📦', title_loc: 'Сундук Пандоры', desc_loc: 'Содержит 10 случайных артефактов божественного класса.', is_usable: true },
            'crystal_sh_01': { category: 'material', rarity: 'SR', icon: '💎', title_loc: 'Осколок Звезд', desc_loc: 'Используется для эволюции звездного возвышения богов.', is_usable: false },
            'potion_energy': { category: 'consumable', rarity: 'R', icon: '🧪', title_loc: 'Зелье Нектара', desc_loc: 'Восстанавливает 50 единиц выносливости.', is_usable: true }
        };
    }

    const playerInventory = AppState.player?.inventory || {};
    const itemTypesConfig = AppState.config?.mechanics?.item_types || {
        'all': { icon: '🎒', title_loc: 'Все' },
        'equipment': { icon: '🛡️', title_loc: 'Снаряжение' },
        'consumable': { icon: '🧪', title_loc: 'Расходники' },
        'material': { icon: '💎', title_loc: 'Материалы' }
    };

    // Базовый Wrapper всего экрана
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-inventory';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'row', boxSizing: 'border-box',
        userSelect: 'none', zIndex: '500', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВОЕ МЕНЮ КАТЕГОРИЙ (КОЛОНКА 1 - ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar-filters';
    Object.assign(sidebar.style, {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderRight: '1px solid #333', padding: '5px', boxSizing: 'border-box',
        height: '100%', width: sidebarWidth, flexShrink: '0', backgroundColor: 'rgba(10,10,10,0.8)'
    });

    const tabsContainer = document.createElement('div');
    Object.assign(tabsContainer.style, {
        display: 'flex', flexDirection: 'column', width: '100%',
        gap: '6px', pointerEvents: 'auto', overflowY: 'auto', flex: '1'
    });

    Object.entries(itemTypesConfig).forEach(([id, typeData]) => {
        const isActive = InventoryState.currentCategory === id;
        const icon = typeData?.icon || "📦";
        const title = _loc(typeData?.title_loc) || `Category ${id}`;

        const btn = document.createElement('button');
        btn.className = 'btn-inventory-tab';
        btn.setAttribute('data-cat-id', id);
        Object.assign(btn.style, {
            width: '100%', minHeight: '40px',
            background: isActive ? '#ffcc00' : '#111',
            color: isActive ? '#000' : '#fff',
            border: `2px solid ${isActive ? '#ffcc00' : '#444'}`,
            borderRadius: '6px', padding: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 'bold', flexShrink: '0'
        });

        btn.textContent = `${icon} ${title}`;

        btn.onclick = (e) => {
            e.stopPropagation();
            if (InventoryState.currentCategory === id) return;
            InventoryState.currentCategory = id;
            InventoryState.selectedItemId = null; // Сбрасываем фокус при смене вкладки
            currentActionCount = 1; // Сбрасываем счетчик количества
            renderPlayerInventoryScreen(); // Реактивный полный перерендер
        };

        tabsContainer.appendChild(btn);
    });
    sidebar.appendChild(tabsContainer);
    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 🎒 2. ЦЕНТРАЛЬНАЯ СЕТКА ПРЕДМЕТОВ (КОЛОНКА 2 - ЧИСТЫЙ DOM)
    // =========================================================================
    const centerArea = document.createElement('div');
    centerArea.className = 'inventory-center-area';
    Object.assign(centerArea.style, {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'rgba(20,20,20,0.8)'
    });

    // --- ВЕРХНИЙ ХЕДЕР ЦЕНТРАЛЬНОЙ ЧАСТИ ---
    const centerHeader = document.createElement('div');
    centerHeader.className = 'inventory-header';
    Object.assign(centerHeader.style, {
        width: '100%',
        height: headerHeight,
        display: 'flex',
        alignItems: 'center',
        padding: '0 15px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #333',
        background: headerBg,
        flexShrink: '0',
        pointerEvents: 'auto'
    });

    const headerTitle = document.createElement('div');
    Object.assign(headerTitle.style, { fontSize: '14px', color: '#ffcc00', fontWeight: 'bold' });
    headerTitle.innerHTML = `🎒 <span>${_t('inventory.inventory_title') || 'Bag'}</span>`;
    centerHeader.appendChild(headerTitle);
    centerArea.appendChild(centerHeader);

    // --- ФИЛЬТРАЦИЯ И СОРТИРОВКА ПРЕДМЕТОВ ДЛЯ СЕТКИ ---
    const filteredItems = Object.entries(playerInventory).filter(([itemId, count]) => {
        if (count <= 0) return false;
        const meta = AppState.ConfigItems?.[itemId];
        if (!meta) return false;
        if (InventoryState.currentCategory === 'all') return true;
        return meta.category === InventoryState.currentCategory;
    });

    const itemRarityOrder = AppState.config?.mechanics?.rarities?.items || ["R", "SR", "SSR", "UR"];

    // Автосортировка по редкости (Высший индекс редкости идет первым)
    filteredItems.sort((a, b) => {
        const metaA = AppState.ConfigItems?.[a[0]];
        const metaB = AppState.ConfigItems?.[b[0]];
        const indexA = itemRarityOrder.indexOf(metaA?.rarity || "R");
        const indexB = itemRarityOrder.indexOf(metaB?.rarity || "R");
        if (indexB !== indexA) return indexB - indexA;
        return a[0].localeCompare(b[0]); // Если редкость одинаковая, сортируем по алфавиту ID
    });

    // Авто-выбор первого предмета из отсортированного списка при инициализации
    if (filteredItems.length > 0 && (!InventoryState.selectedItemId || !playerInventory[InventoryState.selectedItemId])) {
        InventoryState.selectedItemId = filteredItems[0][0];
    } else if (filteredItems.length === 0) {
        InventoryState.selectedItemId = null;
    }

    // --- СОЗДАНИЕ ГРИД-КОНТЕЙНЕРА ЯЧЕЕК ---
    const gridContainer = document.createElement('div');
    gridContainer.className = 'inventory-grid-container';
    Object.assign(gridContainer.style, {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gridAutoRows: rowHeight,
        gap: gap,
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: padding,
        pointerEvents: 'auto'
    });

    if (filteredItems.length === 0) {
        const emptyWarning = document.createElement('div');
        Object.assign(emptyWarning.style, { color: '#aaa', padding: '20px', width: '100%', textAlign: 'center', fontSize: '12px' });
        emptyWarning.textContent = _t('inventory.inventory_empty') || 'Empty';
        gridContainer.appendChild(emptyWarning);
    } else {
        filteredItems.forEach(([itemId, count]) => {
            const meta = AppState.ConfigItems?.[itemId];
            const isSelected = InventoryState.selectedItemId === itemId;
            const borderColor = meta?.rarity ? (rarityColors[meta.rarity] || '#444') : '#444';
            const itemIcon = meta?.icon || '📦';

            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            cell.setAttribute('data-item-id', itemId);
            Object.assign(cell.style, {
                background: '#1e1e1e',
                border: `2px solid ${isSelected ? '#ffcc00' : borderColor}`,
                borderRadius: '6px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                cursor: 'pointer',
                boxSizing: 'border-box',
                height: '100%'
            });
            cell.textContent = itemIcon;

            // Бадж количества в углу ячейки
            const countBadge = document.createElement('span');
            Object.assign(countBadge.style, {
                position: 'absolute', bottom: '2px', right: '4px',
                background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '10px',
                padding: '1px 4px', border_radius: '8px', borderRadius: '8px',
                fontWeight: 'bold', fontFamily: 'monospace'
            });
            countBadge.textContent = count;
            cell.appendChild(countBadge);

            // Клик по предмету переносит фокус чтения без перезапроса бэка
            cell.onclick = (e) => {
                e.stopPropagation();
                if (InventoryState.selectedItemId === itemId) return;
                InventoryState.selectedItemId = itemId;
                currentActionCount = 1; // Сбрасываем счетчик для нового предмета
                renderPlayerInventoryScreen(); // Локально перерисовываем экран
            };

            gridContainer.appendChild(cell);
        });
    }

    centerArea.appendChild(gridContainer);
    screenWrapper.appendChild(centerArea);

    // =========================================================================
    // 📊 3. ПРАВАЯ ПАНЕЛЬ ИНФОРМАЦИИ (КОЛОНКА 3 - ЧИСТЫЙ DOM)
    // =========================================================================
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'inventory-details-panel';
    Object.assign(detailsPanel.style, {
        width: detailsWidth, height: '100%', backgroundColor: 'rgba(10, 10, 10, .8)',
        borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '60px 12px 12px 12px', // Опускаем под крестик
        boxSizing: 'border-box', flexShrink: '0', pointerEvents: 'auto'
    });

    const activeItemId = InventoryState.selectedItemId;
    const activeItemMeta = activeItemId ? AppState.ConfigItems?.[activeItemId] : null;
    const maxAvailableCount = activeItemId ? (playerInventory[activeItemId] || 0) : 0;

    if (!activeItemMeta || maxAvailableCount <= 0) {
        const noSelectPrompt = document.createElement('div');
        Object.assign(noSelectPrompt.style, { margin: 'auto', color: '#666', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' });
        noSelectPrompt.textContent = _t('inventory.inventory_select_prompt') || 'Выберите предмет...';
        detailsPanel.appendChild(noSelectPrompt);
    } else {
        // Корректируем выбранное количество, если оно вышло за рамки доступного
        if (currentActionCount > maxAvailableCount) currentActionCount = maxAvailableCount;
        if (currentActionCount < 1) currentActionCount = 1;

        // Блок Текстового описания шмотки
        const infoBox = document.createElement('div');
        Object.assign(infoBox.style, { display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', flex: '1', overflowY: 'auto' });

        infoBox.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid #222; padding-bottom:6px; flex-shrink:0;">
                <span style="font-size:28px;">${activeItemMeta.icon || '📦'}</span>
                <div style="display:flex; flex-direction:column;">
                    <b style="font-size:13px; color:#fff;">${_loc(activeItemMeta.title_loc)}</b>
                    <span style="font-size:9px; color:${rarityColors[activeItemMeta.rarity] || '#aaa'}; font-weight:bold; font-family:monospace;">${activeItemMeta.rarity} CLASS</span>
                </div>
            </div>
            <p style="font-size:11px; color:#aaa; line-height:1.4; margin:0; flex:1;">${_loc(activeItemMeta.desc_loc)}</p>
        `;

        // Рендер характеристик (stats), если это шмотка/артефакт
        if (activeItemMeta.stats) {
            const statsBox = document.createElement('div');
            Object.assign(statsBox.style, { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', margin: '5px 0', borderTop: '1px dashed #222', paddingTop: '5px' });
            Object.entries(activeItemMeta.stats).forEach(([statId, val]) => {
                statsBox.innerHTML += `<div style="display:flex; justify-content:space-between; color:#64dfdf;"><span>${statId.toUpperCase()}:</span><b>+${val}</b></div>`;
            });
            infoBox.appendChild(statsBox);
        }
        detailsPanel.appendChild(infoBox);

        // Блок Нижнего Управления (Счетчик количества + Кнопки Действий)
        const controlWrapper = document.createElement('div');
        Object.assign(controlWrapper.style, { display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #222', paddingTop: '10px', flexShrink: '0' });

        // --- СБОРКА СЕЛЕКТОР-СЧЕТЧИКА КОЛИЧЕСТВА ---
        const counterRow = document.createElement('div');
        Object.assign(counterRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080808', padding: '4px', borderRadius: '4px', border: '1px solid #222' });

        const createCountBtn = (text, onClickAction) => {
            const b = document.createElement('button');
            b.textContent = text;
            Object.assign(b.style, { width: '32px', height: '24px', background: '#222', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer' });
            b.onclick = (e) => { e.stopPropagation(); onClickAction(); renderPlayerInventoryScreen(); };
            return b;
        };

        const valDisplay = document.createElement('b');
        Object.assign(valDisplay.style, { fontSize: '12px', color: '#ffcc00', fontFamily: 'monospace' });
        valDisplay.textContent = `${currentActionCount} / ${maxAvailableCount}`;

        counterRow.appendChild(createCountBtn('-', () => { if (currentActionCount > 1) currentActionCount--; }));
        counterRow.appendChild(valDisplay);
        counterRow.appendChild(createCountBtn('+', () => { if (currentActionCount < maxAvailableCount) currentActionCount++; }));

        const maxBtn = createCountBtn('MAX', () => { currentActionCount = maxAvailableCount; });
        maxBtn.style.width = '42px';
        counterRow.appendChild(maxBtn);
        controlWrapper.appendChild(counterRow);

        // --- КНОПКИ ДЕЙСТВИЙ (ПРОДАТЬ / ИСПОЛЬЗОВАТЬ) ---
        const actionRow = document.createElement('div');
        Object.assign(actionRow.style, { display: 'flex', gap: '6px' });

        // Вычисляем золото от продажи, если у предмета прописана базовая цена
        const goldPricePerUnit = activeItemMeta.gold_price || activeItemMeta.price || 0;
        const totalSellProfit = goldPricePerUnit * currentActionCount;

        const sellBtn = document.createElement('button');
        sellBtn.disabled = goldPricePerUnit <= 0;
        sellBtn.innerHTML = goldPricePerUnit > 0 ? `<b style="font-size:11px;">Sell</b><span style="font-size:9px; opacity:0.8; display:block; font-family:monospace;">💰+${totalSellProfit}</span>` : `<b style="font-size:11px; color:#555;">No Value</b>`;
        Object.assign(sellBtn.style, { flex: '1', height: '36px', background: goldPricePerUnit > 0 ? '#ef4444' : '#1a1a1a', border: goldPricePerUnit > 0 ? 'none' : '1px solid #333', color: goldPricePerUnit > 0 ? '#fff' : '#555', borderRadius: '4px', cursor: goldPricePerUnit > 0 ? 'pointer' : 'default' });

        sellBtn.onclick = (e) => {
            e.stopPropagation();
            sendSocket('inventory', 'sellItem', { itemId: activeItemId, count: currentActionCount });
        };
        actionRow.appendChild(sellBtn);

        // Кнопка Использовать (Срабатывает только для usable сундуков/расходников)
        const useBtn = document.createElement('button');
        const isUsable = activeItemMeta.is_usable === true;
        useBtn.disabled = !isUsable;
        useBtn.textContent = isUsable ? (activeItemMeta.category === 'consumable' ? 'Open Box' : 'Use Item') : 'Equipable';
        Object.assign(useBtn.style, { flex: '1', height: '36px', background: isUsable ? 'linear-gradient(135deg, #4ecca3, #2b9371)' : '#1a1a1a', border: isUsable ? 'none' : '1px solid #333', color: isUsable ? '#12122c' : '#555', fontWeight: 'bold', fontSize: '11px', borderRadius: '4px', cursor: isUsable ? 'pointer' : 'default' });

        useBtn.onclick = (e) => {
            e.stopPropagation();
            sendSocket('inventory', 'useItem', { itemId: activeItemId, count: currentActionCount });
        };
        actionRow.appendChild(useBtn);

        controlWrapper.appendChild(actionRow);
        detailsPanel.appendChild(controlWrapper);
    }

    screenWrapper.appendChild(detailsPanel);

    // Окончательно монтируем готовое DOM-дерево инвентаря в корень ScreenManager
    screenManager.rootContainer.appendChild(screenWrapper);
}

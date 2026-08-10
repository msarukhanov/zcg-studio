import { AppState } from '../shared/GameState.js';


// import { sendSocket } from '../db/socket.js';

function sendSocket() {}

// Сессионный стейт экрана призыва (сохраняем выбранный баннер)
export const GachaState = {
    selectedBannerId: null
};

/**
 * 🔮 ГЛАВНАЯ ФУНКЦИЯ: Рендер экрана Алтаря Призыва (Гачи)
 */
export function renderGachaScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Сносим старую верстку и фиксируем текущий ID экрана
    screenManager.currentScreenId = 'gacha';

    // Читаем ориентацию и адаптивные настройки колонок из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const screenSettings = AppState.ui?.[orientation]?.find(w => w.id === 'gacha') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "240px";
    const detailsWidth = listSettings.details_panel_width || "280px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const padding = listSettings.padding || "8px";
    const gap = listSettings.gap || "8px";

    const gachaConfig = AppState.gacha || {};
    const banners = gachaConfig.banners || [];

    // Автоматический выбор первого доступного баннера при инициализации
    if (banners.length > 0 && (!GachaState.selectedBannerId || !banners.some(b => b.id === GachaState.selectedBannerId))) {
        GachaState.selectedBannerId = banners[0].id;
    }

    const activeBanner = banners.find(b => b.id === GachaState.selectedBannerId);

    // Корневой wrapper экрана гачи
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-gacha';
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
        fontFamily: 'sans-serif'
    });

    // =========================================================================
    // 🧱 1. ЛЕВАЯ КОЛОНКА: СПИСОК ДОСТУПНЫХ БАННЕРОВ (ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'gacha-sidebar';
    Object.assign(sidebar.style, {
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333',
        padding: padding,
        boxSizing: 'border-box',
        height: '100%',
        width: sidebarWidth,
        flexShrink: '0',
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        overflowY: 'auto',
        gap: gap,
        pointerEvents: 'auto'
    });

    // Заголовок сайдбара баннеров
    const sidebarTitle = document.createElement('div');
    Object.assign(sidebarTitle.style, {
        fontSize: '11px',
        color: '#666',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px'
    });
    sidebarTitle.textContent = _t('gacha.gacha_banners_title');
    sidebar.appendChild(sidebarTitle);

    // Циклом генерируем плашки баннеров как полноценные DOM-узлы
    banners.forEach(banner => {
        const isSelected = GachaState.selectedBannerId === banner.id;

        const bannerTab = document.createElement('div');
        bannerTab.className = 'gacha-banner-tab';
        bannerTab.setAttribute('data-banner-id', banner.id);

        Object.assign(bannerTab.style, {
            width: '100%',
            minHeight: '54px',
            background: isSelected ? 'linear-gradient(135deg, #2c1a4d, #111)' : '#111',
            border: `2px solid ${isSelected ? '#ffcc00' : '#444'}`,
            borderRadius: '8px',
            padding: '8px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            flexShrink: '0'
        });

        // Иконка баннера
        const iconContainer = document.createElement('div');
        Object.assign(iconContainer.style, {
            fontSize: '24px',
            background: 'rgba(0,0,0,0.3)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border_radius: '6px',
            borderRadius: '6px',
            border: `1px solid ${isSelected ? '#ffcc00' : '#333'}`,
            flexShrink: '0'
        });
        iconContainer.textContent = banner.icon || '🔮';
        bannerTab.appendChild(iconContainer);

        // Инфо-текст баннера (Название + Описание)
        const infoContainer = document.createElement('div');
        Object.assign(infoContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            minWidth: '0',
            flex: '1'
        });

        const bTitle = document.createElement('b');
        Object.assign(bTitle.style, {
            fontSize: '12px',
            color: isSelected ? '#ffcc00' : '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        });
        bTitle.textContent = _loc(banner.title_loc);
        infoContainer.appendChild(bTitle);

        const bDesc = document.createElement('span');
        Object.assign(bDesc.style, {
            fontSize: '10px',
            color: '#888',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        });
        bDesc.textContent = _loc(banner.desc_loc);
        infoContainer.appendChild(bDesc);

        bannerTab.appendChild(infoContainer);

        // Клик по баннеру реактивно обновляет сессию и перезапускает рендер экрана
        bannerTab.onclick = (e) => {
            e.stopPropagation();
            GachaState.selectedBannerId = banner.id;
            renderGachaScreen();
        };

        sidebar.appendChild(bannerTab);
    });

    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 🔮 2. ЦЕНТРАЛЬНАЯ КОЛОНКА: АРТ АЛТАРЯ + ИНФО О ГАРАНТАХ + КНОПКИ ПРИЗЫВА
    // =========================================================================
    const centerArea = document.createElement('div');
    centerArea.className = 'gacha-center-altar';
    Object.assign(centerArea.style, {
        display: 'flex',
        flexDirection: 'column',
        flex: '1', // Занимает всё свободное пространство до правого края
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        // background: 'radial-gradient(circle, #1c103a 0%, #070412 100%)',
        background: 'rgba(20, 20, 20, 0.5)',
        boxSizing: 'border-box'
    });

    // --- Верхний информационный хедер центральной зоны ---
    const centerHeader = document.createElement('div');
    Object.assign(centerHeader.style, {
        width: '100%',
        height: headerHeight,
        display: 'flex',
        alignItems: 'center',
        padding: '0 15px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #222',
        background: headerBg,
        flexShrink: '0',
        pointerEvents: 'auto'
    });

    const headerTitle = document.createElement('div');
    Object.assign(headerTitle.style, {
        fontSize: '13px',
        color: '#ffcc00',
        fontWeight: 'bold'
    });
    headerTitle.innerHTML = `🔮 <span>${_t('gacha.gacha_screen_title')}</span>`;
    centerHeader.appendChild(headerTitle);
    centerArea.appendChild(centerHeader);

    // --- Внутренний контейнер сцены ---
    const visualCenter = document.createElement('div');
    Object.assign(visualCenter.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // Делаем верхний отступ 60px, чтобы элементы плавно уходили ниже топ-панели ресурсов
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative'
    });

    // Регистрируем FX-стили анимаций в head, если их нет
    if (!document.getElementById('gacha-fx-styles')) {
        const fxStyleNode = document.createElement('style');
        fxStyleNode.id = 'gacha-fx-styles';
        fxStyleNode.textContent = `
            @keyframes gachaRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes gachaFloat { 0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 20px #673ab7); } 50% { transform: translateY(-10px); filter: drop-shadow(0 0 35px #9c27b0); } }
        `;
        document.head.appendChild(fxStyleNode);
    }

    if (activeBanner) {
        // Извлекаем актуальные ресурсы и данные пити из AppState
        const playerInv = AppState.player?.inventory || {};
        const playerRes = AppState.player?.resources || {};
        const gachaPity = AppState.player?.gacha_pity?.[activeBanner.id] || {
            main: 0,
            every: {}
        };
        const pool = gachaConfig.pools?.[activeBanner.poolId] || {};

        // --- 1. Врата или магический круг призыва ---
        const gateEffect = document.createElement('div');
        gateEffect.className = 'gacha-gate-effect';
        Object.assign(gateEffect.style, {
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: '4px dashed rgba(156, 39, 176, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 0 40px rgba(103, 58, 183, 0.2)',
            animation: 'gachaRotate 20s linear infinite',
            marginBottom: '15px'
        });

        const gateCore = document.createElement('div');
        Object.assign(gateCore.style, {
            fontSize: '80px',
            animation: 'gachaFloat 4s ease-in-out infinite',
            position: 'absolute',
            top: '80px'
        });
        gateCore.textContent = '✨';

        visualCenter.appendChild(gateEffect);
        visualCenter.appendChild(gateCore);

        // --- 2. Кнопка конфигурации Вишлиста ---
        if (activeBanner.wishlist_enabled) {
            const wishlistBtn = document.createElement('div');
            wishlistBtn.id = 'gacha-btn-open-wishlist';
            Object.assign(wishlistBtn.style, {
                background: 'rgba(0,0,0,0.6)',
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid #ffcc00',
                fontSize: '11px',
                color: '#ffcc00',
                fontWeight: 'bold',
                cursor: 'pointer',
                pointerEvents: 'auto',
                marginBottom: '20px',
                zIndex: '10'
            });
            wishlistBtn.textContent = `💖 ${_t('gacha.gacha_wishlist_btn')}`;
            wishlistBtn.onclick = (e) => {
                e.stopPropagation();
                console.log('Open wishlist modal for:', activeBanner.id);
            };
            visualCenter.appendChild(wishlistBtn);
        }

        // --- 3. Компактный горизонтальный инфо-планшет Гаранта (Pity) ---
        const pityThreshold = activeBanner.pity_threshold || 80;
        const rollsUntilPity = Math.max(0, pityThreshold - gachaPity.main);

        const pityBox = document.createElement('div');
        Object.assign(pityBox.style, {
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #252525',
            padding: '10px 15px',
            borderRadius: '6px',
            width: '320px',
            boxSizing: 'border-box',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        });

        const pityHeader = document.createElement('div');
        Object.assign(pityHeader.style, {
            fontSize: '11px',
            color: '#aaa',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });
        pityHeader.innerHTML = `<span>⭐ ${_t('gacha.gacha_pity_title')}</span><span style="font-family: monospace; color: #ffcc00; font-size: 12px;">${gachaPity.main}/${pityThreshold}</span>`;
        pityBox.appendChild(pityHeader);

        const progressBar = document.createElement('div');
        Object.assign(progressBar.style, {
            width: '100%',
            height: '5px',
            background: '#222',
            borderRadius: '3px',
            overflow: 'hidden',
            border: '1px solid #333'
        });
        const progressFill = document.createElement('div');
        Object.assign(progressFill.style, {
            width: `${(gachaPity.main / pityThreshold) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #9c27b0, #ffcc00)'
        });
        progressBar.appendChild(progressFill);
        pityBox.appendChild(progressBar);

        const pityRemain = document.createElement('div');
        Object.assign(pityRemain.style, {
            fontSize: '9px',
            color: '#666',
            textAlign: 'right'
        });
        pityRemain.innerHTML = `${_t('gacha.gacha_pity_remain') || 'Remaining'}: <b style="color: #ffcc00; font-family: monospace;">${rollsUntilPity}</b>`;
        pityBox.appendChild(pityRemain);

        visualCenter.appendChild(pityBox);

        // --- 4. Нижний горизонтальный ряд кнопок призыва (х1 и х10) ---
        let costCurrencyX1 = activeBanner.cost_item_id;
        let costAmountX1 = activeBanner.cost_amount || 1;
        let isAltX1 = false;
        if (!playerInv[costCurrencyX1] || playerInv[costCurrencyX1] < costAmountX1) {
            costCurrencyX1 = pool.currency || 'diamond';
            costAmountX1 = pool.cost || 2000;
            isAltX1 = true;
        }
        const hasEnoughX1 = isAltX1 ? (parseInt(playerRes[costCurrencyX1]) || 0) >= costAmountX1 : (playerInv[costCurrencyX1] || 0) >= costAmountX1;

        let costCurrencyX10 = activeBanner.cost_item_id;
        let costAmountX10 = (activeBanner.cost_amount || 1) * 10;
        let isAltX10 = false;
        if (!playerInv[costCurrencyX10] || playerInv[costCurrencyX10] < costAmountX10) {
            costCurrencyX10 = pool.currency || 'diamond';
            costAmountX10 = (pool.cost || 2000) * 9; // Скидка на х10 при оплате алмазами
            isAltX10 = true;
        }
        const hasEnoughX10 = isAltX10 ? (parseInt(playerRes[costCurrencyX10]) || 0) >= costAmountX10 : (playerInv[costCurrencyX10] || 0) >= costAmountX10;

        const iconX1 = isAltX1 ? (costCurrencyX1 === 'diamond' ? '💎' : '💰') : '🎫';
        const iconX10 = isAltX10 ? (costCurrencyX10 === 'diamond' ? '💎' : '💰') : '🎫';

        const actionButtonsRow = document.createElement('div');
        Object.assign(actionButtonsRow.style, {
            display: 'flex',
            flexDirection: 'row',
            gap: '15px',
            width: '320px',
            pointerEvents: 'auto'
        });

        // 🔵 Кнопка призвать х1
        const btnX1 = document.createElement('button');
        Object.assign(btnX1.style, {
            flex: '1',
            height: '44px',
            background: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: hasEnoughX1 ? '1' : '0.4',
            transition: '0.2s',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        });
        btnX1.innerHTML = `<b style="font-size: 11px;">Summon x1</b><span style="font-size: 10px; font-family: monospace; opacity: 0.9; margin-top: 1px;">${iconX1} ${costAmountX1}</span>`;
        btnX1.onclick = (e) => {
            e.stopPropagation();
            sendSocket('gacha', 'summon', {
                bannerId: activeBanner.id,
                count: 1,
                wishlist: AppState.player?.gacha_wishlists?.[activeBanner.id] || []
        });
        };
        actionButtonsRow.appendChild(btnX1);

        // 🟣 Кнопка призвать х10
        const btnX10 = document.createElement('button');
        Object.assign(btnX10.style, {
            flex: '1',
            height: '44px',
            background: '#673ab7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: hasEnoughX10 ? '1' : '0.4',
            border: '1px solid #9c27b0',
            boxShadow: '0 4px 12px rgba(156,39,176,0.3)',
            transition: '0.2s'
        });
        btnX10.innerHTML = `<b style = "font-size: 11px; color: #ffcc00;" > Summon x10 </b><span style="font-size: 10px; font-family: monospace; color: #fff; margin-top: 1px;">${iconX10} ${costAmountX10}</span>`;
        btnX10.onclick = (e) => {
            e.stopPropagation();
            sendSocket('gacha', 'summon', {
                bannerId: activeBanner.id,
                count: 10,
                wishlist: AppState.player?.gacha_wishlists?.[activeBanner.id] || []
        });
        };
        actionButtonsRow.appendChild(btnX10);
        visualCenter.appendChild(actionButtonsRow);
    } else {
        const noBannerWarning = document.createElement('div');
        Object.assign(noBannerWarning.style, {
            color: '#666',
            fontSize: '13px'
        });
        noBannerWarning.textContent = _t('gacha_no_banner') || 'Select a banner';
        visualCenter.appendChild(noBannerWarning);
    }
    centerArea.appendChild(visualCenter);
    screenWrapper.appendChild(centerArea);

    // Окончательно монтируем собранный экран в корень ScreenManager
    screenManager.rootContainer.appendChild(screenWrapper);
}

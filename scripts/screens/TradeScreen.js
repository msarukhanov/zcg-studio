// ==== scripts/ui/TradeScreen.js
import { AppState } from '../shared/GameState.js';

export function renderTradeScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // 🚀 СТРОГИЙ ЧИСТЫЙ ФИКС: Читаем торговца напрямую из стейта выделения по твоему стандарту!
    const merchantEntity = AppState.play?.selectedObject;
    if (!merchantEntity) return;

    // Находим активного героя игрока, который инициировал торговлю
    const activeCharId = AppState.play?.activeCharacterId;
    const heroUnit = activeCharId ? AppState.characters?.[activeCharId] : null;
    if (!heroUnit) return;

    // Инициализируем корзину текущей сделки в памяти экрана (актуально для сессии)
    // cart: { [itemId]: count } -> отрицательное количество означает покупку игроком, положительное - продажу торговцу
    const tradeCart = {};

    // 1. СТИЛЬНЫЙ СТРОГИЙ ОВЕРЛЕЙ ЭКРАНА ТОРГОВЛИ
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-trade_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(7, 10, 15, 0.97)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // 2. ЦЕНТРАЛЬНАЯ ДОСКА ТОРГОВЛИ ( maxWidth: 1050px, height: 85vh )
    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden', padding: '25px'
    });
    screenWrapper.appendChild(windowBoard);

    // 3. ФИКСИРОВАННЫЙ КРЕСТИК ЗАКРЫТИЯ ОКНА ТОРГОВЛИ
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => {
        screenManager.clearCurrentScreen();
        screenManager.currentScreenId = null;
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    };
    windowBoard.appendChild(closeBtn);

    // ХЕДЕР ОКНА ТОРГОВЛИ
    const header = document.createElement('div');
    header.style.cssText = 'width:100%; border-bottom:1px solid #232d38; padding-bottom:12px; margin-bottom:15px;';
    header.innerHTML = `<h2 style="color:#ffd166; margin:0; font-size:18px; font-weight:bold; letter-spacing:1px; text-align:center;">${_t('trade.buy')}</h2>`;
    windowBoard.appendChild(header);

    // ТРЕХПАНЕЛЬНОЕ ТЕЛО ЭКРАНА ТОРГОВЛИ (Левая кукла | Центр Корзина | Правая кукла)
    const tradeBody = document.createElement('div');
    Object.assign(tradeBody.style, { width: '100%', flex: '1', display: 'flex', gap: '15px', overflow: 'hidden', boxSizing: 'border-box' });
    windowBoard.appendChild(tradeBody);

    // ПАНЕЛЬ 1 (Слева, 35%): Твой Герой и его Backpack
    const leftHeroPanel = document.createElement('div');
    Object.assign(leftHeroPanel.style, { width: '35%', backgroundColor: '#141a27', border: '1px solid #232d38', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' });
    tradeBody.appendChild(leftHeroPanel);

    // ПАНЕЛЬ 2 (По центру, 30%): Сумма сделки и Кнопка подтверждения
    const centerDealPanel = document.createElement('div');
    Object.assign(centerDealPanel.style, { width: '30%', border: '1px dashed #34495e', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', boxSizing: 'border-box', backgroundColor: '#0d121a' });
    tradeBody.appendChild(centerDealPanel);

    // ПАНЕЛЬ 3 (Справа, 35%): Продавец и его Goods / Backpack
    const rightMerchantPanel = document.createElement('div');
    Object.assign(rightMerchantPanel.style, { width: '35%', backgroundColor: '#141a27', border: '1px solid #232d38', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' });
    tradeBody.appendChild(rightMerchantPanel);

    // ДВИЖОК РЕАКТИВНОГО ПЕРЕРАСЧЕТА ЦЕН И КОРЗИНЫ ТОРГОВЛИ
    const updateTradeInterface = () => {
        leftHeroPanel.innerHTML = '';
        centerDealPanel.innerHTML = '';
        rightMerchantPanel.innerHTML = '';

        // 🛍️ А. РЕНДЕР ЛЕВОЙ ПАНЕЛИ (Твой Герой)
        const heroGold = heroUnit.gold !== undefined ? heroUnit.gold : (AppState.factions?.[heroUnit.faction]?.resources?.gold || 0);
        leftHeroPanel.innerHTML = `
            <div style="text-align:center; border-bottom:1px solid #232d38; padding-bottom:8px;">
                <div style="color:#3498db; font-weight:bold; font-size:14px;">${heroUnit.name.toUpperCase()}</div>
                <div style="color:#ffd166; font-size:12px; font-weight:bold; margin-top:3px;">💰 ${heroGold}</div>
            </div>
            <div style="color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace; margin-bottom:4px;">INVENTORY (BACKPACK)</div>
        `;
        const heroScroll = document.createElement('div');
        Object.assign(heroScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' });
        leftHeroPanel.appendChild(heroScroll);

        // Перебираем вещи в рюкзаке героя
        const hBackpack = heroUnit.backpack || {};
        Object.entries(hBackpack).forEach(([itemId, count]) => {
            // Вычисляем фактическое количество с учетом корзины сделки
            const inCartCount = tradeCart[itemId] || 0;
            const availableCount = count - (inCartCount > 0 ? inCartCount : 0);
            if (availableCount <= 0) return;

            const itemConfig = AppState.items?.[itemId] || { price: 50 };
            const sellPrice = Math.round((itemConfig.price || 50) * 0.7); // Игрок продает за 70% от номинала

            const row = document.createElement('div');
            Object.assign(row.style, { padding: '8px 10px', backgroundColor: '#1b2432', border: '1px solid #2d394b', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
            row.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span style="color:#fff; font-size:12px; font-weight:bold;">${itemId.toUpperCase()}</span>
                    <span style="color:#8a92a6; font-size:10px;">x${availableCount} | ${_t('trade.sell')}: <b style="color:#ffd166;">💰${sellPrice}</b></span>
                </div>
            `;
            const sellBtn = document.createElement('button');
            sellBtn.innerHTML = '➡️';
            Object.assign(sellBtn.style, { padding: '4px 8px', backgroundColor: '#2ea44f', border: 'none', borderRadius: '3px', color: '#fff', cursor: 'pointer', fontSize: '11px' });
            sellBtn.onclick = () => {
                tradeCart[itemId] = (tradeCart[itemId] || 0) + 1;
                updateTradeInterface();
            };
            row.appendChild(sellBtn);
            heroScroll.appendChild(row);
        });

        // 🛍️ Б. РЕНДЕР ПРАВОЙ ПАНЕЛИ (Торговец)
        const merchantGold = merchantEntity.gold !== undefined ? merchantEntity.gold : 9999;
        rightMerchantPanel.innerHTML = `
            <div style="text-align:center; border-bottom:1px solid #232d38; padding-bottom:8px;">
                <div style="color:#e67e22; font-weight:bold; font-size:14px;">${merchantEntity.name.toUpperCase()}</div>
                <div style="color:#ffd166; font-size:12px; font-weight:bold; margin-top:3px;">💰 ${merchantGold}</div>
            </div>
            <div style="color:#8a92a6; font-size:10px; font-weight:bold; font-family:monospace; margin-bottom:4px;">MERCHANT STOCK (GOODS)</div>
        `;
        const merchantScroll = document.createElement('div');
        Object.assign(merchantScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' });
        rightMerchantPanel.appendChild(merchantScroll);

        const mGoods = merchantEntity.goods || merchantEntity.backpack || {};
        Object.entries(mGoods).forEach(([itemId, count]) => {
            const inCartCount = tradeCart[itemId] || 0;
            const availableCount = count + (inCartCount < 0 ? inCartCount : 0);
            if (availableCount <= 0) return;

            const itemConfig = AppState.items?.[itemId] || { price: 50 };
            const buyPrice = itemConfig.price || 50; // Игрок покупает по полной цене

            const row = document.createElement('div');
            Object.assign(row.style, { padding: '8px 10px', backgroundColor: '#1b2432', border: '1px solid #2d394b', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

            const buyBtn = document.createElement('button');
            buyBtn.innerHTML = '⬅️';
            Object.assign(buyBtn.style, { padding: '4px 8px', backgroundColor: '#e67e22', border: 'none', borderRadius: '3px', color: '#fff', cursor: 'pointer', fontSize: '11px' });
            buyBtn.onclick = () => {
                tradeCart[itemId] = (tradeCart[itemId] || 0) - 1;
                updateTradeInterface();
            };
            row.appendChild(buyBtn);

            const textBlock = document.createElement('div');
            textBlock.style.cssText = 'text-align:right; display:flex; flex-direction:column;';
            textBlock.innerHTML = `
                <span style="color:#fff; font-size:12px; font-weight:bold;">${itemId.toUpperCase()}</span>
                <span style="color:#8a92a6; font-size:10px;">x${availableCount} | ${_t('trade.buy')}: <b style="color:#ffd166;">💰${buyPrice}</b></span>
            `;
            row.appendChild(textBlock);
            merchantScroll.appendChild(row);
        });

        // 🛍️ В. РЕНДЕР ЦЕНТРАЛЬНОЙ ПАНЕЛИ (Корзина и Расчет Суммы Сделки)
        const centerTitle = document.createElement('div');
        centerTitle.textContent = _t('trade.current_deal');
        centerTitle.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; letter-spacing:0.5px;';
        centerDealPanel.appendChild(centerTitle);

        const cartScroll = document.createElement('div');
        Object.assign(cartScroll.style, { width: '100%', flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
        centerDealPanel.appendChild(cartScroll);

        let totalDealSum = 0; // Final balance

        Object.entries(tradeCart).forEach(([itemId, count]) => {
            if (count === 0) return;

            const itemConfig = AppState.items?.[itemId] || { price: 50 };
            const buyPrice = itemConfig.price || 50;
            const sellPrice = Math.round(buyPrice * 0.7);

            const cartRow = document.createElement('div');
            Object.assign(cartRow.style, { width: '100%', padding: '6px 8px', backgroundColor: '#161d2a', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', fontSize: '11px' });

            if (count > 0) {
                const rowSum = count * sellPrice;
                totalDealSum += rowSum;
                cartRow.innerHTML = `<span style="color:#2ea44f; font-weight:bold;">💸 ${_t('trade.sell')} ${itemId.toUpperCase()} (x${count})</span> <b style="color:#ffd166;">+${rowSum}</b>`;
            }
            else {
                const absCount = Math.abs(count);
                const rowSum = absCount * buyPrice;
                totalDealSum -= rowSum;
                cartRow.innerHTML = `<span style="color:#e67e22; font-weight:bold;">📦 ${_t('trade.buy')} ${itemId.toUpperCase()} (x${absCount})</span> <b style="color:#e74c3c;">-${rowSum}</b>`;
            }

            const cancelItem = document.createElement('span');
            cancelItem.innerHTML = '✕';
            cancelItem.style.cssText = 'color:#6a737d; cursor:pointer; margin-left:8px; font-weight:bold;';
            cancelItem.onclick = () => {
                tradeCart[itemId] = 0;
                updateTradeInterface();
            };
            cartRow.appendChild(cancelItem);
            cartScroll.appendChild(cartRow);
        });

        const sumDisplay = document.createElement('div');
        sumDisplay.style.cssText = 'text-align:center; margin-top:auto; width:100%; border-top:1px solid #232d38; padding-top:10px;';

        if (totalDealSum > 0) {
            sumDisplay.innerHTML = `<div style="color:#8a92a6; font-size:11px;">${_t('trade.you_receive')}</div><div style="color:#2ea44f; font-size:20px; font-weight:bold;">💰 +${totalDealSum}</div>`;
        } else if (totalDealSum < 0) {
            sumDisplay.innerHTML = `<div style="color:#8a92a6; font-size:11px;">${_t('trade.you_pay')}</div><div style="color:#e74c3c; font-size:20px; font-weight:bold;">💰 ${totalDealSum}</div>`;
        } else {
            sumDisplay.innerHTML = `<div style="color:#8a92a6; font-size:11px;">${_t('trade.deal_balance')}</div><div style="color:#fff; font-size:20px; font-weight:bold;">💰 0</div>`;
        }
        centerDealPanel.appendChild(sumDisplay);

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent =  _t('trade.deal');

        const isPlayerAfford = totalDealSum >= 0 || heroGold >= Math.abs(totalDealSum);
        const isMerchantAfford = totalDealSum <= 0 || merchantGold >= totalDealSum;
        const hasChanges = Object.values(tradeCart).some(v => v !== 0);
        const canExecute = isPlayerAfford && isMerchantAfford && hasChanges;

        Object.assign(acceptBtn.style, {
            width: '100%', padding: '12px', backgroundColor: canExecute ? '#3498db' : '#3a4759',
            border: 'none', borderRadius: '4px', color: '#fff', fontSize: '13px', fontWeight: 'bold',
            cursor: canExecute ? 'pointer' : 'not-allowed', opacity: canExecute ? '1' : '0.6'
        });

        if (canExecute) {
            acceptBtn.onclick = () => {
                if (heroUnit.gold !== undefined) {
                    heroUnit.gold += totalDealSum;
                } else {
                    AppState.factions[heroUnit.faction].resources.gold += totalDealSum;
                }
                if (merchantEntity.gold !== undefined) merchantEntity.gold -= totalDealSum;

                Object.entries(tradeCart).forEach(([itemId, count]) => {
                    if (count === 0) return;

                    if (count > 0) {
                        heroUnit.backpack[itemId] -= count;
                        if (heroUnit.backpack[itemId] <= 0) delete heroUnit.backpack[itemId];

                        const targetStock = merchantEntity.goods || merchantEntity.backpack;
                        targetStock[itemId] = (targetStock[itemId] || 0) + count;
                    }
                    else {
                        const absCount = Math.abs(count);
                        const targetStock = merchantEntity.goods || merchantEntity.backpack;
                        targetStock[itemId] -= absCount;
                        if (targetStock[itemId] <= 0) delete targetStock[itemId];

                        if (!heroUnit.backpack) heroUnit.backpack = {};
                        heroUnit.backpack[itemId] = (heroUnit.backpack[itemId] || 0) + absCount;
                    }
                });

                screenManager.clearCurrentScreen();
                screenManager.currentScreenId = null;
                if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
            };
        }
        centerDealPanel.appendChild(acceptBtn);
    };

    updateTradeInterface();
    screenManager.rootContainer.appendChild(screenWrapper);
}



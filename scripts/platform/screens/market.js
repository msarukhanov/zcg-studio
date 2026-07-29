// scripts/screens/market.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

/**
 * Главная функция рендеринга экрана маркетплейса ассетов
 * @param {HTMLElement} container - Корневой элемент #app-root
 */
export async function renderMarket(container) {
    // 1. Формируем заголовок и структуру витрины с фильтром по типу ассетов
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
            <h1 class="screen-title" style="margin: 0;" data-loc="market_title">${t('market_title')}</h1>
            
            <!-- Быстрый фильтр по типам data-driven ассетов -->
            <select id="market-asset-filter" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 12px; border-radius: 6px; font-size: 14px; outline: none; cursor: pointer;">
                <option value="">All Assets</option>
                <option value="spine_model">Spine Models 🦴</option>
                <option value="ui_kit">UI Interfaces 🖼️</option>
                <option value="combat_preset">Combat Systems ⚔️</option>
            </select>
        </div>
        
        <div class="grid-container" id="market-grid">
            <div style="color: var(--text-muted); font-size: 14px;">Loading marketplace assets...</div>
        </div>
    `;

    const grid = document.getElementById('market-grid');
    const filterSelect = document.getElementById('market-asset-filter');

    // Передаем функцию загрузки, которую можно вызывать повторно при смене фильтра
    async function loadMarketItems(selectedType = '') {
        grid.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">Loading items...</div>`;

        const response = await API.getMarketItems(selectedType);

        if (response.err || !response.items) {
            grid.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">Error loading marketplace: ${response.message || 'Unknown error'}</div>`;
            return;
        }

        if (response.items.length === 0) {
            grid.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">No assets available for this category.</div>`;
            return;
        }

        grid.innerHTML = '';

        // Генерируем карточки товаров
        response.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'zcg-card';

            card.innerHTML = `
                <img src="${item.preview_url || '/assets/default-asset.png'}" class="card-cover" alt="Preview">
                
                <div class="card-body">
                    <span style="color: var(--accent-pink); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${item.asset_type.replace('_', ' ')}
                    </span>
                    <h3 class="card-title" style="margin-top: 4px;">${locObj(item.title_loc)}</h3>
                    <p class="card-desc">${locObj(item.description_loc)}</p>
                    
                    <div class="card-footer" style="margin-top: 12px;">
                        <span class="card-price">$${parseFloat(item.price).toFixed(2)}</span>
                        
                        <button class="zcg-btn btn-success" id="btn-buy-asset-${item.id}">
                            ${t('btn_buy', `$${parseFloat(item.price).toFixed(2)}`)}
                        </button>
                    </div>
                </div>
            `;

            grid.appendChild(card);

            // Обработчик клика по кнопке покупки ассета
            document.getElementById(`btn-buy-asset-${item.id}`)?.addEventListener('click', async () => {
                // Если пользователь не залогинен — отправляем на форму авторизации
                if (!window.App?.token) {
                    window.location.hash = '#auth';
                    return;
                }

                // Защита: нельзя купить собственный товар
                if (window.App.user?.id === item.creator_id) {
                    alert("You cannot purchase your own asset!");
                    return;
                }

                if (confirm(`Do you want to buy "${locObj(item.title_loc)}" for $${parseFloat(item.price).toFixed(2)}?`)) {
                    const res = await API.buyAsset(item.id);
                    if (!res.err) {
                        alert("Asset successfully purchased! It is now unlocked in your no-code editor.");
                    } else {
                        alert(`Transaction failed: ${res.error || 'Insufficient funds'}`);
                    }
                }
            });
        });
    }

    // Слушаем изменение фильтра в выпадающем списке
    filterSelect?.addEventListener('change', (e) => {
        loadMarketItems(e.target.value);
    });

    // Первая инициализация витрины
    loadMarketItems('');
}

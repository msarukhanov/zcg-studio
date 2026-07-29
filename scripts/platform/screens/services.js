// scripts/screens/services.js
import { API } from '../api.js';
import { t } from '../i18n.js';

/**
 * Главная функция рендеринга экрана Сервисов (Grid-матрица тарифов)
 * @param {HTMLElement} container - Корневой элемент #app-root
 */
export function renderServices(container) {
    const user = window.App?.user;
    if (!user) {
        window.location.hash = '#auth';
        return;
    }

    // Извлекаем актуальный объект лимитов, который прилетел из базы данных при логине
    const services = user.services || {
        gamer_service: { tier_id: 1, limits: { can_play: true, has_battlepass: false } },
        maker_service: { tier_id: 3, limits: { max_games: 3 } },
        asset_animator_service: { tier_id: 5, limits: { max_characters: 10 } }
    };

    const currentGamerId = parseInt(services.gamer_service?.tier_id) || 1;
    const currentMakerId = parseInt(services.maker_service?.tier_id) || 3;
    const currentAnimatorId = parseInt(services.asset_animator_service?.tier_id) || 5;

    // Вычисляем лимиты заранее в JS, чтобы не ломать строки внутри HTML-шаблона
    const maxGamesFree = 3;
    const maxGamesPremium = services.maker_service?.limits?.max_games || 10;
    const maxCharsFree = 10;
    const maxCharsPremium = services.asset_animator_service?.limits?.max_characters || 50;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 32px;">
            <div>
                <h1 class="screen-title" style="margin: 0;" data-loc="services_title">${t('services_title')}</h1>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 6px;">${t('services_desc')}</p>
            </div>

            <!-- --- РАЗДЕЛ 1: GAMER CORE SERVICE --- -->
            <div class="service-section-group">
                <h2 style="font-size: 15px; text-transform: uppercase; color: var(--accent-blue); letter-spacing: 1px; margin-bottom: 16px;">
                    ${t('service_gamer')}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                    
                    <!-- Gamer Free -->
                    <div class="tier-card ${currentGamerId === 1 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Gamer Free</div>
                        <div class="tier-price">$0<span style="font-size:14px; color:var(--text-muted);">/${t('tier_infinite')}</span></div>
                        <div class="tier-features">
                            <div>• ${t('limit_can_play')}</div>
                            <div style="color:var(--text-muted); text-decoration:line-through;">• Premium Battlepass</div>
                        </div>
                        <button class="zcg-btn tier-action-btn" ${currentGamerId === 1 ? 'disabled' : ''}>
                            ${currentGamerId === 1 ? '✓' : 'Select'}
                        </button>
                    </div>

                    <!-- Gamer Battlepass -->
                    <div class="tier-card ${currentGamerId === 2 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Battlepass License</div>
                        <div class="tier-price">$5<span style="font-size:14px; color:var(--text-muted);">/30d</span></div>
                        <div class="tier-features">
                            <div>• ${t('limit_can_play')}</div>
                            <div style="color:var(--neon-green); font-weight:bold;">• ${t('limit_has_bp')}</div>
                        </div>
                        <button class="zcg-btn btn-success tier-action-btn" id="btn-buy-tier-2" ${currentGamerId === 2 ? 'disabled style="background:var(--bg-sidebar); color:var(--neon-green); border:1px solid var(--border-color); cursor:default;"' : ''}>
                            ${currentGamerId === 2 ? '✓' : t('tier_btn_upgrade', '$5.00')}
                        </button>
                    </div>

                </div>
            </div>

            <!-- --- РАЗДЕЛ 2: MAKER ENGINE SERVICE --- -->
            <div class="service-section-group">
                <h2 style="font-size: 15px; text-transform: uppercase; color: var(--accent-blue); letter-spacing: 1px; margin-bottom: 16px;">
                    ${t('service_maker')}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                    
                    <!-- Maker Free -->
                    <div class="tier-card ${currentMakerId === 3 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Maker Free</div>
                        <div class="tier-price">$0<span style="font-size:14px; color:var(--text-muted);">/${t('tier_infinite')}</span></div>
                        <div class="tier-features">
                            <div>• ${t('limit_max_games', maxGamesFree)}</div>
                        </div>
                        <button class="zcg-btn tier-action-btn" ${currentMakerId === 3 ? 'disabled' : ''}>
                            ${currentMakerId === 3 ? '✓' : 'Select'}
                        </button>
                    </div>

                    <!-- Maker Premium -->
                    <div class="tier-card ${currentMakerId === 4 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Maker Premium</div>
                        <div class="tier-price">$25<span style="font-size:14px; color:var(--text-muted);">/30d</span></div>
                        <div class="tier-features">
                            <div style="color:var(--neon-green); font-weight:bold;">• ${t('limit_max_games', maxGamesPremium)}</div>
                        </div>
                        <button class="zcg-btn btn-success tier-action-btn" id="btn-buy-tier-4" ${currentMakerId === 4 ? 'disabled style="background:var(--bg-sidebar); color:var(--neon-green); border:1px solid var(--border-color); cursor:default;"' : ''}>
                            ${currentMakerId === 4 ? '✓' : t('tier_btn_upgrade', '$25.00')}
                        </button>
                    </div>

                </div>
            </div>

            <!-- --- РАЗДЕЛ 3: ASSET ANIMATOR SERVICE --- -->
            <div class="service-section-group">
                <h2 style="font-size: 15px; text-transform: uppercase; color: var(--accent-blue); letter-spacing: 1px; margin-bottom: 16px;">
                    ${t('service_animator')}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                    
                    <!-- Animator Free -->
                    <div class="tier-card ${currentAnimatorId === 5 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Animator Free</div>
                        <div class="tier-price">$0<span style="font-size:14px; color:var(--text-muted);">/${t('tier_infinite')}</span></div>
                        <div class="tier-features">
                            <div>• ${t('limit_max_chars', maxCharsFree)}</div>
                        </div>
                        <button class="zcg-btn tier-action-btn" ${currentAnimatorId === 5 ? 'disabled' : ''}>
                            ${currentAnimatorId === 5 ? '✓' : 'Select'}
                        </button>
                    </div>

                    <!-- Animator Premium -->
                    <div class="tier-card ${currentAnimatorId === 6 ? 'tier-active' : ''}">
                        <div class="tier-badge-active">${t('tier_current')}</div>
                        <div class="tier-name">Animator Premium</div>
                        <div class="tier-price">$10<span style="font-size:14px; color:var(--text-muted);">/30d</span></div>
                        <div class="tier-features">
                            <div style="color:var(--neon-green); font-weight:bold;">• ${t('limit_max_chars', maxCharsPremium)}</div>
                        </div>
                        <button class="zcg-btn btn-success tier-action-btn" id="btn-buy-tier-6" ${currentAnimatorId === 6 ? 'disabled style="background:var(--bg-sidebar); color:var(--neon-green); border:1px solid var(--border-color); cursor:default;"' : ''}>
                            ${currentAnimatorId === 6 ? '✓' : t('tier_btn_upgrade', '$10.00')}
                        </button>
                    </div>

                </div>
            </div>

        </div>
    `;

    initPurchaseButtons();
}

function initPurchaseButtons() {
    const attachClick = (elementId, tierId, priceText) => {
        document.getElementById(elementId)?.addEventListener('click', async () => {
            if (confirm(`Do you want to purchase this license tier for ${priceText}?`)) {
                const res = await API.buySaaSPlan(tierId);
                if (!res.err) {
                    alert("License upgraded successfully! Limits updated.");
                    window.App.checkAuth();
                    renderServices(document.getElementById('app-root'));
                } else {
                    alert(t('alert_tx_failed', res.error));
                }
            }
        });
    };

    attachClick('btn-buy-tier-2', 2, '$5.00');
    attachClick('btn-buy-tier-4', 4, '$25.00');
    attachClick('btn-buy-tier-6', 6, '$10.00');
}

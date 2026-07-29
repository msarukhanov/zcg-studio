// scripts/screens/teamProfile.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

/**
 * Рендеринг публичной страницы команды для игроков
 * @param {HTMLElement} container - Корневой элемент #app-root
 * @param {string} teamId - ID команды из URL-хэша
 */
export async function renderTeamProfile(container, teamId) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">${t('loading_details')}</div>`;

    const response = await API.getTeamProfile(teamId);

    if (response.err || !response.profile) {
        container.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">${t('err_load_details')}</div>`;
        return;
    }

    // Распаковываем массив профиля
    const team = Array.isArray(response.profile) ? response.profile[0] : response.profile;
    const { members, games } = response;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 32px;">
            
            <!-- Карточка студии с кнопкой Подписки -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 24px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; gap: 24px;">
                    <img src="${URL_ASSETS+team.logo_url || '/assets/teams/default-logo.png'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);" alt="Logo">
                    <div style="display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                        <h1 style="font-size: 22px; color: var(--text-main); margin: 0;">${team.name}</h1>
                        <p style="color: var(--text-muted); font-size: 14px; margin: 0;">${locObj(team.description_loc)}</p>
                        <div style="font-size: 13px; color: #ffb703; font-weight: bold;">★ ${parseFloat(team.team_rating).toFixed(2)}</div>
                    </div>
                </div>

                <!-- Кнопка Подписки/Отписки на Ленту обновлений команды -->
                <button class="zcg-btn" id="btn-subscribe-team" style="background-color: var(--accent-blue);">
                    ${t('feed_title')} -- Follow
                </button>
            </div>

            <!-- Двухколоночный контент -->
            <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: flex-start;">
                
                <!-- Левая колонка: Состав разработчиков -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px;">
                    <h3 style="font-size: 15px; margin-bottom: 16px; color: var(--text-muted); text-transform: uppercase;">Team Members</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${members.map(m => `
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px;">
                                <img src="${window.URL_ASSETS+m.avatar_url || '/assets/default-avatar.png'}" style="width: 22px; height: 22px; border-radius: 50%;" alt="Avatar">
                                <span style="font-weight: 600; color: var(--text-main);">${m.display_name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Правая колонка: ПОРТФОЛИО ИГР СТУДИИ -->
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 16px; color: var(--text-main);">Games Portfolio</h2>
                    <div class="grid-container" id="team-portfolio-grid">
                        ${games.map(game => `
                            <div class="zcg-card">
                                ${game.is_mature ? `<span class="badge-mature">${t('badge_mature')}</span>` : ''}
                                <img src="${window.URL_ASSETS + game.cover_image}" class="card-cover" alt="Cover">
                                <div class="card-body">
                                    <h3 class="card-title">${locObj(game.title_loc)}</h3>
                                    <div class="card-footer" style="margin-top: auto; padding-top: 12px;">
                                        ${parseFloat(game.price) > 0
        ? `<span class="card-price">$${parseFloat(game.price).toFixed(2)}</span>`
        : `<span class="card-free">Free-to-Play</span>`
        }
                                        <button class="zcg-btn" id="btn-open-portfolio-${game.id}">Open</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>
        </div>
    `;

    // Навешиваем клики на открытие игр из портфолио
    games.forEach(game => {
        document.getElementById(`btn-open-portfolio-${game.id}`)?.addEventListener('click', () => {
            window.location.hash = `#game/${game.id}`;
        });
    });

    // Обработчик кнопки подписки
    document.getElementById('btn-subscribe-team')?.addEventListener('click', async () => {
        if (!window.App?.token) {
            window.location.hash = '#auth';
            return;
        }

        const res = await API.toggleTeamSubscribe(teamId);
        if (!res.err) {
            alert(res.subscription_status === 'SUBSCRIBED' ? 'Subscribed to team updates!' : 'Unsubscribed.');
        } else {
            alert(t('alert_tx_failed', res.error));
        }
    });
}

// scripts/screens/details.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

export async function renderDetails(container, gameId) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 20px;">${t('loading_details')}</div>`;

    const response = await API.getGamePageData(gameId);

    if (response.err || !response.game) {
        container.innerHTML = `<div style="color: var(--accent-red); padding: 20px;">${t('error_details')}</div>`;
        return;
    }

    const { game, reviews, player_profiles, is_purchased } = response;
    const isFree = parseFloat(game.price) === 0;

    container.innerHTML = `
        <div class="details-layout" style="display: flex; flex-direction: column; gap: 32px;">
            <div class="game-hero-block" style="display: flex; gap: 24px; background: var(--bg-card); padding: 24px; border-radius: 8px; border: 1px solid var(--border-color); position: relative;">
                ${game.is_mature ? `<span class="badge-mature">${t('badge_mature')}</span>` : ''}
                <img src="${window.URL_ASSETS+game.cover_image}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 6px;" alt="Cover">
                
                <div style="display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1;">
                    <div>
                        <h1 style="font-size: 28px; margin-bottom: 8px;">${locObj(game.title_loc)}</h1>
                        
                         <div style="font-size: 14px; margin-bottom: 12px; color: var(--text-muted);">
                            ${t('game_developer_label')} 
                            <span id="link-to-team-profile" style="color: var(--accent-blue); cursor: pointer; font-weight: 600; text-decoration: underline;">
                                ${game.team_id ? 'ZCG team' : 'Independent'}
                            </span>
                        </div>
       
                        <p style="color: var(--text-muted); font-size: 15px; line-height: 1.5; max-width: 600px;">${locObj(game.description_loc)}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-top: 16px;">
                        <div id="action-btn-container"></div>
                        ${!isFree && !is_purchased ? `<span class="card-price" style="font-size: 20px;">$${parseFloat(game.price).toFixed(2)}</span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Галерея медиа контента c поддержкой видео (mp4) -->
            ${game.screenshots && game.screenshots.length > 0 ? `
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 12px; color: var(--text-main);">Media Gallery</h2>
                    <div style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px;">
                        ${game.screenshots.map(url => {
                            
        if (url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('/video/')) {
            return `<video src="${window.URL_ASSETS+url}" controls muted style="width: 240px; height: 135px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #000;"></video>`;
        }
        return `<img src="${window.URL_ASSETS+url}" style="width: 240px; height: 135px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" alt="Media">`;
    }).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="player-profiles-block" style="background: var(--bg-sidebar); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                <h2 style="font-size: 18px; margin-bottom: 16px; color: var(--text-main);">Your Profiles & Servers</h2>
                <div id="profiles-list-container" style="display: flex; flex-direction: column; gap: 12px;"></div>
            </div>

            <div class="reviews-block">
                <h2 style="font-size: 18px; margin-bottom: 16px; color: var(--text-main);">Reviews (${reviews.length})</h2>

                <!-- БЛОК ОТПРАВКИ ОТЗЫВА (Полностью локализован) -->
                ${window.App?.token ? `
                    <div class="write-review-block" style="background: var(--bg-card); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 24px;">
                        <h2 style="font-size: 16px; margin-bottom: 12px; color: var(--text-main);">${t('review_leave_title')}</h2>
                        <form id="review-submit-form" style="display: flex; flex-direction: column; gap: 12px;">

                            <!-- Выбор звезд -->
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="font-size: 14px; color: var(--text-muted);">${t('review_label_rating')}</label>
                                <select id="review-rating" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); color: #ffb703; padding: 6px 12px; border-radius: 6px; font-weight: bold; outline: none; cursor: pointer;">
                                    <option value="5">★★★★★ (5)</option>
                                    <option value="4">★★★★☆ (4)</option>
                                    <option value="3">★★★☆☆ (3)</option>
                                    <option value="2">★★☆☆☆ (2)</option>
                                    <option value="1">★☆☆☆☆ (1)</option>
                                </select>
                            </div>

                            <!-- Текстовое поле -->
                            <textarea id="review-text" required placeholder="${t('review_placeholder')}" style="width: 100%; height: 80px; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none; resize: none;"></textarea>

                            <button type="submit" class="zcg-btn" style="width: fit-content; align-self: flex-end;">${t('review_btn_submit')}</button>
                        </form>
                    </div>
                ` : ''}


                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${reviews.length === 0 ? `<p style="color: var(--text-muted); font-size: 14px;">${t('no_reviews')}</p>` :
        reviews.map(rev => `
                            <div style="background: var(--bg-card); padding: 16px; border-radius: 6px; border: 1px solid var(--border-color);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-weight: 600; font-size: 14px; color: var(--text-main);">${rev.display_name}</span>
                                        ${rev.is_developer ? `<span class="dev-badge-icon" title="Developer">✔️</span>` : ''}
                                    </div>
                                    <span style="color: #ffb703; font-weight: bold;">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</span>
                                </div>
                                <p style="color: var(--text-muted); font-size: 14px; line-height: 1.4;">${rev.comment}</p>
                            </div>
                        `).join('')
        }
                </div>
            </div>
        </div>
    `;

    document.getElementById('link-to-team-profile')?.addEventListener('click', () => {
        if (game.team_id) {
            window.location.hash = `#team-profile/${game.team_id}`;
        }
    });

    initActionZone(gameId, is_purchased, game.price, game.developer_id, game.team_id);
    initPlayerProfiles(player_profiles);
}

function initActionZone(gameId, isPurchased, price, devId, teamId) {
    const container = document.getElementById('action-btn-container');
    if (!container) return;

    const token = window.App?.token;
    const userId = window.App?.user?.id;
    const userTeamId = window.App?.user?.team_id;
    const isDeveloper = (userId && userId === devId) || (userTeamId && userTeamId === teamId);

    container.innerHTML = '';

    // 1. Создаем и настраиваем основную кнопку (Play или Buy)
    const mainBtn = document.createElement('button');
    mainBtn.classList.add('zcg-btn');

    const isFreeOrPurchased = parseFloat(price) === 0 || isPurchased;

    if (isFreeOrPurchased) {
        mainBtn.id = 'btn-action-play';
        mainBtn.textContent = t('btn_play');

        mainBtn.addEventListener('click', async () => {
            if (!token) {
                window.location.hash = '#auth';
                return;
            }
            console.log(window.URL_ASSETS + 'play/?gameId=' + gameId);
            window.location.href = window.URL_ASSETS + 'play/?gameId=' + gameId;
        });
    } else {
        mainBtn.id = 'btn-action-buy';
        mainBtn.classList.add('btn-success');
        mainBtn.textContent = t('btn_buy', `$${parseFloat(price).toFixed(2)}`);

        mainBtn.addEventListener('click', async () => {
            if (!token) {
                window.location.hash = '#auth';
                return;
            }
            const res = await API.actionPlayOrBuy(gameId);
            if (!res.err) {
                renderDetails(document.getElementById('app-root'), gameId);
            } else {
                alert(t('alert_tx_failed', res.message || ''));
            }
        });
    }

// Добавляем основную кнопку в контейнер
    container.appendChild(mainBtn);

// 2. Если пользователь разработчик — создаем и добавляем кнопку редактора
    if (isDeveloper) {
        const editBtn = document.createElement('button');
        editBtn.id = 'btn-action-edit';
        editBtn.className = 'zcg-btn btn-success';
        editBtn.textContent = t('btn_editor_open');

        editBtn.addEventListener('click', () => {
            window.location.href = window.URL_ASSETS + 'editor/?gameId=' + gameId;
        });

        container.appendChild(editBtn);
    }
}

function initPlayerProfiles(profiles) {
    const container = document.getElementById('profiles-list-container');
    if (!container) return;

    if (!window.App?.token) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">${t('login_required_chars')}</p>`;
        return;
    }

    if (profiles.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-muted); font-size: 14px;">${t('no_characters')}</p>
            <button class="zcg-btn" style="width: fit-content; padding: 8px 12px; font-size: 13px; background: var(--bg-card); border: 1px solid var(--border-color);">
                ${t('create_char_placeholder')}
            </button>
        `;
        return;
    }

    container.innerHTML = profiles.map(prof => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 12px 16px; border-radius: 6px; border: 1px solid var(--border-color);">
            <div>
                <span style="color: var(--accent-pink); font-weight: bold; font-size: 13px; display: block; text-transform: uppercase;">[Server: ${prof.server_id}]</span>
                <strong style="font-size: 16px; color: var(--text-main);">${prof.nickname}</strong>
                <span style="color: var(--text-muted); font-size: 14px; margin-left: 12px;">Lv. ${prof.level}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="color: var(--neon-green); font-size: 14px; font-weight: bold;">Power: ${prof.combat_power.toLocaleString()} ⚔️</span>
                <button class="zcg-btn" style="padding: 6px 12px; font-size: 13px;" id="btn-enter-server-${prof.server_id}">
                    ${t('btn_play')}
                </button>
            </div>
        </div>
    `).join('');

    profiles.forEach(prof => {
        document.getElementById(`btn-enter-server-${prof.server_id}`)?.addEventListener('click', () => {
            alert(t('alert_client_run', prof.server_id));
        });
    });

    // Навешиваем событие отправки формы отзыва
    if (window.App?.token) {
        document.getElementById('review-submit-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = document.getElementById('review-rating').value;
            const comment = document.getElementById('review-text').value;

            const res = await API.postReview(gameId, rating, comment);
            if (!res.err) {
                // Реактивно перерисовываем этот же экран деталей, чтобы новый коммент сразу появился в списке!
                renderDetails(document.getElementById('app-root'), gameId);
            } else {
                alert(t('alert_tx_failed', res.error));
            }
        });
    }
}

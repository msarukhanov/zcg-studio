// scripts/screens/feed.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

const state = {
    page: 1
};

export async function renderFeed(container) {

    container.innerHTML = `
        <h1 class="screen-title" data-loc="feed_title">${t('feed_title')}</h1>
        <div id="feed-posts-list">
            <div style="color: var(--text-muted); font-size: 14px;">${t('loading_games')}</div>
        </div>
        <div id="feed-pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 32px;"></div>
    `;

    await updateFeedView();
}

async function updateFeedView() {
    const listContainer = document.getElementById('feed-posts-list');
    const paginationContainer = document.getElementById('feed-pagination');
    if (!listContainer) return;

    const response = await API.getFeed(state.page);

    if (response.err || !response.feed) {
        listContainer.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">${t('err_load_catalog', response.message)}</div>`;
        return;
    }

// Было: ${t('no_market_category')} -> Меняем на правильный текст "Отзывов/постов пока нет":
    if (response.feed.length === 0) {
        listContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">${t('no_reviews')}</div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    listContainer.innerHTML = '';

    response.feed.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        // Форматируем дату публикации в читаемый вид
        const postDate = new Date(post.created_at).toLocaleDateString();

        card.innerHTML = `
            <div class="post-header">
                <img src="${window.URL_ASSETS+post.team_logo}" class="team-avatar-mini" alt="Logo">
                <div class="post-meta">
                    <span class="post-team-name" id="click-team-${post.id}">${post.team_name}</span>
                    <span class="post-date">${postDate}</span>
                </div>
            </div>
            
            <div class="post-content">${locObj(post.text_loc)}</div>
            
            <div class="post-footer-actions">
                <button class="post-action-btn" id="btn-toggle-comments-${post.id}">
                    💬 ${t('reviews_title', post.comments_count)}
                </button>
            </div>
            
            <!-- Изолированный скрытый контейнер для комментариев внутри этого поста -->
            <div id="comments-box-${post.id}" class="id-hidden" style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div id="comments-list-${post.id}" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;"></div>
                
                <!-- Форма быстрой отправки комментария -->
                <form id="comment-form-${post.id}" style="display: flex; gap: 12px;">
                    <input type="text" id="comment-input-${post.id}" required placeholder="${t('review_placeholder')}" style="flex-grow: 1; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                    <button type="submit" class="zcg-btn" style="padding: 8px 16px; font-size: 13px;">${t('review_btn_submit')}</button>
                </form>
            </div>
        `;

        listContainer.appendChild(card);

        // Переход на публичную страницу команды при клике на имя студии
        document.getElementById(`click-team-${post.id}`)?.addEventListener('click', () => {
            window.location.hash = `#team/profile/${post.team_id}`;
        });

        // Логика раскрытия блока обсуждений
        const commentsBox = document.getElementById(`comments-box-${post.id}`);
        document.getElementById(`btn-toggle-comments-${post.id}`)?.addEventListener('click', async () => {
            const isHidden = commentsBox.classList.contains('id-hidden');

            if (isHidden) {
                commentsBox.classList.remove('id-hidden');
                await loadPostComments(post.id);
            } else {
                commentsBox.classList.add('id-hidden');
            }
        });

        // Обработка отправки нового комментария к посту
        document.getElementById(`comment-form-${post.id}`)?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById(`comment-input-${post.id}`);
            const text = input.value.trim();

            if (!text) return;

            const res = await API.postFeedComment(post.id, text);
            if (!res.err) {
                input.value = '';
                await loadPostComments(post.id); // Перерисовываем только ветку комментов под этим постом
            } else {
                alert(t('alert_tx_failed', res.error));
            }
        });
    });

    renderPagination(response.pagination, paginationContainer);
}

/**
 * Локальный fetch комментариев для конкретного открытого поста (БЕЗ ЗАГЛУШЕК)
 * @param {bigint} postId - ID открытого поста команды
 */
async function loadPostComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    // Выводим локализованный статус загрузки
    list.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">${t('loading_details')}</div>`;

    // Делаем реальный запрос к нашему Node.js бэкенду
    const comments = await API.getFeedComments(postId);

    if (comments.err || !Array.isArray(comments)) {
        list.innerHTML = `<div style="color: var(--accent-red); font-size: 12px;">Error loading comments</div>`;
        return;
    }

    // Если обсуждений под постом в PostgreSQL пока нет
    if (comments.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">${t('no_reviews')}</p>`;
        return;
    }

    // Рендерим реальную ветку комментариев из базы данных
    list.innerHTML = comments.map(c => `
        <div style="background: var(--bg-sidebar); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${window.URL_ASSETS+c.avatar_url}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" alt="Avatar">
                <strong style="color: var(--text-main);">${c.display_name}</strong>
                <span style="color: var(--text-muted); font-size: 11px;">
                    ${new Date(c.created_at).toLocaleDateString()}
                </span>
            </div>
            <p style="color: var(--text-muted); margin-top: 4px; line-height: 1.4; padding-left: 28px;">${c.comment}</p>
        </div>
    `).join('');
}


/**
 * Ванильный рендер кнопок страниц для Ленты
 */
function renderPagination(pagination, container) {
    if (!container || !pagination || pagination.total_pages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    for (let i = 1; i <= pagination.total_pages; i++) {
        const btn = document.createElement('button');
        btn.className = `lang-btn ${pagination.current_page === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.style.padding = '6px 12px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            state.page = i;
            updateFeedView();
            document.getElementById('app-root').scrollTop = 0;
        });

        container.appendChild(btn);
    }
}

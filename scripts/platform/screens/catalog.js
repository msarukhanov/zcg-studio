// scripts/screens/catalog.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

// Храним текущее состояние фильтров экрана в памяти SPA
const state = {
    search: '',
    sort_by: 'rating',
    order: 'DESC',
    page: 1,
    min_price: '',
    max_price: '',
    tags: [],
    hide_mature: false
};

export async function renderCatalog(container) {
    // 1. Генерируем разметку поискового интерфейса и панели фильтров
    container.innerHTML = `
        <h1 class="screen-title" data-loc="catalog_title">${t('catalog_title')}</h1>
        
        <!-- 🛠️ ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА -->
        <div class="filter-panel" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Строка 1: Поиск и Сортировка -->
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <input type="text" id="filter-search" value="${state.search}" placeholder="Search games..." style="flex-grow: 1; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                
                <select id="filter-sort" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: 6px; font-size: 14px; outline: none; cursor: pointer;">
                    <option value="rating-DESC" ${state.sort_by === 'rating' && state.order === 'DESC' ? 'selected' : ''}>Top Rated ★</option>
                    <option value="price-ASC" ${state.sort_by === 'price' && state.order === 'ASC' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price-DESC" ${state.sort_by === 'price' && state.order === 'DESC' ? 'selected' : ''}>Price: High to Low</option>
                    <option value="created_at-DESC" ${state.sort_by === 'created_at' && state.order === 'DESC' ? 'selected' : ''}>Newest First</option>
                </select>
            </div>

            <!-- Строка 2: Цены, Теги и Скрытие 18+ -->
            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                <!-- Диапазон цен -->
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="number" id="filter-min-price" value="${state.min_price}" placeholder="Min $" style="width: 80px; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 8px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                    <span style="color: var(--text-muted);">-</span>
                    <input type="number" id="filter-max-price" value="${state.max_price}" placeholder="Max $" style="width: 80px; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 8px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>

                <!-- Быстрый выбор популярных тегов/жанров -->
                <div style="display: flex; gap: 8px;" id="filter-tags-group">
                    <button class="lang-btn ${state.tags.includes('gacha') ? 'active' : ''}" data-tag="gacha">Gacha</button>
                    <button class="lang-btn ${state.tags.includes('jrpg') ? 'active' : ''}" data-tag="jrpg">jRPG</button>
                    <button class="lang-btn ${state.tags.includes('strategy') ? 'active' : ''}" data-tag="strategy">Strategy</button>
                </div>

                <!-- 🔞 Дополнительный флажок принудительного скрытия 18+ контента -->
                ${window.App?.user?.is_mature ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                        <input type="checkbox" id="filter-hide-mature" ${state.hide_mature ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-red);">
                        <label for="filter-hide-mature" style="font-size: 13px; color: var(--text-muted); cursor: pointer;">Hide 18+ content</label>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- СЕТКА ИГР -->
        <div class="grid-container" id="catalog-grid"></div>

        <!-- 📑 ПАНЕЛЬ ПАГИНАЦИИ (СТРАНИЦЫ) -->
        <div id="catalog-pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 32px;"></div>
    `;

    // Привязываем события к интерактивным элементам панели фильтров
    initFilterListeners(container);

    // Запускаем первичное получение данных
    await updateCatalogView();
}

/**
 * Функция отправки запроса и перерисовки сетки карточек
 */
async function updateCatalogView() {
    const grid = document.getElementById('catalog-grid');
    const paginationContainer = document.getElementById('catalog-pagination');
    if (!grid) return;

    grid.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">${t('loading_games')}</div>`;

    // Формируем чистый пакет параметров для API
    const apiParams = {
        search: state.search,
        sort_by: state.sort_by,
        order: state.order,
        page: state.page,
        min_price: state.min_price,
        max_price: state.max_price,
        tags: state.tags.join(','),
        hide_mature: state.hide_mature,
        country: window.App?.user?.country || 'ALL'
};

    const response = await API.getCatalog(apiParams);

    if (response.err || !response.games) {
        grid.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">${t('err_load_catalog', response.message)}</div>`;
        return;
    }

    if (response.games.length === 0) {
        grid.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">${t('no_games_region')}</div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    // Рендерим карточки игр
    grid.innerHTML = '';
    response.games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'zcg-card';
        card.innerHTML = `
            ${game.is_mature ? `<span class="badge-mature">${t('badge_mature')}</span>` : ''}
            <img src="${window.URL_ASSETS + game.cover_image}" class="card-cover" alt="Cover">
            <div class="card-body">
                <h3 class="card-title">${locObj(game.title_loc)}</h3>
                <p class="card-desc">${locObj(game.description_loc)}</p>
                <div class="card-footer">
                    ${parseFloat(game.price) > 0
            ? `<span class="card-price">$${parseFloat(game.price).toFixed(2)}</span>`
            : `<span class="card-free">Free-to-Play</span>`
            }
                    <button class="zcg-btn" id="btn-open-${game.id}">Open</button>
                </div>
            </div>
        `;
        grid.appendChild(card);

        document.getElementById(`btn-open-${game.id}`)?.addEventListener('click', () => {
            window.location.hash = `#game/${game.id}`;
        });
    });

    // Рендерим кнопки страниц (Пагинация)
    renderPaginationControls(response.pagination);
}

/**
 * Инициализация слушателей ввода (Фильтры)
 */
function initFilterListeners(container) {
    // 1. Поиск по названию с эффектом Дебаунса (чтобы не спамить базу при каждой букве)
    let searchTimeout;
    document.getElementById('filter-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        state.search = e.target.value;
        state.page = 1; // Сбрасываем на 1 страницу при новом поиске
        searchTimeout = setTimeout(updateCatalogView, 300);
    });

    // 2. Сортировка
    document.getElementById('filter-sort')?.addEventListener('change', (e) => {
        const [field, order] = e.target.value.split('-');
        state.sort_by = field;
        state.order = order;
        state.page = 1;
        updateCatalogView();
    });

    // 3. Диапазон цен
    const handlePriceInput = () => {
        state.min_price = document.getElementById('filter-min-price').value;
        state.max_price = document.getElementById('filter-max-price').value;
        state.page = 1;
        updateCatalogView();
    };
    document.getElementById('filter-min-price')?.addEventListener('change', handlePriceInput);
    document.getElementById('filter-max-price')?.addEventListener('change', handlePriceInput);

    // 4. Кнопки выбора Тегов/Жанров
    document.querySelectorAll('#filter-tags-group button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.getAttribute('data-tag');
            if (state.tags.includes(tag)) {
                state.tags = state.tags.filter(t => t !== tag);
                e.target.classList.remove('active');
            } else {
                state.tags.push(tag);
                e.target.classList.add('active');
            }
            state.page = 1;
            updateCatalogView();
        });
    });

    // 5. Флаг ручного скрытия 18+
    document.getElementById('filter-hide-mature')?.addEventListener('change', (e) => {
        state.hide_mature = e.target.checked;
        state.page = 1;
        updateCatalogView();
    });
}

/**
 * Рендеринг интерфейса страниц (Пагинация)
 */
/**
 * Рендеринг интерфейса страниц (Пагинация)
 * @param {Object} pagination - Объект пагинации от бэкенда { total_items, current_page, limit, total_pages }
 */
function renderPaginationControls(pagination) {
    const container = document.getElementById('catalog-pagination');
    if (!container) return;

    // Если страница всего одна или данных нет — очищаем контейнер пагинации
    if (!pagination || pagination.total_pages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';

    // Генерируем кнопки страниц циклом на основе данных из PostgreSQL
    for (let i = 1; i <= pagination.total_pages; i++) {
        const btn = document.createElement('button');

        // Используем ваши стили .lang-btn для сохранения киберпанк дизайна кнопок
        btn.className = `lang-btn ${pagination.current_page === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.style.padding = '8px 14px';
        btn.style.cursor = 'pointer';

        // Вешаем реактивное событие переключения страницы
        btn.addEventListener('click', () => {
            state.page = i;
            updateCatalogView();

            // Скроллим вверх контентную зону SPA при переходе на новую страницу
            const appRoot = document.getElementById('app-root');
            if (appRoot) appRoot.scrollTop = 0;
        });

        container.appendChild(btn);
    }
}



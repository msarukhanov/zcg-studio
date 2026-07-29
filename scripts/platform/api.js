// scripts/api.js

// Базовый URL для всех запросов к API платформы
const baseUrl = (location.hostname === 'localhost') ? 'http://localhost:3000' : 'https://zcg-studio.onrender.com';

const BASE_URL = baseUrl + '/api/platform';

/**
 * Универсальная обёртка над fetch для выполнения HTTP-запросов
 * @param {string} endpoint - Путь (например, '/catalog' или '/game/game_combat_stars')
 * @param {string} method - Метод запроса ('GET', 'POST', и т.д.)
 * @param {Object|null} body - Данные для отправки в формате JSON
 */
async function makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${BASE_URL}${endpoint}`;

    // Формируем базовые заголовки
    const headers = {
        'Content-Type': 'application/json'
    };

    // Автоматически вытаскиваем токен из хранилища платформы
    const token = localStorage.getItem('zcg_jwt');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };

    if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        // Если бэкенд сообщил, что токен невалиден или сессия истекла
        if (response.status === 401) {
            console.warn("[API] Сессия недействительна. Принудительный выход.");
            if (window.App && typeof window.App.logout === 'function') {
                window.App.logout();
            }
            throw new Error(data.error || 'Unauthorized');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Server Error');
        }

        return data;
    } catch (error) {
        console.error(`[API Error] На эндпоинте ${endpoint}:`, error.message);
        return { err: true, message: error.message };
    }
}

// Экспортируемые методы API платформы, готовые к использованию на экранах
export const API = {
    // --- Авторизация ---
    login: (login, password) =>
        makeRequest('/auth/login', 'POST', { login, password }),

    register: (email, password, displayName, isMature) =>
        makeRequest('/auth/register', 'POST', { email, password, display_name: displayName, is_mature: isMature }),

    // --- Каталог и страницы игр ---

    getCatalog: (filterObj = {}) => {
        // Превращаем объект фильтров в строку параметров типа ?search=combat&min_price=10
        const queryParams = new URLSearchParams();

        for (const [key, value] of Object.entries(filterObj)) {
            if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, value);
            }
        }

        return makeRequest(`/catalog?${queryParams.toString()}`, 'GET');
    },

    getGamePageData: (gameId) =>
        makeRequest(`/game/${gameId}`, 'GET'),

    postReview: (gameId, rating, comment) =>
        makeRequest('/game/review', 'POST', { gameId, rating, comment }),

    // Клик по кнопке "Играть" или "Купить" (для бесплатных и платных игр)
    actionPlayOrBuy: (gameId) =>
        makeRequest('/game/action', 'POST', { gameId }),

    // --- Маркетплейс ---
    getMarketItems: (type = '') =>
        makeRequest(type ? `/market?type=${type}` : '/market', 'GET'),

    buyAsset: (itemId) =>
        makeRequest('/market/buy', 'POST', { itemId }),

    // scripts/api.js -> Дописать внутрь объекта API

    // --- Социальная лента ---
    getFeed: (page = 1) =>
        makeRequest(`/feed?page=${page}`, 'GET'),

    postFeedComment: (postId, comment) =>
        makeRequest('/feed/comment', 'POST', { postId, comment }),

    // --- Управление командами и подписки ---
    getTeamProfile: (teamId) =>
        makeRequest(`/team/profile/${teamId}`, 'GET'),

    toggleTeamSubscribe: (teamId) =>
        makeRequest('/team/subscribe', 'POST', { teamId }),

    applyToTeam: (teamId) =>
        makeRequest('/team/apply', 'POST', { teamId }),

    createTeam: (name, descriptionLoc) =>
        makeRequest('/team/create', 'POST', { name, description_loc: descriptionLoc }),

    // --- Панель управления студией ---
    publishTeamPost: (textLoc, gameId = null) =>
        makeRequest('/team/post', 'POST', { text_loc: textLoc, gameId }),

    getIncomingApplications: () =>
        makeRequest('/team/applications', 'GET'),

    processApplication: (applicationId, action) =>
        makeRequest('/team/applications/process', 'POST', { applicationId, action }),

    getFeedComments: (postId) =>
        makeRequest(`/feed/comments/${postId}`, 'GET'),

    // scripts/api.js -> Внутрь объекта API:

    buySaaSPlan: (tierId) =>
        makeRequest('/services/buy', 'POST', { tierId })

};

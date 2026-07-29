// db/platformDB.js

const axios = require('axios');

// const isDemo = process.env.env === 'demo';
const isDemo = true;
const demoUrl = (isDemo ? 'https://mtw-gw.onrender.com' : 'http://localhost:3000') + '/api/auth';

const {gamesConfigDB} = require('./configDB');
const { redisClient } = require('../../redisClient');
const {getCurrentIdleRate} = require('./_shared');

const Cache = require('./cacheManager');


// Дописать в db/platformDB.js

// Поиск пользователя по email (для авторизации)
async function findUserByIdentifier(identifier) {
    // 🔥 ДОБАВИЛИ team_id И team_rank В ВЫБОРКУ SELECT
    const query = `
        SELECT id, username, email, password_hash, display_name, is_mature, team_id, team_rank 
        FROM zcg_users 
        WHERE email = $1 OR username = $1;
    `;
    try {
        const { rows } = await global.pool.query(query, [identifier]);
        return rows.length > 0 ? rows[0] : null; // Возвращаем чистый объект строки, а не массив
    } catch (e) {
        console.error("[DB:findUserByIdentifier] error:", e);
        return null;
    }
}

// Регистрация нового пользователя
async function createUser({ email, passwordHash, displayName, isMature }) {
    const query = `
        INSERT INTO zcg_users (email, password_hash, display_name, is_mature)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, display_name, is_mature;
    `;
    try {
        const { rows } = await global.pool.query(query, [email, passwordHash, displayName, isMature]);
        return rows[0];
    } catch (e) {
        console.error("[DB:createUser] error:", e);
        if (e.code === '23505') { // Код ошибки уникальности в PostgreSQL (Unique Violation)
            return { err: true, message: 'Email already exists' };
        }
        return { err: true, message: e.message };
    }
}

// Обновление сессии и времени входа при успешном логине
async function updateUserSession(userId, sessionId) {
    const query = `
        UPDATE zcg_users 
        SET current_session_id = $1, last_login_at = CURRENT_TIMESTAMP 
        WHERE id = $2;
    `;
    try {
        await global.pool.query(query, [sessionId, userId]);
        return true;
    } catch (e) {
        console.error("[DB:updateUserSession] error:", e);
        return false;
    }
}

// Не забудьте добавить в module.exports:



// 1. Получение списка игр с фильтрацией по публикации, возрасту и стране
async function getCatalogGames(isMatureUser, countryCode = 'ALL') {
    // Если юзер несовершеннолетний, строго скрываем is_mature = true
    const ageFilter = isMatureUser ? '' : 'AND is_mature = false';

    // Проверяем регион: либо пустой массив (везде), либо код страны есть в массиве
    const query = `
        SELECT id, developer_id, team_id, title_loc, description_loc, 
               cover_image, rating, tags, is_mature, price
        FROM zcg_games
        WHERE is_published = true ${ageFilter}
          AND (cardinality(allowed_countries) = 0 OR $1 = ANY(allowed_countries))
        ORDER BY rating DESC;
    `;
    try {
        const { rows } = await global.pool.query(query, [countryCode]);
        return rows;
    } catch (e) {
        console.error("[DB:getCatalogGames] error:", e);
        return [];
    }
}

// db/platformDB.js

/**
 * Продвинутый поиск и фильтрация каталога игр
 * @param {Object} filters - Объект со всеми параметрами фильтрации
 */
async function getCatalogGamesAdvanced(filters) {
    const {
        country = 'ALL',
        isMatureUser = false,    // Флаг из JWT (есть ли 18 в принципе)
        hideMatureManual = false, // Личный флажок юзера "Не показывать 18+"
        searchQuery = '',        // Поиск по названию
        sortField = 'rating',    // Поле сортировки: 'rating', 'price', 'created_at'
        sortOrder = 'DESC',      // Направление: 'ASC' или 'DESC'
        limit = 12,
        offset = 0,
        tags = [],               // Массив тегов для фильтрации
        minPrice = null,
        maxPrice = null
    } = filters;

    const whereClauses = ['is_published = true'];
    const params = [];
    let paramIndex = 1;

    // 1. Фильтрация по региону / стране
    if (country !== 'ALL') {
        whereClauses.push(`($${paramIndex} = ANY(allowed_countries) OR cardinality(allowed_countries) = 0)`);
        params.push(country);
        paramIndex++;
    }

    // 2. Жесткая + Мягкая проверка на 18+ (is_mature)
    // Если юзер несовершеннолетний ИЛИ сам нажал галочку "Скрыть 18+" -> полностью отсекаем контент
    if (!isMatureUser || hideMatureManual) {
        whereClauses.push(`is_mature = false`);
    }

    // 3. Поиск по локализованному имени (независимо от регистра через ILIKE)
    if (searchQuery) {
        // Ищем совпадения внутри JSONB структуры title_loc по всем языкам
        whereClauses.push(`(title_loc->>'en' ILIKE $${paramIndex} OR title_loc->>'ru' ILIKE $${paramIndex})`);
        params.push(`%${searchQuery}%`);
        paramIndex++;
    }

    // 4. Поиск по массиву тегов (Используем оператор Postgres @> — содержит все указанные теги)
    if (tags && tags.length > 0) {
        whereClauses.push(`tags @> $${paramIndex}`);
        params.push(tags); // Передаем как массив ['gacha', 'jrpg']
        paramIndex++;
    }

    // 5. Диапазон цен
    if (minPrice !== null) {
        whereClauses.push(`price >= $${paramIndex}`);
        params.push(minPrice);
        paramIndex++;
    }
    if (maxPrice !== null) {
        whereClauses.push(`price <= $${paramIndex}`);
        params.push(maxPrice);
        paramIndex++;
    }

    // Безопасная валидация полей сортировки для защиты от SQL-инъекций
    const allowedSortFields = ['rating', 'price', 'created_at'];
    const finalSortField = allowedSortFields.includes(sortField) ? sortField : 'rating';
    const finalSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Формируем финальный лимит и смещение
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(limit, offset);

    // Собираем тело запроса
    const query = `
        SELECT id, developer_id, team_id, title_loc, description_loc, 
               cover_image, rating, tags, is_mature, price, created_at,
               COUNT(*) OVER() as total_count -- Позволяет узнать общее число записей для пагинации
        FROM zcg_games
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY ${finalSortField} ${finalSortOrder}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
    `;

    try {
        const { rows } = await global.pool.query(query, params);
        return rows;
    } catch (e) {
        console.error("[DB:getCatalogGamesAdvanced] error:", e);
        return [];
    }
}

// Добавьте в module.exports: getCatalogGamesAdvanced


// 2. Получение детальной информации об игре
async function getGameDetails(gameId) {
    const query = `
        SELECT id, developer_id, team_id, title_loc, description_loc, 
               cover_image, screenshots, rating, tags, is_mature, price, social_links
        FROM zcg_games
        WHERE id = $1;
    `;
    try {
        const { rows } = await global.pool.query(query, [gameId]);
        return rows[0] || null;
    } catch (e) {
        console.error("[DB:getGameDetails] error:", e);
        return null;
    }
}

// 3. Получение списка серверов/персонажей игрока для конкретной игры
async function getPlayerProfilesForGame(userId, gameId) {
    const query = `
        SELECT server_id, nickname, level, combat_power, updated_at
        FROM zcg_player_server_profiles
        WHERE user_id = $1 AND game_id = $2
        ORDER BY updated_at DESC;
    `;
    try {
        const { rows } = await global.pool.query(query, [userId, gameId]);
        return rows;
    } catch (e) {
        console.error("[DB:getPlayerProfilesForGame] error:", e);
        return [];
    }
}

// 4. Получение комментариев к игре с расчетом флага "is_developer"
async function getGameReviews(gameId) {
    const query = `
        SELECT 
            r.id, r.comment, r.rating, r.created_at,
            u.display_name, u.avatar_url,
            CASE 
                WHEN r.user_id = g.developer_id OR (u.team_id IS NOT NULL AND u.team_id = g.team_id) THEN true
                ELSE false
            END as is_developer
        FROM zcg_game_reviews r
        JOIN zcg_users u ON r.user_id = u.id
        JOIN zcg_games g ON r.game_id = g.id
        WHERE r.game_id = $1
        ORDER BY r.created_at DESC;
    `;
    try {
        const { rows } = await global.pool.query(query, [gameId]);
        return rows;
    } catch (e) {
        console.error("[DB:getGameReviews] error:", e);
        return [];
    }
}

// 5. Проверка, куплена ли игра (есть ли в библиотеке)
async function checkUserLibrary(userId, gameId) {
    const query = `SELECT id FROM zcg_user_library WHERE user_id = $1 AND game_id = $2;`;
    try {
        const { rows } = await global.pool.query(query, [userId, gameId]);
        return rows.length > 0;
    } catch (e) {
        return false;
    }
}

// 6. Процесс покупки игры (Транзакция внутри БД)
async function purchaseGameTransaction(userId, gameId, price, developerId) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Проверяем баланс пользователя
        const userRes = await client.query('SELECT balance FROM zcg_users WHERE id = $1 FOR UPDATE;', [userId]);
        const userBalance = parseFloat(userRes.rows[0].balance);
        if (userBalance < price) {
            throw new Error('Insufficient funds');
        }

        // 2. Списываем деньги у покупателя (DEBIT)
        await client.query('UPDATE zcg_users SET balance = balance - $1 WHERE id = $2;', [price, userId]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'DEBIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [userId, price, `Purchase game ID: ${gameId}`]);

        // 3. Начисляем деньги разработчику (CREDIT) минус условная комиссия платформы 5%
        const platformCommission = 0.05;
        const developerPayout = price * (1 - platformCommission);

        await client.query('UPDATE zcg_users SET balance = balance + $1 WHERE id = $2;', [developerPayout, developerId]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'CREDIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [developerId, developerPayout, `Payout for game sale ID: ${gameId}`]);

        // 4. Добавляем игру в библиотеку пользователя
        await client.query(`
            INSERT INTO zcg_user_library (user_id, game_id, purchase_price)
            VALUES ($1, $2, $3);
        `, [userId, gameId, price]);

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:purchaseGameTransaction] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}

// 7. Добавление бесплатной игры в библиотеку
async function addFreeGameToLibrary(userId, gameId) {
    const query = `
        INSERT INTO zcg_user_library (user_id, game_id, purchase_price)
        VALUES ($1, $2, 0.00)
        ON CONFLICT DO NOTHING;
    `;
    try {
        await global.pool.query(query, [userId, gameId]);
        return true;
    } catch (e) {
        console.error("[DB:addFreeGameToLibrary] error:", e);
        return false;
    }
}

// Дописать в db/platformDB.js

// 8. Получение списка товаров на маркетплейсе (с фильтрацией по типу ассета)
async function getMarketplaceItems(assetType = null) {
    let query = `
        SELECT id, creator_id, title_loc, description_loc, asset_type, preview_url, price 
        FROM zcg_marketplace_items 
        WHERE is_active = true AND is_verified = true
    `;
    const params = [];

    if (assetType) {
        query += ` AND asset_type = $1`;
        params.push(assetType);
    }

    query += ` ORDER BY created_at DESC;`;

    try {
        const { rows } = await global.pool.query(query, params);
        return rows;
    } catch (e) {
        console.error("[DB:getMarketplaceItems] error:", e);
        return [];
    }
}

// 9. Транзакционная покупка ассета (Списание -> Начисление создателю -> Добавление прав)
async function purchaseAssetTransaction(userId, itemId) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Получаем инфо о товаре
        const itemRes = await client.query('SELECT creator_id, price, title_loc FROM zcg_marketplace_items WHERE id = $1 AND is_active = true FOR SHARE;', [itemId]);
        if (itemRes.rows.length === 0) {
            throw new Error('Item not found or unavailable');
        }
        const item = itemRes.rows[0];
        const price = parseFloat(item.price);

        // 2. Проверяем баланс покупателя
        const userRes = await client.query('SELECT balance FROM zcg_users WHERE id = $1 FOR UPDATE;', [userId]);
        const userBalance = parseFloat(userRes.rows.balance);
        if (userBalance < price) {
            throw new Error('Insufficient funds');
        }

        // На платформе нельзя покупать собственный товар
        if (item.creator_id === userId) {
            throw new Error('Cannot buy your own asset');
        }

        // 3. Списываем деньги у покупателя (DEBIT)
        await client.query('UPDATE zcg_users SET balance = balance - $1 WHERE id = $2;', [price, userId]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'DEBIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [userId, price, `Purchase asset ID: ${itemId}`]);

        // 4. Начисляем деньги автору (CREDIT) минус условная комиссия платформы 10%
        const platformCommission = 0.10;
        const creatorPayout = price * (1 - platformCommission);

        await client.query('UPDATE zcg_users SET balance = balance + $1 WHERE id = $2;', [creatorPayout, item.creator_id]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'CREDIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [item.creator_id, creatorPayout, `Payout for asset sale ID: ${itemId}`]);

        // 5. Добавляем ассет в личную коллекцию покупателя (zcg_user_assets)
        await client.query(`
            INSERT INTO zcg_user_assets (user_id, item_id)
            VALUES ($1, $2);
        `, [userId, itemId]);

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:purchaseAssetTransaction] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}

// Не забудьте обновить module.exports в конце файла db/platformDB.js, добавив:
// getMarketplaceItems, purchaseAssetTransaction
// Дописать в db/platformDB.js

// 8. Получение списка товаров на маркетплейсе (с фильтрацией по типу ассета)
async function getMarketplaceItems(assetType = null) {
    let query = `
        SELECT id, creator_id, title_loc, description_loc, asset_type, preview_url, price 
        FROM zcg_marketplace_items 
        WHERE is_active = true AND is_verified = true
    `;
    const params = [];

    if (assetType) {
        query += ` AND asset_type = $1`;
        params.push(assetType);
    }

    query += ` ORDER BY created_at DESC;`;

    try {
        const { rows } = await global.pool.query(query, params);
        return rows;
    } catch (e) {
        console.error("[DB:getMarketplaceItems] error:", e);
        return [];
    }
}

// 9. Транзакционная покупка ассета (Списание -> Начисление создателю -> Добавление прав)
async function purchaseAssetTransaction(userId, itemId) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Получаем инфо о товаре
        const itemRes = await client.query('SELECT creator_id, price, title_loc FROM zcg_marketplace_items WHERE id = $1 AND is_active = true FOR SHARE;', [itemId]);
        if (itemRes.rows.length === 0) {
            throw new Error('Item not found or unavailable');
        }
        const item = itemRes.rows[0];
        const price = parseFloat(item.price);

        // 2. Проверяем баланс покупателя
        const userRes = await client.query('SELECT balance FROM zcg_users WHERE id = $1 FOR UPDATE;', [userId]);
        const userBalance = parseFloat(userRes.rows.balance);
        if (userBalance < price) {
            throw new Error('Insufficient funds');
        }

        // На платформе нельзя покупать собственный товар
        if (item.creator_id === userId) {
            throw new Error('Cannot buy your own asset');
        }

        // 3. Списываем деньги у покупателя (DEBIT)
        await client.query('UPDATE zcg_users SET balance = balance - $1 WHERE id = $2;', [price, userId]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'DEBIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [userId, price, `Purchase asset ID: ${itemId}`]);

        // 4. Начисляем деньги автору (CREDIT) минус условная комиссия платформы 10%
        const platformCommission = 0.10;
        const creatorPayout = price * (1 - platformCommission);

        await client.query('UPDATE zcg_users SET balance = balance + $1 WHERE id = $2;', [creatorPayout, item.creator_id]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'CREDIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [item.creator_id, creatorPayout, `Payout for asset sale ID: ${itemId}`]);

        // 5. Добавляем ассет в личную коллекцию покупателя (zcg_user_assets)
        await client.query(`
            INSERT INTO zcg_user_assets (user_id, item_id)
            VALUES ($1, $2);
        `, [userId, itemId]);

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:purchaseAssetTransaction] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}

// db/platformDB.js

/**
 * Добавление или обновление отзыва пользователя к игре (UPSERT)
 * @param {string} gameId - ID игры
 * @param {number} userId - ID пользователя платформы
 * @param {number} rating - Оценка от 1 до 5
 * @param {string} comment - Текст комментария
 */
async function addOrUpdateGameReview(gameId, userId, rating, comment) {
    // Используем ON CONFLICT на основе нашего уникального индекса idx_zcg_one_review_per_user
    const query = `
        INSERT INTO zcg_game_reviews (game_id, user_id, rating, comment, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (game_id, user_id) 
        DO UPDATE SET 
            rating = EXCLUDED.rating,
            comment = EXCLUDED.comment,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, rating, comment;
    `;
    try {
        const { rows } = await global.pool.query(query, [gameId, userId, rating, comment]);
        return rows[0];
    } catch (e) {
        console.error("[DB:addOrUpdateGameReview] error:", e);
        return { err: true, message: e.message };
    }
}

// Не забудьте добавить в module.exports: addOrUpdateGameReview

// db/platformDB.js

/**
 * Получение персональной ленты новостей пользователя на основе его подписок
 * @param {number} userId - ID текущего пользователя
 * @param {number} limit - Сколько постов вернуть (дефолт 12)
 * @param {number} offset - Смещение для пагинации (страницы)
 */
// db/platformDB.js

/**
 * Получение персональной ленты новостей пользователя на основе его подписок (ИСПРАВЛЕНО)
 * @param {number} userId - ID текущего пользователя
 * @param {number} limit - Сколько постов вернуть (дефолт 12)
 * @param {number} offset - Смещение для пагинации (страницы)
 */
async function getSubscriptionFeed(userId, limit = 12, offset = 0) {
    const query = `
        SELECT 
            p.id, 
            p.team_id, 
            p.game_id, 
            p.text_loc, 
            p.created_at,
            t.name as team_name, 
            t.logo_url as team_logo,
            COUNT(c.id) as comments_count, -- Считаем число комментов к посту
            COUNT(*) OVER() as total_count  -- Общее число постов для пагинации на фронте
        FROM zcg_team_posts p
        JOIN zcg_team_subscribers s ON p.team_id = s.team_id
        JOIN zcg_teams t ON p.team_id = t.id
        LEFT JOIN zcg_team_post_comments c ON p.id = c.post_id
        WHERE s.user_id = $1
        -- 🔥 ИСПРАВЛЕНО: Перечисляем все выбираемые неагрегированные колонки для Postgres
        GROUP BY p.id, p.team_id, p.game_id, p.text_loc, p.created_at, t.name, t.logo_url
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    try {
        const { rows } = await global.pool.query(query, [userId, limit, offset]);
        return rows;
    } catch (e) {
        console.error("[DB:getSubscriptionFeed] Critical SQL Error:", e.message);
        return [];
    }
}

async function getSubscriptionFeed222(userId, limit = 12, offset = 0) {
    const query = `
        SELECT 
            p.id, 
            p.team_id, 
            p.game_id, 
            p.text_loc, 
            p.created_at,
            t.name as team_name, 
            t.logo_url as team_logo,
            COUNT(c.id) as comments_count, -- Считаем число комментов к посту
            COUNT(*) OVER() as total_count  -- Общее число постов для пагинации на фронте
        FROM zcg_team_posts p
        JOIN zcg_team_subscribers s ON p.team_id = s.team_id
        JOIN zcg_teams t ON p.team_id = t.id
        LEFT JOIN zcg_team_post_comments c ON p.id = c.post_id
        WHERE s.user_id = $1
        GROUP BY p.id, t.name, t.logo_url
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    try {
        const { rows } = await global.pool.query(query, [userId, limit, offset]);
        return rows;
    } catch (e) {
        console.error("[DB:getSubscriptionFeed] error:", e);
        return [];
    }
}
/**
 * Проверка наличия непрочитанных постов в подписках юзера
 * @param {number} userId - ID пользователя
 */
async function checkUnreadPosts(userId) {
    const query = `
        SELECT EXISTS (
            SELECT 1 
            FROM zcg_team_posts p
            JOIN zcg_team_subscribers s ON p.team_id = s.team_id
            WHERE s.user_id = $1 AND p.created_at > s.last_read_at
        ) as has_unread;
    `;
    try {
        const { rows } = await global.pool.query(query, [userId]);
        return rows[0]?.has_unread || false;
    } catch (e) {
        console.error("[DB:checkUnreadPosts] error:", e);
        return false;
    }
}
/**
 * Обновление времени прочтения ленты новостей (гасит красную точку)
 * @param {number} userId - ID пользователя
 */
async function markFeedAsRead(userId) {
    const query = `
        UPDATE zcg_team_subscribers 
        SET last_read_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1;
    `;
    try {
        await global.pool.query(query, [userId]);
        return { success: true };
    } catch (e) {
        console.error("[DB:markFeedAsRead] error:", e);
        return { err: true, message: e.message };
    }
}

// db/platformDB.js

/**
 * Получение детальной информации о команде, её участниках и играх
 * @param {number} teamId - ID команды
 */
async function getTeamProfileData(teamId) {
    try {
        // 1. Базовые данные команды и её средний рейтинг по играм
        const teamQuery = `
            SELECT t.id, t.name, t.logo_url, t.description_loc, t.social_links, t.is_recruitment_open, t.owner_id,
                   COALESCE(AVG(g.rating), 0.00) as team_rating
            FROM zcg_teams t
            LEFT JOIN zcg_games g ON g.team_id = t.id
            WHERE t.id = $1
            GROUP BY t.id;
        `;

        // 2. Список участников команды (только никнеймы и ранги по вашему условию)
        const membersQuery = `
            SELECT id, username, display_name, avatar_url, team_rank 
            FROM zcg_users 
            WHERE team_id = $1
            ORDER BY CASE team_rank 
                WHEN 'owner' THEN 1 
                WHEN 'admin' THEN 2 
                WHEN 'developer' THEN 3 
                ELSE 4 
            END;
        `;

        // 3. Список игр команды для портфолио
        const gamesQuery = `
            SELECT id, title_loc, description_loc, cover_image, rating, price, is_mature
            FROM zcg_games
            WHERE team_id = $1 AND is_published = true
            ORDER BY rating DESC;
        `;

        const [teamRes, membersRes, gamesRes] = await Promise.all([
            global.pool.query(teamQuery, [teamId]),
            global.pool.query(membersQuery, [teamId]),
            global.pool.query(gamesQuery, [teamId])
        ]);

        if (teamRes.rows.length === 0) return null;

        return {
            profile: teamRes.rows[0],
            members: membersRes.rows,
            games: gamesRes.rows
        };
    } catch (e) {
        console.error("[DB:getTeamProfileData] error:", e);
        return null;
    }
}

/**
 * Создание новой команды разработки
 * @param {number} userId - ID создателя
 * @param {string} name - Название команды
 * @param {Object} descriptionLoc - Локализованное описание {"ru": "...", "en": "..."}
 */
async function createTeamTransaction(userId, name, descriptionLoc) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // Проверяем, не состоит ли уже юзер в какой-то команде (условие: 1 юзер = 1 команда)
        const userCheck = await client.query('SELECT team_id FROM zcg_users WHERE id = $1;', [userId]);
        if (userCheck.rows[0].team_id !== null) {
            throw new Error('User already belongs to a team');
        }

        // 1. Создаем саму команду
        const teamRes = await client.query(`
            INSERT INTO zcg_teams (name, owner_id, description_loc)
            VALUES ($1, $2, $3)
            RETURNING id;
        `, [name, userId, descriptionLoc]);

        const newTeamId = teamRes.rows[0].id;

        // 2. Обновляем создателя: привязываем к команде и делаем владельцем
        await client.query(`
            UPDATE zcg_users 
            SET team_id = $1, team_rank = 'owner' 
            WHERE id = $2;
        `, [newTeamId, userId]);

        await client.query('COMMIT');
        return { success: true, teamId: newTeamId };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:createTeamTransaction] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}


/**
 * Изменение статуса набора в команду
 * @param {number} teamId - ID команды
 * @param {boolean} isOpen - Истинный статус открытости набора
 */
async function toggleRecruitment(teamId, isOpen) {
    const query = `UPDATE zcg_teams SET is_recruitment_open = $1 WHERE id = $2;`;
    try {
        await global.pool.query(query, [isOpen, teamId]);
        return { success: true };
    } catch (e) {
        console.error("[DB:toggleRecruitment] error:", e);
        return { err: true, message: e.message };
    }
}

/**
 * Добавление пользователя в команду (Принять заявку)
 * @param {number} userId - Кого принимаем
 * @param {number} teamId - В какую команду
 */
async function acceptUserToTeam(userId, teamId) {
    // Перед добавлением проверяем настройки команды (открыт ли набор)
    const teamCheck = await global.pool.query('SELECT is_recruitment_open FROM zcg_teams WHERE id = $1;', [teamId]);
    if (!teamCheck.rows[0]?.is_recruitment_open) {
        return { err: true, message: 'Recruitment is currently closed for this team' };
    }

    const query = `UPDATE zcg_users SET team_id = $1, team_rank = 'member' WHERE id = $2 AND team_id IS NULL;`;
    try {
        const res = await global.pool.query(query, [teamId, userId]);
        if (res.rowCount === 0) throw new Error('User already in a team or not found');
        return { success: true };
    } catch (e) {
        return { err: true, message: e.message };
    }
}

/**
 * Удаление пользователя из команды (Исключить или выйти самому)
 * @param {number} userId - ID пользователя
 */
async function removeUserFromTeam(userId) {
    // Владелец не может просто так выйти, он должен сначала передать владение или удалить команду
    const query = `
        UPDATE zcg_users 
        SET team_id = NULL, team_rank = 'member' 
        WHERE id = $1 AND team_rank != 'owner';
    `;
    try {
        const res = await global.pool.query(query, [userId]);
        if (res.rowCount === 0) return { err: true, message: 'Cannot remove team owner or user not found' };
        return { success: true };
    } catch (e) {
        return { err: true, message: e.message };
    }
}

/**
 * Переключение статуса подписки игрока на команду
 * @param {number} userId - ID игрока
 * @param {number} teamId - ID команды
 */
async function toggleTeamSubscription(userId, teamId) {
    const checkQuery = `SELECT 1 FROM zcg_team_subscribers WHERE user_id = $1 AND team_id = $2;`;
    try {
        const { rows } = await global.pool.query(checkQuery, [userId, teamId]);

        if (rows.length > 0) {
            // Если уже подписан — отписываем (удаляем строчку)
            await global.pool.query(`DELETE FROM zcg_team_subscribers WHERE user_id = $1 AND team_id = $2;`, [userId, teamId]);
            return { success: true, status: 'UNSUBSCRIBED' };
        } else {
            // Если не подписан — подписываем (вставляем строчку)
            await global.pool.query(`INSERT INTO zcg_team_subscribers (user_id, team_id) VALUES ($1, $2);`, [userId, teamId]);
            return { success: true, status: 'SUBSCRIBED' };
        }
    } catch (e) {
        console.error("[DB:toggleTeamSubscription] error:", e);
        return { err: true, message: e.message };
    }
}

// db/platformDB.js

/**
 * Игрок отправляет заявку на вступление в команду
 * @param {number} userId - ID игрока
 * @param {number} teamId - ID команды
 */
async function createJoinRequest(userId, teamId) {
    // 1. Проверяем, открыт ли набор в команду
    const teamCheck = await global.pool.query('SELECT is_recruitment_open FROM zcg_teams WHERE id = $1;', [teamId]);
    if (!teamCheck.rows[0]?.is_recruitment_open) {
        return { err: true, message: 'Recruitment is closed for this team' };
    }

    // 2. Проверяем, не состоит ли юзер уже в какой-то команде
    const userCheck = await global.pool.query('SELECT team_id FROM zcg_users WHERE id = $1;', [userId]);
    if (userCheck.rows[0]?.team_id !== null) {
        return { err: true, message: 'You are already a member of another team' };
    }

    const query = `
        INSERT INTO zcg_team_applications (team_id, user_id, type, status)
        VALUES ($1, $2, 'JOIN_REQUEST', 'PENDING')
        RETURNING id;
    `;
    try {
        const { rows } = await global.pool.query(query, [teamId, userId]);
        return { success: true, appId: rows[0].id };
    } catch (e) {
        if (e.code === '23505') return { err: true, message: 'You already have a pending application to this team' };
        return { err: true, message: e.message };
    }
}

/**
 * Получение списка активных заявок на вступление для менеджера команды
 * @param {number} teamId - ID команды
 */
async function getTeamIncomingApplications(teamId) {
    const query = `
        SELECT a.id as application_id, a.user_id, a.created_at,
               u.username, u.display_name, u.avatar_url
        FROM zcg_team_applications a
        JOIN zcg_users u ON a.user_id = u.id
        WHERE a.team_id = $1 AND a.type = 'JOIN_REQUEST' AND a.status = 'PENDING'
        ORDER BY a.created_at ASC;
    `;
    try {
        const { rows } = await global.pool.query(query, [teamId]);
        return rows;
    } catch (e) {
        console.error("[DB:getTeamIncomingApplications] error:", e);
        return [];
    }
}

/**
 * Рассмотрение заявки владельцем команды (Принять или Отклонить)
 * @param {number} appId - ID заявки из zcg_team_applications
 * @param {string} action - Действие: 'ACCEPT' или 'REJECT'
 * @param {number} teamId - ID команды (для проверки безопасности)
 */
async function handleApplicationTransaction(appId, action, teamId) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // Вытаскиваем данные заявки и блокируем строку для апдейта
        const appRes = await client.query(
            'SELECT user_id, status FROM zcg_team_applications WHERE id = $1 AND team_id = $2 FOR UPDATE;',
            [appId, teamId]
        );

        if (appRes.rows.length === 0 || appRes.rows[0].status !== 'PENDING') {
            throw new Error('Application not found or already processed');
        }

        const targetUserId = appRes.rows[0].user_id;

        if (action === 'REJECT') {
            // Если отклонили — просто меняем статус записи
            await client.query('UPDATE zcg_team_applications SET status = \'REJECT\', updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [appId]);
        } else if (action === 'ACCEPT') {
            // Если приняли — меняем статус заявки
            await client.query('UPDATE zcg_team_applications SET status = \'ACCEPTED\', updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [appId]);

            // И привязываем юзера к команде
            const userUpdate = await client.query(
                'UPDATE zcg_users SET team_id = $1, team_rank = \'member\' WHERE id = $2 AND team_id IS NULL;',
                [teamId, targetUserId]
            );

            if (userUpdate.rowCount === 0) {
                throw new Error('User is already in another team');
            }

            // Автоматически отклоняем все остальные ПАРАЛЛЕЛЬНЫЕ заявки этого юзера в другие команды, так как он уже у нас
            await client.query('UPDATE zcg_team_applications SET status = \'REJECT\' WHERE user_id = $1 AND status = \'PENDING\';', [targetUserId]);
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:handleApplicationTransaction] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}


/**
 * Публикация нового поста от лица команды
 * @param {number} teamId - ID команды
 * @param {number} authorId - Кто пишет (Юзер)
 * @param {string|null} gameId - Опциональный ID игры на будущее
 * @param {Object} textLoc - Локализованный текст поста {"ru": "...", "en": "..."}
 */
async function createTeamPost(teamId, authorId, gameId, textLoc) {
    const query = `
        INSERT INTO zcg_team_posts (team_id, author_id, game_id, text_loc)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at;
    `;
    try {
        const { rows } = await global.pool.query(query, [teamId, authorId, gameId, textLoc]);
        return { success: true, post: rows[0] };
    } catch (e) {
        console.error("[DB:createTeamPost] error:", e);
        return { err: true, message: e.message };
    }
}


/**
 * Добавление комментария к посту команды
 * @param {number} postId - ID поста
 * @param {number} userId - ID автора комментария
 * @param {string} comment - Текст
 */
async function addCommentToPost(postId, userId, comment) {
    const query = `
        INSERT INTO zcg_team_post_comments (post_id, user_id, comment)
        VALUES ($1, $2, $3)
        RETURNING id, created_at;
    `;
    try {
        const { rows } = await global.pool.query(query, [postId, userId, comment]);
        return { success: true, commentId: rows[0].id };
    } catch (e) {
        console.error("[DB:addCommentToPost] error:", e);
        return { err: true, message: e.message };
    }
}

/**
 * Получение списка комментариев к конкретному посту
 * @param {bigint} postId - ID поста
 */
async function getPostComments(postId) {
    const query = `
        SELECT c.id, c.comment, c.created_at, u.display_name, u.avatar_url
        FROM zcg_team_post_comments c
        JOIN zcg_users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC;
    `;
    try {
        const { rows } = await global.pool.query(query, [postId]);
        return rows;
    } catch (e) {
        console.error("[DB:getPostComments] error:", e);
        return [];
    }
}



// db/platformDB.js

/**
 * Получение объединенных максимальных лимитов для пользователя или его команды
 * @param {number} userId - ID пользователя
 * @param {number|null} teamId - ID команды пользователя (если есть)
 */
// db/platformDB.js

/**
 * Получение объединенных максимальных лимитов для пользователя или его команды (ИСПРАВЛЕНО)
 * @param {number} userId - ID пользователя
 * @param {number|null} teamId - ID команды пользователя (если есть)
 */
// db/platformDB.js

/**
 * Получение объединенных максимальных лимитов для пользователя или его команды (ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ)
 * @param {number} userId - ID пользователя
 * @param {number|null} teamId - ID команды пользователя (если есть)
 */
async function getHighestServiceLimits(userId, teamId) {
    let query = '';
    const params = [];

    if (teamId) {
        // 🔥 САМЫЙ НАДЕЖНЫЙ ВАРИАНТ: Находим максимальный tier_id для каждого сервиса по всей команде
        query = `
            SELECT 
                st.service_name,
                MAX(st.id) as highest_tier_id,
                (SELECT limits FROM zcg_service_tiers WHERE id = MAX(st.id)) as combined_limits
            FROM zcg_user_subscriptions us
            JOIN zcg_service_tiers st ON us.tier_id = st.id
            JOIN zcg_users u ON us.user_id = u.id
            WHERE u.team_id = $1 
              AND us.is_active = true 
              AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
            GROUP BY st.service_name;
        `;
        params.push(teamId);
    }
    else {
        query = `
            SELECT st.service_name, st.id as highest_tier_id, st.limits as combined_limits
            FROM zcg_user_subscriptions us
            JOIN zcg_service_tiers st ON us.tier_id = st.id
            WHERE us.user_id = $1 
              AND us.is_active = true 
              AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP);
        `;
        params.push(userId);
    }

    try {
        const { rows } = await global.pool.query(query, params);

        const servicePayload = {
            gamer_service: { tier_id: 1, limits: {"can_play": true, "has_battlepass": false} },
            maker_service: { tier_id: 3, limits: {"max_games": 3} },
            asset_animator_service: { tier_id: 5, limits: {"max_characters": 10} }
        };

        rows.forEach(row => {
            if (servicePayload[row.service_name]) {
                servicePayload[row.service_name] = {
                    tier_id: parseInt(row.highest_tier_id),
                    limits: typeof row.combined_limits === 'string' ? JSON.parse(row.combined_limits) : row.combined_limits
                };
            }
        });

        return servicePayload;
    } catch (e) {
        console.error("[DB:getHighestServiceLimits] Error:", e.message);
        return {
            gamer_service: { tier_id: 1, limits: {"can_play": true, "has_battlepass": false} },
            maker_service: { tier_id: 3, limits: {"max_games": 3} },
            asset_animator_service: { tier_id: 5, limits: {"max_characters": 10} }
        };
    }
}


/**
 * Покупка или продление подписки на SaaS-сервис
 * @param {number} userId - Кто покупает
 * @param {number} tierId - Какой тир покупает
 */
async function purchaseServiceSubscription(userId, tierId) {
    const client = await global.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Получаем инфо о тарифе
        const tierRes = await client.query('SELECT service_name, price, duration_days FROM zcg_service_tiers WHERE id = $1;', [tierId]);
        if (tierRes.rows.length === 0) throw new Error('Subscription tier not found');
        const tier = tierRes.rows[0];

        // 2. Проверяем баланс Марка/юзера
        const userRes = await client.query('SELECT balance FROM zcg_users WHERE id = $1 FOR UPDATE;', [userId]);
        const userBalance = parseFloat(userRes.rows[0].balance);
        const price = parseFloat(tier.price);

        if (userBalance < price) throw new Error('Insufficient funds');

        // 3. Списываем деньги за SaaS-лицензию (DEBIT уходит полностью платформе)
        await client.query('UPDATE zcg_users SET balance = balance - $1 WHERE id = $2;', [price, userId]);
        await client.query(`
            INSERT INTO zcg_transactions (user_id, tx_type, amount, method, status, description)
            VALUES ($1, 'DEBIT', $2, 'internal_market', 'COMPLETED', $3);
        `, [userId, price, `Purchase SaaS License: ${tier.service_name} (${tierId})`]);

        // 4. Гасим старую активную подписку на ЭТОТ ЖЕ сервис, если она была
        await client.query(`
            UPDATE zcg_user_subscriptions us
            SET is_active = false
            FROM zcg_service_tiers st
            WHERE us.tier_id = st.id AND us.user_id = $1 AND st.service_name = $2 AND us.is_active = true;
        `, [userId, tier.service_name]);

        // 5. Записываем новую активную подписку
        const expiresAt = tier.duration_days ? `CURRENT_TIMESTAMP + INTERVAL '${tier.duration_days} days'` : 'NULL';
        await client.query(`
            INSERT INTO zcg_user_subscriptions (user_id, tier_id, expires_at, is_active)
            VALUES ($1, $2, ${expiresAt}, true);
        `);

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[DB:purchaseServiceSubscription] error:", e.message);
        return { err: true, message: e.message };
    } finally {
        client.release();
    }
}






// db/platformDB.js

/**
 * 1. Фиксация начала игровой сессии (Игрок нажал "Играть")
 * @param {number} userId - ID игрока
 * @param {string} gameId - ID запускаемой игры
 * @param {number} serverId - ID выбранного игрового сервера
 * @returns {Object} - ID созданной сессии
 */
async function startPlayerSession(userId, gameId, serverId) {
    const query = `
        INSERT INTO zcg_player_sessions (user_id, game_id, server_id, login_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id;
    `;
    try {
        const { rows } = await global.pool.query(query, [userId, gameId, serverId]);
        return { success: true, sessionId: rows[0].id };
    } catch (e) {
        console.error("[DB:startPlayerSession] error:", e.message);
        return { err: true, message: e.message };
    }
}

/**
 * 2. Фиксация закрытия игры (Игрок вышел, высчитываем хронометраж в минутах)
 * @param {bigint} sessionId - ID закрываемой сессии
 */
async function endPlayerSession(sessionId) {
    const query = `
        UPDATE zcg_player_sessions
        SET 
            logout_at = CURRENT_TIMESTAMP,
            -- Вычисляем разницу между входом и выходом в минутах
            duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_at)) / 60
        WHERE id = $1 AND logout_at IS NULL
        RETURNING duration_minutes;
    `;
    try {
        const { rows } = await global.pool.query(query, [sessionId]);
        if (rows.length === 0) return { err: true, message: 'Active session not found or already closed' };
        return { success: true, duration: Math.round(rows[0].duration_minutes) };
    } catch (e) {
        console.error("[DB:endPlayerSession] error:", e.message);
        return { err: true, message: e.message };
    }
}

/**
 * 3. Получение живого онлайна (CCU) для конкретной игры по её серверам
 * @param {string} gameId - ID игры
 * @returns {Array} - Массив с онлайном, сгруппированный по серверам
 */
async function getGameLiveCCU(gameId) {
    const query = `
        SELECT 
            server_id,
            COUNT(DISTINCT user_id) as live_players -- Считаем только уникальных игроков в онлайне
        FROM zcg_player_sessions
        WHERE game_id = $1 AND logout_at IS NULL
        GROUP BY server_id
        ORDER BY server_id ASC;
    `;
    try {
        const { rows } = await global.pool.query(query, [gameId]);
        return rows;
    } catch (e) {
        console.error("[DB:getGameLiveCCU] error:", e.message);
        return [];
    }
}

/**
 * 4. Сбор истории суммарного времени игры по дням (Для графиков Time Spent)
 * @param {string} gameId - ID игры
 * @param {number} daysLimit - За сколько дней собрать историю (например, 7 или 30)
 */
async function getGameTimeSpentTrend(gameId, daysLimit = 7) {
    const query = `
        SELECT 
            DATE(login_at) as play_date,
            SUM(duration_minutes) as total_minutes,
            COUNT(DISTINCT user_id) as unique_players_per_day -- DAU (Daily Active Users)
        FROM zcg_player_sessions
        WHERE game_id = $1 AND logout_at IS NOT NULL 
          AND login_at >= CURRENT_TIMESTAMP - $2 * INTERVAL '1 day'
        GROUP BY DATE(login_at)
        ORDER BY play_date ASC;
    `;
    try {
        const { rows } = await global.pool.query(query, [gameId, daysLimit]);
        return rows;
    } catch (e) {
        console.error("[DB:getGameTimeSpentTrend] error:", e.message);
        return [];
    }
}














module.exports = {

    findUserByIdentifier,
    createUser,
    updateUserSession,

    getCatalogGames,
    getCatalogGamesAdvanced,
    getGameDetails,
    getPlayerProfilesForGame,

    getGameReviews,
    addOrUpdateGameReview,

    checkUserLibrary,
    purchaseGameTransaction,
    addFreeGameToLibrary,

    getMarketplaceItems,
    purchaseAssetTransaction,


    getSubscriptionFeed,
    checkUnreadPosts,
    markFeedAsRead,

    getTeamProfileData,
    createTeamTransaction,
    toggleRecruitment,
    createJoinRequest,
    getTeamIncomingApplications,
    handleApplicationTransaction,
    acceptUserToTeam,
    removeUserFromTeam,



    toggleTeamSubscription,
    createTeamPost,
    addCommentToPost,
    getPostComments,



    getHighestServiceLimits, purchaseServiceSubscription,




    startPlayerSession,
    endPlayerSession,
    getGameLiveCCU,
    getGameTimeSpentTrend

};

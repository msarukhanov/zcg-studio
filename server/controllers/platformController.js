// controllers/platformAuthController.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const platformDB = require('../db/platformDB');

// // Пример логики внутри будущего метода создания игры:
// const maxGamesAllowed = req.platformUser.services.maker_service.limits.max_games; // Вернет 10, так как у YoungGamer куплен премиум!
//
// // Считаем сколько игр РЕАЛЬНО создано командой в базе
// const currentGamesCount = await platformDB.getTeamGamesCount(req.platformUser.teamId);
//
// if (currentGamesCount >= maxGamesAllowed) {
//     return res.status(403).json({ error: "Лимит создания игр для вашей команды исчерпан! Продлите тариф Maker Service." });
// }

// РЕГИСТРАЦИЯ
exports.register = async function (req, res) {
    try {
        const { email, password, display_name, is_mature } = req.body;

        if (!email || !password || !display_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // В реальном проекте здесь будет: const passwordHash = await bcrypt.hash(password, 10);
        // Для тестов пока делаем простую симуляцию строки хэша
        const passwordHash = `hash_${password}`;

        const newUser = await platformDB.createUser({
            email,
            passwordHash,
            displayName: display_name,
            isMature: !!is_mature // Принудительно приводим к Boolean (наша галочка 18+)
        });

        if (newUser.err) {
            return res.status(400).json({ error: newUser.message });
        }

        return res.status(201).json({
            status: 'REGISTRATION_SUCCESS',
            user: { id: newUser.id, email: newUser.email, display_name: newUser.display_name }
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Auth:Register] error' });
    }
};

// controllers/platformAuthController.js -> Обновленный метод login

exports.login = async function (req, res) {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login credentials and password are required' });
        }

        const user = await platformDB.findUserByIdentifier(login);
        if (!user) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        const isPasswordValid = user.password_hash === `hash_${password}` ||
            user.password_hash.startsWith('$2b$10$') ||
            user.password_hash.includes('fake_hash');

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        const sessionId = crypto.randomUUID();
        await platformDB.updateUserSession(user.id, sessionId);

        // 🔥 КРИТИЧЕСКИЙ ШАГ: Сразу вычисляем SaaS-лимиты юзера/команды при логине
        const highestLimits = await platformDB.getHighestServiceLimits(user.id, user.team_id);

        const tokenPayload = {
            id: user.id,
            displayName: user.display_name,
            isMature: user.is_mature,
            teamId: user.team_id,
            teamRank: user.team_rank,
            sessionId: sessionId,
            // 🔥 Зашиваем лимиты в токен, чтобы фронтенд мог читать их из payload
            services: highestLimits
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'zcg_secret_key_2026',
            { expiresIn: '24h' }
        );

        return res.json({
            status: 'LOGIN_SUCCESS',
            token: token,
            user: {
                id: user.id,
                display_name: user.display_name,
                is_mature: user.is_mature,
                team_id: user.team_id,
                team_rank: user.team_rank,
                // 🔥 Отдаем в чистом виде для мгновенной реактивности интерфейса ЛК
                services: highestLimits
            }
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Auth:Login Advanced] error' });
    }
};


// ЛОГИН
// exports.login = async function (req, res) {
//     try {
//         // Изменяем email на универсальный login (может быть и username, и почтой)
//         const { login, password } = req.body;
//
//         if (!login || !password) {
//             return res.status(400).json({ error: 'Login credentials and password are required' });
//         }
//
//         // Ищем в базе по обоим параметрам сразу
//         const user = await platformDB.findUserByIdentifier(login);
//         if (!user) {
//             return res.status(401).json({ error: 'Invalid login or password' });
//         }
//
//         // Проверка пароля. В продакшене будет:
//         // const isPasswordValid = await bcrypt.compare(password, user.password_hash);
//
//         // Для тестов проверяем совпадение с нашей тестовой строкой или фейк-хэшем
//         const isPasswordValid = user.password_hash === `hash_${password}` ||
//             user.password_hash.startsWith('$2b$10$') ||
//             user.password_hash.includes('fake_hash');
//
//         if (!isPasswordValid) {
//             return res.status(401).json({ error: 'Invalid login or password' });
//         }
//
//         const sessionId = crypto.randomUUID();
//         await platformDB.updateUserSession(user.id, sessionId);
//
//         const tokenPayload = {
//             id: user.id,
//             displayName: user.display_name,
//             isMature: user.is_mature,
//             teamId: user.team_id,     // 🔥 Теперь здесь будет реальный ID команды из базы
//             teamRank: user.team_rank, // 🔥 Теперь здесь будет строка 'owner'
//             sessionId: sessionId
//         };
//
//         const token = jwt.sign(
//             tokenPayload,
//             process.env.JWT_SECRET || 'zcg_secret_key_2026',
//             { expiresIn: '24h' }
//         );
//
//         return res.json({
//             status: 'LOGIN_SUCCESS',
//             token: token,
//             user: {
//                 id: user.id,
//                 display_name: user.display_name,
//                 is_mature: user.is_mature
//             }
//         });
//
//     } catch (e) {
//         console.error(e);
//         return res.status(500).json({ error: e.message, msg: '[Auth:Login] error' });
//     }
// };


// Получение полного каталога игр для главного экрана SPA
// controllers/platformController.js

exports.getCatalog = async function (req, res) {
    try {
        // Считываем данные пользователя, если он авторизован (из вашего мидлвейра)
        const isMatureUser = req.platformUser ? req.platformUser.isMature : false;

        // Парсим Query-параметры из запроса фронтенда
        const {
            country = 'ALL',
            hide_mature = 'false',
            search = '',
            sort_by = 'rating',
            order = 'DESC',
            limit = '12',
            page = '1',
            tags = '',
            min_price,
            max_price
        } = req.query;

        // Вычисляем offset на основе текущей страницы
        const parsedLimit = parseInt(limit) || 12;
        const parsedPage = parseInt(page) || 1;
        const parsedOffset = (parsedPage - 1) * parsedLimit;

        // Преобразуем строку тегов "gacha,jrpg" в массив
        const parsedTags = tags ? tags.split(',') : [];

        // Собираем чистый объект фильтров
        const filterPack = {
            country,
            isMatureUser,
            hideMatureManual: hide_mature === 'true',
            searchQuery: search.trim(),
            sortField: sort_by,
            sortOrder: order,
            limit: parsedLimit,
            offset: parsedOffset,
            tags: parsedTags,
            minPrice: min_price ? parseFloat(min_price) : null,
            maxPrice: max_price ? parseFloat(max_price) : null
        };

        const games = await platformDB.getCatalogGamesAdvanced(filterPack);

        // Вытаскиваем общее количество записей из первой строки (если она есть)
        const totalCount = games.length > 0 ? parseInt(games[0].total_count) : 0;

        return res.json({
            games,
            pagination: {
                total_items: totalCount,
                current_page: parsedPage,
                limit: parsedLimit,
                total_pages: Math.ceil(totalCount / parsedLimit)
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetCatalogAdvanced] error' });
    }
};


// Метод Promise.all собирает полный пакет данных для экрана деталей игры (Детали + Отзывы + Серверы игрока)
exports.getGamePageData = async function (req, res) {
    try {
        const { gameId } = req.params;
        const userId = req.platformUser ? req.platformUser.id : null; // null если гость

        // Запускаем параллельные запросы к БД
        const [gameDetails, reviews, playerProfiles, isPurchased] = await Promise.all([
            platformDB.getGameDetails(gameId),
            platformDB.getGameReviews(gameId),
            userId ? platformDB.getPlayerProfilesForGame(userId, gameId) : Promise.resolve([]),
            userId ? platformDB.checkUserLibrary(userId, gameId) : Promise.resolve(false)
        ]);

        if (!gameDetails) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Возвращаем упакованный пакет для фронтенд-сокета или fetch
        return res.json({
            game: gameDetails,
            reviews: reviews,
            player_profiles: playerProfiles,
            is_purchased: isPurchased
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetGamePageData] error' });
    }
};

// Обработка кнопки "Купить" или первого запуска бесплатной игры
exports.actionPlayOrBuy = async function (req, res) {
    try {
        if (!req.platformUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id: userId } = req.platformUser;
        const { gameId } = req.body;

        const game = await platformDB.getGameDetails(gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const isPurchased = await platformDB.checkUserLibrary(userId, gameId);
        if (isPurchased) {
            return res.json({ status: 'READY_TO_PLAY', msg: 'Already in library' });
        }

        // Если игра платная
        if (parseFloat(game.price) > 0) {
            const result = await platformDB.purchaseGameTransaction(userId, gameId, parseFloat(game.price), game.developer_id);
            if (result.err) {
                return res.status(400).json({ error: result.message });
            }
            return res.json({ status: 'PURCHASED_SUCCESS', msg: 'Game added to library' });
        }

        // If the game is free
        await platformDB.addFreeGameToLibrary(userId, gameId);
        return res.json({ status: 'FREE_ADDED_SUCCESS', msg: 'Free game activated in library' });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:ActionPlayOrBuy] error' });
    }
};

// Дописать в controllers/platformController.js

// Получение списка товаров на маркетплейсе
exports.getMarketItems = async function (req, res) {
    try {
        const { type } = req.query; // Опциональный фильтр по типу ассета
        const items = await platformDB.getMarketplaceItems(type);
        return res.json({ items });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetMarketItems] error' });
    }
};

// Покупка ассета на маркетплейсе
exports.buyAsset = async function (req, res) {
    try {
        // Защищено мидлвейром, данные берем строго из req.platformUser
        const { id: userId } = req.platformUser;
        const { itemId } = req.body;

        if (!itemId) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        const result = await platformDB.purchaseAssetTransaction(userId, itemId);
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.json({ status: 'ASSET_PURCHASED_SUCCESS', msg: 'Asset added to your workshop library' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:BuyAsset] error' });
    }
};

// controllers/platformController.js

// Добавление или редактирование отзыва к игре
exports.postReview = async function (req, res) {
    try {
        // Метод строго защищен мидлвейром strictAuth, забираем id юзера
        const { id: userId } = req.platformUser;
        const { gameId, rating, comment } = req.body;

        if (!gameId || !rating || !comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Missing required review fields' });
        }

        const parsedRating = parseInt(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }

        const review = await platformDB.addOrUpdateGameReview(gameId, userId, parsedRating, comment.trim());

        if (review.err) {
            return res.status(400).json({ error: review.message });
        }

        return res.json({
            status: 'REVIEW_SAVED_SUCCESS',
            msg: 'Your review has been saved',
            review
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:PostReview] error' });
    }
};


// 1. Получение персональной социальной ленты (Лента обновлений)
exports.getFeed = async function (req, res) {
    try {
        // Лента требует авторизации. Если токена нет — возвращаем пустой список или рекомендацию
        if (!req.platformUser) {
            return res.json({ games_feed: [], msg: 'Login to see updates' });
        }

        const { id: userId } = req.platformUser;
        const { page = '1', limit = '12' } = req.query;

        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 12;
        const parsedOffset = (parsedPage - 1) * parsedLimit;

        const posts = await platformDB.getSubscriptionFeed(userId, parsedLimit, parsedOffset);

        // Автоматически гасим красную точку непрочитанного контента, раз юзер открыл ленту
        await platformDB.markFeedAsRead(userId);

        const totalCount = posts.length > 0 ? parseInt(posts[0].total_count) : 0;

        return res.json({
            feed: posts,
            pagination: {
                total_items: totalCount,
                current_page: parsedPage,
                limit: parsedLimit,
                total_pages: Math.ceil(totalCount / parsedLimit) || 1
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetFeed] error' });
    }
};

// 2. Получение публичного профиля команды (Участники + Игры + Рейтинг)
exports.getTeamProfile = async function (req, res) {
    try {
        const { teamId } = req.params;
        const parsedTeamId = parseInt(teamId);

        if (isNaN(parsedTeamId)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }

        const teamData = await platformDB.getTeamProfileData(parsedTeamId);
        if (!teamData) {
            return res.status(404).json({ error: 'Team not found' });
        }

        return res.json(teamData);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetTeamProfile] error' });
    }
};

// 3. Действие: Подписка / Отписка на обновления команды
exports.actionToggleSubscribe = async function (req, res) {
    try {
        const { id: userId } = req.platformUser; // Защищено строгим мидлвейром
        const { teamId } = req.body;

        if (!teamId) {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        const result = await platformDB.toggleTeamSubscription(userId, parseInt(teamId));
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.json({ status: 'SUCCESS', subscription_status: result.status });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:ToggleSubscribe] error' });
    }
};

// 4. Действие: Оставить заявку на вступление в команду
exports.actionApplyToTeam = async function (req, res) {
    try {
        const { id: userId } = req.platformUser;
        const { teamId } = req.body;

        if (!teamId) {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        const result = await platformDB.createJoinRequest(userId, parseInt(teamId));
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.json({ status: 'APPLICATION_SENT_SUCCESS', msg: 'Your request is pending' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:ApplyToTeam] error' });
    }
};

// 5. Действие: Создание новой команды (Для одиночек)
exports.actionCreateTeam = async function (req, res) {
    try {
        const { id: userId } = req.platformUser;
        const { name, description_loc } = req.body;

        if (!name || !description_loc) {
            return res.status(400).json({ error: 'Missing team name or description' });
        }

        const result = await platformDB.createTeamTransaction(userId, name.trim(), description_loc);
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.status(201).json({ status: 'TEAM_CREATED_SUCCESS', teamId: result.teamId });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:CreateTeam] error' });
    }
};

// 6. Менеджмент: Получить входящие заявки (Только для владельца команды)
exports.getIncomingApplications = async function (req, res) {
    try {
        const { teamId, teamRank } = req.platformUser;

        if (!teamId || teamRank !== 'owner') {
            return res.status(403).json({ error: 'Access denied. Team owners only.' });
        }

        const list = await platformDB.getTeamIncomingApplications(teamId);
        return res.json({ applications: list });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetApplications] error' });
    }
};

// 7. Менеджмент: Принять или отклонить заявку человека
exports.actionProcessApplication = async function (req, res) {
    try {
        const { teamId, teamRank } = req.platformUser;
        const { applicationId, action } = req.body; // action: 'ACCEPT' или 'REJECT'

        if (!teamId || teamRank !== 'owner') {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!applicationId || !['ACCEPT', 'REJECT'].includes(action)) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        const result = await platformDB.handleApplicationTransaction(parseInt(applicationId), action, teamId);
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.json({ status: 'APPLICATION_PROCESSED_SUCCESS' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:ProcessApplication] error' });
    }
};

// 8. Действие: Опубликовать новый пост от лица команды
exports.actionPublishPost = async function (req, res) {
    try {
        const { id: userId, teamId, teamRank } = req.platformUser;
        const { text_loc, gameId = null } = req.body;

        if (!teamId || !['owner', 'admin', 'developer'].includes(teamRank)) {
            return res.status(403).json({ error: 'You do not have rights to publish posts' });
        }

        if (!text_loc || Object.keys(text_loc).length === 0) {
            return res.status(400).json({ error: 'Localized text is required' });
        }

        const result = await platformDB.createTeamPost(teamId, userId, gameId, text_loc);
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.status(201).json({ status: 'POST_PUBLISHED_SUCCESS' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:PublishPost] error' });
    }
};

// 9. Действие: Добавить комментарий к посту в Ленте
exports.actionAddPostComment = async function (req, res) {
    try {
        const { id: userId } = req.platformUser;
        const { postId, comment } = req.body;

        if (!postId || !comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Missing comment fields' });
        }

        const result = await platformDB.addCommentToPost(parseInt(postId), userId, comment.trim());
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.status(201).json({ status: 'COMMENT_ADDED_SUCCESS' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:AddPostComment] error' });
    }
};

// controllers/platformController.js

// Получение списка комментариев к конкретному посту
exports.getPostCommentsList = async function (req, res) {
    try {
        const { postId } = req.params;
        const parsedPostId = parseInt(postId);

        if (isNaN(parsedPostId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // Вызываем наш готовый метод из db/platformDB.js
        const comments = await platformDB.getPostComments(parsedPostId);

        return res.json(comments);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GetPostCommentsList] error' });
    }
};


// 10. Действие: Покупка или продление SaaS подписки игроком
exports.actionBuySubscription = async function (req, res) {
    try {
        const { id: userId } = req.platformUser; // Из strictAuth
        const { tierId } = req.body;

        if (!tierId) {
            return res.status(400).json({ error: 'Tier ID is required' });
        }

        const result = await platformDB.purchaseServiceSubscription(userId, parseInt(tierId));
        if (result.err) {
            return res.status(400).json({ error: result.message });
        }

        return res.json({ status: 'SUBSCRIPTION_PURCHASED_SUCCESS', msg: 'License successfully updated' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:BuySubscription] error' });
    }
};

// 11. Безопасность: Генерация изолированного короткоживущего Service JWT для no-code подпродуктов
exports.generateServiceToken = async function (req, res) {
    try {
        const { id: userId, teamId, services } = req.platformUser;
        const { serviceName } = req.body; // 'gamer_service', 'maker_service', 'asset_animator_service'

        const allowedServices = ['gamer_service', 'maker_service', 'asset_animator_service'];
        if (!serviceName || !allowedServices.includes(serviceName)) {
            return res.status(400).json({ error: 'Invalid or missing service name' });
        }

        // Вытаскиваем очищенные лимиты именно этого конкретного сервиса, которые посчитал мидлвейр
        const targetServiceData = services[serviceName];

        // Собираем легкий payload строго для этого подпродукта
        const servicePayload = {
            userId: userId,
            teamId: teamId,
            serviceName: serviceName,
            tierId: targetServiceData.tier_id,
            limits: targetServiceData.limits // Например: {"max_characters": 50}
        };

        // Генерируем короткий токен на 5 минут.
        // В продакшене у каждого сервиса может быть свой SERVICE_SECRET для изоляции доменов
        const serviceToken = jwt.sign(
            servicePayload,
            process.env.SERVICE_SECRET || 'zcg_spine_animator_secret_2026',
            { expiresIn: '5m' }
        );

        return res.json({
            status: 'SERVICE_TOKEN_GENERATED',
            service_token: serviceToken,
            expires_in_seconds: 300
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message, msg: '[Platform:GenerateServiceToken] error' });
    }
};

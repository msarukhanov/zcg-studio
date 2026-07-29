// routes/platformRoutes.js
const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const { strictAuth, optionalAuth } = require('./platformAuth');

router.post('/auth/register', platformController.register); // 🔥 Регистрация на платформе
router.post('/auth/login', platformController.login);

// --- Публичные эндпоинты (Доступны без логина / Гостям) ---
router.get('/catalog', optionalAuth, platformController.getCatalog); // Каталог игр

router.get('/game/:gameId', optionalAuth, platformController.getGamePageData); // Страница игры (детали + отзывы + серверы)
router.post('/game/review', strictAuth, platformController.postReview); // 🔥 Отправка/обновление отзыва
router.post('/game/action', strictAuth, platformController.actionPlayOrBuy); // Клик "Купить/Играть" для игры

router.get('/market', optionalAuth, platformController.getMarketItems); // Витрина маркетплейса
router.post('/market/buy', strictAuth, platformController.buyAsset); // Клик "Купить" для ассета маркетплейса

// --- 📰 СОЦИАЛЬНАЯ ЛЕНТА (Доступна только авторизованным юзерам) ---
router.get('/feed', strictAuth, platformController.getFeed); // Персональная лента обновлений
router.post('/feed/comment', strictAuth, platformController.actionAddPostComment); // Комментарий к посту
router.get('/feed/comments/:postId', platformController.getPostCommentsList); // 🔥 Получение комментов к посту


router.get('/team/profile/:teamId', platformController.getTeamProfile); // Публичный профиль команды
// --- 👥 МЕНЕДЖМЕНТ КОМАНД И ЗАЯВОК (Требуют строгой авторизации) ---
router.post('/team/create', strictAuth, platformController.actionCreateTeam); // Создать команду
router.post('/team/subscribe', strictAuth, platformController.actionToggleSubscribe); // Подписка/Отписка
router.post('/team/apply', strictAuth, platformController.actionApplyToTeam); // Подать заявку на вступление

// --- 🛠️ УПРАВЛЕНИЕ СТУДИЕЙ (Только для Лидеров/Участников команд) ---
router.post('/team/post', strictAuth, platformController.actionPublishPost); // Написать пост от команды
router.get('/team/applications', strictAuth, platformController.getIncomingApplications); // Список входящих заявок
router.post('/team/applications/process', strictAuth, strictAuth, platformController.actionProcessApplication); // Принять/Отклонить человека


// routes/platformRoutes.js
// В блок приватных эндпоинтов (Приватные эндпоинты с ЖЕСТКОЙ авторизацией) допишите:

router.post('/services/buy', strictAuth, platformController.actionBuySubscription);       // 🔥 Купить/продлить тир
router.post('/services/token', strictAuth, platformController.generateServiceToken);   // 🔥 Получить Service JWT для редактора



module.exports = router;

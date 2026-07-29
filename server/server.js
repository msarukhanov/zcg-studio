require('dotenv').config();

process.on('unhandledRejection', (reason, promise) => {
    console.error('------- КРИТИЧЕСКИЙ СБОЙ АСИНХРОННОСТИ -------');
    console.error('Где упало:', reason.stack || reason);
    console.error('----------------------------------------------');
});

const express = require('express');

const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./DB');

const { connectRedis } = require('./redisClient');
const { initLazyWriteTimer } = require('./db/lazyWrite');

connectRedis(() => {
    console.log('[App] Подключение к Redis подтверждено.');
    initLazyWriteTimer();
});

async function initConfig() {
    try {
        // Запрашиваем глобальный конфиг из таблицы b2b_configs
        const res = await global.pool.query(
            "SELECT config_data FROM b2b_configs WHERE id = $1 LIMIT 1",
            ['global_config']
        );

        console.log("✅ [Postgres B2B] Multi-tenant config successfully loaded from Neon");

    } catch (err) {
        console.error("❌ Critical error during Postgres B2B initConfig:", err.message);
        console.error("❌ B2B Initialization crashed:", err.message)
    }
}
initConfig();

const server = http.createServer(app);

require('./routes')(app);
require('./socket')(server);

const virtualArena = require('./battles/virtualArena');
const {gamesConfigDB} = require('./db/configDB');

virtualArena.generateDailySchedule('demo_mtwtech', "game_combat_stars", "world_01", gamesConfigDB["game_combat_stars"]);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[OK] Модульный бэкенд платформы запущен на http://localhost:${PORT}`);
});


// const cron = require('node-cron');
// const { redisClient } = require('./db/redisClient');
//
// // Запуск строго каждую полночь — 00:00 по времени сервера
// cron.schedule('0 0 * * *', async () => {
//     console.log('[Cron:Midnight] Запуск очистки суточных LiveOps лимитов...');
//
//     if (!redisClient.isOpen || !redisClient.isReady) {
//         return console.error('[Cron:Midnight] Сбой: Редис оффлайн, пропускаю цикл.');
//     }
//
//     try {
//         // 1. Находим в оперативной памяти все временные ключи лимитов сердечек за вчера
//         // Шаблоны: f_limit:*, f_sent:*, g_don:*
//         const heartLimits = await redisClient.keys('f_limit:*');
//         const heartHistory = await redisClient.keys('f_sent:*');
//         const clanTributes = await redisClient.keys('g_don:*');
//
//         const keysToPurge = [...heartLimits, ...heartHistory, ...clanTributes];
//
//         if (keysToPurge.length > 0) {
//             // Атомарно удаляем старые лимиты одной быстрой командой в памяти
//             await redisClient.del(keysToPurge);
//             console.log(`[Cron:Midnight] Успешно вычищено ${keysToPurge.length} протухших LiveOps ключей.`);
//         } else {
//             console.log('[Cron:Midnight] Вчерашних лимитов не обнаружено. Очистка не требуется.');
//         }
//
//     } catch (err) {
//         console.error('[Cron:Midnight] Критическая ошибка при очистке Redis:', err);
//     }
// }, {
//     scheduled: true,
//     timezone: "UTC" // Поставь таймзону своего игрового сервера (например, "Europe/Moscow")
// });

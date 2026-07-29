// utils/serviceTokenValidator.js
const jwt = require('jsonwebtoken');

/**
 * Глобальная функция проверки сервисного токена (Для бэкенд-файлов и импортов)
 * @param {string} token - Сервисный JWT, присланный редактором
 * @returns {Object} - Объект с лимитами и данными юзера, либо объект ошибки
 */
function verifyServiceToken(token) {
    try {
        if (!token) {
            return { err: true, message: 'Missing service token' };
        }

        // Расшифровываем токен секретным ключом СЕРВИСА (он совпадает с тем, что в platformController)
        const secret = process.env.SERVICE_SECRET || 'zcg_spine_animator_secret_2026';
        const decoded = jwt.verify(token, secret);

        // Если токен валиден и не просрочен, возвращаем чистые данные и no-code конфиг ограничений
        return {
            success: true,
            userId: decoded.userId,
            teamId: decoded.teamId,
            serviceName: decoded.serviceName,
            tierId: decoded.tierId,
            // Тот самый конфиг, например: {"max_characters": 50}
            limits: decoded.limits
        };
    } catch (e) {
        console.error("[ServiceValidator] Token validation failed:", e.message);
        return { err: true, message: 'Invalid or expired service token' };
    }
}

module.exports = { verifyServiceToken };




// const { verifyServiceToken } = require('../utils/serviceTokenValidator');
// const platformDB = require('../db/platformDB');
//
// exports.saveNewCharacter = async function(req, res) {
//     // Редактор присылает свой краткоживущий Service JWT в заголовках или body
//     const serviceToken = req.headers['x-service-token'];
//
//     const check = verifyServiceToken(serviceToken);
//     if (check.err) {
//         return res.status(401).json({ error: check.message });
//     }
//
//     // Извлекаем лимит из расшифрованного токена без единого запроса к СУБД!
//     const maxCharactersAllowed = check.limits.max_characters; // Например, 10
//
//     // Считаем сколько персонажей у юзера/команды сейчас РЕАЛЬНО создано в базе
//     const currentCount = await platformDB.getPlayerCharactersCount(check.userId, check.teamId);
//
//     if (currentCount >= maxCharactersAllowed) {
//         // Та самая "фигушка" :)
//         return res.status(403).json({
//             error: `Лимит бесплатного тира исчерпан! Максимум персонажей: ${maxCharactersAllowed}. Продлите подписку в лаунчере.`
//         });
//     }
//
//     // Если лимит не превышен — спокойно пишем данные в базу...
// };

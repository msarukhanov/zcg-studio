// middlewares/platformAuth.js
const jwt = require('jsonwebtoken');

const platformDB = require('../db/platformDB');

exports.strictAuth = async function (req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided', msg: '[Auth] Token missing' });
        }

        const token = authHeader.split(' ');
        if (!token || token.length < 2) {
            return res.status(401).json({ error: 'Invalid token format', msg: '[Auth] Token broken' });
        }

        const decoded = jwt.verify(token[1], process.env.JWT_SECRET || 'zcg_secret_key_2026');

        // Достаем актуальный профиль юзера из СУБД
        const sessionCheck = await global.pool.query(
            'SELECT id, is_mature, team_id, team_rank, current_session_id FROM zcg_users WHERE id = $1;',
            [decoded.id]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(401).json({ error: 'User not found', msg: '[Auth] Account deleted' });
        }

        const dbUser = sessionCheck.rows[0];

        if (dbUser.current_session_id !== decoded.sessionId) {
            return res.status(401).json({ error: 'Session expired', msg: '[Auth] Multi-login detected' });
        }

        // 🔥 КРИТИЧЕСКИЙ ШАГ: Вычисляем максимальные SaaS-лимиты команды на лету из базы данных!
        const teamLimitsPayload = await platformDB.getHighestServiceLimits(dbUser.id, dbUser.team_id);

        // Формируем финальный плотный объект запроса для контроллеров платформы
        req.platformUser = {
            id: dbUser.id,
            isMature: dbUser.is_mature,
            teamId: dbUser.team_id,
            teamRank: dbUser.team_rank,
            sessionId: dbUser.current_session_id,

            // 🔥 Зашиваем вычисленные лимиты во все запросы
            services: teamLimitsPayload
        };

        next();
    } catch (e) {
        console.error("[Middleware:Auth] Error:", e.message);
        return res.status(401).json({ error: 'Unauthorized', msg: '[Auth] Invalid token' });
    }
};

exports.optionalAuth = async function (req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            req.platformUser = null; // Токена нет — значит это гость
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            req.platformUser = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zcg_secret_key_2026');

        const sessionCheck = await global.pool.query(
            'SELECT id, is_mature, team_id, team_rank, current_session_id FROM zcg_users WHERE id = $1;',
            [decoded.id]
        );

        if (sessionCheck.rows.length > 0 && sessionCheck.rows[0].current_session_id === decoded.sessionId) {
            const dbUser = sessionCheck.rows[0];
            req.platformUser = {
                id: dbUser.id,
                isMature: dbUser.is_mature,
                teamId: dbUser.team_id,
                teamRank: dbUser.team_rank,
                sessionId: dbUser.current_session_id
            };
        } else {
            req.platformUser = null; // Сессия протухла или юзер удален
        }

        next();
    } catch (e) {
        // Если токен сломан/истек — не падаем, а просто считаем юзера гостем
        req.platformUser = null;
        next();
    }
};


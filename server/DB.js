const { Sequelize, DataTypes } = require('sequelize');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ВАЖНО ДЛЯ NEON: Облачные базы требуют обязательный SSL-сертификат
    ssl: {
        rejectUnauthorized: false
    }
});

global.pool = pool;

const DATABASE_URL = process.env.DATABASE_URL;

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Отключаем лишний спам SQL-логов в консоли
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

const initDb = async () => {
    try {
        await sequelize.authenticate();
        // alter: true автоматически подстроит таблицы в базе, если вы добавите новые поля в будущем
        await sequelize.sync({ alter: true });
        console.log("🐘 [PostgreSQL] All tables synchronized and ready.");
    } catch (err) {
        console.error("❌ [PostgreSQL] Connection or sync failed:", err.message);
    }
};

module.exports = {
    initDb,
};

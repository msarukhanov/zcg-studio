const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const shopRoutes = require('./routes/shopRoutes');
const gachaRoutes = require('./routes/gachaRoutes');
const gameRoutes = require('./routes/gameRoutes');
const heroRoutes = require('./routes/heroRoutes');
const battleRoutes = require('./routes/battleRoutes');

const platformRoutes = require('./routes/platformRoutes');

const auth = require('./routes/playerAuth');

function init(app) {
    app.use('/api/vgb/auth', authRoutes);
    app.use('/api/vgb/inventory', auth, inventoryRoutes);
    app.use('/api/vgb/items', auth, itemsRoutes);
    app.use('/api/vgb/shop', auth, shopRoutes);
    app.use('/api/vgb/gacha', auth, gachaRoutes);
    app.use('/api/vgb/game', auth, gameRoutes);
    app.use('/api/vgb/hero', auth, heroRoutes);
    app.use('/api/vgb/battle', auth, battleRoutes);


    app.use('/api/platform', platformRoutes);
}

module.exports = init;
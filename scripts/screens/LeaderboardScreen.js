import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}

// Глобальный стейт сессии лидерборда
export const LeaderboardState = {
    currentSort: 'combat_power' // По дефолту сортируем по силе: 'combat_power' | 'level'
};

/**
 * 🏆 ГЛАВНАЯ ТОЧКА ВХОДА: Рендер экрана Таблицы Рекордов
 */
export function renderLeaderboardScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    screenManager.currentScreenId = 'leaderboard';

    // Читаем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'leaderboard') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "220px";
    const detailsWidth = listSettings.details_panel_width || "260px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const padding = listSettings.padding || "10px";
    const gap = listSettings.gap || "6px";

    // 🛠️ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (уберется автоматически при наличии данных от сокета)
    if (!AppState.leaderboard || AppState.leaderboard.length === 0) {
        AppState.leaderboard = [
            { rank: 1, nickname: 'Rafael the Archmage', level: 120, combatPower: 954020, avatar_icon: 'rafael' },
            { rank: 2, nickname: 'BadGirlYannika', level: 115, combatPower: 843110, avatar_icon: 'erin' },
            { rank: 3, nickname: 'FTP-Boss', level: 102, combatPower: 712000, avatar_icon: 'avatar_default' },
            { rank: 4, nickname: 'NagibatorQuentin', level: 98, combatPower: 641250, avatar_icon: 'avatar_default' },
            { rank: 5, nickname: 'LMAO111', level: 85, combatPower: 412900, avatar_icon: 'avatar_default' }
        ];
        AppState.my_rank = 42; // Тестовый личный ранг игрока
    }

    const topList = AppState.leaderboard || [];

    // Корневой wrapper экрана лидерборда
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-leaderboard';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: '500',
        fontFamily: 'sans-serif',
        backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВАЯ КОЛОНКА: ВКЛАДКИ ПЕРЕКЛЮЧЕНИЯ СОРТИРОВКИ (ЧИСТЫЙ DOM)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'lb-sidebar';
    Object.assign(sidebar.style, {
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #252525',
        padding: padding,
        boxSizing: 'border-box',
        height: '100%',
        width: sidebarWidth,
        flexShrink: '0',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        gap: '10px',
        pointerEvents: 'auto'
    });

    const sidebarTitle = document.createElement('div');
    Object.assign(sidebarTitle.style, {
        fontSize: '11px',
        color: '#555',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px'
    });
    sidebarTitle.textContent = _t('leaderboard.lb_categories');
    sidebar.appendChild(sidebarTitle);

    // Описываем категории сортировок
    const categories = [
        { id: 'combat_power', icon: '⚔️', label: _t('leaderboard.combat_power'), activeBg: 'linear-gradient(135deg, #2a1b08, #111)', activeBorder: '#ffcc00', textColor: '#ffcc00' },
        { id: 'level', icon: '✨', label: _t('leaderboard.level'), activeBg: 'linear-gradient(135deg, #1b263b, #111)', activeBorder: '#2196f3', textColor: '#2196f3' }
    ];

    categories.forEach(cat => {
        const isSelected = LeaderboardState.currentSort === cat.id;

        const tabBtn = document.createElement('div');
        tabBtn.className = 'lb-tab-btn';
        tabBtn.setAttribute('data-sort', cat.id);

        Object.assign(tabBtn.style, {
            width: '100%',
            height: '44px',
            background: isSelected ? cat.activeBg : '#0c0c0c',
            border: `1px solid ${isSelected ? cat.activeBorder : '#222'}`,
            borderRadius: '6px',
            padding: '0 12px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            flexShrink: '0'
        });

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '18px';
        iconSpan.textContent = cat.icon;
        tabBtn.appendChild(iconSpan);

        const labelB = document.createElement('b');
        Object.assign(labelB.style, {
            fontSize: '12px',
            color: isSelected ? cat.textColor : '#aaa'
        });
        labelB.textContent = cat.label;
        tabBtn.appendChild(labelB);

        // Клик по вкладке запрашивает новые данные у сервера и ререндерит сцену
        tabBtn.onclick = (e) => {
            e.stopPropagation();
            if (LeaderboardState.currentSort === cat.id) return;

            LeaderboardState.currentSort = cat.id;

            // Запрос на бэкенд
            sendSocket('game', 'getLeaderboard', {
                sortBy: cat.id,
                limit: 100
            });
        };

        sidebar.appendChild(tabBtn);
    });

    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 🏆 2. ЦЕНТРАЛЬНАЯ КОЛОНКА: СКРОЛЛ-ТАБЛИЦА ТОП-100 ИГРОКОВ (ЧИСТЫЙ DOM)
    // =========================================================================
    const isPower = LeaderboardState.currentSort === 'combat_power';

    const centerArea = document.createElement('div');
    centerArea.className = 'lb-center-area';
    Object.assign(centerArea.style, {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        height: '100%',
        backgroundColor: 'rgba(10, 10, 10, 0.5)',
        overflow: 'hidden'
    });

    // --- Информационный хедер таблицы ---
    const centerHeader = document.createElement('div');
    Object.assign(centerHeader.style, {
        width: '100%',
        height: headerHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 15px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #1f1f1f',
        background: headerBg,
        flexShrink: '0',
        pointerEvents: 'auto'
    });

    const headerTitle = document.createElement('div');
    Object.assign(headerTitle.style, {
        fontSize: '12px',
        color: '#ffcc00',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    });
    headerTitle.textContent = `🏆 ${_t('leaderboard.lb_hall_of_fame')} (${isPower ? 'Power' : 'Level'})`;
    centerHeader.appendChild(headerTitle);

    const topCount = document.createElement('div');
    Object.assign(topCount.style, {
        fontSize: '10px',
        color: '#555',
        fontFamily: 'monospace'
    });
    topCount.textContent = `TOP ${topList.length}`;
    centerHeader.appendChild(topCount);
    centerArea.appendChild(centerHeader);

    // --- Сама скролл-зона со строками игроков ---
    const scrollContainer = document.createElement('div');
    Object.assign(scrollContainer.style, {
        flex: '1',
        overflowY: 'auto',
        // Добавляем верхний отступ 60px, чтобы контент не залезал под верхнюю панель ресурсов и кнопку закрытия
        padding: '20px 10px 10px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: gap,
        pointerEvents: 'auto'
    });

    if (topList.length === 0) {
        const emptyBox = document.createElement('div');
        Object.assign(emptyBox.style, {
            margin: 'auto',
            color: '#444',
            fontSize: '12px',
            fontStyle: 'italic'
        });
        emptyBox.textContent = _t('leaderboard.lb_empty');
        scrollContainer.appendChild(emptyBox);
    } else {
        topList.forEach(row => {
            // Подсвечиваем тройку лидеров красивым градиентным цветом
            let rankBg = '#141414';
            let rankColor = '#aaa';
            if (row.rank === 1) { rankBg = 'linear-gradient(90deg, #3a3007, #141414)'; rankColor = '#ffcc00'; }
            else if (row.rank === 2) { rankBg = 'linear-gradient(90deg, #22252a, #141414)'; rankColor = '#ffffff'; }
            else if (row.rank === 3) { rankBg = 'linear-gradient(90deg, #2d1910, #141414)'; rankColor = '#ff763b'; }

            const rowNode = document.createElement('div');
            Object.assign(rowNode.style, {
                width: '100%',
                height: '48px',
                background: rankBg,
                border: '1px solid #1f1f1f',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                boxSizing: 'border-box',
                justifyContent: 'space-between',
                gap: '12px',
                flexShrink: '0'
            });

            // Левый блок строки: Место + Аватар + Никнейм
            const leftBlock = document.createElement('div');
            Object.assign(leftBlock.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '0',
                flex: '1'
            });

            // Место (цифра или медаль)
            const rankSpan = document.createElement('span');
            Object.assign(rankSpan.style, {
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                fontIncrement: 'bold',
                fontWeight: 'bold',
                color: rankColor,
                width: '28px',
                flexShrink: '0',
                textAlign: 'center'
            });
            rankSpan.textContent = row.rank <= 3 ? (row.rank === 1 ? '🥇' : (row.rank === 2 ? '🥈' : '🥉')) : row.rank;
            leftBlock.appendChild(rankSpan);

            // Круглая аватарка
            const avatarImg = document.createElement('img');
            Object.assign(avatarImg.style, {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #333',
                background: '#222',
                objectFit: 'cover',
                flexShrink: '0'
            });
            // Пробуем взять из ассетов, иначе ставим сырой путь или заглушку
            avatarImg.src = window.gameAssets?.[row.avatar_icon] || row.avatar_icon || './assets/images/heroes/heroAvatars/eleniel.webp';
            // avatarImg.onerror = () => { avatarImg.src = './assets/images/heroes/heroAvatars/eleniel.webp'; };
            leftBlock.appendChild(avatarImg);

            // Никнейм игрока
            const nickB = document.createElement('b');
            Object.assign(nickB.style, {
                fontSize: '12px',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });
            nickB.textContent = row.nickname;
            leftBlock.appendChild(nickB);
            rowNode.appendChild(leftBlock);

            // Правый блок строки: Скор (Сила или Уровень)
            const scoreDiv = document.createElement('div');
            Object.assign(scoreDiv.style, {
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: row.rank <= 3 ? rankColor : '#64dfdf',
                background: 'rgba(0,0,0,0.4)',
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #1a1a1a',
                flexShrink: '0'
            });
            scoreDiv.textContent = isPower ? `⚔️ ${row.combatPower.toLocaleString()}` : `Lv.${row.level}`;
            rowNode.appendChild(scoreDiv);

            scrollContainer.appendChild(rowNode);
        });
    }

    centerArea.appendChild(scrollContainer);
    screenWrapper.appendChild(centerArea);

    // =========================================================================
    // 📊 3. ПРАВАЯ КОЛОНКА: СТАТИСТИКА РАНГА ТЕКУЩЕГО ИГРОКА (ЧИСТЫЙ DOM)
    // =========================================================================
    const myProfile = AppState.player || {};
    const myScore = isPower ? `⚔️ ${(myProfile.combat_power || 0).toLocaleString()}` : `Lv.${myProfile.level || 1}`;
    const myAvatar = myProfile.avatar_icon || './assets/images/heroes/heroAvatars/eleniel.webp';
    const myRankDisplay = AppState.my_rank ? `#${AppState.my_rank}` : (_t('leaderboard.lb_unranked'));

    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'lb-details-panel';
    Object.assign(detailsPanel.style, {
        width: detailsWidth,
        height: '100%',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        borderLeft: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Тоже опускаем контент правой панели на 60px, чтобы освободить угол под крестик закрытия
        padding: '20px 15px 15px 15px',
        boxSizing: 'border-box',
        flexShrink: '0',
        pointerEvents: 'auto'
    });

    // Верхний блок: Ваш текущий статус в таблице
    const myStandingBox = document.createElement('div');
    Object.assign(myStandingBox.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        marginTop: '10px'
    });

    const standingTitle = document.createElement('div');
    Object.assign(standingTitle.style, {
        fontSize: '10px',
        color: '#555',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        width: '100%',
        textAlign: 'center'
    });
    standingTitle.textContent = _t('leaderboard.lb_your_rank');
    myStandingBox.appendChild(standingTitle);

    // Большая круглая рамка аватара игрока
    const myAvatarFrame = document.createElement('div');
    Object.assign(myAvatarFrame.style, {
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        border: '2px solid #ffcc00',
        boxShadow: '0 0 15px rgba(255,204,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
        background: '#222'
    });

    const myAvatarImg = document.createElement('img');
    Object.assign(myAvatarImg.style, { width: '100%', height: '100%', objectFit: 'cover' });
    myAvatarImg.src = window.gameAssets?.[myAvatar] || myAvatar;
    // myAvatarImg.onerror = () => { myAvatarImg.src = './assets/images/heroes/heroAvatars/eleniel.webp'; };
    myAvatarFrame.appendChild(myAvatarImg);
    myStandingBox.appendChild(myAvatarFrame);

    // Никнейм
    const myNickB = document.createElement('b');
    Object.assign(myNickB.style, {
        fontSize: '14px',
        color: '#fff',
        width: '100%',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    });
    myNickB.textContent = myProfile.nickname || 'Unknown';
    myStandingBox.appendChild(myNickB);

    // Точное место в топе (Impact шрифт из оригинала)
    const myRankNode = document.createElement('div');
    Object.assign(myRankNode.style, {
        fontSize: '26px',
        fontFamily: 'Impact, sans-serif',
        color: '#ffcc00',
        letterSpacing: '0.5px',
        filter: 'drop-shadow(0 0 10px rgba(255,204,0,0.1))'
    });
    myRankNode.textContent = myRankDisplay;
    myStandingBox.appendChild(myRankNode);
    detailsPanel.appendChild(myStandingBox);

    // Нижняя плашка со счетом игрока
    const myScoreRow = document.createElement('div');
    Object.assign(myScoreRow.style, {
        width: '100%',
        background: '#090909',
        border: '1px solid #1f1f1f',
        borderRadius: '6px',
        padding: '8px',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px'
    });
    myScoreRow.innerHTML = `<span style="color: #666;">${_t('leaderboard.lb_your_score')}:</span><b style="font-family: monospace; color: #fff; background: #161616; padding: 2px 8px; border-radius: 4px; border: 1px solid #222;">${myScore}</b>`;
    detailsPanel.appendChild(myScoreRow);

    screenWrapper.appendChild(detailsPanel);

    // Окончательно монтируем собранное DOM-дерево Лидерборда в корень ScreenManager
    screenManager.rootContainer.appendChild(screenWrapper);
}

/**
 * 🧮 Безопасная функция расчета боевого рейтинга (если глобальный метод недоступен)
 */
function _getHeroRating(hero) {
    if (typeof window.getHeroRating === 'function') {
        return window.getHeroRating(hero);
    }
    let base = (hero.level || 1) * 10;
    if (hero.stars) base += hero.stars * 100;
    return base;
}


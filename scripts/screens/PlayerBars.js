import { AppState } from '../shared/GameState.js';

// Словарь иконок и красивых названий для ресурсов (чтобы не хардкодить)
const ResourceMeta = {
    gold: { icon: '💰', color: '#ffd166', label: 'Золото' },
    diamond: { icon: '💎', color: '#3498db', label: 'Алмазы' },
    hero_exp: { icon: '🧪', color: '#22c55e', label: 'Опыт' },
    pet_food: { icon: '🍖', color: '#e67e22', label: 'Корм' }
};

/**
 * 🪙 УНИВЕРСАЛЬНЫЙ РЕНДЕРЕР СТРОКИ РЕСУРСОВ
 * @param {HTMLElement} container - Родительский wrapper экрана (например, screenWrapper)
 * @param {Array<string>} resourceIds - Список ID ресурсов для показа, например: ['gold', 'diamond']
 */
export function renderTopResourcesBar(container, resourceIds = ['gold', 'diamond']) {
    if (!container) return;

    // Ищем, нет ли уже на экране старой панели, чтобы не плодить дубликаты при перерендере
    const oldBar = container.querySelector('.global-top-resources-bar');
    if (oldBar) oldBar.remove();

    const playerRes = AppState.player?.resources || {};
    const playerInv = AppState.player?.inventory || {};

    // 1. Создаем корневой flex-контейнер панели
    const barWrapper = document.createElement('div');
    barWrapper.className = 'global-top-resources-bar';
    Object.assign(barWrapper.style, {
        position: 'fixed',
        top: '10px',
        // Смещаем вправо, оставляя 65px зазора, чтобы полоса аккуратно встала СЛЕВА от кнопки закрыть (✕)
        right: '65px',
        height: '44px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '10px',
        zIndex: '600', // На одном уровне с кнопкой закрытия
        pointerEvents: 'auto',
        boxSizing: 'border-box'
    });

    // 2. Наполняем панель запрошенными ресурсами
    resourceIds.forEach(resId => {
        // Безопасно определяем, где лежит ресурс: в .resources или в .inventory (например, билеты гачи или корм)
        let amount = 0;
        if (playerRes[resId] !== undefined) {
            amount = parseInt(playerRes[resId]) || 0;
        } else if (playerInv[resId] !== undefined) {
            amount = parseInt(playerInv[resId]) || 0;
        }

        // Берем метаданные (иконку/цвет) или ставим дефолт, если это кастомный предмет/билет из инвентаря
        const meta = ResourceMeta[resId] || { icon: '🎫', color: '#fff', label: resId };

        // Создаем аккуратную закругленную плашку для каждого ресурса
        const resBadge = document.createElement('div');
        resBadge.className = 'resource-badge';
        Object.assign(resBadge.style, {
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(20, 24, 30, 0.85)',
            border: '1px solid rgb(58, 71, 89)',
            borderRadius: '20px',
            padding: '4px 12px 4px 8px',
            height: '28px',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            gap: '6px'
        });

        // Иконка ресурса
        const iconNode = document.createElement('span');
        iconNode.textContent = meta.icon;
        iconNode.style.fontSize = '14px';
        resBadge.appendChild(iconNode);

        // Количество ресурса с его персональным цветом
        const amountNode = document.createElement('span');
        amountNode.style.color = meta.color;
        amountNode.textContent = amount.toLocaleString(); // Красивое разделение тысяч (1,000)
        resBadge.appendChild(amountNode);

        barWrapper.appendChild(resBadge);
    });

    container.appendChild(barWrapper);
}

export function renderPlayerBar(container) {
    if (!container) return;

    // Ищем, нет ли уже старого бара на экране, чтобы не плодить дубликаты
    const oldBar = container.querySelector('.player-profile-bar-node');
    if (oldBar) oldBar.remove();

    const player = AppState.player;
    if (!player) return; // Если данных игрока еще нет, молча выходим

    const orientation = AppState.config?.orientation || 'landscape';
    const playerBarConfig = AppState.config?.ui?.[orientation]?.find(w => w.id === 'player_bar') || {};
    const layout = playerBarConfig.layout || {};

    // Создаем корневой DOM-узел плашки профиля
    const barWrapper = document.createElement('div');
    barWrapper.className = 'ui-element player-profile-bar-node';

    // ==========================================
    // 📐 ДИНАМИЧЕСКИЙ ПАРСИНГ LAYOUT ИЗ КОНФИГА
    // ==========================================
    Object.assign(barWrapper.style, {
        position: 'fixed',
        top: layout.top || '10px',
        left: layout.left || '10px',
        width: layout.width || '30%',                  // Динамическая ширина из JSON (30%)
        height: layout.height || '60px',                // Динамическая высота из JSON (60px)
        backgroundColor: layout.backgroundColor || '#222', // Динамический цвет из JSON (#222)
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
        zIndex: '600'
    });

    // ==========================================
    // 👤 БЛОК АВАТАРА И VIP-СТАТУСА
    // ==========================================
    const avatarBox = document.createElement('div');
    avatarBox.setAttribute('data-ui-action', 'open_profile');
    Object.assign(avatarBox.style, {
        height: '100%',
        aspectRatio: '1 / 1',
        background: '#333',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        border: '2px solid #ffcc00',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'pointer',
        flexShrink: '0'
    });

    if (player.avatar_icon) {
        const avatarImg = document.createElement('img');
        avatarImg.src = window.gameAssets?.[player.avatar_icon] || player.avatar_icon;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarBox.appendChild(avatarImg);
    } else {
        avatarBox.textContent = '👤';
    }

    // Розовый бадж VIP-уровня
    if (player.vip_level !== undefined) {
        const vipBadge = document.createElement('div');
        Object.assign(vipBadge.style, {
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            background: '#e91e63',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 4px',
            borderRadius: '8px',
            border: '1px solid #fff',
            fontFamily: 'sans-serif',
            lineHeight: '1'
        });
        vipBadge.textContent = `V${player.vip_level}`;
        avatarBox.appendChild(vipBadge);
    }

    // Клик по аватару открывает профиль игрока через ScreenManager
    avatarBox.onclick = (e) => {
        e.stopPropagation();
        if (AppState.engine?.ScreenManager) {
            AppState.engine.ScreenManager.renderScreen('profile');
        }
    };
    barWrapper.appendChild(avatarBox);

    // ==========================================
    // 📝 ТЕКСТОВЫЙ БЛОК ДАННЫХ И ПРОГРЕСС-БАР
    // ==========================================
    const infoContainer = document.createElement('div');
    Object.assign(infoContainer.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: '10px',
        minWidth: '0'
    });

    // Строка: Никнейм + Уровень
    const nameRow = document.createElement('div');
    Object.assign(nameRow.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
    });

    const nicknameB = document.createElement('b');
    Object.assign(nicknameB.style, {
        fontSize: '14px',
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '70%'
    });
    nicknameB.textContent = player.nickname || 'Traveler';

    const levelSpan = document.createElement('span');
    Object.assign(levelSpan.style, {
        color: '#4caf50',
        fontSize: '11px',
        fontWeight: 'bold'
    });
    levelSpan.textContent = `Lvl ${player.level || 1}`;

    nameRow.appendChild(nicknameB);
    nameRow.appendChild(levelSpan);
    infoContainer.appendChild(nameRow);

    // Полоска опыта (Exp Bar)
    const expPercent = Math.min(100, ((player.exp || 0) / (player.max_exp || 1000)) * 100);

    const expTrack = document.createElement('div');
    Object.assign(expTrack.style, {
        width: '100%',
        height: '5px',
        background: '#444',
        borderRadius: '3px',
        margin: '4px 0',
        overflow: 'hidden'
    });

    const expFill = document.createElement('div');
    Object.assign(expFill.style, {
        width: `${expPercent}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #4caf50, #8bc34a)'
    });
    expTrack.appendChild(expFill);
    infoContainer.appendChild(expTrack);

    // Нижняя строка: ID сервера + Адаптивное серверное время
    const serverRow = document.createElement('div');
    Object.assign(serverRow.style, {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#aaa',
        width: '100%',
        fontFamily: 'sans-serif'
    });

    // ID Сервера
    const serverId = player.server_id ? player.server_id.toUpperCase() : 'S1';
    const serverMeta = document.createElement('span');
    serverMeta.innerHTML = `${_t('profile_server') || 'Сервер'}: <b style="color:#2196f3;">${serverId}</b>`;
    serverRow.appendChild(serverMeta);

    // Серверное время
    const timeMeta = document.createElement('span');
    const formattedTime = (typeof window.getFormattedTime === 'function')
        ? window.getFormattedTime(AppState.serverTimeOffset || 0)
        : new Date().toLocaleTimeString();

    timeMeta.innerHTML = `${_t('profile_server_time') || 'Время'}: <b style="color:#ffcc00; font-family: monospace;">${formattedTime}</b>`;
    serverRow.appendChild(timeMeta);

    infoContainer.appendChild(serverRow);
    barWrapper.appendChild(infoContainer);

    // Финально монтируем плашку в переданный контейнер главного меню
    container.appendChild(barWrapper);
}

/**
 * ✕ УНИВЕРСАЛЬНЫЙ РЕНДЕРЕР КНОПКИ ЗАКРЫТИЯ ЭКРАНА
 * @param {HTMLElement} container - Родительский wrapper экрана (например, screenWrapper)
 * @param {Function} onCloseCallback - Кастомная функция, которая выполнится при клике на крестик
 */
export function renderCloseButton(container, openScreen = null) {
    if (!container) return;

    // Предотвращаем дублирование кнопки при повторных перерендерах внутри экрана
    const oldBtn = container.querySelector('.global-screen-close-btn');
    if (oldBtn) oldBtn?.remove();

    // Создаем элемент кнопки
    const closeBtn = document.createElement('button');
    closeBtn.className = 'global-screen-close-btn';
    closeBtn.innerHTML = '✕';

    // Стандартизированные игровые стили крестика
    Object.assign(closeBtn.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '44px',
        height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)',
        border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%',
        color: '#8a92a6',
        fontSize: '22px',
        cursor: 'pointer',
        zIndex: '600', // Поверх всех интерфейсов экрана
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        transition: 'background-color 0.2s, color 0.2s, transform 0.1s',
        pointerEvents: 'auto'
    });

    // Легкий визуальный отклик при наведении и нажатии
    closeBtn.onmouseenter = () => {
        closeBtn.style.backgroundColor = 'rgba(35, 45, 56, 0.95)';
        closeBtn.style.color = '#fff';
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.backgroundColor = 'rgba(20, 24, 30, 0.85)';
        closeBtn.style.color = '#8a92a6';
        closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onmousedown = () => {
        closeBtn.style.transform = 'scale(0.95)';
    };
    closeBtn.onmouseup = () => {
        closeBtn.style.transform = 'scale(1)';
    };

    // Навешиваем событие клика
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        AppState.engine.ScreenManager.renderScreen(openScreen || 'main_menu');
        if (window.resumeTicker) window.resumeTicker();
    };

    container.appendChild(closeBtn);
}



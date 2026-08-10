import { AppState } from '../shared/GameState.js';

// Глобальное хранилище фильтров текущей сессии экрана
const ListFilters = {
    currentFaction: 'all',
    currentClass: 'all',
    displayMode: null,
    mode: 'owned' // 'owned' | 'catalog'
};

/**
 * 👤 ГЛАВНАЯ ФУНКЦИЯ: Рендер экрана списка героев
 */
export function renderHeroListScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Сносим старое меню и ставим текущий ID
    screenManager.currentScreenId = 'hero_list';

    // Вытягиваем настройки сетки из конфига UI в AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const screenSettings = AppState.ui?.[orientation]?.find(w => w.id === 'hero_list') || {};
    const listSettings = screenSettings.list_settings || {};

    const displayMode = ListFilters.displayMode || listSettings.display_mode || 'grid'; // 'grid' или 'row'
    const gridColumns = listSettings.grid_columns || 6;
    const gap = listSettings.gap || '2%';
    const iconSize = '32px';

    let screenWrapper = screenManager.rootContainer.querySelector('#screen-hero_list');
    if(screenWrapper) screenWrapper.remove();

    // Корневой слой оверлея экрана
    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-hero_list';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: '500',
        fontFamily: 'sans-serif'
    });

    // =========================================================================
    // 🧱 САЙДБАР С ФИЛЬТРАМИ (ЛЕВАЯ КОЛОНКА)
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar-filters';
    Object.assign(sidebar.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRight: '1px solid #232d38',
        padding: '5px',
        boxSizing: 'border-box',
        height: '100%',
        width: '60px',
        flexShrink: '0',
        background: '#111622',
        position: 'relative'
    });

    const toggleLayoutBtn = document.createElement('button');
    toggleLayoutBtn.className = 'btn-toggle-layout';
    // Меняем иконку на кнопке в зависимости от того, какой режим сейчас активен
    toggleLayoutBtn.textContent = displayMode === 'grid' ? '📱' : '🔲';
    // toggleLayoutBtn.title = displayMode === 'grid' ? 'Переключить на горизонтальную ленту' : 'Переключить на сетку';
    Object.assign(toggleLayoutBtn.style, {
        width: '100%',
        height: '24px',
        background: '#232d38',
        color: '#ffd166',
        border: '1px solid #3a4759',
        fontSize: '10px',
        cursor: 'pointer',
        borderRadius: '4px',
        fontWeight: 'bold',
        marginBottom: '10px',
        flexShrink: '0'
    });
    toggleLayoutBtn.onclick = () => {
        ListFilters.displayMode = displayMode === 'grid' ? 'row' : 'grid';
        renderHeroListScreen();
    };
    sidebar.appendChild(toggleLayoutBtn);

    // --- Переключатели режимов (Игрок 👤 / Каталог 📖) ---
    const modeTabsContainer = document.createElement('div');
    Object.assign(modeTabsContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: '3px',
        marginBottom: '12px',
        flexShrink: '0'
    });

    const modes = [
        { id: 'owned', icon: '👤' },
        { id: 'catalog', icon: '📖' }
    ];

    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m.icon;
        const isActive = ListFilters.mode === m.id;
        Object.assign(btn.style, {
            flex: '1',
            height: m.id === 'owned' ? '26px' : iconSize,
            background: isActive ? '#ffd166' : '#1a2436',
            color: isActive ? '#000' : '#fff',
            border: 'none',
            fontSize: m.id === 'owned' ? iconSize : `calc(${iconSize} - 4px)`,
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: 'bold'
        });
        btn.onclick = () => {
            ListFilters.mode = m.id;
            renderHeroListScreen();
        };
        modeTabsContainer.appendChild(btn);
    });
    sidebar.appendChild(modeTabsContainer);

    // --- Вертикальный список иконок Фракций ---
    const factionContainer = document.createElement('div');
    Object.assign(factionContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        alignItems: 'center',
        overflowY: 'auto',
        flex: '1',
        marginBottom: '45px'
    });

    const allFactionBtn = document.createElement('button');
    const isAllFaction = ListFilters.currentFaction === 'all';
    allFactionBtn.textContent = 'ALL';
    Object.assign(allFactionBtn.style, {
        width: '32px',
        height: '32px',
        background: isAllFaction ? '#ffd166' : '#1a2436',
        color: isAllFaction ? '#000' : '#fff',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '9px',
        fontWeight: 'bold',
        flexShrink: '0'
    });
    allFactionBtn.onclick = () => {
        ListFilters.currentFaction = 'all';
        renderHeroListScreen();
    };
    factionContainer.appendChild(allFactionBtn);

    const factionsList = Object.entries(AppState.factions || {});
    factionsList.forEach(([id, f]) => {
        const btn = document.createElement('button');
        const isActive = ListFilters.currentFaction === id;
        btn.textContent = f.icon || '🏴';
        if (f.name_loc) btn.title = _loc(f.name_loc);
        Object.assign(btn.style, {
            width: iconSize,
            height: iconSize,
            background: isActive ? '#ffd166' : '#111622',
            border: `2px solid ${isActive ? '#ffd166' : '#3a4759'}`,
            borderRadius: '50%',
            padding: '0',
            cursor: 'pointer',
            fontSize: `calc(${iconSize} - 8px)`,
            flexShrink: '0'
        });
        btn.onclick = () => {
            ListFilters.currentFaction = id;
            renderHeroListScreen();
        };
        factionContainer.appendChild(btn);
    });
    sidebar.appendChild(factionContainer);

    // --- Горизонтальный ряд Классов (зафиксирован в самом низу) ---
    const classContainer = document.createElement('div');
    Object.assign(classContainer.style, {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '4px',
        flexShrink: '0',
        borderTop: '1px solid #232d38',
        padding: '10px 5px',
        background: '#1a2436',
        position: 'absolute',
        zIndex: '10',
        bottom: '5px',
        left: '5px',
        right: '5px',
        borderRadius: '4px',
        minWidth: '120px'
    });

    const allClassBtn = document.createElement('button');
    const isAllClass = ListFilters.currentClass === 'all';
    allClassBtn.textContent = '🌐';
    Object.assign(allClassBtn.style, {
        flex: '1',
        height: '26px',
        background: isAllClass ? '#ffd166' : '#111622',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
    });
    allClassBtn.onclick = () => {
        ListFilters.currentClass = 'all';
        renderHeroListScreen();
    };
    classContainer.appendChild(allClassBtn);

    const classesList = Object.entries(AppState.classes || {});
    classesList.forEach(([id, c]) => {
        const btn = document.createElement('button');
        const isActive = ListFilters.currentClass === id;
        btn.textContent = c.icon || '⚔️';
        if (c.name_loc) btn.title = _loc(c.name_loc);
        Object.assign(btn.style, {
            flex: '1',
            height: iconSize,
            background: isActive ? '#ffd166' : '#111622',
            border: `1px solid ${isActive ? '#ffd166' : '#3a4759'}`,
            borderRadius: '4px',
            padding: '0',
            cursor: 'pointer',
            fontSize: `calc(${iconSize} - 8px)`
        });
        btn.onclick = () => {
            ListFilters.currentClass = id;
            renderHeroListScreen();
        };
        classContainer.appendChild(btn);
    });
    sidebar.appendChild(classContainer);
    screenWrapper.appendChild(sidebar);

    let displayHeroes = [];
    const rarityOrder = AppState.config?.mechanics?.rarities?.hero || ["R", "SR", "SSR", "UR"];

    if (ListFilters.mode === 'owned') {
        // Крутим пары [ключ_персонажа, данные] из AppState.characters
        Object.entries(AppState.characters || {}).forEach(([charKey, charData]) => {
            if (!charData) return;

            // Ищем прототип в конфигах по прямому совпадению ключа ("rafael")
            const proto = AppState.ConfigCharacter?.[charKey];
            if (!proto) return; // Если прототипа нет, пропускаем

            // Фильтруем по фракциям и классам
            const matchFaction = ListFilters.currentFaction === 'all' || proto.faction === ListFilters.currentFaction;
            const matchClass = ListFilters.currentClass === 'all' || proto.class_id === ListFilters.currentClass;

            if (matchFaction && matchClass) {
                // Закидываем в массив структуры, ГАРАНТИРУЯ наличие поля id для сортировки
                displayHeroes.push({
                    ...charData,
                    id: charKey, // Искусственно прописываем ключ как id для Части 3
                    isLockedInCatalog: false
                });
            }
        });

        // Сортировка по силе и редкости
        displayHeroes.sort((a, b) => {
            const powerA = _getHeroRating(a);
            const powerB = _getHeroRating(b);
            if (powerB !== powerA) return powerB - powerA;

            const rarityA = AppState.ConfigCharacter?.[a.id]?.rarity;
            const rarityB = AppState.ConfigCharacter?.[b.id]?.rarity;
            return rarityOrder.indexOf(rarityB) - rarityOrder.indexOf(rarityA);
        });

    } else {
        // Режим каталога: крутим глобальные прототипы из AppState.ConfigCharacter
        Object.entries(AppState.ConfigCharacter || {}).forEach(([charKey, proto]) => {
            if (!proto) return;

            const matchFaction = ListFilters.currentFaction === 'all' || proto.faction === ListFilters.currentFaction;
            const matchClass = ListFilters.currentClass === 'all' || proto.class_id === ListFilters.currentClass;

            if (matchFaction && matchClass) {
                // Проверяем, есть ли этот ключ у игрока прямо сейчас
                const ownedCopy = AppState.characters?.[charKey];

                if (ownedCopy) {
                    displayHeroes.push({
                        ...ownedCopy,
                        id: charKey,
                        isLockedInCatalog: false
                    });
                } else {
                    displayHeroes.push({
                        id: charKey,
                        instance_id: `catalog_${charKey}`,
                        level: 0,
                        stars: 0,
                        equipped: {},
                        isLockedInCatalog: true
                    });
                }
            }
        });
    }

    // =========================================================================
    // ⚔️ ПАНЕЛЬ ОТОБРАЖЕНИЯ (ЗАЩИЩЕННЫЙ КОНТЕЙНЕР ДЛЯ ГРИДА / ЛЕНТЫ)
    // =========================================================================
    const listContainer = document.createElement('div');
    listContainer.className = 'heroes-grid-container';

    if (displayMode === 'grid' || !displayMode) {
        Object.assign(listContainer.style, {
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns || 6}, 1fr)`,
            gridAutoRows: 'max-content',
            gap: gap || '2%',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            boxSizing: 'border-box',
            // ДОБАВЛЕН ОТСТУП НАВЕРХУ (60px), чтобы карточки уходили под кнопку закрытия аккуратно
            padding: '60px 12px 12px 12px',
            pointerEvents: 'auto'
        });
    } else {
        Object.assign(listContainer.style, {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: gap || '2%',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            // ДОБАВЛЕН ВЕРХНИЙ МАРДЖИН ДЛЯ ЛЕНТЫ, чтобы сместить всю полосу прокрутки ниже кнопки
            marginTop: '50px',
            padding: '12px',
            pointerEvents: 'auto'
        });
    }

    // Если список пуст — выводим сообщение заглушку
    if (displayHeroes.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.textContent = _t('ui.heroes_empty');
        Object.assign(emptyBox.style, {
            color: '#6a737d',
            padding: '20px',
            width: '100%',
            textAlign: 'center',
            fontSize: '13px'
        });
        listContainer.appendChild(emptyBox);
    } else {
        // Рендерим карточки персонажей
        displayHeroes.forEach(hero => {
            const cardNode = createHeroCardNode(hero, listSettings.card_layout || {}, displayMode || 'grid', displayHeroes);
            if (cardNode) {
                listContainer.appendChild(cardNode);
            }
        });
    }

    screenWrapper.appendChild(listContainer);

    screenManager.rootContainer.appendChild(screenWrapper);
}

/**
 * 🎴 СБОРЩИК КАРТОЧКИ ГЕРОЯ (ДОМ-ЭЛЕМЕНТ ПОД GRID И FLEX-ROW)
 */
/**
 * 🎴 ОБНОВЛЕННЫЙ СБОРЩИК КАРТОЧКИ ГЕРОЯ (ДОМ-ЭЛЕМЕНТ БЕЗ HERO_ID)
 */
function createHeroCardNode(hero, cardLayout, displayMode, displayHeroes) {
    if (!cardLayout) return null;

    // НОВАЯ ЛОГИКА: Так как hero_id больше нет, ключом прототипа является сам ID/ключ персонажа
    // Если это объект из каталога заглушек, у него id берется на основе структуры, либо ищем по переданному инстансу
    const charKey = hero.id || hero.hero_id || (hero.instance_id && hero.instance_id.startsWith('catalog_') ? hero.instance_id.replace('catalog_', '') : null);

    const prototype = AppState.ConfigCharacter?.[charKey];
    if (!prototype) return null;

    const faction = AppState.factions?.[prototype.faction];
    const element = AppState.hero_elements?.[prototype.element_id];
    const totalPowerRating = _getHeroRating(hero);

    const isGridMode = displayMode === 'grid';
    const rawImg = isGridMode ? (prototype.icon || '') : (prototype.image || '');
    const heroImageSrc = window.gameAssets[rawImg] || rawImg || 'https://picsum.photos';

    const card = document.createElement('div');
    card.className = 'ui-element hero-card-clickable';
    // Для экшенов и сессий используем уникальный instance_id или сам ключ
    card.setAttribute('data-hero-view-instance-id', hero.instance_id || charKey);

    const catalogLockFilter = hero.isLockedInCatalog ? "grayscale(1) opacity(0.4)" : "none";

    if (isGridMode) {
        // ==========================================
        // СТИЛЬ 1: КОМПАКТНАЯ ЯЧЕЙКА ДЛЯ CSS GRID
        // ==========================================
        Object.assign(card.style, {
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            backgroundColor: cardLayout.backgroundColor || '#1a2436',
            borderRadius: cardLayout.borderRadius || '4px',
            border: `1px solid ${element?.color || '#3a4759'}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            filter: catalogLockFilter,
            cursor: 'pointer'
        });

        card.innerHTML = `
            <div style="width: 100%; height: 100%; background-image: url('${heroImageSrc}'); background-size: cover; background-position: center top; position: relative;">
                <div style="position: absolute; top: 4%; left: 4%; background: rgba(12, 17, 24, 0.85); color: #fff; padding: 1px 3px; border-radius: 2px; font-weight: bold; font-size: 8px;">
                    ${prototype.rarity}
                </div>
                ${faction ? `<div style="position: absolute; top: 4%; right: 4%; background: rgba(12, 17, 24, 0.85); width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 8px;">${faction.icon}</div>` : ''}
                <div style="position: absolute; bottom: 0; width: 100%; background: rgba(12, 17, 24, 0.85); display: flex; justify-content: space-between; padding: 1px 4px; box-sizing: border-box; font-size: 8px; font-family: monospace;">
                    <span style="color: #a0a5b5;">L.${hero.level || 0}</span>
                    <span style="color: #ffd166; font-weight: bold;">⚔️${Math.floor(totalPowerRating)}</span>
                </div>
            </div>
        `;
    } else {
        // ==========================================
        // СТИЛЬ 2: БОЛЬШАЯ КАРТОЧКА ДЛЯ FLEX ROW-ЛЕНТЫ
        // ==========================================
        const widthStyle = cardLayout.width || '150px';
        const heightStyle = cardLayout.height || '100%';
        const starsHtml = "⭐".repeat(hero.stars || 1);

        Object.assign(card.style, {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: '0',
            width: widthStyle,
            height: heightStyle,
            maxHeight: 'calc(100% - 55px)',
            aspectRatio: cardLayout.aspectRatio || "9 / 16",
            backgroundColor: cardLayout.backgroundColor || '#111622',
            borderRadius: cardLayout.borderRadius || '8px',
            borderTop: `4px solid ${element?.color || '#3a4759'}`,
            borderLeft: '1px solid #232d38',
            borderRight: '1px solid #232d38',
            borderBottom: '1px solid #232d38',
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            boxSizing: 'border-box',
            alignSelf: 'flex-start',
            filter: catalogLockFilter,
            cursor: 'pointer'
        });

        card.innerHTML = `
            <div style="width: 100%; flex: 1; background-image: url('${heroImageSrc}'); background-size: cover; background-position: center top; position: relative;">
                <div style="position: absolute; top: 5%; left: 5%; background: rgba(12, 17, 24, 0.85); color: #fff; padding: 2% 5%; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid rgba(255,255,255,0.1);">
                    ${prototype.rarity}
                </div>
                <div style="position: absolute; top: 5%; right: 5%; display: flex; gap: 5px;">
                    ${faction ? `<div style="background: rgba(12, 17, 24, 0.85); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px;">${faction.icon}</div>` : ''}
                </div>
                <div style="position: absolute; bottom: 5%; width: 100%; text-align: center; color: #ffd166; font-size: 12px; text-shadow: 0 2px 4px rgba(0,0,0,0.9);">
                    ${starsHtml}
                </div>
            </div>
            <div style="padding: 5% 8%; display: flex; flex-direction: column; gap: 2px; background: rgba(17,22,34,0.95); border-top: 1px solid #232d38;">
                <div style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">
                    ${_loc(prototype.name_loc || charKey)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span style="color: #a0a5b5;">${_t('ui.heroes_lvl') || 'Lvl'} ${hero.level || 1}</span>
                    <b style="color: #ffd166;">⚔️ ${Math.floor(totalPowerRating)}</b>
                </div>
            </div>
        `;
    }

    card.onclick = () => {
        if (AppState.engine?.ScreenManager) {
            // Записываем ID выбранного персонажа для следующего экрана
            AppState.engine.ScreenManager._selectedHeroInstanceId = hero.instance_id || charKey;

            // Сохраняем массив контекста пати, вытаскивая корректные IDшники
            AppState.engine.ScreenManager._currentHeroListContext = displayHeroes.map(h => h.instance_id || h.id);
            AppState.engine.ScreenManager.renderScreen('hero_view');
        }
    };

    return card;
}

/**
 * 🧮 Безопасная функция вычисления рейтинга
 */
function _getHeroRating(hero) {
    if (typeof window.getHeroRating === 'function') {
        return window.getHeroRating(hero);
    }
    let base = (hero.level || 1) * 10;
    if (hero.stars) base += hero.stars * 100;
    return base;
}

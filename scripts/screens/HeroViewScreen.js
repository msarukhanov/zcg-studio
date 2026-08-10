import { AppState } from '../shared/GameState.js';

// import { sendSocket } from '../db/socket.js';

function sendSocket() {}

// Теккущая активная вкладка внутри экрана (сохраняем в сессии, чтобы не сбрасывалась)
let activeHeroTab = 'stats';

// =========================================================================
// 🌐 СЕТЕВЫЕ МЕТОДЫ ОТПРАВКИ ДАННЫХ (СОКЕТЫ)
// =========================================================================
export async function equipHeroItem(heroInstanceId, itemId, slotId) {
    sendSocket('hero', 'equipItem', {
        heroInstanceId,
        itemId: itemId, // Если null -> предмет снимется
        slotId: slotId  // Слот (weapon, armor, personal и т.д.)
    });
}

export async function levelUpHero(heroInstanceId, levelsToUp) {
    sendSocket('hero', 'levelUp', { heroInstanceId, levels_to_up: levelsToUp });
}

export async function upgradePersonalItem(heroInstanceId) {
    sendSocket('hero', 'upgradePersonalItem', { heroInstanceId });
}

export async function changeHeroSkin(heroInstanceId, skinId) {
    sendSocket('hero', 'changeHeroSkin', { heroInstanceId, skinId });
}

export async function upgradeHeroStars(heroInstanceId, fodderInstIds) {
    sendSocket('hero', 'upgradeStars', {
        heroInstanceId,
        fodder_inst_ids: fodderInstIds
    });
}

export async function manageHeroPet(heroInstanceId, petId, isLevelUpAction) {
    sendSocket('hero', 'managePet', {
        heroInstanceId,
        petId, // null, если это чистый левелап текущего
        isLevelUpAction
    });
}

// =========================================================================
// 🖥️ ГЛАВНАЯ ТОЧКА ВХОДА: Инициализация и рендер экрана просмотра
// =========================================================================
export function renderHeroViewScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Вытаскиваем ID выбранного героя из сессии менеджера экранов
    // (Помним, что для живых героев это имя-ключ, например "rafael")
    const instanceId = screenManager._selectedHeroInstanceId;
    const listIds = screenManager._currentHeroListContext || [instanceId];

    if (!instanceId) return;

    // Определяем, заблокирован ли персонаж (Каталог)
    const isCatalogLocked = instanceId.startsWith('catalog_');
    let hero = null;
    let prototype = null;
    let charKey = instanceId;

    if (isCatalogLocked) {
        charKey = instanceId.replace('catalog_', '');
        prototype = AppState.ConfigCharacter?.[charKey];
        // Фейковый объект для отображения в каталоге
        hero = { id: charKey, level: 100, stars: 5, equipped: {} };
    } else {
        // Живой персонаж из базы игрока
        hero = AppState.characters?.[charKey];
        if (hero) hero.id = charKey; // Гарантируем внутренний ID для логики
        prototype = AppState.ConfigCharacter?.[charKey];
    }

    if (!prototype || !hero) {
        console.error(`[HeroView] Не найдены данные для персонажа: ${charKey}`);
        return;
    }

    // Читаем ориентацию и настройки разметки
    const orientation = AppState.config?.orientation || 'landscape';
    const viewSettings = AppState.ui?.[orientation]?.find(w => w.id === 'hero_view') || {};
    const configuredTabs = viewSettings.menu_tabs || ['stats', 'inventory', 'bio'];
    const viewLayout = viewSettings.view_layout || ['menu', 'avatar', 'content'];

    if (!configuredTabs.includes(activeHeroTab)) {
        activeHeroTab = configuredTabs[0] || 'stats';
    }

    let screenWrapper = screenManager.rootContainer.querySelector('#screen-hero_view');
    if(screenWrapper) screenWrapper.remove();

    // Корневой слой оверлея экрана
    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-hero_view';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        boxSizing: 'border-box',
        padding: '20px',
        userSelect: 'none',
        zIndex: '500',
        fontFamily: 'sans-serif'
    });

    // Контейнер, куда по порядку layouts встанут блоки Меню, Аватара и Контента
    const innerContainer = document.createElement('div');
    innerContainer.className = 'hero-view-inner-container';
    Object.assign(innerContainer.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        boxSizing: 'border-box'
    });

    // Ссылки на DOM-узлы блоков для упорядочивания
    let blocksMap = {
        'menu': null,
        'avatar': null,
        'content': null
    };

    // --- БЛОК 1: МЕНЮ ВКЛАДОК (Генерируем как чистый DOM) ---
    const menuBlock = document.createElement('div');
    menuBlock.className = 'view-block-menu';
    Object.assign(menuBlock.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '10px',
        borderRadius: '6px',
        flexShrink: '0'
    });

    configuredTabs.forEach(tabKey => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        const isActive = activeHeroTab === tabKey;
        const cacheKey = tabKey === 'inventory' ? 'tab_inventory' : `tab_${tabKey}`;

        btn.textContent = _t('ui.'+cacheKey) || tabKey;
        Object.assign(btn.style, {
            padding: '10px',
            background: isActive ? '#ffd166' : '#1a2436',
            color: isActive ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '12px'
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            activeHeroTab = tabKey;
            // Перерисовываем весь экран при смене вкладки
            renderHeroViewScreen();
        };
        menuBlock.appendChild(btn);
    });
    blocksMap['menu'] = menuBlock;

    // --- ВЫЧИСЛЕНИЕ АССЕТОВ И СЛИЯНИЕ С КАРУСЕЛЬЮ ---
    const currentIndex = listIds.indexOf(instanceId);
    const prevInstanceId = currentIndex > 0 ? listIds[currentIndex - 1] : null;
    const nextInstanceId = currentIndex < listIds.length - 1 ? listIds[currentIndex + 1] : null;

    // Безопасно определяем текущий надетый облик (skin)
    const currentSkinId = hero.active_skin || `${charKey}_skin_default`;
    const currentSkinObj = prototype.skins?.find(s => s.skin_id === currentSkinId);
    const rawAvatarImg = currentSkinObj?.image || prototype.image || '';
    const heroImageSrc = window.gameAssets[rawAvatarImg] || rawAvatarImg || 'https://picsum.photos';

    // --- БЛОК 2: ЦЕНТРАЛЬНЫЙ АВАТАР ПЕРСОНАЖА ---
    const avatarBlock = document.createElement('div');
    avatarBlock.className = 'view-block-avatar';
    Object.assign(avatarBlock.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: '100%',
        background: 'rgba(20, 27, 38, 0.4)',
        borderRadius: '6px',
        border: '1px solid #232d38',
        overflow: 'hidden'
    });

    // ◀ Стрелка НАЗАД (Предыдущий герой в пати)
    if (prevInstanceId) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-arrow-btn';
        prevBtn.innerHTML = '◀';
        Object.assign(prevBtn.style, {
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '24px',
            background: 'rgba(17, 22, 34, 0.85)',
            color: '#fff',
            border: '1px solid #3a4759',
            borderRadius: '4px',
            cursor: 'pointer',
            padding: '8px 12px',
            zIndex: '10'
        });
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            screenManager._selectedHeroInstanceId = prevInstanceId;
            renderHeroViewScreen(); // Реактивный рендер следующего инстанса
        };
        avatarBlock.appendChild(prevBtn);
    }

    // Рендер самого аватара с анимацией пульсации
    const heroImg = document.createElement('img');
    heroImg.className = 'idle_pulse';
    heroImg.src = heroImageSrc;
    Object.assign(heroImg.style, {
        height: '100%',
        width: 'auto',
        objectFit: 'contain'
    });
    avatarBlock.appendChild(heroImg);

    // 🐾 ОТОБРАЖЕНИЕ ПИТОМЦА РЯДОМ С ПЕРСОНАЖЕМ
    const activePet = hero.pet; // Структура: { pet_id: "frost_fox", level: 10 }
    const petProto = activePet ? AppState.pets?.[activePet.pet_id] : null;

    if (petProto) {
        const petBadge = document.createElement('div');
        petBadge.className = 'ui-element pet-floating-badge';
        petBadge.title = activePet.pet_id;

        // Добавляем встроенные стили и запуск ключевой анимации парения bounce
        Object.assign(petBadge.style, {
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(17, 22, 34, 0.95)',
            border: '2px solid #ffd166',
            padding: '6px',
            borderRadius: '12px',
            boxShadow: '0 0 10px rgba(255, 209, 102, 0.4)',
            zIndex: '5',
            pointerEvents: 'auto'
        });

        // Внедряем CSS-анимацию парения прямо на ноду, если её нет в глобальных стилях
        if (!document.getElementById('pet-bounce-style')) {
            const styleNode = document.createElement('style');
            styleNode.id = 'pet-bounce-style';
            styleNode.textContent = `
                @keyframes petBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `;
            document.head.appendChild(styleNode);
        }
        petBadge.style.animation = 'petBounce 3s infinite ease-in-out';

        // Наполнение баджа питомца
        const petIcon = document.createElement('div');
        petIcon.style.fontSize = '24px';
        petIcon.style.lineHeight = '1';
        petIcon.textContent = petProto.icon || '🐾';

        const petLvl = document.createElement('span');
        Object.assign(petLvl.style, {
            fontSize: '9px',
            color: '#ffd166',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            marginTop: '2px'
        });
        petLvl.textContent = `Lvl ${activePet.level}`;

        petBadge.appendChild(petIcon);
        petBadge.appendChild(petLvl);
        avatarBlock.appendChild(petBadge);
    }

    // 📋 Нижний Инфо-планшет аватара (Имя бога + Боевая Сила)
    const titlePlate = document.createElement('div');
    Object.assign(titlePlate.style, {
        position: 'absolute',
        bottom: '10px',
        background: 'rgba(12, 17, 24, 0.9)',
        padding: '8px 16px',
        borderRadius: '4px',
        textAlign: 'center',
        border: '1px solid #232d38',
        minWidth: '150px',
        zIndex: '6'
    });

    const titleHeader = document.createElement('h3');
    Object.assign(titleHeader.style, {
        margin: '0 0 2px 0',
        color: '#fff',
        fontSize: '16px'
    });
    titleHeader.textContent = _loc(prototype.name_loc || charKey);

    const combatPowerSpan = document.createElement('span');
    Object.assign(combatPowerSpan.style, {
        color: '#ffd166',
        fontWeight: 'bold',
        fontSize: '13px',
        fontFamily: 'monospace'
    });
    // Безопасный расчет боевой мощи
    const totalPowerRating = hero.combat_power || _getHeroRating(hero);
    combatPowerSpan.textContent = `⚔️ ${Math.floor(totalPowerRating)}`;

    titlePlate.appendChild(titleHeader);
    titlePlate.appendChild(combatPowerSpan);
    avatarBlock.appendChild(titlePlate);

    // ▶ Стрелка ВПЕРЕД (Следующий герой в пати)
    if (nextInstanceId) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-arrow-btn';
        nextBtn.innerHTML = '▶';
        Object.assign(nextBtn.style, {
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '24px',
            background: 'rgba(17, 22, 34, 0.85)',
            color: '#fff',
            border: '1px solid #3a4759',
            borderRadius: '4px',
            cursor: 'pointer',
            padding: '8px 12px',
            zIndex: '10'
        });
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            screenManager._selectedHeroInstanceId = nextInstanceId;
            renderHeroViewScreen();
        };
        avatarBlock.appendChild(nextBtn);
    }

    blocksMap['avatar'] = avatarBlock;

    // --- БЛОК 3: ПРАВАЯ ПАНЕЛЬ ДИНАМИЧЕСКОГО КОНТЕНТА ---
    const contentBlock = document.createElement('div');
    contentBlock.className = 'view-block-content';
    Object.assign(contentBlock.style, {
        width: '35%',
        background: 'rgba(25, 25, 25, 0.85)',
        padding: '12px',
        borderRadius: '6px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #333',
        height: '100%',
        overflowY: 'auto'
    });

    const playerRes = AppState.player?.resources || {};

    // 📊 ТАБ 1: ХАРАКТЕРИСТИКИ С УЧЕТОМ ЭКИПИРОВКИ И ЛЕВЕЛАПЫ
    if (activeHeroTab === 'stats') {
        const statsTitle = document.createElement('h4');
        Object.assign(statsTitle.style, { margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '5px', color: '#fff' });
        statsTitle.textContent = `${_t('ui.tab_stats')} (Lvl ${hero.level})`;
        contentBlock.appendChild(statsTitle);

        const statsGrid = document.createElement('div');
        Object.assign(statsGrid.style, { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', marginBottom: '15px' });

        // Рассчитываем и рендерим каждую характеристику
        // const mechanicsStats = AppState.ConfigMechanics?.stats || AppState.config?.mechanics?.stats || {};
        const mechanicsStats = hero.stats || {};
        Object.entries(mechanicsStats).forEach(([statId, meta]) => {
            const base = prototype.stats?.[statId] || 0;
            const growth = prototype.stats_growth?.[statId] || 0;
            let val = base + (growth * hero.level);

            // Добавляем прибавку от экипированных предметов
            if (hero.equipped) {
                Object.values(hero.equipped).forEach(equippedItemId => {
                    if (equippedItemId) {
                        const itemData = AppState.items?.[equippedItemId] || AppState.ConfigItems?.[equippedItemId];
                        if (itemData?.stats?.[statId]) {
                            val += itemData.stats[statId];
                        }
                    }
                });
            }

            const statRow = document.createElement('div');
            Object.assign(statRow.style, { display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '2px', color: '#aaa' });
            statRow.innerHTML = `<span>${meta.icon || ''} ${_t('stats.'+statId)}</span><b style="color:#fff;">${Math.floor(val)}</b>`;
            statsGrid.appendChild(statRow);
        });
        contentBlock.appendChild(statsGrid);

        // Блок прокачки уровня бога через сокеты
        if (!isCatalogLocked) {
            const lvlUpBox = document.createElement('div');
            Object.assign(lvlUpBox.style, { marginTop: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid #333' });

            const resInfo = document.createElement('div');
            Object.assign(resInfo.style, { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#aaa', marginBottom: '8px' });
            resInfo.innerHTML = `<span>💰 ${playerRes.gold || 0}</span><span>🧪 ${playerRes.hero_exp || playerRes.exp || 0}</span>`;
            lvlUpBox.appendChild(resInfo);

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '6px';

            const createLvlBtn = (text, count, bg) => {
                const btn = document.createElement('button');
                btn.textContent = text;
                Object.assign(btn.style, { flex: '1', padding: '6px', background: bg, color: '#000', border: 'none', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });
                btn.onclick = (e) => {
                    e.stopPropagation();
                    levelUpHero(instanceId, count).then(() => renderHeroViewScreen());
                };
                return btn;
            };

            btnContainer.appendChild(createLvlBtn('+1 LVL', 1, '#4ade80'));
            btnContainer.appendChild(createLvlBtn('+10 LVL', 10, '#22c55e'));
            lvlUpBox.appendChild(btnContainer);
            contentBlock.appendChild(lvlUpBox);
        }
    }

    // 🎒 ТАБ 2: ИНВЕНТАРЬ И СЛОТЫ ЭКИПИРОВКИ
    else if (activeHeroTab === 'inventory') {
        const invTitle = document.createElement('h4');
        Object.assign(invTitle.style, { margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '5px', color: '#fff' });
        invTitle.textContent = _t('ui.tab_inventory');
        contentBlock.appendChild(invTitle);

        if (isCatalogLocked) {
            const lockedText = document.createElement('p');
            Object.assign(lockedText.style, { color: '#aaa', fontSize: '12px' });
            lockedText.textContent = _t('ui.hero_view_locked');
            contentBlock.appendChild(lockedText);
        } else {
            const slotsContainer = document.createElement('div');
            Object.assign(slotsContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

            const slotsList = AppState.hero_inventory_slots || [];
            slotsList.forEach(slot => {
                const equippedItemId = hero.equipped?.[slot];
                const itemMeta = AppState.items?.[equippedItemId] || AppState.ConfigItems?.[equippedItemId];

                const slotRow = document.createElement('div');
                Object.assign(slotRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '6px 10px', borderRadius: '4px', border: '1px solid #333', boxSizing: 'border-box' });

                const infoDiv = document.createElement('div');
                infoDiv.style.fontSize = '12px';
                infoDiv.innerHTML = `<span style="color:#aaa; font-size:10px;">${slot.toUpperCase()}:</span><b style="margin-left:6px; color:#fff;">${itemMeta ? `${itemMeta.icon || '📦'} ${_loc(itemMeta.name_loc)}` : _t('ui.heroes_slot_empty')}</b>`;
                slotRow.appendChild(infoDiv);

                const actionsDiv = document.createElement('div');
                Object.assign(actionsDiv.style, { display: 'flex', gap: '4px' });

                // Если шмотка надета — выводим кнопку Снять (❌)
                if (equippedItemId) {
                    const unequipBtn = document.createElement('button');
                    unequipBtn.textContent = '❌';
                    Object.assign(unequipBtn.style, { padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });
                    unequipBtn.onclick = (e) => {
                        e.stopPropagation();
                        equipHeroItem(instanceId, null, slot).then(() => renderHeroViewScreen());
                    };
                    actionsDiv.appendChild(unequipBtn);
                }

                // Кнопка Надеть/Сменить вещь
                const equipBtn = document.createElement('button');
                equipBtn.textContent = _t('ui.heroes_equip_btn');
                Object.assign(equipBtn.style, { padding: '4px 8px', background: '#ffd166', color: '#000', border: 'none', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });

                // ЛОГИКА ОВЕРЛЕЯ ВЫБОРА ПРЕДМЕТА ИЗ ИНВЕНТАРЯ ИГРОКА
                equipBtn.onclick = (e) => {
                    e.stopPropagation();
                    const playerInv = AppState.player?.inventory || {};

                    // Фильтруем инвентарь игрока под конкретный тип слота
                    const candidateItemIds = Object.keys(playerInv).filter(itemId => {
                        const meta = AppState.items?.[itemId] || AppState.ConfigItems?.[itemId];
                        if (!meta) return false;
                        const itemSlot = meta.slot || meta.type || '';
                        return itemSlot.toLowerCase() === slot.toLowerCase();
                    });

                    // Создаем модальное окно выбора поверх экрана
                    const selectModal = document.createElement('div');
                    Object.assign(selectModal.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', background: 'rgba(10,10,10,0.95)', zIndex: '510', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '6px' });

                    const modalHeader = document.createElement('h3');
                    Object.assign(modalHeader.style, { margin: '0', fontSize: '14px', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
                    modalHeader.innerHTML = `<span>Выберите предмет для слота ${slot.toUpperCase()}</span>`;

                    const closeModalBtn = document.createElement('button');
                    closeModalBtn.textContent = '❌';
                    Object.assign(closeModalBtn.style, { background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' });
                    closeModalBtn.onclick = (ev) => { ev.stopPropagation(); selectModal.remove(); };
                    modalHeader.appendChild(closeModalBtn);
                    selectModal.appendChild(modalHeader);

                    const rowsContainer = document.createElement('div');
                    // --- ПРОДОЛЖЕНИЕ ТАБА ИНВЕНТАРЯ: СБОРКА МОДАЛКИ ВЫБОРА ШМОТОК ---
                    Object.assign(rowsContainer.style, {
                        flex: '1',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    });

                    if (candidateItemIds.length === 0) {
                        const emptyWarning = document.createElement('div');
                        Object.assign(emptyWarning.style, {
                            color: '#666',
                            textAlign: 'center',
                            padding: '20px',
                            fontSize: '12px'
                        });
                        emptyWarning.textContent = 'В инвентаре нет подходящих предметов...';
                        rowsContainer.appendChild(emptyWarning);
                    } else {
                        candidateItemIds.forEach(itemId => {
                            const meta = AppState.items?.[itemId] || AppState.ConfigItems?.[itemId];
                            if (!meta) return;

                            const row = document.createElement('div');
                            row.className = 'item-select-row';
                            Object.assign(row.style, {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#222',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #444',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#fff'
                            });

                            const firstStatValue = meta.stats ? Object.values(meta.stats)[0] || 0 : 0;
                            row.innerHTML = `<span>${meta.icon || '📦'} ${_loc(meta.name_loc)} (${playerInv[itemId]})</span><b style="color:#ffd166;">+${firstStatValue}</b>`;

                            row.onclick = (ev) => {
                                ev.stopPropagation();
                                selectModal.remove();
                                equipHeroItem(instanceId, itemId, slot).then(() => renderHeroViewScreen());
                            };
                            rowsContainer.appendChild(row);
                        });
                    }

                    selectModal.appendChild(rowsContainer);
                    screenWrapper.appendChild(selectModal);
                };

                actionsDiv.appendChild(equipBtn);
                slotRow.appendChild(actionsDiv);
                slotsContainer.appendChild(slotRow);
            });
            contentBlock.appendChild(slotsContainer);
        }
    }

    // 🔗 ТАБ 3: СИНЕРГИИ / УЗЫ БОГОВ (BONDS)
    else if (activeHeroTab === 'bonds') {
        const bondsTitle = document.createElement('h4');
        Object.assign(bondsTitle.style, {
            margin: '0 0 10px 0',
            fontSize: '14px',
            borderBottom: '1px solid #333',
            paddingBottom: '5px',
            color: '#fff'
        });
        bondsTitle.textContent = _t('ui.tab_bonds');
        contentBlock.appendChild(bondsTitle);

        const bondsContainer = document.createElement('div');
        Object.assign(bondsContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%'
        });

        if (hero.bonds && hero.bonds.length > 0) {
            hero.bonds.forEach(bond => {
                // Проверяем, открыт ли у игрока бог-напарник по его прямому ключу в AppState.characters
                const isBondActive = AppState.characters && AppState.characters[bond.target_hero_id] !== undefined;

                const mechanicsStats = hero.stats || {};
                const statMeta = mechanicsStats[bond.bonus_stat_id];
                const statSign = statMeta?.icon || '🔺';

                const bondBox = document.createElement('div');
                Object.assign(bondBox.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                    background: isBondActive ? 'rgba(255, 209, 102, 0.05)' : 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${isBondActive ? 'rgba(255, 209, 102, 0.25)' : '#222'}`,
                    color: isBondActive ? '#fff' : '#555',
                    filter: isBondActive ? 'none' : 'grayscale(1)'
                });

                // Строка заголовка связи
                const rowHeader = document.createElement('div');
                Object.assign(rowHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' });

                const localeKey = AppState.game_settings?.language || 'en';
                console.log(bond.desc_loc);
                const bondDesc = bond.desc_loc?.[localeKey] || bond.desc_loc?.['en'] || 'Bond Link';
                const descSpan = document.createElement('span');
                descSpan.textContent = bondDesc;
                rowHeader.appendChild(descSpan);

                const statusBadge = document.createElement('span');
                Object.assign(statusBadge.style, {
                    fontSize: '9px',
                    color: isBondActive ? '#4ade80' : '#666',
                    background: isBondActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                });
                statusBadge.textContent = isBondActive ? 'ACTIVE' : 'LOCKED';
                rowHeader.appendChild(statusBadge);
                bondBox.appendChild(rowHeader);

                // Строка статов и прибавки
                const rowStats = document.createElement('div');
                Object.assign(rowStats.style, {
                    fontSize: '11px',
                    color: isBondActive ? '#ffd166' : '#444',
                    fontFamily: 'monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '2px'
                });
                rowStats.innerHTML = `<span>${statSign}</span> <span>${_t('stats.' + bond.bonus_stat_id)} +${bond.bonus_value}%</span>`;

                bondBox.appendChild(rowStats);
                bondsContainer.appendChild(bondBox);
            });
        } else {
            const noBonds = document.createElement('div');
            Object.assign(noBonds.style, { color: '#666', textAlign: 'center', padding: '20px', fontSize: '12px' });
            noBonds.textContent = 'У этого персонажа нет древних уз синергии...';
            bondsContainer.appendChild(noBonds);
        }

        contentBlock.appendChild(bondsContainer);
    }

    // ⭐ ТАБ 4: ЗВЕЗДНОЕ ВОЗВЫШЕНИЕ (STARS) — ЧАСТЬ 1: ПРОВЕРКА РЕЦЕПТОВ И РЕСУРСОВ
    else if (activeHeroTab === 'stars') {
        const starsTitle = document.createElement('h4');
        Object.assign(starsTitle.style, {
            margin: '0 0 10px 0',
            fontSize: '14px',
            borderBottom: '1px solid #333',
            paddingBottom: '5px',
            color: '#fff'
        });
        starsTitle.textContent = _t('ui.tab_stars');
        contentBlock.appendChild(starsTitle);

        // Рисуем текущие звезды бога
        const starsHtml = "⭐".repeat(hero.stars || 1);
        const starsDisplay = document.createElement('div');
        Object.assign(starsDisplay.style, {
            textAlign: 'center',
            padding: '10px',
            fontSize: '24px',
            textShadow: '0 0 8px #ffd166'
        });
        starsDisplay.textContent = starsHtml;
        contentBlock.appendChild(starsDisplay);

        const starsSubText = document.createElement('p');
        Object.assign(starsSubText.style, {
            color: '#ccc',
            fontSize: '12px',
            textAlign: 'center',
            margin: '0 0 15px 0'
        });
        starsSubText.textContent = 'Текущая стадия звездного возвышения бога.';
        contentBlock.appendChild(starsSubText);

        const playerInv = AppState.player?.inventory || {};
        const nextStarIdx = (hero.stars || 1) + 1;

        // Безопасный поиск рецепта эволюции в каталоге или глобальных правилах gacha
        const recipe = prototype.star_recipes?.[nextStarIdx] ||
        AppState.config?.gacha?.rules?.general_star_recipes?.[nextStarIdx] ||
        AppState.ConfigMechanics?.gacha?.rules?.general_star_recipes?.[nextStarIdx];

        const recipeWrapper = document.createElement('div');
        recipeWrapper.className = 'recipe-requirements-wrapper';

        if (recipe && !isCatalogLocked) {
            Object.assign(recipeWrapper.style, {
                marginTop: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11px',
                background: 'rgba(0,0,0,0.2)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #333'
            });

            const recipeHeader = document.createElement('b');
            Object.assign(recipeHeader.style, {
                color: '#aaa',
                textAlign: 'center',
                marginBottom: '4px',
                display: 'block'
            });
            recipeHeader.textContent = 'ТРЕБОВАНИЯ ДЛЯ ЭВОЛЮЦИИ:';
            recipeWrapper.appendChild(recipeHeader);

            // 1. Проверка золота и валюты
            if (recipe.resources) {
                Object.entries(recipe.resources).forEach(([resKey, amount]) => {
                    const currentAmount = parseInt(playerRes[resKey]) || 0;
                    const hasEnough = currentAmount >= amount;

                    const resRow = document.createElement('div');
                    Object.assign(resRow.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: hasEnough ? '#4ade80' : '#ef4444'
                    });
                    resRow.innerHTML = `<span>${resKey.toUpperCase()}: ${amount}</span><span>(Есть: ${currentAmount})</span>`;
                    recipeWrapper.appendChild(resRow);
                });
            }

            // 2. Проверка осколков (shards) в инвентаре игрока
            if (recipe.shards) {
                Object.entries(recipe.shards).forEach(([shardId, amount]) => {
                    const currentShards = playerInv[shardId] || 0;
                    const hasEnough = currentShards >= amount;

                    const shardRow = document.createElement('div');
                    Object.assign(shardRow.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: hasEnough ? '#4ade80' : '#ef4444'
                    });
                    shardRow.innerHTML = `<span>🧩 Осколки: ${amount}</span><span>(Есть: ${currentShards})</span>`;
                    recipeWrapper.appendChild(shardRow);
                });
            }

            contentBlock.appendChild(recipeWrapper);
        } else {
            const maxStarsText = document.createElement('p');
            Object.assign(maxStarsText.style, {
                color: '#aaa',
                fontSize: '11px',
                textAlign: 'center',
                marginTop: '10px'
            });
            maxStarsText.textContent = isCatalogLocked ? (_t('ui.hero_view_locked')) : 'Достигнут максимальный предел звездного величия!';
            contentBlock.appendChild(maxStarsText);
        }

        // --- СТАРТ ЧАСТИ 2 ТАБА ЗВЕЗД: ЛОГИКА И ОКНО КОРМА (FODDER) ---
        const triggerEvolutionBtn = document.createElement('button');
        triggerEvolutionBtn.className = 'btn-trigger-evolution';
        Object.assign(triggerEvolutionBtn.style, {
            marginTop: '12px',
            width: '100%',
            padding: '10px',
            background: '#ffd166',
            color: '#000',
            border: 'none',
            borderRadius: '3px',
            fontWeight: 'bold',
            fontSize: '12px',
            cursor: 'pointer'
        });

        if (recipe?.fodder_count && recipe.fodder_count > 0) {
            // Если рецепт требует корма, выводим инфо на кнопку
            triggerEvolutionBtn.textContent = `ВЫБРАТЬ КОРМ (Требуется: ${recipe.fodder_count} богов)`;

            triggerEvolutionBtn.onclick = (e) => {
                e.stopPropagation();

                // Собираем кандидатов на корм из AppState.characters (исключая самого себя)
                let candidateFodders = [];
                Object.entries(AppState.characters || {}).forEach(([cKey, cData]) => {
                    if (cKey === charKey) return; // Сам себя сожрать не может

                    const fProto = AppState.ConfigCharacter?.[cKey];
                    if (!fProto) return;

                    // Фильтры по требованиям рецепта (тот же герой или та же фракция)
                    if (recipe.fodder_requirements?.same_hero && cKey !== charKey) return;
                    if (recipe.fodder_requirements?.faction && fProto.faction_id !== prototype.faction_id) return;

                    candidateFodders.push({
                        ...cData,
                        id: cKey
                    });
                });

                if (candidateFodders.length < recipe.fodder_count) {
                    alert(`Недостаточно персонажей для корма! Нужно: ${recipe.fodder_count}, доступно: ${candidateFodders.length}`);
                    return;
                }

                // Массив для хранения выбранных пользователем ID-доноров
                let selectedFodderIds = [];

                // Модалка выбора корма прямо поверх экрана
                const fodderModal = document.createElement('div');
                Object.assign(fodderModal.style, {
                    position: 'absolute',
                    inset: '0',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(10,10,10,0.95)',
                    zIndex: '510',
                    padding: '20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderRadius: '6px'
                });

                fodderModal.innerHTML = `
                        <h3 style="margin:0; font-size:14px; color:#fff; border-bottom:1px solid #333; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                            <span>Выберите жертвенных богов (${recipe.fodder_count} шт.)</span>
                            <button id="close-fodder-modal" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px;">❌</button>
                        </h3>
                    `;

                const listDiv = document.createElement('div');
                Object.assign(listDiv.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' });

                candidateFodders.forEach(f => {
                    const p = AppState.ConfigCharacter?.[f.id];
                    const row = document.createElement('div');
                    row.className = 'fodder-select-row';
                    Object.assign(row.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#222',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #444',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#fff',
                        transition: '0.2s'
                    });

                    row.innerHTML = `
                            <span>${p?.icon || '👤'} ${_loc(p?.name_loc || f.id)} (Lvl ${f.level}, ⭐${f.stars})</span>
                            <input type="checkbox" class="fodder-check" style="pointer-events:none;" />
                        `;

                    row.onclick = (ev) => {
                        ev.stopPropagation();
                        const checkbox = row.querySelector('.fodder-check');

                        if (selectedFodderIds.includes(f.id)) {
                            selectedFodderIds = selectedFodderIds.filter(id => id !== f.id);
                            checkbox.checked = false;
                            row.style.borderColor = '#444';
                            row.style.background = '#222';
                        } else {
                            if (selectedFodderIds.length >= recipe.fodder_count) return;
                            selectedFodderIds.push(f.id);
                            checkbox.checked = true;
                            row.style.borderColor = '#ffd166';
                            row.style.background = 'rgba(255,209,102,0.03)';
                        }

                        // Обновляем состояние нижней кнопки
                        confirmBtn.innerText = `ПОДТВЕРДИТЬ ЖЕРТВОПРИНОШЕНИЕ (${selectedFodderIds.length}/${recipe.fodder_count})`;
                        confirmBtn.style.opacity = selectedFodderIds.length === recipe.fodder_count ? '1' : '0.5';
                    };

                    listDiv.appendChild(row);
                });
                fodderModal.appendChild(listDiv);

                // Кнопка подтверждения внутри модалки
                const confirmBtn = document.createElement('button');
                confirmBtn.id = 'confirm-evolution-btn';
                confirmBtn.innerText = `ПОДТВЕРДИТЬ ЖЕРТВОПРИНОШЕНИЕ (0/${recipe.fodder_count})`;
                Object.assign(confirmBtn.style, {
                    width: '100%',
                    padding: '10px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    opacity: '0.5',
                    marginTop: 'auto'
                });

                confirmBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    if (selectedFodderIds.length !== recipe.fodder_count) return;

                    fodderModal.remove();
                    // Шлем запрос на эволюцию звезд по сокетам
                    upgradeHeroStars(instanceId, selectedFodderIds).then(() => renderHeroViewScreen());
                };

                fodderModal.appendChild(confirmBtn);
                screenWrapper.appendChild(fodderModal);

                fodderModal.querySelector('#close-fodder-modal').onclick = (ev) => {
                    ev.stopPropagation();
                    fodderModal.remove();
                };
            };
        } else {
            // Если рецепт БЕЗ корма — кнопка сразу совершает апгрейд звезд
            triggerEvolutionBtn.textContent = 'СОВЕРШИТЬ ВОЗВЫШЕНИЕ';
            triggerEvolutionBtn.onclick = (e) => {
                e.stopPropagation();
                upgradeHeroStars(instanceId, []).then(() => renderHeroViewScreen());
            };
        }

        recipeWrapper.appendChild(triggerEvolutionBtn);
    } // Конец проверки таба stars (Часть 1)

    // 🔱 ТАБ 5: ЛИЧНЫЙ УНИКАЛЬНЫЙ АРТЕФАКТ (PERSONAL ITEM)
    else if (activeHeroTab === 'personal_item') {
        const artTitle = document.createElement('h4');
        Object.assign(artTitle.style, {
            margin: '0 0 10px 0',
            fontSize: '14px',
            borderBottom: '1px solid #333',
            paddingBottom: '5px',
            color: '#fff'
        });
        artTitle.textContent = 'Артефакт Бога';
        contentBlock.appendChild(artTitle);

        const itemLevel = hero.personal_item_level || 0;
        const pItemId = prototype.personal_item_id;

        // Достаем прототип артефакта из каталога
        const pItemProto = AppState.personal_items?.[pItemId] || AppState.ConfigPersonalItems?.[pItemId];

        if (pItemProto) {
            // Плашка артефакта
            const artRow = document.createElement('div');
            Object.assign(artRow.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.02)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #222',
                marginBottom: '10px'
            });

            const artIcon = document.createElement('div');
            Object.assign(artIcon.style, {
                fontSize: '24px',
                background: '#222',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyCenter: 'center',
                borderRadius: '6px',
                border: '1px solid #ffd166',
                justifyContent: 'center'
            });
            artIcon.textContent = pItemProto.icon || '🔱';
            artRow.appendChild(artIcon);

            const artMeta = document.createElement('div');
            artMeta.style.display = 'flex';
            artMeta.style.flexDirection = 'column';
            artMeta.innerHTML = `<b style="color:#fff; font-size:13px;">${_loc(pItemProto.name_loc)}</b><span style="color:#ffd166; font-size:10px; font-weight:bold; font-family:monospace;">Уровень пробуждения: +${itemLevel}</span>`;
            artRow.appendChild(artMeta);
            contentBlock.appendChild(artRow);

            // Блок текущих бонусов характеристик артефакта
            const bonusHeader = document.createElement('span');
            Object.assign(bonusHeader.style, {
                color: '#666',
                fontSize: '10px',
                fontWeight: 'bold',
                marginBottom: '2px',
                display: 'block'
            });
            bonusHeader.textContent = 'ТЕКУЩИЕ БОНУСЫ:';
            contentBlock.appendChild(bonusHeader);

            const artStatsContainer = document.createElement('div');
            Object.assign(artStatsContainer.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '11px',
                marginBottom: '10px'
            });

            const mechanicsStats = AppState.ConfigMechanics?.stats || AppState.config?.mechanics?.stats || {};
            Object.entries(pItemProto.stats_per_level || {}).forEach(([statId, valPerLvl]) => {
                const currentStatValue = valPerLvl * itemLevel;
                const meta = mechanicsStats[statId] || {};

                const statRow = document.createElement('div');
                Object.assign(statRow.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.01)',
                    padding: '3px 6px',
                    color: '#aaa'
                });
                statRow.innerHTML = `<span>${meta.icon || ''} ${_t('ui.'+meta.name_loc_key) || statId}</span><b style="color:#4ade80;">+${currentStatValue}</b>`;
                artStatsContainer.appendChild(statRow);
            });
            contentBlock.appendChild(artStatsContainer);

            // Логика кнопки прокачки или разблокировки артефакта
            if (!isCatalogLocked) {
                const nextLevel = itemLevel + 1;
                const unlockLevelRequirement = AppState.config?.mechanics?.personal_item_unlock_level || AppState.ConfigMechanics?.personal_item_unlock_level || 100;
                const levelCosts = AppState.config?.mechanics?.personal_item_costs?.[nextLevel] || AppState.ConfigMechanics?.personal_item_costs?.[nextLevel];

                if (itemLevel === 0 && hero.level < unlockLevelRequirement) {
                    const lockAlert = document.createElement('div');
                    Object.assign(lockAlert.style, {
                        textLine: 'center',
                        color: '#ef4444',
                        fontSize: '11px',
                        marginTop: '15px',
                        padding: '8px',
                        background: 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '4px',
                        textAlign: 'center'
                    });
                    lockAlert.textContent = `🔒 ТРЕБУЕТСЯ ${unlockLevelRequirement} УРОВЕНЬ БОГА ДЛЯ ПРОБУЖДЕНИЯ АРТЕФАКТА`;
                    contentBlock.appendChild(lockAlert);
                } else if (!levelCosts) {
                    const maxArtText = document.createElement('p');
                    Object.assign(maxArtText.style, {
                        color: '#4ade80',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginTop: '15px'
                    });
                    maxArtText.textContent = '✨ Достигнут максимальный уровень пробуждения артефакта!';
                    contentBlock.appendChild(maxArtText);
                } else {
                    const costBox = document.createElement('div');
                    Object.assign(costBox.style, {
                        marginTop: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #333'
                    });

                    const costHeader = document.createElement('b');
                    Object.assign(costHeader.style, {
                        color: '#aaa',
                        textAlign: 'center',
                        marginBottom: '4px',
                        display: 'block'
                    });
                    costHeader.textContent = 'СТОИМОСТЬ УЛУЧШЕНИЯ:';
                    costBox.appendChild(costHeader);

                    if (levelCosts.materials) {
                        Object.entries(levelCosts.materials).forEach(([matId, neededAmount]) => {
                            const currentMatCount = playerInv[matId] || 0;
                            const hasEnough = currentMatCount >= neededAmount;

                            const matRow = document.createElement('div');
                            Object.assign(matRow.style, {
                                display: 'flex',
                                justifyContent: 'space-between',
                                color: hasEnough ? '#4ade80' : '#ef4444'
                            });
                            matRow.innerHTML = `<span>💎 Ресурс [${matId}]: ${neededAmount} шт.</span><span>(Есть: ${currentMatCount})</span>`;
                            costBox.appendChild(matRow);
                        });
                    }

                    const upgradeArtBtn = document.createElement('button');
                    upgradeArtBtn.textContent = itemLevel === 0 ? 'ПРОБУДИТЬ АРТЕФАКТ' : 'ПОВЫСИТЬ УРОВЕНЬ';
                    Object.assign(upgradeArtBtn.style, {
                        marginTop: '8px',
                        width: '100%',
                        padding: '8px',
                        background: '#ffd166',
                        color: '#000',
                        border: 'none',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        cursor: 'pointer'
                    });
                    upgradeArtBtn.onclick = (e) => {
                        e.stopPropagation();
                        upgradePersonalItem(instanceId).then(() => renderHeroViewScreen());
                    };
                    costBox.appendChild(upgradeArtBtn);
                    contentBlock.appendChild(costBox);
                }
            }
        } else {
            const noArtifact = document.createElement('p');
            Object.assign(noArtifact.style, {
                color: '#666',
                fontSize: '12px',
                textAlign: 'center',
                padding: '10px'
            });
            noArtifact.textContent = 'У этого бога нет личного уникального артефакта.';
            contentBlock.appendChild(noArtifact);
        }
    }

    // 👕 ТАБ 6: ГАРДЕРОБ ОБЛИКОВ (SKINS)
    else if (activeHeroTab === 'skins') {
        const skinsTitle = document.createElement('h4');
        Object.assign(skinsTitle.style, {
            margin: '0 0 10px 0',
            fontSize: '14px',
            borderBottom: '1px solid #333',
            paddingBottom: '5px',
            color: '#fff'
        });
        skinsTitle.textContent = 'Гардероб Божества';
        contentBlock.appendChild(skinsTitle);

        const skinsList = prototype.skins || [];
        const activeSkinId = hero.active_skin || `${charKey}_skin_default`;

        const gallery = document.createElement('div');
        Object.assign(gallery.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: '100%',
            overflowY: 'auto',
            paddingRight: '4px'
        });

        if (skinsList.length === 0) {
            const noSkins = document.createElement('p');
            Object.assign(noSkins.style, {
                color: '#666',
                fontSize: '12px',
                textAlign: 'center'
            });
            noSkins.textContent = 'У этого бога нет альтернативных обликов.';
            gallery.appendChild(noSkins);
        } else {
            skinsList.forEach(skin => {
                const isEquipped = activeSkinId === skin.skin_id;

                const skinCard = document.createElement('div');
                Object.assign(skinCard.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#222',
                    borderRadius: '6px',
                    border: `1px solid ${isEquipped ? '#ffd166' : '#333'}`,
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                });

                // Превью картинки скина
                const skinImgSrc = window.gameAssets[skin.image] || skin.image || heroImageSrc;
                const preview = document.createElement('div');
                Object.assign(preview.style, {
                    width: '100%',
                    height: '80px',
                    background: `url('${skinImgSrc}') center top / cover no-repeat`,
                    position: 'relative'
                });

                if (isEquipped) {
                    const badge = document.createElement('span');
                    Object.assign(badge.style, {
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: '#ffd166',
                        color: '#000',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    });
                    badge.textContent = 'НАДЕТО';
                    preview.appendChild(badge);
                }
                skinCard.appendChild(preview);

                // Нижний блок управления скином
                const ctrlBar = document.createElement('div');
                Object.assign(ctrlBar.style, {
                    padding: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1a1a1a'
                });
                const skinName = document.createElement('span');
                Object.assign(skinName.style, {
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#fff'
                });
                skinName.textContent = _loc(skin.name_loc);
                ctrlBar.appendChild(skinName);
                if (!isCatalogLocked && !isEquipped) {
                    const applySkinBtn = document.createElement('button');
                    applySkinBtn.className = 'btn-equip-hero-skin';
                    applySkinBtn.textContent = 'ПРИМЕНИТЬ';
                    Object.assign(applySkinBtn.style, {
                        padding: '4px 8px',
                        background: '#ffd166',
                        color: '#000',
                        border: 'none',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        cursor: 'pointer'
                    });
                    applySkinBtn.onclick = (e) => {
                        e.stopPropagation();
                        changeHeroSkin(instanceId, skin.skin_id).then(() => renderHeroViewScreen());
                    };
                    ctrlBar.appendChild(applySkinBtn);
                }
                skinCard.appendChild(ctrlBar);
                gallery.appendChild(skinCard);
            });
        }
        contentBlock.appendChild(gallery);
    }

    // 🐾 ТАБ 7: СЛУГА / СПУТНИК БОЖЕСТВА (PETS)
    else if (activeHeroTab === 'pets') {
        const petTitle = document.createElement('h4');
        Object.assign(petTitle.style, { margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '5px', color: '#fff' });
        petTitle.textContent = 'Спутник Божества';
        contentBlock.appendChild(petTitle);

        let petActionHTML = document.createElement('div');
        Object.assign(petActionHTML.style, { marginTop: 'auto', display: 'flex', flexDirection: 'column' });

        if (isCatalogLocked) {
            const lockMsg = document.createElement('p');
            Object.assign(lockMsg.style, { color: '#aaa', fontSize: '11px', textAlign: 'center' });
            lockMsg.textContent = 'Заблокировано в режиме каталога.';
            petActionHTML.appendChild(lockMsg);
        } else if (!activePet) {
            // Кнопка привязки, если питомца у героя нет
            const noPetMsg = document.createElement('p');
            Object.assign(noPetMsg.style, { color: '#aaa', fontSize: '11px', marginBottom: '8px', textAlign: 'center' });
            noPetMsg.textContent = 'У этого бога сейчас нет спутника.';
            petActionHTML.appendChild(noPetMsg);

            const openPetSelectorBtn = document.createElement('button');
            openPetSelectorBtn.textContent = '💥 ПРИВЯЗАТЬ СПУТНИКА';
            Object.assign(openPetSelectorBtn.style, { width: '100%', padding: '8px', background: '#ffd166', color: '#000', border: 'none', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });

            // Открытие оверлея выбора питомцев из инвентаря игрока
            openPetSelectorBtn.onclick = (e) => {
                e.stopPropagation();
                const availablePets = Object.keys(playerInv).filter(id => AppState.pets?.[id] !== undefined);

                if (availablePets.length === 0) {
                    alert('В вашем инвентаре нет доступных существ для привязки!');
                    return;
                }

                const petModal = document.createElement('div');
                Object.assign(petModal.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', background: 'rgba(10,10,10,0.95)', zIndex: '510', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '6px' });

                const pHead = document.createElement('h3');
                Object.assign(pHead.style, { margin: '0', fontSize: '14px', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '6px', display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' });
                pHead.innerHTML = `<span>Выберите спутника для привязки</span>`;

                const cPetModal = document.createElement('button');
                cPetModal.textContent = '❌';
                Object.assign(cPetModal.style, { background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' });
                cPetModal.onclick = (ev) => { ev.stopPropagation(); petModal.remove(); };
                pHead.appendChild(cPetModal);
                petModal.appendChild(pHead);

                const petRows = document.createElement('div');
                Object.assign(petRows.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' });

                availablePets.forEach(pId => {
                    const meta = AppState.pets[pId];
                    const row = document.createElement('div');
                    Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #444', cursor: 'pointer', fontSize: '12px', color: '#fff' });
                    row.innerHTML = `<span>${meta.icon || '🐾'} ${pId.toUpperCase()} (Доступно карт: ${playerInv[pId]})</span><b style="color:#ffd166;">Привязать</b>`;
                    row.onclick = (ev) => {
                        ev.stopPropagation();
                        petModal.remove();
                        manageHeroPet(instanceId, pId, false).then(() => renderHeroViewScreen());
                    };
                    petRows.appendChild(row);
                });
                petModal.appendChild(petRows);
                screenWrapper.appendChild(petModal);
            };
            petActionHTML.appendChild(openPetSelectorBtn);
        } else {
            // Кнопка прокачки уровня, если питомец надет
            const nextPetLvl = activePet.level + 1;
            const levelCost = AppState.config?.mechanics?.pet_level_costs?.[nextPetLvl] || AppState.ConfigMechanics?.pet_level_costs?.[nextPetLvl];

            if (!levelCost) {
                const maxPet = document.createElement('p');
                Object.assign(maxPet.style, { color: '#4ade80', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', marginTop: '10px' });
                maxPet.textContent = '✨ Спутник достиг максимальной эволюции!';
                petActionHTML.appendChild(maxPet);
            } else {
                const hasFood = (playerInv["pet_food"] || 0) >= levelCost.food;

                const feedBox = document.createElement('div');
                Object.assign(feedBox.style, { background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', border: '1px solid #333', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' });
                feedBox.innerHTML = `<div style="display:flex; justify-content:space-between; color:${hasFood ? '#4ade80' : '#ef4444'}"><span>🍖 Корм (pet_food): ${levelCost.food} шт.</span><span>(В наличии: ${playerInv["pet_food"] || 0})</span></div>`;

                const feedBtn = document.createElement('button');
                feedBtn.textContent = '🍖 ПОКОРМИТЬ СПУТНИКА';
                Object.assign(feedBtn.style, { marginTop: '6px', width: '100%', padding: '6px', background: '#4ade80', color: '#000', border: 'none', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });
                feedBtn.onclick = (e) => {
                    e.stopPropagation();
                    manageHeroPet(instanceId, null, true).then(() => renderHeroViewScreen());
                };
                feedBox.appendChild(feedBtn);
                petActionHTML.appendChild(feedBox);
            }
        }

        // Рендер характеристик самого питомца, если он есть
        if (petProto) {
            const petInfoBox = document.createElement('div');
            Object.assign(petInfoBox.style, { background: 'rgba(255,255,255,0.02)', border: '1px solid #333', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' });

            const petMain = document.createElement('div');
            Object.assign(petMain.style, { display: 'flex', alignItems: 'center', gap: '8px' });
            petMain.innerHTML = `<span style="font-size:28px;">${petProto.icon || '🐾'}</span><div style="display:flex; flex-direction:column;"><b style="color:#fff; font-size:13px;">${activePet.pet_id.toUpperCase()}</b><span style="color:#ffd166; font-size:10px; font-family:monospace;">Текущий уровень: ${activePet.level}</span></div>`;
            petInfoBox.appendChild(petMain);

            const petBonusList = document.createElement('div');
            Object.assign(petBonusList.style, { borderTop: '1px solid #222', paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', color: '#aaa' });
            petBonusList.innerHTML = '<span style="font-weight:bold; color:#666;">БОНУС СЛУГИ:</span>';

            const mechanicsStats = AppState.ConfigMechanics?.stats || AppState.config?.mechanics?.stats || {};
            Object.entries(petProto.base_stats || {}).forEach(([sId, baseVal]) => {
                const growth = petProto.stats_growth?.[sId] || 0;
                const totalBonus = baseVal + (growth * activePet.level);
                const m = mechanicsStats[sId] || {};

                const bRow = document.createElement('div');
                Object.assign(bRow.style, { display: 'flex', justifyContent: 'space-between' });
                bRow.innerHTML = `<span>${m.icon || ''} ${_t('ui.'+m.name_loc_key) || sId}</span><b style="color:#4ade80;">+${totalBonus}</b>`;
                petBonusList.appendChild(bRow);
            });
            petInfoBox.appendChild(petBonusList);
            contentBlock.appendChild(petInfoBox);
        } else {
            const noPetPlate = document.createElement('p');
            Object.assign(noPetPlate.style, { color: '#666', fontSize: '12px', textAlign: 'center', padding: '15px' });
            noPetPlate.textContent = 'У этого бога пока нет верного зверя-спутника.';
            contentBlock.appendChild(noPetPlate);
        }

        contentBlock.appendChild(petActionHTML);
    }

    // 📖 ТАБ 8: БИОГРАФИЯ (BIO)
    else if (activeHeroTab === 'bio') {
        const bioTitle = document.createElement('h4');
        Object.assign(bioTitle.style, { margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '5px', color: '#fff' });
        bioTitle.textContent = _t('ui.tab_bio');
        contentBlock.appendChild(bioTitle);

        const bioText = document.createElement('p');
        Object.assign(bioText.style, { color: '#ccc', lineHeight: '1.5', fontSize: '12px', margin: '0' });
        bioText.textContent = _loc(prototype.desc_loc) || _t('ui.hero_view_biography');
        contentBlock.appendChild(bioText);
    }

    blocksMap['content'] = contentBlock;

    // =========================================================================
    // 🧱 УПОРЯДОЧИВАНИЕ И ОТРЕНДЕР БЛОКОВ ПО КОНФИГУ ВЕРСТКИ (view_layout)
    // =========================================================================
    viewLayout.forEach(blockKey => {
        const generatedBlock = blocksMap[blockKey];
        if (generatedBlock) {
            innerContainer.appendChild(generatedBlock);
        }
    });
    screenWrapper.appendChild(innerContainer);

    // Привязываем собранное DOM-дерево к корню движка
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






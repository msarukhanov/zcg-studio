// ==== scripts/ui/ObjectManagementScreen.js
import { AppState } from '../shared/GameState.js';

export function renderObjectScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // 🚀 СТРОГИЙ ЧИСТЫЙ ФИКС: Берем объект напрямую из стейта выделения, как у тебя в CharacterScreen!
    const mapObject = AppState.play?.selectedObject;
    if (!mapObject) return;

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'object_screen';

    const playerFactionId = AppState.player?.faction;

    // 1. ТВОЙ СТРОГИЙ СТИЛЬНЫЙ ОВЕРЛЕЙ
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-object_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // 2. ЦЕНТРАЛЬНАЯ ДОСКА ( maxWidth: 1050px, height: 85vh )
    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden', padding: '30px'
    });

    // 3. ТВОЙ ФИКСИРОВАННЫЙ КРЕСТИК ЗАКРЫТИЯ (Обновляет твой ScreenManager)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '10px', right: '10px', width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => {
        screenManager.clearCurrentScreen();
        screenManager.currentScreenId = null;
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    };
    windowBoard.appendChild(closeBtn);

    // =========================================================================
    // 👑 ВЕРХНЯЯ БАЗА ОБЪЕКТА (Имя, Тип, Провинция, Хозяин)
    // =========================================================================
    const factionObj = AppState.factions?.[mapObject.faction || ''];
    const fColor = factionObj?.color ? `#${factionObj.color.toString(16).padStart(6, '0')}` : '#6a737d';

    const headerBlock = document.createElement('div');
    Object.assign(headerBlock.style, {
        display: 'flex', alignItems: 'center', gap: '20px', width: '100%',
        paddingBottom: '15px', borderBottom: '1px solid #232d38', marginBottom: '15px'
    });

    const iconHtml = mapObject.icon
        ? `<img src="${mapObject.icon}" style="width:100%; height:100%; object-fit:contain;" />`
        : `<span style="font-size:28px;">🏰</span>`;

    headerBlock.innerHTML = `
        <div style="width: 55px; height: 55px; border-radius: 8px; border: 2px solid ${fColor}; background:#161d2a; display:flex; align-items:center; justify-content:center; padding:5px; box-sizing:border-box;">
            ${iconHtml}
        </div>
        <div style="display:flex; flex-direction:column;">
            <h1 style="color:#fff; margin:0; font-size:20px; letter-spacing:1px; font-weight:bold;">${mapObject.name.toUpperCase()}</h1>
            <span style="color:#8a92a6; font-size:11px; margin-top:2px;">
                <b>${_t('objects.type_' + mapObject.type)}</b> | 
                ${_t('objects.province')}: <b style="color:#ffd166;">${mapObject.province || '—'}</b> | 
                ${_t('objects.owner')}: <span style="color:${fColor}; font-weight:bold;">${factionObj?.name || 'Нейтрал'}</span>
            </span>
        </div>
    `;
    windowBoard.appendChild(headerBlock);

    // =========================================================================
    // 🔄 ДИНАМИЧЕСКИЙ ТАБ-БАР
    // =========================================================================
    const tabsContainer = document.createElement('div');
    Object.assign(tabsContainer.style, { display: 'flex', gap: '8px', marginBottom: '20px', width: '100%' });
    windowBoard.appendChild(tabsContainer);

    const tabContentArea = document.createElement('div');
    Object.assign(tabContentArea.style, { flex: '1', width: '100%', overflowY: 'auto', display: 'flex', gap: '20px' });
    windowBoard.appendChild(tabContentArea);

    const tabsConfig = [{ id: 'info'}];

    if (mapObject.upgradeLevels) tabsConfig.push({ id: 'upgrades', ru: '🛠️ Улучшения', en: '🛠️ Upgrades' });
    if (mapObject.allowedProduction?.length) tabsConfig.push({ id: 'recruitment', ru: '⚔️ Найм Войск', en: '⚔️ Recruitment' });
    if (mapObject.units) tabsConfig.push({ id: 'garrison', ru: '🛡️ Гарнизон', en: '🛡️ Garrison' });

    let activeTabId = 'info';

    const renderTabsHeaders = () => {
        tabsContainer.innerHTML = '';
        tabsConfig.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.textContent = _t('objects.tab_' + tab.id)

            const isActive = tab.id === activeTabId;
            Object.assign(tabBtn.style, {
                padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: isActive ? '#3498db' : '#1b2432',
                border: isActive ? '1px solid #5faee3' : '1px solid #2d394b',
                borderRadius: '4px', color: '#fff', transition: 'background-color 0.15s'
            });

            tabBtn.onclick = () => {
                activeTabId = tab.id;
                renderTabsHeaders();
                switchTabContent();
            };
            tabsContainer.appendChild(tabBtn);
        });
    };

    const switchTabContent = () => {
        tabContentArea.innerHTML = '';

        if (activeTabId === 'info') {
            const infoCol = document.createElement('div');
            Object.assign(infoCol.style, { width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' });

            const createStatRow = (label, val) => `
                <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
                    <span style="color:#8a92a6;">${label}</span>
                    <span style="color:#fff; font-weight:bold;">${val}</span>
                </div>`;

            let incomeText = _t('objects.no_production');
            if (mapObject.production) {
                incomeText = Object.entries(mapObject.production)
                    .map(([res, amt]) => {
                        const icon = res === 'gold' ? '🪙' : res === 'ore' ? '⛏️' : res === 'wood' ? '🪵' : res;
                        return `${amt} ${icon}`;
                    }).join(' | ');
            }

            infoCol.innerHTML = `
                <h3 style="color:#ffd166; margin:0 0 10px 0; font-size:13px; font-weight:bold;">📋 ${_t('objects.object_stats')}</h3>
                ${mapObject.stats?.hp ? createStatRow(_t('stats.hp'), `${mapObject.stats.hp} / ${mapObject.stats.maxHp}`) : ''}
                ${mapObject.vision?.current ? createStatRow(_t('stats.vision'), `${mapObject.vision.current}`) : ''}
                ${createStatRow(_t('objects.resource_production'), incomeText)}
            `;
            tabContentArea.appendChild(infoCol);
        }
        else if (activeTabId === 'upgrades') {
            const upgradeCol = document.createElement('div');
            Object.assign(upgradeCol.style, { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' });

            upgradeCol.innerHTML = `<h3 style="color:#2ea44f; margin:0 0 10px 0; font-size:13px; font-weight:bold;">${_t('objects.object_upgrade')}</h3>`;

            // 🚀 СТРОГИЙ ФИКС: Если в паспорте объекта уровня вообще нет — инициализируем его как 1!
            if (mapObject.level === undefined) {
                mapObject.level = 1;
            }

            const currentLvl = mapObject.level;
            const nextLevel = currentLvl + 1;

            // Ищем конфиг следующего уровня в твоей матрице upgradeLevels (например, mapObject.upgradeLevels[2])
            const upgradeConfig = mapObject.upgradeLevels?.[nextLevel];
            const isOwner = mapObject.faction === playerFactionId;

            if (!upgradeConfig) {
                upgradeCol.innerHTML += `<div style="color:#8a92a6; font-size:13px; font-style:italic; margin-top:20px; text-align:center;">${_t('objects.max_level_reached')}</div>`;
            }
            else {
                const buildRow = document.createElement('div');
                Object.assign(buildRow.style, {
                    width: '100%', padding: '14px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                    borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box'
                });

                // Вытаскиваем кастомное имя из твоего чертежа (например, "Lorencia city"), если его нет — пишем дефолт
                const upgradeName = _loc(upgradeConfig.name) || `${_t('objects.upgrade_to')}  ${nextLevel}`;

                // Форматируем список ресурсов для кнопки строго по твоему ключу upgradeCost
                let costText = '';
                if (upgradeConfig.upgradeCost) {
                    costText = Object.entries(upgradeConfig.upgradeCost)
                        .map(([res, amt]) => {
                            const icon = res === 'gold' ? '💰' : res === 'ore' ? '⛏️' : res === 'wood' ? '🪵' : res;
                            return `${icon} ${amt}`;
                        }).join(' | ');
                }

                buildRow.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="color:#fff; font-weight:bold; font-size:13px;">${upgradeName}</span>
                        <span style="color:#8a92a6; font-size:11px;">${_t('objects.current_rank')} : <b style="color:#2ea44f;">${currentLvl}</b> ➡️ <b style="color:#3498db;">${nextLevel}</b></span>
                    </div>
                `;

                // Проверяем баланс фракции по твоему паспорту для активности кнопки
                const factionRes = AppState.factions?.[playerFactionId]?.resources || {};
                let canAfford = true;
                if (upgradeConfig.upgradeCost) {
                    for (const [resType, amount] of Object.entries(upgradeConfig.upgradeCost)) {
                        if ((factionRes[resType] || 0) < amount) canAfford = false;
                    }
                }

                const upBtn = document.createElement('button');
                upBtn.textContent = isOwner ? costText : _t('objects.enemy_structure');
                Object.assign(upBtn.style, {
                    padding: '8px 16px', backgroundColor: isOwner && canAfford ? '#2ea44f' : '#3a4759',
                    border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold',
                    cursor: isOwner && canAfford ? 'pointer' : 'not-allowed', opacity: isOwner && canAfford ? '1' : '0.6'
                });

                if (isOwner && canAfford) {
                    upBtn.onclick = () => {
                        // 1. Вызываем твой полностью заполненный бэкенд метод апгрейда
                        const success = AppState.engine.ObjectManager.upgradeStructure(mapObject.id);

                        if (success) {
                            // 2. Пересчитываем макро-производство всей империи в AppState.factions.production
                            if (AppState.engine?.factionManager?.updateFactionProduction) {
                                AppState.engine.factionManager.updateFactionProduction(playerFactionId);
                            }

                            // 3. 🚀 СТРОГИЙ UI ФИКС: Принудительно дергаем перерисовку этой вкладки в HTML!
                            // Код заново прочитает новый mapObject.level (который стал равен 2),
                            // не найдет в upgradeLevels ветку для 3-го уровня и чисто скроет кнопку,
                            // выведя надпись "Достигнут максимальный уровень".
                            renderObjectScreen(screenManager);
                        }
                    };
                }

                buildRow.appendChild(upBtn);
                upgradeCol.appendChild(buildRow);
            }
            tabContentArea.appendChild(upgradeCol);
        }
        // =========================================================================
        // ⚔️ ВКЛАДКА НАЙМА НА ТВОЕМ МЕТОДЕ PRODUCEUNITS
        // =========================================================================
        else if (activeTabId === 'recruitment') {
            const recruitGrid = document.createElement('div');
            Object.assign(recruitGrid.style, {
                width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px', overflowY: 'auto', alignContent: 'start'
            });

            const allowedUnits = mapObject.allowedProduction || [];
            const isOwner = mapObject.faction === playerFactionId;

            if (allowedUnits.length === 0 || !isOwner) {
                recruitGrid.innerHTML = `<div style="color:#586069; font-size:13px; font-style:italic; grid-column: 1/-1; text-align:center; margin-top:40px;">Recruitment locked</div>`;
            } else {
                allowedUnits.forEach(unitTypeId => {
                    const card = document.createElement('div');
                    Object.assign(card.style, {
                        padding: '12px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                        borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box'
                    });

                    // Читаем базовую цену из твоего AppState.characters шаблона персонажа
                    const unitTemplate = AppState.characters?.[unitTypeId];
                    const unitCost = unitTemplate?.stats?.cost || 250;

                    const playerGold = AppState.factions?.[playerFactionId]?.resources?.gold || 0;
                    const canBuy = playerGold >= unitCost;

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#fff; font-weight:bold; font-size:13px;">${unitTypeId.toUpperCase()}</span>
                            <span style="color:#ffd166; font-size:11px; font-weight:bold;">🪙 ${unitCost}</span>
                        </div>
                    `;

                    const buyBtn = document.createElement('button');
                    buyBtn.textContent = _t('objects.recruit');
                    Object.assign(buyBtn.style, {
                        width: '100%', padding: '8px', backgroundColor: canBuy ? '#3498db' : '#3a4759',
                        border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: 'bold',
                        cursor: canBuy ? 'pointer' : 'not-allowed', opacity: canBuy ? '1' : '0.6', marginTop: 'auto'
                    });

                    if (canBuy) {
                        buyBtn.onclick = () => {
                            // 🚀 ТОЧЕЧНЫЙ ВЫЗОВ: Вызываем твой метод найма! Спишет золото и добавит в гарнизон
                            const instanceId = mapObject.id;
                            const success = AppState.engine.ObjectManager.produceUnits(instanceId, unitTypeId, 1);

                            if (success) {
                                if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                                switchTabContent(); // Локально обновляем сетку
                            }
                        };
                    }
                    card.appendChild(buyBtn);
                    recruitGrid.appendChild(card);
                });
            }
            tabContentArea.appendChild(recruitGrid);
        }
        // ---------------------------------------------------------------------
        // ВКЛАДКА 3: ГАРНИЗОН (Если есть .units)
        // ---------------------------------------------------------------------
        // =========================================================================
        // 🛡️ ОБНОВЛЕННАЯ ВКЛАДКА: ДВУХСТОРОННИЙ ОБМЕН МЕЖДУ ГЕРОЕМ И ГАРНИЗОНОМ
        // =========================================================================
        else if (activeTabId === 'garrison') {
            const transferContainer = document.createElement('div');
            Object.assign(transferContainer.style, {
                width: '100%', display: 'flex', gap: '20px', height: '100%', boxSizing: 'border-box'
            });

            // Находим активного героя игрока, который стоит на этом объекте/гексе
            const activeCharId = AppState.play?.activeCharacterId;
            const heroUnit = activeCharId ? AppState.characters?.[activeCharId] : null;

            // ---------------------------------------------------------------------
            // ЛЕВАЯ КОЛОНКА: АРМИЯ ГЕРОЯ (AppState.characters[hero].units)
            // ---------------------------------------------------------------------
            const leftHeroCol = document.createElement('div');
            Object.assign(leftHeroCol.style, {
                width: '45%', backgroundColor: '#141a27', border: '1px solid #232d38',
                borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box'
            });

            const heroTitle = document.createElement('h4');
            heroTitle.textContent = heroUnit ? `${_loc(heroUnit.name)} (${_t('objects.garrison_hero_army')})` : `${_t('objects.garrison_no_hero')}`;
            heroTitle.style.cssText = 'color:#3498db; margin:0 0 5px 0; font-size:12px; font-weight:bold;';
            leftHeroCol.appendChild(heroTitle);

            const heroScroll = document.createElement('div');
            Object.assign(heroScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' });
            leftHeroCol.appendChild(heroScroll);

            // Редерим войска героя (если структура плоская {"elf_archer": X}, если другая — поправь под свой стейт героя)
            const heroUnits = heroUnit?.units || {};

            Object.entries(heroUnits).forEach(([unitTypeId, count]) => {
                if (count <= 0) return;

                const row = document.createElement('div');
                Object.assign(row.style, {
                    padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                    borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                });

                row.innerHTML = `
                    <div style="display:flex; flexDirection:column;">
                        <span style="color:#fff; font-weight:bold; font-size:12px;">${unitTypeId.toUpperCase()}</span>
                        <span style="color:#8a92a6; font-size:10px;">${_t('objects.garrison_heroes')} : ${count}</span>
                    </div>
                `;

                // Кнопка ДОБИТЬ / ПЕРЕДАТЬ В ГАРНИЗОН (➡️)
                const toGarrisonBtn = document.createElement('button');
                toGarrisonBtn.innerHTML = '➡️';
                Object.assign(toGarrisonBtn.style, {
                    padding: '4px 8px', backgroundColor: '#2ea44f', border: 'none', borderRadius: '4px',
                    color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
                });

                toGarrisonBtn.onclick = () => {
                    // Списываем 1 юнита у героя
                    heroUnit.units[unitTypeId]--;

                    // Накатываем 1 юнита в плоскую матрицу гарнизона объекта
                    if (!mapObject.units) mapObject.units = {};
                    mapObject.units[unitTypeId] = (mapObject.units[unitTypeId] || 0) + 1;

                    if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                    switchTabContent(); // Реактивно перерисовываем обе колонки обмена!
                };

                row.appendChild(toGarrisonBtn);
                heroScroll.appendChild(row);
            });


            // ---------------------------------------------------------------------
            // ПРАВАЯ КОЛОНКА: ГАРНИЗОН ОБЪЕКТА (mapObject.units)
            // ---------------------------------------------------------------------
            const rightGarrisonCol = document.createElement('div');
            Object.assign(rightGarrisonCol.style, {
                width: '45%', backgroundColor: '#141a27', border: '1px solid #232d38',
                borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box'
            });

            const garrisonTitle = document.createElement('h4');
            garrisonTitle.textContent = `${_t('objects.garrison_units')}`;
            garrisonTitle.style.cssText = 'color:#ffd166; margin:0 0 5px 0; font-size:12px; font-weight:bold;';
            rightGarrisonCol.appendChild(garrisonTitle);

            const garrisonScroll = document.createElement('div');
            Object.assign(garrisonScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' });
            rightGarrisonCol.appendChild(garrisonScroll);

            const currentGarrison = mapObject.units || {};

            Object.entries(currentGarrison).forEach(([unitTypeId, count]) => {
                if (count <= 0) return;

                const row = document.createElement('div');
                Object.assign(row.style, {
                    padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
                    borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                });

                // Кнопка ЗАБРАТЬ ИЗ ГАРНИЗОНА В АРМИЮ ГЕРОЯ (⬅️)
                const toHeroBtn = document.createElement('button');
                toHeroBtn.innerHTML = '⬅️';
                Object.assign(toHeroBtn.style, {
                    padding: '4px 8px', backgroundColor: '#e67e22', border: 'none', borderRadius: '4px',
                    color: '#fff', cursor: heroUnit ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '12px',
                    opacity: heroUnit ? '1' : '0.4'
                });

                // Запрещаем забирать войска, если рядом нет живого героя
                if (heroUnit) {
                    toHeroBtn.onclick = () => {
                        // Списываем 1 юнита из гарнизона объекта
                        mapObject.units[unitTypeId]--;

                        // Добавляем 1 юнита в армию героя
                        if (!heroUnit.units) heroUnit.units = {};
                        heroUnit.units[unitTypeId] = (heroUnit.units[unitTypeId] || 0) + 1;

                        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                        switchTabContent(); // Реактивно перерисовываем обе колонки!
                    };
                } else {
                    toHeroBtn.disabled = true;
                }

                row.appendChild(toHeroBtn);

                const textInfo = document.createElement('div');
                textInfo.style.cssText = 'display:flex; flex-direction:column; align-items:flex-end; text-align:right;';
                textInfo.innerHTML = `
                    <span style="color:#fff; font-weight:bold; font-size:12px;">${unitTypeId.toUpperCase()}</span>
                    <span style="color:#2ea44f; font-size:11px; font-weight:bold;">x${count}</span>
                `;
                row.appendChild(textInfo);

                garrisonScroll.appendChild(row);
            });

            // Собираем панели вместе в один контейнер обмена
            transferContainer.appendChild(leftHeroCol);
            transferContainer.appendChild(rightGarrisonCol);
            tabContentArea.appendChild(transferContainer);
        }

    };

    renderTabsHeaders();
    switchTabContent();

    screenWrapper.appendChild(windowBoard);
    screenManager.rootContainer.appendChild(screenWrapper);
}

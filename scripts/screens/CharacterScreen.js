// ==== CharacterScreen.js
import { AppState } from '../shared/GameState.js';
import { CharacterManager } from '../game/CharacterManager.js';

export function renderCharacterScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'character_screen';

    const activeLeaderId = AppState.play?.activeCharacterId || 'rafael';
    const mainLeaderChar = AppState.characters?.[activeLeaderId];

    // Находим сопартийцев для верхней панели портретов
    const partyList = [activeLeaderId];
    if (mainLeaderChar && mainLeaderChar.units) {
        Object.keys(mainLeaderChar.units).forEach(uId => {
            const isUniqueChar = AppState.characters?.[uId] && (!AppState.characters[uId].stats?.cost);
            if (isUniqueChar) partyList.push(uId);
        });
    }

    const selectedCharId = screenManager._selectedCharId || activeLeaderId;
    const char = AppState.characters?.[selectedCharId] || AppState.entities?.[selectedCharId] || mainLeaderChar;
    const isLeaderSelected = selectedCharId === activeLeaderId;

    // Режим обмена (хранится в сессии экрана)
    const isTransferMode = !!screenManager._isTransferMode;

    // Корневой слой оверлея
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-character_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85%', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden'
    });

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '10px', right: '10px',
        width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)',
        border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%',
        color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => { screenManager._isTransferMode = false; screenManager.clearCurrentScreen(); };
    windowBoard.appendChild(closeBtn);

    // =========================================================================
    // 🔁 ЖЕЛЕЗОБЕТОННЫЙ РЕЖИМ ОБМЕНА: Две панели рюкзаков лицом к лицу
    // ========================================================================

    // =========================================================================
    // ЛЕВАЯ КОЛОНКА: Статы + Панель Управления Компаньоном
    // =========================================================================
    const leftCol = document.createElement('div');
    Object.assign(leftCol.style, {
        width: '30%', borderRight: '1px solid #232d38', padding: '5px',
        display: 'flex', flexDirection: 'column', gap: '6px', boxSizing: 'border-box'
    });

    // Рендер горизонтальной панели портретов сопартийцев
    const partyContainer = document.createElement('div');
    partyContainer.style.display = 'flex';
    partyContainer.style.gap = '8px';
    partyList.forEach(pId => {
        const pChar = AppState.characters?.[pId];
        if (!pChar) return;
        const avatarWrapper = document.createElement('div');
        const isCurrent = pId === selectedCharId;
        Object.assign(avatarWrapper.style, {
            width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${isCurrent ? '#ffd166' : '#3a4759'}`,
            backgroundColor: '#1a2436', cursor: 'pointer', overflow: 'hidden', flexShrink: '0', position: 'relative'
        });
        const img = document.createElement('img');
        const rawIcon = pChar.icon || pChar.avatar;
        img.src = window.gameAssets[rawIcon] || rawIcon;
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
        avatarWrapper.appendChild(img);

        avatarWrapper.onclick = () => {
            screenManager._selectedCharId = pId;
            screenManager.renderScreen('character_screen');
        };
        partyContainer.appendChild(avatarWrapper);
    });
    leftCol.appendChild(partyContainer);

    // =========================================================================
    // 📊 ИСПРАВЛЕННЫЙ ВЫВОД ИМЕНИ, КЛАССА И СТАТОВ (С защитой от сундуков)
    // =========================================================================
    const nameHeader = document.createElement('h2');
    nameHeader.textContent = char.name;
    nameHeader.style.margin = '0';
    nameHeader.style.color = '#fff';
    leftCol.appendChild(nameHeader);

    // Выводим заголовок класса и уровня ТОЛЬКО если это живой герой с классом
    if (char.classId && AppState.classes?.[char.classId]) {
        const classHeader = document.createElement('h3');
        classHeader.textContent = `${_loc(AppState.classes[char.classId].name_loc)} : ${char.level || 1}`;
        classHeader.style.margin = '0';
        classHeader.style.color = '#ffd166';
        leftCol.appendChild(classHeader);
    }

    // Твой расширенный список характеристик
    const displayStats = [
        { key: 'exp', label: _t('stats.exp') },
        { key: 'hp', label: _t('stats.hp') },
        { key: 'energy', label: _t('stats.energy') },
        { key: 'atk', label: _t('stats.atk') },
        { key: 'def', label: _t('stats.def') },
        { key: 'speed', label: _t('stats.speed') },
        { key: 'crit', label: _t('stats.crit') }
    ];

    displayStats.forEach(item => {
        // Безопасное чтение базового значения стата (Защита от сундуков/трупов без .stats)
        let val = char.stats ? (char.stats[item.key] || 0) : 0;

        // Если у объекта вообще нет статов (сундук) и это не строка опыта — пропускаем вывод этой строки
        if (!char.stats && item.key !== 'exp') return;

        if (item.key === 'hp' && char.stats) {
            val = `${char.stats.hp}/${char.stats.maxHp}`;
        }
        if (item.key === 'energy' && char.stats) {
            val = `${char.stats.energy}/${char.stats.maxEnergy}`;
        }

        // Опыт лежит в корне персонажа, а не в .stats!
        if (item.key === 'exp') {
            val = `${char.exp || 0}/${char.requiredExp || 100}`;
        }

        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '4px'
        });

        // 🌟 ИНТЕГРАЦИЯ ТВОЕЙ ЖЁЛТОЙ ПОЛОСКИ ОПЫТА ПРЯМО В СТРОКУ СТАТОВ ГЕРОЯ!
        if (item.key === 'exp' && char.classId) {
            const expPercent = Math.min(100, Math.max(0, ((char.exp || 0) / (char.requiredExp || 100)) * 100));
            row.innerHTML = `
                <span style="color:#a0a5b5; font-size:12px; min-width: 50px;">${item.label}</span>
                <div style="position: relative; width: 120px; height: 12px; background: rgba(255,255,255,0.08); border: 1px solid #1a252f; border-radius: 4px; overflow: hidden; margin-left: auto;">
                    <div style="width: ${expPercent}%; height: 100%; background: linear-gradient(to right, #f1c40f, #f39c12); border-radius: 3px; transition: width 0.2s ease;"></div>
                    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; font-family: monospace; color: #fff; text-shadow: 1px 1px 1px #000;">
                        ${val}
                    </div>
                </div>
            `;
        } else {
            // Обычный текстовый вывод для остальных характеристик
            row.innerHTML = `<span style="color:#a0a5b5; font-size:12px;">${item.label}</span><span style="color:#fff; font-weight:bold; font-size:13px; margin-left:auto; margin-right:10px;">${val}</span>`;
        }

        leftCol.appendChild(row);
    });


    // 🤝 ВЗАИМОДЕЙСТВИЕ С СОПАРТИЙЦЕМ (Появляется только если выбран НЕ лидер)
    if (!isLeaderSelected) {
        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.gap = '8px';
        actionRow.style.marginTop = '10px';

        // Кнопка диалога
        const talkBtn = document.createElement('button');
        talkBtn.textContent = _t('interactions.talk');
        Object.assign(talkBtn.style, { flex: '1', padding: '8px', backgroundColor: '#3498db', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' });
        talkBtn.onclick = () => {
            screenManager.clearCurrentScreen();
            if (AppState.engine?.dialogManager) AppState.engine.dialogManager.trigger(selectedCharId);
        };

        // Кнопка включения режима обмена вещами
        const tradeBtn = document.createElement('button');
        tradeBtn.textContent = isTransferMode ? _t('interactions.stop') : _t('interactions.trade');
        Object.assign(tradeBtn.style, { flex: '1', padding: '8px', backgroundColor: isTransferMode ? '#e74c3c' : '#e67e22', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' });
        tradeBtn.onclick = () => {
            screenManager._isTransferMode = !isTransferMode;
            screenManager._charOpen = true;
            screenManager.renderScreen('character_transfer');
        };

        actionRow.appendChild(talkBtn);
        actionRow.appendChild(tradeBtn);
        leftCol.appendChild(actionRow);
    }

    // =========================================================================
    // ЦЕНТРАЛЬНАЯ КОЛОНКА: Аватар и слоты экипировки (inventory)
    // =========================================================================
    const centerCol = document.createElement('div');
    Object.assign(centerCol.style, { width: '40%', borderRight: '1px solid #232d38', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxSizing: 'border-box' });
    const fullBodyImg = document.createElement('img');
    const rawFullImg = char.image || char.icon;
    fullBodyImg.src = window.gameAssets[rawFullImg] || rawFullImg;
    fullBodyImg.style.height = 'calc(100% + 40px)'; fullBodyImg.style.objectFit = 'contain';
    centerCol.appendChild(fullBodyImg);

    const allowedSlots = [
        { name: 'weapon', defaultIcon: '⚔️', x: '20px', y: '25%' },
        { name: 'armor', defaultIcon: '🛡️', x: '20px', y: '50%' },
        { name: 'boots', defaultIcon: '🥾', x: 'auto', right: '20px', y: '65%' },
        { name: 'ring', defaultIcon: '💍', x: 'auto', right: '20px', y: '35%' }
    ];
    allowedSlots.forEach(slotInfo => {
        const equippedItemId = (char.inventory || []).find(id => AppState.items?.[id]?.slot === slotInfo.name);
        const itemData = AppState.items?.[equippedItemId];
        const slotBox = document.createElement('div');
        Object.assign(slotBox.style, { position: 'absolute', left: slotInfo.x, top: slotInfo.y, width: '52px', height: '50px', backgroundColor: itemData ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.01)', border: `1px ${itemData ? 'solid #ffd166' : 'dashed #3a4759'}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', cursor: itemData ? 'pointer' : 'default' });
        if (itemData) {
            slotBox.innerHTML = `<span>${itemData.icon}</span>`;
            slotBox.onclick = () => CharacterManager.unequipItem(selectedCharId, equippedItemId);
        } else {
            slotBox.innerHTML = `<span style="opacity:0.15;">${slotInfo.defaultIcon}</span>`;
        }
        centerCol.appendChild(slotBox);
    });

    // =========================================================================
    // ПРАВАЯ КОЛОНКА: Рюкзак вещей + Секция Нанимаемой Армии (Units)
    // =========================================================================
    const rightCol = document.createElement('div');
    Object.assign(rightCol.style, { width: '30%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', boxSizing: 'border-box' });

    const tabHeader = document.createElement('div');
    tabHeader.style.display = 'flex';
    tabHeader.style.gap = '10px';
    const tabInvBtn = document.createElement('button');
    tabInvBtn.textContent = _t('units.backpack');
    const tabSkillBtn = document.createElement('button');
    tabSkillBtn.textContent = _t('units.skills');
    const activeTab = screenManager._charActiveTab || 'inventory';
    const styleTab = (btn, isActive) => {
        Object.assign(btn.style, { flex: '1', padding: '8px', border: 'none', borderRadius: '4px', backgroundColor: isActive ? '#ffd166' : 'rgba(255,255,255,0.05)', color: isActive ? '#000' : '#8a92a6', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }); };

    styleTab(tabInvBtn, activeTab === 'inventory');
    styleTab(tabSkillBtn, activeTab === 'skills');

    tabInvBtn.onclick = () => { screenManager._charActiveTab = 'inventory'; renderCharacterScreen(screenManager, AppState); };
    tabSkillBtn.onclick = () => { screenManager._charActiveTab = 'skills'; renderCharacterScreen(screenManager, AppState); };
    tabHeader.appendChild(tabInvBtn); tabHeader.appendChild(tabSkillBtn);
    rightCol.appendChild(tabHeader);

    const contentBox = document.createElement('div');
    Object.assign(contentBox.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' });



    if (activeTab === 'inventory') {
        // --- 📦 РЕНДЕР ПРЕДМЕТОВ РЮКЗАКА И ОПЕРАЦИИ ОБМЕНА ---
        const backpack = char.backpack || {};
        const backpackItemIds = Object.keys(backpack);


        // =========================================================================
        if (backpackItemIds.length === 0) {
            contentBox.innerHTML = `<div style="color:#6a737d; text-align:center; margin-top:30px; font-size:12px;">${_t('units.empty_backpack')}</div>`;
        } else {
            backpackItemIds.forEach(itemId => {
                const count = backpack[itemId];
                const itemConfig = AppState.items?.[itemId];
                if (!itemConfig) return;

                const itemRow = document.createElement('div');
                Object.assign(itemRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid #232d38' });

                itemRow.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
                                        <span style="font-size:18px;">${itemConfig.icon}</span>
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#fff; font-size:12px; font-weight:bold;">${_loc(itemConfig.title_loc || itemId)}</span>
                                            <span style="color:#8a92a6; font-size:10px;">Qty: ${count}</span>
                                        </div>
                                     </div>`;

                // РЕЖИМ А: Включен режим обмена «🔁 Обмен» — выводим кнопку трансфера вещей
                if (itemConfig.category === 'equipment') {
                    const equipBtn = document.createElement('button');
                    equipBtn.textContent = _t('units.equip');
                    Object.assign(equipBtn.style, { padding: '4px 8px', backgroundColor: '#2ea44f', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' });
                    equipBtn.onclick = () => CharacterManager.equipItem(selectedCharId, itemId);
                    itemRow.appendChild(equipBtn);
                }

                contentBox.appendChild(itemRow);
            });
        }

        // =========================================================================
        // 🎖️ СЕКЦИЯ МАССОВЫХ ЮНИТОВ АРМИИ (Выводится ТОЛЬКО во вкладке главного Лидера)
        // =========================================================================
        if (isLeaderSelected && char.units) {
            const armyTitle = document.createElement('div');
            armyTitle.textContent = _t('units.units');
            armyTitle.style.cssText = 'font-size:10px; color:#ffd166; font-weight:bold; margin-top:15px; border-top:1px solid #232d38; padding-top:10px;';
            contentBox.appendChild(armyTitle);

            let hasUnits = false;
            Object.keys(char.units).forEach(uId => {
                // Ищем шаблон юнита в персонажах. Если у него есть стоимость (cost), значит это нанимаемый боец!
                const unitTemplate = AppState.characters?.[uId];
                if (!unitTemplate || !unitTemplate.stats?.cost) return; // Уникальных героев (Эрин) здесь пропускаем

                hasUnits = true;
                const uCount = char.units[uId];

                const unitRow = document.createElement('div');
                Object.assign(unitRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(167,29,93,0.03)', padding: '10px', borderRadius: '4px', border: '1px solid #a71d5d' });

                unitRow.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
                                        <span style="font-size:18px;">${unitTemplate.icon || '🎖️'}</span>
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#fff; font-size:12px; font-weight:bold;">${unitTemplate.name}</span>
                                            <span style="color:#8a92a6; font-size:10px;">${_t('units.count')} : ${uCount}</span>
                                        </div>
                                     </div>`;

                const dismissBtn = document.createElement('button');
                dismissBtn.textContent = _t('units.dismiss');
                Object.assign(dismissBtn.style, { padding: '4px 8px', backgroundColor: '#a71d5d', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' });

                dismissBtn.onclick = () => {
                    if (confirm(`${_t('units.dismiss_confirm')} ${_loc(unitTemplate.name)}?`)) {
                        CharacterManager.leaveGroup(uId, selectedCharId);
                    }
                };

                unitRow.appendChild(dismissBtn);
                contentBox.appendChild(unitRow);
            });

            if (!hasUnits) {
                const noUnits = document.createElement('div');
                noUnits.textContent = _t('units.no_units');
                noUnits.style.cssText = 'color:#6a737d; text-align:center; font-size:11px; margin-top:5px;';
                contentBox.appendChild(noUnits);
            }
        }
    } else {
        // --- 🔮 РЕНДЕР ВКЛАДКИ КНИГИ НАВЫКОВ ---
        const skillsList = char.skills || [];
        if (skillsList.length === 0) {
            contentBox.innerHTML = `<div style="color:#6a737d; text-align:center; margin-top:50px; font-size:13px;">${_t('units.no_skills')}</div>`;
        } else {
            skillsList.forEach(sInfo => {
                const config = AppState.skills?.[sInfo.skill_id];
                if (!config) return;

                const skillRow = document.createElement('div');
                Object.assign(skillRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid #232d38', boxSizing: 'border-box' });

                const titleText = _loc(config.title_loc || sInfo.skill_id);
                const isPassive = config.type === 'passive';
                const cd = char.skillCooldowns?.[sInfo.skill_id] || 0;

                skillRow.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
                                        <span style="font-size:20px;">${config.icon || '🔮'}</span>
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#fff; font-size:12px; font-weight:bold;">${titleText}</span>
                                            <span style="color:#8a92a6; font-size:10px;">${isPassive ? (_t('units.passive')) : `${sInfo.level} ${_t('units.lvl')}`}</span>
                                        </div>
                                      </div>`;

                if (!isPassive) {
                    const castBtn = document.createElement('button');
                    castBtn.textContent = cd > 0 ? `${Math.ceil(cd/1000)}s` : (_t('units.cast'));
                    Object.assign(castBtn.style, { padding: '5px 10px', backgroundColor: cd > 0 ? '#3a4759' : '#3498db', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: cd > 0 ? 'default' : 'pointer', opacity: cd > 0 ? '0.6' : '1.0' });
                    if (cd === 0) {
                        castBtn.onclick = () => CharacterManager.castSkillFromBook(sInfo.skill_id, char);
                    } else {
                        castBtn.disabled = true;
                    }
                    skillRow.appendChild(castBtn);
                }
                contentBox.appendChild(skillRow);
            });
        }
    }
    rightCol.appendChild(contentBox);
    windowBoard.appendChild(leftCol);
    windowBoard.appendChild(centerCol);
    windowBoard.appendChild(rightCol);
    screenWrapper.appendChild(windowBoard);
    screenManager.rootContainer.appendChild(screenWrapper);
}


export function renderCharacterTransferScreen(screenManager) {
    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'character_transfer';

    const activeLeaderId = AppState.play?.activeCharacterId || 'rafael';
    const mainLeaderChar = AppState.characters?.[activeLeaderId];

    // Находим сопартийцев для верхней панели портретов
    const partyList = [activeLeaderId];
    if (mainLeaderChar && mainLeaderChar.units) {
        Object.keys(mainLeaderChar.units).forEach(uId => {
            const isUniqueChar = AppState.characters?.[uId] && (!AppState.characters[uId].stats?.cost);
            if (isUniqueChar) partyList.push(uId);
        });
    }

    const selectedCharId = screenManager._selectedCharId || activeLeaderId;
    const char = AppState.characters?.[selectedCharId] || AppState.entities?.[selectedCharId] || mainLeaderChar;
    const isLeaderSelected = selectedCharId === activeLeaderId;

    // Корневой слой оверлея
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-character_transfer';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden'
    });

    windowBoard.innerHTML = ''; // Сносим кашу, строим чистый склад

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '10px', right: '10px',
        width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)',
        border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%',
        color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => {
        console.log(screenManager._charOpen);
        if(screenManager._charOpen) {
            renderCharacterScreen(screenManager);
        }
        else {
            console.log("clear");
            screenManager.clearCurrentScreen();
        }

        AppState.engine.ScreenManager.currentScreenId = null;
        AppState.engine.ScreenManager._selectedCharId = null;
        AppState.engine.uiManager.updateAll();
        screenManager._isTransferMode = false;
        screenManager._charOpen = false;
    };
    windowBoard.appendChild(closeBtn);

    // --- ЛЕВАЯ ПАНЕЛЬ: Рюкзак Рафаэля (Лидера) ---
    const leaderBox = document.createElement('div');
    Object.assign(leaderBox.style, { width: '45%', padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', borderRight: '1px solid #232d38' });

    const leaderTitle = document.createElement('h3');
    leaderTitle.textContent = `${mainLeaderChar.name}`;
    leaderTitle.style.color = '#ffd166';
    leaderTitle.style.margin = '0 0 10px 0';
    leaderBox.appendChild(leaderTitle);

    const leaderScroll = document.createElement('div');
    Object.assign(leaderScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' });

    // Рендерим шмотки Рафаэля
    const rBackpack = mainLeaderChar.backpack || {};
    Object.keys(rBackpack).forEach(itemId => {
        const itemConfig = AppState.items?.[itemId];
        if (!itemConfig) return;

        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid #232d38' });
        row.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">${itemConfig.icon}</span><span style="color:#fff; font-size:12px;">${_loc(itemConfig.title_loc || itemId)} (x${rBackpack[itemId]})</span></div>`;

        const giveBtn = document.createElement('button');
        giveBtn.textContent = '➡️'; // Передать Эрин
        Object.assign(giveBtn.style, { padding: '4px 8px', backgroundColor: '#e67e22', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' });
        giveBtn.onclick = () => { CharacterManager.transferItem(activeLeaderId, selectedCharId, itemId, 1); };

        row.appendChild(giveBtn);
        leaderScroll.appendChild(row);
    });
    leaderBox.appendChild(leaderScroll);

    // --- ПРАВАЯ ПАНЕЛЬ: Рюкзак Эрин (Выбранного спутника) ---
    const companionBox = document.createElement('div');
    Object.assign(companionBox.style, { width: '45%', padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' });

    const companionTitle = document.createElement('h3');
    companionTitle.textContent = `${char.name}`;
    companionTitle.style.color = '#00ffcc';
    companionTitle.style.margin = '0 0 10px 0';
    companionBox.appendChild(companionTitle);

    const companionScroll = document.createElement('div');
    Object.assign(companionScroll.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' });

    // Рендерим шмотки Эрин
    const cBackpack = char.backpack || {};
    Object.keys(cBackpack).forEach(itemId => {
        const itemConfig = AppState.items?.[itemId];
        if (!itemConfig) return;

        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid #232d38' });
        row.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">${itemConfig.icon}</span><span style="color:#fff; font-size:12px;">${_loc(itemConfig.title_loc || itemId)} (x${cBackpack[itemId]})</span></div>`;

        const takeBtn = document.createElement('button');
        takeBtn.textContent = '⬅️'; // Забрать Рафаэлю
        Object.assign(takeBtn.style, { padding: '4px 8px', backgroundColor: '#3498db', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' });
        takeBtn.onclick = () => { CharacterManager.transferItem(selectedCharId, activeLeaderId, itemId, 1); };

        row.appendChild(takeBtn);
        companionScroll.appendChild(row);
    });
    companionBox.appendChild(companionScroll);

    windowBoard.appendChild(leaderBox);
    windowBoard.appendChild(companionBox);
    screenWrapper.appendChild(windowBoard);
    screenManager.rootContainer.appendChild(screenWrapper);
    return; // МГНОВЕННЫЙ ВЫХОД: Стандартный трехпанельный UI ниже
}


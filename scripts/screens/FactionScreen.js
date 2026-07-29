// ==== scripts/ui/FactionScreen.js
import { AppState } from '../shared/GameState.js';

export function renderFactionScreen() {
    const screenManager = AppState.engine.ScreenManager;
    const fManager = AppState.engine.factionManager;
    if (!screenManager) return;

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'faction_screen';
    screenManager._factionOpen = true;

    const playerFactionId = AppState.player?.faction || 'darkwood';
    const faction = AppState.factions?.[playerFactionId];
    const activeLeaderId = faction.leaderCharId || 'rafael';



    console.log(playerFactionId, faction, activeLeaderId);

    if (!faction) return;

    // 1. ТВОЙ СТРОГИЙ ОВЕРЛЕЙ
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-faction_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // 2. ТВОЯ БОЛЬШАЯ ЦЕНТРАЛЬНАЯ ДОСКА
    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden', padding: '30px'
    });

    // 3. ТВОЙ КРЕСТИК ЗАКРЫТИЯ
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
        if (AppState.engine.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        screenManager._isTransferMode = false;
        screenManager._factionOpen = false;
    };
    windowBoard.appendChild(closeBtn);

    // =========================================================================
    // 👑 ВЕРХНЯЯ БАЗА ФРАКЦИИ (Лидер, Название, Герб)
    // =========================================================================
    const fColor = faction.color ? `#${faction.color.toString(16).padStart(6, '0')}` : '#fff';
    const leaderChar = AppState.characters?.[faction.leaderCharId];

    const headerBlock = document.createElement('div');
    Object.assign(headerBlock.style, {
        display: 'flex', alignItems: 'center', gap: '20px', width: '100%',
        paddingBottom: '20px', borderBottom: '1px solid #232d38', marginBottom: '20px'
    });

    const avatarHtml = leaderChar?.icon
        ? `<img src="${leaderChar.icon}" style="width:100%; height:100%; object-fit:cover;" />`
        : `<span style="font-size:24px;">👤</span>`;

    headerBlock.innerHTML = `
        <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${fColor}; overflow:hidden; background:#232d38; display:flex; align-items:center; justify-content:center;">
            ${avatarHtml}
        </div>
        <div style="display:flex; flex-direction:column;">
            <h1 style="color:${fColor}; margin:0; font-size:20px; letter-spacing:1.5px; font-weight:bold;">${_loc(faction.name)}</h1>
            <span style="color:#ffd166; font-size:11px; font-weight:bold; margin-top:2px;">${_t('factions.ruler')}: ${leaderChar ? leaderChar.name : '—'}</span>
        </div>
    `;
    windowBoard.appendChild(headerBlock);

    // =========================================================================
    // 🧱 ТРИ РАВНЫЕ КОЛОНКИ СВОДОК
    // =========================================================================
    const columnsContainer = document.createElement('div');
    Object.assign(columnsContainer.style, { display: 'flex', gap: '20px', width: '100%', flex: '1', overflow: 'hidden' });

    const createRow = (label, val) => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
            <span style="color:#8a92a6;">${label}</span>
            <span style="color:#fff; font-weight:bold;">${val}</span>
        </div>`;

    // Считаем гексы и население
    let controlledTiles = 0;
    let totalPop = 0;
    if (AppState.map?.tiles) {
        Object.values(AppState.map.tiles).forEach(t => {
            if (t && (t.owner === playerFactionId || t.controlledByFaction === playerFactionId)) {
                controlledTiles++;
                if (t.additional?.population) totalPop += parseInt(t.additional.population, 10);
            }
        });
    }

    // 📜 КОЛОНКА 1: ПОЛИТИКА (33% ширины)
    const col1 = document.createElement('div');
    Object.assign(col1.style, { width: '33.33%', display: 'flex', flexDirection: 'column' });
    let statusText = _t('factions.sovereign');
    if (AppState.pacts?.[playerFactionId]) {
        Object.entries(AppState.pacts[playerFactionId]).forEach(([tId, role]) => {
            if (role === 'VASSAL') statusText = `<span style="color:#e74c3c;"> ${_t('factions.vassal')} ${AppState.factions[tId]?.name || tId}</span>`;
        });
    }
    col1.innerHTML = `
        <h3 style="color:#ffd166; margin:0 0 12px 0; font-size:13px; letter-spacing:1px; font-weight:bold;">📜 ${_t('factions.politics')}</h3>
        ${createRow(_t('factions.status'), statusText)}
        ${createRow(_t('factions.territories'), `${controlledTiles}`)}
        ${createRow(_t('factions.capital'), AppState.objects?.[faction.capitalObjectId]?.name || '—')}
    `;
    columnsContainer.appendChild(col1);

    // =========================================================================
    // 🌾 КОЛОНКА 2: ПОЛНОЦЕННАЯ ЭКОНОМИКА, ЖИВЫЕ ДОХОДЫ И ОТЧЁТ ПО ПРОВИНЦИЯМ
    // =========================================================================
    const col2 = document.createElement('div');
    Object.assign(col2.style, {
        width: '33.33%', display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #232d38', borderRight: '1px solid #232d38',
        padding: '0 20px', boxSizing: 'border-box', overflowY: 'auto'
    });



    // Вычисляем живой, суммарный доход фракции с учетом всех шахт, портов и городов!
    const liveProduction = fManager.updateFactionProduction(playerFactionId);

    // Заголовок блока экономики
    col2.innerHTML = `<h3 style="color:#2ea44f; margin:0 0 12px 0; font-size:13px; letter-spacing:1px; font-weight:bold;">🌾 ${_t('factions.finance_header')}</h3>`;

    // Выводим демографию и общие запасы
    col2.innerHTML += createRow(_t('factions.population'), totalPop);

    // Форматируем вывод запасов ресурсов вместе с их ЖИВЫМ пассивным секундным/ходовым приростом!
    const formatResRow = (label, currentAmount, income) => {
        const incomeHtml = income > 0
            ? `<span style="color:#2ea44f; font-size:10px; margin-left:4px;">(+${income})</span>`
            : '';
        return `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
                    <span style="color:#8a92a6;">${label}</span>
                    <span style="color:#fff; font-weight:bold;">${currentAmount} ${incomeHtml}</span>
                </div>`;
    };

    col2.innerHTML += formatResRow(_t('resources.gold'), faction.resources?.gold || 0, liveProduction.gold);
    col2.innerHTML += formatResRow(_t('resources.wood'), faction.resources?.wood || 0, liveProduction.wood);
    col2.innerHTML += formatResRow(_t('resources.ore'), faction.resources?.ore || 0, liveProduction.ore);
    col2.innerHTML += formatResRow(_t('resources.food'), faction.resources?.food || 0, liveProduction.food);

    // --- 🌟 НОВЫЙ БЛОК: РАЗВЁРНУТЫЙ СПИСОК ЗАХВАЧЕННЫХ ПРОВИНЦИЙ И ИХ ДОХОДОВ ---
    const provincesTitle = document.createElement('h4');
    provincesTitle.textContent = _t('factions.provinces');
    provincesTitle.style.cssText = 'color:#6a737d; margin:20px 0 10px 0; font-size:11px; font-weight:bold; letter-spacing:0.5px;';
    col2.appendChild(provincesTitle);

    // Запрашиваем у менеджера фракций отчёт по каждой провинции игрока по отдельности
    const controlledProvinces = fManager.getControlledProvincesReport(playerFactionId);

    if (controlledProvinces.length === 0) {
        const noProv = document.createElement('div');
        noProv.textContent = _t('factions.no_provinces');
        noProv.style.cssText = 'color:#586069; font-size:12px; font-style:italic; padding:5px 0;';
        col2.appendChild(noProv);
    } else {
        controlledProvinces.forEach(prov => {
            const provCard = document.createElement('div');
            Object.assign(provCard.style, {
                width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.01)',
                border: '1px solid #232d38', borderRadius: '4px', marginBottom: '6px', boxSizing: 'border-box'
            });

            // Формируем красивую компактную строчку доходов провинции, выводя только те ресурсы, которые она реально производит
            const incomeParts = [];
            if (prov.production.gold > 0) incomeParts.push(`🪙 +${prov.production.gold}`);
            if (prov.production.wood > 0) incomeParts.push(`🪵 +${prov.production.wood}`);
            if (prov.production.ore > 0)  incomeParts.push(`⛏️ +${prov.production.ore}`);
            if (prov.production.food > 0) incomeParts.push(`🌾 +${prov.production.food}`);

            const incomeSummary = incomeParts.length > 0 ? incomeParts.join(' | ') : 'No income';

            provCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#fff; font-weight:bold; font-size:12px;">${prov.name}</span>
                    <span style="color:#8a92a6; font-size:10px; font-family:monospace; background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">ID: ${prov.id}</span>
                </div>
                <div style="color:#2ea44f; font-size:11px; font-weight:bold; font-family:monospace; margin-top:5px;">
                    ${incomeSummary}
                </div>
            `;
            col2.appendChild(provCard);
        });
    }

    columnsContainer.appendChild(col2);

    // 🤝 КОЛОНКА 3: СПИСОК ДИПЛОМАТИИ (33% ширины)
    const col3 = document.createElement('div');
    Object.assign(col3.style, { width: '33.33%', display: 'flex', flexDirection: 'column', overflowY: 'auto' });
    col3.innerHTML = `<h3 style="color:#3498db; margin:0 0 12px 0; font-size:13px; letter-spacing:1px; font-weight:bold;">${_t('factions.diplomacy_header')}</h3>`;

    Object.keys(AppState.factions).forEach(targetId => {
        if (targetId === playerFactionId) return;

        const targetFaction = AppState.factions[targetId];
        const pact = fManager.getPact(playerFactionId, targetId);
        const rowColor = targetFaction.color ? `#${targetFaction.color.toString(16).padStart(6, '0')}` : '#fff';

        const row = document.createElement('div');
        Object.assign(row.style, {
            width: '100%', padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
            borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', marginBottom: '5px', boxSizing: 'border-box'
        });
        row.innerHTML = `
            <span style="color:#fff; font-weight:bold; font-size:12px;">${targetFaction.name}</span>
            <span style="font-size:10px; font-weight:bold; color:${rowColor};">${pact}</span>
        `;

        // 🚀 ЧЁТКИЙ ПЕРЕХОД ПО ТВОЕЙ ИНСТРУКЦИИ: Клик по фракции открывает ОТДЕЛЬНЫЙ скрин дипломатии с передачей ID соседа!
        row.onclick = () => {
            renderDiplomacyScreen(targetId);
        };
        col3.appendChild(row);
    });
    columnsContainer.appendChild(col3);

    windowBoard.appendChild(columnsContainer);
    screenWrapper.appendChild(windowBoard);
    screenManager.rootContainer.appendChild(screenWrapper);
}



export function renderDiplomacyScreen(targetFactionId) {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager) return;

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'diplomacy_screen';

    const activeLeaderId = AppState.play?.activeCharacterId || 'rafael';
    const playerFactionId = AppState.characters?.[activeLeaderId]?.faction || 'darkwood';
    const fManager = AppState.engine.factionManager;

    const targetFaction = AppState.factions?.[targetFactionId];
    const targetLeader = AppState.characters?.[targetFaction?.leaderCharId];

    if (!targetFaction || !targetLeader) {
        renderFactionScreen(); // Возврат к базе, если данных нет
        return;
    }

    // 1. ТВОЙ СТРОГИЙ ОВЕРЛЕЙ
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-diplomacy_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // 2. ЦЕНТРАЛЬНАЯ ДОСКА ДИПЛОМАТИИ (95% ширины, 3 Колонки через flex)
    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85vh', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', boxSizing: 'border-box'
    });

    // 3. ТВОЙ КРЕСТИК ЗАКРЫТИЯ (Возвращает обратно на экран фракции к сводкам)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '10px', right: '10px', width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => {
        renderFactionScreen(); // Возврат к первому экрану сводок!
    };
    windowBoard.appendChild(closeBtn);

    // Метод сборки красивых, ровных карточек лидеров
    const createLeaderCard = (charObj, factionObj) => {
        const card = document.createElement('div');
        Object.assign(card.style, {
            width: '25%', height: '100%', padding: '40px 20px', boxSizing: 'border-box',
            backgroundColor: '#151d2a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '5px'
        });

        const fColor = factionObj.color ? `#${factionObj.color.toString(16).padStart(6, '0')}` : '#fff';
        const avatarHtml = charObj.icon
            ? `<img src="${charObj.icon}" style="width:100%; height:100%; object-fit:cover;" />`
            : `<span style="font-size:32px;">👤</span>`;

        card.innerHTML = `
            <div style="font-size: 13px; font-weight: bold; color: ${fColor}; letter-spacing: 1.5px; text-transform:uppercase;">${factionObj.name}</div>
            <div style="width: 120px; height: 120px; border-radius: 50%; border: 2px solid ${fColor}; background-color: #232d38; display:flex; align-items:flex-start; justify-content:center; overflow:hidden; box-shadow: 0 6px 15px rgba(0,0,0,0.4);">
                ${avatarHtml}
            </div>
            <h3 style="color:#fff; margin:15px 0 0 0; font-size:15px; font-weight:bold; text-align:center;">${charObj.name}</h3>
        `;
        return card;
    };

    // 👤 КОЛОНКА 1: НАШ ЛИДЕР (Левая сторона — 25% ширины)
    const ourLeader = AppState.characters?.[AppState.factions[playerFactionId]?.leaderCharId || activeLeaderId];
    const ourFaction = AppState.factions?.[playerFactionId];
    windowBoard.appendChild(createLeaderCard(ourLeader, ourFaction));

    // 🤝 КОЛОНКА 2: ЦЕНТР С КНОПКАМИ ДЛЯ ДИПЛОМАТИИ (Середина — 50% ширины)
    const centerPanel = document.createElement('div');
    Object.assign(centerPanel.style, {
        width: '50%', height: '100%', padding: '30px 20px', boxSizing: 'border-box',
        borderLeft: '1px solid #232d38', borderRight: '1px solid #232d38',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
    });

    const pact = fManager.getPact(playerFactionId, targetFactionId);
    const opinion = fManager.getOpinion(playerFactionId, targetFactionId);

    centerPanel.innerHTML = `
      
        <div style="text-align:center; font-size:13px; color:#a0a5b5;">
            ${_t('factions.current_pact')} <b style="color:#fff;">[${pact}]</b><br/>
            ${_t('factions.opinion')} <b style="color:#ffd166;">${opinion} / 100</b>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; width:100%; margin-top:auto; padding-top:10px; border-top:1px solid #232d38;">
        </div>
    `;

    const buttonsContainer = centerPanel.querySelector('div:last-child');

    // =========================================================================
    // 🪙 КНОПКА: ЗАКЛЮЧИТЬ / РАЗОРВАТЬ ТОРГОВЛЮ (Доступна ТОЛЬКО если нет войны)
    // =========================================================================
    if (pact !== 'WAR') {
        // Проверяем текущее состояние через наш новый метод в FactionManager
        const isTrading = fManager.getTrade(playerFactionId, targetFactionId);

        const tradeBtn = document.createElement('button');

        // Динамический текст в зависимости от флага в матрице AppState.trade
        if (isTrading) {
            tradeBtn.textContent = _t('factions.break_trade');
            Object.assign(tradeBtn.style, { backgroundColor: '#d35400', color: '#fff' }); // Оранжевый цвет разрыва
        } else {
            tradeBtn.textContent = _t('factions.establish_trade');
            Object.assign(tradeBtn.style, { backgroundColor: '#3498db', color: '#fff' }); // Синий цвет сделки
        }

        Object.assign(tradeBtn.style, {
            width: '100%', padding: '12px', border: 'none', borderRadius: '4px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', fontFamily: 'sans-serif'
        });

        // Клик инвертирует булево значение в матрице торговли и мгновенно обновляет экран
        tradeBtn.onclick = () => {
            fManager.changeTrade(playerFactionId, targetFactionId, !isTrading);
            renderDiplomacyScreen(targetFactionId); // Перерисовываем
        };

        buttonsContainer.appendChild(tradeBtn);


        const allianceBtn = document.createElement('button');

        if (pact === 'ALLIANCE') {
            allianceBtn.textContent = _t('factions.break_alliance');
            Object.assign(allianceBtn.style, { backgroundColor: '#7f8c8d', color: '#fff' }); // Серый цвет расторжения

            allianceBtn.onclick = () => {
                fManager.changePact(playerFactionId, targetFactionId, 'PEACE'); // Сбрасываем до обычного мира
                renderDiplomacyScreen(targetFactionId);
            };
        } else {
            allianceBtn.textContent = _t('factions.form_alliance');
            Object.assign(allianceBtn.style, { backgroundColor: '#9b59b6', color: '#fff' }); // Фиолетовый союзный цвет

            allianceBtn.onclick = () => {
                fManager.changePact(playerFactionId, targetFactionId, 'ALLIANCE');
                renderDiplomacyScreen(targetFactionId);
            };
        }

        Object.assign(allianceBtn.style, {
            width: '100%', padding: '12px', border: 'none', borderRadius: '4px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', fontFamily: 'sans-serif', marginBottom: '4px'
        });
        buttonsContainer.appendChild(allianceBtn);


        const hasAccess = fManager.getMilitaryAccess(playerFactionId, targetFactionId);
        const accessBtn = document.createElement('button');

        Object.assign(accessBtn.style, {
            width: '100%', padding: '12px', border: 'none', borderRadius: '4px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', fontFamily: 'sans-serif', marginBottom: '4px'
        });

        // 🌟 СТРОГИЙ АВТО-ФИКС ДЛЯ UI: Если это альянс, блокируем кнопку!
        if (pact === 'ALLIANCE') {
            accessBtn.textContent = _t('factions.access_granted');
            accessBtn.style.backgroundColor = '#16a085';
            accessBtn.style.opacity = '0.5'; // Визуально приглушаем кнопку
            accessBtn.style.pointerEvents = 'none'; // Отключаем клики по ней
        }
        // Стандартное поведение для обычного мирного времени
        else {
            accessBtn.style.opacity = '1';
            accessBtn.style.pointerEvents = 'auto';

            if (hasAccess) {
                accessBtn.textContent = _t('factions.revoke_access');
                accessBtn.style.backgroundColor = '#c0392b';
                accessBtn.style.color = '#fff';
            } else {
                accessBtn.textContent = _t('factions.request_access');
                accessBtn.style.backgroundColor = '#16a085';
                accessBtn.style.color = '#fff';
            }

            accessBtn.onclick = () => {
                fManager.changeMilitaryAccess(playerFactionId, targetFactionId, !hasAccess);
                renderDiplomacyScreen(targetFactionId);
            };
        }
        buttonsContainer.appendChild(accessBtn);
    }

    // =========================================================================
    // 🤝 КНОПКА: ЗАКЛЮЧИТЬ МИР (Появляется ТОЛЬКО если сейчас идёт война)
    // =========================================================================
    if (pact === 'WAR') {
        const peaceBtn = document.createElement('button');
        peaceBtn.textContent = _t('factions.propose_peace');
        Object.assign(peaceBtn.style, {
            width: '100%',
            padding: '12px',
            backgroundColor: '#2ea44f', // Красивый зелёный цвет мира
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'sans-serif'
        });

        // Клик меняет пакт обратно на 'PEACE' (или 'NEUTRAL') и мгновенно обновляет экран
        peaceBtn.onclick = () => {
            fManager.changePact(playerFactionId, targetFactionId, 'PEACE');
            renderDiplomacyScreen(targetFactionId);
        };
        buttonsContainer.appendChild(peaceBtn);
    }


    // Кнопка: Потребовать Вассалитет
    if (pact !== 'VASSAL' && pact !== 'SUZERAIN') {
        const vassalBtn = document.createElement('button');
        vassalBtn.textContent = _t('factions.demand_vassalage');
        Object.assign(vassalBtn.style, { width: '100%', padding: '12px', backgroundColor: '#ffd166', color: '#111622', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' });
        vassalBtn.onclick = () => { fManager.changePact(playerFactionId, targetFactionId, 'VASSAL_OWNER'); renderDiplomacyScreen(targetFactionId); };
        buttonsContainer.appendChild(vassalBtn);
    }

    // Кнопка возврата к сводкам фракции
    const backBtn = document.createElement('button');
    backBtn.textContent = _t('factions.diplomacy_back');
    Object.assign(backBtn.style, { width: '100%', padding: '10px', backgroundColor: '#2c3e50', color: '#fff', border: '1px solid #3a4759', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginTop: '10px' });
    backBtn.onclick = () => { renderFactionScreen(); };
    buttonsContainer.appendChild(backBtn);

    windowBoard.appendChild(centerPanel);

    // 👤 КОЛОНКА 3: ИИ ЛИДЕР СОСЕДА (Правая сторона — 25% ширины)
    windowBoard.appendChild(createLeaderCard(targetLeader, targetFaction));

    screenWrapper.appendChild(windowBoard);
    screenManager.rootContainer.appendChild(screenWrapper);
}

import { AppState } from '../shared/GameState.js';

export function renderQuestsScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'quests_screen';

    const playerQuestIds = AppState.player?.quests || [];

    // 1. Корневой полноэкранный контейнер с затемнением
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-quests_screen';
    screenWrapper.style.pointerEvents = 'auto';

    Object.assign(screenWrapper.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(10, 14, 22, 0.95)', // Глубокий темный фон
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        zIndex: '8000'
    });

    // 2. Главная двухпанельная квестовая доска по центру
    const board = document.createElement('div');
    Object.assign(board.style, {
        width: '90%',
        maxWidth: '900px',
        height: '80vh',
        maxHeight: '600px',
        backgroundColor: '#141a24',
        border: '2px solid #34495e',
        borderRadius: '8px',
        display: 'flex',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        boxSizing: 'border-box'
    });

    // КНОПКА ЗАКРЫТИЯ (Крестик в верхнем правом углу)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'none',
        border: 'none',
        color: '#8a92a6',
        fontSize: '20px',
        cursor: 'pointer',
        zIndex: '10'
    });
    closeBtn.onclick = () => screenManager.clearCurrentScreen();
    board.appendChild(closeBtn);

    // ЛЕВАЯ ПАНЕЛЬ: Список квестов игрока
    const leftPanel = document.createElement('div');
    Object.assign(leftPanel.style, {
        width: '35%',
        borderRight: '1px solid #232d38',
        padding: '20px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflowY: 'auto',
        boxSizing: 'border-box'
    });

    const leftTitle = document.createElement('h3');
    leftTitle.textContent = _t('quests.journal');
    leftTitle.style.margin = '0 0 10px 0';
    leftTitle.style.color = '#ffd166';
    leftTitle.style.fontFamily = 'Georgia, serif';
    leftPanel.appendChild(leftTitle);

    // ПРАВАЯ ПАНЕЛЬ: Описание выбранного квеста
    const rightPanel = document.createElement('div');
    Object.assign(rightPanel.style, {
        width: '65%',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        color: '#f3f4f6'
    });

    // Функция рендеринга правой части при клике на квест
    const selectQuest = (quest) => {
        rightPanel.innerHTML = ''; // Чистим старое описание

        // Заголовок квеста
        const qTitle = document.createElement('h2');
        qTitle.textContent = _loc(quest.title || quest.id);
        qTitle.style.margin = '0';
        qTitle.style.color = quest.status === 'completed' ? '#2ea44f' : '#fff';
        rightPanel.appendChild(qTitle);

        // Тип и статус квеста на плашке
        const qMeta = document.createElement('div');
        const typeStr = _t('quests.' + quest.type);
        const statusStr = _t('quests.status_' + quest.status);
        qMeta.textContent = `${typeStr} • ${statusStr}`;
        qMeta.style.fontSize = '11px';
        qMeta.style.color = quest.status === 'completed' ? '#2ea44f' : '#ffd166';
        qMeta.style.textTransform = 'uppercase';
        rightPanel.appendChild(qMeta);

        // Текстовое описание квеста
        const qDesc = document.createElement('p');
        qDesc.textContent = _loc(quest.description||'');
        qDesc.style.fontSize = '14px';
        qDesc.style.lineHeight = '1.5';
        qDesc.style.color = '#a0a5b5';
        qDesc.style.margin = '10px 0';
        rightPanel.appendChild(qDesc);

        // СПИСОК ПОДЗАДАЧ (Objectives)
        if (Array.isArray(quest.objectives) && quest.objectives.length > 0) {
            const objTitle = document.createElement('h4');
            objTitle.textContent = _t('quests.objectives');
            objTitle.style.margin = '15px 0 5px 0';
            objTitle.style.color = '#ffd166';
            rightPanel.appendChild(objTitle);

            const objList = document.createElement('div');
            objList.style.display = 'flex';
            objList.style.flexDirection = 'column';
            objList.style.gap = '8px';

            quest.objectives.forEach(obj => {
                const objRow = document.createElement('div');
                Object.assign(objRow.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    opacity: obj.status === 'locked' ? '0.4' : '1.0' // Заблокированные шаги полупрозрачны
                });

                // Чекбокс статуса
                let icon = '⭕'; // active
                if (obj.status === 'completed') icon = '✅';
                if (obj.status === 'locked') icon = '🔒';

                // Текст шага + счетчик, если это числовой прогресс
                let countStr = '';
                if (obj.type === 'count') {
                    countStr = ` (${obj.current}/${obj.target})`;
                }

                const objText = _loc(obj.title || obj.id);
                objRow.innerHTML = `<span>${icon}</span> <span style="${obj.status === 'completed' ? 'text-decoration: line-through; color: #6a737d;' : ''}">${objText}${countStr}</span>`;
                objList.appendChild(objRow);
            });

            rightPanel.appendChild(objList);
        }
    };

    // 3. Заполняем левую панель квестами игрока
    let firstActiveQuest = null;

    playerQuestIds.forEach(questId => {
        const quest = AppState.quests?.[questId];
        if (!quest) return;

        if (!firstActiveQuest && quest.status === 'active') {
            firstActiveQuest = quest;
        }

        const itemBtn = document.createElement('button');
        Object.assign(itemBtn.style, {
            width: '100%',
            padding: '12px 10px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid #232d38',
            borderRadius: '4px',
            color: quest.status === 'completed' ? '#2ea44f' : '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'background 0.1s ease',
            boxSizing: 'border-box'
        });

        const titleText = _loc(quest.title || quest.id);
        const statusLabel = quest.status === 'completed' ? '✓' : (quest.type === 'global' ? '🌐' : '📍');

        itemBtn.textContent = `${statusLabel} ${titleText}`;

        itemBtn.onmouseover = () => itemBtn.style.backgroundColor = 'rgba(255,255,255,0.06)';
        itemBtn.onmouseout = () => itemBtn.style.backgroundColor = 'rgba(255,255,255,0.02)';

        // По клику выводим инфу в правое окно
        itemBtn.onclick = () => selectQuest(quest);

        leftPanel.appendChild(itemBtn);
    });

    // Если есть хоть один активный квест, открываем его по умолчанию при старте экрана
    if (firstActiveQuest) {
        selectQuest(firstActiveQuest);
    } else if (playerQuestIds.length > 0) {
        // Если активных нет, но есть выполненные — открываем первый попавшийся
        selectQuest(AppState.quests[playerQuestIds[0]]);
    } else {
        rightPanel.innerHTML = `<div style="color: #6a737d; text-align: center; margin-top: 100px;">${_t('quests.empty_journal')}</div>`;
    }

    board.appendChild(leftPanel);
    board.appendChild(rightPanel);
    screenWrapper.appendChild(board);
    screenManager.rootContainer.appendChild(screenWrapper);
}
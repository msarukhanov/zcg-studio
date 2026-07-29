// ==========================================================================
// СЛОЙ 1: ГЛОБАЛЬНЫЙ СТЕЙТ, СПРАВОЧНИКИ И УПРАВЛЕНИЕ СТУДИЕЙ
// ==========================================================================

// Инициализация безопасного стейта редактора диалогов


// --- КОНТРОЛЛЕРЫ ОТКРЫТИЯ И ЗАКРЫТИЯ ПОЛНОЭКРАННОЙ СТУДИИ ---
/**
 * Автоматически рассчитывает координаты нод и отрисовывает каскадный граф связей (Слева направо)
 */


export const DialogEditor = {

    initDialogModal() {

        let overlay = document.getElementById('dialog-editor-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dialog-editor-modal';
            overlay.style.pointerEvents = 'auto';
            Object.assign(overlay.style, {
                position: 'absolute', inset: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(7, 10, 15, 0.95)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
            });
            document.body.appendChild(overlay);

            // Фиксированный крестик закрытия модалки поверх всего

        }
        overlay.innerHTML = '';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'fixed', top: '15px', right: '15px', width: '44px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '10000'
        });
        closeBtn.onclick = () => { overlay.remove(); };
        overlay.appendChild(closeBtn);

        // <div id="view-dialogs" class="view-panel">
        const viewPanel = document.createElement('div');
        viewPanel.id = 'view-dialogs';
        viewPanel.className = 'view-panel';
        // Object.assign(viewPanel.style, {
        //     position: 'absolute', inset: '0', width: '100%', height: '100%',
        //     backgroundColor: 'rgba(7, 10, 15, 0.96)', display: 'flex',
        //     alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
        // });
        Object.assign(viewPanel.style, {
            width: '95%', maxWidth: '100vw', height: '85vh', maxHeight: '95vh',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', boxSizing: 'border-box', overflow: 'hidden'
        });

        // <div class="story-engine-container">
        const storyEngineContainer = document.createElement('div');
        storyEngineContainer.className = 'story-engine-container';
        viewPanel.appendChild(storyEngineContainer);

        // <div class="graph-canvas-wrapper" id="graph-wrapper" onclick="handleGraphCanvasClick(event)">
        const graphWrapper = document.createElement('div');
        graphWrapper.id = 'graph-wrapper';
        graphWrapper.className = 'graph-canvas-wrapper';
        graphWrapper.onclick = (event) => {
            if (AppState.engine.DialogEditor?.handleGraphCanvasClick) {
                AppState.engine.DialogEditor.handleGraphCanvasClick(event);
            }
        };
        storyEngineContainer.appendChild(graphWrapper);

        // <div class="graph-toolbar">
        const graphToolbar = document.createElement('div');
        graphToolbar.className = 'graph-toolbar';
        graphWrapper.appendChild(graphToolbar);

        // <span class="toolbar-title">Story Flow Director</span>
        const toolbarTitle = document.createElement('span');
        toolbarTitle.className = 'toolbar-title';
        toolbarTitle.textContent = 'Story Flow Director';
        graphToolbar.appendChild(toolbarTitle);

        // <button class="primary" onclick="createNewSceneNode()">+ Add Atom Scene</button>
        const addSceneBtn = document.createElement('button');
        addSceneBtn.className = 'primary';
        addSceneBtn.textContent = '+ Add Atom Scene';
        addSceneBtn.onclick = (event) => {
            event.stopPropagation();
            if (AppState.engine.DialogEditor?.createNewSceneNode) {
                AppState.engine.DialogEditor.createNewSceneNode();
            }
        };
        graphToolbar.appendChild(addSceneBtn);

        // <div class="lang-selector-global">
        const langSelector = document.createElement('div');
        langSelector.className = 'lang-selector-global';
        graphToolbar.appendChild(langSelector);

        // <span>Editor View Lang:</span>
        const langLabel = document.createElement('span');
        langLabel.textContent = 'Editor View Lang:';
        langSelector.appendChild(langLabel);

        // <button class="lang-tab active" id="lang-btn-en" onclick="setEditorLanguage('en')">EN</button>
        const langBtnEn = document.createElement('button');
        langBtnEn.id = 'lang-btn-en';
        langBtnEn.className = 'lang-tab active';
        langBtnEn.textContent = 'EN';
        langBtnEn.onclick = (event) => {
            event.stopPropagation();
            if (AppState.engine.DialogEditor?.setEditorLanguage) {
                AppState.engine.DialogEditor.setEditorLanguage('en');
            }
        };
        langSelector.appendChild(langBtnEn);

        // <button class="lang-tab" id="lang-btn-ru" onclick="setEditorLanguage('ru')">RU</button>
        const langBtnRu = document.createElement('button');
        langBtnRu.id = 'lang-btn-ru';
        langBtnRu.className = 'lang-tab';
        langBtnRu.textContent = 'RU';
        langBtnRu.onclick = (event) => {
            event.stopPropagation();
            if (AppState.engine.DialogEditor?.setEditorLanguage) {
                AppState.engine.DialogEditor.setEditorLanguage('ru');
            }
        };
        langSelector.appendChild(langBtnRu);

        // <div class="graph-canvas" id="graph-canvas">
        const graphCanvas = document.createElement('div');
        graphCanvas.id = 'graph-canvas';
        graphCanvas.className = 'graph-canvas';
        graphWrapper.appendChild(graphCanvas);

        // <svg class="graph-svg-connections" id="graph-connections-svg"></svg>
        const svgConnections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgConnections.id = 'graph-connections-svg';
        svgConnections.setAttribute('class', 'graph-svg-connections');
        graphCanvas.appendChild(svgConnections);

        // <div class="graph-nodes-layer" id="graph-nodes-layer"></div>
        const graphNodesLayer = document.createElement('div');
        graphNodesLayer.id = 'graph-nodes-layer';
        graphNodesLayer.className = 'graph-nodes-layer';
        graphCanvas.appendChild(graphNodesLayer);

        // <div class="scene-studio-overlay hidden" id="scene-studio-overlay">
        const sceneStudioOverlay = document.createElement('div');
        sceneStudioOverlay.id = 'scene-studio-overlay';
        sceneStudioOverlay.className = 'scene-studio-overlay hidden';
        storyEngineContainer.appendChild(sceneStudioOverlay);

        // <div class="scene-studio-window">
        const sceneStudioWindow = document.createElement('div');
        sceneStudioWindow.className = 'scene-studio-window';
        sceneStudioOverlay.appendChild(sceneStudioWindow);

        // <div class="studio-header">
        const studioHeader = document.createElement('div');
        studioHeader.className = 'studio-header';
        sceneStudioWindow.appendChild(studioHeader);

        // <div class="studio-node-title">
        const studioNodeTitle = document.createElement('div');
        studioNodeTitle.className = 'studio-node-title';
        studioHeader.appendChild(studioNodeTitle);

        // <span class="studio-badge">SCENE EDIT TERMINAL</span>
        const studioBadge = document.createElement('span');
        studioBadge.className = 'studio-badge';
        studioBadge.textContent = 'SCENE EDIT TERMINAL';
        studioNodeTitle.appendChild(studioBadge);

        // <h2 id="studio-active-id">SCENE_ID_HOLDER</h2>
        const studioActiveId = document.createElement('h2');
        studioActiveId.id = 'studio-active-id';
        studioActiveId.textContent = 'SCENE_ID_HOLDER';
        studioNodeTitle.appendChild(studioActiveId);

        // <div class="studio-header-actions">
        const studioHeaderActions = document.createElement('div');
        studioHeaderActions.className = 'studio-header-actions';
        studioHeader.appendChild(studioHeaderActions);

        // <button class="danger" id="studio-delete-btn">Delete Full Scene</button>
        const studioDeleteBtn = document.createElement('button');
        studioDeleteBtn.id = 'studio-delete-btn';
        studioDeleteBtn.className = 'danger';
        studioDeleteBtn.textContent = 'Delete Full Scene';
        studioHeaderActions.appendChild(studioDeleteBtn);

        // <button class="studio-close-btn" onclick="closeSceneStudio()">Close Studio ×</button>
        const studioCloseBtn = document.createElement('button');
        studioCloseBtn.className = 'studio-close-btn';
        studioCloseBtn.textContent = 'Close Studio ×';
        studioCloseBtn.onclick = () => {
            if (AppState.engine.DialogEditor?.closeSceneStudio) {
                AppState.engine.DialogEditor.closeSceneStudio();
            }
        };
        studioHeaderActions.appendChild(studioCloseBtn);

        // <div class="studio-body">
        // <div class="studio-body">
        const studioBody = document.createElement('div');
        studioBody.className = 'studio-body';
        sceneStudioWindow.appendChild(studioBody);

        // <div class="studio-left-structure">
        const studioLeftStructure = document.createElement('div');
        studioLeftStructure.className = 'studio-left-structure';
        studioBody.appendChild(studioLeftStructure);

        // <div class="studio-section-card">
        const sectionCard1 = document.createElement('div');
        sectionCard1.className = 'studio-section-card';
        studioLeftStructure.appendChild(sectionCard1);

        // <div class="studio-card-title">1. Global Setup & Activation Conditions</div>
        const cardTitle1 = document.createElement('div');
        cardTitle1.className = 'studio-card-title';
        cardTitle1.textContent = '1. Global Setup & Activation Conditions';
        sectionCard1.appendChild(cardTitle1);

        // <div id="studio-meta-setup-zone"></div>
        const studioMetaSetupZone = document.createElement('div');
        studioMetaSetupZone.id = 'studio-meta-setup-zone';
        sectionCard1.appendChild(studioMetaSetupZone);

        // <div class="studio-section-card">
        const sectionCard2 = document.createElement('div');
        sectionCard2.className = 'studio-section-card';
        studioLeftStructure.appendChild(sectionCard2);

        // <div class="studio-card-title">2. Stage Actors Backdrops Registry</div>
        const cardTitle2 = document.createElement('div');
        cardTitle2.className = 'studio-card-title';
        cardTitle2.textContent = '2. Stage Actors Backdrops Registry';
        sectionCard2.appendChild(cardTitle2);

        // <div id="studio-actors-registry-zone"></div>
        const studioActorsRegistryZone = document.createElement('div');
        studioActorsRegistryZone.id = 'studio-actors-registry-zone';
        sectionCard2.appendChild(studioActorsRegistryZone);

        // <div class="studio-section-card" style="flex: 1; margin-bottom: 0; display: flex; flex-direction: column; overflow: hidden;">
        const sectionCard3 = document.createElement('div');
        sectionCard3.className = 'studio-section-card';
        Object.assign(sectionCard3.style, {
            flex: '1',
            marginBottom: '0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        });
        studioLeftStructure.appendChild(sectionCard3);

        // <div class="studio-card-title">3. Narrative Timeline Sequence</div>
        const cardTitle3 = document.createElement('div');
        cardTitle3.className = 'studio-card-title';
        cardTitle3.textContent = '3. Narrative Timeline Sequence';
        sectionCard3.appendChild(cardTitle3);

        // <div class="studio-timeline-scroll-container" id="studio-timeline-sequence-list"></div>
        const studioTimelineSequenceList = document.createElement('div');
        studioTimelineSequenceList.className = 'studio-timeline-scroll-container';
        studioTimelineSequenceList.id = 'studio-timeline-sequence-list';
        sectionCard3.appendChild(studioTimelineSequenceList);

        // <div class="studio-right-inspector">
        const studioRightInspector = document.createElement('div');
        studioRightInspector.className = 'studio-right-inspector';
        studioBody.appendChild(studioRightInspector);

        // <div class="inspector-panel-holder" id="studio-segment-inspector-zone"></div>
        const studioSegmentInspectorZone = document.createElement('div');
        studioSegmentInspectorZone.className = 'inspector-panel-holder';
        studioSegmentInspectorZone.id = 'studio-segment-inspector-zone';
        studioRightInspector.appendChild(studioSegmentInspectorZone);

        overlay.appendChild(viewPanel);
        AppState.engine.DialogEditor.renderStoryGraph();
    },



    initDialogModal222() {
        const currentLang = AppState.game_settings?.language || 'en';

        let overlay = document.getElementById('dialog-editor-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dialog-editor-modal';
            overlay.style.pointerEvents = 'auto';
            Object.assign(overlay.style, {
                position: 'absolute', inset: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(7, 10, 15, 0.95)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
            });
            document.body.appendChild(overlay);

            // Фиксированный крестик закрытия модалки поверх всего

        }
        overlay.innerHTML = '';

        // Корневой родительский оверлей панели
        const viewPanel = document.createElement('div');
        viewPanel.id = 'view-dialogs';
        viewPanel.className = 'view-panel';
        Object.assign(viewPanel.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(7, 10, 15, 0.96)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'sans-serif'
        });



        const globalCloseBtn = document.createElement('button');
        globalCloseBtn.innerHTML = '✕';
        Object.assign(globalCloseBtn.style, {
            position: 'fixed',
            top: '15px',
            right: '15px',
            width: '44px',
            height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)',
            border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%',
            color: '#8a92a6',
            fontSize: '22px',
            cursor: 'pointer',
            zIndex: '10005', // Выше тулбара и всех оверлеев
            transition: 'color 0.15s, border-color 0.15s'
        });

        globalCloseBtn.onclick = (event) => {
            event.stopPropagation();
            overlay.remove();
        };
        viewPanel.appendChild(globalCloseBtn);

        const storyEngineContainer = document.createElement('div');
        storyEngineContainer.className = 'story-engine-container';
        Object.assign(storyEngineContainer.style, {
            width: '98%', maxWidth: '1200px', height: '95vh', maxHeight: '720px',
            backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxSizing: 'border-box'
        });
        viewPanel.appendChild(storyEngineContainer);

        // =========================================================================
        // 🗺️ 1. ВЕРХНЯЯ ПОЛОВИНА: GRAPH CANVAS WRAPPER
        // =========================================================================
        const graphWrapper = document.createElement('div');
        graphWrapper.id = 'graph-wrapper';
        graphWrapper.className = 'graph-canvas-wrapper';
        Object.assign(graphWrapper.style, { width: '100%', flex: '1', display: 'flex', flexDirection: 'column', position: 'relative' });

        // Биндинг клика по холсту графа
        graphWrapper.onclick = (event) => {
            if (AppState.engine.DialogEditor?.handleGraphCanvasClick) {
                AppState.engine.DialogEditor.handleGraphCanvasClick(event);
            }
        };
        storyEngineContainer.appendChild(graphWrapper);

        // Тулбар управления графом нод
        const graphToolbar = document.createElement('div');
        graphToolbar.className = 'graph-toolbar';
        Object.assign(graphToolbar.style, {
            width: '100%', padding: '12px 20px', backgroundColor: '#161d2a',
            borderBottom: '1px solid #232d38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box'
        });
        graphWrapper.appendChild(graphToolbar);

        const toolbarTitle = document.createElement('span');
        toolbarTitle.className = 'toolbar-title';
        toolbarTitle.textContent = 'Story Flow Director';
        toolbarTitle.style.cssText = 'color:#ffd166; font-size:14px; font-weight:bold; letter-spacing:1px;';
        graphToolbar.appendChild(toolbarTitle);

        // Кнопка добавления новой атом-сцены
        const addSceneBtn = document.createElement('button');
        addSceneBtn.className = 'primary';
        addSceneBtn.textContent = '+ Add Atom Scene';
        Object.assign(addSceneBtn.style, {
            padding: '8px 16px', backgroundColor: '#2ea44f', color: '#fff', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
        });
        addSceneBtn.onclick = (event) => {
            event.stopPropagation();
            if (AppState.engine.DialogEditor?.createNewSceneNode) {
                AppState.engine.DialogEditor.createNewSceneNode();
            }
        };
        graphToolbar.appendChild(addSceneBtn);

        // Блок переключения языков
        const langSelector = document.createElement('div');
        langSelector.className = 'lang-selector-global';
        Object.assign(langSelector.style, { display: 'flex', alignItems: 'center', gap: '8px' });
        graphToolbar.appendChild(langSelector);

        const langLabel = document.createElement('span');
        langLabel.textContent = 'Editor View Lang:';
        langLabel.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold;';
        langSelector.appendChild(langLabel);

        ['en', 'ru'].forEach(lang => {
            const langTab = document.createElement('button');
            langTab.className = `lang-tab ${lang === currentLang ? 'active' : ''}`;
            langTab.textContent = lang.toUpperCase();
            Object.assign(langTab.style, {
                padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: lang === currentLang ? '#3498db' : '#1b2432',
                border: lang === currentLang ? '1px solid #5faee3' : '1px solid #2d394b',
                borderRadius: '3px', color: '#fff'
            });

            langTab.onclick = (event) => {
                event.stopPropagation();
                if (AppState.engine.DialogEditor?.setEditorLanguage) {
                    AppState.engine.DialogEditor.setEditorLanguage(lang);
                }
            };
            langSelector.appendChild(langTab);
        });

        // Сам интерактивный холст графа
        const graphCanvas = document.createElement('div');
        graphCanvas.id = 'graph-canvas';
        graphCanvas.className = 'graph-canvas';
        Object.assign(graphCanvas.style, { flex: '1', width: '100%', backgroundColor: '#090d14', position: 'relative', overflow: 'auto' });
        graphWrapper.appendChild(graphCanvas);

        // SVG слой соединений
        const svgConnections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgConnections.id = 'graph-connections-svg';
        svgConnections.setAttribute('class', 'graph-svg-connections');
        Object.assign(svgConnections.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
        graphCanvas.appendChild(svgConnections);

        // Контейнер под ноды-карточки диалогов
        const graphNodesLayer = document.createElement('div');
        graphNodesLayer.id = 'graph-nodes-layer';
        graphNodesLayer.className = 'graph-nodes-layer';
        Object.assign(graphNodesLayer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'auto' });
        graphCanvas.appendChild(graphNodesLayer);

        // =========================================================================
        // 🎬 2. СЛЕДУЮЩАЯ ПОЛОВИНА: SCENE STUDIO OVERLAY (Окно терминала)
        // =========================================================================
        const sceneStudioOverlay = document.createElement('div');
        sceneStudioOverlay.id = 'scene-studio-overlay';
        sceneStudioOverlay.className = 'scene-studio-overlay hidden';
        Object.assign(sceneStudioOverlay.style, {
            position: 'absolute', inset: '0', backgroundColor: 'rgba(5, 8, 12, 0.95)',
            display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: '6000', boxSizing: 'border-box'
        });
        storyEngineContainer.appendChild(sceneStudioOverlay);

        const sceneStudioWindow = document.createElement('div');
        sceneStudioWindow.className = 'scene-studio-window';
        Object.assign(sceneStudioWindow.style, {
            width: '95%', height: '90%', backgroundColor: '#111622', border: '1px solid #34495e',
            borderRadius: '6px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box'
        });
        sceneStudioOverlay.appendChild(sceneStudioWindow);

        // Шапка терминала редактирования
        const studioHeader = document.createElement('div');
        studioHeader.className = 'studio-header';
        Object.assign(studioHeader.style, {
            width: '100%', padding: '15px 20px', backgroundColor: '#161d2a',
            borderBottom: '1px solid #232d38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box'
        });
        sceneStudioWindow.appendChild(studioHeader);

        const studioNodeTitle = document.createElement('div');
        studioNodeTitle.className = 'studio-node-title';
        Object.assign(studioNodeTitle.style, { display: 'flex', alignItems: 'center', gap: '12px' });
        studioHeader.appendChild(studioNodeTitle);

        const studioBadge = document.createElement('span');
        studioBadge.className = 'studio-badge';
        studioBadge.textContent = 'SCENE EDIT TERMINAL';
        studioBadge.style.cssText = 'background:#e74c3c; color:#fff; font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; letter-spacing:0.5px;';
        studioNodeTitle.appendChild(studioBadge);

        const studioActiveId = document.createElement('h2');
        studioActiveId.id = 'studio-active-id';
        studioActiveId.textContent = 'SCENE_ID_HOLDER';
        studioActiveId.style.cssText = 'color:#fff; margin:0; font-size:15px; font-weight:bold; font-family:monospace;';
        studioNodeTitle.appendChild(studioActiveId);

        const studioHeaderActions = document.createElement('div');
        studioHeaderActions.className = 'studio-header-actions';
        Object.assign(studioHeaderActions.style, { display: 'flex', gap: '10px' });
        studioHeader.appendChild(studioHeaderActions);

        // Кнопка удаления всей сцены
        const studioDeleteBtn = document.createElement('button');
        studioDeleteBtn.id = 'studio-delete-btn';
        studioDeleteBtn.className = 'danger';
        studioDeleteBtn.textContent = 'Delete Full Scene';
        Object.assign(studioDeleteBtn.style, {
            padding: '6px 12px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
        });
        // Биндинг удаления привяжем на будущее, пока оставляем заглушку или твой обработчик
        studioHeaderActions.appendChild(studioDeleteBtn);

        // Кнопка закрытия студии
        const studioCloseBtn = document.createElement('button');
        studioCloseBtn.className = 'studio-close-btn';
        studioCloseBtn.textContent = 'Close Studio ×';
        Object.assign(studioCloseBtn.style, {
            padding: '6px 12px', backgroundColor: '#3a4759', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
        });
        studioCloseBtn.onclick = () => {
            if (AppState.engine.DialogEditor?.closeSceneStudio) {
                AppState.engine.DialogEditor.closeSceneStudio();
            }
        };
        studioHeaderActions.appendChild(studioCloseBtn);

        // Двухпанельное тело студии
        const studioBody = document.createElement('div');
        studioBody.className = 'studio-body';
        Object.assign(studioBody.style, { width: '100%', flex: '1', display: 'flex', overflow: 'hidden', boxSizing: 'border-box' });
        sceneStudioWindow.appendChild(studioBody);

        // ЛЕВАЯ ПАНЕЛЬ (55%): Структура Сцены
        const studioLeftStructure = document.createElement('div');
        studioLeftStructure.className = 'studio-left-structure';
        Object.assign(studioLeftStructure.style, {
            width: '55%', height: '100%', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', borderRight: '1px solid #232d38', overflowY: 'auto'
        });
        studioBody.appendChild(studioLeftStructure);

        // Вспомогательный метод сборки карточек секций студии
        const createSectionCard = (titleText, zoneId, isTimeline = false) => {
            const card = document.createElement('div');
            card.className = 'studio-section-card';
            Object.assign(card.style, {
                width: '100%', padding: '12px', backgroundColor: '#141a27', border: '1px solid #232d38', borderRadius: '6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px'
            });

            const cardTitle = document.createElement('div');
            cardTitle.className = 'studio-card-title';
            cardTitle.textContent = titleText;
            cardTitle.style.cssText = 'color:#8a92a6; font-size:11px; font-weight:bold; letter-spacing:0.5px; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:4px;';
            card.appendChild(cardTitle);

            const zone = document.createElement('div');
            zone.id = zoneId;
            if (isTimeline) {
                card.style.flex = '1';
                card.style.marginBottom = '0';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.overflow = 'hidden';
                zone.className = 'studio-timeline-scroll-container';
                Object.assign(zone.style, { flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' });
            } else {
                Object.assign(zone.style, { display: 'flex', flexDirection: 'column', gap: '6px' });
            }
            card.appendChild(zone);
            return card;
        };

        // Монтируем 3 карточки секций терминала в левую панель
        studioLeftStructure.appendChild(createSectionCard('1. Global Setup & Activation Conditions', 'studio-meta-setup-zone'));
        studioLeftStructure.appendChild(createSectionCard('2. Stage Actors Backdrops Registry', 'studio-actors-registry-zone'));
        studioLeftStructure.appendChild(createSectionCard('3. Narrative Timeline Sequence', 'studio-timeline-sequence-list', true));

        // ПРАВАЯ ПАНЕЛЬ (45%): Инспектор свойств (Ищет активный сегмент)
        const studioRightInspector = document.createElement('div');
        studioRightInspector.className = 'studio-right-inspector';
        Object.assign(studioRightInspector.style, {
            width: '45%', height: '100%', padding: '15px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#0e121b'
        });
        studioBody.appendChild(studioRightInspector);

        const inspectorPanelHolder = document.createElement('div');
        inspectorPanelHolder.id = 'studio-segment-inspector-zone';
        inspectorPanelHolder.className = 'inspector-panel-holder';
        Object.assign(inspectorPanelHolder.style, {
            width: '100%', flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'
        });
        studioRightInspector.appendChild(inspectorPanelHolder);

        // Возвращаем полностью собранную DOM-панель
        overlay.appendChild(viewPanel);
        AppState.engine.DialogEditor.renderStoryGraph();
    },
    
    renderStoryGraph() {
        AppState.engine.DialogEditor.autoGenerateCharacterRootScenes();

        const canvas = document.getElementById('graph-nodes-layer');
        const svg = document.getElementById('graph-connections-svg');
        if (!canvas || !svg) return;

        canvas.innerHTML = '';
        svg.innerHTML = '';

        const dialogs = AppState.dialogs || {};
        const keys = Object.keys(dialogs);
        if (keys.length === 0) return;

        // Константы сетки
        const colWidth = 260;
        const nodeHeight = 60; // Чистая высота самого блока
        const nodeGapY = 50;   // Отступ МЕЖДУ блоками в одном столбце (nodeHeight + nodeGapY = 110)
        const rowHeight = nodeHeight + nodeGapY;

        const startX = 60;
        const startY = 100;
        const groupGap = 100;  // Зазор между группами

        // --- ШАГ 1: Создание цепочек по группам ---
        const groupsMap = {};
        const orderedGroups = [];

        // Группируем все ключи нод по их meta.group
        keys.forEach(key => {
            const scene = dialogs[key];
            const groupName = scene?.meta?.group || 'general';

            if (!orderedGroups.includes(groupName)) {
                orderedGroups.push(groupName);
            }
            if (!groupsMap[groupName]) {
                groupsMap[groupName] = [];
            }
            groupsMap[groupName].push(key);
        });

        // Строим связи (кто куда ведет) для рендеринга стрелок
        const forwardLinks = {};
        keys.forEach(key => { forwardLinks[key] = new Set(); });
        keys.forEach(key => {
            const scene = dialogs[key];
            if (!scene || !Array.isArray(scene.player_choices)) return;
            scene.player_choices.forEach(choice => {
                if (choice.on_success?.next_scene && forwardLinks[choice.on_success.next_scene]) {
                    forwardLinks[key].add(choice.on_success.next_scene);
                }
                if (choice.on_fail?.next_scene && forwardLinks[choice.on_fail.next_scene]) {
                    forwardLinks[key].add(choice.on_fail.next_scene);
                }
            });
        });

        // Вычисляем столбцы (колонки) для каждой ноды внутри её группы
        const nodeColumns = {};
        orderedGroups.forEach(groupName => {
            const groupKeys = groupsMap[groupName];

            // Считаем входящие ссылки только в рамках текущей группы
            const localIncoming = {};
            groupKeys.forEach(k => localIncoming[k] = 0);
            groupKeys.forEach(k => {
                forwardLinks[k].forEach(targetKey => {
                    if (localIncoming[targetKey] !== undefined) localIncoming[targetKey]++;
                });
            });

            // Ищем старты группы (0 входящих ссылок локально)
            let queue = groupKeys.filter(k => localIncoming[k] === 0);
            if (queue.length === 0 && groupKeys.length > 0) {
                queue.push(groupKeys[0]);
            }

            queue.forEach(k => nodeColumns[k] = 0);
            const visited = new Set(queue);

            while (queue.length > 0) {
                const current = queue.shift();
                const currentCol = nodeColumns[current] || 0;

                forwardLinks[current].forEach(nextKey => {
                    if (localIncoming[nextKey] !== undefined && nodeColumns[nextKey] === undefined) {
                        nodeColumns[nextKey] = currentCol + 1;
                        if (!visited.has(nextKey)) {
                            visited.add(nextKey);
                            queue.push(nextKey);
                        }
                    }
                });
            }

            // Сироты в группе получают 0 столбец
            groupKeys.forEach(k => {
                if (nodeColumns[k] === undefined) nodeColumns[k] = 0;
            });
        });

        // --- ШАГ 2: Анализ столбцов в каждой группе ---
        // Структура: groupColumnCounters = { "Group1": { 0: 3, 1: 1, 2: 2 }, ... }
        const groupColumnCounters = {};
        // Структура: groupMaxRows = { "Group1": 3, "Group2": 1, ... }
        const groupMaxRows = {};

        orderedGroups.forEach(groupName => {
            groupColumnCounters[groupName] = {};
            const groupKeys = groupsMap[groupName];

            // Считаем, сколько блоков в каждом конкретном столбце этой группы
            groupKeys.forEach(key => {
                const col = nodeColumns[key];
                if (!groupColumnCounters[groupName][col]) {
                    groupColumnCounters[groupName][col] = 0;
                }
                groupColumnCounters[groupName][col]++;
            });

            // Находим МАКСИМУМ блоков среди всех столбцов для данной группы
            const counts = Object.values(groupColumnCounters[groupName]);
            groupMaxRows[groupName] = counts.length > 0 ? Math.max(...counts) : 1;
        });

        // --- ШАГ 3: Расчёт базовых высот и финальных координат нод ---
        const groupBaselines = {};
        let currentBaselineY = startY;

        // Сначала рассчитываем базовую высоту для абсолютно каждого этажа группы
        orderedGroups.forEach((groupName, idx) => {
            // Записываем старт для текущей группы
            groupBaselines[groupName] = currentBaselineY;

            // Вычисляем полную высоту текущей группы с учётом блоков и отступов между ними
            const maxBlocks = groupMaxRows[groupName];
            // Формула высоты группы: (кол-во_блоков * высота_блока) + ((кол-во_блоков - 1) * отступ_между_блоками)
            const groupHeight = (maxBlocks * nodeHeight) + ((maxBlocks - 1) * nodeGapY);

            // Рассчитываем, где начнётся СЛЕДУЮЩИЙ этаж (текущий старт + высота группы + зазор 150)
            currentBaselineY += groupHeight + groupGap;
        });

        // Теперь, зная чёткие базовые высоты, расставляем ноды
        const nodePositions = {};
        // Локальные счётчики, чтобы узнать индекс блока конкретно в его столбце
        const gridCounters = {};

        orderedGroups.forEach(groupName => {
            const groupKeys = groupsMap[groupName];
            const baselineY = groupBaselines[groupName];

            groupKeys.forEach(key => {
                const col = nodeColumns[key];
                const gridKey = `${groupName}-${col}`;

                if (gridCounters[gridKey] === undefined) {
                    gridCounters[gridKey] = 0;
                }

                // Индекс текущего блока в своём столбце (0, 1, 2...)
                const indexInColumn = gridCounters[gridKey];

                // Координата Y считается строго С НУЛЯ от базовой высоты этой группы
                nodePositions[key] = {
                    x: startX + (col * colWidth),
                    y: baselineY + (indexInColumn * rowHeight) // ровно прибавляет высоту блока и отступ между ними
                };

                gridCounters[gridKey]++;
            });
        });

        AppState.engine.DialogEditor.renderGraphElements(keys, dialogs, nodePositions, forwardLinks, svg, canvas);
    },

    renderGraphElements(keys, dialogs, nodePositions, forwardLinks, svg, canvas) {
        const currentLang = AppState.editorLang || 'en';

        // Шаг 4: Рендерим HTML-ноды (карточки сцен)
        keys.forEach(key => {
            const scene = dialogs[key];
            const pos = nodePositions[key];
            if (!pos || !scene) return;

            const groupName = scene.meta?.group || 'general';
            const sceneType = scene.meta?.type || 'dialog';
            const isActive = AppState.activeSceneKey === key ? 'active' : '';

            // Берём превью из первой страницы текста NPC, если она есть
            let textPreview = '...';
            if (Array.isArray(scene.text_pages) && scene.text_pages[0]?.text) {
                textPreview = scene.text_pages[0].text[currentLang] || Object.values(scene.text_pages[0].text)[0] || '...';
            }
            const truncatedText = textPreview.length > 24 ? textPreview.substring(0, 24) + '...' : textPreview;

            const nodeHtml = `
            <div class="story-node ${isActive}" id="node-${key}" style="left: ${pos.x}px; top: ${pos.y}px;" onclick="event.stopPropagation(); AppState.engine.DialogEditor.selectSceneNode('${key}')">
                <div class="node-id" title="${key}">${key}</div>
                <div class="node-preview">${truncatedText}</div>
                <div class="node-meta-row">
                    <span class="node-group-badge">${groupName}</span>
                    <span class="node-type-icon">${sceneType.toUpperCase()}</span>
                </div>
            </div>
        `;
            canvas.insertAdjacentHTML('beforeend', nodeHtml);
        });

        // Шаг 5: Рендерим SVG-линии связей (Слева направо)
        keys.forEach(key => {
            const startPos = nodePositions[key];
            if (!startPos) return;

            forwardLinks[key].forEach(targetKey => {
                const endPos = nodePositions[targetKey];
                if (!startPos || !endPos) return;

                // Линия выходит из центра ПРАВОГО края исходной ноды (ширина 180px, высота 65px)
                const x1 = startPos.x + 180;
                const y1 = startPos.y + 32;

                // И входит в центр ЛЕВЕГО края целевой ноды
                const x2 = endPos.x;
                const y2 = endPos.y + 32;

                // Горизонтальная кривая Безье (управление по оси X)
                const controlOffset = Math.abs(x2 - x1) * 0.5;
                const d = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

                // Подсвечиваем линию, если одна из связанных нод сейчас активна
                const isRouteActive = (AppState.activeSceneKey === key || AppState.activeSceneKey === targetKey) ? 'class="active-route"' : '';

                const pathHtml = `<path d="${d}" ${isRouteActive} />`;
                svg.insertAdjacentHTML('beforeend', pathHtml);
            });
        });
    },

    createNewSceneNode() {
        const newKey = `SCENE_NODE_${Object.keys(AppState.dialogs).length + 1}`;

        // Инициализируем структуру под новую мастерскую логику данных
        AppState.dialogs[newKey] = {
            activation_conditions: [],
            meta: { group: "general", type: "active_dialog" },
            window_settings: {
                display_type: "fullscreen",
                backgroundImage: "",
                actors_registry: []
            },
            text_pages: [
                {
                    speaker_id: "NARRATOR",
                    expression: "normal",
                    text: { en: "New scene text description goes here.", ru: "Новое описание текста сцены." },
                    audio: "",
                    auto_advance_time: 0,
                    fx: { scene_animation: "", actor_animation: "" }
                }
            ],
            player_choices: []
        };

        // Сразу открываем полноэкранную студию для этой новой сцены
        AppState.engine.DialogEditor.openSceneStudio(newKey);
    },

    openSceneStudio(sceneKey) {
        AppState.activeSceneKey = sceneKey;

        // Сбрасываем фокусы кадра по умолчанию (открываем базовые настройки)
        AppState.activeSegmentType = 'meta';
        AppState.activeSegmentIdx = null;

        // Подсвечиваем ноду на холсте графа
        document.querySelectorAll('.story-node').forEach(n => n.classList.remove('active'));
        const graphNode = document.getElementById(`node-${sceneKey}`);
        if (graphNode) graphNode.classList.add('active');

        // Находим модальное окно студии
        const overlay = document.getElementById('scene-studio-overlay');
        if (!overlay) return;

        // Гарантируем структуру данных в AppState.dialogs, чтобы ничего не падало
        const scene = AppState.dialogs[sceneKey];
        if (!scene) return;
        if (!scene.meta) scene.meta = { group: "chapter_1", type: "active_dialog" };
        if (!scene.window_settings) scene.window_settings = { display_type: "fullscreen" };
        if (!scene.activation_conditions) scene.activation_conditions = [];
        if (!scene.window_settings.actors_registry) scene.window_settings.actors_registry = [];
        if (!scene.text_pages) scene.text_pages = [];
        if (!scene.player_choices) scene.player_choices = [];

        // Обновляем текстовые заголовки шапки терминала
        const titleNode = document.getElementById('studio-active-id');
        if (titleNode) titleNode.innerText = sceneKey;

        // Навешиваем событие на кнопку удаления полной сцены в шапке
        const deleteBtn = document.getElementById('studio-delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (confirm(`Вы уверены, что хотите полностью стереть сцену "${sceneKey}"?`)) {
                    delete AppState.dialogs[sceneKey];
                    AppState.engine.DialogEditor.closeSceneStudio();
                }
            };
        }

        // Запускаем плавную анимацию появления: убираем класс hidden
        overlay.classList.remove('hidden');

        // Вызываем тотальную перерисовку левой и правой секций студии
        AppState.engine.DialogEditor.setupStudioHeaderActions(sceneKey);
        AppState.engine.DialogEditor.refreshStudioLayout();
    },

    closeSceneStudio() {
        AppState.activeSceneKey = null;
        AppState.activeSegmentType = null;
        AppState.activeSegmentIdx = null;

        // Снимаем подсветку со всех нод графа
        document.querySelectorAll('.story-node').forEach(n => n.classList.remove('active'));

        // Прячем оверлей студии
        const overlay = document.getElementById('scene-studio-overlay');
        if (overlay) overlay.classList.add('hidden');

        // Очищаем внутреннюю зону инспектора сегментов
        const inspectorZone = document.getElementById('studio-segment-inspector-zone');
        if (inspectorZone) inspectorZone.innerHTML = '';

        // Перерисовываем визуальный граф, чтобы обновить стрелочки и превью
        AppState.engine.DialogEditor.renderStoryGraph();
    },

    setEditorLanguage(lang) {
        AppState.editorLang = lang;

        // Переключаем активный класс на кнопках тулбара графа
        const btnEn = document.getElementById('lang-btn-en');
        const btnRu = document.getElementById('lang-btn-ru');
        if (btnEn) btnEn.classList.toggle('active', lang === 'en');
        if (btnRu) btnRu.classList.toggle('active', lang === 'ru');

        // Если студия открыта — обновляем её контент под новый язык
        if (AppState.activeSceneKey) {
            AppState.engine.DialogEditor.refreshStudioLayout();
        } else {
            AppState.engine.DialogEditor.renderStoryGraph();
        }
    },

    handleGraphCanvasClick(event) {
        if (event.target.id === 'graph-canvas' || event.target.id === 'graph-connections-svg' || event.target.classList.contains('graph-nodes-layer')) {
            AppState.engine.DialogEditor.closeSceneStudio();
        }
    },

    refreshStudioLayout() {
        const key = AppState.activeSceneKey;
        if (!key) return;

        const scene = AppState.dialogs[key];
        if (!scene) return;

        const currentLang = AppState.editorLang || 'en';
        const langUpper = currentLang.toUpperCase();

        // 1. РЕНДЕРИМ СЕКЦИЮ А1: НАСТРОЙКИ ВХОДА И ДЕКОРАЦИЙ (ЛЕВАЯ СТОРОНА)
        const metaZone = document.getElementById('studio-meta-setup-zone');
        if (metaZone) {
            const isMetaSelected = AppState.activeSegmentType === 'meta' ? 'selected-segment' : '';
            const condCount = scene.activation_conditions?.length || 0;

            metaZone.innerHTML = `
            <div class="timeline-frame-card ${isMetaSelected}" onclick="AppState.engine.DialogEditor.selectStudioSegment('meta', null)">
                <div style="font-size: 11px; font-weight: bold; color: var(--accent-blue);">⚙️ GLOBAL METADATA & ENTRY RULES</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                    Group: ${scene.meta.group || 'general'} | Background: ${scene.window_settings.backgroundImage ? 'Set' : 'None'}
                </div>
                <div style="font-size: 9px; color: var(--accent-green); margin-top: 2px; font-weight: 600;">
                    Activation Conditions (AND): ${condCount}
                </div>
            </div>
        `;
        }

        // 2. РЕНДЕРИМ СЕКЦИЮ А2: РЕЕСТР АКТЕРОВ ЗАДНЕГО ПЛАНА (ЛЕВАЯ СТОРОНА)
        const actorsZone = document.getElementById('studio-actors-registry-zone');
        if (actorsZone) {
            const isActorsSelected = AppState.activeSegmentType === 'actors' ? 'selected-segment' : '';
            const actorsCount = scene.window_settings.actors_registry?.length || 0;

            actorsZone.innerHTML = `
            <div class="timeline-frame-card ${isActorsSelected}" onclick="AppState.engine.DialogEditor.selectStudioSegment('actors', null)">
                <div style="font-size: 11px; font-weight: bold; color: var(--neon-green);">🎭 BACKGROUND ACTORS REGISTRY</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                    Registered Characters on Stage: ${actorsCount}
                </div>
            </div>
        `;
        }

        // 3. РЕНДЕРИМ СЕКЦИЮ А3: ПОСЛЕДОВАТЕЛЬНОСТЬ СТРАНИЦ NPC И КНОПКУ ИГРОКА
        const timelineList = document.getElementById('studio-timeline-sequence-list');
        if (timelineList) {
            timelineList.innerHTML = '';

            // ДОБАВЛЯЕМ КНОПКУ СОЗДАНИЯ СТРАНИЦЫ В САМЫЙ ВЕРХ ТАЙМЛАЙНА
            let timelineContentHtml = `
            <button class="primary" style="width: 100%; padding: 8px; font-size: 11px; margin-bottom: 12px; font-weight: bold; flex-shrink: 0;" 
                onclick="AppState.engine.DialogEditor.addNewSpeechPageToTimeline('${key}')">
                + Add New NPC Speech Page
            </button>
        `;

            // Генерируем массив линейных страниц NPC
            const pagesHtml = (scene.text_pages || []).map((page, pIdx) => {
                const isPageSelected = (AppState.activeSegmentType === 'npc_page' && AppState.activeSegmentIdx === pIdx) ? 'selected-segment' : '';
                const textPreview = page.text?.[currentLang] || Object.values(page.text || {})[0] || '...';
                const truncatedText = textPreview.length > 40 ? textPreview.substring(0, 40) + '...' : textPreview;
                const hasAudio = page.audio ? '🎵' : '';
                const isAuto = page.auto_advance_time > 0 ? `⏱️ ${page.auto_advance_time / 1000}s` : '🖱️ Click';

                return `
                <div class="timeline-frame-card ${isPageSelected}" draggable="true" data-page-idx="${pIdx}" onclick="AppState.engine.DialogEditor.selectStudioSegment('npc_page', ${pIdx})">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: bold; color: var(--accent-blue);">
                        <span>FRAME #${pIdx + 1} — NPC SPEECH</span>
                        <span style="font-size: 9px; color: var(--text-muted); font-weight: normal;">${hasAudio} ${isAuto}</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #fff; margin-top: 4px;">${page.speaker_id || 'UNKNOWN SPEAKER'}</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px; font-style: italic;">"${truncatedText}"</div>
                </div>
            `;
            }).join('');

            timelineContentHtml += pagesHtml;

            // В самый конец таймлайна прикрепляем плашку РЕПЛИК ИГРОКА (Choices)
            const isChoicesSelected = AppState.activeSegmentType === 'player_choices' ? 'selected-segment' : '';
            const choicesCount = scene.player_choices?.length || 0;
            const isEnding = choicesCount === 0;

            timelineContentHtml += `
            <div class="timeline-frame-card timeline-player-card ${isChoicesSelected}" style="margin-top: 15px;" onclick="AppState.engine.DialogEditor.selectStudioSegment('player_choices', null)">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: bold; color: var(--accent-pink);">
                    <span>${isEnding ? '🏁 SCENE TERMINATION / ENDING' : '⚡ INTERACTIVE PLAYER CHOICES BRANCH'}</span>
                    <span class="btn-badge" style="background: var(--bg-main); color: var(--text-main); font-size: 9px;">${choicesCount} Routes</span>
                </div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                    ${isEnding ? 'No choices branched. Shut down overlay on click.' : 'Triggers, stat checks, and story routes switcher.'}
                </div>
            </div>
        `;

            timelineList.innerHTML = timelineContentHtml;
        }

        AppState.engine.DialogEditor.initTimelineDragAndDrop(key);

        // 4. ТРИГГЕРИМ ОБНОВЛЕНИЕ ПРАВОЙ ПАНЕЛИ ИНСПЕКТОРОВ СЕГМЕНТА
        AppState.engine.DialogEditor.renderActiveSegmentInspector();
    },

    selectStudioSegment(type, idx) {
        AppState.activeSegmentType = type;
        AppState.activeSegmentIdx = idx;

        // Мягко обновляем подсветку карточек слева и перерисовываем только правый инспектор
        AppState.engine.DialogEditor.refreshStudioLayout();
    },
    
    renderActiveSegmentInspector() {
        const zone = document.getElementById('studio-segment-inspector-zone');
        if (!zone) return;

        const key = AppState.activeSceneKey;
        const scene = AppState.dialogs[key];
        if (!scene) {
            zone.innerHTML = '';
            return;
        }

        const currentLang = AppState.editorLang || 'en';
        const langUpper = currentLang.toUpperCase();

        // Очищаем и подготавливаем контейнер инспектора
        zone.innerHTML = '';

        // ----------------------------------------------------------------------
        // КЕЙС 1: ГЛОБАЛЬНЫЕ МЕТАДАННЫЕ И УСЛОВИЯ ВХОДА
        // ----------------------------------------------------------------------
        if (AppState.activeSegmentType === 'meta') {
            const ws = scene.window_settings || {};

            // Гарантируем дефолты геометрии передней панели в конфиге перед выводом формы
            if (ws.panel_height === undefined) ws.panel_height = 40;
            if (ws.avatar_width === undefined) ws.avatar_width = 19;
            if (ws.panel_bottom === undefined) ws.panel_bottom = 1;

            zone.innerHTML = `
            <div class="inspector-panel-holder">
                <h3 style="margin: 0 0 15px 0; color: var(--accent-blue); font-size: 14px; text-transform: uppercase;">Global Configuration & Entry Rules</h3>
                
                <div class="studio-grid-2col">
                    <div class="form-group">
                        <label>Scene Configuration ID</label>
                        <input type="text" value="${key}" onchange="renameSceneKey('${key}', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Story Group / Chapter</label>
                        <input type="text" value="${scene.meta.group || ''}" oninput="AppState.dialogs['${key}'].meta.group = this.value; AppState.engine.DialogEditor.renderStoryGraph();">
                    </div>
                </div>

                <div class="studio-grid-2col">
                    <div class="form-group">
                        <label>Background Asset File Path</label>
                        <input type="text" value="${scene.window_settings.backgroundImage || ''}" oninput="AppState.dialogs['${key}'].window_settings.backgroundImage = this.value">
                    </div>
                    <div class="form-group">
                        <label>Overlay Mode Type</label>
                        <select onchange="AppState.dialogs['${key}'].window_settings.display_type = this.value">
                            <option value="fullscreen" ${scene.window_settings.display_type === 'fullscreen' ? 'selected' : ''}>Fullscreen Cinematic</option>
                            <option value="helper" ${scene.window_settings.display_type === 'helper' ? 'selected' : ''}>Helper Character Popup</option>
                        </select>
                    </div>
                </div>

                <!-- ТЗ: ПОЛЗУНКИ ГЕОМЕТРИИ ИДЕНТИФИКАТОРОВ ПЕРЕДНЕЙ ПАНЕЛИ -->
                <div style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 15px;">
                    <span style="font-size: 10px; font-weight: bold; color: var(--accent-blue); text-transform: uppercase; display: block; margin-bottom: 8px;">
                        Foreground Panel Geometry (Terminal Layout)
                    </span>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
                        <div>
                            <label>Panel Height (%): <span id="val-ph">${ws.panel_height}</span></label>
                            <input type="range" min="15" max="60" value="${ws.panel_height}" style="width:100%;" 
                                oninput="document.getElementById('val-ph').innerText = this.value; AppState.dialogs['${key}'].window_settings.panel_height = parseInt(this.value);">
                        </div>
                        <div>
                            <label>Avatar Width (%): <span id="val-aw">${ws.avatar_width}</span></label>
                            <input type="range" min="10" max="30" value="${ws.avatar_width}" style="width:100%;" 
                                oninput="document.getElementById('val-aw').innerText = this.value; AppState.dialogs['${key}'].window_settings.avatar_width = parseInt(this.value);">
                        </div>
                        <div>
                            <label>Panel Bottom (%): <span id="val-pb">${ws.panel_bottom}</span></label>
                            <input type="range" min="0" max="15" value="${ws.panel_bottom}" style="width:100%;" 
                                oninput="document.getElementById('val-pb').innerText = this.value; AppState.dialogs['${key}'].window_settings.panel_bottom = parseInt(this.value);">
                        </div>
                    </div>
                </div>

                <!-- БЛОК КОНСТРУКТОРА УСЛОВИЙ ВХОДА (SCENE ACTIVATION CONDITIONS) -->
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 11px; font-weight: bold; color: var(--text-main); text-transform: uppercase;">Scene Activation Requirements (AND)</span>
                        <button class="primary" style="padding: 2px 6px; font-size: 10px;" onclick="AppState.engine.DialogEditor.addGlobalSceneCondition('${key}')">+ Add Condition</button>
                    </div>
                    <div id="studio-global-conditions-list">
                        ${AppState.engine.DialogEditor.renderGlobalConditionsForm(key, scene.activation_conditions)}
                    </div>
                </div>
            </div>
        `;
        }


        // ----------------------------------------------------------------------
        // КЕЙС 2: РЕЕСТР АКТЕРОВ ЗАДНЕГО ПЛАНА (BACKGROUND ACTORS)
        // ----------------------------------------------------------------------
        else if (AppState.activeSegmentType === 'actors') {
            zone.innerHTML = `
            <div class="inspector-panel-holder">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--neon-green); font-size: 14px; text-transform: uppercase;">Background Actors Registry</h3>
                    <button class="primary" style="padding: 4px 8px; font-size: 11px;" onclick="AppState.engine.DialogEditor.addActorToRegistry('${key}')">+ Add Actor to Stage</button>
                </div>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: -10px; margin-bottom: 15px;">
                    Зарегистрируйте персонажей, которые физически находятся в декорациях этой локации.
                </p>
                <div id="studio-actors-registry-list">
                    ${AppState.engine.DialogEditor.renderActorsRegistryForm(key, scene.window_settings.actors_registry)}
                </div>
            </div>
        `;
        }

        // КЕЙС 3 И КЕЙС 4 БУДУТ В СЛЕДУЮЩЕМ СЛОЕ...
        else {
            AppState.engine.DialogEditor.AppState.engine.DialogEditor.renderActiveSegmentInspectorExt(key, scene, currentLang, langUpper, zone);
        }
    },
    
    renderGlobalConditionsForm(sceneKey, conditions) {
        if (!conditions || conditions.length === 0) {
            return `<p style="font-size: 11px; color: var(--text-muted); margin: 0; text-align: center; padding: 10px; border: 1px dashed var(--border-color); border-radius: 4px;">Сцена доступна всегда. Условия входа отсутствуют.</p>`;
        }

        return conditions.map((cond, condIdx) => {
            const paramOptions = (cond.type === 'stat' ? AVAILABLE_STATS : AVAILABLE_FLAGS).map(p =>
                `<option value="${p}" ${cond.param === p ? 'selected' : ''}>${p}</option>`
            ).join('');

            return `
            <div class="logic-row">
                <select style="width: 75px; flex-shrink: 0;" onchange="AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].type = this.value; AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].param = ''; AppState.engine.DialogEditor.refreshStudioLayout();">
                    <option value="stat" ${cond.type === 'stat' ? 'selected' : ''}>Stat</option>
                    <option value="flag" ${cond.type === 'flag' ? 'selected' : ''}>Flag</option>
                </select>
                
                <select style="flex: 1;" onchange="AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].param = this.value">
                    <option value="">-- Select --</option>
                    ${paramOptions}
                </select>
                
                ${cond.type === 'stat' ? `
                <select style="width: 50px; flex-shrink: 0;" onchange="AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].operator = this.value">
                    <option value=">=" ${cond.operator === '>=' ? 'selected' : ''}>&gt;=</option>
                    <option value="<=" ${cond.operator === '<=' ? 'selected' : ''}>&lt;=</option>
                    <option value="==" ${cond.operator === '==' ? 'selected' : ''}>==</option>
                </select>
                <input type="number" style="width: 45px; flex-shrink: 0;" value="${cond.value !== undefined ? cond.value : 0}" oninput="AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].value = parseInt(this.value) || 0">
                ` : `
                <select style="width: 100px; flex-shrink: 0;" onchange="AppState.dialogs['${sceneKey}'].activation_conditions[${condIdx}].value = (this.value === 'true')">
                    <option value="true" ${cond.value === true ? 'selected' : ''}>True</option>
                    <option value="false" ${cond.value === false ? 'selected' : ''}>False</option>
                </select>
                `}
                <button class="danger" style="padding: 1px 5px; height: 25px; flex-shrink: 0;" onclick="AppState.dialogs['${sceneKey}'].activation_conditions.splice(${condIdx}, 1); AppState.engine.DialogEditor.refreshStudioLayout();">×</button>
            </div>
        `;
        }).join('');
    },
    
    renderActorsRegistryForm(sceneKey, registry) {
        if (!registry || registry.length === 0) {
            return `<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px; border: 1px dashed var(--border-color); border-radius: 6px;">Реестр пуст. В этой сцене нет физических моделей персонажей на фоне.</p>`;
        }

        // Вытаскиваем список ВСЕХ доступных персонажей из глобального каталога героев
        const catalogHeroes = Object.keys(AppState.characters || {});

        if (catalogHeroes.length === 0) {
            return `<p style="font-size: 11px; color: var(--accent-red); text-align: center; padding: 10px;">Ошибка: Глобальный каталог heroes пуст или не загружен!</p>`;
        }

        // ==========================================================================
// ШАГ 3 (ЧАСТЬ 2): ИНСПЕКТОР АКТЕРОВ ЗАДНЕГО ПЛАНА (ПОЛЗУНКИ КРУПНЫХ ПЛАНОВ)
// ==========================================================================
        return registry.map((actor, aIdx) => {
            // ТЗ (4.1): Безопасно инициализируем геометрические дефолты в процентах, если их нет
            if (actor.left === undefined) actor.left = 12;   // Сдвиг по горизонтали X
            if (actor.top === undefined) actor.top = 18;     // Сдвиг по вертикали Y
            if (actor.height === undefined) actor.height = 75; // Высота спрайта (масштаб)

            // Формируем список опций героев из каталога
            const heroOptions = catalogHeroes.map(hKey => {
                const heroTitle = AppState.characters[hKey].title_loc?.[AppState.editorLang || 'en'] || hKey;
                return `<option value="${hKey}" ${actor.id === hKey ? 'selected' : ''}>${heroTitle} (${hKey})</option>`;
            }).join('');

            return `
        <div class="se-list-card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 12px; margin-bottom: 10px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; font-weight: bold; color: var(--neon-green);">
                <span>BACKGROUND ACTOR SLOT #${aIdx + 1}</span>
                <button class="danger" style="padding: 1px 5px; font-size: 9px;" onclick="AppState.dialogs['${sceneKey}'].window_settings.actors_registry.splice(${aIdx}, 1); AppState.engine.DialogEditor.refreshStudioLayout();">Remove Actor</button>
            </div>
            
            <div class="form-group">
                <label>Select Character from Catalog</label>
                <select onchange="
                    const hKey = this.value;
                    AppState.dialogs['${sceneKey}'].window_settings.actors_registry['${aIdx}'].id = hKey;
                    // ТЗ: Задник автоматически связывается с полем .image самого героя из каталога
                    AppState.dialogs['${sceneKey}'].window_settings.actors_registry['${aIdx}'].backdrop_image = AppState.characters[hKey].image || '';
                    AppState.engine.DialogEditor.refreshStudioLayout();
                ">
                    <option value="">-- Choose Character --</option>
                    ${heroOptions}
                </select>
            </div>

            <!-- ТЗ (4.1): ПОЛЗУНКИ КРУПНЫХ ПЛАНОВ И ТОЧНОГО ПОЗИЦИОНИРОВАНИЯ НА СЦЕНЕ -->
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; margin-top: 8px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 10px;">
                    
                    <!-- Ползунок X (Сдвиг слева) -->
                    <div>
                        <label>Horizontal Left (%): <span id="val-l-${aIdx}">${actor.left}</span></label>
                        <input type="range" min="0" max="100" value="${actor.left}" style="width:100%;" 
                            oninput="document.getElementById('val-l-${aIdx}').innerText = this.value; AppState.dialogs['${sceneKey}'].window_settings.actors_registry['${aIdx}'].left = parseInt(this.value);">
                    </div>
                    
                    <!-- Ползунок Y (Сдвиг сверху/снизу, поддерживает отрицательные значения для крупных планов) -->
                    <div>
                        <label>Vertical Top (%): <span id="val-t-${aIdx}">${actor.top}</span></label>
                        <input type="range" min="-50" max="100" value="${actor.top}" style="width:100%;" 
                            oninput="document.getElementById('val-t-${aIdx}').innerText = this.value; AppState.dialogs['${sceneKey}'].window_settings.actors_registry['${aIdx}'].top = parseInt(this.value);">
                    </div>
                    
                    <!-- Ползунок Высоты (Масштабирование) -->
                    <div>
                        <label>Sprite Height (%): <span id="val-h-${aIdx}">${actor.height}</span></label>
                        <input type="range" min="20" max="150" value="${actor.height}" style="width:100%;" 
                            oninput="document.getElementById('val-h-${aIdx}').innerText = this.value; AppState.dialogs['${sceneKey}'].window_settings.actors_registry['${aIdx}'].height = parseInt(this.value);">
                    </div>

                </div>
            </div>
        </div>
    `;
        }).join('');

    },
    
    addGlobalSceneCondition(sceneKey) {
        AppState.dialogs[sceneKey].activation_conditions.push({ type: "stat", param: "", operator: ">=", value: 0 });
        AppState.engine.DialogEditor.refreshStudioLayout();
    },
    addActorToRegistry(sceneKey) {
        AppState.dialogs[sceneKey].window_settings.actors_registry.push({ id: "", backdrop_image: "" });
        AppState.engine.DialogEditor.refreshStudioLayout();
    },
    
    renderActiveSegmentInspectorExt(key, scene, currentLang, langUpper, zone) {
        const allScenes = Object.keys(AppState.dialogs);

        const catalogHeroes = Object.keys(AppState.characters || {});

        // ----------------------------------------------------------------------
        // КЕЙС 3: РЕДАКТИРОВАНИЕ КОНКРЕТНОЙ СТРАНИЦЫ NPC
        // ----------------------------------------------------------------------
        // ==========================================================================
        // ШАГ 3 (ЧАСТЬ 1): ИНСПЕКТОР СТРАНИЦ NPC (ШРИФТЫ, ЦВЕТА И ЭФФЕКТЫ)
        // ==========================================================================
        if (AppState.activeSegmentType === 'npc_page') {
            const pIdx = AppState.activeSegmentIdx;
            const page = scene.text_pages[pIdx];
            if (!page) return;

            // Гарантируем наличие новых визуальных свойств в объекте кадра, чтобы избежать undefined
            if (!page.text) page.text = {};
            if (!page.font_family) page.font_family = "font-standard-sans";
            if (!page.text_effect) page.text_effect = "";
            if (!page.text_color) page.text_color = "";
            if (!page.fx) page.fx = { scene_animation: "", actor_animation: "" };

            // Собираем список персонажей для выпадающего меню спикера кадра
            const catalogHeroes = Object.keys(AppState.characters || {});
            const speakerOptions = catalogHeroes.map(hKey => {
                const heroTitle = AppState.characters[hKey].title_loc?.[AppState.editorLang || 'en'] || hKey;
                return `<option value="${hKey}" ${page.speaker_id === hKey ? 'selected' : ''}>${heroTitle}</option>`;
            }).join('');

            zone.innerHTML = `
            <div class="inspector-panel-holder">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                    <h3 style="margin:0; color:var(--accent-blue); font-size:13px; text-transform:uppercase;">Edit NPC Speech: Frame #${pIdx + 1}</h3>
                    <button class="danger" style="padding:2px 6px; font-size:10px;" onclick="AppState.dialogs['${key}'].text_pages.splice(${pIdx}, 1); AppState.engine.DialogEditor.selectStudioSegment('meta', null);">Delete Frame</button>
                </div>

                <div class="studio-grid-2col">
                    <div class="form-group">
                        <label>Speaker Character (Кто говорит)</label>
                        <select onchange="AppState.dialogs['${key}'].text_pages[${pIdx}].speaker_id = this.value; AppState.engine.DialogEditor.renderStoryGraph();">
                            <option value="NARRATOR" ${page.speaker_id === 'NARRATOR' ? 'selected' : ''}>Narrator (Рассказчик)</option>
                            ${speakerOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Portrait Side (Сторона аватара внизу)</label>
                        <select onchange="AppState.dialogs['${key}'].text_pages[${pIdx}].portrait_side = this.value">
                            <option value="left" ${page.portrait_side === 'left' ? 'selected' : ''}>Left Side (Слева)</option>
                            <option value="right" ${page.portrait_side === 'right' ? 'selected' : ''}>Right Side (Справа)</option>
                        </select>
                    </div>
                </div>

                <!-- БЛОК НАСТРОЕК ВИЗУАЛА ТЕКСТА (ТЗ: 1.1 Цвета, 1.2 Шрифты, 1.3 Спецэффекты) -->
                <div style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 14px;">
                    <span style="font-size: 10px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 8px;">Text Typography & Color Style</span>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        
                        <!-- 1.2 Выбор адаптивного шрифта -->
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Font Family</label>
                            <select onchange="AppState.dialogs['${key}'].text_pages[${pIdx}].font_family = this.value">
                                <option value="font-standard-sans" ${page.font_family === 'font-standard-sans' ? 'selected' : ''}>Standard Sans</option>
                                <option value="font-cyber-digital" ${page.font_family === 'font-cyber-digital' ? 'selected' : ''}>Cyber Digital</option>
                                <option value="font-fantasy-gothic" ${page.font_family === 'font-fantasy-gothic' ? 'selected' : ''}>Fantasy Gothic</option>
                            </select>
                        </div>
                        
                        <!-- 1.3 Выбор спецэффекта текста -->
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Text Effect FX</label>
                            <select onchange="AppState.dialogs['${key}'].text_pages[${pIdx}].text_effect = this.value">
                                <option value="">-- None (Normal) --</option>
                                <option value="fx-text-panic" ${page.text_effect === 'fx-text-panic' ? 'selected' : ''}>fx-text-panic (Panic)</option>
                                <option value="fx-text-whisper" ${page.text_effect === 'fx-text-whisper' ? 'selected' : ''}>fx-text-whisper (Whisper)</option>
                                <option value="fx-text-glitch" ${page.text_effect === 'fx-text-glitch' ? 'selected' : ''}>fx-text-glitch (Glitch)</option>
                            </select>
                        </div>
                        
                        <!-- 1.1 Свободный выбор цвета по HEX -->
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Custom HEX Color</label>
                            <input type="text" placeholder="#c9d1d9" value="${page.text_color || ''}" oninput="AppState.dialogs['${key}'].text_pages[${pIdx}].text_color = this.value">
                        </div>

                    </div>
                </div>

                <div class="form-group">
                    <label>Dialogue / Narration Text (${langUpper})</label>
                    <textarea style="min-height:50px;" placeholder="Введите реплику..." oninput="AppState.dialogs['${key}'].text_pages[${pIdx}].text['${currentLang}'] = this.value; AppState.engine.DialogEditor.renderStoryGraph();">${page.text[currentLang] || ''}</textarea>
                </div>

                <div class="studio-grid-2col" style="margin-bottom:0;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Audio File Track Path</label>
                        <input type="text" placeholder="./assets/audio/..." value="${page.audio || ''}" oninput="AppState.dialogs['${key}'].text_pages[${pIdx}].audio = this.value; AppState.engine.DialogEditor.refreshStudioLayout();">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Cinema Auto-Advance Delay</label>
                        <select onchange="AppState.dialogs['${key}'].text_pages[${pIdx}].auto_advance_time = parseInt(this.value); AppState.engine.DialogEditor.refreshStudioLayout();">
                            <option value="0" ${!page.auto_advance_time ? 'selected' : ''}>🖱️ Disabled (Click required)</option>
                            <option value="2000" ${page.auto_advance_time === 2000 ? 'selected' : ''}>⏱️ 2.0 Seconds</option>
                            <option value="4000" ${page.auto_advance_time === 4000 ? 'selected' : ''}>⏱️ 4.0 Seconds</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        }


        // ----------------------------------------------------------------------
        // КЕЙС 4: КОНСТРУКТОР ИНТЕРАКТИВНЫХ ВЫБОРОВ ИГРОКА (PLAYER CHOICES)
        // ----------------------------------------------------------------------
        // ==========================================================================
        // ШАГ 3 (ЧАСТЬ 3): ИНСПЕКТОР ВЫБОРОВ ИГРОКА (СЕТКА, REPEATABLE И ТАЙМЕРЫ)
        // ==========================================================================
        else if (AppState.activeSegmentType === 'player_choices') {
            const choices = scene.player_choices || [];

            // Гарантируем дефолтный режим отображения кнопок в конфиге сцены
            if (!scene.choices_layout_mode) scene.choices_layout_mode = "choices-layout-column";

            let choicesListHtml = choices.map((choice, cIdx) => {
                if (!choice.text) choice.text = {};
                if (!choice.conditions) choice.conditions = [];
                if (!choice.on_success) choice.on_success = { triggers: [], next_scene: "" };
                if (!choice.on_fail) choice.on_fail = { triggers: [], next_scene: "" };
                if (!choice.kind) choice.kind = "neutral";
                if (!choice.locked_behavior) choice.locked_behavior = "hide";

                // ТЗ (2.1): Гарантируем дефолты для многоразовости и таймера выбора на время
                if (choice.repeatable === undefined) choice.repeatable = false;
                if (choice.timer_sec === undefined) choice.timer_sec = 0;

                const successSceneOptions = allScenes.map(s => `<option value="${s}" ${choice.on_success.next_scene === s ? 'selected' : ''}>${s}</option>`).join('');
                const failSceneOptions = allScenes.map(s => `<option value="${s}" ${choice.on_fail.next_scene === s ? 'selected' : ''}>${s}</option>`).join('');

                return `
                <div class="choice-route-card" style="background: var(--bg-main); border: 1px solid var(--border-color); border-left: 3px solid var(--accent-pink); padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold; color:var(--accent-pink); margin-bottom:8px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
                        <span>ROUTE OPTION #${cIdx + 1}</span>
                        <button class="danger" style="padding:1px 5px; font-size:9px;" onclick="AppState.dialogs['${key}'].player_choices.splice(${cIdx}, 1); AppState.engine.DialogEditor.refreshStudioLayout();">Remove Route</button>
                    </div>

                    <div class="form-group">
                        <label>Button Choice Text (${langUpper})</label>
                        <textarea style="min-height:40px; height:40px;" placeholder="Текст на кнопке ответа..." oninput="AppState.dialogs['${key}'].player_choices[${cIdx}].text['${currentLang}'] = this.value; AppState.engine.DialogEditor.renderStoryGraph();">${choice.text[currentLang] || ''}</textarea>
                    </div>

                    <div class="studio-grid-2col">
                        <div class="form-group">
                            <label>Choice Kind Theme</label>
                            <select onchange="AppState.dialogs['${key}'].player_choices[${cIdx}].kind = this.value">
                                <option value="neutral" ${choice.kind === 'neutral' ? 'selected' : ''}>Neutral</option>
                                <option value="intellect" ${choice.kind === 'intellect' ? 'selected' : ''}>[Intellect] Logic</option>
                                <option value="romance" ${choice.kind === 'romance' ? 'selected' : ''}>[Romance] Flirt</option>
                                <option value="aggressive" ${choice.kind === 'aggressive' ? 'selected' : ''}>[Aggressive] Attack</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>If Conditions Fail</label>
                            <select onchange="AppState.dialogs['${key}'].player_choices[${cIdx}].locked_behavior = this.value; AppState.engine.DialogEditor.refreshStudioLayout();">
                                <option value="hide" ${choice.locked_behavior === 'hide' ? 'selected' : ''}>Hide Option Completely</option>
                                <option value="show_disabled" ${choice.locked_behavior === 'show_disabled' ? 'selected' : ''}>Show Grayed Out (Clickable Fail)</option>
                            </select>
                        </div>
                    </div>

                    <!-- ТЗ (2.1 & Умный Хаб): ОДНОРАЗОВОСТЬ И ТАЙМЕР ОТВЕТА НА ВРЕМЯ -->
                    <div class="studio-grid-2col" style="margin-top: 10px; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                        <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px; height:30px;">
                            <input type="checkbox" id="rep-${cIdx}" ${choice.repeatable ? 'checked' : ''} 
                                onchange="AppState.dialogs['${key}'].player_choices[${cIdx}].repeatable = this.checked;">
                            <label for="rep-${cIdx}" style="margin-bottom:0; cursor:pointer; color:var(--accent-pink); font-size:11px; font-weight:bold;">
                                🔄 Repeatable (Многоразовая тема Хаба)
                            </label>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Timed Choice Bar (Секунды, 0 — без времени):</label>
                            <input type="number" min="0" max="60" placeholder="0" value="${choice.timer_sec || 0}" 
                                oninput="AppState.dialogs['${key}'].player_choices[${cIdx}].timer_sec = parseInt(this.value) || 0">
                        </div>
                    </div>

                    <!-- ТРЕБОВАНИЯ ДОСТУПНОСТИ РЕПЛИКИ -->
                    <div style="background: var(--bg-sidebar); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:10px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">Visibility Requirements (AND)</span>
                            <button class="primary" style="padding:1px 4px; font-size:9px;" onclick="AppState.engine.DialogEditor.addChoiceSegmentCondition('${key}', ${cIdx})">+ Add Condition</button>
                        </div>
                        <div>${AppState.engine.DialogEditor.renderChoiceConditionsForm(key, cIdx, choice.conditions)}</div>
                    </div>

                    <!-- ИСХОДЫ И РАЗВИТКИ ВЫБОРА -->
                    <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
                        <div style="background: rgba(35,134,54,0.03); border: 1px solid rgba(35,134,54,0.2); padding: 10px; border-radius: 4px;">
                            <span style="font-size:10px; font-weight:bold; color:var(--accent-green); display:block; margin-bottom:4px;">ON SUCCESS TRANSITION</span>
                            <select style="margin-bottom: 6px;" onchange="AppState.dialogs['${key}'].player_choices[${cIdx}].on_success.next_scene = this.value; AppState.engine.DialogEditor.renderStoryGraph();">
                                <option value="">-- Close Dialog Overlay (End) --</option>
                                ${successSceneOptions}
                            </select>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <span style="font-size:9px; color:var(--text-muted);">Triggers / Modifiers</span>
                                <button class="primary" style="padding:0 3px; font-size:8px;" onclick="AppState.engine.DialogEditor.addChoiceSegmentTrigger('${key}', ${cIdx}, 'on_success')">+ Trigger</button>
                            </div>
                            ${renderChoiceTriggersForm(key, cIdx, 'on_success', choice.on_success.triggers)}
                        </div>

                        ${choice.locked_behavior === 'show_disabled' ? `
                        <div style="background: rgba(233,69,96,0.03); border: 1px solid rgba(233,69,96,0.2); padding: 10px; border-radius: 4px;">
                            <span style="font-size:10px; font-weight:bold; color:var(--accent-red); display:block; margin-bottom:4px;">ON FAIL TRANSITION</span>
                            <select style="margin-bottom: 6px;" onchange="AppState.dialogs['${key}'].player_choices[${cIdx}].on_fail.next_scene = this.value; AppState.engine.DialogEditor.renderStoryGraph();">
                                <option value="">-- Close Dialog Overlay (End) --</option>
                                ${failSceneOptions}
                            </select>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <span style="font-size:9px; color:var(--text-muted);">Triggers / Modifiers</span>
                                <button class="primary" style="padding:0 3px; font-size:8px;" onclick="AppState.engine.DialogEditor.addChoiceSegmentTrigger('${key}', ${cIdx}, 'on_fail')">+ Trigger</button>
                            </div>
                            ${renderChoiceTriggersForm(key, cIdx, 'on_fail', choice.on_fail.triggers)}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            }).join('');

            // ТЗ (2.2): ГЛОБАЛЬНЫЙ ВЫБОР СЕТКИ ВЫВОДА КНОПОК ДЛЯ ЭТОЙ СЦЕНЫ
            zone.innerHTML = `
            <div class="inspector-panel-holder">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <h3 style="margin:0; color:var(--accent-pink); font-size:14px; text-transform:uppercase;">Interactive Choice Branches</h3>
                    
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:10px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">Buttons Layout:</span>
                        <select style="width:120px; font-size:11px; padding:2px;" onchange="AppState.dialogs['${key}'].choices_layout_mode = this.value">
                            <option value="choices-layout-column" ${scene.choices_layout_mode === 'choices-layout-column' ? 'selected' : ''}>Vertical List</option>
                            <option value="choices-layout-grid-2col" ${scene.choices_layout_mode === 'choices-layout-grid-2col' ? 'selected' : ''}>2-Column Grid</option>
                        </select>
                    </div>

                    <button class="primary" style="padding:4px 8px; font-size:11px;" onclick="AppState.dialogs['${key}'].player_choices.push({text:{}, kind:'neutral', conditions:[], on_success:{triggers:[], next_scene:''}}); AppState.engine.DialogEditor.refreshStudioLayout();">+ Add Choice Route</button>
                </div>
                ${choicesListHtml || '<p style="font-size:11px; color:var(--text-muted); text-align:center; padding:20px; border:1px dashed var(--border-color); border-radius:4px;">Сцена линейна. Варианты выбора игрока отсутствуют.</p>'}
            </div>
        `;
        }
    },
    
    renderChoiceConditionsForm(sceneKey, choiceIdx, conditions) {
        if (!conditions || conditions.length === 0) return `<p style="font-size:9px; color:var(--text-muted); margin:0; text-align:center;">No constraints built.</p>`;

        return conditions.map((cond, condIdx) => {
            // Формируем список опций в зависимости от выбранного селектом ТИПА
            const currentOptionsList = cond.type === 'stat' ? AVAILABLE_STATS : AVAILABLE_FLAGS;
            const paramOptions = currentOptionsList.map(p =>
                `<option value="${p}" ${cond.param === p ? 'selected' : ''}>${p}</option>`
            ).join('');

            return `
            <div class="logic-row">
                <!-- Выбор ТИПА: Стат или Флаг -->
                <select style="width:65px; flex-shrink:0;" onchange="
                    AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].type = this.value; 
                    AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].param = ''; 
                    AppState.engine.DialogEditor.refreshStudioLayout();
                ">
                    <option value="stat" ${cond.type === 'stat' ? 'selected' : ''}>Stat</option>
                    <option value="flag" ${cond.type === 'flag' ? 'selected' : ''}>Flag</option>
                </select>
                
                <!-- СТРОГИЙ СЕЛЕКТ КЛЮЧА ВМЕСТО ИНПУТА -->
                <select style="flex:1;" onchange="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].param = this.value">
                    <option value="">-- Select Key --</option>
                    ${paramOptions}
                </select>
                
                ${cond.type === 'stat' ? `
                <select style="width:45px; flex-shrink:0;" onchange="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].operator = this.value">
                    <option value=">=" ${cond.operator === '>=' ? 'selected' : ''}>&gt;=</option>
                    <option value="<=" ${cond.operator === '<=' ? 'selected' : ''}>&lt;=</option>
                    <option value="==" ${cond.operator === '==' ? 'selected' : ''}>==</option>
                </select>
                <input type="number" style="width:35px; flex-shrink:0;" value="${cond.value !== undefined ? cond.value : 0}" oninput="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].value = parseInt(this.value) || 0">
                ` : `
                <select style="width:70px; flex-shrink:0;" onchange="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions[${condIdx}].value = (this.value === 'true')">
                    <option value="true" ${cond.value === true ? 'selected' : ''}>True</option>
                    <option value="false" ${cond.value === false ? 'selected' : ''}>False</option>
                </select>
                `}
                <button class="danger logic-del-btn" onclick="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].conditions.splice(${condIdx}, 1); AppState.engine.DialogEditor.refreshStudioLayout();">×</button>
            </div>
        `;
        }).join('');
    },
    renderChoiceTriggersForm(sceneKey, choiceIdx, branch, triggers) {
        if (!triggers || triggers.length === 0) return `<p style="font-size:9px; color:var(--text-muted); margin:4px 0 0 0; text-align:center;">No active triggers built.</p>`;

        return triggers.map((trig, tIdx) => {
            const currentOptionsList = trig.type === 'modify_stat' ? AVAILABLE_STATS : AVAILABLE_FLAGS;
            const paramOptions = currentOptionsList.map(p =>
                `<option value="${p}" ${trig.param === p ? 'selected' : ''}>${p}</option>`
            ).join('');

            return `
            <div class="logic-row">
                <!-- Выбор ТИПА ЭФФЕКТА -->
                <select style="width:75px; flex-shrink:0;" onchange="
                    AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers[${tIdx}].type = this.value; 
                    AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers[${tIdx}].param = ''; 
                    AppState.engine.DialogEditor.refreshStudioLayout();
                ">
                    <option value="modify_stat" ${trig.type === 'modify_stat' ? 'selected' : ''}>Mod Stat</option>
                    <option value="set_flag" ${trig.type === 'set_flag' ? 'selected' : ''}>Set Flag</option>
                </select>
                
                <!-- СТРОГИЙ СЕЛЕКТ КЛЮЧА МОДИФИКАТОРА ВМЕСТО ИНПУТА -->
                <select style="flex:1;" onchange="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers[${tIdx}].param = this.value">
                    <option value="">-- Select Key --</option>
                    ${paramOptions}
                </select>
                
                ${trig.type === 'modify_stat' ? `
                <input type="number" style="width:35px; flex-shrink:0;" value="${trig.value !== undefined ? trig.value : 0}" oninput="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers[${tIdx}].value = parseInt(this.value) || 0">
                ` : `
                <select style="width:70px; flex-shrink:0;" onchange="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers[${tIdx}].value = (this.value === 'true')">
                    <option value="true" ${trig.value === true ? 'selected' : ''}>True</option>
                    <option value="false" ${trig.value === false ? 'selected' : ''}>False</option>
                </select>
                `}
                <button class="danger logic-del-btn" onclick="AppState.dialogs['${sceneKey}'].player_choices[${choiceIdx}].${branch}.triggers.splice(${tIdx}, 1); AppState.engine.DialogEditor.refreshStudioLayout();">×</button>
            </div>
        `;
        }).join('');
    },
    
    addChoiceSegmentCondition(sceneKey, choiceIdx) {
        AppState.dialogs[sceneKey].player_choices[choiceIdx].conditions.push({ type: "stat", param: "", operator: ">=", value: 0 });
        AppState.engine.DialogEditor.refreshStudioLayout();
    },
    
    addChoiceSegmentTrigger(sceneKey, choiceIdx, branch) {
        AppState.dialogs[sceneKey].player_choices[choiceIdx][branch].triggers.push({ type: "modify_stat", param: "", value: 0 });
        AppState.engine.DialogEditor.refreshStudioLayout();
    },
    
    addNewSpeechPageToTimeline(sceneKey) {
        const scene = AppState.dialogs[sceneKey];
        if (!scene) return;

        if (!scene.text_pages) scene.text_pages = [];

        scene.text_pages.push({
            speaker_id: "SPEAKER_ID",
            expression: "normal",
            text: { en: "New narrative page text...", ru: "Новый текст страницы повествования..." },
            audio: "",
            auto_advance_time: 0,
            fx: { scene_animation: "", actor_animation: "" }
        });

        // Автоматически выделяем созданную страницу, чтобы сразу её редактировать в инспекторе справа
        AppState.engine.DialogEditor.selectStudioSegment('npc_page', scene.text_pages.length - 1);
    },
    
    selectSceneNode(key) {
        AppState.engine.DialogEditor.openSceneStudio(key);
    },
    
    autoGenerateCharacterRootScenes() {
        if (!target || !AppState.characters) return;
        if (!AppState.dialogs) AppState.dialogs = {};

        const catalogHeroes = Object.keys(AppState.characters);

        catalogHeroes.forEach(heroId => {
            const rootId = `character_dialog_${heroId}`;

            // Если авто-рут сцены для этого персонажа еще нет в конфиге — создаем её жесткую структуру
            if (!AppState.dialogs[rootId]) {
                const heroName = AppState.characters[heroId].title_loc?.[AppState.editorLang || 'en'] || heroId;

                AppState.dialogs[rootId] = {
                    activation_conditions: [],
                    meta: {
                        group: "character_hubs",
                        type: "character_root", // Специальный системный маркер
                        owner_hero_id: heroId
                    },
                    window_settings: {
                        display_type: "fullscreen",
                        backgroundImage: "transparent", // По умолчанию идет прозрачным оверлеем на UI игры
                        actors_registry: [
                            { id: heroId, position: "right" } // Сам персонаж сразу стоит справа
                        ]
                    },
                    text_pages: [], // В стартовой корневой ноде нет реплик NPC
                    // Это дефолтные темы, которые сценарист потом расширит в инспекторе
                    player_choices: [
                        {
                            text: { ru: `❓ [Лор] Поговорить с персонажем: ${heroName}`, en: `❓ [Lore] Talk to: ${heroName}` },
                            kind: "neutral",
                            repeatable: true, // Многоразовая лорная ветка по умолчанию
                            conditions: [],
                            on_success: { triggers: [], next_scene: "" }
                        }
                    ]
                };
                console.log(`[Auto-Root] Сгенерирована корневая нода-диспетчер для персонажа: "${rootId}"`);
            }
        });
    },
    
    autoGenerateCharacterRootScenes(sceneKey) {
        const scene = AppState.dialogs[sceneKey];
        if (!scene) return;

        // Прячем оверлей админки, чтобы не мешал игре
        const studioOverlay = document.getElementById('scene-studio-overlay');
        if (studioOverlay) studioOverlay.classList.add('hidden');

        console.log(`[Studio Test] Запуск тестовой сессии для ноды: "${sceneKey}"`);

        // ПРОВЕРЯЕМ ТИП НОДЫ: Обычный сюжет или Корневой диалог персонажа
        const isCharacterRoot = scene.meta?.type === 'character_root' || sceneKey.startsWith('character_dialog_');

        if (isCharacterRoot) {
            // РЕЖИМ 1: ТЕСТ ХАБА ПЕРСОНАЖА (Сразу вываливаем меню тем без страниц NPC)
            const heroId = scene.meta?.owner_hero_id || sceneKey.replace('character_dialog_', '');
            console.log(`[Studio Test] Режим: ХАБ-МЕНЮ персонажа "${heroId}"`);

            // Передаем коллбэк, который при закрытии диалога вернет автора в админку
            DialogManager.trigger(sceneKey, () => {
                AppState.engine.DialogEditor.returnToStudioAfterTest(sceneKey);
            });
        } else {
            // РЕЖИМ 2: СТАНДАРТНЫЙ ЛИНЕЙНЫЙ ТЕСТ СЦЕНЫ (С печатной машинкой и страницами)
            console.log(`[Studio Test] Режим: ЛИНЕЙНАЯ СЮЖЕТНАЯ СЦЕНА`);

            DialogManager.trigger(sceneKey, () => {
                AppState.engine.DialogEditor.returnToStudioAfterTest(sceneKey);
            });
        }
    },
    returnToStudioAfterTest(sceneKey) {
        console.log(`[Studio Test] Тест завершен. Возврат в Студию.`);

        const studioOverlay = document.getElementById('scene-studio-overlay');
        if (studioOverlay) {
            studioOverlay.classList.remove('hidden');
            AppState.engine.DialogEditor.refreshStudioLayout(); // Перерисовываем интерфейс, чтобы сбросить стейты
        }
    },
    setupStudioHeaderActions(sceneKey) {
        // Находим кнопку закрытия студии, чтобы рядом с ней вставить кнопку теста
        const headerActions = document.querySelector('.studio-header-actions');
        if (!headerActions) return;

        // Удаляем старую тестовую кнопку, если она была при прошлых открытиях
        const oldTestBtn = document.getElementById('studio-runtime-test-btn');
        if (oldTestBtn) oldTestBtn.remove();

        // Создаем новую кнопку быстрого предпросмотра
        const testBtnHtml = `
        <button class="primary" id="studio-runtime-test-btn" style="background: var(--accent-green); font-weight: bold;"
            onclick="AppState.engine.DialogEditor.launchStudioSceneTest('${sceneKey}')">
            ▶️ Test Scene
        </button>
    `;

        // Вставляем её в самое начало блока действий шапки
        headerActions.insertAdjacentHTML('afterbegin', testBtnHtml);
    },

    initTimelineDragAndDrop(sceneKey) {
        const timelineContainer = document.getElementById('studio-timeline-sequence-list');
        if (!timelineContainer) return;

        // Находим все карточки страниц NPC, у которых прописан атрибут draggable="true"
        const cards = timelineContainer.querySelectorAll('.timeline-frame-card[draggable="true"]');

        let draggedIdx = null;

        cards.forEach(card => {
            // Событие 1: Автор зажал карточку и начал её тащить
            card.addEventListener('dragstart', (e) => {
                draggedIdx = parseInt(card.getAttribute('data-page-idx'));
                card.classList.add('se-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            // Событие 2: Карточка отпущена (конец перетаскивания)
            card.addEventListener('dragend', () => {
                card.classList.remove('se-dragging');
                // Вычищаем маркеры наведения со всех карточек, если они остались
                cards.forEach(c => c.classList.remove('se-drag-over'));
            });

            // Событие 3: Зажатая карточка пролетает НАД другой карточкой
            card.addEventListener('dragover', (e) => {
                e.preventDefault(); // Обязательно для разрешения события drop
                const overIdx = parseInt(card.getAttribute('data-page-idx'));

                if (draggedIdx !== overIdx) {
                    card.classList.add('se-drag-over');
                }
            });

            // Событие 4: Мышка ушла с карточки, не отпустив её
            card.addEventListener('dragleave', () => {
                card.classList.remove('se-drag-over');
            });

            // Событие 5: Карточку бросили поверх текущей карточки (ФИНАЛ ТРАНЗИТА)
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('se-drag-over');

                const targetIdx = parseInt(card.getAttribute('data-page-idx'));
                if (draggedIdx === null || draggedIdx === targetIdx) return;

                const scene = AppState.dialogs[sceneKey];
                if (!scene || !Array.isArray(scene.text_pages)) return;

                console.log(`[Drag-and-Drop] Перемещение страницы с индекса ${draggedIdx} на ${targetIdx}`);

                // Извлекаем перемещаемую страницу из массива
                const [movedPage] = scene.text_pages.splice(draggedIdx, 1);

                // Вставляем её на новую позицию по целевому индексу
                scene.text_pages.splice(targetIdx, 0, movedPage);

                // Если перемещаемая страница была активной, переключаем фокус стейта на её новый индекс
                if (AppState.activeSegmentType === 'npc_page' && AppState.activeSegmentIdx === draggedIdx) {
                    AppState.activeSegmentIdx = targetIdx;
                } else if (AppState.activeSegmentType === 'npc_page' && AppState.activeSegmentIdx === targetIdx) {
                    AppState.activeSegmentIdx = draggedIdx;
                }

                // Мгновенно перерисовываем таймлайн с новым порядком кадров
                AppState.engine.DialogEditor.refreshStudioLayout();
            });
        });
    },
}




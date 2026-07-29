
import { AppState } from '../shared/GameState.js';

export class EditorControls {
    constructor() {
        // Локальные свойства УДАЛЕНЫ. Все данные хранятся строго в AppState.config

        this.initDOMReferences();
        this.bindEvents();
        this.updateUI();
    }

    initDOMReferences() {
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.catalogButtons = document.querySelectorAll('.catalog-btn');

        this.editorsButtons = document.querySelectorAll('.editors-btn');

        this.toolButtons = document.querySelectorAll('.tool-btn');
        this.optionsBar = document.getElementById('tool-options-bar');

        this.mapSelectDD = document.getElementById('map-select-dropdown');

        // this.btnEditorMode = document.getElementById('btn-mode-editor');
        // this.btnPlayMode = document.getElementById('btn-mode-play');
        // this.btnEndTurn = document.getElementById('btn-end-turn');
        this.menuFile = document.getElementById('menu-file');
    }

    bindEvents() {
        // Переключение глобального режима: EDITOR
        // if (this.btnEditorMode) {
        //     this.btnEditorMode.addEventListener('click', () => {
        //         this.setGlobalMode('Editor');
        //     });
        // }
        //
        // // Переключение глобального режима: PLAY
        // if (this.btnPlayMode) {
        //     this.btnPlayMode.addEventListener('click', () => {
        //         this.setGlobalMode('Play');
        //     });
        // }

        // Кнопки переключения слоев (Terrain / Objects / Characters)
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Записываем режим напрямую в Источник Правды
                AppState.editor.currentMode = btn.getAttribute('data-mode');

                // Автоматически сбрасываем выбранный ассет палитры под новый режим
                this.resetDefaultPaletteItem();
                this.updateUI();

            });
        });

        this.catalogButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // this.catalogButtons.forEach(b => b.classList.remove('active'));
                // btn.classList.add('active');

                const mode = btn.getAttribute('data-mode');
                if(!mode) return;
                AppState.engine.CatalogManager.openCatalogModal(mode);
                // Записываем режим напрямую в Источник Правды
                // AppState.config.currentMode = btn.getAttribute('data-mode');
                //
                // // Автоматически сбрасываем выбранный ассет палитры под новый режим
                // this.resetDefaultPaletteItem();
                // this.updateUI();
            });
        });

        this.editorsButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // this.catalogButtons.forEach(b => b.classList.remove('active'));
                // btn.classList.add('active');
                const mode = btn.getAttribute('data-mode');
                if(!mode) return;

                if(mode === 'screens') {
                    AppState.engine.ScreenEditor.openEditorModal(mode);
                }
                else if(mode === 'dialogs') {
                    AppState.engine.DialogEditor.initDialogModal();
                }
                else if(mode === 'assets') {
                    AppState.engine.AssetManager.openGalleryModal();
                }
                else if(mode === 'localization') {
                    AppState.engine.TranslateEditor.openTranslateModal();
                }
            });
        });

        // document.getElementById('btn-new').addEventListener('click', () => {
        //     AppState.engine.MapManager.newMap();
        // });

        document.getElementById('btn-save').addEventListener('click', () => {
            AppState.engine.MapManager.saveMap();
        });

        document.getElementById('btn-load').addEventListener('click', () => {
            AppState.engine.MapManager.loadMap();
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            AppState.engine.MapManager.exportGame();
        });

        // window.exportGame = AppState.engine.MapManager.exportGame;

        // Кнопки инструментов (Select / Brush / Eraser)
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Записываем инструмент напрямую в Источник Правды
                AppState.editor.currentTool = btn.getAttribute('data-tool');

                // Сбрасываем выделение на карте при смене инструмента, чтобы рамка не мешала
                if (window.clickManagerRef) window.clickManagerRef.deselectAll();

                this.updateUI();
            });
        });
    }

    /**
     * Сбрасывает дефолтный ассет в палитре при переключении вкладок редактора
     */
    resetDefaultPaletteItem() {
        if (AppState.editor.currentMode === 'Terrain') {
            AppState.editor.selectedPaletteItem = 'grass';
        } else if (AppState.editor.currentMode === 'Objects') {
            AppState.editor.selectedPaletteItem = 'city';
        } else if (AppState.editor.currentMode === 'Characters') {
            AppState.editor.selectedPaletteItem = 'warrior';
        }
    }

    /**
     * Переключатель глобальных состояний Editor / Play
     */
    setGlobalMode(mode) {
        AppState.editor.globalMode = mode;
        this.btnEditorMode.classList.add('active');

        const selectBtn = document.getElementById('tool-select');
        if (selectBtn) selectBtn.click();


        // if (mode === 'Editor') {
        //     if (this.btnEditorMode) this.btnEditorMode.classList.add('active');
        //     if (this.btnPlayMode) this.btnPlayMode.classList.remove('active');
        //     if (this.btnEndTurn) this.btnEndTurn.style.display = 'none';
        //     if (this.menuFile) this.menuFile.style.display = 'block';
        //
        //     // Возвращаем дефолтные кнопки редактора принудительно
        //     const selectBtn = document.getElementById('tool-select');
        //     if (selectBtn) selectBtn.click();
        //
        //     // Стираем игровые зоны ходов и стрелочки при возврате в редактор
        //     if (window.playerClickManagerRef) window.playerClickManagerRef.deselectAll();
        // } else {
        //     if (this.btnEditorMode) this.btnEditorMode.classList.remove('active');
        //     if (this.btnPlayMode) this.btnPlayMode.classList.add('active');
        //     if (this.btnEndTurn) this.btnEndTurn.style.display = 'block';
        //     if (this.menuFile) this.menuFile.style.display = 'none';
        //
        //     // Принудительно запускаем чистый пересчет Тумана Войны для старта игры
        //     if (window.playerClickManagerRef) {
        //         window.playerClickManagerRef.deselectAll();
        //         if (window.playerClickManagerRef.visionManager) {
        //             window.playerClickManagerRef.visionManager.updateFogOfWar();
        //         }
        //     }
        // }

        // Сбрасываем выделение редактора и принудительно перерисовываем PixiJS-карту
        if (window.clickManagerRef) {
            window.clickManagerRef.deselectAll();
            window.clickManagerRef.redrawMap();
        }
        this.updateUI();
    }

    /**
     * Динамическая генерация верхней панели параметров кисти на основе AppState
     */
    updateUI() {
        if (!this.optionsBar) return;

        this.optionsBar.innerHTML = '';
        this.optionsBar.style.display = 'none';

        if(AppState.engine.MapManager) {

            this.mapSelectDD.innerHTML = '';

            const btn = document.createElement('button');
            btn.id = 'btn-new'
            btn.innerText = '+ New Map';
            btn.addEventListener('click', () => {
                AppState.engine.MapManager.newMap();
            });
            this.mapSelectDD.appendChild(btn);

            Object.values(AppState.maps).forEach(m=>{
                const btn = document.createElement('button');
                btn.className = 'map-select-btn'
                btn.innerText = m.mapId;
                btn.setAttribute('data-map', m.mapId);
                if (m.mapId === AppState.map.mapId) btn.className += ' active';
                btn.addEventListener('click', () => {
                    const mapId = btn.getAttribute('data-map');
                    if(!mapId) return;

                    this.mapButtons = document.querySelectorAll('.map-select-btn');
                    this.mapButtons.forEach(b => b.classList.remove('active'));

                    btn.classList.add('active');

                    AppState.engine.MapManager.switchMap(mapId);

                    window.renderMap()
                });
                this.mapSelectDD.appendChild(btn);
            });
        }
        this.updateTools();
    }

    updateTools() {
        if (!this.optionsBar) return;

        this.optionsBar.innerHTML = '';
        // this.optionsBar.style.display = 'none';

        this.optionsBar.style.display = 'flex';

        // --- БЛОК 1: ВЫБОР АССЕТА ПАЛИТРЫ (Селектор типов ландшафта/объектов) ---
        const typeLabelG = document.createElement('div');
        typeLabelG.className = 'options-group';

        const typeLabel = document.createElement('label');
        typeLabel.innerText = `${AppState.editor.currentMode}`;
        typeLabelG.appendChild(typeLabel);
        this.optionsBar.appendChild(typeLabelG);

        // Панель параметров генерируется СТРОГО если выбрана кисть (Brush)
        if (AppState.editor.currentTool === 'Brush') {
            // this.optionsBar.style.display = 'flex';
            //
            // // --- БЛОК 1: ВЫБОР АССЕТА ПАЛИТРЫ (Селектор типов ландшафта/объектов) ---
            const typeGroup = document.createElement('div');
            typeGroup.className = 'options-group';
            //
            // const typeLabel = document.createElement('label');
            // typeLabel.innerText = `${AppState.config.currentMode}:`;
            // typeGroup.appendChild(typeLabel);

            const typeSelect = document.createElement('select');

            if (AppState.editor.currentMode === 'Terrain') {
                Object.keys(AppState.ConfigTerrain).forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.innerText = AppState.ConfigTerrain[type].name;
                    if (type === AppState.editor.selectedPaletteItem) opt.selected = true;
                    typeSelect.appendChild(opt);
                });
            } else if (AppState.editor.currentMode === 'Objects') {
                Object.keys(AppState.ConfigObject).forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.innerText = AppState.ConfigObject[type].name || AppState.ConfigObject[type].type;
                    if (type === AppState.editor.selectedPaletteItem) opt.selected = true;
                    typeSelect.appendChild(opt);
                });
            } else if (AppState.editor.currentMode === 'Characters') {
                Object.keys(AppState.ConfigCharacter).forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.innerText = type.charAt(0).toUpperCase() + type.slice(1);
                    if (type === AppState.editor.selectedPaletteItem) opt.selected = true;
                    typeSelect.appendChild(opt);
                });
            }

            // Навешиваем слушатель: выбранный ассет пишется сразу в Источник Правды
            typeSelect.addEventListener('change', (e) => {
                AppState.editor.selectedPaletteItem = e.target.value;
            });

            typeGroup.appendChild(typeSelect);
            this.optionsBar.appendChild(typeGroup);

            // --- БЛОК 2: РАЗМЕР КИСТИ (Для будущих потоковых Drag Brush) ---
            const sizeGroup = document.createElement('div');
            sizeGroup.className = 'options-group';

            const sizeLabel = document.createElement('label');
            sizeLabel.innerText = 'Size:';
            sizeGroup.appendChild(sizeLabel);

            const sizeInput = document.createElement('input');
            sizeInput.type = 'number';
            sizeInput.value = AppState.editor.brushSize;
            sizeInput.style.width = '50px';
            sizeInput.addEventListener('change', (e) => {
                AppState.editor.brushSize = parseInt(e.target.value) || 1;
            });

            sizeGroup.appendChild(sizeInput);
            this.optionsBar.appendChild(sizeGroup);

            // --- БЛОК 3: ИЗМЕНЕНИЕ ВЫСОТЫ Z-HEIGHT (Выводится ТОЛЬКО во вкладке Террейна) ---
            if (AppState.editor.currentMode === 'Terrain') {
                const heightGroup = document.createElement('div');
                heightGroup.className = 'options-group';

                const heightLabel = document.createElement('label');
                heightLabel.innerText = 'Z-Height:';
                heightGroup.appendChild(heightLabel);

                const heightInput = document.createElement('input');
                heightInput.type = 'number';
                heightInput.value = AppState.editor.brushHeightTarget;
                heightInput.setAttribute('step', '0.5');
                heightInput.style.width = '50px';
                heightInput.addEventListener('change', (e) => {
                    AppState.editor.brushHeightTarget = parseFloat(e.target.value) || 1;
                });

                heightGroup.appendChild(heightInput);
                this.optionsBar.appendChild(heightGroup);


                // 1. Вспомогательная функция для создания группы выпадающего списка
                function createSelectGroup(labelText, items, selectedValue, onChange) {
                    const group = document.createElement('div');
                    group.className = 'options-group';

                    const label = document.createElement('label');
                    label.innerText = labelText;
                    group.appendChild(label);

                    const select = document.createElement('select');

                    // Дефолтная пустая опция
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = '';
                    defaultOpt.innerText = '-';
                    if (!selectedValue) defaultOpt.selected = true;
                    select.appendChild(defaultOpt);

                    // Заполнение элементами (работает с массивами объектов)
                    (items || []).forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.id;
                        opt.innerText = item.name;
                        if (item.id === selectedValue) opt.selected = true;
                        select.appendChild(opt);
                    });

                    select.addEventListener('change', onChange);
                    group.appendChild(select);

                    return group;
                }

// 2. Основной код инициализации панелей
                const { config } = AppState;

// Фракции
                const factionGroup = createSelectGroup(
                    'Faction:',
                    Object.values(AppState.factions || {}),
                    config.selectedFactionTerrain,
                    (e) => {
                        config.selectedFactionTerrain = e.target.value;
                        config.selectedProvinceTerrain = null;
                        config.selectedRegionTerrain = null;
                    }
                );
                this.optionsBar.appendChild(factionGroup);

// Провинции
                const provinceGroup = createSelectGroup(
                    'Province:',
                    Object.values(AppState.provinces || {}),
                    config.selectedProvinceTerrain,
                    (e) => {
                        config.selectedFactionTerrain = null;
                        config.selectedProvinceTerrain = e.target.value;
                        config.selectedRegionTerrain = null;
                    }
                );
                this.optionsBar.appendChild(provinceGroup);

// Регионы
                const regionGroup = createSelectGroup(
                    'Region:',
                    Object.values(AppState.regions || {}),
                    config.selectedRegionTerrain,
                    (e) => {
                        config.selectedFactionTerrain = null;
                        config.selectedProvinceTerrain = null;
                        config.selectedRegionTerrain = e.target.value;
                    }
                );
                this.optionsBar.appendChild(regionGroup);

            }
        }
    }
}
import { HexMath } from '../shared/HexMath.js';
import { MapData } from '../shared/MapData.js';
import { AppState, getActiveMap, getTileFromState, DiplomaticPacts } from '../shared/GameState.js';

import { HistoryManager } from './HistoryManager.js';
import { EditorControls } from './EditorControls.js';
import { EditorClickManager } from './EditorClickManager.js';
import { CatalogManager } from './CatalogManager.js';
import { ScreenEditor } from './ScreenEditor.js';
import { DialogEditor } from './DialogEditor.js';
import { TranslateEditor } from './TranslateEditor.js';
import { AssetManager } from './AssetManager.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { FactionManager } from '../game/FactionManager.js';
import { MapManager } from '../game/MapManager.js';

import { TranslateManager } from '../engine/TranslateManager.js';
import { AssetLoaderManager } from '../engine/AssetLoaderManager.js';
import { AssetGalleryManager } from '../engine/AssetGalleryManager.js';
import {RenderFunctions} from '../engine/RenderFunctions.js';


window.getActiveMap = getActiveMap;

let GameId = null;

async function importGame(gameId='temp') {
    if(gameId!=='temp') {
        try {
            const currentUrl = new URL(window.location.href);
            const folderPath = currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/') + 1);

            const response = await fetch(folderPath.replace("/play","").replace("/editor","") + 'demo/games/' + gameId + '.json');
            if (!response.ok) throw new Error('Error');

            const SaveFile = await response.json();

            Object.keys(SaveFile).forEach(key=>{
                AppState[key] = SaveFile[key];
            });

            Object.keys(SaveFile.maps).forEach(mapId=>{
                AppState.maps[mapId] = SaveFile.maps[mapId];
                AppState.maps[mapId].tiles = new Map(SaveFile.maps[mapId].tiles);
            });

            if(!SaveFile.player?.mapId) {
                AppState.map = {
                    mapId: 'world_map'
                }
            }

            AppState.map.tiles = null;

            GameId = gameId;
            init();

        } catch (error) {
            console.error('JSON error:', error);
        }
    }
}

async function init() {
    if (!GameId) {
        const url = new URL(window.location.href);

        const params = Object.fromEntries(url.searchParams.entries());

        if (params.gameId) {
            await importGame(params.gameId);
            return;
        } else {
            console.error("gameId не найден в адресной строке!");
        }
    }

    AppState.editor.globalMode = 'Editor';
    AppState.editor.currentTool = 'Select';
    AppState.editor.currentMode = 'Terrain';

    AppState.engine.TranslateManager = new TranslateManager();
    AppState.engine.TranslateManager.setLanguage('en');

    AppState.engine.CatalogManager = new CatalogManager();
    AppState.engine.AssetGalleryManager = new AssetGalleryManager();
    AppState.engine.AssetManager = new AssetManager();

    AppState.engine.ScreenEditor = new ScreenEditor();
    AppState.engine.DialogEditor = DialogEditor;
    AppState.engine.TranslateEditor = TranslateEditor;

    // Запускаем менеджер управления интерфейсом
    const editorControls = new EditorControls();
    AppState.engine.editorControls = editorControls;

    // ВАЖНО: Привязываемся к обертке внутри разметки панелей
    const container = document.getElementById('app-container');
    container.innerHTML = '';

    const wrapper = document.getElementById('canvas-wrapper');

    const app = new PIXI.Application();

    await app.init({
        // Указываем PixiJS следить за размерами центральной зоны, а не всего окна браузера
        resizeTo: wrapper,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x0d1117, // Меняем фон под --bg-main редактора
        antialias: true
    });

    container.appendChild(app.canvas);

    const loader = new AssetLoaderManager();
    await loader.loadAllGameAssets(AppState.ConfigObject);

    const hexMath = new HexMath(50);

    const worldMapContainer = new PIXI.Container();
    worldMapContainer.x = hexMath.size;
    worldMapContainer.y = hexMath.height / 2;
    worldMapContainer.sortableChildren = true;
    app.stage.addChild(worldMapContainer);

    AppState.engine.app = app;
    AppState.engine.hexMath = hexMath;
    AppState.engine.worldMapContainer = worldMapContainer;

    // Сохраняем сгенерированную карту в глобальный стейт
    // AppState.maps['world_map'].tiles = mapData.tiles;

    // const mapData = new MapData(1, 1, AppState.maps['world_map'].tiles);
    // AppState.map = mapData;
    // AppState.map.mapId = 'world_map';
    // window.mapDataRef = mapData;

    MapManager.switchMap(AppState.map.mapId || 'world_map');
    AppState.engine.MapManager = MapManager;
    window.mapDataRef = AppState.map;

    editorControls.updateUI();

    AppState.engine.factionManager = new FactionManager();


    // Запускаем менеджеры ввода
    const editorClickManager = new EditorClickManager(renderMap);

    const historyManager = new HistoryManager(renderMap);
    editorClickManager.historyManager = historyManager;

    window.clickManagerRef = editorClickManager;


    function renderMap() {
        worldMapContainer.removeChildren();


        // AppState.map.tiles.forEach((tile) => {
        //     if(tile && tile.province) {
        //         tile.faction = 'lorencia';
        //     }
        // });

        AppState.map.tiles.forEach((tile) => {
            const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
            const config = AppState.ConfigTerrain[tile.type];
            if (!config) return;

            const assetVariant = config.images[tile.imageIndex] || config.images;
            const imagePath = assetVariant.base || assetVariant;
            let tileTexture = PIXI.Assets.cache.has(imagePath) ? PIXI.Assets.get(imagePath) : PIXI.Texture.WHITE;

            const groundY = pixelPos.y;
            const targetHeight = tile.height;
            const roofY = groundY - (targetHeight - 1) * AppState.config.heightStep;

            let wallTint = 0x555555;
            if (targetHeight > 1) {
                const neighbors = hexMath.getNeighbors(tile.q, tile.r);
                let maxSouthDrop = 0;
                neighbors.forEach(n => {
                    const neighborTile = AppState.engine.MapManager.getTile(n.q, n.r);
                    if (neighborTile && hexMath.cubeToPixel(neighborTile.q, neighborTile.r).y > groundY) {
                        const drop = tile.height - neighborTile.height;
                        if (drop > maxSouthDrop) maxSouthDrop = drop;
                    }
                });
                wallTint = maxSouthDrop <= 0.5 ? 0x999999 : 0x444444;
            }

            // Отрисовка стены
            if (targetHeight > 1) {
                const sliceStep = Math.max(1, Math.floor(hexMath.size * 0.05));
                for (let pixelY = groundY; pixelY >= roofY; pixelY -= sliceStep) {
                    const wallSlice = new PIXI.Sprite(tileTexture);
                    wallSlice.anchor.set(0.5, 0.5);
                    wallSlice.x = pixelPos.x; wallSlice.y = pixelY;

                    if (tileTexture !== PIXI.Texture.WHITE) {
                        wallSlice.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);
                    } else {
                        wallSlice.width = hexMath.width; wallSlice.height = hexMath.height;
                    }

                    wallSlice.tint = wallTint;

                    wallSlice.zIndex = groundY + 0.01;
                    worldMapContainer.addChild(wallSlice);
                }
            }

            // Отрисовка крышки
            const roofSprite = new PIXI.Sprite(tileTexture);
            roofSprite.anchor.set(0.5, 0.5);
            roofSprite.x = pixelPos.x; roofSprite.y = roofY;

            if (tileTexture !== PIXI.Texture.WHITE) {
                roofSprite.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);
            } else {
                roofSprite.width = hexMath.width; roofSprite.height = hexMath.height;
                roofSprite.tint = assetVariant.fallbackColor || config.fallbackColor;
            }

            roofSprite.zIndex = groundY + 0.1;

            roofSprite.tint = 0xffffff;

            worldMapContainer.addChild(roofSprite);

            const tileFactionId = AppState.engine.factionManager.getTileFaction(tile);
            const tileFaction = tileFactionId ? AppState.factions?.[tileFactionId] : null;

            const unitsOnThisTile = [];
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (char.mapPosition.q === tile.q && char.mapPosition.r === tile.r) {
                    unitsOnThisTile.push(char);
                }
            });

            if (unitsOnThisTile.length > 0) {
                unitsOnThisTile.forEach((unit, index) => {
                    const unitContainer = new PIXI.Container();

                    const shiftX = (unitsOnThisTile.length > 1) ? (index - (unitsOnThisTile.length - 1) / 2) * 14 : 0;

                    unit.visualX = pixelPos.x;
                    unit.visualY = roofY;

                    unitContainer.x = unit.visualX + shiftX;
                    unitContainer.y = unit.visualY;

                    unitContainer.zIndex = roofSprite.zIndex + 0.05 + (index * 0.01);

                    let frameImagePath = null;

                    frameImagePath = unit.image;

                    let YoffsetHeight = 12;

                    // Проверяем: загружена ли эта конкретная картинка кадра в память WebGL PixiJS v8?
                    let hasSpriteLoaded = false;
                    if (frameImagePath && typeof PIXI.Assets !== 'undefined' && PIXI.Assets.cache.has(frameImagePath)) {
                        hasSpriteLoaded = true;
                    }

                    if (hasSpriteLoaded) {
                        // =========================================================================
                        // 🟢 ВАРИАНТ А: КАРТИНКА НАЙДЕНА -> Рисуем живой покадровый спрайт ходьбы
                        // =========================================================================
                        const texture = PIXI.Assets.get(frameImagePath);
                        const characterSprite = new PIXI.Sprite(texture);
                        characterSprite.anchor.set(0.5, 1.0);

                        characterSprite.width = AppState.sizes.char.width;
                        characterSprite.height = AppState.sizes.char.height;

                        if(unit.ar) {
                            characterSprite.width = characterSprite.height / unit.ar;
                        }

                        characterSprite.y = 12;

                        if(unit.centered) {
                            characterSprite.y = characterSprite.height/2;
                            YoffsetHeight = characterSprite.height/2;
                        }

                        if (unit.isDead === true) {
                            // Смещаем точку опоры спрайта в центр, чтобы он крутился красиво, а не улетал за угол
                            characterSprite.anchor.set(0.5, 0.5);

                            // Поворачиваем на 90 градусов (Math.PI / 2 радиан) — моделька ложится на бок!
                            characterSprite.rotation = Math.PI / 2;

                            // Можно слегка притемнить труп фильтром или альфой, чтобы отличался от живых
                            characterSprite.alpha = 0.9;

                            unitContainer.zIndex = roofSprite.zIndex + 1000.05 + (index * 0.01);
                        }

                        unitContainer.addChild(characterSprite);
                    }
                    else {
                        // =========================================================================
                        // 🔴 ВАРИАНТ Б: КАРТИНКА НЕ НАЙДЕНА (FALLBACK) -> Включаем неоновый кружок
                        // =========================================================================
                        let markerColor = 0x1f6feb;
                        let strokeColor = 0x58a6ff;
                        const currentPact = AppState.engine.factionManager.getPact(AppState.player.faction, unit.faction);

                        if (unit.id === 'rafael') {
                            markerColor = 0x1f6feb;
                            strokeColor = 0x58a6ff;
                        } else if (currentPact === DiplomaticPacts.ALLIANCE) {
                            markerColor = 0x2ea44f;
                            strokeColor = 0x7ee787;
                        } else if (currentPact === DiplomaticPacts.WAR) {
                            markerColor = 0xda3637;
                            strokeColor = 0xff7b72;
                        } else if (currentPact === DiplomaticPacts.NONE || currentPact === DiplomaticPacts.NON_AGGRESSION) {
                            markerColor = 0x8b949e;
                            strokeColor = 0xc9d1d9;
                        }

                        const circle = new PIXI.Graphics();
                        circle.circle(0, 0, 14);
                        circle.fill({ color: markerColor });
                        circle.stroke({ width: 2, color: strokeColor });
                        unitContainer.addChild(circle);

                        // Стрелочка направления взгляда
                        const dirArrow = unit.direction === 'left' ? '◀' : '▶';
                        const textLabel = unit.id === 'rafael' ? `${dirArrow}${unit.name.charAt(0)}` : unit.name.charAt(0).toUpperCase();

                        const text = new PIXI.Text({
                            text: textLabel,
                            style: { fontSize: 11, fill: 0xffffff, fontWeight: 'bold' }
                        });
                        text.anchor.set(0.5, 0.5);
                        unitContainer.addChild(text);
                    }

                    // =========================================================================
                    // 📊 ОТРИСОВКА HP И ENERGY БАРОВ (КОРРЕКТИРОВКА ВЫСОТЫ НАД ГОЛОВОЙ)
                    // =========================================================================
                    if (unit.stats) {
                        const barsG = new PIXI.Graphics();

                        // Размеры индикаторов
                        const barWidth = AppState.sizes.char.width;
                        const barHeight = 4;
                        const barSpacing = 2;
                        const offsetY = -1*AppState.sizes.char.height + YoffsetHeight;

                        const startX = (unit.visualX + shiftX) - barWidth / 2;
                        const startY = unit.visualY + offsetY;

                        // 🟥 1. HP БАР
                        const currentHp = unit.stats.hp || 0;
                        const maxHp = unit.stats.maxHp || 100;
                        const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));

                        barsG.beginFill(0x222222, 0.8);
                        barsG.drawRect(startX, startY, barWidth, barHeight);
                        barsG.endFill();

                        if (hpRatio > 0) {
                            barsG.beginFill(0x2ecc71);
                            barsG.drawRect(startX, startY, barWidth * hpRatio, barHeight);
                            barsG.endFill();
                        }

                        // 🟦 2. ENERGY БАР
                        const currentEnergy = unit.stats.energy || 0;
                        const maxEnergy = unit.stats.maxEnergy || 100;
                        const energyRatio = Math.max(0, Math.min(1, currentEnergy / maxEnergy));
                        const energyY = startY + barHeight + barSpacing;

                        barsG.beginFill(0x222222, 0.8);
                        barsG.drawRect(startX, energyY, barWidth, barHeight);
                        barsG.endFill();

                        if (energyRatio > 0) {
                            barsG.beginFill(0x3498db);
                            barsG.drawRect(startX, energyY, barWidth * energyRatio, barHeight);
                            barsG.endFill();
                        }

                        // Также поднимаем zIndex повыше, чтобы полоски не перекрывались соседними высокими тайлами ландшафта
                        barsG.zIndex = roofSprite.zIndex + 500;

                        worldMapContainer.addChild(barsG);
                    }

                    if (unit.type === 'city') {
                        unit.province = tile.province;

                        const cityG = new PIXI.Graphics();

                        // 1. Координаты строго ПОД картинкой города
                        const centerX = unit.visualX + shiftX;
                        // Спускаемся от верха юнита ровно на высоту картинки + небольшой зазор в 4px
                        const startY = unit.visualY + AppState.sizes.hex/2;// .height + 4;

                        // 2. Текст названия и дохода
                        const cityName = unit.name || 'City';
                        const cityIncome = unit.production?.gold >= 0 ? `+${unit.production?.gold}` : `${unit.production?.gold || 0}`;
                        const infoText = `${cityName} (${cityIncome})`;

                        const textStyle = new PIXI.TextStyle({
                            fontFamily: 'sans-serif',
                            fontSize: 11,
                            fill: '#ffffff',
                            align: 'center'
                        });

                        const cityText = new PIXI.Text(infoText, textStyle);

                        // Центрируем текст ровно по центру под картинкой
                        cityText.anchor.set(0.5, 0);
                        cityText.x = centerX;
                        cityText.y = startY;

                        // 3. Полупрозрачная плашка (подстраивается под длину текста)
                        const bgPaddingHorizontal = 6;
                        const bgPaddingVertical = 3;
                        const bgWidth = AppState.sizes.char.width;// cityText.width + bgPaddingHorizontal * 2;
                        const bgHeight = cityText.height + bgPaddingVertical * 2;

                        // Центрируем плашку относительно centerX
                        const bgX = centerX - bgWidth / 2;
                        const bgY = startY - bgPaddingVertical;

                        const cityTextBg = tileFaction ? tileFaction.color : 0x000000;
                        // Рисуем подложку
                        cityG.beginFill(cityTextBg, 0.6);
                        cityG.drawRoundedRect(bgX, bgY, bgWidth, bgHeight, 4);
                        cityG.endFill();

                        // 4. Сортировка слоев поверх ландшафта
                        cityG.zIndex = roofSprite.zIndex + 500;
                        cityText.zIndex = cityG.zIndex + 1;

                        // Добавляем на карту
                        worldMapContainer.addChild(cityG);
                        worldMapContainer.addChild(cityText);
                    }


                    if (unit.currentPassiveCircleG) {
                        if (unit.currentPassiveCircleG.parent) {
                            unit.currentPassiveCircleG.parent.removeChild(unit.currentPassiveCircleG);
                        }
                        unit.currentPassiveCircleG.destroy();
                        unit.currentPassiveCircleG = null;
                    }

                    // Если у юнита есть активные эффекты в стейте
                    if (unit.effects && unit.effects.length > 0) {
                        unit.effects.forEach(eff => {
                            // Читаем ID эффекта, учитывая оба возможных ключа из вашей структуры данных
                            const effId = eff.id || eff.effect_id;
                            if (!effId || !AppState.effects) return;

                            const effectConfig = AppState.effects[effId];
                            // Строгая защита от undefined: если такого конфига нет, просто пропускаем
                            if (!effectConfig) return;

                            const activeHexG = new PIXI.Graphics();

                            // Динамически берем цвет ИЗ ПЕРЕМЕННОЙ конфигурации эффекта
                            let color = 0xffffff; // Дефолтный белый
                            if (effectConfig.visual_color === "gold") color = 0xf1c40f;
                            if (effectConfig.visual_color === "orange") color = 0xff6b6b;
                            if (effectConfig.visual_color === "blue") color = 0x00d2ff;
                            if (effectConfig.visual_color === "green") color = 0x2ecc71;
                            if (effectConfig.visual_color === "purple") color = 0x9b59b6;
                            if (effectConfig.visual_color === "white") color = 0xffffff;

                            const radius = hexMath.size * 0.5;

                            const passiveHexG = new PIXI.Graphics();

                            passiveHexG.lineStyle(5, color, 1);
                            passiveHexG.beginFill(0xffffff, 0);

                            const centerX = unit.visualX + shiftX;
                            const centerY = unit.visualY + YoffsetHeight;

                            const h = Math.sqrt(3) * radius;

                            const points = [
                                centerX + radius,       centerY,
                                centerX + radius / 2,   centerY + h / 2,
                                centerX - radius / 2,   centerY + h / 2,
                                centerX - radius,       centerY,
                                centerX - radius / 2,   centerY - h / 2,
                                centerX + radius / 2,   centerY - h / 2
                            ];

                            passiveHexG.drawCircle(centerX, centerY, radius);
                            passiveHexG.endFill();

                            // passiveHexG.drawPolygon(points);
                            // passiveHexG.endFill();

                            passiveHexG.zIndex = roofSprite.zIndex + 0.01;

                            worldMapContainer.addChild(passiveHexG);
                        });
                    }

                    worldMapContainer.addChild(unitContainer);
                });
            }

            // Черный контур рельефа гекса
            const strokeGraphics = new PIXI.Graphics();
            const localCorners = hexMath.getHexCornerPoints(0, 0);
            strokeGraphics.poly(localCorners, true);
            strokeGraphics.stroke({ width: 1.5, color: 0x000000, alpha: 0.25 });
            strokeGraphics.x = pixelPos.x;
            strokeGraphics.y = roofY;
            strokeGraphics.zIndex = roofSprite.zIndex + 0.02;



            worldMapContainer.addChild(strokeGraphics);


            // if (tileFaction) {
            //     const factionConfig = tileFaction || { color: 0x0077ff, strokeColor: 0x00dfff };
            //
            //     const fillColor = factionConfig.color;
            //     const strokeColor = factionConfig.strokeColor;
            //     const fillAlpha = 0.3;
            //
            //     // Рисуем фон
            //     strokeGraphics.poly(localCorners, true);
            //     strokeGraphics.fill({ color: fillColor, alpha: fillAlpha });
            // } && tile.q===10 && tile.r===7
            if (tileFaction || tile.province) {
                RenderFunctions.drawFactionBorders(tile, pixelPos, roofY, roofSprite.zIndex);
            }

        });

        // Обновляем рамку селекта
        if (editorClickManager.selectedTile) {
            editorClickManager.executeSelectTool(editorClickManager.selectedTile);
        }


        worldMapContainer.sortChildren();

        app.render();
    }

    window.newMap = ()=> {
        AppState.map = new MapData(1, 1);
        AppState.map.mapId = 'world_map';
        AppState.maps['world_map'] = AppState.map;
        renderMap();
    }

    renderMap();
    window.renderMap = renderMap;

    // =========================================================================
    // 🎮 ОБРАБОТКА СУЩЕСТВУЮЩЕЙ КАМЕРЫ + КЛИКОВ ПО КАНВАСУ
    // =========================================================================
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    let isDragging = false;
    let hasMoved = false; // Флаг, чтобы отличать перетаскивание карты от точечного клика
    let dragStartPos = { x: 0, y: 0 };
    let mapStartPos = { x: 0, y: 0 };
    let currentZoom = 1.0;


    const selectionMarker = new PIXI.Graphics();
    const markerCorners = hexMath.getHexCornerPoints(0, 0);
    selectionMarker.poly(markerCorners, true);
    selectionMarker.stroke({ width: 3.5, color: 0x58a6ff, alpha: 0.9 });
    selectionMarker.visible = false;

    window.selectionMarkerRef = selectionMarker;

    // Возвращаем на место маркер голубого выделения и вешаем его в контейнер заново
    worldMapContainer.addChild(window.selectionMarkerRef);

    app.stage.on('pointerdown', (event) => {
        isDragging = true;
        hasMoved = false; // Обнуляем при каждом нажатии
        dragStartPos.x = event.global.x;
        dragStartPos.y = event.global.y;
        mapStartPos.x = worldMapContainer.x;
        mapStartPos.y = worldMapContainer.y;
    });

    app.stage.on('pointerup', (event) => {
        isDragging = false;
        if (!hasMoved) {
            const canvasX = event.data.global.x;
            const canvasY = event.data.global.y;

            editorClickManager.handleMapClick(canvasX, canvasY);
        }
    });

    app.stage.on('pointermove', (event) => {
        if (isDragging) {
            const dx = event.global.x - dragStartPos.x;
            const dy = event.global.y - dragStartPos.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

            worldMapContainer.x = mapStartPos.x + dx;
            worldMapContainer.y = mapStartPos.y + dy;
        } else {
            const canvasX = event.data.global.x;
            const canvasY = event.data.global.y;
        }
    });

    app.stage.on('pointerupoutside', () => isDragging = false);

    // Зум к курсору
    app.canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);
        const mouseX = event.clientX - wrapper.getBoundingClientRect().left;
        const opacityY = event.clientY - wrapper.getBoundingClientRect().top;
        const localX = (mouseX - worldMapContainer.x) / currentZoom;
        const localY = (opacityY - worldMapContainer.y) / currentZoom;
        currentZoom = newZoom;

        AppState.camera.currentZoom = currentZoom;

        worldMapContainer.scale.set(currentZoom);
        worldMapContainer.x = mouseX - localX * currentZoom;
        worldMapContainer.y = opacityY - localY * currentZoom;
    }, { passive: false });


    app.ticker.add((ticker) => {
        const deltaMS = ticker.deltaTime * (1000 / 60);
        const hexMath = AppState.engine.hexMath;
        let needRedraw = false;

        if (needRedraw) {
            renderMap();
        }
    });

}


window.init = init;

window.AppState = AppState;

init().catch(console.error);
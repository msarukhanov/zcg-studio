import { HexMath } from '../shared/HexMath.js';
import { MapData } from '../shared/MapData.js';
import { renderTile } from '../shared/render.js';

import { AppState, getActiveMap, getTileFromState, DiplomaticPacts } from '../shared/GameState.js';

import { InitEngine } from '../engine/engine.js';
import { AssetLoaderManager } from '../engine/AssetLoaderManager.js';
import { ScreenManager } from '../screens/ScreenManager.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { PlayerClickManager } from '../game/PlayerClickManager.js';

import { SaveLoadManager } from '../game/SaveLoadManager.js';

import {RenderFunctions} from '../engine/RenderFunctions.js';

window.AppState = AppState;

let screenManager = null;
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

            if(SaveFile.maps) {

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
            }

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

    window.applyGlobalAutoRotation();
    window.loaderControl.start();

    const loader = new AssetLoaderManager();
    await loader.loadAllGameAssets();

    const container = document.getElementById('main-container');
    screenManager = new ScreenManager(container);

    // Закрепляем ссылку в движке игры, чтобы другие менеджеры могли переключать экраны
    AppState.engine.ScreenManager = screenManager;
    AppState.engine.SaveLoadManager = SaveLoadManager;

    if (AppState.engine.SaveLoadManager) {
        AppState.engine.SaveLoadManager.captureInitialState(AppState);
    }

    // 3. Вызываем триггер отрисовки Главного Меню из конфига админки
    console.log("🖥️ Вывод стартового экрана [main_menu]...");
    screenManager.renderScreen('main_menu');
}


async function init2(isNewGame = false) {

    let worldMapContainer;
    let uiLayerContainer;
    let hexMath;
    let app;
    let playerClickManager;


    // AppState.isPlatformerMode = true;
    //
    // window.loaderControl.start();
    //
    // const loader = new AssetLoaderManager();
    // await loader.loadAllGameAssets(TerrainConfig, ObjectConfig);
    if(AppState.maps) {
        const container = document.getElementById('app-container');
        const wrapper = document.getElementById('canvas-wrapper');

        const size = wrapper.clientHeight / 2 / AppState.sizes.hexesRad;
        const charHeight = AppState.sizes.char.heightPercent/100 * size;
        const objHeight = AppState.sizes.obj.heightPercent/100 * size;

        AppState.sizes = {
            hex: size,
            hexesRad: AppState.sizes.hexesRad,
            char: {
                aspect_ratio: AppState.sizes.char.aspect_ratio,
                heightPercent: AppState.sizes.char.heightPercent,
                width: charHeight * AppState.sizes.char.aspect_ratio,
                height: charHeight,
            },
            obj: {
                aspect_ratio: AppState.sizes.obj.aspect_ratio,
                heightPercent: AppState.sizes.obj.heightPercent,
                width: objHeight * AppState.sizes.obj.aspect_ratio,
                height: objHeight,
            },
        };

        app = new PIXI.Application();

        await app.init({
            resizeTo: wrapper,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundColor: 0x0d1117,
            antialias: true
        });

        container.appendChild(app.canvas);

        hexMath = new HexMath(AppState.sizes.hex);

        worldMapContainer = new PIXI.Container();
        worldMapContainer.x = hexMath.size;
        worldMapContainer.y = hexMath.height / 2;
        worldMapContainer.sortableChildren = true;
        app.stage.addChild(worldMapContainer);
        AppState.engine.worldMapContainer = worldMapContainer;

        uiLayerContainer = new PIXI.Container();
        uiLayerContainer.x = worldMapContainer.x;
        uiLayerContainer.y = worldMapContainer.y;
        uiLayerContainer.sortableChildren = true;
        uiLayerContainer.eventMode = 'passive';
        AppState.engine.uiLayerContainer = uiLayerContainer;

        app.stage.addChild(uiLayerContainer);

        AppState.engine.app = app;
        AppState.engine.hexMath = hexMath;

    }

    window.applyGlobalAutoRotation();

    InitEngine();


    AppState.engine.skillManager.redrawMap = renderMap;

    AppState.engine.combatManager.redrawMap = renderMap;

    playerClickManager = new PlayerClickManager(renderMap);
    AppState.engine.playerClickManager = playerClickManager;
    // AppState.engine.MapManager.loadMap();
    //
    if(isNewGame) {
        console.log("NEW GAME =====");

        AppState.camera = {
            "currentZoom": 1,
            "x": 0,
            "y": 0
        };

        const defaultCharacterProperties = {
            cachedReachableTiles: null,
            action: 'idle',
            currentMovementVisualPath: [],
            movementLerpTime: 0,
            visualX: 0,
            visualY: 0,
            direction: 'right',

            currentFrameIndex: 0,
            frameTimer: 0,
            frameDuration: 100,
            animations: {
                idle: { left: [], right: [] },
                move: { left: [], right: [] }
            }
        };

        if(AppState.characters) {
            Object.values(AppState.characters).forEach(char => {
                const defaults = structuredClone(defaultCharacterProperties);
                Object.assign(char, {
                    ...defaults,
                    ...char,
                    animations: {
                        idle: { ...defaults.animations.idle, ...(char.animations?.idle || {}) },
                        move: { ...defaults.animations.move, ...(char.animations?.move || {}) }
                    }
                });
                AppState.engine.CharacterLevelUpManager.initCharacterExpAndStats(char);
            });
        }


        if(AppState.factions) {
            Object.values(AppState.factions).forEach(f => {
                AppState.engine.factionManager.updateFactionProduction(f.id);
            });
        }

        AppState.player.exploredTiles = new Set();

        AppState.play.activeCharacterId = AppState.player.character;
        AppState.play.activeFactionId = AppState.player.faction;
        AppState.play.visibleTiles = new Set();

        AppState.engine.MapManager.switchMap('world_map');

        if (AppState.player?.character && AppState.game_settings) {
            playerClickManager.executeCharacterSelect(AppState.player.character);

            if (AppState.engine.centerCameraOnCharacter) {
                AppState.engine.centerCameraOnCharacter(AppState.player.character);
            }
        }


        AppState.engine.visionManager.updateFogOfWar();
    }

    if(AppState.maps) {
        AppState.engine.MapManager.switchMap('world_map');

        if (AppState.player?.character && AppState.game_settings && AppState.game_settings.playerType === 'character') {
            playerClickManager.executeCharacterSelect(AppState.player?.character);

            if (AppState.engine.centerCameraOnCharacter) {
                AppState.engine.centerCameraOnCharacter(AppState.play.activeCharacterId);
            }
        }

        AppState.engine.visionManager.updateFogOfWar();
    }

    AppState.engine.uiManager.init();
    AppState.engine.questManager.refreshQuestChains();


    let isDragging = false;
    let hasMoved = false; // Флаг, чтобы отличать перетаскивание карты от точечного клика
    let dragStartPos = { x: 0, y: 0 };
    let mapStartPos = { x: 0, y: 0 };
    let currentZoom = 1.0;

    function renderMap() {
        if(!AppState.maps) return;

        worldMapContainer.removeChildren();

        uiLayerContainer.visible = true;

        AppState.map.tiles.forEach((tile) => {

            const renderedTile = renderTile(tile);
            if(!renderedTile) return;

            const {pixelPos, roofY, isVisible, roofSprite, isVisited, tileFaction} = renderedTile;

            const unitsOnThisTile = [];
            let charsOnThisTile = 0;

            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (char.mapPosition.q === tile.q && char.mapPosition.r === tile.r) {
                    unitsOnThisTile.push(char);
                    const isChar = !!AppState.characters[char.id];
                    // const isObject = !!AppState.objects[char.id];
                    if(isChar) charsOnThisTile++;
                }
            });

            if (unitsOnThisTile.length > 0 && isVisible) {
                unitsOnThisTile.forEach((unit, index) => {
                    const unitContainer = new PIXI.Container();

                    // Сдвиг по оси X, если на одном гексе стоят несколько союзников/нейтралов
                    const shiftX = (charsOnThisTile > 1) ? (index - (charsOnThisTile - 1) / 2) * 14 : 0;

                    // --- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Читаем плавные визуальные координаты из AppState ---
                    // Если персонаж в покое — его visualX/visualY равны центру 3D-крышки гекса
                    if (!unit.action || unit.action === 'idle') {
                        unit.visualX = pixelPos.x;
                        unit.visualY = roofY;
                    }

                    const isObject = !!AppState.objects[unit.id];
                    const isChar = !!AppState.characters[unit.id];

                    unitContainer.x = unit.visualX + (isObject?0:shiftX);
                    unitContainer.y = unit.visualY;

                    // --- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ДИНАМИЧЕСКИЙ Z-INDEX В ПОЛЕТЕ ---
                    if (unit.action === 'move') {
                        // Если персонаж идет — выставляем ему огромный zIndex (10000).
                        // Он взлетит над любыми 3D-стенами и деревьями на своем пути!
                        unitContainer.zIndex = 10000 + index;
                    } else {
                        // Если он стоит — возвращаем классический изометрический zIndex крышки гекса
                        unitContainer.zIndex = roofSprite.zIndex + 0.05 + (index * 0.01);
                    }

                    let frameImagePath = null;

                    if (unit.animations && unit.animations[unit.action] && unit.animations[unit.action][unit.directionV]) {
                        const animArray = unit.animations[unit.action][unit.directionV];
                        if (animArray && animArray.length > 0) {
                            // Берем строковую ссылку на .png на основе высчитанного в тикере индекса
                            frameImagePath = animArray[unit.currentFrameIndex % animArray.length];
                        }
                    }
                    else if (unit.animations && unit.animations[unit.action] && unit.animations[unit.action][unit.direction]) {
                        const animArray = unit.animations[unit.action][unit.direction];
                        if (animArray && animArray.length > 0) {
                            // Берем строковую ссылку на .png на основе высчитанного в тикере индекса
                            frameImagePath = animArray[unit.currentFrameIndex % animArray.length];
                        }
                    }
                    else {
                        frameImagePath = unit.image;
                    }

                    // Проверяем: загружена ли эта конкретная картинка кадра в память WebGL PixiJS v8?
                    let hasSpriteLoaded = false;
                    if (frameImagePath && typeof PIXI.Assets !== 'undefined' && PIXI.Assets.cache.has(frameImagePath)) {
                        hasSpriteLoaded = true;
                    }

                    let YoffsetHeight = 12;

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

                        const maxHexWidth = 1.73205 * AppState.sizes.hex;

                        if (characterSprite.width > maxHexWidth) {
                            // Принудительно вписываем ширину в границы гекса
                            characterSprite.width = maxHexWidth;

                            // Пропорционально пересчитываем высоту обратно, чтобы сохранить аспект рэшио!
                            if (unit.ar) {
                                // Если ширина = высота / ar, значит новая высота = ширина * ar
                                characterSprite.height = characterSprite.width * unit.ar;
                            } else {
                                // Фолбэк на случай, если ar в конфиге почему-то забыли прописать:
                                // Берем оригинальное соотношение сторон текстуры самого спрайта
                                const textureAr = characterSprite.texture.height / characterSprite.texture.width;
                                characterSprite.height = characterSprite.width * textureAr;
                            }
                        }

                        characterSprite.y = 12;

                        if(unit.centered) {
                            characterSprite.y = characterSprite.height/2;
                            YoffsetHeight = characterSprite.height/2;
                        }

                        if (unit.damageFlashTimer && unit.damageFlashTimer > 0) {
                            characterSprite.tint = 0xff5555; // Красим созданный Pixi-спрайт в красный урон
                        }
                        else if (unit.healFlashTimer && unit.healFlashTimer > 0) {
                            characterSprite.tint = 0x55ff55; // Красим созданный Pixi-спрайт в зеленый хил
                        }
                        else {
                            characterSprite.tint = 0xffffff; // Чистый, исходный цвет ассета без мутаций
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
                        if(tile.province) {
                            unit.province = tile.province;
                        }
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
                            const centerY = unit.visualY;

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
        });



        if (AppState.engine.pathRenderer) {
            AppState.engine.pathRenderer.clearPath();
        }

        if (AppState.play.activeCharacterId) {
            const activeChar = AppState.entities[AppState.play.activeCharacterId];
            const charTile = getTileFromState(activeChar.mapPosition.q, activeChar.mapPosition.r);

            // ИСПРАВЛЕНИЕ: Если Рафаэль прямо сейчас ИДЕТ (char.action === 'moving'),
            // мы временно ПОЛНОСТЬЮ тушим старую зону хода на экране, чтобы она не сбивала с толку
            if (activeChar && activeChar.action !== 'move') {
                if (AppState.play.cachedReachableTiles && AppState.play.cachedReachableTiles.length > 0) {
                    AppState.engine.pathRenderer.drawMovementZone(AppState.play.cachedReachableTiles);
                }
            } else {
                if (AppState.engine.pathRenderer) AppState.engine.pathRenderer.clearZone(); // Скрываем подложки на время анимации
            }

            // Рисуем стрелочки путей в покое
            if (activeChar.currentActivePath && activeChar.currentActivePath.length > 0 && activeChar.action !== 'move') {
                AppState.engine.pathRenderer.drawPath(activeChar.currentActivePath, activeChar);
            }
        }

        worldMapContainer.sortChildren();
        uiLayerContainer.sortChildren();
        app.render();
    }

    if(AppState.maps) {
        renderMap();
        window.renderMap = renderMap;

        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;

        app.stage.on('pointerdown', (event) => {
            isDragging = true;
            hasMoved = false; // Обнуляем при каждом нажатии

            // 🌟 СТРОГИЙ ФИКС: Запоминаем стартовую позицию драга в виртуальном масштабе
            if (window.windowResized) {
                dragStartPos.x = event.global.y / window.innerWidth * window.innerHeight;
                dragStartPos.y = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
            } else {
                dragStartPos.x = event.global.x;
                dragStartPos.y = event.global.y;
            }

            mapStartPos.x = worldMapContainer.x;
            mapStartPos.y = worldMapContainer.y;
        });

        app.stage.on('pointerup', (event) => {
            isDragging = false;
            if (!hasMoved) {
                let canvasX = event.global.x;
                let canvasY = event.global.y;

                if (window.windowResized) {
                    canvasX = event.global.y / window.innerWidth * window.innerHeight;
                    canvasY = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
                }

                playerClickManager.handleMapClick(canvasX, canvasY);
            }
        });

        app.stage.on('pointermove', (event) => {
            const settings = AppState.game_settings;

            let currentVirtualX = event.global.x;
            let currentVirtualY = event.global.y;

            if (window.windowResized) {
                currentVirtualX = event.global.y / window.innerWidth * window.innerHeight;
                currentVirtualY = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
            }

            if (isDragging) {
                if (settings.playerCamera === 'fixed') {
                    return;
                }
                // Разница вычисляется между виртуальными координатами
                const dx = currentVirtualX - dragStartPos.x;
                const dy = currentVirtualY - dragStartPos.y;

                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

                // Драг самого контейнера идет по стандартным осям, так как CSS уже повернул контейнер
                worldMapContainer.x = mapStartPos.x + dx;
                worldMapContainer.y = mapStartPos.y + dy;

                // Синхронизируем UI-слой, если он используется
                if (typeof uiLayerContainer !== 'undefined') {
                    uiLayerContainer.x = worldMapContainer.x;
                    uiLayerContainer.y = worldMapContainer.y;
                }
            } else {
                // 🌟 СТРОГИЙ ФИКС HOVER: Подсовываем менеджеру подсветки гексов правильные координаты
                // playerClickManager.handleMapHover(currentVirtualX, currentVirtualY);
            }
        });

        app.stage.on('pointerupoutside', () => isDragging = false);

        // Зум к курсору
        // app.canvas.addEventListener('wheel', (event) => {
        //     const settings = AppState.game_settings;
        //     if (settings.playerCamera === 'fixed') {
        //         return
        //     }
        //     event.preventDefault();
        //     // const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        //     // const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);
        //     // const mouseX = event.clientX - wrapper.getBoundingClientRect().left;
        //     // const opacityY = event.clientY - wrapper.getBoundingClientRect().top;
        //     // const localX = (mouseX - worldMapContainer.x) / currentZoom;
        //     // const localY = (opacityY - worldMapContainer.y) / currentZoom;
        //     // currentZoom = newZoom;
        //     //
        //     // AppState.camera.currentZoom = currentZoom;
        //     //
        //     // worldMapContainer.scale.set(currentZoom);
        //     // worldMapContainer.x = mouseX - localX * currentZoom;
        //     // worldMapContainer.y = opacityY - localY * currentZoom;
        //     //
        //     // uiLayerContainer.scale.set(currentZoom);
        //     // uiLayerContainer.x = worldMapContainer.x;
        //     // uiLayerContainer.y = worldMapContainer.y;
        //
        //     const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        //     const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);
        //
        //     // clientX и clientY — это сырые координаты окна браузера.
        //     // Если у тебя CSS повернул body/wrapper, то mouseX и mouseY для зума нужно скорректировать по твоей же схеме
        //     let mouseX = event.clientX - wrapper.getBoundingClientRect().left;
        //     let mouseY = event.clientY - wrapper.getBoundingClientRect().top;
        //
        //     if (window.windowResized) {
        //         const rawX = mouseX;
        //         const rawY = mouseY;
        //         // Разворачиваем оси координат мыши относительно физического окна обертки
        //         mouseX = rawY / window.innerWidth * window.innerHeight;
        //         mouseY = window.innerWidth - rawX / window.innerHeight * window.innerWidth;
        //     }
        //
        //     const localX = (mouseX - worldMapContainer.x) / currentZoom;
        //     const localY = (mouseY - worldMapContainer.y) / currentZoom;
        //     currentZoom = newZoom;
        //
        //     AppState.camera.currentZoom = currentZoom;
        //
        //     worldMapContainer.scale.set(currentZoom);
        //     worldMapContainer.x = mouseX - localX * currentZoom;
        //     worldMapContainer.y = mouseY - localY * currentZoom;
        //
        //     if (typeof uiLayerContainer !== 'undefined') {
        //         uiLayerContainer.scale.set(currentZoom);
        //         uiLayerContainer.x = worldMapContainer.x;
        //         uiLayerContainer.y = worldMapContainer.y;
        //     }
        // }, { passive: false });



        // =========================================================================
        // 🔄 ЕДИНЫЙ ИГРОВОЙ ТИКЕР: ПЛАВНОЕ ДВИЖЕНИЕ, ДИНАМИЧЕСКИЙ Z-INDEX И ОБНОВЛЕНИЕ ЗОНЫ
        // =========================================================================
        app.ticker.add((ticker) => {
            const deltaMS = ticker.deltaTime * (1000 / 60);
            const hexMath = AppState.engine.hexMath;
            let needRedraw = false;

            // Сканируем всех персонажей в глобальном стейте AppState
            Object.keys(AppState.entities).forEach(charId => {
                const char = AppState.entities[charId];
                if(!char) return;

                if (char.damageFlashTimer > 0) {
                    char.damageFlashTimer = Math.max(0, char.damageFlashTimer - deltaMS);
                    needRedraw = true; // Пока персонаж горит красным — заставляем холст обновляться
                }

                if (char.healFlashTimer > 0) {
                    char.healFlashTimer = Math.max(0, char.healFlashTimer - deltaMS);
                    needRedraw = true; // Пока персонаж горит зеленым — заставляем холст обновляться
                }

                if (char.animations && char.animations[char.action]) {
                    const currentActionAnims = char.animations[char.action][char.direction];

                    if (currentActionAnims && currentActionAnims.length > 1) {
                        char.frameTimer += deltaMS;

                        if (char.frameTimer >= char.frameDuration) {
                            char.frameTimer = 0;
                            // Циклически переключаем индекс кадра вперед
                            char.currentFrameIndex = (char.currentFrameIndex + 1) % currentActionAnims.length;
                            needRedraw = true; // Заставляем PixiJS перерисовать кадр анимации
                        }
                    } else {
                        char.currentFrameIndex = 0; // Если кадр один — жестко держим индекс 0
                    }
                }

                // Если у персонажа есть очередь клеток для плавного марш-броска
                if(AppState.engine.movementManager.animateMovement(char, deltaMS)) needRedraw = true;


                if (AppState.play.activeCharacterId && AppState.engine.updateCameraSystem && (AppState.game_settings.playerCamera === 'fixed')) {
                    AppState.engine.updateCameraSystem(ticker);
                }
            });

            if (needRedraw) {

                renderMap();
            } else if (AppState.play.activeCharacterId) {
                AppState.engine.visionManager.updateFogOfWar();
                app.render();
            }
        });


        window.stopTicker = () => {
            app.ticker.stop();
        }
        window.resumeTicker = () => {
            app.ticker.start();
        }
    }


    const btnEndTurn = document.getElementById('btn-end-turn');
    if (btnEndTurn) {
        btnEndTurn.addEventListener('click', () => {
            Object.values(AppState.entities).forEach(char => {
                char.movement.current = char.movement.max;
                // char.clearMovementCache();
            });
            AppState.engine.visionManager.updateFogOfWar();
            renderMap();
        });
    }

    // =========================================================================
    // 🎮 ОБРАБОТКА СУЩЕСТВУЮЩЕЙ КАМЕРЫ + КЛИКОВ ПО КАНВАСУ
    // =========================================================================


    if (AppState.game_settings?.audio?.music?.mute === false) {
        console.log("music start");
        AppState.engine.AudioManager.playContext('background');
    }

    AppState.engine.dialogManager.trigger("PROLOGUE_CINEMATIC");
    // AppState.engine.dialogManager.trigger("SCENE_3_0");
    // AppState.engine.dialogManager.trigger("SCENE_CLASS_START");
}

window.init2 = init2;


window.loaderControl = {
    start: () => {
        const loader = document.getElementById('loading-wrapper');
        loader.style.opacity = '1';
        loader.style.display = 'flex';
    },
    end: () => {
        const loader = document.getElementById('loading-wrapper');
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 400);
    }
};



window.applyGlobalAutoRotation = function() {
    const app = AppState.engine?.app;
    // if (!app) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Определяем, что юзер держит телефон вертикально (Портрет)
    const isPortrait = w < h;

    // Берем корневой элемент игры, где лежит И холст Pixi, И все DOM-виджеты кнопок/ресурсов
    // Если у тебя все виджеты создаются прямо в document.body, используем body, либо твой главный контейнер
    const gameContainer = document.body;

    if (isPortrait) {

        console.log("📱 Глобальный автоповорот: разворачиваем ВЕСЬ ДОМ и Pixi в Ландшафт...");

        // 1. Нативно расширяем Pixi-рендерер под виртуальные ландшафтные размеры


        // 2. Поворачиваем ВЕСЬ HTML-слой игры (вместе с кнопками, ресурсами и виджетами!) через CSS
        gameContainer.style.width = `${h}px`;
        gameContainer.style.height = `${w}px`;
        gameContainer.style.position = 'absolute';
        gameContainer.style.top = '0px';
        gameContainer.style.left = `${w}px`;
        gameContainer.style.transform = 'rotate(90deg)';
        gameContainer.style.transformOrigin = 'top left';
        gameContainer.style.overflow = 'hidden';

        // 3. 🔥 КРИТИЧЕСКИЙ ФИКС КЛИКОВ PIXI: Пересчитываем координаты тачей пальца под CSS-поворот 90гр.
        // Браузер шлет клик по физическому экрану (X, Y), а мы переводим его в виртуальный ландшафт Pixi

        if(app) {
            app.renderer.resize(h, w);

            // const interactionManager = app.renderer.events || app.renderer.plugins?.interaction;
            // if (interactionManager) {
            //     interactionManager.mapPosition = (point, x, y) => {
            //         point.x = y;
            //         point.y = h - x;
            //     };
            // }
        }

        window.windowResized = true;
    }
    else {

        // Если игрок на ПК или перевернул телефон горизонтально — сбрасываем всё в идеальный дефолт
        if(app) {
            app.renderer.resize(w, h);

            // Возвращаем HTML-контейнер в нормальное состояние
            gameContainer.style.width = '100vw';
            gameContainer.style.height = '100vh';
            gameContainer.style.position = 'static';
            gameContainer.style.transform = 'none';
            gameContainer.style.overflow = 'visible';
        }

        window.windowResized = false;
    }

    // Перерисовываем сетку гексов под новое пространство
    if (window.renderMap && AppState.maps) window.renderMap();
};

// Вешаем на системный ресайз, чтобы игра адаптировалась, если телефон физически повернули
window.addEventListener('resize', window.applyGlobalAutoRotation)

init().catch(console.error);



function resolvePlatformerCollisions(char, axis, hexMath) {
    const p = char.physics;
    const currentHexSize = AppState.sizes.hex;

    const bounds = {
        left: char.visualX - p.width / 2,
        right: char.visualX + p.width / 2,
        top: char.visualY - p.height,
        bottom: char.visualY
    };

    // Создаем микро-отступы (5% от размера хитбокса), чтобы персонаж не цеплялся углами за швы между гексами
    const insetX = p.width * 0.05;
    const insetY = p.height * 0.05;

    const points = axis === 'x'
        ? [ { x: bounds.left, y: bounds.top + insetY }, { x: bounds.left, y: bounds.bottom - insetY },
            { x: bounds.right, y: bounds.top + insetY }, { x: bounds.right, y: bounds.bottom - insetY } ]
        : [ { x: bounds.left + insetX, y: bounds.top }, { x: bounds.right - insetX, y: bounds.top },
            { x: bounds.left + insetX, y: bounds.bottom }, { x: bounds.right - insetX, y: bounds.bottom } ];

    for (const pt of points) {
        const hexCoords = hexMath.pixelToCube(pt.x, pt.y);
        const tile = getTileFromState(hexCoords.q, hexCoords.r);

        if (!tile) continue;

        let isBlocked = false;

        // 1. Проверка врагов и физических объектов-стен на гексе
        for (const entity of Object.values(AppState.entities)) {
            if (entity && entity.mapPosition && entity.mapPosition.q === tile.q && entity.mapPosition.r === tile.r) {
                if (entity.id !== char.id) {
                    const isEnemy = entity.faction && entity.faction !== char.faction && !entity.isDead;
                    if (entity.blocksMovement === true || isEnemy) {
                        isBlocked = true;
                        break;
                    }
                }
            }
        }

        // 2. Проверка базовой проходимости ландшафта гекса
        const terrainConfig = AppState.ConfigTerrain[tile.type];
        const movementTerrains = char.movementTerrains || [];
        if (!terrainConfig || !movementTerrains.includes(tile.type)) {
            isBlocked = true;
        }

        // ВЫТАЛКИВАНИЕ ИЗ ПРЕПЯТСТВИЙ
        if (isBlocked) {
            const tilePixel = hexMath.cubeToPixel(tile.q, tile.r);

            if (axis === 'x') {
                // Выталкивание по горизонтали (ориентируемся на радиус Flat-topped гекса)
                if (p.vx > 0) {
                    char.visualX = tilePixel.x - currentHexSize - p.width / 2;
                }
                if (p.vx < 0) {
                    char.visualX = tilePixel.x + currentHexSize + p.width / 2;
                }
                p.vx = 0;
                break;
            }

            if (axis === 'y') {
                // Физическая высота Flat-topped гекса равна: sqrt(3) * size
                const hexHalfHeight = (Math.sqrt(3) * currentHexSize) / 2;

                if (p.vy > 0) {
                    // Приземление на верхнюю плоскость гекса-платформы
                    char.visualY = tilePixel.y - hexHalfHeight;
                    p.isGrounded = true;
                    p.vy = 0;
                } else if (p.vy < 0) {
                    // Удар головой о потолок гекса снизу
                    char.visualY = tilePixel.y + hexHalfHeight + p.height;
                    p.vy = 0;
                }
                break;
            }
        }
    }
}

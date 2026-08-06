import { HexMath } from '../shared/HexMath.js';
import { MapData } from '../shared/MapData.js';
import { renderTile, renderEntity } from '../shared/render.js';

import { AppState, getActiveMap, getTileFromState, DiplomaticPacts } from '../shared/GameState.js';

import { InitEngine } from '../engine/engine.js';
import { AssetLoaderManager } from '../engine/AssetLoaderManager.js';
import { TranslateManager } from '../engine/TranslateManager.js';
import {RenderFunctions} from '../engine/RenderFunctions.js';
import { ScreenManager } from '../screens/ScreenManager.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { PlayerClickManager } from '../game/PlayerClickManager.js';

import { SaveLoadManager } from '../game/SaveLoadManager.js';

window.AppState = AppState;
window._t = ()=>{};

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
    AppState.engine.ScreenManager = new ScreenManager(container);

    AppState.engine.TranslateManager = new TranslateManager();
    AppState.engine.TranslateManager.setLanguage('en');

    AppState.engine.SaveLoadManager = SaveLoadManager;

    if (AppState.engine.SaveLoadManager) {
        AppState.engine.SaveLoadManager.captureInitialState(AppState);
    }

    // 3. Вызываем триггер отрисовки Главного Меню из конфига админки
    console.log("🖥️ Вывод стартового экрана [main_menu]...");
    AppState.engine.ScreenManager.renderScreen('main_menu');
}


async function init2(isNewGame = false) {

    let worldMapContainer;
    let hexMath;
    let app;
    let playerClickManager;

    let isDragging = false;
    let hasMoved = false; // Флаг, чтобы отличать перетаскивание карты от точечного клика
    let dragStartPos = { x: 0, y: 0 };
    let mapStartPos = { x: 0, y: 0 };
    let currentZoom = 1.0;

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

        AppState.engine.app = app;
        AppState.engine.hexMath = hexMath;

    }

    window.applyGlobalAutoRotation();

    InitEngine();

    playerClickManager = new PlayerClickManager();
    AppState.engine.playerClickManager = playerClickManager;

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
                const proto = structuredClone(AppState.ConfigCharacter[char.id]);
                Object.assign(char, {
                    ...defaults,
                    ...proto,
                    ...char,
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
    }


    AppState.engine.renderMap = () => {
        if(!AppState.maps) return;

        worldMapContainer.children.forEach(child => {
            if (child.isUnitContainer) {
                child.visible = false;
                AppState.engine.unitContainerPool.push(child);
            }
        });
        worldMapContainer.removeChildren();


        const tileEntities = {};

        Object.keys(AppState.entities).forEach(id => {
            const char = AppState.entities[id];
            if (char.mapPosition.q && char.mapPosition.r) {
                const key = `${char.mapPosition.q},${char.mapPosition.r}`;
                if(!tileEntities[key]) tileEntities[key] = {entities:[],charsOnThisTile:0};
                tileEntities[key].entities.push(char);

                // const isObject = !!AppState.objects[char.id];
                if(!!AppState.characters[char.id]) tileEntities[key].charsOnThisTile++;
            }
        });

        let screenW = app.screen.width;
        let screenH = app.screen.height;

        // Учитываем ваш CSS-разворот осей при ресайзе, если он активен
        if (window.windowResized) {
            const temp = screenW;
            screenW = screenH;
            screenH = temp;
        }

        // Переводим границы экрана в локальные координаты карты с учетом текущего сдвига и зума
        const minX = -worldMapContainer.x / currentZoom;
        const minY = -worldMapContainer.y / currentZoom;
        const maxX = minX + (screenW / currentZoom);
        const maxY = minY + (screenH / currentZoom);

        // Добавляем запас (padding) в пикселях, чтобы высокие стены тайлов
        // или тайлы на самых краях экрана не исчезали грубо при скролле
        const padding = AppState.sizes.hex * 3;


        AppState.map.tiles.forEach((tile) => {

            const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);

            if (!AppState.play.isFirstPersonMode) {
                const hexMath = AppState.engine.hexMath;


                // Если тайл находится далеко за пределами видимого окна — просто пропускаем его!
                if (
                    pixelPos.x < minX - padding ||
                    pixelPos.x > maxX + padding ||
                    pixelPos.y < minY - padding ||
                    pixelPos.y > maxY + padding
                ) {
                    return; // Завершаем итерацию для этого тайла, процессор отдыхает
                }
            }

            const renderedTile = renderTile(tile);
            if(!renderedTile) return;

            const { roofY, isVisible, roofSprite, isVisited, tileFaction} = renderedTile;

            const entities = tileEntities[`${tile.q},${tile.r}`] ?  tileEntities[`${tile.q},${tile.r}`].entities : null;
            const chars = entities ? tileEntities[`${tile.q},${tile.r}`].charsOnThisTile : 0;

            if (entities?.length > 0 && isVisible) {
                entities.forEach((unit, index) => {
                    renderEntity(unit, chars, index, tile, tileFaction, roofSprite, pixelPos, roofY);
                });
            }

        });

        // if (AppState.engine.pathRenderer) {
        //     AppState.engine.pathRenderer.clearPath();
        // }

        // if (AppState.play.activeCharacterId) {
        //     const activeChar = AppState.entities[AppState.play.activeCharacterId];
        //     const charTile = getTileFromState(activeChar.mapPosition.q, activeChar.mapPosition.r);
        //
        //     if(AppState.main.MovementLine) {
        //         if (activeChar.currentActivePath && activeChar.currentActivePath.length > 0 && activeChar.action !== 'move') {
        //             AppState.engine.pathRenderer.drawPath(activeChar.currentActivePath, activeChar);
        //         }
        //     }
        // }

        worldMapContainer.sortChildren();
        app.render();
    };



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

    if(AppState.maps) {
        AppState.engine.renderMap();

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

                AppState.engine.renderMap();
            } else {
                // 🌟 СТРОГИЙ ФИКС HOVER: Подсовываем менеджеру подсветки гексов правильные координаты
                // playerClickManager.handleMapHover(currentVirtualX, currentVirtualY);
            }
        });

        app.stage.on('pointerupoutside', () => isDragging = false);

        app.canvas.addEventListener('wheel', (event) => {
            const settings = AppState.game_settings;
            if (settings.playerCamera === 'fixed' && !settings.playerZoom) {
                return;
            }
            event.preventDefault();

            const zoomFactor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
            const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);

            // const intensity = Math.abs(event.deltaY) * 0.0005; // Настройте этот коэф под себя (меньше = плавнее)
            // const zoomFactor = event.deltaY < 0 ? (1 + intensity) : 1 / (1 + intensity);
            //
            // const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);

            // 🌟 ИСПРАВЛЕНИЕ: Берем глобальные координаты из PixiJS, как в pointermove
            const globalMouse = app.renderer.events.pointer.global;
            let mouseX = globalMouse.x;
            let mouseY = globalMouse.y;

            // Применяем вашу рабочую схему разворота осей, если экран повернут через CSS
            if (window.windowResized) {
                const rawX = mouseX;
                const rawY = mouseY;
                mouseX = rawY / window.innerWidth * window.innerHeight;
                mouseY = window.innerWidth - rawX / window.innerHeight * window.innerWidth;
            }

            // Запоминаем старый зум перед изменением
            const oldZoom = currentZoom;
            currentZoom = newZoom;
            AppState.camera.currentZoom = currentZoom;

            // Находим локальную точку внутри карты относительно СТАРОГО зума
            const localX = (mouseX - worldMapContainer.x) / oldZoom;
            const localY = (mouseY - worldMapContainer.y) / oldZoom;

            // Применяем масштаб к контейнеру
            worldMapContainer.scale.set(currentZoom);

            // Сдвигаем контейнер так, чтобы точка под курсором осталась на месте
            worldMapContainer.x = mouseX - localX * currentZoom;
            worldMapContainer.y = mouseY - localY * currentZoom;

            AppState.engine.renderMap();

        }, { passive: false });


        app.ticker.add((ticker) => {
            const deltaMS = (ticker.deltaTime * AppState.animation.framesPerSecond * 10) / 60;
            let needRedraw = false;

            if(AppState.map.isPlatformerMode) {
                AppState.engine.movementManager.updateCharacter(AppState.characters[AppState.play.activeCharacterId]);
                needRedraw = true;
            }

            for (const charId in AppState.entities) {
                const char = AppState.entities[charId];
                if(!char) continue;

                if (char.damageFlashTimer > 0) {
                    char.damageFlashTimer = Math.max(0, char.damageFlashTimer - deltaMS);
                    needRedraw = true;
                }

                if (char.healFlashTimer > 0) {
                    char.healFlashTimer = Math.max(0, char.healFlashTimer - deltaMS);
                    needRedraw = true;
                }

                if (char.animations && char.animations[char.action]) {
                    const currentActionAnims = char.animations[char.action][char.direction];

                    if (currentActionAnims && currentActionAnims.length > 1) {
                        const animationTime = AppState.animation[char.action+"Time"] || 1000;
                        char.frameTimer += deltaMS * 1000 / animationTime;

                        if (char.frameTimer >= char.frameDuration) {
                            char.frameTimer = 0;
                            char.currentFrameIndex = (char.currentFrameIndex + 1) % currentActionAnims.length;
                            needRedraw = true;
                        }
                    } else {
                        char.currentFrameIndex = 0;
                    }
                }

                if(AppState.engine.movementManager.animateMovement(char, deltaMS)) needRedraw = true;
                if(AppState.engine.combatManager.animateAttack(char, deltaMS)) needRedraw = true;
            }

            if (AppState.play.activeCharacterId && AppState.engine.updateCameraSystem && (AppState.game_settings.playerCamera === 'fixed')) {
                AppState.engine.updateCameraSystem(ticker);
            }

            if (needRedraw) {
                AppState.engine.renderMap();
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
            AppState.engine.renderMap();
        });
    }

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

        gameContainer.style.width = `${h}px`;
        gameContainer.style.height = `${w}px`;
        gameContainer.style.position = 'absolute';
        gameContainer.style.top = '0px';
        gameContainer.style.left = `${w}px`;
        gameContainer.style.transform = 'rotate(90deg)';
        gameContainer.style.transformOrigin = 'top left';
        gameContainer.style.overflow = 'hidden';

        if(app) {
            app.renderer.resize(h, w);
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

    if( AppState.engine.renderMap) AppState.engine.renderMap();
};

// Вешаем на системный ресайз, чтобы игра адаптировалась, если телефон физически повернули
window.addEventListener('resize', window.applyGlobalAutoRotation)

init().catch(console.error);

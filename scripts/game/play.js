import { HexMath } from '../shared/HexMath.js';
import { MapData } from '../shared/MapData.js';
import { renderTile, renderEntity } from '../shared/render.js';

import { AppState, getActiveMap, getTileFromState, DiplomaticPacts } from '../shared/GameState.js';

import { InitEngine } from '../engine/engine.js';
import { init3D } from '../engine/3d.js';
import { init2D } from '../engine/2d.js';
import { AssetLoaderManager } from '../engine/AssetLoaderManager.js';
import { TranslateManager } from '../engine/TranslateManager.js';
import {RenderFunctions} from '../engine/RenderFunctions.js';
import { ScreenManager } from '../screens/ScreenManager.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { PlayerClickManager } from '../game/PlayerClickManager.js';

import { SaveLoadManager } from '../game/SaveLoadManager.js';

import * as THREE from 'three';

window.THREE = THREE;
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

    AppState.engine.playerClickManager = new PlayerClickManager();

    AppState.engine.SaveLoadManager = SaveLoadManager;

    if (AppState.engine.SaveLoadManager) {
        AppState.engine.SaveLoadManager.captureInitialState(AppState);
    }

    AppState.engine.ScreenManager.renderScreen('main_menu');
}


async function init2(isNewGame = false) {

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

        AppState.config.heightStep = size/2;

        AppState.engine.hexMath = new HexMath(AppState.sizes.hex);

    }

    window.applyGlobalAutoRotation();

    InitEngine();

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

    if(AppState.maps) {
        AppState.engine.MapManager.switchMap('world_map');

        init3D();

        if (AppState.player?.character && AppState.game_settings && AppState.game_settings.playerType === 'character') {
            AppState.engine.playerClickManager.executeCharacterSelect(AppState.player?.character);

            if (AppState.engine.centerCameraOnCharacter) {
                AppState.engine.centerCameraOnCharacter(AppState.play.activeCharacterId);
            }
        }

        AppState.engine.visionManager.updateFogOfWar();

        // AppState.engine.renderMap();
    }

    AppState.engine.uiManager.init();
    AppState.engine.questManager.refreshQuestChains();


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
    // AppState.engine.dialogManager.trigger("SCENE_LESSON_HELP_NURSE_BRANCH");
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
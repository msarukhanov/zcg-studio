
import { HexTile } from '../shared/MapData.js';
import { AppState, getTileFromState, getActiveMap } from '../shared/GameState.js';

import { TerrainInspector, ObjectsInspector, CharactersInspector } from './InspectorModules.js';


export class EditorClickManager {
    constructor(redrawCallback) {
        this.redrawMap = redrawCallback;

        this.selectedTile = null;
        this.historyManager = null;

        this.inspectors = {
            'Terrain': new TerrainInspector(this),
            'Objects': new ObjectsInspector(this),
            'Characters': new CharactersInspector(this)
        };

        window.clickManagerRef = this;
        this.deselectAll();
    }

    /**
     * Обработка клика мыши строго в режиме EDITOR
     */
    handleMapClick(mouseX, mouseY) {
        const currentZoom = AppState.camera.currentZoom || 1.0;
        const hexMath = AppState.engine.hexMath;
        const heightStep = AppState.config.heightStep;
        const tool = AppState.editor.currentTool;
        const mode = AppState.editor.currentMode;

        let tile = hexMath.get3DHexFromPixel(mouseX, mouseY);

        if (!tile || !tile.type) {
            if (tool === 'Brush') {
                const localX = (mouseX - AppState.engine.worldMapContainer.x) / currentZoom;
                const localY = (mouseY - AppState.engine.worldMapContainer.y) / currentZoom;
                const cube = hexMath.pixelToCube(localX, localY);

                // Подтягиваем дефолтный класс гекса динамически

                tile = new HexTile(cube.q, cube.r, cube.q, cube.r);
                tile.type = AppState.editor.selectedPaletteItem;;
                tile.height = AppState.editor.brushHeightTarget;
                tile.imageIndex = 0;

                const config = AppState.ConfigTerrain[tile.type];
                if (config && config.images && config.images.length > 0) {
                    tile.imageIndex = Math.floor(Math.random() * config.images.length);
                }

                if (this.historyManager) this.historyManager.saveStep([tile], true);
                getActiveMap().tiles.set(`${cube.q},${cube.r}`, tile);
            } else {
                this.deselectAll();
                return;
            }
        } else {
            if (tool === 'Brush' || tool === 'Eraser') {
                if (this.historyManager) this.historyManager.saveStep([tile], false);
            }
        }

        switch (tool) {
            case 'Select': this.executeSelectTool(tile); break;
            case 'Brush': this.executeBrushTool(tile, mode); break;
            case 'Eraser': this.executeEraserTool(tile, mode); break;
        }
    }

    executeSelectTool(tile) {
        const hexMath = AppState.engine.hexMath;
        this.selectedTile = tile;
        const activeInspector = this.inspectors[AppState.editor.currentMode];
        if (activeInspector) activeInspector.render(tile);

        const marker = window.selectionMarkerRef;
        if (marker) {
            const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
            marker.x = pixelPos.x;
            marker.y = pixelPos.y - (tile.height - 1) * AppState.config.heightStep;
            marker.visible = true;
        }
    }

    executeBrushTool(tile) {
        const mode = AppState.editor.currentMode;
        const selectedAsset = AppState.editor.selectedPaletteItem;

        const unique = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        if (mode === 'Terrain') {
            if(AppState.editor.selectedFactionTerrain) {
                tile.faction = AppState.editor.selectedPaletteItem;
            }
            else if(AppState.editor.selectedProvinceTerrain) {
                tile.province = AppState.editor.selectedProvinceTerrain;
            }
            else if(AppState.editor.selectedRegionTerrain) {
                tile.region = AppState.editor.selectedRegionTerrain;
            }
            else {
                tile.type = AppState.editor.selectedPaletteItem;
                tile.height = AppState.editor.brushHeightTarget;
                tile.imageIndex = 0;

                const config = AppState.ConfigTerrain[tile.type];
                if (config && config.images && config.images.length > 0) {
                    tile.imageIndex = Math.floor(Math.random() * config.images.length);
                }
            }
        }
        else if (mode === 'Objects') {
            const config = AppState.ConfigObject[selectedAsset];
            if (config) {
                const id = `${selectedAsset}_${unique}`;

                const newObj = {
                    ...config,
                    id,
                    protoId: selectedAsset,
                    mapId: AppState.map.mapId,
                    mapPosition: {q: tile.q, r: tile.r},
                    // faction: ''
                }
                AppState.objects[id] = newObj;
                AppState.entities[id] = AppState.objects[id];
            }
        }
        else if (mode === 'Characters') {
            const config = AppState.ConfigCharacter[selectedAsset];
            if (config) {
                const id = `${selectedAsset}_${unique}`;

                const newObj = {
                    ...config,
                    id,
                    protoId: selectedAsset,
                    mapId: AppState.map.mapId,
                    mapPosition: {q: tile.q, r: tile.r},
                    // faction: ''
                }
                AppState.characters[id] = newObj;
                AppState.entities[id] = AppState.characters[id];
            }

            // const uniqueCharId = `char_${unique}`;
            // // Динамический спавн персонажа с автоматическим подмешиванием всех анимационных полей
            // AppState.characters[uniqueCharId] = {
            //     // ИСПРАВЛЕНИЕ: Жестко закладываем базовые свойства полей анимации,
            //     // чтобы игровой тикер никогда не ловил undefined свойства
            //     cachedReachableTiles: null,
            //     action: 'idle',
            //     currentMovementVisualPath: [],
            //     movementLerpTime: 0,
            //     visualX: 0,
            //     visualY: 0,
            //     direction: 'right',
            //
            //     id: uniqueCharId,
            //     name: selectedAsset.charAt(0).toUpperCase() + selectedAsset.slice(1),
            //     faction: AppState.player.faction,
            //     mapId: AppState.map.mapId,
            //     mapPosition: { q: tile.q, r: tile.r },
            //     mapHistory: [],
            //     movement: { current: 3, max: 3 },
            //     movementTerrains: ['grass', 'snow'],
            //     vision: { current: 3 },
            //     image: '',
            //     stats: { hp: 100, maxHp: 100 },
            //     inventory: []
            // };
        }

        this.redrawMap();
        if (this.selectedTile === tile) this.executeSelectTool(tile);
    }

    executeEraserTool(tile) {
        const mode = AppState.editor.currentMode;

        if (mode === 'Terrain') {
            tile.type = 'grass'; tile.height = 1; tile.imageIndex = 0;
        } else if (mode === 'Objects') {
            tile.worldObject = null;
        } else if (mode === 'Characters') {
            // Стираем персонажей с этих координат в AppState
            Object.keys(AppState.characters).forEach(id => {
                const c = AppState.characters[id];
                if (c.mapId === AppState.map.mapId && c.mapPosition.q === tile.q && c.mapPosition.r === tile.r) {
                    delete AppState.characters[id];
                }
            });
        }

        this.redrawMap();
        if (this.selectedTile === tile) this.executeSelectTool(tile);
    }

    deselectAll() {
        this.selectedTile = null;
        if (window.selectionMarkerRef) window.selectionMarkerRef.visible = false;
        if (this.inspectors && this.inspectors['Terrain']) this.inspectors['Terrain'].renderEmpty();
    }
}



// import { TerrainInspector, ObjectsInspector, CharactersInspector } from './InspectorModules.js';
//
// export class EditorClickManager {
//     constructor(hexMath, mapData, controls, worldMapContainer, redrawCallback) {
//         this.hexMath = hexMath;
//         this.mapData = mapData;
//         this.controls = controls;
//         this.worldMapContainer = worldMapContainer;
//         this.redrawMap = redrawCallback;
//
//         this.selectedTile = null;
//         this.heightStep = 14;
//         this.historyManager = null;
//         this.turnManager = null;
//         this.pathRenderer = null;
//
//         this.activePlayCharacter = null;
//         this.currentActivePath = null;
//
//         this.inspectors = {
//             'Terrain': new TerrainInspector(this),
//             'Objects': new ObjectsInspector(this),
//             'Characters': new CharactersInspector(this)
//         };
//
//         window.clickManagerRef = this;
//         this.deselectAll();
//     }
//
//     handleMapClick(mouseX, mouseY, currentZoom = 1.0) {
//         const mode = this.controls.currentMode;
//         const tool = this.controls.currentTool;
//         const globalMode = this.controls.globalMode;
//
//         let tile = this.hexMath.get3DHexFromPixel(mouseX, mouseY, this.worldMapContainer, this.mapData, this.heightStep, currentZoom);
//
//         if (!tile) {
//             if (tool === 'Brush') {
//                 const localX = (mouseX - this.worldMapContainer.x) / currentZoom;
//                 const localY = (mouseY - this.worldMapContainer.y) / currentZoom;
//                 const cube = this.hexMath.pixelToCube(localX, localY);
//                 const HexTileClass = this.mapData.tiles.values().next().value.constructor;
//
//                 tile = new HexTileClass(cube.q, cube.r, cube.q, cube.r);
//                 tile.type = 'grass'; tile.height = 1; tile.imageIndex = 0;
//
//                 if (this.historyManager) this.historyManager.saveStep([tile], true);
//                 this.mapData.tiles.set(`${cube.q},${cube.r}`, tile);
//             } else {
//                 this.deselectAll();
//                 return;
//             }
//         } else {
//             if (tool === 'Brush' || tool === 'Eraser') {
//                 if (this.historyManager) this.historyManager.saveStep([tile], false);
//             }
//         }
//
//         switch (tool) {
//             case 'Select': this.executeSelectTool(tile); break;
//             case 'Brush': this.executeBrushTool(tile, mode); break;
//             case 'Eraser': this.executeEraserTool(tile, mode); break;
//         }
//     }
//
//     handleMapHover(mouseX, mouseY, currentZoom) {
//         if (this.pathRenderer && this.pathRenderer.pathGraphics) this.pathRenderer.pathGraphics.clear();
//         return;
//     }
//
//     executeSelectTool(tile) {
//         this.selectedTile = tile;
//         const activeInspector = this.inspectors[this.controls.currentMode];
//         if (activeInspector) activeInspector.render(tile);
//
//         const marker = window.selectionMarkerRef;
//         if (marker) {
//             const pixelPos = this.hexMath.cubeToPixel(tile.q, tile.r);
//             marker.x = pixelPos.x;
//             marker.y = pixelPos.y - (tile.height - 1) * this.heightStep;
//             marker.visible = true;
//         }
//     }
//
//     executeBrushTool(tile, mode) {
//         const selectedAsset = this.controls.selectedPaletteItem;
//
//         if (mode === 'Terrain') {
//             tile.type = selectedAsset;
//             tile.height = this.controls.brushHeightTarget;
//             tile.imageIndex = 0;
//         } else if (mode === 'Objects') {
//             // ИСПРАВЛЕНИЕ: Используем универсальный спавн интерактивных объектов
//             // Динамически импортируем WorldObject и ObjectConfig для сборки
//             const config = window.ObjectConfigRef ? window.ObjectConfigRef[selectedAsset] : null;
//             if (config) {
//                 const HexTileClass = this.mapData.tiles.values().next().value.constructor;
//                 // Подтягиваем класс WorldObject, который мы экспортировали из MapData
//                 const uniqueId = `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
//                 const defaultInnerMap = config.hasInnerMap ? config.defaultInnerMapId : null;
//
//                 // Перезаписываем объект на гексе на основе выбранного в палитре ассета
//                 const nextTile = this.mapData.tiles.values().next().value;
//                 const WorldObjectClass = nextTile.constructor.name === 'HexTile' ? window.mapDataRef.tiles.values().next().value.constructor : null;
//
//                 // Создаем чистый полиморфный объект
//                 tile.worldObject = {
//                     id: uniqueId,
//                     type: selectedAsset,
//                     name: config.name,
//                     innerMapId: defaultInnerMap,
//                     garrisonUnits: []
//                 };
//             }
//         } else if (mode === 'Characters') {
//             tile.units.push({ type: selectedAsset, hp: 100, mp: 2, faction: 'player' });
//         }
//
//         this.redrawMap();
//         if (this.selectedTile === tile) this.executeSelectTool(tile);
//     }
//
//     executeEraserTool(tile, mode) {
//         if (mode === 'Terrain') {
//             tile.type = 'grass'; tile.height = 1; tile.imageIndex = 0;
//         } else if (mode === 'Objects') {
//             // ИСПРАВЛЕНИЕ: Ластик полностью стирает интерактивный объект с гекса
//             tile.worldObject = null;
//         } else if (mode === 'Characters') {
//             tile.units = [];
//         }
//
//         this.redrawMap();
//         if (this.selectedTile === tile) this.executeSelectTool(tile);
//     }
//
//     deselectAll() {
//         this.selectedTile = null;
//         if (window.selectionMarkerRef) window.selectionMarkerRef.visible = false;
//         if (this.pathRenderer) this.pathRenderer.clear();
//         if (this.inspectors && this.inspectors['Terrain']) this.inspectors['Terrain'].renderEmpty();
//     }
// }

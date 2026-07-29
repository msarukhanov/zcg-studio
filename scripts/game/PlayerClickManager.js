import { AppState, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';
import { Character } from './Player.js';

export class PlayerClickManager {
    constructor(redrawCallback) {
        this.redrawMap = redrawCallback;
    }

    /**
     * Обработка точечного клика мыши строго в режиме игры (PLAY)
     */
    handleMapClick(mouseX, mouseY) {

        const hexMath = AppState.engine.hexMath;
        let tile = hexMath.get3DHexFromPixel(mouseX, mouseY);
        if (!tile) return;

        console.log(tile.q, tile.r, tile);

        let char = AppState.entities[AppState.play.activeCharacterId];

        if (AppState.engine.skillManager && AppState.play.activeSkillId && tile.isSkillTargetZone) {
            const config = AppState.skills[AppState.play.activeSkillId];
            AppState.engine.skillManager.executeActiveSkill(char, tile, config);
            return; // Клик поглощен заклинанием, прерываем логику ходьбы персонажа
        }
        else if (AppState.engine.skillManager && AppState.play.activeSkillId && !tile.isSkillTargetZone) {
            return;
        }

        const currentZoom = AppState.camera.currentZoom || 1.0;
        const heightStep = AppState.config.heightStep;

        this.handleMapHover(mouseX, mouseY);

        let clickInPath = false;
        if (char && char.currentActivePath && char.currentActivePath.length > 0) {
            clickInPath = char.currentActivePath.some(p => p.q === tile.q && p.r === tile.r);
        }

        let clickedCharId = null;
        Object.keys(AppState.entities).forEach(id => {
            const c = AppState.entities[id];
            if (c.mapPosition.q === tile.q && c.mapPosition.r === tile.r) {
                clickedCharId = id;
            }
        });

        if (clickedCharId) {
            const char = AppState.entities[clickedCharId];
            console.log(char);

            const isObject = !!AppState.objects[clickedCharId];
            const isChar = !!AppState.characters[clickedCharId];

            // Если кликнули по своему персонажу — выбираем его
            if (char.faction === AppState.player.faction) {
                this.executeCharacterSelect(clickedCharId, tile);
                return;
            }

            const pact = getPactBetween(AppState.player.faction, char.faction);
            console.log(pact, clickedCharId);

            // ⚔️ ЕСЛИ ВОЙНА И У СУЩНОСТИ ЕСТЬ ХП — НАЧИНАЕМ БОЙ (Работает для живых врагов и ломаемых стен/зданий)
            if (pact === DiplomaticPacts.WAR && char.stats) {
                if (AppState.engine.combatManager) {
                    AppState.engine.combatManager.startBattle(AppState.play.activeCharacterId, tile);
                    return;
                }
            }

            // if (isObject && char.faction === AppState.player.faction) {
            //     AppState.play.selectedObject = char;
            //     AppState.engine.ScreenManager.renderScreen('object_screen');
            // }

            // =========================================================================
            // 🏢 ЛОГИКА КОМПОНЕНТОВ ДЛЯ ОБЪЕКТОВ (Твой поправленный и заполненный блок)
            // =========================================================================
            // if (isObject) {
            //     // А. У объекта есть ХП и статы, но мы с ним не воюем (Нейтральная ломаемая бочка, забор, или починка здания)
            //     if (char.stats) {
            //         console.log(`[ClickManager] Взаимодействие с разрушаемым/ремонтируемым объектом: ${char.name}`);
            //         // Здесь будет логика ремонта за ресурсы или мирного слома, если нужно
            //     }
            //     // Б. У объекта есть встроенный диалог / Текстовый квест (Лагерь эльфов "elf_camp" или "ancient_ruins")
            //     // else if (char.dialog) {
            //     //     if (AppState.engine.dialogManager) {
            //     //         AppState.engine.dialogManager.trigger('character_dialog_' + clickedCharId);
            //     //     }
            //     // }
            //     // // В. Объект можно обыскать / открыть как склад (Сундук "chest1" или труп врага без статов)
            //     // else if(char.interactable) {
            //     //     console.log(`[ClickManager] Открытие контейнера: ${char.name}`);
            //     //
            //     //     if (char.backpack) {
            //     //         // 1. Включаем двухпанельный режим обмена на экране персонажа
            //     //         AppState.engine.ScreenManager._isTransferMode = true;
            //     //
            //     //         // 2. Подставляем ID сундука ("chest1") вместо сопартийца для правой панели рюкзака!
            //     //         AppState.engine.ScreenManager._selectedCharId = clickedCharId;
            //     //
            //     //         // 3. Принудительно вызываем рендер двухпанельного интерфейса
            //     //         AppState.engine.ScreenManager.renderScreen('character_transfer');
            //     //     }
            //     // }
            //     // // Г. Клик по объекту авто-перехода (Лестница "ladder"). По клику просто телепортируем, если наступить лень
            //     // else if (char.mapTo) {
            //     //     const destination = char.mapTo;
            //     //     if (destination && AppState.engine.mapManager) {
            //     //         console.log(`[ClickManager] Быстрый переход сквозь портал/лестницу на карту: ${destination.mapId}`);
            //     //         AppState.engine.mapManager.switchMap(destination.mapId);
            //     //         AppState.engine.mapManager.teleportCharacter(AppState.play.activeCharacterId, destination.mapId, destination.q, destination.r);
            //     //         AppState.engine.mapManager.refreshWorldRender(AppState.play.activeCharacterId);
            //     //     }
            //     // }
            // }
            // // =========================================================================
            // // 👥 ЛОГИКА ДЛЯ СЮЖЕТНЫХ ПЕРСОНАЖЕЙ (Эрин и др.)
            // // =========================================================================
            // else if (isChar) { // СТРОГИЙ ФИКС: исправили имя переменной с isCharacter на isChar
            //     // if (AppState.engine.dialogManager) {
            //     //     AppState.engine.dialogManager.trigger('character_dialog_' + clickedCharId);
            //     // }
            // }
        }

        if(clickInPath) {
            this.executeCharacterMovement();
        }
        this.deselectAll();

        // console.log(char.currentActivePath, clickInPath);
        // if (AppState.play.activeCharacterId && clickInPath) {
        //     this.executeCharacterMovement();
        //     // Находим именно тот объект тайла, который лежит внутри построенного пути
        //     // const pathTile = char.currentActivePath.find(p => p.q === tile.q && p.r === tile.r);
        //     //
        //     // if (pathTile && pathTile.isEnemyTarget) {
        //     //     if (AppState.engine.combatManager) {
        //     //         AppState.engine.combatManager.startBattle(AppState.play.activeCharacterId, tile);
        //     //     }
        //     //     this.deselectAll();
        //     //     this.redrawMap();
        //     // }
        //     // else {
        //     //     // Если это обычная клетка пути — движемся
        //     //
        //     // }
        //     return;
        // }
        //
        // this.deselectAll();
    }

    executeCharacterSelect(charId) {
        const char = AppState.entities[charId];
        // if (AppState.game_settings && AppState.game_settings.playerType === 'character') {
        //     const mainCharId = AppState.player?.character;
        //
        //     // БЛОКИРОВКА СЕЛЕКТА: Если игрок пытается выбрать кого-то, кроме своего прописанного героя
        //     if (charId !== mainCharId) {
        //         console.log(`🚫 [Select Block] Управление заблокировано: Вы можете выбирать только своего героя (${mainCharId}).`);
        //         return; // Игнорируем выбор чужой фигурки
        //     }
        // }

        if (AppState.game_settings && AppState.game_settings.playerType === 'character') {
            const mainCharId = AppState.player?.faction;

            // БЛОКИРОВКА СЕЛЕКТА: Если игрок пытается выбрать кого-то, кроме своего прописанного героя
            if (char.faction !== AppState.player?.faction) {
                console.log(`🚫 [Select Block] Управление заблокировано: Вы можете выбирать только своих.`);
                return; // Игнорируем выбор чужой фигурки
            }
        }

        this.deselectAll();

        AppState.play.activeCharacterId = charId;


        if (AppState.engine.visionManager) {
            AppState.engine.visionManager.updateFogOfWar();
        }

        if (char.movement.current > 0 && AppState.engine.movementManager && AppState.engine.pathRenderer) {
            const reachableTiles = AppState.engine.movementManager.getReachableTiles(char);
            AppState.play.cachedReachableTiles = reachableTiles;

            AppState.engine.pathRenderer.drawMovementZone(reachableTiles);
        }

        if (this.redrawMap) {
            this.redrawMap();
        }

        AppState.engine.visionManager.updateFogOfWar();

        if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    }

    executeCharacterMovement() {
        const charId = AppState.play.activeCharacterId;
        if (AppState.engine.movementManager) {
            AppState.engine.movementManager.startCharacterMovement(charId);
            AppState.engine.pathRenderer.clearPath();
        }
    }

    handleMapHover(mouseX, mouseY) {

        const charId = AppState.play.activeCharacterId;
        const char = AppState.entities[charId];

        if (!char || char.movement.current <= 0) {
            AppState.engine.pathRenderer.clearPath();
            return;
        }

        const currentZoom = AppState.camera.currentZoom;
        const hexMath = AppState.engine.hexMath;
        const heightStep = AppState.config.heightStep;
        const targetTile = hexMath.get3DHexFromPixel(mouseX, mouseY);

        if (targetTile && (targetTile.q !== char.mapPosition.q || targetTile.r !== char.mapPosition.r)) {
            const path = AppState.engine.movementManager.findPath(char.mapPosition.q, char.mapPosition.r, targetTile.q, targetTile.r, char);
            if (path) {
                char.currentActivePath = path;
                AppState.engine.pathRenderer.drawPath(path, char, AppState.engine.movementManager);
                return;
            }
        }

        AppState.engine.pathRenderer.clearPath();
        char.currentActivePath = [];
    }

    deselectAll() {
        if (AppState.game_settings.playerCamera === 'fixed') {
            return;
        }
        AppState.play.activeCharacterId = null;
        AppState.play.currentActivePath = [];

        if (window.selectionMarkerRef) window.selectionMarkerRef.visible = false;

        AppState.engine.pathRenderer.clear();

        if (AppState.engine.skillManager) {
            AppState.engine.skillManager.activeSkillId = null;
        }
        if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    }

}
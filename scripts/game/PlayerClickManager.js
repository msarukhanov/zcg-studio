import { AppState, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';
import { Character } from './Player.js';

export class PlayerClickManager {
    constructor() {

    }

    /**
     * Обработка точечного клика мыши строго в режиме игры (PLAY)
     */
    handleMapClick(mouseX, mouseY) {
        console.log(mouseX, mouseY);
        const hexMath = AppState.engine.hexMath;
        let tile = hexMath.get3DHexFromPixel(mouseX, mouseY);
        console.log(tile);
        if (!tile) return;

        let char = AppState.entities[AppState.play.activeCharacterId];

        if (AppState.engine.skillManager && AppState.play.activeSkillId && tile.isSkillTargetZone) {
            const config = AppState.skills[AppState.play.activeSkillId];
            AppState.engine.skillManager.executeActiveSkill(char, tile, config);
            return;
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
                    AppState.engine.combatManager.startAttack(AppState.play.activeCharacterId, tile);
                    return;
                }
            }
        }

        if(clickInPath && AppState.main.MovementControls.includes('click')) {
            this.executeCharacterMovement();
            return;
        }
        this.deselectAll();
    }

    executeCharacterSelect(charId) {
        const char = AppState.entities[charId];
        if(!char) {
            this.deselectAll();
            return;
        }

        if (AppState.game_settings && AppState.game_settings.playerType === 'faction') {
            if (char.faction !== AppState.player?.faction) {
                console.log(`🚫 [Select Block] Управление заблокировано: Вы можете выбирать только своих.`);
                return;
            }
        }

        if (AppState.game_settings && AppState.game_settings.playerType === 'character') {
            if (char.id !== AppState.player?.character) {
                console.log(`🚫 [Select Block] Управление заблокировано: Вы можете выбирать только своих.`);
                return;
            }
        }

        AppState.play.activeCharacterId = charId;

        if (AppState.engine.visionManager) {
            AppState.engine.visionManager.updateFogOfWar();
        }

        if (char.movement.current > 0 && AppState.engine.movementManager && AppState.engine.pathRenderer) {
            const reachableTiles = AppState.engine.movementManager.getReachableTiles(char);
            AppState.play.cachedReachableTiles = reachableTiles;
            char.cachedReachableTiles = reachableTiles;
        }

        AppState.engine.renderMap();

        AppState.engine.uiManager.updateAll();
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
            console.log(char.mapPosition.q, char.mapPosition.r, targetTile.q, targetTile.r);
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
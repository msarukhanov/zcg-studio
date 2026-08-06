import { AppState } from '../shared/GameState.js';

import { MapData } from '../shared/MapData.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { FactionManager } from '../game/FactionManager.js';
import { VisionManager } from '../game/VisionManager.js';
import { MovementManager } from '../game/MovementManager.js';
import { CombatManager } from '../game/CombatManager.js';
import { SkillManager } from '../game/SkillManager.js';
import { PlayerClickManager } from '../game/PlayerClickManager.js';
import { PlatformerMovementManager } from '../game/PlatformerMovementManager.js';
import { InputManager } from '../game/InputManager.js';
import { CharacterManager } from '../game/CharacterManager.js';
import { CharacterLevelUpManager } from '../game/CharacterLevelUpManager.js';
import { AIManager } from '../game/AIManager.js';
import { TimeManager } from '../game/TimeManager.js';
import { TurnManager } from '../game/TurnManager.js';
import { ArenaManager } from '../game/ArenaManager.js';
import { MapManager } from '../game/MapManager.js';
import { ObjectManager } from '../game/ObjectManager.js';
import { UIManager } from '../game/UIManager.js';
import { DialogManager } from '../game/DialogManager.js';
import { TriggerManager } from '../game/TriggerManager.js';
import { QuestManager } from '../game/QuestManager.js';

import { AudioManager } from '../engine/AudioManager.js';
import { TranslateManager } from '../engine/TranslateManager.js';
import { initAdditionalFunctions } from '../engine/AdditionalFunctions.js';
import { ScreenManager } from '../screens/ScreenManager.js';


export function InitEngine() {

    if(AppState.maps) {
        AppState.engine.mapData = new MapData();
        AppState.engine.pathRenderer = new PathRenderer();
        AppState.engine.visionManager = new VisionManager();
        // AppState.engine.movementManager = new MovementManager();

        AppState.engine.movementManager = new PlatformerMovementManager({
            gravity: 0.5,        // Сила притяжения
            jumpForce: -10,      // Сила прыжка (вверх по Y)
            moveSpeed: 4,        // Скорость бега влево/вправо
            terminalVelocity: 12 // Максимальная скорость падения
        });

        AppState.engine.TranslateManager = new TranslateManager();

        AppState.engine.timeManager = new TimeManager();
    }


    AppState.engine.inputManager = new InputManager();

    AppState.engine.AudioManager = AudioManager;

    AppState.engine.factionManager = new FactionManager();

    AppState.engine.combatManager = new CombatManager();
    AppState.engine.skillManager = new SkillManager();


    AppState.engine.turnManager = new TurnManager();
    AppState.engine.aiManager = new AIManager();

    AppState.engine.uiManager = new UIManager();

    AppState.engine.dialogManager = DialogManager;
    AppState.engine.triggerManager = TriggerManager;
    AppState.engine.questManager = QuestManager;
    AppState.engine.CharacterManager = CharacterManager;
    AppState.engine.CharacterLevelUpManager = CharacterLevelUpManager;

    AppState.engine.ArenaManager = ArenaManager;
    AppState.engine.MapManager = MapManager;
    AppState.engine.ObjectManager = ObjectManager;


    initAdditionalFunctions();


    // Внутри инициализации AppState.engine в play.js добавляем глобальный метод:
}
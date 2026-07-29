import { AppState } from '../shared/GameState.js';

import { MapData } from '../shared/MapData.js';

import { PathRenderer } from '../game/PathRenderer.js';
import { FactionManager } from '../game/FactionManager.js';
import { VisionManager } from '../game/VisionManager.js';
import { MovementManager } from '../game/MovementManager.js';
import { CombatManager } from '../game/CombatManager.js';
import { SkillManager } from '../game/SkillManager.js';
import { PlayerClickManager } from '../game/PlayerClickManager.js';

import { AIManager } from '../game/AIManager.js';
import { TimeManager } from '../game/TimeManager.js';
import { TurnManager } from '../game/TurnManager.js';

import { UIManager } from '../game/UIManager.js';

import { DialogManager } from '../game/DialogManager.js';
import { TriggerManager } from '../game/TriggerManager.js';
import { QuestManager } from '../game/QuestManager.js';

import { AudioManager } from '../engine/AudioManager.js';
import { TranslateManager } from '../engine/TranslateManager.js';
import { ScreenManager } from '../screens/ScreenManager.js';
import { CharacterManager } from '../game/CharacterManager.js';
import { CharacterLevelUpManager } from '../game/CharacterLevelUpManager.js';

import { ArenaManager } from '../game/ArenaManager.js';
import { MapManager } from '../game/MapManager.js';
import { ObjectManager } from '../game/ObjectManager.js';




export function InitEngine() {

    AppState.engine.mapData = new MapData();

    AppState.engine.TranslateManager = new TranslateManager();
    AppState.engine.TranslateManager.setLanguage('en');

    AppState.engine.AudioManager = AudioManager;
    AppState.engine.pathRenderer = new PathRenderer();
    AppState.engine.factionManager = new FactionManager();
    AppState.engine.visionManager = new VisionManager();
    AppState.engine.movementManager = new MovementManager();
    AppState.engine.combatManager = new CombatManager();
    AppState.engine.skillManager = new SkillManager();

    AppState.engine.timeManager = new TimeManager();
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



    window.testAutoAttack = () => {
        AppState.engine.combatManager.triggerAutoAttack();
    };
    window.testFindAndAttack = () => {
        AppState.engine.combatManager.findAndAttack();
    };
    window.findAndAttack = () => {
        AppState.engine.combatManager.findAndAttack();
    };

    // Внутри инициализации AppState.engine в play.js добавляем глобальный метод:
    AppState.engine.spawnPopupText = function(unit, text, colorHex = 0xffffff) {
        if (!unit || !AppState.engine.app || !AppState.engine.app.stage) return;

        const hexMath = AppState.engine.hexMath;
        const appStage = AppState.engine.app.stage;
        const worldMapContainer = AppState.engine.worldMapContainer;

        // Считываем плавные визуальные координаты юнита на карте
        const mapX = unit.visualX || 0;
        const mapY = (unit.visualY || 0) - (hexMath.size * 0.8);

        // Переводим локальные координаты карты в глобальные экранные
        let globalX = mapX + (worldMapContainer ? worldMapContainer.x : 0);
        let globalY = mapY + (worldMapContainer ? worldMapContainer.y : 0);

        // =========================================================================
        // 🌟 ТОЧЕЧНЫЙ ПРИКАЗ ВЫПОЛНЕН: Защита от накладывания текстов друг на друга
        // =========================================================================
        // 1. Добавляем случайное смещение по горизонтали в пределах 15 пикселей вправо-влево,
        // чтобы AoE-урон по пачке врагов разлетался в стороны и оставался читаемым
        const randomShiftX = (Math.random() - 0.5) * 30;
        globalX += randomShiftX;

        // 2. Проверяем, сколько попапов уже висит над этим юнитом прямо сейчас.
        // Если на экране уже есть текст, сдвигаем новый попап вертикально вверх на 20 пикселей,
        // чтобы они выстраивались в красивую аккуратную очередь (например, Урон, а над ним Энергия)
        if (!unit.activePopupCount) {
            unit.activePopupCount = 0;
        }
        const stackOffsetY = unit.activePopupCount * 20;
        globalY -= stackOffsetY;

        // Увеличиваем счетчик активных текстов над этим персонажем
        unit.activePopupCount++;

        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fontWeight: 'bold',
            fill: colorHex,
            stroke: 0x000000,
            strokeThickness: 4,
            align: 'center'
        });

        const pixiText = new PIXI.Text(text, textStyle);
        pixiText.anchor.set(0.5, 0.5);
        pixiText.x = globalX;
        pixiText.y = globalY;

        pixiText.zIndex = 999999;
        appStage.sortableChildren = true;
        appStage.addChild(pixiText);

        if (appStage.sortChildren) {
            appStage.sortChildren();
        }

        let elapsedMS = 0;
        const durationMS = 800;
        const floatSpeed = 0.05;

        const animateText = (ticker) => {
            const deltaMS = ticker.deltaTime * (1000 / 60);
            elapsedMS += deltaMS;

            if (elapsedMS < durationMS) {
                pixiText.y -= floatSpeed * deltaMS; // Плавно летит вверх по экрану

                if (elapsedMS > durationMS * 0.5) {
                    pixiText.alpha = 1.0 - ((elapsedMS - durationMS * 0.5) / (durationMS * 0.5));
                }
            } else {
                // Перед удалением текста уменьшаем счетчик попапов у юнита
                if (unit.activePopupCount > 0) {
                    unit.activePopupCount--;
                }

                if (pixiText.parent) {
                    pixiText.parent.removeChild(pixiText);
                }
                pixiText.destroy();
                AppState.engine.app.ticker.remove(animateText);
            }
        };

        AppState.engine.app.ticker.add(animateText);
    };

    AppState.engine.flashDamage = function(charId) {
        const char = AppState.characters[charId];
        if (char) {
            char.damageFlashTimer = 250;
            char.healFlashTimer = 0;
            if (AppState.engine.redrawMap) AppState.engine.redrawMap();
        }
    };

    /**
     * Запуск зеленой вспышки исцеления на 300 миллисекунд
     */
    AppState.engine.flashHeal = function(charId) {
        const char = AppState.characters[charId];
        if (char) {
            char.healFlashTimer = 300;
            char.damageFlashTimer = 0;
            if (AppState.engine.redrawMap) AppState.engine.redrawMap();
        }
    };

    AppState.engine.centerCameraOnCharacter = function(charId) {
        const char = AppState.entities[charId];
        const worldMapContainer = AppState.engine.worldMapContainer;
        const hexMath = AppState.engine.hexMath;
        if (!char || !worldMapContainer || !hexMath) return;

        // Считываем 3D-высоту тайла под ногами персонажа, чтобы камера не съезжала на горах
        let tileHeight = 1;
        const mapKey = `${char.mapPosition.q},${char.mapPosition.r}`;
        const currentMap = typeof getActiveMap === 'function' ? getActiveMap() : null;
        if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
            tileHeight = currentMap.tiles.get(mapKey).height || 1;
        }

        // Вычисляем точные пиксельные координаты персонажа на карте
        const pixelPos = hexMath.cubeToPixel(char.mapPosition.q, char.mapPosition.r);
        const liftY = (tileHeight - 1) * (AppState.config?.heightStep || 16);

        const targetX = char.visualX !== undefined ? char.visualX : pixelPos.x;
        // const targetY = char.visualY !== undefined ? (char.visualY - (hexMath.size * 0.8)) : (pixelPos.y - liftY - (hexMath.size * 0.8));
        const targetY = char.visualY !== undefined ? (char.visualY ) : (pixelPos.y - liftY );

        // Находим точный центр экрана устройства игрока
        const screenCenterX = AppState.engine.app.screen.width / 2;
        const screenCenterY = AppState.engine.app.screen.height / 2;

        // Мгновенно сдвигаем контейнер карты в нужную точку
        worldMapContainer.x = screenCenterX - targetX;
        worldMapContainer.y = screenCenterY - targetY;

        console.log(`🎥 [Camera] Камера мгновенно сцентрирована на герое: ${char.name}`);
    };

    /**
     * 🎥 МЕТОД Б: Непрерывное плавное следование за персонажем (Вызывается КАЖДЫЙ кадр в тикере)
     */
    AppState.engine.updateCameraSystem = function(ticker) {
        const settings = AppState.game_settings;
        if (!settings || settings.playerCamera !== 'fixed') return; // Если не fixed — свободный режим, камеру не трогаем

        const worldMapContainer = AppState.engine.worldMapContainer;
        const activeId = AppState.play?.activeCharacterId;
        const hexMath = AppState.engine.hexMath;
        if (!worldMapContainer || !activeId || !hexMath) return;

        const char = AppState.entities[activeId];
        if (!char) return;

        // Центр экрана
        const screenCenterX = AppState.engine.app.screen.width / 2;
        const screenCenterY = AppState.engine.app.screen.height / 2;

        // Используем плавные визуальные координаты текущего лерпа движения фигурки
        const targetX = char.visualX || 0;
        // Сдвигаем фокус камеры чуть выше (на 0.8 от размера гекса), ближе к голове модели
        // const targetY = (char.visualY || 0) - (hexMath.size * 0.8);
        const targetY = (char.visualY || 0);

        // Жестко привязываем контейнер карты к координатам бегущего персонажа без отрыва
        worldMapContainer.x = screenCenterX - targetX;
        worldMapContainer.y = screenCenterY - targetY;
    };



}
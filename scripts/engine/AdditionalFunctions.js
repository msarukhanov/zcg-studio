export function initAdditionalFunctions() {

    // Заменяем ваш старый блок инициализации Pixi v8

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
            AppState.engine.renderMap();
        }
    };

    AppState.engine.flashHeal = function(charId) {
        const char = AppState.characters[charId];
        if (char) {
            char.healFlashTimer = 300;
            char.damageFlashTimer = 0;
            AppState.engine.renderMap();
        }
    };











    AppState.engine.getEntitiesOnTile = function(tile, mapId = null, type = 'entities') {
        const entities = [];
        if(!mapId) mapId = AppState.map.mapId;

        Object.keys(AppState[type]).forEach(id => {
            const e = AppState[type][id];
            if (e.mapId===mapId && e.mapPosition.q === tile.q && e.mapPosition.r === tile.r) {
                entities.push(e);
            }
        });

        return entities;
    }

    if(AppState.engine.combatManager) {
        window.testAutoAttack = () => {
            AppState.engine.combatManager.triggerAutoAttack();
        };
        window.testFindAndAttack = () => {
            AppState.engine.combatManager.findAndAttack();
        };
        window.findAndAttack = () => {
            AppState.engine.combatManager.findAndAttack();
        };
    }
}
import { AppState, getActiveMap, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';

export function renderTile(tile) {
    const worldMapContainer = AppState.engine.worldMapContainer;
    const hexMath = AppState.engine.hexMath;
    const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
    const config = AppState.ConfigTerrain[tile.type];
    if (!config) return;

    // Проверка видимости
    let isVisible = AppState.editor.globalMode === 'Editor' ? true : AppState.play.visibleTiles.has(`${tile.q},${tile.r}`);
    let isVisited = AppState.editor.globalMode === 'Editor' ? true : AppState.player.exploredTiles.has(`${tile.q},${tile.r}`);
    if (!isVisible && !isVisited) return;

    // Фракции
    const tileFactionId = AppState.engine.factionManager.getTileFaction(tile);
    const tileFaction = tileFactionId ? AppState.factions?.[tileFactionId] : null;

    // Текстуры
    const assetVariant = config.images[tile.imageIndex] || config.images;
    const imagePath = assetVariant.base || assetVariant;
    let tileTexture = PIXI.Assets.cache.has(imagePath) ? PIXI.Assets.get(imagePath) : null;

    // Расчет высот и координат
    const groundY = pixelPos.y;
    const targetHeight = tile.height;
    const roofY = groundY - (targetHeight - 1) * AppState.config.heightStep;
    const centerX = pixelPos.x;
    const centerY = roofY;

    // --- 1. ОТРИСОВКА СТЕНЫ (Ваша оригинальная логика) ---
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

    if (targetHeight > 1) {
        const sliceStep = Math.max(1, Math.floor(hexMath.size * 0.05));
        for (let pixelY = groundY; pixelY >= roofY; pixelY -= sliceStep) {
            const wallSlice = new PIXI.Sprite(tileTexture);
            wallSlice.anchor.set(0.5, 0.5);
            wallSlice.x = pixelPos.x;
            wallSlice.y = pixelY;

            if (tileTexture) {
                wallSlice.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);
            } else {
                wallSlice.width = hexMath.width;
                wallSlice.height = hexMath.height;
            }

            wallSlice.tint = wallTint;
            if (isVisited && !isVisible) {
                wallSlice.tint = 0x222222;
            }
            wallSlice.zIndex = groundY + 0.01;
            worldMapContainer.addChild(wallSlice);
        }
    }

    // --- 2. ОТРИСОВКА КРЫШКИ (Ваша оригинальная логика) ---
    let roofSprite;
    if (tileTexture) {
        roofSprite = new PIXI.Sprite(tileTexture);
        roofSprite.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);
        roofSprite.anchor.set(0.5, 0.5);
        roofSprite.x = pixelPos.x;
        roofSprite.y = roofY;
        roofSprite.zIndex = groundY + 0.1;
        if (isVisible) roofSprite.tint = 0xffffff;
        else if (isVisited) roofSprite.tint = 0x555555;
        worldMapContainer.addChild(roofSprite);
    } else {
        // Оптимизированный фолбек земли через GraphicsContext
        roofSprite = new PIXI.Graphics(AppState.engine.HexContexts.fallback);
        roofSprite.tint = config.fallbackColor;
        roofSprite.position.set(centerX, centerY);
        roofSprite.zIndex = groundY + 0.1;
        worldMapContainer.addChild(roofSprite);
    }

    // --- 3. ИНТЕРФЕЙСНЫЕ СЛОИ (Оптимизировано через v8 GraphicsContext) ---

    // Подсветка активного персонажа (селектор)
    if (AppState.play.activeCharacterId) {
        const activeChar = AppState.entities[AppState.play.activeCharacterId];
        if (activeChar && activeChar.mapPosition.q === tile.q && activeChar.mapPosition.r === tile.r && activeChar.action === 'idle') {
            const selectorGfx = new PIXI.Graphics(AppState.engine.HexContexts.activeSelector);
            selectorGfx.position.set(centerX, centerY);
            selectorGfx.zIndex = roofSprite.zIndex + 0.02;
            worldMapContainer.addChild(selectorGfx);
        }
    }

    // Зона каста способностей
    if (tile.isSkillTargetZone) {
        let color = 0xf1c40f;
        if (tile.skillVisualColor === "white") color = 0xffffff;
        if (tile.skillVisualColor === "orange") color = 0xff6b6b;
        if (tile.skillVisualColor === "blue") color = 0x00d2ff;
        if (tile.skillVisualColor === "green") color = 0x2ecc71;
        if (tile.skillVisualColor === "purple") color = 0x9b59b6;

        const skillGfx = new PIXI.Graphics(AppState.engine.HexContexts.skillZone);
        skillGfx.tint = color;
        skillGfx.position.set(centerX, centerY);
        skillGfx.zIndex = roofSprite.zIndex + 0.03;
        worldMapContainer.addChild(skillGfx);
    }

    // Подложка фракции
    if (tileFaction) {
        const factionConfig = tileFaction || { color: 0x0077ff };
        const factionGfx = new PIXI.Graphics(AppState.engine.HexContexts.faction);
        factionGfx.tint = factionConfig.color;
        factionGfx.position.set(centerX, centerY);
        factionGfx.zIndex = roofSprite.zIndex + 0.01;
        worldMapContainer.addChild(factionGfx);
    }

    // Черный контур сетки гекса
    if (AppState.main.Grid) {
        const gridGfx = new PIXI.Graphics(AppState.engine.HexContexts.grid);
        gridGfx.position.set(centerX, centerY);
        gridGfx.zIndex = roofSprite.zIndex + 0.04;
        worldMapContainer.addChild(gridGfx);
    }


    if (AppState.main.MovementCells && AppState.play.cachedReachableTiles && AppState.play.cachedReachableTiles.length && AppState.play.activeCharacterId) {
        const activeChar = AppState.entities[AppState.play.activeCharacterId];

        // Рисуем подсветку только если есть активный чар и он не в движении
        if (activeChar && activeChar.action !== 'move') {
            // Быстро проверяем, входит ли текущий тайл в список подсвечиваемых клеток
            const isReachable = AppState.play.cachedReachableTiles.some(t => t.q === tile.q && t.r === tile.r);

            if (isReachable) {
                // Находим этот тайл в кэше, чтобы узнать, вражеский ли это таргет
                const targetTile = AppState.play.cachedReachableTiles.find(t => t.q === tile.q && t.r === tile.r);
                const zoneColor = targetTile?.isEnemyTarget ? 0xff3333 : 0x00f5d4; // Красный враг, бирюзовый ход

                // Штампуем оптимизированную геометрию гекса из вашего HexContexts
                const movementZoneGfx = new PIXI.Graphics(AppState.engine.HexContexts.skillZone);
                movementZoneGfx.tint = zoneColor;
                movementZoneGfx.alpha = 0.35; // Полупрозрачность, как у вас и было
                movementZoneGfx.position.set(centerX, centerY); // Встает ровно на крышку гекса roofY

                // Кладём строго поверх крышки, но под сетку гекса
                movementZoneGfx.zIndex = roofSprite.zIndex + 0.02;

                worldMapContainer.addChild(movementZoneGfx);
            }
        }
    }

    return { pixelPos, roofY, isVisible, roofSprite, isVisited, tileFaction };
}


export function renderEntity(unit, charsOnThisTile, index, tile, tileFaction, roofSprite, pixelPos, roofY) {
    let hasSpriteLoaded = false;
    let YoffsetHeight = 12;

    let unitContainer;

    // Проверяем: есть ли свободный контейнер в пуле?
    if (AppState.engine.unitContainerPool.length > 0) {
        unitContainer = AppState.engine.unitContainerPool.pop(); // Берем со склада
        unitContainer.visible = true; // Делаем видимым

        // Мягко удаляем старых детей из контейнера (тексты, графику, спрайты),
        // но сам контейнер не уничтожается!
        unitContainer.removeChildren();
    } else {
        // Если на складе пусто — создаем новый (это произойдет только в первые секунды игры)
        unitContainer = new PIXI.Container();
        unitContainer.isUnitContainer = true; // Пометка для renderMap
    }

    const shiftX = (charsOnThisTile > 1) ? (index - (charsOnThisTile - 1) / 2) * 14 : 0;

    if (!unit.action || unit.action === 'idle') {
        unit.visualX = pixelPos.x;
        unit.visualY = roofY;
    }

    const isObject = !!AppState.objects[unit.id];
    const isChar = !!AppState.characters[unit.id];
    const isProjectile = unit.type === 'projectile';

    unitContainer.x = unit.visualX + (isObject ? 0 : shiftX);
    unitContainer.y = unit.visualY;

    if (unit.action === 'move' || AppState.map.isPlatformerMode) {
        unitContainer.zIndex = 10000 + index;
    } else {
        unitContainer.zIndex = roofSprite.zIndex + 0.5 + (index * 0.01);
    }

    let frameImagePath = null;
    if (unit.animations && unit.animations[unit.action] && unit.animations[unit.action][unit.directionV]) {
        const animArray = unit.animations[unit.action][unit.directionV];
        if (animArray && animArray.length > 0) {
            frameImagePath = animArray[unit.currentFrameIndex % animArray.length];
        }
    } else if (unit.animations && unit.animations[unit.action] && unit.animations[unit.action][unit.direction]) {
        const animArray = unit.animations[unit.action][unit.direction];
        if (animArray && animArray.length > 0) {
            frameImagePath = animArray[unit.currentFrameIndex % animArray.length];
        }
    } else {
        frameImagePath = unit.image;
    }

    if (frameImagePath && typeof PIXI.Assets !== 'undefined' && PIXI.Assets.cache.has(frameImagePath)) {
        hasSpriteLoaded = true;
    }

    if (hasSpriteLoaded) {
        const texture = PIXI.Assets.get(frameImagePath);
        const characterSprite = new PIXI.Sprite(texture);
        characterSprite.anchor.set(0.5, 1.0);
        characterSprite.width = AppState.sizes.char.width;
        characterSprite.height = AppState.sizes.char.height;

        if (unit.ar) {
            characterSprite.width = characterSprite.height / unit.ar;
        }

        const maxHexWidth = 1.73205 * AppState.sizes.hex;
        if (characterSprite.width > maxHexWidth) {
            characterSprite.width = maxHexWidth;
            if (unit.ar) {
                characterSprite.height = characterSprite.width * unit.ar;
            } else {
                const textureAr = characterSprite.texture.height / characterSprite.texture.width;
                characterSprite.height = characterSprite.width * textureAr;
            }
        }

        characterSprite.y = 12;
        if (unit.centered) {
            characterSprite.y = characterSprite.height / 2;
            YoffsetHeight = characterSprite.height / 2;
        }

        if (unit.damageFlashTimer && unit.damageFlashTimer > 0) {
            characterSprite.tint = 0xff5555;
        } else if (unit.healFlashTimer && unit.healFlashTimer > 0) {
            characterSprite.tint = 0x55ff55;
        } else {
            characterSprite.tint = 0xffffff;
        }

        if (unit.isDead === true) {
            characterSprite.anchor.set(0.5, 0.5);
            characterSprite.rotation = Math.PI / 2;
            characterSprite.alpha = 0.9;
            unitContainer.zIndex = roofSprite.zIndex + 1000.05 + (index * 0.01);
        }
        unitContainer.addChild(characterSprite);
    } else {
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

        const circle = new PIXI.Graphics(AppState.engine.EntityContexts.fallbackCircle);
        circle.tint = markerColor;
        unitContainer.addChild(circle);

        const dirArrow = unit.direction === 'left' ? '◀' : '▶';
        if (unit.name) {
            const textLabel = unit.id === 'rafael' ? `${dirArrow}${unit.name.charAt(0)}` : unit.name.charAt(0).toUpperCase();
            const text = new PIXI.Text({
                text: textLabel,
                style: { fontSize: 11, fill: 0xffffff, fontWeight: 'bold' }
            });
            text.anchor.set(0.5, 0.5);
            unitContainer.addChild(text);
        }
    }

    if (unit.stats) {
        const barWidth = AppState.sizes.char.width;
        const barHeight = 4;
        const barSpacing = 2;
        const offsetY = -1 * AppState.sizes.char.height + YoffsetHeight;
        const localStartX = -barWidth / 2;
        const localStartY = offsetY;

        const hpBg = new PIXI.Graphics(AppState.engine.EntityContexts.barPixel);
        hpBg.position.set(localStartX, localStartY);
        hpBg.scale.set(barWidth, barHeight);
        hpBg.tint = 0x222222;
        hpBg.alpha = 0.8;
        unitContainer.addChild(hpBg);

        const currentHp = unit.stats.hp || 0;
        const maxHp = unit.stats.maxHp || 100;
        const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
        if (hpRatio > 0) {
            const hpFill = new PIXI.Graphics(AppState.engine.EntityContexts.barPixel);
            hpFill.position.set(localStartX, localStartY);
            hpFill.scale.set(barWidth * hpRatio, barHeight);
            hpFill.tint = 0x2ecc71;
            unitContainer.addChild(hpFill);
        }

        const currentEnergy = unit.stats.energy || 0;
        const maxEnergy = unit.stats.maxEnergy || 100;
        const energyRatio = Math.max(0, Math.min(1, currentEnergy / maxEnergy));
        const localEnergyY = localStartY + barHeight + barSpacing;

        const energyBg = new PIXI.Graphics(AppState.engine.EntityContexts.barPixel);
        energyBg.position.set(localStartX, localEnergyY);
        energyBg.scale.set(barWidth, barHeight);
        energyBg.tint = 0x222222;
        energyBg.alpha = 0.8;
        unitContainer.addChild(energyBg);

        if (energyRatio > 0) {
            const energyFill = new PIXI.Graphics(AppState.engine.EntityContexts.barPixel);
            energyFill.position.set(localStartX, localEnergyY);
            energyFill.scale.set(barWidth * energyRatio, barHeight);
            energyFill.tint = 0x3498db;
            unitContainer.addChild(energyFill);
        }
    }

    if (unit.type === 'city') {
        if (tile.province) {
            unit.production = tile.province;
        }

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
        cityText.anchor.set(0.5, 0);
        cityText.x = 0;
        cityText.y = AppState.sizes.hex / 2;

        const bgWidth = AppState.sizes.char.width;
        const bgHeight = cityText.height + 6;

        const cityG = new PIXI.Graphics(AppState.engine.EntityContexts.cityBg);
        cityG.position.set(-bgWidth / 2, cityText.y - 3);

// Делим нужный размер на базовый размер шаблона (100 и 24)
        cityG.scale.set(bgWidth / 100, bgHeight / 24);
        cityG.tint = tileFaction ? tileFaction.color : 0x000000;
        cityG.alpha = 0.6;

        unitContainer.addChild(cityG);
        unitContainer.addChild(cityText);
    }

    if (unit.currentPassiveCircleG) {
        if (unit.currentPassiveCircleG.parent) {
            unit.currentPassiveCircleG.parent.removeChild(unit.currentPassiveCircleG);
        }
        unit.currentPassiveCircleG.destroy();
        unit.currentPassiveCircleG = null;
    }

    if (unit.effects && unit.effects.length > 0) {
        unit.effects.forEach(eff => {
            const effId = eff.id || eff.effect_id;
            if (!effId || !AppState.effects) return;
            const effectConfig = AppState.effects[effId];
            if (!effectConfig) return;

            let color = 0xffffff;
            if (effectConfig.visual_color === "gold") color = 0xf1c40f;
            if (effectConfig.visual_color === "orange") color = 0xff6b6b;
            if (effectConfig.visual_color === "blue") color = 0x00d2ff;
            if (effectConfig.visual_color === "green") color = 0x2ecc71;
            if (effectConfig.visual_color === "purple") color = 0x9b59b6;
            if (effectConfig.visual_color === "white") color = 0xffffff;

            const radius = AppState.engine.hexMath.size * 0.5;

            const passiveHexG = new PIXI.Graphics(AppState.engine.EntityContexts.passiveCircle);
            passiveHexG.position.set(0, 0);
            passiveHexG.scale.set(radius);
            passiveHexG.tint = color;

            // unitContainer.addChild(passiveHexG);
        });
    }

    AppState.engine.worldMapContainer.addChild(unitContainer);
}


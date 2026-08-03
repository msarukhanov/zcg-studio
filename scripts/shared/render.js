import { AppState, getActiveMap, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';

export function renderTile(tile) {

    const worldMapContainer = AppState.engine.worldMapContainer;
    const uiLayerContainer = AppState.engine.uiLayerContainer;
    const hexMath = AppState.engine.hexMath;

    const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
    const config = AppState.ConfigTerrain[tile.type];
    if (!config) return;

    let isVisible = AppState.editor.globalMode === 'Editor' ? true : AppState.play.visibleTiles.has(`${tile.q},${tile.r}`);
    let isVisited = AppState.editor.globalMode === 'Editor' ? true : AppState.player.exploredTiles.has(`${tile.q},${tile.r}`);

    if (!isVisible && !isVisited) return;

    const tileFactionId = AppState.engine.factionManager.getTileFaction(tile);
    const tileFaction = tileFactionId ? AppState.factions?.[tileFactionId] : null;

    const assetVariant = config.images[tile.imageIndex] || config.images;
    const imagePath = assetVariant.base || assetVariant;
    let tileTexture = PIXI.Assets.cache.has(imagePath) ? PIXI.Assets.get(imagePath) : null;

    const groundY = pixelPos.y;
    const targetHeight = tile.height;
    const roofY = groundY - (targetHeight - 1) * AppState.config.heightStep;

    const centerX = pixelPos.x;
    const centerY = roofY;

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

    // Отрисовка стены
    if (targetHeight > 1) {
        const sliceStep = Math.max(1, Math.floor(hexMath.size * 0.05));
        for (let pixelY = groundY; pixelY >= roofY; pixelY -= sliceStep) {
            const wallSlice = new PIXI.Sprite(tileTexture);
            wallSlice.anchor.set(0.5, 0.5);
            wallSlice.x = pixelPos.x; wallSlice.y = pixelY;

            if (tileTexture) {
                wallSlice.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);
            } else {
                wallSlice.width = hexMath.width; wallSlice.height = hexMath.height;
            }

            wallSlice.tint = wallTint;
            if (isVisited && !isVisible) {
                wallSlice.tint = 0x222222;
            }

            wallSlice.zIndex = groundY + 0.01;
            worldMapContainer.addChild(wallSlice);
        }
    }

    let roofSprite;
    // Отрисовка крышки

    if (tileTexture) {
        roofSprite = new PIXI.Sprite(tileTexture);
        roofSprite.scale.set(hexMath.width / tileTexture.width, hexMath.height / tileTexture.height);

        roofSprite.anchor.set(0.5, 0.5);
        roofSprite.x = pixelPos.x; roofSprite.y = roofY;

        roofSprite.zIndex = groundY + 0.1;

        if (isVisible) roofSprite.tint = 0xffffff;
        else if (isVisited) roofSprite.tint = 0x555555;

        worldMapContainer.addChild(roofSprite);
    }
    else {
        roofSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        roofSprite.width = hexMath.width;
        roofSprite.height = hexMath.height;

        const roofSprite2 = new PIXI.Sprite(PIXI.Texture.WHITE);
        roofSprite2.anchor.set(0.5, 0.5);
        roofSprite2.x = pixelPos.x; roofSprite2.y = roofY;
        roofSprite2.width = hexMath.width;
        roofSprite2.height = hexMath.height;
        roofSprite2.tint = 0x87CEEB;
        // roofSprite2.tint = config.fallbackColor;
        roofSprite2.zIndex = groundY + 0.1;

        worldMapContainer.addChild(roofSprite2);
    }

    const tileGraphics = new PIXI.Graphics();
    const h = Math.sqrt(3) * hexMath.size;
    const localCorners = hexMath.getHexCornerPoints(0, 0);

    // Локальные вершины гексагона flat-topped (относительно центра 0,0)
    const localHexPoints = [
        hexMath.size,       0,
        hexMath.size / 2,   h / 2,
        -hexMath.size / 2,  h / 2,
        -hexMath.size,       0,
        -hexMath.size / 2,  -h / 2,
        hexMath.size / 2,   -h / 2
    ];

    // 1. Подсветка активного персонажа (селектор)
    if (AppState.play.activeCharacterId) {
        const activeChar = AppState.entities[AppState.play.activeCharacterId];
        if (activeChar && activeChar.mapPosition.q === tile.q && activeChar.mapPosition.r === tile.r && activeChar.action === 'idle') {
            tileGraphics.lineStyle(5, 0xffd166, 1);
            tileGraphics.beginFill(0xffd166, 0.5);
            tileGraphics.drawPolygon(localHexPoints);
            tileGraphics.endFill();
        }

        // if (activeChar.action !== 'move' && AppState.play.cachedReachableTiles && AppState.play.cachedReachableTiles.find(t => tile.q === t.q && tile.r === t.r)) {
        //     const moveColor = tile.isEnemyTarget ? 0xff3333 : 0x00f5d4; // Красный если враг, бирюзовый если ход
        //     tileGraphics.beginFill(moveColor, 0.35);
        //     tileGraphics.drawPolygon(localHexPoints);
        //     tileGraphics.endFill();
        // }
    }

    // 2. Зона каста способностей
    if (tile.isSkillTargetZone) {
        let color = 0xf1c40f;
        if (tile.skillVisualColor === "white") color = 0xffffff;
        if (tile.skillVisualColor === "orange") color = 0xff6b6b;
        if (tile.skillVisualColor === "blue") color = 0x00d2ff;
        if (tile.skillVisualColor === "green") color = 0x2ecc71;
        if (tile.skillVisualColor === "purple") color = 0x9b59b6;

        tileGraphics.lineStyle(4, color, 0.4);
        tileGraphics.beginFill(color, 0.2);
        tileGraphics.drawPolygon(localHexPoints);
        tileGraphics.endFill();
    }

    // 3. Подложка фракции
    if (tileFaction) {
        const factionConfig = tileFaction || { color: 0x0077ff };
        tileGraphics.poly(localCorners, true);
        tileGraphics.fill({ color: factionConfig.color, alpha: 0.3 });
    }

    // 4. Черный контур сетки гекса
    tileGraphics.poly(localCorners, true);
    tileGraphics.stroke({ width: 1.5, color: 0x000000, alpha: 0.25 });

    // Позиционируем собранный графический объект ровно по центру крышки
    tileGraphics.x = centerX;
    tileGraphics.y = centerY;
    tileGraphics.zIndex = roofSprite.zIndex + 0.02;

    worldMapContainer.addChild(tileGraphics);

    return { pixelPos, roofY, isVisible, roofSprite, isVisited, tileFaction };
}

import { AppState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';


export class PathRenderer {
    /**
     * @param {HexMath} hexMath
     * @param {PIXI.Container} worldMapContainer - Добавляем графику прямо в контейнер карты, чтобы избежать багов слоев
     */
    constructor() {
        const hexMath = AppState.engine.hexMath;

        // Оставляем только один служебный графический объект для стрелочки пути
        this.pathGraphics = new PIXI.Graphics();
        this.pathGraphics.zIndex = 6000; // Ложится строго поверх всех крышек
        AppState.engine.worldMapContainer.addChild(this.pathGraphics);

        this.activeZoneSprites = [];
        this.activePathSprites = [];
    }

    /**
     * ИСПРАВЛЕННЫЙ ВАРИАНТ: Рисует маркеры пути A* через стабильные спрайты-точки
     */
    drawPath(path, character) {

        const hexMath = AppState.engine.hexMath; 
        
        this.clearPath(); // Стираем старые точки и линии перед каждым новым ховером мыши

        if (!path || path.length < 2) return;

        let accumulatedCost = 0;
        let currentMP = character.currentMovePoints;

        const lastTile = path[path.length - 1];
        const isCombatPath = lastTile && lastTile.isEnemyTarget === true;

        const pathColor = isCombatPath ? 0xff3333 : 0x00f5d4;

        for (let i = 1; i < path.length; i++) {
            const fromTile = path[i - 1];
            const toTile = path[i];

            // Находим 3D-центр предыдущей клетки
            const fromPixel = hexMath.cubeToPixel(fromTile.q, fromTile.r);
            const fromLift = (fromTile.height - 1) * (hexMath.size * 0.25);
            const startX = fromPixel.x;
            const startY = fromPixel.y - fromLift;

            // Находим 3D-центр текущей клетки
            const toPixel = hexMath.cubeToPixel(toTile.q, toTile.r);
            const toLift = (toTile.height - 1) * (hexMath.size * 0.25);
            const endX = toPixel.x;
            const endY = toPixel.y - toLift;

            // Вычисляем расстояние (длину будущей линии) и тригонометрический угол направления
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Создаем линию как вытянутый белый прямоугольник
            const lineSprite = new PIXI.Sprite(PIXI.Texture.WHITE);

            // Якорь ставим по левому краю по центру по вертикали (чтобы линия ровно тянулась из старта в финиш)
            lineSprite.anchor.set(0.0, 0.5);
            lineSprite.x = startX;
            lineSprite.y = startY;

            // Задаем габариты отрезка
            lineSprite.width = distance;  // Длина линии в пикселях
            lineSprite.height = 4;        // Толщина линии в пикселях
            lineSprite.rotation = angle;  // Разворачиваем спрайт строго по вектору направления

            lineSprite.tint = pathColor;
            lineSprite.alpha = 0.65;

            // Линия ложится поверх крышек ландшафта, но под финишные маркеры-квадратики
            // lineSprite.zIndex = Math.min(fromPixel.y, toPixel.y) + (Math.max(fromTile.height, toTile.height) * 0.1) + 0.04;
            lineSprite.zIndex = 5000;

            AppState.engine.worldMapContainer.addChild(lineSprite);
            this.activePathSprites.push(lineSprite);
        }

        // 2. ВТОРОЙ ПРОХОД: Насаждаем маркеры-квадратики поверх прочерченных линий
        path.forEach((tile, index) => {
            if (index === 0) return; // Пропускаем стартовый гекс под Рафаэлем

            const prevTile = path[index - 1];
            accumulatedCost += AppState.engine.movementManager.getMovementCost(prevTile, tile);

            const dotSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            dotSprite.anchor.set(0.5, 0.5);

            const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
            const liftY = (tile.height - 1) * (hexMath.size * 0.25);

            dotSprite.x = pixelPos.x;
            dotSprite.y = pixelPos.y - liftY;

            dotSprite.width = 12;
            dotSprite.height = 12;

            // Выбираем цвет: бирюзовый (хватает MP) или розовый (будущие ходы)
            dotSprite.tint = accumulatedCost <= currentMP ? 0x00f5d4 : 0xff007f;
            dotSprite.alpha = 0.95;

            // Квадратики ложатся строго поверх линий (zIndex выше на сотую долю)
            // dotSprite.zIndex = pixelPos.y + (tile.height * 0.1) + 0.06;
            dotSprite.zIndex = 5100;

            AppState.engine.worldMapContainer.addChild(dotSprite);
            this.activePathSprites.push(dotSprite);
        });

        // РАМКА ПРИ НАВЕДЕНИИ: Контур без внутренней заливки
        if (lastTile) {
            const hexMath = AppState.engine.hexMath;
            const pixelPos = hexMath.cubeToPixel(lastTile.q, lastTile.r);
            const liftY = (lastTile.height - 1) * (hexMath.size * 0.25);

            const selectionFrame = new PIXI.Graphics();

            // 1. Сначала задаем стиль линии
            selectionFrame.lineStyle(3, isCombatPath ? 0xff3333 : 0x00f5d4, 1);
            // 2. Затем открываем заливку с альфой 0 (полностью прозрачная)
            selectionFrame.beginFill(0x000000, 0);

            const centerX = pixelPos.x;
            const centerY = pixelPos.y - liftY;

            const points = [
                centerX + hexMath.size,       centerY,
                centerX + hexMath.size / 2,   centerY + hexMath.height / 2,
                centerX - hexMath.size / 2,   centerY + hexMath.height / 2,
                centerX - hexMath.size,       centerY,
                centerX - hexMath.size / 2,   centerY - hexMath.height / 2,
                centerX + hexMath.size / 2,   centerY - hexMath.height / 2
            ];

            // 3. Рисуем полигон и закрываем заливку
            selectionFrame.drawPolygon(points);
            selectionFrame.endFill();

            selectionFrame.zIndex = 4500;

            AppState.engine.worldMapContainer.addChild(selectionFrame);
            this.activePathSprites.push(selectionFrame);
        }

        if (AppState.engine.worldMapContainer.sortChildren) {
            AppState.engine.worldMapContainer.sortChildren();
        }
    }


    clearPath() {
        this.activePathSprites.forEach(sprite => {
            if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
        });
        this.activePathSprites = [];
    }

    clearZone() {
        this.activeZoneSprites.forEach(sprite => {
            if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
        });
        this.activeZoneSprites = [];
    }

    clear() {
        this.clearPath();
        this.clearZone();
    }
}

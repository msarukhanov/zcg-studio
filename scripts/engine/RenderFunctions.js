function drawSkillZone(tile, pixelPos, roofY) {

    const hexMath = AppState.engine.hexMath;
    const worldMapContainer = AppState.engine.worldMapContainer;

    const castZoneHexG = new PIXI.Graphics();

    let color = 0xf1c40f; // Дефолтный золотой
    if (tile.skillVisualColor === "white") color = 0xffffff;
    if (tile.skillVisualColor === "orange") color = 0xff6b6b; // Оранжевый
    if (tile.skillVisualColor === "blue") color = 0x00d2ff;   // Синий
    if (tile.skillVisualColor === "green") color = 0x2ecc71;  // Зеленый
    if (tile.skillVisualColor === "purple") color = 0x9b59b6; // Фиолетовый

    castZoneHexG.lineStyle(4, color, 0.4);
    castZoneHexG.beginFill(color, 0.2);

    const centerX = pixelPos.x;
    const centerY = roofY;

    const h = Math.sqrt(3) * hexMath.size;
    const points = [
        centerX + hexMath.size,       centerY,
        centerX + hexMath.size / 2,   centerY + h / 2,
        centerX - hexMath.size / 2,   centerY + h / 2,
        centerX - hexMath.size,       centerY,
        centerX - hexMath.size / 2,   centerY - h / 2,
        centerX + hexMath.size / 2,   centerY - h / 2
    ];

    castZoneHexG.drawPolygon(points);
    castZoneHexG.endFill();

    // Ложится строго поверх крышки ландшафта
    castZoneHexG.zIndex = roofSprite.zIndex + 0.015;

    worldMapContainer.addChild(castZoneHexG);
}

function drawFactionBorders(tile, pixelPos, roofY, roofZIndex) {
    const fManager = AppState.engine.factionManager;
    if (!fManager || !tile) return;

    // 1. Вычисляем хозяина текущей клетки
    const currentFactionId = fManager.getTileFaction(tile);
    //
    // // Если клетка нейтральна — политическую графику для неё вообще не создаём
    // if (!currentFactionId) return;

    const factionConfig = AppState.factions?.[currentFactionId];

    let fillColor = 0xffffff;
    let strokeColor = 0xffffff;
    let hasColorData = false;

    if (factionConfig) {
        // Если у территории есть реальный фракционный хозяин — берем его цвета
        fillColor = factionConfig.color !== undefined ? factionConfig.color : 0xffffff;
        strokeColor = factionConfig.strokeColor !== undefined ? factionConfig.strokeColor : 0xffffff;
        hasColorData = true;
    }
    // 🌟 СТРОГИЙ ФИКС ДЛЯ РЕДАКТОРА: Если фракции нет, но клетка привязана к ПРОГРАММНОЙ ПРОВИНЦИИ
    else if (tile.province) {
        // Генерируем уникальный стабильный цвет из строки ID провинции (например, 'frozenburg')
        let hash = 0;
        for (let i = 0; i < tile.province.length; i++) {
            hash = tile.province.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Маскируем хэш, чтобы получить сочный шестнадцатеричный цвет (HEX)
        const generatedColor = Math.abs(hash) % 0xffffff;

        fillColor = generatedColor;
        strokeColor = generatedColor; // В редакторе можно сделать контур тем же цветом
        hasColorData = true;
    }

    // Если клетка абсолютно дикая (нет ни фракции, ни провинции) — графику не создаем
    if (!hasColorData) return;

    const hexMath = AppState.engine.hexMath;
    const worldMapContainer = AppState.engine.worldMapContainer;

    const factionGraphics = new PIXI.Graphics();

    const centerX = pixelPos.x;
    const centerY = roofY;

    // ТВОЙ ТОЧНЫЙ МАТЕМАТИЧЕСКИЙ РАСЧЕТ ВЕРШИН (Из работающей функции)
    const h = Math.sqrt(3) * hexMath.size - 3;
    const rawPoints = [
        centerX + hexMath.size,       centerY,         // Вершина 0 (Крайняя правая)
        centerX + hexMath.size / 2,   centerY + h / 2, // Вершина 1 (Справа внизу)
        centerX - hexMath.size / 2,   centerY + h / 2, // Вершина 2 (Слева внизу)
        centerX - hexMath.size,       centerY,         // Вершина 3 (Крайняя левая)
        centerX - hexMath.size / 2,   centerY - h / 2, // Вершина 4 (Слева вверху)
        centerX + hexMath.size / 2,   centerY - h / 2  // Вершина 5 (Справа вверху)
    ];

    // Превращаем плоский массив в удобную структуру [{x, y}]
    const corners = [];
    for (let i = 0; i < 6; i++) {
        corners.push({ x: rawPoints[i * 2], y: rawPoints[i * 2 + 1] });
    }

    // 2. ПОЛУПРОЗРАЧНАЯ ЗАЛИВКА ТЕРРИТОРИИ ИМПЕРИИ
    if (fillColor !== undefined) {
        factionGraphics.beginFill(fillColor, 0.12); // Мягкая прозрачность 12%
        factionGraphics.drawPolygon(rawPoints);
        factionGraphics.endFill(); // Запечатываем заливку фона!
    }

    // Запрашиваем 6 соседей прямо из твоего метода getNeighbors
    const neighbors = hexMath.getNeighbors(tile.q, tile.r);

    const neighborToFaceCorners = [
        { p1: 0, p2: 1 }, // index 0 (Справа вверху)
        { p1: 5, p2: 0 }, // index 1 (Строго вверху) -> Теперь нарисует здесь!
        { p1: 4, p2: 5 }, // index 2 (Слева вверху)  -> Теперь нарисует здесь!
        { p1: 3, p2: 4 }, // index 3 (Слева внизу)   -> Теперь нарисует здесь!
        { p1: 2, p2: 3 }, // index 4 (Строго внизу)
        { p1: 1, p2: 2 }  // index 5 (Справа внизу)
    ]

    // 3. АЛГОРИТМ ЧЁТКИХ ВНЕШНИХ ГОСГРАНИЦ (По твоей матрице дельты векторов)
    neighbors.forEach((n, index) => {
        const neighborTile = AppState.engine.MapManager.getTile(n.q, n.r);
        if (neighborTile) {
            // const neighborFaction = fManager.getTileFaction(neighborTile);
            //
            // // Если сосед из той же провинции/фракции — линию намертво пропускаем
            // if (neighborFaction === currentFactionId) return;

            const neighborFactionId = neighborTile ? fManager.getTileFaction(neighborTile) : '';
            const neighborProvinceId = neighborTile ? neighborTile.province : '';

            // КРИТИЧЕСКОЕ ПРАВИЛО ДЛЯ НЕЙТРАЛЬНЫХ ЗОН:
            // Мы НЕ рисуем границу, если у соседа совпадает ЛИБО фракция, ЛИБО ID той же провинции!
            if (currentFactionId) {
                if (neighborFactionId === currentFactionId) return;
            } else {
                // Если мы в ничейной провинции, забор пропускается, только если сосед из ЭТОЙ ЖЕ провинции
                if (neighborProvinceId === tile.province) return;
            }

            // ТВОЯ ЧЁТКАЯ МАТРИЦА СМЕЩЕНИЙ
            const coords = {
                q: tile.q - n.q,
                r: tile.r - n.r
            };

            const faces = neighborToFaceCorners[index];
            if (!faces) return;

            const startPoint = corners[faces.p1];
            const endPoint = corners[faces.p2];

            factionGraphics.beginPath();

            factionGraphics.moveTo(startPoint.x, startPoint.y);
            factionGraphics.lineTo(endPoint.x, endPoint.y);

            factionGraphics.stroke({ width: 3.0, color: strokeColor, alpha: 1 });
        }
    });

    // Кладем слой строго поверх крышки, как твоя зона каста
    factionGraphics.zIndex = roofZIndex + 0.015;
    worldMapContainer.addChild(factionGraphics);
}

export const RenderFunctions = {
    drawSkillZone,
    drawFactionBorders
}

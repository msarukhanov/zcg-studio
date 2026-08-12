import { AppState, getActiveMap, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';

export function renderTile3D(tile) {
    const scene = AppState.engine.threeScene;
    const hexMath = AppState.engine.hexMath;

    const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);
    const config = AppState.ConfigTerrain[tile.type];
    if (!config) return;

    // --- 1. ПРОВЕРКА ВИДИМОСТИ ---
    let isVisible = AppState.editor.globalMode === 'Editor' ? true : AppState.play.visibleTiles.has(`${tile.q},${tile.r}`);
    let isVisited = AppState.editor.globalMode === 'Editor' ? true : AppState.player.exploredTiles.has(`${tile.q},${tile.r}`);
    if (!isVisible && !isVisited) return;

    const tileFactionId = AppState.engine.factionManager.getTileFaction(tile);
    const tileFaction = tileFactionId ? AppState.factions?.[tileFactionId] : null;

    const assetVariant = config.images[tile.imageIndex] || config.images;
    const imagePath = assetVariant.base || assetVariant;
    const tileTexture = AppState.engine.threeTextureCache[imagePath];

    const targetHeight = tile.height;
    const wallHeight = (targetHeight - 1) * (AppState.config?.heightStep || 16);

    const worldX = pixelPos.x;
    const worldZ = pixelPos.y;

    // Базовый материал крышки гекса
    let roofMaterial;
    if (tileTexture) {
        roofMaterial = new THREE.MeshBasicMaterial({
            map: tileTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false // Для крышек оставляем false, чтобы прозрачные поля картинок не резали соседей
        });
    } else {
        roofMaterial = new THREE.MeshBasicMaterial({
            color: config.fallbackColor || 0x555555
        });
    }

    if (isVisible) roofMaterial.color.setHex(0xffffff);
    else if (isVisited) roofMaterial.color.setHex(0x555555);

    const tileGroup = new THREE.Group();

    // --- 3. КРЫШКА ГЕКСА (ROOF) ---
    const roofGeometry = new THREE.PlaneGeometry(hexMath.width, hexMath.height);
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.rotation.x = -Math.PI / 2;
    roofMesh.position.set(0, wallHeight, 0);

    // Поднимаем порядок отрисовки крышки, чтобы она гарантированно ложилась ПОВЕРХ стен своего столбика
    roofMesh.renderOrder = worldZ + 10.0;
    roofMesh.userData = {
        tile: tile,
        isTileRoof: true
    };

    tileGroup.add(roofMesh);


    // =========================================================================
    // 🏛️ ОТРИСОВКА ПОТОЛКА ЛАБИРИНТА / ПЕЩЕРЫ (CEILING OVER HEAD)
    // =========================================================================
    // Если это базовая проходимая ячейка земли (height === 1), над ней должна быть крыша!
    if (AppState.play.isFirstPersonMode) {
        const ceilingGeometry = new THREE.PlaneGeometry(hexMath.width, hexMath.height);

        // Создаем материал для потолка данжа.
        // Используем базовую текстуру тайла (или вы можете подставить текстуру камня/потолка)
        const ceilingMaterial = roofMaterial.clone();
        ceilingMaterial.depthWrite = true; // Чтобы потолок наглухо перекрывал верхнюю пустоту
        ceilingMaterial.opacity = 1.0;

        // Делаем потолок над головой темнее, так как туда падает меньше света
        ceilingMaterial.color.setHex(isVisited && !isVisible ? 0x111111 : 0x555555);

        const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);

        // ВАЖНО: Разворачиваем плоскость крыши ЛИЦОМ ВНИЗ к игроку! (+Math.PI / 2)
        ceilingMesh.rotation.x = Math.PI / 2;

        // Позиционируем потолок строго над этой клеткой на высоту dungeonCeilingHeight
        const ceilingY =  AppState.config.heightStep;
        ceilingMesh.position.set(0, ceilingY, 0);

        // renderOrder выставляем повыше, чтобы он корректно перекрывал дальние объекты
        ceilingMesh.renderOrder = worldZ + 20.0;

        tileGroup.add(ceilingMesh);

        // --- БОНУС: ВЕРТИКАЛЬНЫЕ ЗАГЛУШКИ МЕЖДУ СТЕНАМИ И ПОТОЛКОМ ---
        // Если рядом с этой клеткой земли стоит высокая стена, и она ВЫШЕ нашего потолка,
        // то открытое 3D пространство между верхом потолка и верхом стены закроется автоматически
        // за счет того, что мы переписали стены на работу со всеми соседями!
    }


    // --- 4. УНИВЕРСАЛЬНЫЕ СТЕНЫ РЕЛЬЕФА (360°) ---
    if (targetHeight > 1) {
        const gridMode = AppState.map?.gridMode;

        // Вспомогательная функция для создания физически правильной стены
        const createWall = (edgeWidth, currentWallHeight, offsetX, offsetZ, wallBaseY, angleRad, orderOffset) => {
            // КРИТИЧЕСКИЙ ФИКС СТЕН: Включаем depthWrite: true!
            // Теперь стена становится железным 3D-забором. Она наглухо перекроет
            // потолки (крышки) и подсветки, которые находятся за ней.
            const wallMaterial = roofMaterial.clone();
            wallMaterial.depthWrite = true;
            wallMaterial.color.setHex(isVisited && !isVisible ? 0x222222 : orderOffset);
            wallMaterial.opacity = 1.0;

            // ФИКС РАЗМЕРА ТЕКСТУРЫ:
            // Если стена слишком высокая (перепад высот большой), мы заставляем текстуру
            // повторяться по вертикали (repeat.y), а не растягиваться!
            if (wallMaterial.map) {
                const textureScaleY = currentWallHeight / (AppState.config?.heightStep || 16);
                wallMaterial.map = wallMaterial.map.clone(); // делаем копию текстуры для этой стены
                wallMaterial.map.repeat.set(1, textureScaleY); // 1 раз по ширине, N раз по высоте столбика
                wallMaterial.map.needsUpdate = true;
            }

            const wallGeometry = new THREE.PlaneGeometry(edgeWidth, currentWallHeight);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            wallMesh.position.set(offsetX, wallBaseY + currentWallHeight / 2, offsetZ);
            wallMesh.rotation.y = angleRad;

            // Микросдвиг наружу для исключения мерцания стыков
            wallMesh.position.x += Math.sin(angleRad) * 0.05;
            wallMesh.position.z += Math.cos(angleRad) * 0.05;

            // Стены рисуются раньше, чем крышка
            wallMesh.renderOrder = worldZ + 5.0;
            tileGroup.add(wallMesh);
        };

        // =========================================================================
        // КВАДРАТНАЯ СЕТКА
        // =========================================================================
        if (gridMode === 'square') {
            const squareNeighbors = [{
                q: 0,
                r: -1,
                angle: 180
            }, // Север
                {
                    q: 1,
                    r: 0,
                    angle: 90
                }, // Восток
                {
                    q: 0,
                    r: 1,
                    angle: 0
                }, // Юг
                {
                    q: -1,
                    r: 0,
                    angle: -90
                } // Запад
            ];

            const edgeWidth = hexMath.width;
            const distanceToEdge = hexMath.width / 2;

            squareNeighbors.forEach((dirConfig, index) => {
                const neighborTile = getTileFromState(tile.q + dirConfig.q, tile.r + dirConfig.r);
                const neighborH = neighborTile ? neighborTile.height : 1;
                const drop = tile.height - neighborH;

                if (drop > 0) {
                    const currentWallHeight = drop * (AppState.config?.heightStep || 16);
                    const wallBaseY = (neighborH - 1) * (AppState.config?.heightStep || 16);
                    const angleRad = (dirConfig.angle * Math.PI) / 180;

                    const offsetX = distanceToEdge * Math.sin(angleRad);
                    const offsetZ = distanceToEdge * Math.cos(angleRad);

                    let sideTint = 0x666666;
                    if (index === 2) sideTint = 0x999999; // Юг
                    if (index === 1) sideTint = 0x888888; // Восток
                    if (index === 0) sideTint = 0x444444; // Север
                    if (index === 3) sideTint = 0x555555; // Запад

                    createWall(edgeWidth, currentWallHeight, offsetX, offsetZ, wallBaseY, angleRad, sideTint);
                }
            });
        }
        // =========================================================================
        // ГЕКСАГОНАЛЬНАЯ СЕТКА
        // =========================================================================
        else {
            const neighbors = hexMath.getNeighbors(tile.q, tile.r);
            const distanceToEdge = hexMath.size * Math.sqrt(3) / 2;
            const edgeWidth = hexMath.size;

            neighbors.forEach((neighbor, index) => {
                const neighborTile = AppState.engine.MapManager.getTile(neighbor.q, neighbor.r);
                const neighborH = neighborTile ? neighborTile.height : 1;
                const drop = tile.height - neighborH;

                if (drop > 0) {
                    const currentWallHeight = drop * (AppState.config?.heightStep || 16);
                    const wallBaseY = (neighborH - 1) * (AppState.config?.heightStep || 16);

                    let angleRad = gridMode === 'pointyHex' ? ((index * 60 + 30) * Math.PI) / 180 : ((index * 60) * Math.PI) / 180;

                    const offsetX = distanceToEdge * Math.sin(angleRad);
                    const offsetZ = distanceToEdge * Math.cos(angleRad);

                    let sideTint = 0x666666;
                    if (index === 2 || index === 3) sideTint = 0x999999; // Юг
                    if (index === 0 || index === 5) sideTint = 0x444444; // Север

                    createWall(edgeWidth, currentWallHeight, offsetX, offsetZ, wallBaseY, angleRad, sideTint);
                }
            });
        }
    }

    // --- 5. ФУНКЦИЯ ДЛЯ ПОЛУПРОЗРАЧНЫХ ОВЕРЛЕЕВ (ЦВЕТНЫХ ФИЛЬТРОВ) ---
    const addOverlayFilter = (colorHex, opacityOffset, heightOffset) => {
        if (!tileTexture) return;
        const filterMaterial = new THREE.MeshBasicMaterial({
            map: tileTexture,
            color: colorHex,
            transparent: true,
            opacity: opacityOffset,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false // Фильтры лежат поверх крышки, Z-буфер им не нужен
        });

        const filterMesh = new THREE.Mesh(new THREE.PlaneGeometry(hexMath.width, hexMath.height), filterMaterial);
        filterMesh.rotation.x = -Math.PI / 2;
        filterMesh.position.set(0, wallHeight + heightOffset, 0);

        // Оверлеи рисуются в самую последнюю очередь, поверх крышки
        filterMesh.renderOrder = roofMesh.renderOrder + 5.0 + heightOffset;
        tileGroup.add(filterMesh);
    };

    // (Ваш оригинальный блок подсветок без изменений)
    if (AppState.play.activeCharacterId) {
        const activeChar = AppState.entities[AppState.play.activeCharacterId];
        if (activeChar && activeChar.mapPosition.q === tile.q && activeChar.mapPosition.r === tile.r && activeChar.action === 'idle') {
            addOverlayFilter(0xffffff, 0.4, 0.02);
        }
    }
    if (tile.isSkillTargetZone) {
        let color = 0xf1c40f;
        if (tile.skillVisualColor === "white") color = 0xffffff;
        if (tile.skillVisualColor === "orange") color = 0xff6b6b;
        if (tile.skillVisualColor === "blue") color = 0x00d2ff;
        if (tile.skillVisualColor === "green") color = 0x2ecc71;
        if (tile.skillVisualColor === "purple") color = 0x9b59b6;
        addOverlayFilter(color, 0.45, 0.03);
    }
    if (tileFaction) addOverlayFilter(tileFaction.color || 0x0077ff, 0.3, 0.01);
    if (AppState.main.Grid) addOverlayFilter(0x000000, 0.2, 0.04);

    if (AppState.main.MovementCells && AppState.play.cachedReachableTiles?.length && AppState.play.activeCharacterId) {
        const activeChar = AppState.entities[AppState.play.activeCharacterId];
        if (activeChar && activeChar.action !== 'move') {
            const isReachable = AppState.play.cachedReachableTiles.some(t => t.q === tile.q && t.r === tile.r);
            if (isReachable) {
                const targetTile = AppState.play.cachedReachableTiles.find(t => t.q === tile.q && t.r === tile.r);
                addOverlayFilter(targetTile?.isEnemyTarget ? 0xff3333 : 0x00f5d4, 0.4, 0.02);
            }
        }
    }
    tileGroup.position.set(worldX, 0, worldZ);
    tileGroup.renderOrder = worldZ;
    scene.add(tileGroup);
    return {
        roofY: wallHeight,
        isVisible,
        roofSprite: roofMesh,
        isVisited,
        tileFaction
    };
}


export function renderEntity3D(unit, charsOnThisTile, index, tile, tileFaction, roofSprite, pixelPos, roofY) {

    if(AppState.play.isFirstPersonMode && (unit.id === AppState.play.activeCharacterId)) return;

    const scene = AppState.engine.threeScene;
    if (!scene) return;

    let hasSpriteLoaded = false;
    let YoffsetHeight = 0;

    // Создаем базовую 3D-группу для юнита. Вся графика и UI будут внутри нее.
    const unitGroup = new THREE.Group();

    // Расчет сдвига для нескольких юнитов на одном тайле (Ваш оригинальный код)
    const shiftX = (charsOnThisTile > 1) ? (index - (charsOnThisTile - 1) / 2) * AppState.config.heightStep : 0;

    if (!unit.action || unit.action === 'idle') {
        unit.visualX = pixelPos.x;
        unit.visualY = pixelPos.y;
    }

    const isObject = !!AppState.objects[unit.id];
    const isChar = !!AppState.characters[unit.id];
    const isProjectile = unit.type === 'projectile';

    // Координаты центра гекса + сдвиги
    let worldX = unit.visualX;
    const finalShiftX = (isObject || isProjectile) ? 0 : (shiftX);
    let worldZ = unit.visualY;
    let worldY = roofY; // Высота крышки гекса

    // if (AppState.play.isFirstPersonMode) {
    //     // РЕЖИМ ОТ ПЕРВОГО ЛИЦА: Сдвигаем персонажей плечом к плечу относительно глаз игрока
    //     const camSettings = AppState.engine.cameraSettings;
    //
    //     // Переводим текущий свободный поворот головы игрока в радианы
    //     const yawRad = (camSettings.fpYaw * Math.PI) / 180;
    //
    //     // Разворачиваем вектор смещения finalShiftX так, чтобы он всегда был
    //     // перпендикулярен лучу зрения камеры. Персонажи автоматически выстроятся
    //     // в шеренгу слева направо прямо на вашем мониторе, с какой бы стороны вы ни подошли к гексу!
    //     worldX -= finalShiftX * Math.cos(yawRad);
    //     worldZ += finalShiftX * Math.sin(yawRad);
    // } else {
        // РЕЖИМ ИЗОМЕТРИИ: Оставляем ваш классический жесткий сдвиг по оси X карты
        worldX += finalShiftX;
    // }

    let charWidth = AppState.sizes.char.width;
    let charHeight = AppState.sizes.char.height;

    // --- Логика выбора кадра анимации (Ваш оригинальный код) ---
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

    if (frameImagePath && AppState.engine.threeTextureCache[frameImagePath]) {
        hasSpriteLoaded = true;
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

            // Пассивный круг под ногами юнита в 3D
            const effGeo = new THREE.CircleGeometry(radius, 16);
            const effMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
            const passiveCircle = new THREE.Mesh(effGeo, effMat);

            passiveCircle.rotation.x = -Math.PI / 2;
            passiveCircle.position.y = 0; // Чуть приподнимаем над крышкой тайла

            unitGroup.add(passiveCircle);
        });
    }

    // --- 1. ОТРИСОВКА ГРАФИЧЕСКОГО СПРАЙТА ПЕРСОНАЖА (БИЛБОРД) ---
    if (hasSpriteLoaded) {
        const texture = AppState.engine.threeTextureCache[frameImagePath];

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });

        spriteMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <ModelViewMatrix_vertex>',
                `
                // Обнуляем наклон по оси X и Z в матрице рендеринга билборда
                vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
                vec2 scale = vec2(
                    length(vec3(modelMatrix[0].xyz)),
                    length(vec3(modelMatrix[1].xyz))
                );
                
                // Если включен вид от первого лица, блокируем наклон спрайта по вертикали
                mvPosition.xy += transformed.xy * scale;
                gl_Position = projectionMatrix * mvPosition;
                `
            );
        };

        const characterSprite = new THREE.Sprite(spriteMaterial);

        if (unit.ar) {
            charWidth = charHeight / unit.ar;
        }

        const maxHexWidth = 1.73205 * AppState.sizes.hex;
        if (charWidth > maxHexWidth) {
            charWidth = maxHexWidth;
            if (unit.ar) {
                charHeight = charWidth * unit.ar;
            } else {
                const imgSource = texture.image;
                const textureAr = imgSource ? (imgSource.height / imgSource.width) : 1;
                charHeight = charWidth * textureAr;
            }
        }

        // characterSprite.scale.set(charWidth, charHeight, 1);

        const currentSizeScale = AppState.play.isFirstPersonMode ? 0.4 : 1.0;
        characterSprite.scale.set(charWidth * currentSizeScale, charHeight * currentSizeScale, 1);

        // Привязываем ноги персонажа строго по центру основания (X=0.5, Y=0.0)
        characterSprite.center.set(0.5, 0.0);
        characterSprite.position.set(0, 0, 0);

        // Внутренний вертикальный сдвиг (Ваш оригинальный код)
        characterSprite.position.y = 0;
        if (unit.centered) {
            characterSprite.center.set(0.5, 0.5);
            characterSprite.position.y = (charHeight * currentSizeScale) / 2;
        }
        // if (unit.centered) {
        //     characterSprite.center.set(0.5, 0.5);
        //     characterSprite.position.y = -charHeight / 2;
        //     // YoffsetHeight = charHeight / 2;
        // }

        if (unit.damageFlashTimer && unit.damageFlashTimer > 0) {
            spriteMaterial.color.setHex(0xff5555);
        } else if (unit.healFlashTimer && unit.healFlashTimer > 0) {
            spriteMaterial.color.setHex(0x55ff55);
        } else {
            spriteMaterial.color.setHex(0xffffff);
        }

        if (unit.isDead === true) {
            characterSprite.center.set(0.5, 0.5);
            characterSprite.rotation = Math.PI / 2;
            spriteMaterial.opacity = 0.9;
        }

        unitGroup.add(characterSprite);

    }
    else {
        // --- 2. ФОЛБЕК РЕЖИМ (Если текстура не загружена — Ваш оригинальный маркер фракции) ---
        let markerColor = 0x1f6feb;
        const currentPact = AppState.engine.factionManager.getPact(AppState.player.faction, unit.faction);

        if (unit.id === 'rafael') markerColor = 0x1f6feb;
        else if (currentPact === DiplomaticPacts.ALLIANCE) markerColor = 0x2ea44f;
        else if (currentPact === DiplomaticPacts.WAR) markerColor = 0xda3637;
        else if (currentPact === DiplomaticPacts.NONE || currentPact === DiplomaticPacts.NON_AGGRESSION) markerColor = 0x8b949e;

        // Создаем плоский кружок фракции в 3D
        const circleGeo = new THREE.CircleGeometry(AppState.sizes.hex * 0.3, 16);
        const circleMat = new THREE.MeshBasicMaterial({ color: markerColor, side: THREE.DoubleSide });
        const fallbackCircle = new THREE.Mesh(circleGeo, circleMat);

        fallbackCircle.rotation.x = -Math.PI / 2;
        fallbackCircle.position.y = 0.5; // Слегка приподнимаем над крышкой, чтобы не было мерцания
        unitGroup.add(fallbackCircle);

        // Название/буква персонажа в фолбек-режиме рисуется через HTML, так как у нас DOM-интерфейс,
        // но если вам нужен был 3D текст, его можно опустить, оставив маркер.
    }

    // --- 3. ХЕЛСБАРЫ И ЭНЕРГОБАРЫ (Ваш оригинальный код интерфейса юнита) ---
    // --- 3. ИСПРАВЛЕННЫЕ ХЕЛСБАРЫ И ИНТЕРФЕЙС НАД ГОЛОВОЙ ---
    if (unit.stats) {
        // Учитываем коэффициент масштаба первого лица, чтобы бары не были огромными в упор
        const currentSizeScale = AppState.play.isFirstPersonMode ? 0.4 : 1.0;

        const barWidth = AppState.sizes.char.width * currentSizeScale;
        const barHeight = 4 * currentSizeScale;
        const barSpacing = 2 * currentSizeScale;

        // ТОЧНЫЙ РАСЧЕТ ВЫСОТЫ:
        // Так как анкер ног теперь в нуле (0), макушка персонажа находится строго на высоте charHeight.
        // Добавляем небольшой пиксельный зазор (например, +5 единиц) над головой.
        const offsetY = (charHeight * currentSizeScale) + (5 * currentSizeScale);

        const currentHp = unit.stats.hp || 0;
        const maxHp = unit.stats.maxHp || 100;
        const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));

        // Полоска здоровья (Билборд, уменьшается к левому краю)
        if (hpRatio > 0) {
            const hpGeo = new THREE.PlaneGeometry(barWidth * hpRatio, barHeight);
            const hpMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
            const hpMesh = new THREE.Mesh(hpGeo, hpMat);

            // Сдвигаем геометрию влево, чтобы уменьшение шло правильно от левого края
            hpGeo.translate((barWidth * hpRatio) / 2 - barWidth / 2, 0, 0);

            // Ставим ровно над головой. Микросдвиг по Z (0.1) нужен, чтобы бар не моргал, пересекаясь со спрайтом
            hpMesh.position.set(0, offsetY, 0.1);

            // МАРКЕР БИЛБОРДА: Обязательно помечаем, чтобы тикер startLoop крутил полоску лицом к экрану!
            hpMesh.userData = { isBillboard: true };

            unitGroup.add(hpMesh);
        }

        // Полоска энергии
        const currentEnergy = unit.stats.energy || 0;
        const maxEnergy = unit.stats.maxEnergy || 100;
        const energyRatio = Math.max(0, Math.min(1, currentEnergy / maxEnergy));

        // Полоска энергии ложится СТРОГО ПОД полоску здоровья
        const localEnergyY = offsetY - barHeight - barSpacing;

        if (energyRatio > 0) {
            const energyGeo = new THREE.PlaneGeometry(barWidth * energyRatio, barHeight);
            const energyMat = new THREE.MeshBasicMaterial({ color: 0x3498db });
            const energyMesh = new THREE.Mesh(energyGeo, energyMat);

            energyGeo.translate((barWidth * energyRatio) / 2 - barWidth / 2, 0, 0);
            energyMesh.position.set(0, localEnergyY, 0.1);

            // Тоже заставляем полоску энергии всегда смотреть на игрока
            energyMesh.userData = { isBillboard: true };

            unitGroup.add(energyMesh);
        }
    }


    // --- 4. ОТОБРАЖЕНИЕ ГОРОДОВ (Ваш оригинальный код) ---
    if (unit.type === 'city') {
        if (tile.province) {
            unit.production = tile.province;
        }
        // Поскольку ваш интерфейс полностью построен на DOM-элементах (HTML/CSS),
        // названия городов, как и плавающие хелбары, идеальнее всего выводить через HTML-плашки поверх канваса.
        // Но чтобы сохранить структуру группы на случай, если вы рендерите подложку фракции:
        const bgWidth = AppState.sizes.char.width;
        const bgHeight = 20; // Примерная высота плашки под текст

        const cityGeo = new THREE.PlaneGeometry(bgWidth, bgHeight);
        const cityMat = new THREE.MeshBasicMaterial({
            color: tileFaction ? tileFaction.color : 0x000000,
            transparent: true,
            opacity: 0.6
        });
        const cityMesh = new THREE.Mesh(cityGeo, cityMat);
        cityMesh.position.set(0, -AppState.sizes.hex / 2, 0.2);

        unitGroup.add(cityMesh);
    }

    // --- 5. ПАССИВНЫЕ ЭФФЕКТЫ И КРУГИ (Ваш оригинальный код) ---


    // --- 6. ГЛОБАЛЬНОЕ ПОЗИЦИОНИРОВАНИЕ И СОРТИРОВКА ---
    // Ставим всю собранную группу юнита (персонаж + бары + эффекты) ровно в центр его гекса
    unitGroup.position.set(worldX, worldY, worldZ);

    // Выставляем renderOrder, чтобы персонажи ложились строго поверх слоев земли
    unitGroup.renderOrder = worldZ + 0.5 + (index * 0.01);
    scene.add(unitGroup);
}



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

    //Текстуры
    const assetVariant = config.images[tile.imageIndex] || config.images;
    const imagePath = assetVariant.base || assetVariant;
    let tileTexture = PIXI.Assets.cache.has(imagePath) ? PIXI.Assets.get(imagePath) : null;

    // Расчет высот и координат
    const groundY = pixelPos.y;
    const targetHeight = tile.height;
    const roofY = groundY - (targetHeight - 1) * AppState.config.heightStep;
    const centerX = pixelPos.x;
    const centerY = roofY;

    // Текстуры (Перенесли чуть выше для расчета размеров)


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

import { AppState, getActiveMap, getTileFromState, DiplomaticPacts } from '../shared/GameState.js';
import { renderTile, renderEntity } from '../shared/render.js';

export async function init2D() {

    let worldMapContainer;

    let isDragging = false;
    let hasMoved = false; // Флаг, чтобы отличать перетаскивание карты от точечного клика
    let dragStartPos = { x: 0, y: 0 };
    let mapStartPos = { x: 0, y: 0 };
    let currentZoom = 1.0;

    const app = new PIXI.Application();

    await app.init({
        resizeTo: wrapper,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x0d1117,
        antialias: true
    });

    container.appendChild(app.canvas);

    hexMath = new HexMath(AppState.sizes.hex);

    worldMapContainer = new PIXI.Container();
    worldMapContainer.x = hexMath.size;
    worldMapContainer.y = hexMath.height / 2;
    worldMapContainer.sortableChildren = true;

    app.stage.addChild(worldMapContainer);

    AppState.engine.worldMapContainer = worldMapContainer;

    AppState.engine.app = app;

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointerdown', (event) => {
        isDragging = true;
        hasMoved = false; // Обнуляем при каждом нажатии

        // 🌟 СТРОГИЙ ФИКС: Запоминаем стартовую позицию драга в виртуальном масштабе
        if (window.windowResized) {
            dragStartPos.x = event.global.y / window.innerWidth * window.innerHeight;
            dragStartPos.y = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
        } else {
            dragStartPos.x = event.global.x;
            dragStartPos.y = event.global.y;
        }

        mapStartPos.x = worldMapContainer.x;
        mapStartPos.y = worldMapContainer.y;
    });

    app.stage.on('pointerup', (event) => {
        isDragging = false;
        if (!hasMoved) {
            let canvasX = event.global.x;
            let canvasY = event.global.y;

            if (window.windowResized) {
                canvasX = event.global.y / window.innerWidth * window.innerHeight;
                canvasY = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
            }

            AppState.engine.playerClickManager.handleMapClick(canvasX, canvasY);
        }
    });

    app.stage.on('pointermove', (event) => {
        const settings = AppState.game_settings;

        let currentVirtualX = event.global.x;
        let currentVirtualY = event.global.y;

        if (window.windowResized) {
            currentVirtualX = event.global.y / window.innerWidth * window.innerHeight;
            currentVirtualY = window.innerWidth - event.global.x / window.innerHeight * window.innerWidth;
        }

        if (isDragging) {
            if (settings.playerCamera === 'fixed') {
                return;
            }
            // Разница вычисляется между виртуальными координатами
            const dx = currentVirtualX - dragStartPos.x;
            const dy = currentVirtualY - dragStartPos.y;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

            // Драг самого контейнера идет по стандартным осям, так как CSS уже повернул контейнер
            worldMapContainer.x = mapStartPos.x + dx;
            worldMapContainer.y = mapStartPos.y + dy;

            AppState.engine.renderMap();
        } else {
            // 🌟 СТРОГИЙ ФИКС HOVER: Подсовываем менеджеру подсветки гексов правильные координаты
            // playerClickManager.handleMapHover(currentVirtualX, currentVirtualY);
        }
    });

    app.stage.on('pointerupoutside', () => isDragging = false);

    app.canvas.addEventListener('wheel', (event) => {
        const settings = AppState.game_settings;
        if (settings.playerCamera === 'fixed' && !settings.playerZoom) {
            return;
        }
        event.preventDefault();

        const zoomFactor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
        const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);

        // const intensity = Math.abs(event.deltaY) * 0.0005; // Настройте этот коэф под себя (меньше = плавнее)
        // const zoomFactor = event.deltaY < 0 ? (1 + intensity) : 1 / (1 + intensity);
        //
        // const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3.0);

        // 🌟 ИСПРАВЛЕНИЕ: Берем глобальные координаты из PixiJS, как в pointermove
        const globalMouse = app.renderer.events.pointer.global;
        let mouseX = globalMouse.x;
        let mouseY = globalMouse.y;

        // Применяем вашу рабочую схему разворота осей, если экран повернут через CSS
        if (window.windowResized) {
            const rawX = mouseX;
            const rawY = mouseY;
            mouseX = rawY / window.innerWidth * window.innerHeight;
            mouseY = window.innerWidth - rawX / window.innerHeight * window.innerWidth;
        }

        // Запоминаем старый зум перед изменением
        const oldZoom = currentZoom;
        currentZoom = newZoom;
        AppState.camera.currentZoom = currentZoom;

        // Находим локальную точку внутри карты относительно СТАРОГО зума
        const localX = (mouseX - worldMapContainer.x) / oldZoom;
        const localY = (mouseY - worldMapContainer.y) / oldZoom;

        // Применяем масштаб к контейнеру
        worldMapContainer.scale.set(currentZoom);

        // Сдвигаем контейнер так, чтобы точка под курсором осталась на месте
        worldMapContainer.x = mouseX - localX * currentZoom;
        worldMapContainer.y = mouseY - localY * currentZoom;

        AppState.engine.renderMap();

    }, { passive: false });


    app.ticker.add((ticker) => {
        const deltaMS = (ticker.deltaTime * AppState.animation.framesPerSecond * 10) / 60;
        let needRedraw = false;

        if(AppState.map.isPlatformerMode) {
            AppState.engine.movementManager.updateCharacter(AppState.characters[AppState.play.activeCharacterId]);
            needRedraw = true;
        }

        for (const charId in AppState.entities) {
            const char = AppState.entities[charId];
            if(!char) continue;

            if (char.damageFlashTimer > 0) {
                char.damageFlashTimer = Math.max(0, char.damageFlashTimer - deltaMS);
                needRedraw = true;
            }

            if (char.healFlashTimer > 0) {
                char.healFlashTimer = Math.max(0, char.healFlashTimer - deltaMS);
                needRedraw = true;
            }

            if (char.animations && char.animations[char.action]) {
                const currentActionAnims = char.animations[char.action][char.direction];

                if (currentActionAnims && currentActionAnims.length > 1) {
                    const animationTime = AppState.animation[char.action+"Time"] || 1000;
                    char.frameTimer += deltaMS * 1000 / animationTime;

                    if (char.frameTimer >= char.frameDuration) {
                        char.frameTimer = 0;
                        char.currentFrameIndex = (char.currentFrameIndex + 1) % currentActionAnims.length;
                        needRedraw = true;
                    }
                } else {
                    char.currentFrameIndex = 0;
                }
            }

            if(AppState.engine.movementManager.animateMovement(char, deltaMS)) needRedraw = true;
            if(AppState.engine.combatManager.animateAttack(char, deltaMS)) needRedraw = true;
        }

        if (AppState.play.activeCharacterId && AppState.engine.updateCameraSystem && (AppState.game_settings.playerCamera === 'fixed')) {
            AppState.engine.updateCameraSystem(ticker);
        }

        if (needRedraw) {
            AppState.engine.renderMap();
        }
    });

    window.stopTicker = () => {
        app.ticker.stop();
    }
    window.resumeTicker = () => {
        app.ticker.start();
    }

    AppState.engine.renderMap = () => {
        if(!AppState.maps) return;

        worldMapContainer.children.forEach(child => {
            if (child.isUnitContainer) {
                child.visible = false;
                AppState.engine.unitContainerPool.push(child);
            }
        });
        worldMapContainer.removeChildren();


        const tileEntities = {};

        Object.keys(AppState.entities).forEach(id => {
            const char = AppState.entities[id];
            if ((char.mapPosition.q && char.mapPosition.r)||(char.mapPosition.q===0 || char.mapPosition.r===0)) {
                const key = `${char.mapPosition.q},${char.mapPosition.r}`;
                if(!tileEntities[key]) tileEntities[key] = {entities:[],charsOnThisTile:0};
                tileEntities[key].entities.push(char);

                // const isObject = !!AppState.objects[char.id];
                if(!!AppState.characters[char.id]) tileEntities[key].charsOnThisTile++;
            }
        });

        let screenW = app.screen.width;
        let screenH = app.screen.height;

        // Учитываем ваш CSS-разворот осей при ресайзе, если он активен
        if (window.windowResized) {
            const temp = screenW;
            screenW = screenH;
            screenH = temp;
        }

        // Переводим границы экрана в локальные координаты карты с учетом текущего сдвига и зума
        const minX = -worldMapContainer.x / currentZoom;
        const minY = -worldMapContainer.y / currentZoom;
        const maxX = minX + (screenW / currentZoom);
        const maxY = minY + (screenH / currentZoom);

        // Добавляем запас (padding) в пикселях, чтобы высокие стены тайлов
        // или тайлы на самых краях экрана не исчезали грубо при скролле
        const padding = AppState.sizes.hex * 3;


        AppState.map.tiles.forEach((tile) => {

            const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);

            if (!AppState.play.isFirstPersonMode) {
                const hexMath = AppState.engine.hexMath;

                // Если тайл находится далеко за пределами видимого окна — просто пропускаем его!
                if (
                    pixelPos.x < minX - padding ||
                    pixelPos.x > maxX + padding ||
                    pixelPos.y < minY - padding ||
                    pixelPos.y > maxY + padding
                ) {
                    return; // Завершаем итерацию для этого тайла, процессор отдыхает
                }
            }

            const renderedTile = renderTile(tile);
            if(!renderedTile) return;

            const { roofY, isVisible, roofSprite, isVisited, tileFaction} = renderedTile;

            const entities = tileEntities[`${tile.q},${tile.r}`] ?  tileEntities[`${tile.q},${tile.r}`].entities : null;
            const chars = entities ? tileEntities[`${tile.q},${tile.r}`].charsOnThisTile : 0;

            if (entities?.length > 0 && isVisible) {
                entities.forEach((unit, index) => {
                    renderEntity(unit, chars, index, tile, tileFaction, roofSprite, pixelPos, roofY);
                });
            }

        });

        // if (AppState.engine.pathRenderer) {
        //     AppState.engine.pathRenderer.clearPath();
        // }

        // if (AppState.play.activeCharacterId) {
        //     const activeChar = AppState.entities[AppState.play.activeCharacterId];
        //     const charTile = getTileFromState(activeChar.mapPosition.q, activeChar.mapPosition.r);
        //
        //     if(AppState.main.MovementLine) {
        //         if (activeChar.currentActivePath && activeChar.currentActivePath.length > 0 && activeChar.action !== 'move') {
        //             AppState.engine.pathRenderer.drawPath(activeChar.currentActivePath, activeChar);
        //         }
        //     }
        // }

        worldMapContainer.sortChildren();
        app.render();
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
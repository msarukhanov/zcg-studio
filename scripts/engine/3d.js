import { AppState, getActiveMap, getTileFromState } from '../shared/GameState.js';
import { renderTile3D, renderEntity3D } from '../shared/render.js';

export function init3D() {

    let isDragging = false;
    let hasMoved = false;
    const dragStartPos = { x: 0, y: 0 };
    const camStartPos = { x: 0, z: 0 };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    AppState.engine.cameraSettings = {
        pitch: 60,      // Угол наклона камеры к земле в ГРАДУСАХ (например, 35, 45, 60)
        distance: 1000,   // Дистанция от камеры до персонажа в пикселях (фактически — зум)

        fpYaw: 0,       // Поворот головы влево/вправо в градусах (0 - смотрим строго вперед)
        fpPitch: 0,     // Наклон головы вверх/вниз в градусах (0 - смотрим прямо перед собой)
        sensitivity: 0.15 // Чувствительность мыши при осмотре
    };

    AppState.config.heightStep = AppState.sizes.hex;

    AppState.engine.calculateCamera3DPosition = (targetX, targetZ, liftY = 0) => {
        const settings = AppState.engine.cameraSettings;

        // Переводим угол наклона в радианы
        const radPitch = (settings.pitch * Math.PI) / 180;

        // 1. Позиция камеры по классической тригонометрии
        const heightY = settings.distance * Math.sin(radPitch);
        const offsetZ = settings.distance * Math.cos(radPitch);

        // 2. ИДЕАЛЬНАЯ КОМПЕНСАЦИЯ ЦЕНТРА:
        // Чтобы ноги (основание спрайта) были строго по центру экрана при ЛЮБОМ угле,
        // точка прицеливания камеры (lookAt) должна быть поднята по вертикальной оси Y.
        // Величина подъёма зависит от косинуса угла наклона камеры к земле.
        const lookAtOffsetY = settings.distance * Math.cos(radPitch) * 0.35;

        return {
            // Куда физически поставить саму камеру
            camX: targetX,
            camY: liftY + heightY,
            camZ: targetZ + offsetZ,

            // Куда направить взгляд камеры (lookAt), чтобы ноги персонажа встали в центр
            lookX: targetX,
            lookY: liftY + lookAtOffsetY,
            lookZ: targetZ
        };
    };

    AppState.engine.screenToWorld = (clientX, clientY) => {
        const camera = AppState.engine.threeCamera;
        const settings = AppState.engine.cameraSettings;
        const renderer = AppState.engine.threeRenderer;

        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;

        // 1. Нормализуем координаты мыши (от -1 до +1)
        const normX = (clientX / width) * 2 - 1;
        const normY = -(clientY / height) * 2 + 1;

        // 2. Угол наклона в радианы
        const radPitch = (settings.pitch * Math.PI) / 180;
        const cosP = Math.cos(radPitch);
        const sinP = Math.sin(radPitch);

        // Рассчитываем вертикальный угол обзора
        const vFovRad = (camera.fov * Math.PI) / 180;
        const halfFovTan = Math.tan(vFovRad / 2);

        // 3. МАТЕМАТИКА ПЕРСПЕКТИВНОГО СУЖЕНИЯ К ГОРИЗОНТУ
        // Вычисляем коэффициент искажения для конкретной горизонтальной строки экрана (normY)
        // Чем ближе клик к верхнему краю экрана (горизонту), тем больше perspectiveDenominator,
        // и тем сильнее сжимаются координаты игрового мира
        const perspectiveDenominator = sinP - normY * halfFovTan * cosP;

        // Расстояние от камеры до точки пересечения с землей по лучу перспективы
        const distanceToGround = settings.distance / perspectiveDenominator;

        // 4. Вычисляем точные координаты плоского мира карты (X и Z в Three.js)
        // По оси X учитываем аспект экрана и то, как гексы стягиваются к центру вдалеке
        const aspect = width / height;
        const worldX = camera.position.x + normX * halfFovTan * aspect * distanceToGround;

        // По оси Z рассчитываем честное тригонометрическое удаление с учетом перспективы строки
        const worldZ = camera.position.z - (settings.distance * cosP) - (normY * halfFovTan * sinP * distanceToGround);

        return {
            x: worldX,
            y: worldZ // Возвращаем как плоский Y вашей карты
        };
    };


    AppState.engine.initInputSystem = () => {
        // Получаем чистый HTML-холст видеокарты из рендерера Three.js
        const canvas = AppState.engine.threeRenderer.domElement;

        // --- НАЖАТИЕ МЫШИ / ТАЧ ---
        canvas.addEventListener('pointerdown', (event) => {
            isDragging = true;
            hasMoved = false;

            // Ваша оригинальная логика разворота осей для повернутых CSS экранов
            if (window.windowResized) {
                dragStartPos.x = event.clientY / window.innerWidth * window.innerHeight;
                dragStartPos.y = window.innerWidth - event.clientX / window.innerHeight * window.innerWidth;
            } else {
                dragStartPos.x = event.clientX;
                dragStartPos.y = event.clientY;
            }

            // Запоминаем стартовую 3D-позицию камеры
            const camera = AppState.engine.threeCamera;
            camStartPos.x = camera.position.x;
            camStartPos.z = camera.position.z;

            canvas.setPointerCapture(event.pointerId); // Захват мыши, чтобы не терять драг за пределами окна
        });

        // --- ОТПУСКАНИЕ МЫШИ / ТАЧ ---
        canvas.addEventListener('pointerup', (event) => {
            isDragging = false;
            canvas.releasePointerCapture(event.pointerId);

            if (!hasMoved) {
                let clientX = event.clientX;
                let clientY = event.clientY;

                if (window.windowResized) {
                    clientX = event.clientY / window.innerWidth * window.innerHeight;
                    clientY = window.innerWidth - event.clientX / window.innerHeight * window.innerWidth;
                }

                // Магический перевод: получаем чистые мировые пиксели карты из координат мыши!
                const worldCoords = AppState.engine.screenToWorld(clientX, clientY);

                console.log(`🎯 [Математический Клик] Координаты мира: X=${worldCoords.x.toFixed(1)}, Y=${worldCoords.y.toFixed(1)}`);

                // Передаем эти честные 2D координаты карты в ваш клик-менеджер.
                // Он пропустит их через hexMath.pixelToCube() и идеально найдёт q и r!
                AppState.engine.playerClickManager.handleMapClick(clientX, clientY);
            }
        });

        // --- ДВИЖЕНИЕ МЫШИ / ДРАГ ---
        canvas.addEventListener('pointermove', (event) => {
            const settings = AppState.game_settings;

            let currentVirtualX = event.clientX;
            let currentVirtualY = event.clientY;

            if (window.windowResized) {
                currentVirtualX = event.clientY / window.innerWidth * window.innerHeight;
                currentVirtualY = window.innerWidth - event.clientX / window.innerHeight * window.innerWidth;
            }

            if (isDragging) {
                const settings = AppState.game_settings;
                const camSettings = AppState.engine.cameraSettings;

                // Вычисляем, насколько сдвинулся курсор с предыдущего кадра в пикселях
                const deltaX = currentVirtualX - dragStartPos.x;
                const deltaY = currentVirtualY - dragStartPos.y;

                if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) hasMoved = true;

                // ----------------==========================----------------
                // ФИКС ДЛЯ ПЕРВОГО ЛИЦА: ВРАЩЕНИЕ КАМЕРЫ МЫШКОЙ ВМЕСТО ДРАГА КАРТЫ
                // ----------------==========================----------------
                if (AppState.play.isFirstPersonMode) {
                    // Движение мыши по горизонтали (deltaX) вращает голову влево/вправо (Yaw)
                    camSettings.fpYaw += deltaX * camSettings.sensitivity;

                    // Движение мыши по вертикали (deltaY) наклоняет голову вверх/вниз (Pitch)
                    camSettings.fpPitch -= deltaY * camSettings.sensitivity;

                    // Ограничиваем наклон головы, чтобы нельзя было выкрутить шею на 180 градусов (смотрим строго под ноги или в зенит)
                    camSettings.fpPitch = Math.min(Math.max(camSettings.fpPitch, -75), 75);

                    // Перезаписываем стартовую позицию мыши для следующего шага
                    dragStartPos.x = currentVirtualX;
                    dragStartPos.y = currentVirtualY;

                    // Принудительно обновляем систему камеры и карту
                    AppState.engine.updateCameraSystem();
                    AppState.engine.renderMap();
                    return; // Выходим из функции, драг карты ниже не выполняется!
                }

                // ----------------==========================----------------
                // ВАШ СТАНДАРТНЫЙ РЕЖИМ ДРАГА ИЗОМЕТРИИ (Ниже без изменений)
                // ----------------==========================----------------
                if (settings.playerCamera === 'fixed') return;

                const camera = AppState.engine.threeCamera;
                const radPitch = (camSettings.pitch * Math.PI) / 180;

                camera.position.x = camStartPos.x - deltaX;
                camera.position.z = camStartPos.z - (deltaY / Math.cos(radPitch));

                const liftY = 0;
                const lookAtOffsetY = camSettings.distance * Math.cos(radPitch) * 0.35;
                camera.lookAt(camera.position.x, liftY + lookAtOffsetY, camera.position.z - camSettings.distance * Math.cos(radPitch));

                AppState.engine.renderMap();
            }
        });

        canvas.addEventListener('pointercancel', () => { isDragging = false; });
    };

    AppState.engine.initZoomSystem = () => {
        const canvas = AppState.engine.threeRenderer.domElement;

        canvas.addEventListener('wheel', (event) => {
            const settings = AppState.game_settings;
            if (settings.playerCamera === 'fixed' && !settings.playerZoom) {
                return;
            }
            event.preventDefault();

            const settingsCam = AppState.engine.cameraSettings;

            // Плавно меняем 3D-расстояние до персонажа (зум)
            const zoomFactor = event.deltaY < 0 ? 0.95 : 1.05;
            settingsCam.distance = Math.min(Math.max(settingsCam.distance * zoomFactor, 200), 1200);

            // Обновляем камеру
            if (AppState.play.activeCharacterId) {
                AppState.engine.centerCameraOnCharacter(AppState.play.activeCharacterId);
            } else {
                const camera = AppState.engine.threeCamera;
                const radPitch = (settingsCam.pitch * Math.PI) / 180;
                const heightY = settingsCam.distance * Math.sin(radPitch);
                const offsetZ = settingsCam.distance * Math.cos(radPitch);
                const lookAtOffsetY = settingsCam.distance * Math.cos(radPitch) * 0.35;

                camera.position.y = heightY;
                camera.lookAt(camera.position.x, lookAtOffsetY, camera.position.z - offsetZ);
            }

            AppState.engine.renderMap();
        }, { passive: false });
    };

    AppState.engine.toggleFirstPersonMode = function(enable = true) {

        const activeId = AppState.play?.activeCharacterId;
        if (!activeId) return;

        AppState.play.isFirstPersonMode = enable;

        if (enable) {
            // При входе в режим сбрасываем углы обзора, чтобы игрок смотрел ровно перед собой
            AppState.engine.cameraSettings.fpYaw = 0;
            AppState.engine.cameraSettings.fpPitch = 0;
        } else {
            // При выходе сбрасываем сдвиг линзы, если он использовался, и возвращаем изометрию
            const camera = AppState.engine.threeCamera;
            camera.filmOffset = 0;
            camera.updateProjectionMatrix();
            AppState.engine.centerCameraOnCharacter(activeId);
        }

        AppState.engine.updateCameraSystem();
        AppState.engine.renderMap();
    };



    AppState.engine.renderMap = () => {
        if(!AppState.maps || !AppState.map || !AppState.map.tiles) return;

        const scene = AppState.engine.threeScene;

        // --- ЖЕЛЕЗНАЯ ОЧИСТКА ПАМЯТИ ИЗ ВИДЕОКАРТЫ ---
        // Проходим по всем объектам старой карты и полностью уничтожаем их из GPU
        // НА СТРАНИЦЕ 9 ВАШЕГО PDF ЗАМЕНИТЕ ЦИКЛ НА ЭТОТ:
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const object = scene.children[i];

            if (object.children) {
                object.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                });
            }

            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                else object.material.dispose();
            }
            scene.remove(object);
        }

        // 2. Сбор сущностей по тайлам (Ваш оригинальный код без изменений)
        const tileEntities = {};
        Object.keys(AppState.entities).forEach(id => {
            const char = AppState.entities[id];
            if ((char.mapPosition.q && char.mapPosition.r)||(char.mapPosition.q===0 || char.mapPosition.r===0)) {
                const key = `${char.mapPosition.q},${char.mapPosition.r}`;
                if(!tileEntities[key]) tileEntities[key] = {entities:[], charsOnThisTile:0};
                tileEntities[key].entities.push(char);
                if(!!AppState.characters[char.id]) tileEntities[key].charsOnThisTile++;
            }
        });

        // 3. ОТРИСОВКА ТАЙЛОВ КАРТЫ
        AppState.map.tiles.forEach((tile) => {
            const renderedTile = renderTile3D(tile);
            if(!renderedTile) return;

            // Извлекаем 3D-высоту крышки и параметры видимости
            const { roofY, isVisible, roofSprite, isVisited, tileFaction} = renderedTile;

            const entities = tileEntities[`${tile.q},${tile.r}`] ?  tileEntities[`${tile.q},${tile.r}`].entities : null;
            const chars = entities ? tileEntities[`${tile.q},${tile.r}`].charsOnThisTile : 0;

            if (entities?.length > 0 && isVisible) {
                const hexMath = AppState.engine.hexMath;
                const pixelPos = hexMath.cubeToPixel(tile.q, tile.r);

                entities.forEach((unit, index) => {
                    renderEntity3D(unit, chars, index, tile, tileFaction, roofSprite, pixelPos, roofY);
                });
            }
        });
    };

    AppState.engine.startLoop = () => {

        let lastTime = performance.now();
        let isTickerRunning = true;

        function animate(currentTime) {
            if (!isTickerRunning) return;
            requestAnimationFrame(animate);

            // Рассчитываем deltaTime (аналог тикера Pixi)
            const dt = (currentTime - lastTime) / 1000; // время в секундах
            lastTime = currentTime;

            // Переводим дельту в формат вашего оригинального deltaMS
            const deltaMS = (dt * 60 * AppState.animation.framesPerSecond * 10) / 60;
            let needRedraw = false;

            if (AppState.map.isPlatformerMode) {
                AppState.engine.movementManager.updateCharacter(AppState.characters[AppState.play.activeCharacterId]);
                needRedraw = true;
            }

            // Обсчет таймеров и анимаций сущностей (Ваш оригинальный код без изменений)
            for (const charId in AppState.entities) {
                const char = AppState.entities[charId];
                if (!char) continue;

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
                        const animationTime = AppState.animation[char.action + "Time"] || 1000;
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

                AppState.engine.timeManager.updateGlobalTime(deltaMS);

                // Плавное пошаговое перемещение visualX / visualY по вашей сетке во время ходьбы
                if (AppState.engine.movementManager.animateMovement(char, deltaMS)) needRedraw = true;
                if (AppState.engine.combatManager.animateAttack(char, deltaMS)) needRedraw = true;
            }

            // Следование 3D-камеры за бегущим персонажем
            if (AppState.play.activeCharacterId && AppState.engine.updateCameraSystem && (AppState.game_settings.playerCamera === 'fixed')) {
                AppState.engine.updateCameraSystem();
                needRedraw = true;
            }

            // Перерисовываем 3D-карту, если что-то изменилось
            if (needRedraw) {
                AppState.engine.renderMap();
            }

            // Финальный рендер кадра на экран через камеру Three.js
            AppState.engine.threeRenderer.render(
                AppState.engine.threeScene,
                AppState.engine.threeCamera
            );
        }

        // Запускаем цикл
        lastTime = performance.now();
        requestAnimationFrame(animate);

        window.stopTicker = () => { isTickerRunning = false; };
        window.resumeTicker = () => {
            isTickerRunning = true;
            lastTime = performance.now();
            requestAnimationFrame(AppState.engine.startLoop);
        };
    };

    AppState.engine.init3D = () => {

        const container = document.getElementById('app-container');
        const wrapper = document.getElementById('canvas-wrapper');

        const width = wrapper.clientWidth;
        const height = wrapper.clientHeight;

        // 1. Создаем честную 3D-сцену
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117); // Ваш backgroundColor

        // 2. Создаем ПЕРСПЕКТИВНУЮ камеру
        // Параметры: FOV (60 градусов), Аспект, Ближняя и Дальняя плоскости отсечения
        const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);

        // Позиционируем камеру: поднимаем вверх (Y) и отодвигаем назад (Z)
        camera.position.set(0, 400, 500);
        camera.lookAt(0, 0, 0); // Камера строго смотрит в центр мира

        // 3. Создаем WebGL-Рендерер
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);

        // Добавляем холст в ваш DOM-контейнер
        container.appendChild(renderer.domElement);

        // Ресайз экрана (Аналог resizeTo)
        window.addEventListener('resize', () => {
            const w = wrapper.clientWidth;
            const h = wrapper.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix(); // Критично для обновления перспективы
            renderer.setSize(w, h);
        });

        // Храним в AppState ссылки для управления из других функций
        AppState.engine.threeScene = scene;
        AppState.engine.threeCamera = camera;
        AppState.engine.threeRenderer = renderer;

        // Создаем пустой объект для нашего нового кэша текстур

        // Замена старых глобальных функций управления тикером
        // Запускаем игровой цикл отрисовки (Ticker)
        AppState.engine.initInputSystem();
        AppState.engine.initZoomSystem();
        AppState.engine.startLoop();
    };


    AppState.engine.centerCameraOnCharacter = function(charId) {
        const char = AppState.entities[charId];
        const hexMath = AppState.engine.hexMath;
        const camera = AppState.engine.threeCamera;
        if (!char || !camera || !hexMath) return;

        let tileHeight = 1;
        const mapKey = `${char.mapPosition.q},${char.mapPosition.r}`;
        const currentMap = typeof getActiveMap === 'function' ? getActiveMap() : null;
        if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
            tileHeight = currentMap.tiles.get(mapKey).height || 1;
        }

        const pixelPos = hexMath.cubeToPixel(char.mapPosition.q, char.mapPosition.r);
        const liftY = (tileHeight - 1) * (AppState.config?.heightStep || 16);

        const targetX = char.visualX !== undefined ? char.visualX : pixelPos.x;
        const targetZ = char.visualY !== undefined ? char.visualY : pixelPos.y;

        // Получаем скорректированные 3D координаты
        const cData = AppState.engine.calculateCamera3DPosition(targetX, targetZ, liftY);

        // Сбрасываем сдвиги линзы, если они были установлены ранее
        camera.filmOffset = 0;
        camera.updateProjectionMatrix();

        // Ставим камеру в точку пространства
        camera.position.set(cData.camX, cData.camY, cData.camZ);

        // Направляем объектив в приподнятую точку фокуса
        camera.lookAt(cData.lookX, cData.lookY, cData.lookZ);

        console.log(`🎥 [Camera] Фокус на ногах персонажа. Угол: ${AppState.engine.cameraSettings.pitch}°`);
    };

    AppState.engine.updateCameraSystem = function() {
        const activeId = AppState.play?.activeCharacterId;
        if (!activeId) return;

        const char = AppState.entities[activeId];
        if (!char) return;

        const camera = AppState.engine.threeCamera;
        const hexMath = AppState.engine.hexMath;

        if (AppState.play.isFirstPersonMode) {
            const charX = char.visualX || 0;
            const charZ = char.visualY || 0;

            let tileHeight = 1;
            const mapKey = `${char.mapPosition.q},${char.mapPosition.r}`;
            const currentMap = typeof getActiveMap === 'function' ? getActiveMap() : null;
            if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
                tileHeight = currentMap.tiles.get(mapKey).height || 1;
            }
            const groundHeight = (tileHeight - 1) * (AppState.config?.heightStep || 16);
            const eyeHeight = 25; // Высота глаз персонажа над уровнем крышки гекса

            // 1. Ставим камеру строго в координаты головы персонажа
            camera.position.set(charX, groundHeight + eyeHeight, charZ);

            // 2. Рассчитываем вектор взгляда по углам тригонометрии
            const settings = AppState.engine.cameraSettings;
            const yawRad = (settings.fpYaw * Math.PI) / 180;
            const pitchRad = (settings.fpPitch * Math.PI) / 180;

            // Вычисляем точку перед камерой на расстоянии 100 единиц
            // Косинус fpPitch контролирует длину проекции вектора на землю
            const lookX = charX + 100 * Math.sin(yawRad) * Math.cos(pitchRad);
            const lookY = (groundHeight + eyeHeight) + 100 * Math.sin(pitchRad);
            const lookZ = charZ - 100 * Math.cos(yawRad) * Math.cos(pitchRad);

            // Направляем объектив камеры в эту динамическую точку
            camera.lookAt(lookX, lookY, lookZ);
            return;
        }

        let tileHeight = 1;
        const mapKey = `${char.mapPosition.q},${char.mapPosition.r}`;
        const currentMap = typeof getActiveMap === 'function' ? getActiveMap() : null;
        if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
            tileHeight = currentMap.tiles.get(mapKey).height || 1;
        }
        const liftY = (tileHeight - 1) * (AppState.config?.heightStep || 16);


// На страницах 16-17 вашего PDF внутри updateCameraSystem:
        const pixelPos = hexMath.cubeToPixel(char.mapPosition.q, char.mapPosition.r);
        const targetX = char.visualX !== undefined ? char.visualX : pixelPos.x;
        const targetZ = char.visualY !== undefined ? char.visualY : pixelPos.y;

// И передавайте в расчет именно их:
        const cData = AppState.engine.calculateCamera3DPosition(targetX, targetZ, liftY);


        camera.position.set(cData.camX, cData.camY, cData.camZ);
        camera.lookAt(cData.lookX, cData.lookY, cData.lookZ);
    };


    AppState.engine.hexMath.get3DHexFromPixel  = function(mouseX, mouseY) {
        const scene = AppState.engine.threeScene;
        const camera = AppState.engine.threeCamera;
        const renderer = AppState.engine.threeRenderer;

        if (!scene || !camera || !renderer) return null;

        const heightStep = AppState.config.heightStep;

        // 1. Переводим пиксели мыши в нормализованные 3D-координаты экрана (от -1 до +1)
        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;
        const normX = (mouseX / width) * 2 - 1;
        const normY = -(mouseY / height) * 2 + 1;

        // 2. Настраиваем 3D-луч из камеры через курсор
        const raycaster = new THREE.Raycaster();
        const mouseVector = new THREE.Vector2(normX, normY);
        raycaster.setFromCamera(mouseVector, camera);

        // 3. Пускаем луч во все объекты сцены
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            // Находим самое первое (ближайшее к камере) пересечение с геометрией карты
            const hit = intersects[0];

            // Точные 3D-координаты точки, куда физически ударился луч на рельефе
            const hitX = hit.point.x;
            const hitZ = hit.point.z; // Напоминаю: наша плоскость земли — это оси X и Z

            // ВАШ РОДНОЙ ПОСЛОЙНЫЙ ЦИКЛ СКАНИРОВАНИЯ СВЕРХУ ВНИЗ
            // Теперь вместо абстрактных формул мы отдаем циклу РЕАЛЬНЫЕ координаты точки попадания луча!
            const maxPossibleHeight = 10;

            for (let h = maxPossibleHeight; h >= 1; h--) {
                // Смещаем плоский Y для текущего слоя (в 3D это ось Z)
                const flatY = hitZ + (h - 1) * heightStep;

                // Переводим пиксели в кубические координаты q, r через ваш pixelToCube
                const cube = this.pixelToCube(hitX, flatY);

                // Читаем гекс напрямую из AppState
                const tile = getTileFromState(cube.q, cube.r);

                // Если гекс существует и его высота действительно доходит до этого уровня h
                if (tile && tile.height >= h) {
                    console.log(`🎯 [3D Рейкаст] Точный клик в гекс: q=${tile.q}, r=${tile.r}, ярус=${tile.height}`);
                    return tile; // Нашли конкретный приподнятый гекс рельефа!
                }
            }

            // Если на верхних слоях ничего не нашли, проверяем базовый уровень земли
            const baseCube = this.pixelToCube(hitX, hitZ);
            const baseTile = getTileFromState(baseCube.q, baseCube.r);
            if (baseTile) return baseTile;
        }

        // Если луч улетел мимо карты в пустоту
        return null;
    }

    AppState.engine.init3D();
}
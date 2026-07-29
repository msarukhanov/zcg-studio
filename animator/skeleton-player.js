function SkeletonPlayer(canvasId, assetsPath, multiViewJson, defaultView, defaultAnim) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas with ID " + canvasId + " not found.");
        return;
    }
    var ctx = canvas.getContext("2d");
    var cleanPath = assetsPath.endsWith('/') ? assetsPath : assetsPath + '/';

    // Глобальное дерево проекта (все ракурсы)
    var projectData = multiViewJson;

    // Текущее состояние плеера
    var currentView = defaultView || Object.keys(projectData)[0]; // Например, 'front'
    var currentAnim = defaultAnim || Object.keys(projectData[currentView].animations)[0]; // 'idle'

    // Ссылки на активные в данный момент данные
    var activeMeta = projectData[currentView].meta;
    var activeTimeline = projectData[currentView].animations[currentAnim] || {};

    // Состояние времени и кадров
    var currentFrame = 0;
    var totalFrames = 30; // Будет динамически браться из настроек
    var lastFrameTime = 0;
    var fpsInterval = 1000 / 30; // 30 FPS

    // Двухкомпонентное хранилище текстур: assets[viewName][boneName]
    var viewsAssets = {};
    var isLoaded = false;
    var isPlaying = true;

    // var hierarchy = {
    //     'torso': ['head', 'l_shoulder', 'r_shoulder', 'l_thigh', 'r_thigh'],
    //     'head': ['hair'],
    //     'l_shoulder': ['l_forehand'],
    //     'l_forehand': ['l_hand'],
    //     'r_shoulder': ['r_forehand'],
    //     'r_forehand': ['r_hand'],
    //     'l_thigh': ['l_shin'],
    //     'l_shin': ['l_foot'],
    //     'r_thigh': ['r_shin'],
    //     'r_shin': ['r_foot']
    // };

    // Страховка для дерева костей (чтобы новые слоты знали своих родителей в игре)
    var hierarchyTree = multiViewJson.hierarchyTree || {
        'torso': ['head', 'l_shoulder', 'r_shoulder', 'l_thigh', 'r_thigh'],
        'head': ['hair'],
        'l_shoulder': ['l_forehand'],
        'l_forehand': ['l_hand'],
        'r_shoulder': ['r_forehand'],
        'r_forehand': ['r_hand'],
        'l_thigh': ['l_shin'],
        'l_shin': ['l_foot'],
        'r_thigh': ['r_shin'],
        'r_shin': ['r_foot']
    };


    var zOrder = multiViewJson.skeletonOrder || [
        'l_foot', 'l_shin', 'l_thigh',
        'l_hand', 'l_forehand', 'l_shoulder',
        'torso',
        'head', 'hair',
        'r_foot', 'r_shin', 'r_thigh',
        'r_hand', 'r_forehand', 'r_shoulder'
    ];

    // Функция плавной интерполяции (Lerp + Loop)
    function getInterpolatedTransform(boneName, frame) {
        if (activeTimeline[frame] && activeTimeline[frame][boneName]) {
            return activeTimeline[frame][boneName];
        }

        var leftFrame = -1; var rightFrame = -1;
        for (var f = frame; f >= 0; f--) {
            if (activeTimeline[f] && activeTimeline[f][boneName]) { leftFrame = f; break; }
        }
        for (var f = frame; f < totalFrames; f++) {
            if (activeTimeline[f] && activeTimeline[f][boneName]) { rightFrame = f; break; }
        }

        if (leftFrame === -1 && rightFrame === -1) return { x: 0, y: 0, rot: 0 };

        // Автоматическое зацикливание (Loop)
        if (leftFrame !== -1 && rightFrame === -1) {
            var firstFrame = -1;
            for (var f = 0; f < totalFrames; f++) {
                if (activeTimeline[f] && activeTimeline[f][boneName]) { firstFrame = f; break; }
            }
            if (firstFrame === leftFrame) return activeTimeline[leftFrame][boneName];

            var leftKey = activeTimeline[leftFrame][boneName];
            var rightKey = activeTimeline[firstFrame][boneName];
            var t = (frame - leftFrame) / ((totalFrames - 1) - leftFrame + firstFrame + 1);

            var diffRot = rightKey.rot - leftKey.rot;
            diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;
            return {
                x: leftKey.x + (rightKey.x - leftKey.x) * t,
                y: leftKey.y + (rightKey.y - leftKey.y) * t,
                rot: leftKey.rot + diffRot * t
            };
        }

        if (leftFrame === -1 && rightFrame !== -1) return activeTimeline[rightFrame][boneName];

        var leftKey = activeTimeline[leftFrame][boneName];
        var rightKey = activeTimeline[rightFrame][boneName];
        var t = (frame - leftFrame) / (rightFrame - leftFrame);

        var diffRot = rightKey.rot - leftKey.rot;
        diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;
        return {
            x: leftKey.x + (rightKey.x - leftKey.x) * t,
            y: leftKey.y + (rightKey.y - leftKey.y) * t,
            rot: leftKey.rot + diffRot * t
        };
    }

    // Рекурсивный каскад расчета матриц
    function buildCascade(boneName, renderQueue) {
        // Берем текстуры ТЕКУЩЕГО АКТИВНОГО РАКУРСА (например, из папки back)
        var asset = viewsAssets[currentView] ? viewsAssets[currentView][boneName] : null;
        if (!asset) return;

        var pX = asset.pivotX * asset.w;
        var pY = asset.pivotY * asset.h;
        var pivotOffsetX = pX - asset.w / 2;
        var pivotOffsetY = pY - asset.h / 2;

        var transform = getInterpolatedTransform(boneName, currentFrame);

        ctx.save();
        ctx.translate(pivotOffsetX + transform.x, pivotOffsetY + transform.y);
        ctx.rotate(transform.rot * Math.PI / 180);

        renderQueue.push({
            name: boneName,
            asset: asset,
            matrix: ctx.getTransform(),
            pX: pX, pY: pY
        });

        ctx.translate(-pivotOffsetX, -pivotOffsetY);

        var children = hierarchy[boneName] || [];
        children.forEach(function(childName) {
            buildCascade(childName, renderQueue);
        });

        ctx.restore();
    }

    // Отрисовка кадра на холсте
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var renderQueue = [];

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(0.4, 0.4);

        buildCascade('torso', renderQueue);
        ctx.restore();

        zOrder.forEach(function(boneName) {
            var item = renderQueue.find(function(q) { return q.name === boneName; });
            if (!item) return;

            ctx.save();
            ctx.setTransform(item.matrix);
            ctx.drawImage(item.asset.img, -item.pX, -item.pY, item.asset.w, item.asset.h);
            ctx.restore();
        });
    }

    function startLoop() {
        function loop(timestamp) {
            if (!isPlaying) return;
            var elapsed = timestamp - lastFrameTime;
            if (elapsed >= fpsInterval) {
                lastFrameTime = timestamp - (elapsed % fpsInterval);
                currentFrame = (currentFrame + 1) % totalFrames;
                render();
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    // --- МОЩНЫЙ ПУБЛИЧНЫЙ API МЕТОД ДЛЯ УПРАВЛЕНИЯ ПЕРСОНАЖЕМ В ИГРЕ ---
    /**
     * @param {string} viewName - Направление взгляда ('front', 'back', 'left', etc.)
     * @param {string} animationName - Название движения ('idle', 'walk', 'run')
     */
    this.setViewAndAnimation = function(viewName, animationName) {
        if (!projectData[viewName]) {
            console.warn("View direction '" + viewName + "' not found in JSON.");
            return;
        }
        if (!projectData[viewName].animations[animationName]) {
            console.warn("Animation '" + animationName + "' not found in view '" + viewName + "'.");
            return;
        }

        currentView = viewName;
        currentAnim = animationName;

        // Переключаем указатели на новые массивы данных
        activeMeta = projectData[currentView].meta;
        activeTimeline = projectData[currentView].animations[currentAnim];

        currentFrame = 0; // Начинаем анимацию с 0 кадра
        totalFrames = Object.keys(activeTimeline).length || 30;
        isPlaying = true;
    };

    this.pause = function() { isPlaying = false; };
    this.resume = function() { isPlaying = true; startLoop(); };

    // --- МАССИВНЫЙ СИНХРОННЫЙ ЗАГРУЗЧИК ДЛЯ ВСЕХ РАКУРСОВ ОДНОВРЕМЕННО ---
    var totalImagesToLoad = 0;
    var loadedImagesCount = 0;
    var viewsList = Object.keys(projectData);

    // Сначала считаем, сколько всего картинок во всех ракурсах суммарно нужно скачать
    viewsList.forEach(function(vName) {
        totalImagesToLoad += Object.keys(projectData[vName].meta).length;
        viewsAssets[vName] = {}; // Создаем изолированные папки под каждый ракурс в памяти
    });

    // Запускаем сквозную загрузку
    viewsList.forEach(function(vName) {
        var currentMeta = projectData[vName].meta;

        Object.keys(currentMeta).forEach(function(boneName) {
            var boneData = currentMeta[boneName];
            var img = new Image();

            // Если ракурсы лежат в разных подпапках (например, assets/front/torso.png),
            // вы можете настроить путь здесь. Сейчас считаем, что всё лежит в одной куче.
            img.src = cleanPath + boneData.image;

            img.onload = function() {
                viewsAssets[vName][boneName] = {
                    img: img,
                    pivotX: boneData.pivotX,
                    pivotY: boneData.pivotY,
                    w: img.width,
                    h: img.height
                };
                loadedImagesCount++;

                // Когда абсолютно все картинки для всех ракурсов скачались — даем старт игре!
                if (loadedImagesCount === totalImagesToLoad) {
                    isLoaded = true;
                    // Выставляем стартовую длину таймлайна
                    totalFrames = Object.keys(activeTimeline).length || 30;
                    startLoop();
                }
            };
            img.onerror = function() {
                console.error("Failed to load: " + img.src);
            };
        });
    });
}


// <canvas id="gameCanvas" width="800" height="600"></canvas>
//
//     <script src="skeleton-player.js"></script>
//     <script>
// // 1. Инициализируем многоракурсного персонажа
// // 3-й параметр — ваш огромный иерархический JSON-пак
// // 4-й параметр — дефолтный ракурс при старте ('front')
// // 5-й параметр — дефолтная анимация при старте ('idle')
// var player = new SkeletonPlayer("gameCanvas", "./assets/eleniel/", megaProjectData, "front", "idle");
//
// // 2. Слушаем клавиатуру (простейший контроллер перемещения)
// window.addEventListener("keydown", function(e) {
//     if (e.key === "ArrowUp" || e.key === "w") {
//         player.setViewAndAnimation("back", "walk"); // Идет от нас — включаем вид со спины
//     }
//     else if (e.key === "ArrowDown" || e.key === "s") {
//         player.setViewAndAnimation("front", "walk"); // Идет на нас — включаем вид спереди
//     }
//     else if (e.key === "ArrowLeft" || e.key === "a") {
//         player.setViewAndAnimation("left", "walk"); // Идет влево
//     }
//     else if (e.key === "ArrowRight" || e.key === "d") {
//         player.setViewAndAnimation("right", "walk"); // Идет вправо
//     }
//     else if (e.key === " ") {
//         // Нажали пробел — персонаж бьет в том направлении, в котором сейчас стоит!
//         // Мы не знаем ракурс, поэтому считываем текущее состояние или просто вызываем атаку
//         player.setViewAndAnimation("front", "hit");
//     }
// });
// </script>

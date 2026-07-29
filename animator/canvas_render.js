// Выносим движок отрисовки в глобальную область видимости
window.drawScene = function() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем фоновую сетку
    drawCanvasGrid(ctx, canvas);

    const view = window.EditorState.currentView;

    // Проверяем, загружен ли торс (корень скелета) для ТЕКУЩЕГО ракурса
    if (!window.EditorState.project[view] || !window.EditorState.project[view].assets['torso']) return;

    // Массив для сбора команд отрисовки (Z-Index сортировка)
    const renderQueue = [];

    ctx.save();
    // Ставим глобальную камеру по центру экрана 700x700
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(0.4, 0.4); // Глобальный масштаб куклы

    // Запускаем рекурсивный обход дерева трансформаций, начиная с Торса
    // Функция не рисует сразу, а считает каскадные матрицы и собирает элементы в очередь!
    buildCascadeRenderQueue(ctx, 'torso', renderQueue, view);
    ctx.restore();

    // Жесткий анатомический порядок слоев (Z-Index от задних к передним)
    // const zOrder = [
    //     'l_foot', 'l_shin', 'l_thigh',
    //     'l_hand', 'l_forehand', 'l_shoulder',
    //     'torso',
    //     'head', 'hair',
    //     'r_foot', 'r_shin', 'r_thigh',
    //     'r_hand', 'r_forehand', 'r_shoulder'
    // ];
    //
    // window.EditorState.skeletonRenderOrder.forEach(boneName => {
    //     if (zOrder.indexOf(boneName) === -1) zOrder.push(boneName);
    // });
    //
    // // Отрисовываем элементы строго по Z-Index слоям, используя сохраненные каскадные матрицы!
    // zOrder.forEach(boneName => {

    window.EditorState.skeletonRenderOrder.forEach(boneName => {
        const queueItem = renderQueue.find(q => q.name === boneName);
        if (!queueItem) return;

        ctx.save();
        // Применяем вычисленную в каскаде мировую матрицу для этой кости
        ctx.setTransform(queueItem.matrix);

        // Отрисовываем текстуру спрайта, совмещая её сустав с нулём матрицы
        if (queueItem.asset.img && queueItem.asset.img.width) {
            ctx.drawImage(queueItem.asset.img, -queueItem.pX, -queueItem.pY, queueItem.w, queueItem.h);
        }

        // Рисуем зеленый маркер сустава строго в центре каскадного вращения
        drawJointHelper(ctx);
        ctx.restore();
    });
};

// Функция рекурсивного расчета каскада трансформаций с учетом ракурса (View)
function buildCascadeRenderQueue(ctx, boneName, renderQueue, view) {
    const asset = window.EditorState.project[view].assets[boneName];
    if (!asset) return;

    // Берем реальные размеры картинки, если она загружена, либо ставим 1х1 для пустой заглушки
    const w = (asset.img && asset.img.width) ? asset.img.width : 1;
    const h = (asset.img && asset.img.height) ? asset.img.height : 1;

    // Вычисляем координаты сустава (Pivot) в пикселях от центра картинки художника
    const pX = asset.pivotX * w;
    const pY = asset.pivotY * h;
    const pivotOffsetX = pX - w / 2;
    const pivotOffsetY = pY - h / 2;

    // Получаем текущие анимационные сдвиги и поворот для этой конкретной кости
    let transform = { x: 0, y: 0, rot: 0 };
    if (typeof window.getInterpolatedTransform === 'function') {
        transform = window.getInterpolatedTransform(boneName, window.EditorState.currentFrame);
    }

    ctx.save();

    // --- КАСКАДНАЯ МАТЕМАТИКА ---
    // 1. Сдвигаемся в позицию сустава текущей кости на общем холсте + анимационный сдвиг
    ctx.translate(pivotOffsetX + transform.x, pivotOffsetY + transform.y);

    // 2. Вращаем текущую систему координат. Любые дети унаследуют этот поворот автоматически!
    ctx.rotate(transform.rot * Math.PI / 180);

    // Сохраняем текущую накопленную мировую матрицу Canvas для последующей Z-Index отрисовки
    renderQueue.push({
        name: boneName,
        asset: asset,
        matrix: ctx.getTransform(),
        pX: pX,
        pY: pY,
        w: w,
        h: h
    });

    // 3. Компенсируем сдвиг сустава НАЗАД, чтобы для дочерних элементов ноль координат остался в центре холста
    ctx.translate(-pivotOffsetX, -pivotOffsetY);

    // Рекурсивно идем вниз по иерархии к детям (они унаследуют повернутую матрицу)
    const children = window.SkeletonHierarchy.tree[boneName] || [];
    children.forEach(childName => {
        buildCascadeRenderQueue(ctx, childName, renderQueue, view);
    });

    ctx.restore();
}

function drawJointHelper(ctx) {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCanvasGrid(ctx, canvas) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
}





// // Выносим движок отрисовки в глобальную область видимости
// window.drawScene = function() {
//     const canvas = document.getElementById("canvas");
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//
//     // Очищаем холст
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//
//     // Рисуем фоновую сетку
//     drawCanvasGrid(ctx, canvas);
//
//     const view = window.EditorState.currentView;
//
//     // Проверяем, загружен ли торс для ТЕКУЩЕГО выбранного ракурса
//     if (!window.EditorState.project[view] || !window.EditorState.project[view].assets['torso']) return;
//
//     // Массив для сбора команд отрисовки (Z-Index сортировка)
//     const renderQueue = [];
//
//     ctx.save();
//     // Центрируем общую камеру на холсте 700x700 и масштабируем куклу
//     ctx.translate(canvas.width / 2, canvas.height / 2);
//     ctx.scale(0.4, 0.4);
//
//     // Запускаем рекурсивный расчет каскада, передавая текущий активный ракурс
//     buildCascadeRenderQueue(ctx, 'torso', renderQueue, view);
//     ctx.restore();
//
//     // Жесткий анатомический порядок слоев (Z-Index от задних к передним)
//     const zOrder = [
//         'l_foot', 'l_shin', 'l_thigh',
//         'l_hand', 'l_forehand', 'l_shoulder',
//         'torso',
//         'head', 'hair',
//         'r_foot', 'r_shin', 'r_thigh',
//         'r_hand', 'r_forehand', 'r_shoulder'
//     ];
//
//     // Отрисовываем элементы строго по Z-Index слоям, используя сохраненные каскадные матрицы
//     zOrder.forEach(boneName => {
//         const queueItem = renderQueue.find(q => q.name === boneName);
//         if (!queueItem) return;
//
//         ctx.save();
//         ctx.setTransform(queueItem.matrix);
//         ctx.drawImage(queueItem.asset.img, -queueItem.pX, -queueItem.pY, queueItem.w, queueItem.h);
//
//         // Рисуем зеленый маркер сустава строго в центре каскадного вращения
//         drawJointHelper(ctx);
//         ctx.restore();
//     });
// };
//
// // Функция рекурсивного расчета каскада трансформаций с учетом ракурса (View)
// function buildCascadeRenderQueue(ctx, boneName, renderQueue, view) {
//     const asset = window.EditorState.project[view].assets[boneName];
//     if (!asset || !asset.img || !asset.img.width) return;
//
//     const w = asset.img.width;
//     const h = asset.img.height;
//
//     const pX = asset.pivotX * w;
//     const pY = asset.pivotY * h;
//     const pivotOffsetX = pX - w / 2;
//     const pivotOffsetY = pY - h / 2;
//
//     // Получаем текущие анимационные сдвиги и поворот для этой конкретной кости
//     let transform = { x: 0, y: 0, rot: 0 };
//     if (typeof window.getInterpolatedTransform === 'function') {
//         transform = window.getInterpolatedTransform(boneName, window.EditorState.currentFrame);
//     }
//
//     ctx.save();
//
//     // Каскадный перенос матриц
//     ctx.translate(pivotOffsetX + transform.x, pivotOffsetY + transform.y);
//     ctx.rotate(transform.rot * Math.PI / 180);
//
//     // Кэшируем вычисленную мировую матрицу Canvas
//     renderQueue.push({
//         name: boneName,
//         asset: asset,
//         matrix: ctx.getTransform(),
//         pX: pX,
//         pY: pY,
//         w: w,
//         h: h
//     });
//
//     ctx.translate(-pivotOffsetX, -pivotOffsetY);
//
//     // Рекурсивно идем вниз к детям по цепочке иерархии
//     const children = window.SkeletonHierarchy.tree[boneName] || [];
//     children.forEach(childName => {
//         buildCascadeRenderQueue(ctx, childName, renderQueue, view);
//     });
//
//     ctx.restore();
// }
//
// function drawJointHelper(ctx) {
//     ctx.fillStyle = '#00ff00';
//     ctx.fillRect(-3, -3, 6, 6);
//     ctx.beginPath();
//     ctx.arc(0, 0, 8, 0, Math.PI * 2);
//     ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
//     ctx.lineWidth = 1;
//     ctx.stroke();
// }
//
// function drawCanvasGrid(ctx, canvas) {
//     ctx.save();
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
//     ctx.lineWidth = 1;
//     const gridSize = 40;
//     for (let x = 0; x < canvas.width; x += gridSize) {
//         ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
//     }
//     for (let y = 0; y < canvas.height; y += gridSize) {
//         ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
//     }
//     ctx.restore();
// }

const tui = {
    inpX: document.getElementById('inpX'),
    inpY: document.getElementById('inpY'),
    inpRot: document.getElementById('inpRot'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    deleteKeyBtn: document.getElementById('deleteKeyBtn'),
    playBtn: document.getElementById('playBtn'),
    currentFrameDisplay: document.getElementById('currentFrameDisplay'),
    timelineTracks: document.getElementById('timelineTracks'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput')
};

// Буфер обмена для копирования позы (всех костей текущего кадра)
let poseBuffer = null;

// Инициализация кнопок кадров на таймлайне
window.initTimelineUI = function() {
    if (!tui.timelineTracks) return;
    tui.timelineTracks.innerHTML = '';
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;

    // Безопасная проверка: если дорожки для этой анимации еще нет, создаем пустую
    if (!state.project[view].animations[anim]) {
        state.project[view].animations[anim] = {};
    }
    const activeTimeline = state.project[view].animations[anim];

    for (let i = 0; i < state.totalFrames; i++) {
        const btn = document.createElement('button');
        btn.className = `frame-btn ${state.currentFrame === i ? 'active' : ''}`;

        // Подсвечиваем красным маркером кадр, если на нём есть хоть один сохранённый ключ
        if (activeTimeline[String(i)] && Object.keys(activeTimeline[String(i)]).length > 0) {
            btn.classList.add('has-key');
        }

        btn.innerHTML = `<span>${i}</span>`;
        btn.onclick = () => {
            state.currentFrame = i;
            state.isPlaying = false;
            tui.playBtn.innerText = "PLAY";
            tui.playBtn.style.background = "#4f4";
            tui.currentFrameDisplay.innerText = `Frame: ${state.currentFrame} / ${state.totalFrames}`;

            window.initTimelineUI();
            window.loadKeyframeToInspector();
            window.drawScene();
            if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
        };
        tui.timelineTracks.appendChild(btn);
    }
};

// Загрузка ключа из памяти в инпуты инспектора
window.loadKeyframeToInspector = function() {
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;
    if (!state.activeAssetId) return;

    const activeTimeline = state.project[view].animations[anim] || {};
    const frameData = activeTimeline[String(state.currentFrame)] ? activeTimeline[String(state.currentFrame)][state.activeAssetId] : null;

    if (frameData) {
        tui.inpX.value = frameData.x || 0;
        tui.inpY.value = frameData.y || 0;
        tui.inpRot.value = frameData.rot !== undefined ? frameData.rot : 0;
    } else {
        tui.inpX.value = 0;
        tui.inpY.value = 0;
        tui.inpRot.value = 0;
    }
};

// Сохранение ключа из инпута
tui.saveKeyBtn.addEventListener('click', () => {
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;
    if (!state.activeAssetId) return alert('Please select a bone from the Skeleton Tree first!');

    if (!state.project[view].animations[anim]) state.project[view].animations[anim] = {};
    if (!state.project[view].animations[anim][String(state.currentFrame)]) state.project[view].animations[anim][String(state.currentFrame)] = {};

    state.project[view].animations[anim][String(state.currentFrame)][state.activeAssetId] = {
        x: parseFloat(tui.inpX.value) || 0,
        y: parseFloat(tui.inpY.value) || 0,
        rot: parseFloat(tui.inpRot.value) || 0
    };

    window.initTimelineUI();
    window.drawScene();
    if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
});

// Удаление ключа из текущего кадра
if (tui.deleteKeyBtn) {
    tui.deleteKeyBtn.addEventListener('click', () => {
        const state = window.EditorState;
        const view = state.currentView;
        const anim = state.currentAnim;
        if (!state.activeAssetId) return alert('Please select a bone first!');

        const activeTimeline = state.project[view].animations[anim];
        if (activeTimeline && activeTimeline[String(state.currentFrame)] && activeTimeline[String(state.currentFrame)][state.activeAssetId]) {
            delete activeTimeline[String(state.currentFrame)][state.activeAssetId];
            if (Object.keys(activeTimeline[String(state.currentFrame)]).length === 0) {
                delete activeTimeline[String(state.currentFrame)];
            }
            window.initTimelineUI();
            window.loadKeyframeToInspector();
            window.drawScene();
            if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
        }
    });
}

// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КНОПОК COPY / PASTE
window.copyCurrentFramePose = function() {
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;
    const activeTimeline = state.project[view].animations[anim] || {};
    poseBuffer = activeTimeline[String(state.currentFrame)] ? JSON.parse(JSON.stringify(activeTimeline[String(state.currentFrame)])) : null;
    alert(`Pose copied!`);
};

window.pastePoseToCurrentFrame = function() {
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;
    if (!poseBuffer) return alert("Buffer is empty!");
    if (!state.project[view].animations[anim]) state.project[view].animations[anim] = {};
    state.project[view].animations[anim][String(state.currentFrame)] = JSON.parse(JSON.stringify(poseBuffer));
    window.initTimelineUI();
    window.loadKeyframeToInspector();
    window.drawScene();
    if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
    alert(`Pose pasted!`);
};
// Плавный многоракурсный Lerp (между кадрами выбранной анимации)
// Плавный многоракурсный Lerp (между кадрами выбранной анимации с фиксом инициализации)
window.getInterpolatedTransform = function(boneName, frame) {
    const state = window.EditorState;
    const view = state.currentView;
    const anim = state.currentAnim;

    const activeTimeline = state.project[view].animations[anim] || {};
    const frameStr = String(frame);

    // 1. Если есть точный ключ на текущем кадре — отдаем его сразу
    if (activeTimeline[frameStr] && activeTimeline[frameStr][boneName]) {
        var rawKey = activeTimeline[frameStr][boneName];
        return { x: rawKey.x || 0, y: rawKey.y || 0, rot: rawKey.rot !== undefined ? rawKey.rot : 0 };
    }

    // 2. Ищем ближайшие сохраненные ключи слева и справа по таймлайну
    let leftFrame = -1; let rightFrame = -1;
    for (let f = frame; f >= 0; f--) {
        if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { leftFrame = f; break; }
    }
    for (let f = frame; f < state.totalFrames; f++) {
        if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { rightFrame = f; break; }
    }

    if (leftFrame === -1 && rightFrame === -1) return { x: 0, y: 0, rot: 0 };

    // --- УМНОЕ АВТОМАТИЧЕСКОЕ ЗАЦИКЛИВАНИЕ (LOOP LERP) ---
    if (leftFrame !== -1 && rightFrame === -1) {
        let firstFrame = -1;
        for (let f = 0; f < state.totalFrames; f++) {
            if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { firstFrame = f; break; }
        }
        if (firstFrame === leftFrame) return { x: activeTimeline[String(leftFrame)][boneName].x || 0, y: activeTimeline[String(leftFrame)][boneName].y || 0, rot: activeTimeline[String(leftFrame)][boneName].rot !== undefined ? activeTimeline[String(leftFrame)][boneName].rot : 0 };

        const leftKey = activeTimeline[String(leftFrame)][boneName];
        const rightKey = activeTimeline[String(firstFrame)][boneName];

        const lKey = { x: leftKey.x || 0, y: leftKey.y || 0, rot: leftKey.rot !== undefined ? leftKey.rot : 0 };
        const rKey = { x: rightKey.x || 0, y: rightKey.y || 0, rot: rightKey.rot !== undefined ? rightKey.rot : 0 };

        const distToEnd = (state.totalFrames - 1) - leftFrame;
        const distFromStart = firstFrame;
        const totalDist = distToEnd + distFromStart + 1;
        const currentDist = frame - leftFrame;
        const t = currentDist / totalDist;

        let diffRot = rKey.rot - lKey.rot;
        diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;

        return {
            x: lKey.x + (rKey.x - lKey.x) * t,
            y: lKey.y + (rKey.y - lKey.y) * t,
            rot: lKey.rot + diffRot * t
        };
    }

    if (leftFrame === -1 && rightFrame !== -1) {
        var rRaw = activeTimeline[String(rightFrame)][boneName];
        return { x: rRaw.x || 0, y: rRaw.y || 0, rot: rRaw.rot !== undefined ? rRaw.rot : 0 };
    }

    // СТРОГИЙ СИНТАКСИС: Сначала полностью собираем объекты ключей
    const leftKey = activeTimeline[String(leftFrame)][boneName];
    const rightKey = activeTimeline[String(rightFrame)][boneName];

    const lKey = { x: leftKey.x || 0, y: leftKey.y || 0, rot: leftKey.rot !== undefined ? leftKey.rot : 0 };
    const rKey = { x: rightKey.x || 0, y: rightKey.y || 0, rot: rightKey.rot !== undefined ? rightKey.rot : 0 };

    // И только ПОСЛЕ инициализации rKey и lKey считаем разницу углов вращения!
    const t = (frame - leftFrame) / (rightFrame - leftFrame);

    let diffRot = rKey.rot - lKey.rot;
    diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;

    return {
        x: lKey.x + (rKey.x - lKey.x) * t,
        y: lKey.y + (rKey.y - lKey.y) * t,
        rot: lKey.rot + diffRot * t
    };
};

// Игровой цикл плеера (30 FPS)
let lastFrameTime = 0;
const fpsInterval = 1000 / 30;

function playLoop(timestamp) {
    const state = window.EditorState;
    if (!state.isPlaying) return;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= fpsInterval) {
        lastFrameTime = timestamp - (elapsed % fpsInterval);

        state.currentFrame = (state.currentFrame + 1) % state.totalFrames;
        tui.currentFrameDisplay.innerText = `Frame: ${state.currentFrame} / ${state.totalFrames}`;

        if (tui.timelineTracks) {
            const activeBtn = tui.timelineTracks.querySelector('.frame-btn.active');
            if (activeBtn) activeBtn.classList.remove('active');
            if (tui.timelineTracks.children[state.currentFrame]) {
                tui.timelineTracks.children[state.currentFrame].classList.add('active');
            }
        }

        window.loadKeyframeToInspector();
        window.drawScene();
        if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
    }
    requestAnimationFrame(playLoop);
}

tui.playBtn.addEventListener('click', () => {
    const state = window.EditorState;
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        tui.playBtn.innerText = "STOP";
        tui.playBtn.style.background = "#f44";
        lastFrameTime = performance.now();
        requestAnimationFrame(playLoop);
    } else {
        tui.playBtn.innerText = "PLAY";
        tui.playBtn.style.background = "#4f4";
    }
});

// --- ДИНАМИЧЕСКИЙ МНОГОРАКУРСНЫЙ ЭКСПОРТ ---
// --- ДИНАМИЧЕСКИЙ МНОГОРАКУРСНЫЙ ЭКСПОРТ (ИСПРАВЛЕНО) ---
tui.exportBtn.addEventListener('click', () => {
    const state = window.EditorState;
    const exportBundle = {
        skeletonOrder: state.skeletonRenderOrder,
        hierarchyTree: window.SkeletonHierarchy.tree,
        views: {}
    };

    Object.keys(state.project).forEach(vName => {
        const viewData = state.project[vName];
        const saveMeta = {};

        Object.keys(viewData.assets).forEach(boneName => {
            saveMeta[boneName] = {
                image: viewData.assets[boneName].imgName || `eleniel_assets_${boneName}.png`,
                pivotX: viewData.assets[boneName].pivotX,
                pivotY: viewData.assets[boneName].pivotY
            };
        });

        exportBundle.views[vName] = {
            meta: saveMeta,
            animations: viewData.animations || { idle: {}, walk: {}, hit: {} }
        };
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "eleniel_multiview_project.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

// --- ДИНАМИЧЕСКИЙ МНОГОРАКУРСНЫЙ ИМПОРТ (ИСПРАВЛЕНО) ---
tui.importInput.addEventListener('change', function(e) {
    if (!e.target.files || e.target.files.length === 0) return;

    var file = e.target.files[0]; // Четко извлекаем первый файл из коллекции
    var state = window.EditorState;
    var reader = new FileReader();

    reader.onload = function(event) {
        try {
            var rawText = event.target.result.trim();
            if (rawText.indexOf('}{') !== -1) rawText = rawText.split('}{')[0] + '}';

            var bundle = JSON.parse(rawText);

            // Восстанавливаем динамический состав слотов и дерево костей из файла
            // if (bundle.skeletonOrder) state.skeletonRenderOrder = bundle.skeletonOrder;
            // ЗАМЕНИТЕ НА:
            if (bundle.skeletonOrder) {
                state.skeletonRenderOrder = bundle.skeletonOrder;
            } else {
                // Если файл старый и в нем нет порядка слоев, принудительно восстанавливаем базовую анатомическую структуру
                state.skeletonRenderOrder = [
                    'torso', 'head', 'hair',
                    'l_shoulder', 'l_forehand', 'l_hand',
                    'r_shoulder', 'r_forehand', 'r_hand',
                    'l_thigh', 'l_shin', 'l_foot',
                    'r_thigh', 'r_shin', 'r_foot'
                ];
            }

            if (bundle.hierarchyTree) window.SkeletonHierarchy.tree = bundle.hierarchyTree;

            var viewsData = bundle.views || bundle; // Поддержка старых многоракурсных сейвов
            var viewsList = ['front', 'back', 'left', 'right'];

            viewsList.forEach(function(vName) {
                if (!viewsData[vName]) return;
                var fileViewData = viewsData[vName];

                // Пересоздаем пустые слоты под загруженную динамическую структуру
                // state.project[vName].assets = {};
                // state.skeletonRenderOrder.forEach(function(bName) {
                //     state.project[vName].assets[bName] = { name: bName, pivotX: 0.5, pivotY: 0.5, img: new Image() };
                // });

                if (!state.project[vName].assets) state.project[vName].assets = {};

// Подселяем только недостающие слоты, не трогая уже загруженные картинки
                state.skeletonRenderOrder.forEach(function(bName) {
                    if (!state.project[vName].assets[bName]) {
                        state.project[vName].assets[bName] = { name: bName, pivotX: 0.5, pivotY: 0.5, img: new Image() };
                    }
                });

                // Восстанавливаем анимации глубоким переносом
                if (fileViewData.animations) {
                    Object.keys(fileViewData.animations).forEach(function(animName) {
                        state.project[vName].animations[animName] = JSON.parse(JSON.stringify(fileViewData.animations[animName]));
                    });
                }

                // Восстанавливаем сохраненные точки Pivot
                if (fileViewData.meta) {
                    Object.keys(fileViewData.meta).forEach(function(boneName) {
                        var savedMeta = fileViewData.meta[boneName];
                        if (state.project[vName].assets[boneName]) {
                            state.project[vName].assets[boneName].pivotX = savedMeta.pivotX;
                            state.project[vName].assets[boneName].pivotY = savedMeta.pivotY;
                            state.project[vName].assets[boneName].imgName = savedMeta.image;
                        }
                    });
                }
            });

            // Жестко активируем дефолтный ракурс и кадр 0
            state.currentView = "front"; state.currentAnim = "idle"; state.currentFrame = 0;

            var viewSelect = document.getElementById('viewSelect');
            var animSelect = document.getElementById('animSelect');
            if (viewSelect) viewSelect.value = "front";
            if (animSelect) animSelect.value = "idle";

            // Синхронизируем UI выпадающего списка родителей под новые восстановленные слоты
            var parentSelect = document.getElementById('newSlotParentSelect');
            if (parentSelect) {
                parentSelect.innerHTML = '';
                state.skeletonRenderOrder.forEach(function(bName) {
                    var opt = document.createElement('option');
                    opt.value = bName; opt.innerText = bName.toUpperCase();
                    parentSelect.appendChild(opt);
                });
            }

            if (typeof window.initTimelineUI === 'function') window.initTimelineUI();
            if (typeof window.loadKeyframeToInspector === 'function') window.loadKeyframeToInspector();
            if (typeof window.drawScene === 'function') window.drawScene();
            if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
            if (typeof window.refreshDesignAssetListUI === 'function') window.refreshDesignAssetListUI();
            if (typeof window.syncDesignPivotUI === 'function') window.syncDesignPivotUI();

            alert("Dynamic project pack loaded successfully!");
        } catch (err) {
            console.error(err);
            alert("Import failed.");
        }
    };
    reader.readAsText(file);
    tui.importInput.value = '';
});




// const tui = {
//     inpX: document.getElementById('inpX'),
//     inpY: document.getElementById('inpY'),
//     inpRot: document.getElementById('inpRot'),
//     saveKeyBtn: document.getElementById('saveKeyBtn'),
//     deleteKeyBtn: document.getElementById('deleteKeyBtn'),
//     playBtn: document.getElementById('playBtn'),
//     currentFrameDisplay: document.getElementById('currentFrameDisplay'),
//     timelineTracks: document.getElementById('timelineTracks'),
//     exportBtn: document.getElementById('exportBtn'),
//     importInput: document.getElementById('importInput')
// };
//
// // Буфер обмена для копирования позы (всех костей текущего кадра)
// let poseBuffer = null;
//
// // Инициализация кнопок кадров на таймлайне
// window.initTimelineUI = function() {
//     if (!tui.timelineTracks) return;
//     tui.timelineTracks.innerHTML = '';
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//
//     // Безопасная проверка: если дорожки для этой анимации еще нет, создаем пустую
//     if (!state.project[view].animations[anim]) {
//         state.project[view].animations[anim] = {};
//     }
//     const activeTimeline = state.project[view].animations[anim];
//
//     for (let i = 0; i < state.totalFrames; i++) {
//         const btn = document.createElement('button');
//         btn.className = `frame-btn ${state.currentFrame === i ? 'active' : ''}`;
//
//         // Подсвечиваем красным маркером кадр, если на нём есть хоть один сохранённый ключ
//         if (activeTimeline[i] && Object.keys(activeTimeline[i]).length > 0) {
//             btn.classList.add('has-key');
//         }
//
//         btn.innerHTML = `<span>${i}</span>`;
//         btn.onclick = () => {
//             state.currentFrame = i;
//             state.isPlaying = false;
//             tui.playBtn.innerText = "PLAY";
//             tui.playBtn.style.background = "#4f4";
//             tui.currentFrameDisplay.innerText = `Frame: ${state.currentFrame} / ${state.totalFrames}`;
//
//             window.initTimelineUI();
//             window.loadKeyframeToInspector();
//             window.drawScene();
//             if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
//         };
//         tui.timelineTracks.appendChild(btn);
//     }
// };
//
// // Загрузка ключа из памяти в инпуты инспектора
// window.loadKeyframeToInspector = function() {
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//     if (!state.activeAssetId) return;
//
//     const activeTimeline = state.project[view].animations[anim] || {};
//     // const frameData = activeTimeline[state.currentFrame] ? activeTimeline[state.currentFrame][state.activeAssetId] : null;
//
//     const frameData = activeTimeline[String(state.currentFrame)] ? activeTimeline[String(state.currentFrame)][state.activeAssetId] : null;
//
//     if (frameData) {
//         tui.inpX.value = frameData.x;
//         tui.inpY.value = frameData.y;
//         tui.inpRot.value = frameData.rot;
//     } else {
//         tui.inpX.value = 0;
//         tui.inpY.value = 0;
//         tui.inpRot.value = 0;
//     }
// };
//
// // Сохранение ключа из инпута
// tui.saveKeyBtn.addEventListener('click', () => {
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//     if (!state.activeAssetId) return alert('Please select a bone from the Skeleton Tree first!');
//
//     if (!state.project[view].animations[anim]) state.project[view].animations[anim] = {};
//     if (!state.project[view].animations[anim][state.currentFrame]) state.project[view].animations[anim][state.currentFrame] = {};
//
//     state.project[view].animations[anim][state.currentFrame][state.activeAssetId] = {
//         x: parseFloat(tui.inpX.value) || 0,
//         y: parseFloat(tui.inpY.value) || 0,
//         rot: parseFloat(tui.inpRot.value) || 0
//     };
//
//     window.initTimelineUI();
//     window.drawScene();
//     if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
// });
//
// // Удаление ключа из текущего кадра
// if (tui.deleteKeyBtn) {
//     tui.deleteKeyBtn.addEventListener('click', () => {
//         const state = window.EditorState;
//         const view = state.currentView;
//         const anim = state.currentAnim;
//         if (!state.activeAssetId) return alert('Please select a bone first!');
//
//         const activeTimeline = state.project[view].animations[anim];
//         if (activeTimeline && activeTimeline[state.currentFrame] && activeTimeline[state.currentFrame][state.activeAssetId]) {
//             delete activeTimeline[state.currentFrame][state.activeAssetId];
//
//             if (Object.keys(activeTimeline[state.currentFrame]).length === 0) {
//                 delete activeTimeline[state.currentFrame];
//             }
//
//             window.initTimelineUI();
//             window.loadKeyframeToInspector();
//             window.drawScene();
//             if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
//         }
//     });
// }
//
// // Плавный многоракурсный Lerp (между кадрами выбранной анимации)
// // Железобетонное ядро интерполяции, устойчивое к строковым ключам JSON
// window.getInterpolatedTransform = function(boneName, frame) {
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//
//     const activeTimeline = state.project[view].animations[anim] || {};
//
//     // СТРОГИЙ ФИКС: Принудительно превращаем число кадра в строку,
//     // чтобы JS идеально находил ключи "0", "15" из вашего JSON-файла!
//     const frameStr = String(frame);
//
//     // 1. Если есть точный ключ на текущем кадре — отдаем его сразу
//     if (activeTimeline[frameStr] && activeTimeline[frameStr][boneName]) {
//         return activeTimeline[frameStr][boneName];
//     }
//
//     // 2. Ищем ближайшие сохраненные ключи слева и справа по таймлайну
//     let leftFrame = -1;
//     let rightFrame = -1;
//
//     for (let f = frame; f >= 0; f--) {
//         if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { leftFrame = f; break; }
//     }
//     for (let f = frame; f < state.totalFrames; f++) {
//         if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { rightFrame = f; break; }
//     }
//
//     // Если ключей нет вообще нигде на таймлайне — возвращаем дефолт (0, 0, 0)
//     if (leftFrame === -1 && rightFrame === -1) return { x: 0, y: 0, rot: 0 };
//
//     // --- УМНОЕ АВТОМАТИЧЕСКОЕ ЗАЦИКЛИВАНИЕ (LOOP LERP) ---
//     if (leftFrame !== -1 && rightFrame === -1) {
//         let firstFrame = -1;
//         for (let f = 0; f < state.totalFrames; f++) {
//             if (activeTimeline[String(f)] && activeTimeline[String(f)][boneName]) { firstFrame = f; break; }
//         }
//         if (firstFrame === leftFrame) return activeTimeline[String(leftFrame)][boneName];
//
//         const leftKey = activeTimeline[String(leftFrame)][boneName];
//         const rightKey = activeTimeline[String(firstFrame)][boneName];
//
//         const distToEnd = (state.totalFrames - 1) - leftFrame;
//         const distFromStart = firstFrame;
//         const totalDist = distToEnd + distFromStart + 1;
//         const currentDist = frame - leftFrame;
//
//         const t = currentDist / totalDist;
//
//         let diffRot = rightKey.rot - leftKey.rot;
//         diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;
//
//         return {
//             x: leftKey.x + (rightKey.x - leftKey.x) * t,
//             y: leftKey.y + (rightKey.y - leftKey.y) * t,
//             rot: leftKey.rot + diffRot * t
//         };
//     }
//
//     if (leftFrame === -1 && rightFrame !== -1) return activeTimeline[String(rightFrame)][boneName];
//
//     // Стандартная интерполяция между двумя ключами внутри таймлайна
//     const leftKey = activeTimeline[String(leftFrame)][boneName];
//     const rightKey = activeTimeline[String(rightFrame)][boneName];
//     const t = (frame - leftFrame) / (rightFrame - leftFrame);
//
//     let diffRot = rightKey.rot - leftKey.rot;
//     diffRot = ((diffRot + 180) % 360 + 360) % 360 - 180;
//
//     return {
//         x: leftKey.x + (rightKey.x - leftKey.x) * t,
//         y: leftKey.y + (rightKey.y - leftKey.y) * t,
//         rot: leftKey.rot + diffRot * t
//     };
// };
//
//
// // Игровой цикл плеера (30 FPS)
// let lastFrameTime = 0;
// const fpsInterval = 1000 / 30;
//
// function playLoop(timestamp) {
//     const state = window.EditorState;
//     if (!state.isPlaying) return;
//
//     const elapsed = timestamp - lastFrameTime;
//     if (elapsed >= fpsInterval) {
//         lastFrameTime = timestamp - (elapsed % fpsInterval);
//
//         state.currentFrame = (state.currentFrame + 1) % state.totalFrames;
//         tui.currentFrameDisplay.innerText = `Frame: ${state.currentFrame} / ${state.totalFrames}`;
//
//         if (tui.timelineTracks) {
//             const activeBtn = tui.timelineTracks.querySelector('.frame-btn.active');
//             if (activeBtn) activeBtn.classList.remove('active');
//             if (tui.timelineTracks.children[state.currentFrame]) {
//                 tui.timelineTracks.children[state.currentFrame].classList.add('active');
//             }
//         }
//
//         window.loadKeyframeToInspector();
//         window.drawScene();
//         if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
//     }
//     requestAnimationFrame(playLoop);
// }
//
// tui.playBtn.addEventListener('click', () => {
//     const state = window.EditorState;
//     state.isPlaying = !state.isPlaying;
//     if (state.isPlaying) {
//         tui.playBtn.innerText = "STOP";
//         tui.playBtn.style.background = "#f44";
//         lastFrameTime = performance.now();
//         requestAnimationFrame(playLoop);
//     } else {
//         tui.playBtn.innerText = "PLAY";
//         tui.playBtn.style.background = "#4f4";
//     }
// });
//
// window.copyCurrentFramePose = function() {
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//     const activeTimeline = state.project[view].animations[anim] || {};
//     poseBuffer = activeTimeline[state.currentFrame] ? JSON.parse(JSON.stringify(activeTimeline[state.currentFrame])) : null;
//     alert(`Pose from frame ${state.currentFrame} copied to buffer!`);
// };
//
// window.pastePoseToCurrentFrame = function() {
//     const state = window.EditorState;
//     const view = state.currentView;
//     const anim = state.currentAnim;
//     if (!poseBuffer) return alert("Buffer is empty! Copy a pose first.");
//     if (!state.project[view].animations[anim]) state.project[view].animations[anim] = {};
//     state.project[view].animations[anim][state.currentFrame] = JSON.parse(JSON.stringify(poseBuffer));
//     window.initTimelineUI();
//     window.loadKeyframeToInspector();
//     window.drawScene();
//     if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
//     alert(`Pose pasted into frame ${state.currentFrame}!`);
// };
//
// // --- МНОГОРАКУРСНЫЙ ЭКСПОРТ (СИНТАКСИС ИСПРАВЛЕН) ---
// tui.exportBtn.addEventListener('click', () => {
//     const state = window.EditorState;
//     const exportBundle = {};
//
//     Object.keys(state.project).forEach(vName => {
//         const viewData = state.project[vName];
//         const saveMeta = {};
//
//         Object.keys(viewData.assets).forEach(boneName => {
//             saveMeta[boneName] = {
//                 image: viewData.assets[boneName].imgName || `eleniel_assets_${boneName}.png`,
//                 pivotX: viewData.assets[boneName].pivotX,
//                 pivotY: viewData.assets[boneName].pivotY
//             };
//         });
//
//         exportBundle[vName] = {
//             meta: saveMeta,
//             animations: viewData.animations
//         };
//     });
//
//     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
//     const dlAnchor = document.createElement('a');
//     dlAnchor.setAttribute("href", dataStr);
//     dlAnchor.setAttribute("download", "eleniel_multiview_project.json");
//     document.body.appendChild(dlAnchor);
//     dlAnchor.click();
//     dlAnchor.remove();
// });
//
// // --- МНОГОРАКУРСНЫЙ ИМПОРТ ---
// // --- БЕЗОПАСНЫЙ ИМПОРТ МНОГОРАКУРСНОГО JSON ---
// // --- БЕЗОПАСНЫЙ ИМПОРТ МНОГОРАКУРСНОГО JSON ---
// tui.importInput.addEventListener('change', function(e) {
//     if (!e.target.files || e.target.files.length === 0) return;
//
//     var file = e.target.files[0]; // Берем строго первый файл
//     var state = window.EditorState;
//     var reader = new FileReader();
//
//     reader.onload = function(event) {
//         try {
//             var rawText = event.target.result.trim();
//             if (rawText.indexOf('}{') !== -1) {
//                 rawText = rawText.split('}{')[0] + '}';
//             }
//
//             var parsedProject = JSON.parse(rawText);
//
//             // Пробегаем по ракурсам из файла JSON
//             Object.keys(parsedProject).forEach(function(vName) {
//                 if (!state.project[vName]) return;
//
//                 var fileViewData = parsedProject[vName];
//
//                 // 1. ТОЧЕЧНОЕ ВОССТАНОВЛЕНИЕ АНИМАЦИЙ: не затираем объект целиком,
//                 // а глубоко переносим каждый кадр каждой анимации (idle, walk, hit)
//                 if (fileViewData.animations) {
//                     Object.keys(fileViewData.animations).forEach(function(animName) {
//                         state.project[vName].animations[animName] = JSON.parse(JSON.stringify(fileViewData.animations[animName]));
//                     });
//                 }
//
//                 // 2. ВОССТАНОВЛЕНИЕ ТОЧЕК PIVOT
//                 if (fileViewData.meta) {
//                     Object.keys(fileViewData.meta).forEach(function(boneName) {
//                         var savedMeta = fileViewData.meta[boneName];
//
//                         // Восстанавливаем координаты в памяти
//                         if (state.project[vName].assets[boneName]) {
//                             state.project[vName].assets[boneName].pivotX = savedMeta.pivotX;
//                             state.project[vName].assets[boneName].pivotY = savedMeta.pivotY;
//                         } else {
//                             // Создаем заглушку, чтобы при загрузке PNG пивоты применились
//                             state.project[vName].assets[boneName] = {
//                                 img: new Image(),
//                                 name: boneName,
//                                 imgName: savedMeta.image,
//                                 pivotX: savedMeta.pivotX,
//                                 pivotY: savedMeta.pivotY
//                             };
//                         }
//                     });
//                 }
//             });
//
//             // Жестко выставляем дефолтные ракурс и анимацию принудительно, чтобы UI не промахнулся
//             state.currentView = "front";
//             state.currentAnim = "idle";
//             state.currentFrame = 0;
//
//             // Синхронизируем селекторы на экране, если они есть
//             var viewSelect = document.getElementById('viewSelect');
//             var animSelect = document.getElementById('animSelect');
//             if (viewSelect) viewSelect.value = "front";
//             if (animSelect) animSelect.value = "idle";
//
//             // Принудительно заставляем все экраны обновиться
//             if (typeof window.initTimelineUI === 'function') window.initTimelineUI();
//             if (typeof window.loadKeyframeToInspector === 'function') window.loadKeyframeToInspector();
//             if (typeof window.drawScene === 'function') window.drawScene();
//             if (typeof window.refreshHierarchyUI === 'function') window.refreshHierarchyUI();
//             if (typeof window.refreshDesignAssetListUI === 'function') window.refreshDesignAssetListUI();
//             if (typeof window.syncDesignPivotUI === 'function') window.syncDesignPivotUI();
//
//             alert("Project JSON loaded successfully! Frame 0 activated.");
//         } catch (err) {
//             console.error("Критическая ошибка импорта:", err);
//             alert("Import failed. Look at the browser console for details.");
//         }
//     };
//     reader.readAsText(file);
//     tui.importInput.value = '';
// });

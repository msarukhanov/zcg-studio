
// Единственный источник правды для всего редактора
window.EditorState = {
    currentMode: 'DESIGN',
    currentView: 'front', // Ракурс по умолчанию
    currentAnim: 'idle',  // Анимация по умолчанию
    activeAssetId: null,
    currentFrame: 0,
    totalFrames: 30,
    isPlaying: false,

    brushSize: 15,               // Размер ластика
    lassoPoints: [],             // Точки текущего выделения лассо
    isDrawing: false,            // Флаг зажатой мыши

    // Динамический массив порядка отображения слотов (его расширяют кнопки UI)
    skeletonRenderOrder: [
        'torso',
        'head', 'hair',
        'l_shoulder', 'l_forehand', 'l_hand',
        'r_shoulder', 'r_forehand', 'r_hand',
        'l_thigh', 'l_shin', 'l_foot',
        'r_thigh', 'r_shin', 'r_foot'
    ],

    // Новая многомерная структура проекта
    project: {
        front: { originalImage: null, assets: {}, animations: { idle: {}, walk: {}, hit: {} } },
        back:  { originalImage: null, assets: {}, animations: { idle: {}, walk: {}, hit: {} } },
        left:  { originalImage: null, assets: {}, animations: { idle: {}, walk: {}, hit: {} } },
        right: { originalImage: null, assets: {}, animations: { idle: {}, walk: {}, hit: {} } }
    },

    requiredBones: [
        'torso', 'head', 'hair',
        'l_shoulder', 'l_forehand', 'l_hand',
        'r_shoulder', 'r_forehand', 'r_hand',
        'l_thigh', 'l_shin', 'l_foot',
        'r_thigh', 'r_shin', 'r_foot'
    ]
};

Object.keys(window.EditorState.project).forEach(function(vName) {
    window.EditorState.skeletonRenderOrder.forEach(function(boneName) {
        window.EditorState.project[vName].assets[boneName] = {
            name: boneName,
            pivotX: 0.5,
            pivotY: 0.5,
            img: document.createElement('canvas') // Изначально пустой невидимый холст 1х1
        };
        window.EditorState.project[vName].assets[boneName].img.width = 1;
        window.EditorState.project[vName].assets[boneName].img.height = 1;
    });
});

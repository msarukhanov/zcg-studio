//==== main.js (ЧАСТЬ 1 из 3)
document.addEventListener("DOMContentLoaded", () => {
    // Жестко кэшируем абсолютно все элементы интерфейса со страницы
    const ui = {
        btnDesign: document.getElementById('btnDesignMode'),
        btnAnimation: document.getElementById('btnAnimationMode'),
        viewDesign: document.getElementById('designModeView'),
        viewAnimation: document.getElementById('animationModeView'),
        fileInput: document.getElementById('fileInput'),
        assetList: document.getElementById('assetList'),
        hierarchyTreeList: document.getElementById('hierarchyTreeList'),
        pivotDot: document.getElementById('pivotDot'),
        pivotCoords: document.getElementById('pivotCoords'),
        pivotZone: document.getElementById('pivotZone'),
        inspectorTitle: document.getElementById('inspectorTitle'),
        // Переключатели ракурсов и анимаций в левом верхнем углу
        viewSelect: document.getElementById('viewSelect'),
        animSelectContainer: document.getElementById('animSelectContainer'),
        animSelect: document.getElementById('animSelect'),
        addAnimBtn: document.getElementById('addAnimBtn'),
        // Элементы динамического Slot Manager внизу чеклиста
        newSlotNameInp: document.getElementById('newSlotNameInp'),
        newSlotParentSelect: document.getElementById('newSlotParentSelect'),
        addSlotBtn: document.getElementById('addSlotBtn'),
        deleteSlotBtn: document.getElementById('deleteSlotBtn'),
        // Поля ввода трансформации в инспекторе параметров
        inpX: document.getElementById('inpX'),
        inpY: document.getElementById('inpY'),
        inpRot: document.getElementById('inpRot'),
        saveKeyBtn: document.getElementById('saveKeyBtn'),
        // Наш новый Canvas дизайна (должен быть в HTML вместо pivotImg)
        designCanvas: document.getElementById('designCanvas')
    };

    // Создаем UI панель инструментов (Пивот, Лассо, Ластик) внутри pivotZone
    function createDesignToolbar() {
        if (!ui.pivotZone) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'design-toolbar';
        toolbar.style.cssText = "position:absolute; top:5px; left:5px; display:flex; gap:5px; z-index:100; background:rgba(0,0,0,0.8); padding:6px; border-radius:4px; box-shadow: 0 2px 10px rgba(0,0,0,0.5);";

        const tools = [
            { id: 'PIVOT', label: '📍 Pivot' },
            { id: 'LASSO', label: '✂️ Lasso' },
            { id: 'ERASER', label: '🧽 Eraser' }
        ];

        tools.forEach(t => {
            const btn = document.createElement('button');
            btn.id = `btnTool_${t.id}`;
            btn.innerText = t.label;
            btn.style.cssText = "background:#222; border:1px solid #555; color:#fff; cursor:pointer; padding:4px 10px; font-size:12px; border-radius:3px; font-weight:bold;";

            btn.onclick = () => {
                window.EditorState.currentTool = t.id;
                window.EditorState.lassoPoints = []; // Сброс незавершенного лассо
                updateToolButtonsUI();
                window.syncDesignPivotUI();
            };
            toolbar.appendChild(btn);
        });

        const sizeLabel = document.createElement('span');
        sizeLabel.innerText = "Размер:";
        sizeLabel.style.cssText = "color:#fff; font-size:11px; align-self:center; margin-left:8px; font-family:sans-serif;";
        toolbar.appendChild(sizeLabel);

        const sizeInp = document.createElement('input');
        sizeInp.type = 'range'; sizeInp.min = '2'; sizeInp.max = '50'; sizeInp.value = window.EditorState.brushSize;
        sizeInp.style.cssText = "width:70px; align-self:center; cursor:pointer;";
        sizeInp.oninput = (e) => {
            window.EditorState.brushSize = parseInt(e.target.value);
            window.syncDesignPivotUI();
        };
        toolbar.appendChild(sizeInp);

        ui.pivotZone.appendChild(toolbar);
        updateToolButtonsUI();
    }

    // Подсветка кнопок инструментов
    function updateToolButtonsUI() {
        ['PIVOT', 'LASSO', 'ERASER'].forEach(toolId => {
            const btn = document.getElementById(`btnTool_${toolId}`);
            if (!btn) return;
            if (window.EditorState.currentTool === toolId) {
                btn.style.background = '#4af';
                btn.style.color = '#000';
            } else {
                btn.style.background = '#222';
                btn.style.color = '#fff';
            }
        });
    }

    // Получение координат мыши с учетом масштабирования Canvas
    function getCanvasMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * canvas.width,
            y: ((e.clientY - rect.top) / rect.height) * canvas.height,
            pctX: (e.clientX - rect.left) / rect.width,
            pctY: (e.clientY - rect.top) / rect.height
        };
    }

    // Очистка ластиком пикселей фрагмента кости
    function erasePixelAt(view, boneName, x, y) {
        const asset = window.EditorState.project[view].assets[boneName];
        if (!asset || !asset.img || asset.img.width <= 1) return;

        const ctx = asset.img.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.arc(x, y, window.EditorState.brushSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        window.syncDesignPivotUI();
        if (typeof window.drawScene === 'function') window.drawScene();
    }
//==== main.js (ЧАСТЬ 2 из 3)

    // Логика Лассо обрезки фрагмента из общей Т-позы
    // Исправленная логика Лассо: сохраняем размеры оригинала, чтобы не сдвигать детали!
    function applyLassoCut() {
        const view = window.EditorState.currentView;
        const id = window.EditorState.activeAssetId;
        const pImg = window.EditorState.project[view].originalImg;
        const points = window.EditorState.lassoPoints;

        if (!id || !pImg || points.length < 3) return;

        // 1. Создаем индивидуальный холст для кости СТРОГО в размерах оригинала
        const boneCanvas = document.createElement('canvas');
        boneCanvas.width = pImg.width;
        boneCanvas.height = pImg.height;
        const bCtx = boneCanvas.getContext('2d');

        // 2. Выстраиваем маску отсечения по точкам лассо
        bCtx.save();
        bCtx.beginPath();
        bCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            bCtx.lineTo(points[i].x, points[i].y);
        }
        bCtx.closePath();
        bCtx.clip(); // Все, что вне лассо, отсекается в прозрачность

        // 3. Отрисовываем оригинал сквозь маску лассо
        bCtx.drawImage(pImg, 0, 0);
        bCtx.restore();

        // 4. Записываем полноразмерный холст с вырезанным куском в ассет кости
        window.EditorState.project[view].assets[id].img = boneCanvas;

        // 5. Сбрасываем лассо и переключаем в Пивот для настройки сустава
        window.EditorState.lassoPoints = [];
        window.EditorState.currentTool = 'PIVOT';
        if (typeof updateToolButtonsUI === 'function') updateToolButtonsUI();

        updateDesignAssetListUI();
        window.syncDesignPivotUI();
        if (typeof window.drawScene === 'function') window.drawScene();
    }


    // Инициализация кликов и перемещений мыши на рабочем холсте Дизайна
    function initDesignCanvasEvents() {
        if (!ui.designCanvas) return;

        ui.designCanvas.addEventListener('mousedown', (e) => {
            const view = window.EditorState.currentView;
            const id = window.EditorState.activeAssetId;
            const tool = window.EditorState.currentTool;
            if (!window.EditorState.project[view].originalImg) return;

            const pos = getCanvasMousePos(ui.designCanvas, e);
            window.EditorState.isDrawing = true;

            if (tool === 'LASSO') {
                if (!id) return alert('Выберите слот (кость) в списке слоев слева, прежде чем обводить!');
                window.EditorState.lassoPoints = [{ x: pos.x, y: pos.y }];
                window.syncDesignPivotUI();
            }
            else if (tool === 'ERASER') {
                if (!id) return;
                erasePixelAt(view, id, pos.x, pos.y);
            }
            else if (tool === 'PIVOT') {
                if (!id) return;
                const asset = window.EditorState.project[view].assets[id];
                if (asset && asset.img && asset.img.width > 1) {
                    asset.pivotX = pos.pctX;
                    asset.pivotY = pos.pctY;
                    window.syncDesignPivotUI();
                    if (typeof window.drawScene === 'function') window.drawScene();
                }
            }
        });

        ui.designCanvas.addEventListener('mousemove', (e) => {
            if (!window.EditorState.isDrawing) return;
            const view = window.EditorState.currentView;
            const id = window.EditorState.activeAssetId;
            const tool = window.EditorState.currentTool;

            const pos = getCanvasMousePos(ui.designCanvas, e);

            if (tool === 'LASSO') {
                window.EditorState.lassoPoints.push({ x: pos.x, y: pos.y });
                window.syncDesignPivotUI();
            }
            else if (tool === 'ERASER') {
                if (!id) return;
                erasePixelAt(view, id, pos.x, pos.y);
            }
        });

        window.addEventListener('mouseup', () => {
            if (!window.EditorState.isDrawing) return;
            window.EditorState.isDrawing = false;
            const tool = window.EditorState.currentTool;
            if (tool === 'LASSO' && window.EditorState.lassoPoints.length > 2) {
                applyLassoCut();
            }
        });
    }
//==== main.js (ЧАСТЬ 3 из 3)

    // Синхронизация и отрисовка холста дизайна (отрисовка контуров лассо или вырезанных костей)
    // Синхронизация и адаптивная отрисовка холста дизайна
    window.syncDesignPivotUI = function() {
        if (!ui.designCanvas) return;
        const ctx = ui.designCanvas.getContext('2d');

        const view = window.EditorState.currentView;
        const id = window.EditorState.activeAssetId;
        const tool = window.EditorState.currentTool;
        const pImg = window.EditorState.project[view].originalImg;

        // Скрываем старую HTML-точку, так как теперь рисуем маркер пивота прямо на холсте
        if (ui.pivotDot) ui.pivotDot.style.display = 'none';

        // Ситуация 1: Если для текущего ракурса еще не загружен файл общей Т-позы
        if (!pImg) {
            ui.designCanvas.width = 400; ui.designCanvas.height = 400;
            ctx.clearRect(0, 0, ui.designCanvas.width, ui.designCanvas.height);
            ctx.fillStyle = '#777'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`Upload T-pose for [${view.toUpperCase()}]`, 200, 200);
            if (ui.pivotCoords) ui.pivotCoords.innerText = 'T-pose not loaded';
            return;
        }

        // Режим LASSO: Рисуем оригинальный спрайт-лист в полном разрешении (CSS его сожмет на экране)
        if (tool === 'LASSO') {
            ui.designCanvas.width = pImg.width;
            ui.designCanvas.height = pImg.height;
            ctx.clearRect(0, 0, ui.designCanvas.width, ui.designCanvas.height);
            ctx.drawImage(pImg, 0, 0);

            // Отрисовка линий обводки лассо
            if (window.EditorState.lassoPoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = Math.max(2, pImg.width / 300); // Динамическая толщина линии для больших картинок
                ctx.moveTo(window.EditorState.lassoPoints[0].x, window.EditorState.lassoPoints[0].y);
                for (let i = 1; i < window.EditorState.lassoPoints.length; i++) {
                    ctx.lineTo(window.EditorState.lassoPoints[i].x, window.EditorState.lassoPoints[i].y);
                }
                ctx.stroke();
            }
            if (ui.pivotCoords) ui.pivotCoords.innerText = `Lasso: Cut detail for [${id ? id.toUpperCase() : 'choose bone'}]`;
            return;
        }

        // Ситуация 2: Если кость не выбрана в чеклисте для работы в режимах Пивота/Ластика
        if (!id) {
            ui.designCanvas.width = 400; ui.designCanvas.height = 400;
            ctx.clearRect(0, 0, ui.designCanvas.width, ui.designCanvas.height);
            ctx.fillStyle = '#777'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Выберите кость из чеклиста', 200, 200);
            if (ui.pivotCoords) ui.pivotCoords.innerText = 'Choose bone from checklist';
            return;
        }

        const asset = window.EditorState.project[view].assets[id];
        // Ситуация 3: Если слот пустой (кость еще не вырезали из Т-позы)
        if (!asset || !asset.img || asset.img.width <= 1) {
            ui.designCanvas.width = 400; ui.designCanvas.height = 400;
            ctx.clearRect(0, 0, ui.designCanvas.width, ui.designCanvas.height);
            ctx.fillStyle = '#999'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`Slot [${id.toUpperCase()}] is empty. Use Lasso and cut it.`, 200, 200);
            if (ui.pivotCoords) ui.pivotCoords.innerText = 'Fragment is not cut';
            return;
        }

        // Режимы PIVOT и ERASER: Отрисовываем изолированный кусок кости
        ui.designCanvas.width = asset.img.width;
        ui.designCanvas.height = asset.img.height;
        ctx.clearRect(0, 0, ui.designCanvas.width, ui.designCanvas.height);
        ctx.drawImage(asset.img, 0, 0);

        // Если активен инструмент Пивота, рисуем маркер сустава поверх фрагмента
        if (tool === 'PIVOT') {
            const pX = asset.pivotX * asset.img.width;
            const pY = asset.pivotY * asset.img.height;

            // Масштабируем прицел, чтобы на огромных Т-позах его было видно (примерно 2% от ширины)
            const markerSize = Math.max(12, asset.img.width * 0.02);

            ctx.save();
            // Рисуем красный прицел сустава прямо на Canvas
            ctx.strokeStyle = '#ff0033';
            ctx.lineWidth = Math.max(2, asset.img.width / 200);
            ctx.beginPath();
            // Горизонтальная линия
            ctx.moveTo(pX - markerSize, pY); ctx.lineTo(pX + markerSize, pY);
            // Вертикальная линия
            ctx.moveTo(pX, pY - markerSize); ctx.lineTo(pX, pY + markerSize);
            ctx.stroke();

            // Центрирующий кружок
            ctx.fillStyle = '#ff0033';
            ctx.beginPath();
            ctx.arc(pX, pY, markerSize / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (ui.pivotCoords) {
                ui.pivotCoords.innerText = `Pivot [${id.toUpperCase()}] -> X: ${Math.round(asset.pivotX * 100)}%, Y: ${Math.round(asset.pivotY * 100)}%`;
            }
        }
        else if (tool === 'ERASER') {
            if (ui.pivotCoords) ui.pivotCoords.innerText = `Eraser: Eraser bone pixels ${id.toUpperCase()}. Brush: ${window.EditorState.brushSize}px`;
        }
    };

    // Первичный и последующий вывод чеклиста из 15 слотов в режиме Дизайна
    function updateDesignAssetListUI() {
        ui.assetList.innerHTML = '';
        const view = window.EditorState.currentView;
        const order = window.EditorState.skeletonRenderOrder;
        order.forEach((boneName, index) => {
            const depth = window.SkeletonHierarchy.getBoneDepth(boneName);
            const asset = window.EditorState.project[view].assets[boneName];
            const assetExists = (asset && asset.img && asset.img.width > 1) ? true : false;

            const div = document.createElement('div');
            div.className = `asset-item indent-${depth}`;
            if (window.EditorState.activeAssetId === boneName) div.classList.add('active');

            const labelSpan = document.createElement('span');
            labelSpan.style.flex = "1";
            labelSpan.style.cursor = "pointer";

            if (assetExists) {
                labelSpan.innerText = `● ${boneName.toUpperCase()}`;
                labelSpan.style.color = '#4af';
            } else {
                labelSpan.innerText = `○ ${boneName.toUpperCase()} (Missing)`;
                labelSpan.style.color = '#666';
                labelSpan.style.opacity = '0.6';
            }

            labelSpan.onclick = (e) => {
                e.stopPropagation();
                window.EditorState.activeAssetId = boneName;
                updateDesignAssetListUI();
                window.syncDesignPivotUI();
            };
            div.appendChild(labelSpan);

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'layer-controls';
            controlsDiv.style.display = "flex"; controlsDiv.style.gap = "3px"; controlsDiv.style.marginLeft = "auto";

            const upBtn = document.createElement('button');
            upBtn.innerText = "▲";
            upBtn.style.cssText = "background:#222; border:1px solid #444; color:#fff; font-size:9px; padding:2px 5px; cursor:pointer; border-radius:3px; font-weight:bold;";
            if (index === 0) { upBtn.style.opacity = "0.2"; upBtn.style.cursor = "not-allowed"; }
            upBtn.onclick = (e) => {
                e.stopPropagation();
                if (index > 0) {
                    const temp = order[index]; order[index] = order[index - 1]; order[index - 1] = temp;
                    updateDesignAssetListUI();
                    if (typeof window.drawScene === 'function') window.drawScene();
                }
            };

            const downBtn = document.createElement('button');
            downBtn.innerText = "▼";
            downBtn.style.cssText = "background:#222; border:1px solid #444; color:#fff; font-size:9px; padding:2px 5px; cursor:pointer; border-radius:3px; font-weight:bold;";
            if (index === order.length - 1) { downBtn.style.opacity = "0.2"; downBtn.style.cursor = "not-allowed"; }
            downBtn.onclick = (e) => {
                e.stopPropagation();
                if (index < order.length - 1) {
                    const temp = order[index]; order[index] = order[index + 1]; order[index + 1] = temp;
                    updateDesignAssetListUI();
                    if (typeof window.drawScene === 'function') window.drawScene();
                }
            };

            controlsDiv.appendChild(upBtn); controlsDiv.appendChild(downBtn);
            div.appendChild(controlsDiv); ui.assetList.appendChild(div);
        });
    }

    // Отрисовка дерева иерархии костей в режиме Анимации
    function renderHierarchyTreeUI() {
        ui.hierarchyTreeList.innerHTML = '';
        const view = window.EditorState.currentView;
        window.EditorState.skeletonRenderOrder.forEach(boneName => {
            if (!window.EditorState.project[view].assets[boneName] || window.EditorState.project[view].assets[boneName].img.width <= 1) return;
            const depth = window.SkeletonHierarchy.getBoneDepth(boneName);
            const div = document.createElement('div');
            let transform = { x: 0, y: 0, rot: 0 };
            if (typeof window.getInterpolatedTransform === 'function') {
                transform = window.getInterpolatedTransform(boneName, window.EditorState.currentFrame);
            }
            div.className = `tree-node indent-${depth} ${window.EditorState.activeAssetId === boneName ? 'active' : ''}`;
            div.innerHTML = `
 <span style="font-weight:500;">${boneName.toUpperCase()}</span>
 <span style="float: right; font-family: monospace; font-size: 11px; color: #888;">
 X:${transform.x.toFixed(1)} Y:${transform.y.toFixed(1)} R:${transform.rot.toFixed(1)}°
 </span>
 `;
            div.onclick = () => {
                window.EditorState.activeAssetId = boneName;
                renderHierarchyTreeUI();
                ui.inspectorTitle.innerText = boneName.toUpperCase();
                if (typeof window.loadKeyframeToInspector === 'function') window.loadKeyframeToInspector();
            };
            ui.hierarchyTreeList.appendChild(div);
        });
    }

    // Выпадающие списки (Смена ракурса и анимации)
    ui.viewSelect.addEventListener('change', (e) => {
        window.EditorState.currentView = e.target.value;
        window.EditorState.activeAssetId = null;
        if (window.EditorState.currentMode === 'DESIGN') {
            updateDesignAssetListUI(); window.syncDesignPivotUI();
        } else {
            renderHierarchyTreeUI(); if (typeof window.drawScene === 'function') window.drawScene();
        }
    });

    ui.animSelect.addEventListener('change', (e) => {
        window.EditorState.currentAnim = e.target.value;
        if (window.EditorState.currentMode === 'ANIMATION') {
            renderHierarchyTreeUI();
            if (typeof window.initTimelineUI === 'function') window.initTimelineUI();
            if (typeof window.drawScene === 'function') window.drawScene();
        }
    });

    // Добавление кастомных треков анимации (+ New)
    ui.addAnimBtn.addEventListener('click', () => {
        const newAnimName = prompt("Введите имя новой анимации (строчными, например 'run'):");
        if (!newAnimName) return;
        const cleanName = newAnimName.trim().toLowerCase();
        const exists = Array.from(ui.animSelect.options).some(opt => opt.value === cleanName);
        if (exists) return alert("Анимация с таким именем уже существует!");
        const option = document.createElement('option');
        option.value = cleanName; option.innerText = cleanName.toUpperCase();
        ui.animSelect.appendChild(option); ui.animSelect.value = cleanName;
        window.EditorState.currentAnim = cleanName;
        Object.keys(window.EditorState.project).forEach(v => {
            if (!window.EditorState.project[v].animations[cleanName]) window.EditorState.project[v].animations[cleanName] = {};
        });
        if (window.EditorState.currentMode === 'ANIMATION' && typeof window.initTimelineUI === 'function') window.initTimelineUI();
    });

    // Переключение экранов: Дизайн / Анимация
    function switchMode(targetMode) {
        const view = window.EditorState.currentView;
        if (targetMode === 'ANIMATION') {
            window.EditorState.currentMode = 'ANIMATION';
            ui.btnDesign.classList.remove('active'); ui.btnAnimation.classList.add('active');
            ui.viewDesign.style.display = 'none'; ui.viewAnimation.style.display = 'flex';
            ui.animSelectContainer.style.display = 'flex';
            renderHierarchyTreeUI();
            if (typeof window.initTimelineUI === 'function') window.initTimelineUI();
            if (typeof window.drawScene === 'function') window.drawScene();
        } else {
            window.EditorState.currentMode = 'DESIGN';
            ui.btnAnimation.classList.remove('active'); ui.btnDesign.classList.add('active');
            ui.viewAnimation.style.display = 'none'; ui.viewDesign.style.display = 'flex';
            ui.animSelectContainer.style.display = 'none';
            updateDesignAssetListUI(); window.syncDesignPivotUI();
        }
    }
    ui.btnDesign.addEventListener('click', () => switchMode('DESIGN'));
    ui.btnAnimation.addEventListener('click', () => switchMode('ANIMATION'));

    // ОБРАБОТЧИК ЗАГРУЗКИ ЕДИНОЙ КАРТИНКИ Т-ПОЗЫ ДЛЯ РАКУРСА
    if (ui.fileInput) {
        ui.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0]; // Берем один загруженный файл
            const view = window.EditorState.currentView;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    window.EditorState.project[view].originalImg = img;
                    window.EditorState.currentTool = 'LASSO'; // Сразу активируем лассо для нарезки
                    updateToolButtonsUI();
                    updateDesignAssetListUI();
                    window.syncDesignPivotUI();
                    alert(`Т-поза для ракурса [${view.toUpperCase()}] загружена! Выберите кость слева и обведите её с помощью Лассо.`);
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // Slot Manager: Добавление нового кастомного слота под родителя
    ui.addSlotBtn.addEventListener('click', () => {
        if (!ui.newSlotNameInp.value) return alert("Введите имя слота!");
        const rawName = ui.newSlotNameInp.value.trim().toLowerCase();
        const cleanSlotName = rawName.replace(/[^a-z0-9_]/g, '');
        if (!cleanSlotName) return alert("Неверное имя слота!");
        if (window.EditorState.skeletonRenderOrder.indexOf(cleanSlotName) !== -1) return alert("Такой слот уже существует!");

        const parentBone = ui.newSlotParentSelect.value;
        const parentIdx = window.EditorState.skeletonRenderOrder.indexOf(parentBone);
        if (parentIdx !== -1) {
            window.EditorState.skeletonRenderOrder.splice(parentIdx + 1, 0, cleanSlotName);
        } else {
            window.EditorState.skeletonRenderOrder.push(cleanSlotName);
        }

        if (!window.SkeletonHierarchy.tree[parentBone]) window.SkeletonHierarchy.tree[parentBone] = [];
        window.SkeletonHierarchy.tree[parentBone].push(cleanSlotName);

        Object.keys(window.EditorState.project).forEach(vName => {
            const canvasDummy = document.createElement('canvas');
            canvasDummy.width = 1; canvasDummy.height = 1;
            window.EditorState.project[vName].assets[cleanSlotName] = {
                name: cleanSlotName, pivotX: 0.5, pivotY: 0.5, img: canvasDummy
            };
        });

        const opt = document.createElement('option');
        opt.value = cleanSlotName; opt.innerText = cleanSlotName.toUpperCase();
        ui.newSlotParentSelect.appendChild(opt);
        ui.newSlotNameInp.value = '';
        updateDesignAssetListUI();
    });

    // Slot Manager: Каскадное удаление слота отовсюду
    ui.deleteSlotBtn.addEventListener('click', () => {
        const activeId = window.EditorState.activeAssetId;
        if (!activeId) return alert("Сначала выберите слот из списка!");
        if (activeId === 'torso') return alert("Нельзя удалить корневой слот TORSO!");
        if (!confirm(`Полностью удалить слот "${activeId.toUpperCase()}" из всех ракурсов?`)) return;

        const orderIdx = window.EditorState.skeletonRenderOrder.indexOf(activeId);
        if (orderIdx !== -1) window.EditorState.skeletonRenderOrder.splice(orderIdx, 1);

        const parentBone = window.SkeletonHierarchy.getParentName(activeId);
        if (parentBone && window.SkeletonHierarchy.tree[parentBone]) {
            const childIdx = window.SkeletonHierarchy.tree[parentBone].indexOf(activeId);
            if (childIdx !== -1) window.SkeletonHierarchy.tree[parentBone].splice(childIdx, 1);
        }

        Object.keys(window.EditorState.project).forEach(vName => {
            if (window.EditorState.project[vName].assets[activeId]) delete window.EditorState.project[vName].assets[activeId];
            Object.keys(window.EditorState.project[vName].animations).forEach(animName => {
                const timeline = window.EditorState.project[vName].animations[animName];
                Object.keys(timeline).forEach(frame => {
                    if (timeline[frame] && timeline[frame][activeId]) delete timeline[frame][activeId];
                });
            });
        });

        const optToRemove = Array.from(ui.newSlotParentSelect.options).find(opt => opt.value === activeId);
        if (optToRemove) optToRemove.remove();
        window.EditorState.activeAssetId = null;
        updateDesignAssetListUI(); window.syncDesignPivotUI();
    });

    window.refreshHierarchyUI = renderHierarchyTreeUI;
    window.refreshDesignAssetListUI = updateDesignAssetListUI;

    // Запуск базовой инициализации
    updateDesignAssetListUI();
    createDesignToolbar();
    initDesignCanvasEvents();
    window.syncDesignPivotUI();

    setTimeout(() => {
        if (typeof window.initTimelineUI === 'function') window.initTimelineUI();
    }, 100);
});




window.exportToPixiJS = function() {
    const view = window.EditorState.currentView;
    const assets = window.EditorState.project[view].assets;
    const order = window.EditorState.skeletonRenderOrder;

    // 1. Сначала найдем реальные (непрозрачные) границы для каждой кости
    const boneBounds = {};
    const validBones = [];

    order.forEach(boneName => {
        const asset = assets[boneName];
        if (!asset || !asset.img || asset.img.width <= 1) return;

        const canvas = asset.img;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
        let hasPixels = false;

        // Сканируем альфа-канал, чтобы найти границы непрозрачных пикселей
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 5) { // если пиксель не прозрачный
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                    hasPixels = true;
                }
            }
        }

        if (hasPixels) {
            validBones.push(boneName);
            boneBounds[boneName] = {
                x: minX, y: minY,
                w: (maxX - minX) + 1,
                h: (maxY - minY) + 1
            };
        }
    });

    if (validBones.length === 0) return alert("Нет вырезанных костей для экспорта!");

    // 2. Упаковываем детали в Спрайтшит (простой алгоритм в ряд/сетку)
    // Вычисляем общую площадь, чтобы подобрать адекватный размер атласа
    let totalWidth = 0;
    let maxRowHeight = 0;
    validBones.forEach(name => {
        totalWidth += boneBounds[name].w + 4; // 4px отступ
        if (boneBounds[name].h > maxRowHeight) maxRowHeight = boneBounds[name].h;
    });

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = totalWidth;
    atlasCanvas.height = maxRowHeight + 4;
    const atlasCtx = atlasCanvas.getContext('2d');

    const pixiFrames = {};
    let currentX = 2;

    validBones.forEach(name => {
        const asset = assets[name];
        const bounds = boneBounds[name];

        // Копируем только непрозрачный кусок детали на атлас
        atlasCtx.drawImage(
            asset.img,
            bounds.x, bounds.y, bounds.w, bounds.h, // Откуда (из кости)
            currentX, 2, bounds.w, bounds.h        // Куда (в атлас)
        );

        // Расчет нового Pivot Point для PixiJS!
        // В вашей системе пивот задан в процентах от ВСЕГО экрана Т-позы.
        // Переводим его в пиксели Т-позы, смотрим смещение относительно нового Bounding Box детали.
        const originalPivotX_pixels = asset.pivotX * asset.img.width;
        const originalPivotY_pixels = asset.pivotY * asset.img.height;

        const pixiPivotX = (originalPivotX_pixels - bounds.x) / bounds.w;
        const pixiPivotY = (originalPivotY_pixels - bounds.y) / bounds.h;

        // Формируем структуру фрейма по стандарту PixiJS Spritesheet
        pixiFrames[name] = {
            frame: { x: currentX, y: 2, w: bounds.w, h: bounds.h },
            rotated: false,
            trimmed: true,
            spriteSourceSize: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
            sourceSize: { w: asset.img.width, h: asset.img.height },
            anchor: { x: pixiPivotX, y: pixiPivotY } // То, что Pixi подставит автоматически
        };

        currentX += bounds.w + 4;
    });

    // 3. Подготавливаем структуру анимаций (структура дерева и ключевые кадры)
    const pixiData = {
        meta: {
            app: "PaperDoll Skeleton Editor",
            version: "2.0",
            image: `spritesheet_${view}.png`,
            format: "RGBA8888",
            size: { w: atlasCanvas.width, h: atlasCanvas.height },
            scale: "1"
        },
        frames: pixiFrames,
        hierarchy: window.SkeletonHierarchy.tree, // Связи Родословной костей
        renderOrder: order.filter(name => validBones.includes(name)),
        animations: window.EditorState.project[view].animations // Все ключевые кадры интерполяции
    };

    // 4. Скачивание файлов пользователю
    // Скачиваем PNG Атлас
    const imageLink = document.createElement('a');
    imageLink.download = `spritesheet_${view}.png`;
    imageLink.href = atlasCanvas.toDataURL('image/png');
    imageLink.click();

    // Скачиваем JSON манифест
    const jsonBlob = new Blob([JSON.stringify(pixiData, null, 2)], { type: "application/json" });
    const jsonLink = document.createElement('a');
    jsonLink.download = `skeleton_${view}.json`;
    jsonLink.href = URL.createObjectURL(jsonBlob);
    jsonLink.click();

    alert("Экспорт для PixiJS успешно завершен!\nСкачаны: JSON конфигурация и PNG Атлас.");
};


window.exportBakeToSpritesheet = function() {
    const project = window.EditorState.project;
    const views = Object.keys(project); // front, back, left, right
    const animations = Object.keys(project['front'].animations); // idle, walk, etc.
    const totalFrames = window.EditorState.totalFrames;

    // Временный холст для рендеринга скелета в один кадр
    const renderCanvas = document.createElement('canvas');
    // Задай размер, в который гарантированно влезет твой персонаж целиком (например, 256x256)
    const frameW = 256;
    const frameH = 256;
    renderCanvas.width = frameW;
    renderCanvas.height = frameH;
    const rCtx = renderCanvas.getContext('2d');

    // Собираем все кадры, которые нужно запечь
    const framesToBake = [];
    views.forEach(view => {
        animations.forEach(animName => {
            for (let f = 0; f < totalFrames; f++) {
                framesToBake.push({ view, animName, frameNum: f });
            }
        });
    });

    // Вычисляем размер итогового Спрайтшита (сетка кадров)
    const cols = Math.ceil(Math.sqrt(framesToBake.length));
    const rows = Math.ceil(framesToBake.length / cols);

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = cols * frameW;
    atlasCanvas.height = rows * frameH;
    const atlasCtx = atlasCanvas.getContext('2d');

    const manifestFrames = {};
    const gameAnimationsStructure = {}; // Структура путей для твоего игрового движка

    // Поконтурно запекаем каждый кадр
    framesToBake.forEach((task, index) => {
        const { view, animName, frameNum } = task;

        rCtx.clearRect(0, 0, frameW, frameH);

        // ВЫЗЫВАЕМ ТВОЙ СТАРЫЙ ДВИЖОК МАТРИЦ
        // Смещаем контекст в центр, чтобы персонаж не обрезался по краям
        rCtx.save();
        rCtx.translate(frameW / 2, frameH * 0.8); // Точка опоры ног на землю

        // Здесь вызывается твоя оригинальная функция рекурсивного рендеринга из canvas_render.js.
        // Передаем ей временный контекст, ракурс, анимацию и номер кадра.
        if (typeof window.drawSkeletonToContext === 'function') {
            window.drawSkeletonToContext(rCtx, view, animName, frameNum);
        } else {
            // Если у тебя drawScene жестко привязан к глобальному холсту,
            // перед экспортом временно подмени контекст или вызови аналог рендера.
        }
        rCtx.restore();

        // Копируем отрендеренный кадр на общий Спрайтшит
        const atlasX = (index % cols) * frameW;
        const atlasY = Math.floor(index / cols) * frameH;
        atlasCtx.drawImage(renderCanvas, atlasX, atlasY);

        // Создаем виртуальный строковый путь (ID кадра в кэше PixiJS), например: "hero_front_walk_frame0.png"
        const virtualPath = `baked_${view}_${animName}_f${frameNum}.png`;

        // Записываем координаты фрейма в стандартном формате PixiJS
        manifestFrames[virtualPath] = {
            frame: { x: atlasX, y: atlasY, w: frameW, h: frameH },
            sourceSize: { w: frameW, h: frameH },
            spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH }
        };

        // Наполняем структуру анимаций для твоего массива unit.animations
        if (!gameAnimationsStructure[animName]) gameAnimationsStructure[animName] = {};
        if (!gameAnimationsStructure[animName][view]) gameAnimationsStructure[animName][view] = [];

        gameAnimationsStructure[animName][view].push(virtualPath);
    });

    // Итоговый JSON для PixiJS v8 Spritesheet + мета-данные для твоей логики
    const resultJson = {
        meta: {
            app: "Skeleton Baker",
            image: "baked_character_atlas.png",
            format: "RGBA8888",
            size: { w: atlasCanvas.width, h: atlasCanvas.height },
            scale: "1"
        },
        frames: manifestFrames,
        gameAnimations: gameAnimationsStructure // Готовые массивы строк-ссылок для юнита!
    };

    // Скачиваем PNG Спрайтшит
    const imgLink = document.createElement('a');
    imgLink.download = "baked_character_atlas.png";
    imgLink.href = atlasCanvas.toDataURL('image/png');
    imgLink.click();

    // Скачиваем JSON Манифест
    const jsonBlob = new Blob([JSON.stringify(resultJson, null, 2)], { type: "application/json" });
    const jsonLink = document.createElement('a');
    jsonLink.download = "baked_character_manifest.json";
    jsonLink.href = URL.createObjectURL(jsonBlob);
    jsonLink.click();

    alert("Запекание завершено! Сгенерирован покадровый текстурный атлас со всеми ракурсами и анимациями.");
};

// if (unit.spriteSheet && unit.spriteSheet.isSkeleton) {
//     isSkeletonUnit = true;
//
//     // Определяем текущие параметры для скелетного плеера внутри Pixi
//     const currentView = unit.directionV || unit.direction || 'front';
//     const currentAction = unit.action || 'idle';
//     const currentFrame = unit.currentFrameIndex;
//
//     // Твой внутренний метод импортированного скелета в Pixi.
//     // Передаем ракурс, анимацию и кадр — Pixi-плеер сам внутри контейнера
//     // подвигает и покрутит кости, которые мы нарезали лассо!
//     if (typeof unit.skeletonPlayer?.updateFrame === 'function') {
//         unit.skeletonPlayer.updateFrame(currentFrame, currentAction, currentView);
//     }
// }
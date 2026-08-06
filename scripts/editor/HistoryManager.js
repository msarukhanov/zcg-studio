export class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;

        this.initDOMReferences();
        this.bindEvents();
    }

    initDOMReferences() {
        this.btnUndo = document.getElementById('btn-undo');
        this.btnRedo = document.getElementById('btn-redo');
    }

    bindEvents() {
        if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
        if (this.btnRedo) this.btnRedo.addEventListener('click', () => this.redo());
        this.updateButtonsState();
    }

    /**
     * Сохраняет снимок состояния тайлов ПЕРЕД их изменением или созданием
     * @param {Array<object>} tilesArray - Массив HexTile до модификации
     * @param {boolean} isNewAction - Флаг, если эти тайлы создаются с нуля в пустоте
     */
    saveStep(tilesArray, isNewAction = false) {
        const snapshot = tilesArray.map(tile => ({
            q: tile.q,
            r: tile.r,
            isNew: isNewAction, // Запоминаем, был ли тайл создан в пустоте
            // Копируем свойства
            type: tile.type,
            height: tile.height,
            imageIndex: tile.imageIndex,
            region: tile.region,
            province: tile.province,
            faction: tile.faction
        }));

        this.undoStack.push(snapshot);
        this.redoStack = []; // Сброс redo при новом действии

        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        this.updateButtonsState();
    }

    undo() {
        if (this.undoStack.length === 0) return;

        const previousState = this.undoStack.pop();

        // Создаем снимок текущего состояния для Redo перед откатом
        const currentState = previousState.map(savedTile => {
            const liveTile = window.mapDataRef.getTile(savedTile.q, savedTile.r);
            return {
                q: savedTile.q,
                r: savedTile.r,
                isNew: savedTile.isNew,
                type: liveTile ? liveTile.type : 'grass',
                height: liveTile ? liveTile.height : 1,
                imageIndex: liveTile ? liveTile.imageIndex : 0,
                region: liveTile ? liveTile.region : null,
                province: liveTile ? liveTile.province : null,
                faction: liveTile ? liveTile.faction : null
            };
        });
        this.redoStack.push(currentState);

        // Применяем отмену
        previousState.forEach(savedTile => {
            if (savedTile.isNew) {
                // Если тайл был создан в пустоте — Undo должно его УДАЛИТЬ из базы данных
                window.mapDataRef.tiles.delete(`${savedTile.q},${savedTile.r}`);
            } else {
                // Если тайл существовал — возвращаем старые свойства
                const liveTile = window.mapDataRef.getTile(savedTile.q, savedTile.r);
                if (liveTile) this.applyTileProps(liveTile, savedTile);
            }
        });

        this.finalizeStep();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const nextState = this.redoStack.pop();

        const currentState = nextState.map(savedTile => {
            const liveTile = window.mapDataRef.getTile(savedTile.q, savedTile.r);
            return {
                q: savedTile.q,
                r: savedTile.r,
                isNew: savedTile.isNew,
                type: liveTile ? liveTile.type : 'grass',
                height: liveTile ? liveTile.height : 1,
                imageIndex: liveTile ? liveTile.imageIndex : 0,
                region: liveTile ? liveTile.region : null,
                province: liveTile ? liveTile.province : null,
                faction: liveTile ? liveTile.faction : null,
            };
        });
        this.undoStack.push(currentState);

        // Восстанавливаем действие
        nextState.forEach(savedTile => {
            let liveTile = window.mapDataRef.getTile(savedTile.q, savedTile.r);

            if (savedTile.isNew && !liveTile) {
                // Если действие создавало тайл — Redo обязано пересоздать его в базе данных
                const HexTileClass = window.mapDataRef.tiles.values().next().value.constructor;
                liveTile = new HexTileClass(savedTile.q, savedTile.r, savedTile.q, savedTile.r);
                window.mapDataRef.tiles.set(`${savedTile.q},${savedTile.r}`, liveTile);
            }

            if (liveTile) this.applyTileProps(liveTile, savedTile);
        });

        this.finalizeStep();
    }

    applyTileProps(liveTile, savedTile) {
        liveTile.type = savedTile.type;
        liveTile.height = savedTile.height;
        liveTile.imageIndex = savedTile.imageIndex;
        liveTile.region = savedTile.region;
        liveTile.province = savedTile.province;
        liveTile.faction = savedTile.faction;
    }

    finalizeStep() {
        this.updateButtonsState();
        AppState.engine.renderMap();

        // Синхронизируем инспектор, если текущий выделенный тайл изменился
        if (window.clickManagerRef && window.clickManagerRef.selectedTile) {
            const tile = window.clickManagerRef.selectedTile;
            // Проверяем, существует ли он ещё на карте после Undo
            if (window.mapDataRef.getTile(tile.q, tile.r)) {
                window.clickManagerRef.executeSelectTool(tile);
            } else {
                window.clickManagerRef.deselectAll();
            }
        }
    }

    updateButtonsState() {
        if (this.btnUndo) {
            this.btnUndo.disabled = this.undoStack.length === 0;
            this.btnUndo.style.opacity = this.undoStack.length === 0 ? '0.4' : '1';
        }
        if (this.btnRedo) {
            this.btnRedo.disabled = this.redoStack.length === 0;
            this.btnRedo.style.opacity = this.redoStack.length === 0 ? '0.4' : '1';
        }
    }
}

import { WorldObject } from '../shared/MapData.js';

import { AppState, getTileFromState, getActiveMap } from '../shared/GameState.js';

function createSelectGroup(labelText, items, selectedValue, onChange) {
    const group = document.createElement('div');
    group.className = 'options-group';

    const label = document.createElement('label');
    label.innerText = labelText;
    group.appendChild(label);

    const select = document.createElement('select');

    // Дефолтная пустая опция
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.innerText = '-';
    if (!selectedValue) defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    // Заполнение элементами (работает с массивами объектов)
    (items || []).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = item.name;
        if (item.id === selectedValue) opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener('change', onChange);
    group.appendChild(select);

    return group;
}

/**
 * Базовый класс для всех инспекторов
 */
class BaseInspector {
    constructor(clickManager) {
        this.clickManager = clickManager;
        this.container = document.getElementById('inspector-content');
    }

    renderEmpty() {
        this.container.innerHTML = `<div class="empty-notice">No selection. Use Select tool to view properties.</div>`;
    }
}

/**
 * 1. ИНСПЕКТОР ДЛЯ РЕЖИМА TERRAIN
 */
export class TerrainInspector extends BaseInspector {
    render(tile) {
        this.container.innerHTML = `
            <div class="prop-group">
                <label>Coordinates (Q, R):</label>
                <span>Q: ${tile.q}, R: ${tile.r}</span>
            </div>
            <div class="prop-group">
                <label>Terrain Type:</label>
                <select id="prop-region" style="width: 100%;">
                    <option value="" ${!tile.tpe ? 'selected' : ''}>-</option>
                    ${Object.keys(AppState.ConfigTerrain || {}).map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <!--<select id="prop-type">-->
                    <!--<option value="grass" ${tile.type === 'grass' ? 'selected' : ''}>Grass</option>-->
                    <!--<option value="water" ${tile.type === 'water' ? 'selected' : ''}>Water</option>-->
                    <!--<option value="mountain" ${tile.type === 'mountain' ? 'selected' : ''}>Mountain</option>-->
                <!--</select>-->
            </div>
             <div class="prop-group">
                <label>Height (Z-Offset):</label>
                <input type="number" id="prop-height" value="${tile.height}" min="1" max="10" step="0.5">
            </div>
            <div class="prop-group">
                <label>Region:</label>
                <select id="prop-region" style="width: 100%;">
                    <option value="" ${!tile.region ? 'selected' : ''}>-</option>
                    ${Object.keys(AppState.regions || {}).map(t => `<option value="${t}" ${tile.region === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <!--<input type="text" id="prop-region" value="${tile.region || ''}">-->
            </div>
            <div class="prop-group">
                <label>Province:</label>
                 <select id="prop-province" style="width: 100%;">
                    <option value="" ${!tile.province ? 'selected' : ''}>-</option>
                    ${Object.keys(AppState.provinces || {}).map(t => `<option value="${t}" ${tile.province === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <!--<input type="text" id="prop-province" value="${tile.province || ''}">-->
            </div>
            <div class="prop-group">
                <label>Faction (Owner):</label>
                 <select id="prop-faction" style="width: 100%;">
                    <option value="" ${!tile.faction ? 'selected' : ''}>-</option>
                    ${Object.keys(AppState.factions || {}).map(t => `<option value="${t}" ${tile.faction === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <!--<input type="text" id="prop-faction" value="${tile.faction || ''}">-->
            </div>
        `;



        this.bindEvents(tile);
    }

    bindEvents(tile) {
        const checkTile = (field, val) => {
            console.log(field);
            if(field === 'faction') {
                const unitsOnThisTile = [];
                Object.keys(AppState.entities).forEach(id => {
                    const char = AppState.entities[id];
                    if (char.mapPosition.q === tile.q && char.mapPosition.r === tile.r) {
                        unitsOnThisTile.push(char);
                    }
                });

                if (unitsOnThisTile.length > 0) {
                    unitsOnThisTile.forEach((unit, index) => {
                        console.log(unit);
                        if(unit.type === 'city') {
                            AppState.engine.factionManager.claimObjectTerritory(unit, tile, val);
                        }
                    })
                }
            }
        };

        const setupInput = (id, field, isNumeric = false) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', (e) => {
                if (this.clickManager.historyManager) this.clickManager.historyManager.saveStep([tile]);
                let val = e.target.value;
                if (isNumeric) val = parseFloat(val) || 1;
                tile[field] = val;
                if (field === 'type') tile.imageIndex = 0;
                // this.clickManager.redrawMap();
                checkTile(field, val);
                this.render(tile);
                window.renderMap();
            });
        };

        setupInput('prop-type', 'type');
        setupInput('prop-region', 'region');
        setupInput('prop-province', 'province');
        setupInput('prop-faction', 'faction');
        setupInput('prop-height', 'height', true);
    }
}

/**
 * 2. ИНСПЕКТОР ДЛЯ РЕЖИМА OBJECTS (ГОРОДА / ПОСЕЛЕНИЯ)
 */
export class ObjectsInspector {
    constructor(clickManager) {
        this.clickManager = clickManager;
        this.container = document.getElementById('inspector-content');
    }

    render(tile) {
        const obj = Object.values(AppState.objects||{}).find(o=>(o.mapId===AppState.map.mapId&&o.mapPosition&&o.mapPosition.q===tile.q&&o.mapPosition.r===tile.r));

        // Если объект на гексе отсутствует, даем меню постройки/размещения
        if (!obj) {
            this.container.innerHTML = `
                <div class="prop-group">
                    <span class="empty-notice">Empty Hex Block (No object here)</span>
                </div>
                <div class="prop-group">
                    <label>Place Object:</label>
                    <select id="spawn-obj-type" style="width: 100%;">
                        ${Object.keys(AppState.ConfigObject).map(t => `<option value="${type => t}">${AppState.ConfigObject[t].name}</option>`).join('')}
                    </select>
                </div>
                <button id="btn-create-object" class="tool-btn" style="width:100%; height:auto; padding:8px; margin-top:10px; background-color: var(--accent-blue);">Spawn Object</button>
            `;

            document.getElementById('btn-create-object').addEventListener('click', () => {
                const selectEl = document.getElementById('spawn-obj-type');
                const selectedType = selectEl.value;
                const config = AppState.ConfigObject[selectedType];

                if (this.clickManager.historyManager) this.historyManager.saveStep([tile]);

                // Генерируем объект на лету с уникальным ID и дефолтной вложенной картой из конфига
                const uniqueId = `obj_${Date.now()}`;
                const defaultInnerMap = config.hasInnerMap ? config.defaultInnerMapId : null;

                tile.worldObject = new WorldObject(uniqueId, selectedType, config.name, defaultInnerMap);

                this.render(tile); // Мгновенно перерисовываем свойства
                this.clickManager.redrawMap(); // Обновляем графику PixiJS
            });
            return;
        }

        // ЕСЛИ ОБЪЕКТ СУЩЕСТВУЕТ — ВЫВОДИМ ЕГО ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ
        // const obj = tile.worldObject;
        const config = AppState.ConfigObject[obj.type] || { actions: [] };

        this.container.innerHTML = `
            <div class="prop-group">
                <label>Object Name:</label>
                <input type="text" id="obj-custom-name" value="${obj.name}">
            </div>
            <div class="prop-group">
                <label>Classification:</label>
                <span style="color: var(--accent-pink); font-weight:bold;">${obj.type}</span>
            </div>
            
        `;


        if(obj.mapTo) {
            this.container.innerHTML += `
            <div class="sidebar-section-title" style="margin-top:20px; font-size:12px;">Map Redirection</div>
            <div class="prop-group">
                <label>Map :</label>
                 <select id="obj-map-to-id" style="width: 100%;">
                    ${Object.keys(AppState.maps).map(t => `<option value="${t}" ${obj.mapTo.mapId === t ? 'selected' : ''}>${t}</option>`).join('')}
                 </select>
            </div>
            <div class="prop-group">
                <label>Q:</label>
                <input type="text" id="obj-map-to-q" value="${obj.mapTo.q}">
            </div>
             <div class="prop-group">
                <label>R:</label>
                <input type="text" id="obj-map-to-r" value="${obj.mapTo.r}">
            </div>
            `
        }



    // <div class="prop-group">
    //         <label>Inner Map Link:</label>
    //     <span style="color: ${obj.innerMapId ? 'var(--neon-green)' : 'var(--text-muted)'}">
    //         ${obj.innerMapId ? `Linked: ${obj.innerMapId}` : 'No multi-level mapping'}
    //             </span>
    //         </div>
    //         <div class="prop-group">
    //             <label>Garrison Units inside:</label>
    //             <span>Total: ${obj.units?obj.units.length||0}</span>
    //         </div>
    //
    //         <!-- ДИНАМИЧЕСКИЙ БЛОК ДЕЙСТВИЙ ОБЪЕКТА -->
    //         <div class="sidebar-section-title" style="margin-top:20px; font-size:12px;">Available Interactions</div>
    //         <div id="object-actions-container" style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
    //             ${config.actions.map(action => `
    //                 <button class="tool-btn action-trigger-btn" data-action="${action}" style="width:100%; height:auto; padding:6px; font-size:11px; text-align:left; background-color: var(--bg-card); border-color: var(--border-color)">
    //                     ⚡ ${action}
    //                 </button>
    //             `).join('')}
    //         </div>

        this.bindEvents(tile, obj);
    }

    bindEvents(tile, obj) {
        // Двусторонняя синхронизация кастомного имени
        const nameInput = document.getElementById('obj-custom-name');
        if (nameInput) {
            nameInput.addEventListener('change', (e) => {
                if (this.clickManager.historyManager) this.historyManager.saveStep([tile]);
                obj.name = e.target.value;
            });
        }

        const mapToIdInput = document.getElementById('obj-map-to-id');
        if (mapToIdInput) {
            mapToIdInput.addEventListener('change', (e) => {
                console.log(e.target.value)
                obj.mapTo.mapId = e.target.value;
                // if (this.clickManager.historyManager) this.historyManager.saveStep([obj]);
            });
        }

        const mapToQInput = document.getElementById('obj-map-to-q');
        if (mapToQInput) {
            mapToQInput.addEventListener('change', (e) => {
                obj.mapTo.q = Number(e.target.value);
                // if (this.clickManager.historyManager) this.historyManager.saveStep([obj]);
            });
        }

        const mapToRInput = document.getElementById('obj-map-to-r');
        if (mapToRInput) {
            mapToRInput.addEventListener('change', (e) => {
                obj.mapTo.r = Number(e.target.value);
                // if (this.clickManager.historyManager) this.historyManager.saveStep([objobj]);
            });
        }

        // Слушатель для кнопок динамических интерактивных действий
        const actionButtons = document.querySelectorAll('.action-trigger-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const actionName = btn.getAttribute('data-action');

                // ЛОГИКА ВХОДА ВО ВНУТРЕННЮЮ КАРТУ: Если действие связано с Enter и у объекта прописан innerMapId
                if (actionName.includes('Enter') && obj.innerMapId) {
                    alert(`🔄 Прогрузка вложенного уровня! Переключаемся на внутреннюю карту гексов: [${obj.innerMapId}]`);
                    // Сюда мы в будущем повесим команду: window.loadNewMapLevel(obj.innerMapId)
                } else {
                    alert(`Действие [${actionName}] успешно вызвано для объекта "${obj.name}"!`);
                }
            });
        });
    }
}

/**
 * 3. ИНСПЕКТОР ДЛЯ РЕЖИМА CHARACTERS (ЮНИТЫ / АРМИИ)
 */
/**
 * 3. ИНСПЕКТОР ДЛЯ РЕЖИМА CHARACTERS (ЮНИТЫ / АРМИИ)
 */
export class CharactersInspector extends BaseInspector {
    render(tile) {
        // Берем первого юнита в клетке (Рафаэля)
        const unit = tile.units[0];

        if (!unit) {
            this.container.innerHTML = `<div class="empty-notice">No character on this tile.</div>`;
            return;
        }

        this.container.innerHTML = `
            <div class="prop-group">
                <label>Character Name:</label>
                <span>${unit.name}</span>
            </div>
            <div class="prop-group">
                <label>Faction:</label>
                <span style="color: var(--neon-green)">${unit.faction.toUpperCase()}</span>
            </div>
            <div class="prop-group">
                <label>Movement Points (MP):</label>
                <span id="ins-unit-mp" style="color: var(--accent-pink)">${unit.currentMovePoints} / ${unit.maxMovePoints}</span>
            </div>
            <div class="prop-group">
                <label>Vision Range:</label>
                <span>${unit.visionRange} Hexes</span>
            </div>
        `;
    }
}


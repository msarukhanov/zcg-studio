export const DiplomaticPacts = {
    WAR: 'WAR',
    NONE: 'NONE',
    NON_AGGRESSION: 'NON_AGGRESSION',
    ALLIANCE: 'ALLIANCE',
    SUZERAIN: 'SUZERAIN',
    VASSAL: 'VASSAL'
};

const BASE_LANGUAGES = {
    "en": {},
    "fr": {},
    "de": {},
    "es": {},
    "ru": {},

    "kr": {},
    "jp": {},
    "ch": {},
};
const BASE_STATS = {
    "hp": {name_loc_key: "hp", value: 1},
    "armor": {name_loc_key: "armor", value: 1},
    "atk": {name_loc_key: "atk", value: 1},
    "atkRange": {name_loc_key: "atkRange", value: 1},
    "atkRangeType": {name_loc_key: "atkRangeType", value: 'melee'},
    "crit": {name_loc_key: "crit", value: 1},
    "dodge": {name_loc_key: "dodge", value: 1},
    "accuracy": {name_loc_key: "accuracy", value: 1},
    "speed": {name_loc_key: "speed", value: 1},

    "crit_damage": {name_loc_key: "crit_damage", value: 150},
    "lifesteal": {name_loc_key: "lifesteal", value: 1},
    "dmg_reduction": {name_loc_key: "dmg_reduction", value: 0},
    "energy_gain_mod": {name_loc_key: "energy_gain_mod", value: 100},
};
const BASE_EFFECT_STATS = {
    "period": 0,
    "periodMax": 0,
    "is_dispelable": true,
    "icon": "",
    "stats": {},
    "action": {},
};
const BASE_INVENTORY_SLOTS = ["weapon", "armor", "boots", "ring"];

const HERO_PROTOTYPE = {
    title_loc: BASE_LANGUAGES,
    rarity: "",
    max_level: 100,
    icon: "", image: "", model: "",
    faction_id: "", class_id: "", element_id: "",
    category_ids: [], skills: [], extra_skills: [],
    base_stats: BASE_STATS, stats_growth: BASE_STATS, effects: [],
    skins: [], bonds: [],
    inventory_slots: BASE_INVENTORY_SLOTS, personal_item_id: "", extra_inventory_slots: []
};

const defaultCharacterProperties = {
    cachedReachableTiles: null,
    action: 'idle',
    currentMovementVisualPath: [],
    movementLerpTime: 0,
    visualX: 0,
    visualY: 0,
    direction: 'right',

    currentFrameIndex: 0,
    frameTimer: 0,
    frameDuration: 100,

    // Дефолтная заглушка анимаций на случай, если у спавнящегося кистью юнита нет кастомного конфига
    animations: {
        idle: { left: [], right: [] },
        move: { left: [], right: [] }
    }
}

export const AppState = {
    engine: {},

    editor: {
        currentTool: 'Select',
        currentTool: 'Select',
        selectedPaletteItem: 'grass',

        brushSize: 1,
        brushHeightTarget: 1,
    },


    config: {
        globalMode: 'Editor', // 'Editor' или 'Play'
        heightStep: 14,
        animationSpeed: {
            movePerHex: 1000,    // Время перехода фигурки с одного гекса на соседний (0.3 секунды)
            combatDuration: 500  // Задел на будущее (длительность боя)
        }
    },
};

// Хелперы для работы со стейтом без ручного перебора
export function getActiveMap() {
    return AppState.maps[AppState.map.mapId];
}

export function getTileFromState(q, r) {
    return getActiveMap().tiles.get(`${q},${r}`);
}

export function getPactBetween(factionA, factionB) {
    if (!factionA || !factionB) return DiplomaticPacts.NONE;
    if (!AppState.pacts[factionA] || !AppState.pacts[factionA][factionB]) return DiplomaticPacts.WAR;
    return AppState.pacts[factionA][factionB];
}

export function getTradeBetween(factionA, factionB) {
    if (!factionA || !factionB) return null;
    if (!AppState.pacts[factionA] || !AppState.pacts[factionA][factionB]) return null;
    return AppState.trade[factionA][factionB];
}

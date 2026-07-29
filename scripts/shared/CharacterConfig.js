export const DiplomaticPacts = {
    WAR: 'WAR',
    NONE: 'NONE',
    NON_AGGRESSION: 'NON_AGGRESSION',
    ALLIANCE: 'ALLIANCE'
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

    currentFrameIndex: 0,          // Номер текущего кадра из массива ассетов
    frameTimer: 0,                 // Внутренний таймер для смены кадров (в мс)
    frameDuration: 100,            // Сколько миллисекунд крутится один кадр (0.1 секунды)

    // Дефолтная заглушка анимаций на случай, если у спавнящегося кистью юнита нет кастомного конфига
    animations: {
        idle: { left: [], right: [] },
        move: { left: [], right: [] }
    }
}

export const CharacterConfig = {
    'rafael': {
        ...defaultCharacterProperties,
        id: 'rafael',
        name: 'Rafael',
        faction: 'lorencia',
        mapId: 'world_map',
        mapPosition: { q: 2, r: 2 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 4 },
        stats: { hp: 150,  maxHp: 200, energy: 90,  maxEnergy: 120, "atk": 15, "atkRange": 2, atkRangeType: 'range', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },

        projectile_id: 'wind_magical_projectile',

        icon: "./assets/images/heroes/avatars/rafaelAfterlife.webp",
        image: "./assets/images/heroes/fullheight/rafaelAfterlife.png",
        model: "",
        inventory: [],
        backpack: {
            "rusty_sword": 1,
            "knight_armor": 1
        },

        class_id: "dps",

        level: 2,
        classId: "mage",
        exp: 50,


        element_id: "thunder",
        category_ids: ["aoe"],

        // skills: [
        //     { skill_id: "queen_will", level: 1 },       // Пассивка
        //     { skill_id: "basic_strike", level: 1 },     // Ваша базовая атака
        //     { skill_id: "thunder_strike", level: 1 },   // Ультимейт (Оранжевая зона)
        //     { skill_id: "spider_shot", level: 1 },      // Точечный выстрел (Синий хит + фиолетовый DoT)
        //     { skill_id: "inner_light", level: 1 },      // Селф-каст на себя (Зеленый хил + золотой щит)
        //     { skill_id: "holy_blessing", level: 1 }     // Бафф на союзника (Золотой бафф)
        // ],

        skills: [
            { skill_id: "queen_will", level: 1 },       // Пассивка
            // { skill_id: "basic_strike", level: 1 },     // Ваша базовая атака
            // { skill_id: "thunder_strike", level: 1 },   // Ультимейт (Оранжевая зона)
            // { skill_id: "spider_shot", level: 1 },      // Точечный выстрел (Синий хит + фиолетовый DoT)
            // { skill_id: "inner_light", level: 1 },      // Селф-каст на себя (Зеленый хил + золотой щит)
            // { skill_id: "holy_blessing", level: 1 }     // Бафф на союзника (Золотой бафф)
        ],

        extra_skills: [],
        effects: [],

        bonds: [
            {
                target_hero_id: "adelina_dlys",
                bonus_stat_id: "atk",
                bonus_value: 5,
                desc_loc: {
                    ...BASE_LANGUAGES,
                    en: "Queen and her Archmage"
                }
            },
            {
                target_hero_id: "eleniel",
                bonus_stat_id: "atk",
                bonus_value: 15,
                desc_loc: {
                    ...BASE_LANGUAGES,
                    en: "Absolute Zero"
                }
            }
        ],


        inventory_slots: BASE_INVENTORY_SLOTS,
        personal_item_id: "zeus_staff",
        extra_inventory_slots: ["amulet"],

        animations: {
            idle: {
                left: [
                    'assets/animations/rafael/move/left_1.png',
                ],
                right: [
                    'assets/animations/rafael/move/right_1.png',
                ]
            },
            move: {
                left : [
                    'assets/animations/rafael/move/left_1.png',
                    'assets/animations/rafael/move/left_2.png',
                    'assets/animations/rafael/move/left_3.png',
                    'assets/animations/rafael/move/left_4.png',
                    'assets/animations/rafael/move/left_5.png'

                ],
                right : [
                    'assets/animations/rafael/move/right_1.png',
                    'assets/animations/rafael/move/right_2.png',
                    'assets/animations/rafael/move/right_3.png',
                    'assets/animations/rafael/move/right_4.png',
                    'assets/animations/rafael/move/right_5.png'
                ]
            }
        }
    },
    'erin': {
        ...defaultCharacterProperties,
        id: 'erin',
        name: 'Erin',
        faction: 'elvinar',
        mapId: 'world_map',
        mapPosition: { q: 9, r: 2 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 100,  maxHp: 100, energy: 50, "atk": 15, "atkRange": 2, atkRangeType: 'range', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        projectile_id: 'purple_magical_projectile',
        inventory: [],
        cachedReachableTiles: null,

        level: 2,
        classId: "scout",
        exp: 0,

        skills: [
            {skill_id: "build_elf_camp", level: 1  }
        ],

        icon: "./assets/images/heroes/avatars/erinFaidaien.webp",
        image: "./assets/images/heroes/fullheight/erinFaidaien.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/erinFaidaien.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/erinFaidaien.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/erinFaidaien.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/erinFaidaien.png',
                ]
            }
        }
    },
    'antonia': {
        ...defaultCharacterProperties,
        id: 'antonia',
        name: 'Antonia',
        faction: 'elvinar',
        mapId: 'world_map',
        mapPosition: { q: 6, r: 6 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 100,  maxHp: 100, energy: 50, "atk": 15, "atkRange": 4, atkRangeType: 'range', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        projectile_id: 'fire_magical_projectile',
        inventory: [],
        cachedReachableTiles: null,

        icon: "./assets/images/heroes/avatars/antonia.webp",
        image: "./assets/images/heroes/fullheight/antonia.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/antonia.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/antonia.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/antonia.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/antonia.png',
                ]
            }
        }
    },
    'selena': {
        ...defaultCharacterProperties,
        id: 'selena',
        name: 'Selena',
        faction: 'lorencia',
        mapId: 'world_map',
        mapPosition: { q: 12, r: 1 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 220,  maxHp: 220, energy: 10, "atk": 20, "atkRange": 2, atkRangeType: 'range', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        projectile_id: 'blood_magical_projectile',
        inventory: [],
        cachedReachableTiles: null,

        classId: "scout",
        exp: 0,

        icon: "./assets/images/heroes/avatars/selena.webp",
        image: "./assets/images/heroes/fullheight/selena.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/selena.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/selena.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/selena.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/selena.png',
                ]
            }
        }
    },

    'lizzie': {
        ...defaultCharacterProperties,
        id: 'lizzie',
        name: 'Lizzy',
        faction: 'lorencia',
        mapId: 'world_map',
        mapPosition: { q: 10, r: 4 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 120,  maxHp: 120, energy: 10, "atk": 20, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        inventory: [],
        cachedReachableTiles: null,

        icon: "./assets/images/heroes/avatars/lizzy.webp",
        image: "./assets/images/heroes/fullheight/lizzy.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/lizzy.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/lizzy.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/lizzy.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/lizzy.png',
                ]
            }
        }
    },

    'famke': {
        ...defaultCharacterProperties,
        id: 'famke',
        name: 'Famke',
        faction: '',
        mapId: 'world_map',
        mapPosition: {},
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 120,  maxHp: 120, energy: 10, "atk": 20, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        inventory: [],
        cachedReachableTiles: null,

        icon: "./assets/images/heroes/avatars/famke.webp",
        image: "./assets/images/heroes/fullheight/famke.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/famke.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/famke.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/famke.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/famke.png',
                ]
            }
        }
    },

    'floki': {
        ...defaultCharacterProperties,
        id: 'floki',
        name: 'Floki',
        faction: '',
        mapId: 'world_map',
        mapPosition: {},
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 120,  maxHp: 120, energy: 10, "atk": 20, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        inventory: [],
        cachedReachableTiles: null,

        goods: {
            "rusty_sword": 5,
            "knight_armor": 5
        },

        icon: "./assets/images/heroes/avatars/floki.webp",
        image: "./assets/images/heroes/fullheight/floki.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/floki.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/floki.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/floki.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/floki.png',
                ]
            }
        }
    },

    'olesya': {
        ...defaultCharacterProperties,
        id: 'olesya',
        name: 'Olesya',
        faction: '',
        mapId: 'world_map',
        mapPosition: {},
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 120,  maxHp: 120, energy: 10, "atk": 20, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        inventory: [],
        cachedReachableTiles: null,

        icon: "./assets/images/heroes/avatars/olesya.webp",
        image: "./assets/images/heroes/fullheight/olesya.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/olesya.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/olesya.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/olesya.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/olesya.png',
                ]
            }
        }
    },

    'ibragimsoresh': {
        ...defaultCharacterProperties,
        id: 'ibragimsoresh',
        name: 'ibragim soresh',
        faction: 'darkwood',
        mapId: 'world_map',
        mapPosition: { q: 16, r: 3 },
        mapHistory: [],
        movement: { current: 3, max: 3 },
        movementTerrains: ['grass', 'snow'],
        vision: { current: 3 },
        image: '',
        stats: { hp: 200,  maxHp: 200, energy: 0, "atk": 10, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
        inventory: [],
        cachedReachableTiles: null,

        level: 1,

        icon: "./assets/images/heroes/avatars/ibrahimsoresh.webp",
        image: "./assets/images/heroes/fullheight/ibrahimsoresh.png",

        animations: {
            idle: {
                left: [
                    'assets/images/heroes/fullheight/ibrahimsoresh.png',
                ],
                right: [
                    'assets/images/heroes/fullheight/ibrahimsoresh.png',
                ]
            },
            move: {
                left : [
                    'assets/images/heroes/fullheight/ibrahimsoresh.png',

                ],
                right : [
                    'assets/images/heroes/fullheight/ibrahimsoresh.png',
                ]
            }
        }
    }
};

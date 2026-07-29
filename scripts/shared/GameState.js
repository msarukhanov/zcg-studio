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

    currentFrameIndex: 0,          // Номер текущего кадра из массива ассетов
    frameTimer: 0,                 // Внутренний таймер для смены кадров (в мс)
    frameDuration: 100,            // Сколько миллисекунд крутится один кадр (0.1 секунды)

    // Дефолтная заглушка анимаций на случай, если у спавнящегося кистью юнита нет кастомного конфига
    animations: {
        idle: { left: [], right: [] },
        move: { left: [], right: [] }
    }
}

export const AppState = {

    sizes: {
        hex: 50,
        char:{
            width: 128*9/16,
            height: 128,
        },

    },

    engine: {
        app: null,
        hexMath: null,
        worldMapContainer: null,
        uiLayerContainer: null
    },

    camera: {
        currentZoom: 1.0,
        x: 0,
        y: 0
    },

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

    ConfigTerrain: {
        'ocean': {
            name: 'Ocean',
            images: [
                'assets/terrain/Ocean/Ocean1.png',
                'assets/terrain/Ocean/Ocean2.png',
                'assets/terrain/Ocean/Ocean3.png',
                'assets/terrain/Ocean/Ocean4.png',
                'assets/terrain/Ocean/Ocean5.png',
            ],
            fallbackColor: 0x1d4a7d, // Глубокий синий
            passable: false,
            movementCost: 3,
            blocksVisibility: false,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 },
        },
        'water': {
            name: 'Water',
            images: [
                'assets/terrain/Water/Water1.png',
                'assets/terrain/Water/Water2.png',
                'assets/terrain/Water/Water3.png',
                'assets/terrain/Water/Water4.png',
                'assets/terrain/Water/Water5.png',
            ],
            fallbackColor: 0x2980b9, // Светло-синий (реки/мелководье)
            passable: false,
            movementCost: 3,
            blocksVisibility: false,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 },
        },
        'grass': {
            name: 'Grass',
            images: [
                'assets/terrain/Grass/Grass1.png',
                'assets/terrain/Grass/Grass2.png',
                'assets/terrain/Grass/Grass3.png',
                'assets/terrain/Grass/Grass4.png',
                'assets/terrain/Grass/Grass5.png',
            ],
            fallbackColor: 0x2e5c1e, // Сочный зеленый
            passable: true,
            movementCost: 1,
            blocksVisibility: false,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 },
        },
        'snow': {
            name: 'Snow',
            images: [
                'assets/terrain/Snow/Snow1.png',
                'assets/terrain/Snow/Snow2.png',
                'assets/terrain/Snow/Snow3.png',
                'assets/terrain/Snow/Snow4.png',
                'assets/terrain/Snow/Snow5.png',
            ],
            fallbackColor: 0xeaeade, // ИСПРАВЛЕНО: Мягкий матово-белый (снег)
            passable: true,
            movementCost: 1,
            blocksVisibility: false,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 },
        },
        'ice': {
            name: 'Ice',
            images: [
                'assets/terrain/Ice/Ice1.png',
                'assets/terrain/Ice/Ice2.png',
                'assets/terrain/Ice/Ice3.png',
                'assets/terrain/Ice/Ice4.png',
                'assets/terrain/Ice/Ice5.png',
            ],
            fallbackColor: 0xa5d6a7, // ИСПРАВЛЕНО: Бледный мятно-голубой (лед)
            passable: false,
            movementCost: 1,
            blocksVisibility: false,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 },
        },
        'mountain': {
            name: 'Mountains',
            images: [
                'assets/terrain/Mountains/Mountains1.png',
                'assets/terrain/Mountains/Mountains2.png',
                'assets/terrain/Mountains/Mountains3.png',
                'assets/terrain/Mountains/Mountains4.png',
                'assets/terrain/Mountains/Mountains5.png',
            ],
            fallbackColor: 0x5a5a5a, // Темно-серый скалистый
            passable: false,
            movementCost: 99,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1.2, offsetY: -10 }
        },
        'snowTrees': {
            name: 'Snow Trees',
            images: [
                'assets/terrain/SnowLandTrees/SnowLandTrees1.png',
                'assets/terrain/SnowLandTrees/SnowLandTrees2.png',
                'assets/terrain/SnowLandTrees/SnowLandTrees3.png',
                'assets/terrain/SnowLandTrees/SnowLandTrees4.png',
                'assets/terrain/SnowLandTrees/SnowLandTrees5.png',
            ],
            fallbackColor: 0x7f8c8d, // ИСПРАВЛЕНО: Светло-серый (заснеженные горы)
            passable: false,
            movementCost: 99,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1.2, offsetY: -10 }
        },
        'snowMountains': {
            name: 'Snow Mountains',
            images: [
                'assets/terrain/SnowMount/SnowMount1.png',
                'assets/terrain/SnowMount/SnowMount2.png',
                'assets/terrain/SnowMount/SnowMount3.png',
                'assets/terrain/SnowMount/SnowMount4.png',
                'assets/terrain/SnowMount/SnowMount5.png',
            ],
            fallbackColor: 0x7f8c8d, // ИСПРАВЛЕНО: Светло-серый (заснеженные горы)
            passable: false,
            movementCost: 99,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1.2, offsetY: -10 }
        },
        'woods': {
            name: 'Woods',
            images: [
                'assets/terrain/Woods/Woods1.png',
                'assets/terrain/Woods/Woods2.png',
                'assets/terrain/Woods/Woods3.png',
                'assets/terrain/Woods/Woods4.png',
                'assets/terrain/Woods/Woods5.png',
            ],
            fallbackColor: 0x193d11, // Глубокий лесной зеленый
            passable: true,
            movementCost: 2,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 }
        },
        'stoneRoad': {
            name: 'Stone Road',
            images: [
                'assets/terrain/stoneRoad.png',
            ],
            fallbackColor: 0x193d11, // Глубокий лесной зеленый
            passable: true,
            movementCost: 0.5,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 }
        },
        'stoneWall': {
            name: 'Stone Wall',
            images: [
                'assets/terrain/stoneWall.jpg',
            ],
            fallbackColor: 0x193d11, // Глубокий лесной зеленый
            passable: false,
            movementCost: 99,
            blocksVisibility: true,
            visuals: { scaleX: 1, scaleY: 1, offsetY: 0 }
        }
    },
    ConfigObject: {
        'city': {
            type: "city",

            mapTo: { mapId: "", q: 1, r: 1 },

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/city.png",
            image: "./assets/images/objects/city.png",
            ar: 1,
            centered: true,

            stats: { hp: 2000, maxHp: 2000 },
            vision: { current: 3 },
            units: {},

            province: '',

            allowedProduction: ["elf_archer"],
            production: {gold:200},
            upgradeLevels: {
                2: {
                    name: "Lorencia city",
                    upgradeCost: { gold: 100, wood: 0, ore: 0 },
                    bonusHp: 1000,
                    allowedProduction: ["lorencia_guard", "lorencia_sailor"],
                    bonusProduction: {gold:200},
                }
            },
        },
        "mine": {
            type: "mine",
            name: "Mine",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/mine.png",
            image: "./assets/images/objects/mine.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },

            production: {ore:500},
            upgradeLevels: {
                2: {
                    name: "Lorencia port",
                    upgradeCost: { gold: 500},
                    bonusProduction: {gold:200},
                }
            }
        },
        "port": {
            type: "port",
            name: "Port",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/port.png",
            image: "./assets/images/objects/port.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },

            production: {gold:500},
            upgradeLevels: {
                2: {
                    name: "Lorencia port",
                    upgradeCost: { gold: 500},
                    bonusProduction: {gold:200},
                }
            }
        },
        "blacksmith": {
            type: "blacksmith",
            name: "Blacksmith",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/blacksmith.png",
            image: "./assets/images/objects/blacksmith.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },

            goods: {
                "rusty_sword": 1,
                "knight_armor": 1
            },

            production: {ore:500},
            upgradeLevels: {
                2: {
                    name: "Big Blacksmith",
                    goods: {
                        "rusty_sword": 5,
                        "knight_armor": 5
                    }
                }
            }
        },
        "castle": {
            type: "castle",
            name: "castle",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/castle.png",
            image: "./assets/images/objects/castle.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "jailhouse": {
            type: "jailhouse",
            name: "jailhouse",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/jailhouse.png",
            image: "./assets/images/objects/jailhouse.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "graveyard": {
            type: "graveyard",
            name: "graveyard",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/graveyard.png",
            image: "./assets/images/objects/graveyard.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "villageHouse": {
            type: "villageHouse",
            name: "villageHouse",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/villageHouse.png",
            image: "./assets/images/objects/villageHouse.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "inn": {
            type: "inn",
            name: "inn",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/inn.png",
            image: "./assets/images/objects/inn.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "sign": {
            type: "sign",
            name: "sign",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/sign.png",
            image: "./assets/images/objects/sign.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "stable": {
            type: "stable",
            name: "stable",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/stable.png",
            image: "./assets/images/objects/stable.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "church": {
            type: "temple",
            name: "temple",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/church.png",
            image: "./assets/images/objects/church.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "temple": {
            type: "temple",
            name: "temple",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/temple.png",
            image: "./assets/images/objects/temple.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "wagon": {
            type: "wagon",
            name: "wagon",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/wagon.png",
            image: "./assets/images/objects/wagon.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "warehouse": {
            type: "warehouse",
            name: "warehouse",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/warehouse.png",
            image: "./assets/images/objects/warehouse.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },
        "windmill": {
            type: "windmill",
            name: "windmill",

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/windmill.png",
            image: "./assets/images/objects/windmill.png",
            ar: 1,
            centered: true,
            vision: { current: 1 },
        },

        "ancient_ruins": {
            type: "dungeon_entrance",
            name: "Ancient Ruins",

            mapTo: { mapId: "", q: 1, r: 1 },

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/ruins.png",
            image: "./assets/images/objects/ruins.png",
            ar: 1,
            centered: true,
        },

        "ladder": {
            type: "dungeon_exit",
            name: "Ladder",

            mapTo: { mapId: "", q: 1, r: 1 },

            icon: "./assets/images/objects/ladder.png",
            image: "./assets/images/objects/ladder.png",
            ar: 1,
            centered: true,

            blocksMovement: false,
            blocksVisibility: false,
        },

        "portal": {
            type: "portal",
            name: "Portal",

            mapTo: { mapId: "", q: 1, r: 1 },

            icon: "./assets/images/objects/portal.png",
            image: "./assets/images/objects/portal.png",
            // ar: 1,
            centered: true,

            blocksMovement: false,
            blocksVisibility: false,
        },

        // 🏹 3. Лагерь эльфов (Объект с гарнизоном и наймом, на большой карте)
        "elf_camp": {
            type: "settlement",
            name: "Elf Camp",
            blocksMovement: true,
            blocksVisibility: true,
            dialog: true,

            icon: "./assets/images/objects/fortWooden.png",
            image: "./assets/images/objects/fortWooden.png",
            ar: 1,
            centered: true,

            // buildCost: { gold: 500, wood: 10 }, // Цена постройки 1 уровня
            allowedProduction: ["elf_archer"],  // Кого можно нанимать на 1 уровне

            stats: { hp: 1000, maxHp: 1000 },
            vision: { current: 3 },
            units: {}, // Изначально пустой гарнизон инстанса

            // Дерево развития здания (Апгрейды)
            upgradeLevels: {
                2: {
                    name: "Эльфийский Аванпост",
                    upgradeCost: { gold: 1000, wood: 20, ore: 5 },
                    bonusHp: 1500,
                    allowedProduction: ["elf_archer", "elf_druid"] // Открывается новый юнит для найма!
                }
            }
        },

        "chest": {
            type: "container",
            name: "Chest",
            mapId: "ancient_ruins_1",
            icon: "./assets/images/objects/chest.png",
            image: "./assets/images/objects/chest.png",
            ar: 1,
            centered: true,

            blocksMovement: false,
            interactable: true,

            backpack: {}
        },

        'ship': {
            type: "ship",
            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/ship.png",
            image: "./assets/images/objects/ship.png",
            ar: 1,
            // centered: true,

            stats: { hp: 2000, maxHp: 2000 },

            vision: { current: 3 },
            mapPosition: { },
            mapHistory: [],
            movement: { current: 3, max: 3 },
            movementTerrains: ['ocean', 'water'],
            units: {},

            animations: {
                idle: {
                    left: [
                        'assets/animations/ship/move/left_1.png',
                    ],
                    right: [
                        'assets/animations/ship/move/right_1.png',
                    ]
                },
                move: {
                    left : [
                        'assets/animations/ship/move/left_1.png',
                    ],
                    right : [
                        'assets/animations/ship/move/right_1.png',
                    ]
                }
            }
        },
    },
    ConfigCharacter: {
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
                    forward : [
                        'assets/animations/lizzy/move/forward_1.png',
                        'assets/animations/lizzy/move/forward_2.png',
                        'assets/animations/lizzy/move/forward_3.png',
                        'assets/animations/lizzy/move/forward_4.png',
                        'assets/animations/lizzy/move/forward_5.png',
                        'assets/animations/lizzy/move/forward_6.png',
                    ],
                    back : [
                        'assets/animations/lizzy/move/back_1.png',
                        'assets/animations/lizzy/move/back_2.png',
                        'assets/animations/lizzy/move/back_3.png',
                        'assets/animations/lizzy/move/back_4.png',
                        'assets/animations/lizzy/move/back_5.png',
                        'assets/animations/lizzy/move/back_6.png',
                    ],
                    left : [
                        'assets/animations/lizzy/move/left_1.png',
                        'assets/animations/lizzy/move/left_2.png',
                        'assets/animations/lizzy/move/left_3.png',
                        'assets/animations/lizzy/move/left_4.png',
                        'assets/animations/lizzy/move/left_5.png'

                    ],
                    right : [
                        'assets/animations/lizzy/move/right_1.png',
                        'assets/animations/lizzy/move/right_2.png',
                        'assets/animations/lizzy/move/right_3.png',
                        'assets/animations/lizzy/move/right_4.png',
                        'assets/animations/lizzy/move/right_5.png'
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
    },

    playerGallery: {
        // 🖼️ ПРИМЕР 1: КОЛЛЕКЦИОННЫЙ ПОСТЕР (С КАРТИНКОЙ)
        "lizzy_poster_0": {
            id: "lizzy_poster_1",
            name: "Poster: Lizzy Full-Height Art",
            type: "poster",
            text: "A rare collectible poster featuring Lizzy, discovered hidden behind a loose brick in the tavern's secret basement chambers.",
            image: "./assets/images/posters/lizzy_poster_0.png", // Path to your art asset
            index: 1,
            locked: false // Unlocked and ready to inspect
        },

        // 📜 EXAMPLE 2: TEXT SCROLL / DOCUMENT (TEXT ONLY)
        "lizzy_love_letter_1": {
            id: "lizzy_love_letter_1",
            name: "Letter: Lizzy's Secret Message",
            type: "letter",
            text: "Dearest Raphael...\n\nIf you are reading this note, it means my message successfully bypassed the guards via the commercial port merchants. The Grand Master of the Order is watching my every step within the Lorencia stronghold, and the net is tightening by the hour.\n\nMeet me near the eastern coastline as soon as your caravel docks at the harbor. Please, stay safe.",
            image: "", // No image, will fallback to the neat scroll icon
            index: 2,
            locked: false // Ready to be read
        },

        "erin_poster_0": {
            id: "erin_poster_0",
            name: "Poster: Lizzy Full-Height Art",
            type: "poster",
            text: "A rare collectible poster featuring Erin, discovered hidden behind a loose brick in the tavern's secret basement chambers.",
            image: "./assets/images/posters/erin_poster_0.png", // Path to your art asset
            index: 3,
            locked: false // Unlocked and ready to inspect
        },
    },

    turn_settings: {
        free_roam: true,          // true — игрок свободно бегает вне боя; false — вся игра изначально пошаговая
        turn_by: "character",     // Режим очереди в бою: "character" (по персонажам), "team" (по командам), "faction" (по фракциям)
        //turn_mode: "turn",        // Глобальный тип симуляции: "turn" (пошаговый бой), "realtime" (игра полностью в реальном времени)
        turn_mode: "realtime",        // Глобальный тип симуляции: "turn" (пошаговый бой), "realtime" (игра полностью в реальном времени)
        virtual_turn_ms: 1000,     // Сколько виртуальных миллисекунд проходит за 1 пошаговый ход для тика эффектов ( DoT / баффы )
        realtime_tick_ms: 16      // Дискретный шаг времени для реалтайм-режима в мс (16мс ~ 60 FPS)
    },

    maps: {
        'world_map': {
            mapId: 'world_map',
            // tiles: new Map() // Ключ "q,r" -> Объект HexTile
            tiles: new Map([
                [
                    "0,0",
                    {
                        "q": 0,
                        "r": 0,
                        "col": 0,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,1",
                    {
                        "q": 0,
                        "r": 1,
                        "col": 0,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,2",
                    {
                        "q": 0,
                        "r": 2,
                        "col": 0,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,3",
                    {
                        "q": 0,
                        "r": 3,
                        "col": 0,
                        "row": 3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,4",
                    {
                        "q": 0,
                        "r": 4,
                        "col": 0,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,5",
                    {
                        "q": 0,
                        "r": 5,
                        "col": 0,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,6",
                    {
                        "q": 0,
                        "r": 6,
                        "col": 0,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,7",
                    {
                        "q": 0,
                        "r": 7,
                        "col": 0,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,0",
                    {
                        "q": 1,
                        "r": 0,
                        "col": 1,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,1",
                    {
                        "q": 1,
                        "r": 1,
                        "col": 1,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,2",
                    {
                        "q": 1,
                        "r": 2,
                        "col": 1,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,3",
                    {
                        "q": 1,
                        "r": 3,
                        "col": 1,
                        "row": 3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,4",
                    {
                        "q": 1,
                        "r": 4,
                        "col": 1,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,5",
                    {
                        "q": 1,
                        "r": 5,
                        "col": 1,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,6",
                    {
                        "q": 1,
                        "r": 6,
                        "col": 1,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,7",
                    {
                        "q": 1,
                        "r": 7,
                        "col": 1,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,-1",
                    {
                        "q": 2,
                        "r": -1,
                        "col": 2,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,0",
                    {
                        "q": 2,
                        "r": 0,
                        "col": 2,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,1",
                    {
                        "q": 2,
                        "r": 1,
                        "col": 2,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,2",
                    {
                        "q": 2,
                        "r": 2,
                        "col": 2,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,3",
                    {
                        "q": 2,
                        "r": 3,
                        "col": 2,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,4",
                    {
                        "q": 2,
                        "r": 4,
                        "col": 2,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,5",
                    {
                        "q": 2,
                        "r": 5,
                        "col": 2,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,6",
                    {
                        "q": 2,
                        "r": 6,
                        "col": 2,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,-1",
                    {
                        "q": 3,
                        "r": -1,
                        "col": 3,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,0",
                    {
                        "q": 3,
                        "r": 0,
                        "col": 3,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,1",
                    {
                        "q": 3,
                        "r": 1,
                        "col": 3,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,2",
                    {
                        "q": 3,
                        "r": 2,
                        "col": 3,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,3",
                    {
                        "q": 3,
                        "r": 3,
                        "col": 3,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,4",
                    {
                        "q": 3,
                        "r": 4,
                        "col": 3,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,5",
                    {
                        "q": 3,
                        "r": 5,
                        "col": 3,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,6",
                    {
                        "q": 3,
                        "r": 6,
                        "col": 3,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,-2",
                    {
                        "q": 4,
                        "r": -2,
                        "col": 4,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,-1",
                    {
                        "q": 4,
                        "r": -1,
                        "col": 4,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,0",
                    {
                        "q": 4,
                        "r": 0,
                        "col": 4,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,1",
                    {
                        "q": 4,
                        "r": 1,
                        "col": 4,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,2",
                    {
                        "q": 4,
                        "r": 2,
                        "col": 4,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,3",
                    {
                        "q": 4,
                        "r": 3,
                        "col": 4,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,4",
                    {
                        "q": 4,
                        "r": 4,
                        "col": 4,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,5",
                    {
                        "q": 4,
                        "r": 5,
                        "col": 4,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-2",
                    {
                        "q": 5,
                        "r": -2,
                        "col": 5,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-1",
                    {
                        "q": 5,
                        "r": -1,
                        "col": 5,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,0",
                    {
                        "q": 5,
                        "r": 0,
                        "col": 5,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,1",
                    {
                        "q": 5,
                        "r": 1,
                        "col": 5,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,2",
                    {
                        "q": 5,
                        "r": 2,
                        "col": 5,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,3",
                    {
                        "q": 5,
                        "r": 3,
                        "col": 5,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,4",
                    {
                        "q": 5,
                        "r": 4,
                        "col": 5,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,5",
                    {
                        "q": 5,
                        "r": 5,
                        "col": 5,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-3",
                    {
                        "q": 6,
                        "r": -3,
                        "col": 6,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-2",
                    {
                        "q": 6,
                        "r": -2,
                        "col": 6,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-1",
                    {
                        "q": 6,
                        "r": -1,
                        "col": 6,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,0",
                    {
                        "q": 6,
                        "r": 0,
                        "col": 6,
                        "row": 3,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,1",
                    {
                        "q": 6,
                        "r": 1,
                        "col": 6,
                        "row": 4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,2",
                    {
                        "q": 6,
                        "r": 2,
                        "col": 6,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,3",
                    {
                        "q": 6,
                        "r": 3,
                        "col": 6,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,4",
                    {
                        "q": 6,
                        "r": 4,
                        "col": 6,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-3",
                    {
                        "q": 7,
                        "r": -3,
                        "col": 7,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-2",
                    {
                        "q": 7,
                        "r": -2,
                        "col": 7,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-1",
                    {
                        "q": 7,
                        "r": -1,
                        "col": 7,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,0",
                    {
                        "q": 7,
                        "r": 0,
                        "col": 7,
                        "row": 3,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,1",
                    {
                        "q": 7,
                        "r": 1,
                        "col": 7,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,2",
                    {
                        "q": 7,
                        "r": 2,
                        "col": 7,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,3",
                    {
                        "q": 7,
                        "r": 3,
                        "col": 7,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,4",
                    {
                        "q": 7,
                        "r": 4,
                        "col": 7,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-4",
                    {
                        "q": 8,
                        "r": -4,
                        "col": 8,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-3",
                    {
                        "q": 8,
                        "r": -3,
                        "col": 8,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-2",
                    {
                        "q": 8,
                        "r": -2,
                        "col": 8,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-1",
                    {
                        "q": 8,
                        "r": -1,
                        "col": 8,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,0",
                    {
                        "q": 8,
                        "r": 0,
                        "col": 8,
                        "row": 4,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,1",
                    {
                        "q": 8,
                        "r": 1,
                        "col": 8,
                        "row": 5,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,2",
                    {
                        "q": 8,
                        "r": 2,
                        "col": 8,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,3",
                    {
                        "q": 8,
                        "r": 3,
                        "col": 8,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-4",
                    {
                        "q": 9,
                        "r": -4,
                        "col": 9,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-3",
                    {
                        "q": 9,
                        "r": -3,
                        "col": 9,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-2",
                    {
                        "q": 9,
                        "r": -2,
                        "col": 9,
                        "row": 2,
                        "type": "ice",
                        "height": 2.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-1",
                    {
                        "q": 9,
                        "r": -1,
                        "col": 9,
                        "row": 3,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,0",
                    {
                        "q": 9,
                        "r": 0,
                        "col": 9,
                        "row": 4,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,1",
                    {
                        "q": 9,
                        "r": 1,
                        "col": 9,
                        "row": 5,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,2",
                    {
                        "q": 9,
                        "r": 2,
                        "col": 9,
                        "row": 6,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,3",
                    {
                        "q": 9,
                        "r": 3,
                        "col": 9,
                        "row": 7,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,-5",
                    {
                        "q": 10,
                        "r": -5,
                        "col": 10,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,-4",
                    {
                        "q": 10,
                        "r": -4,
                        "col": 10,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,-3",
                    {
                        "q": 10,
                        "r": -3,
                        "col": 10,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,-2",
                    {
                        "q": 10,
                        "r": -2,
                        "col": 10,
                        "row": 3,
                        "type": "ice",
                        "height": 2.5,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,-1",
                    {
                        "q": 10,
                        "r": -1,
                        "col": 10,
                        "row": 4,
                        "type": "ice",
                        "height": 2.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,0",
                    {
                        "q": 10,
                        "r": 0,
                        "col": 10,
                        "row": 5,
                        "type": "ice",
                        "height": 2.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,1",
                    {
                        "q": 10,
                        "r": 1,
                        "col": 10,
                        "row": 6,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,2",
                    {
                        "q": 10,
                        "r": 2,
                        "col": 10,
                        "row": 7,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-5",
                    {
                        "q": 11,
                        "r": -5,
                        "col": 11,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-4",
                    {
                        "q": 11,
                        "r": -4,
                        "col": 11,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-3",
                    {
                        "q": 11,
                        "r": -3,
                        "col": 11,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-2",
                    {
                        "q": 11,
                        "r": -2,
                        "col": 11,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-1",
                    {
                        "q": 11,
                        "r": -1,
                        "col": 11,
                        "row": 4,
                        "type": "snow",
                        "height": 3,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,0",
                    {
                        "q": 11,
                        "r": 0,
                        "col": 11,
                        "row": 5,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,1",
                    {
                        "q": 11,
                        "r": 1,
                        "col": 11,
                        "row": 6,
                        "type": "snow",
                        "height": 1.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,2",
                    {
                        "q": 11,
                        "r": 2,
                        "col": 11,
                        "row": 7,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,7",
                    {
                        "q": 2,
                        "r": 7,
                        "col": 2,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,6",
                    {
                        "q": 4,
                        "r": 6,
                        "col": 4,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,7",
                    {
                        "q": 3,
                        "r": 7,
                        "col": 3,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,5",
                    {
                        "q": 6,
                        "r": 5,
                        "col": 6,
                        "row": 5,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-5",
                    {
                        "q": 12,
                        "r": -5,
                        "col": 12,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-6",
                    {
                        "q": 14,
                        "r": -6,
                        "col": 14,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-5",
                    {
                        "q": 13,
                        "r": -5,
                        "col": 13,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-4",
                    {
                        "q": 12,
                        "r": -4,
                        "col": 12,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-4",
                    {
                        "q": 13,
                        "r": -4,
                        "col": 13,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-5",
                    {
                        "q": 14,
                        "r": -5,
                        "col": 14,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-4",
                    {
                        "q": 14,
                        "r": -4,
                        "col": 14,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-6",
                    {
                        "q": 15,
                        "r": -6,
                        "col": 15,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-5",
                    {
                        "q": 15,
                        "r": -5,
                        "col": 15,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-6",
                    {
                        "q": 16,
                        "r": -6,
                        "col": 16,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-5",
                    {
                        "q": 16,
                        "r": -5,
                        "col": 16,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-4",
                    {
                        "q": 16,
                        "r": -4,
                        "col": 16,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-4",
                    {
                        "q": 15,
                        "r": -4,
                        "col": 15,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-6",
                    {
                        "q": 13,
                        "r": -6,
                        "col": 13,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-6",
                    {
                        "q": 12,
                        "r": -6,
                        "col": 12,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,-6",
                    {
                        "q": 11,
                        "r": -6,
                        "col": 11,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-5",
                    {
                        "q": 9,
                        "r": -5,
                        "col": 9,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-4",
                    {
                        "q": 7,
                        "r": -4,
                        "col": 7,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-3",
                    {
                        "q": 5,
                        "r": -3,
                        "col": 5,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,-2",
                    {
                        "q": 3,
                        "r": -2,
                        "col": 3,
                        "row": -2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,3",
                    {
                        "q": -1,
                        "r": 3,
                        "col": -1,
                        "row": 3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,2",
                    {
                        "q": -1,
                        "r": 2,
                        "col": -1,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,4",
                    {
                        "q": -1,
                        "r": 4,
                        "col": -1,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,5",
                    {
                        "q": -1,
                        "r": 5,
                        "col": -1,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,6",
                    {
                        "q": -1,
                        "r": 6,
                        "col": -1,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,7",
                    {
                        "q": -1,
                        "r": 7,
                        "col": -1,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,4",
                    {
                        "q": -2,
                        "r": 4,
                        "col": -2,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,5",
                    {
                        "q": -2,
                        "r": 5,
                        "col": -2,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,6",
                    {
                        "q": -2,
                        "r": 6,
                        "col": -2,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,3",
                    {
                        "q": -2,
                        "r": 3,
                        "col": -2,
                        "row": 3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,7",
                    {
                        "q": -2,
                        "r": 7,
                        "col": -2,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-1,8",
                    {
                        "q": -1,
                        "r": 8,
                        "col": -1,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "-2,8",
                    {
                        "q": -2,
                        "r": 8,
                        "col": -2,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,3",
                    {
                        "q": 10,
                        "r": 3,
                        "col": 10,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,1",
                    {
                        "q": 12,
                        "r": 1,
                        "col": 12,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,0",
                    {
                        "q": 12,
                        "r": 0,
                        "col": 12,
                        "row": 0,
                        "type": "snow",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-1",
                    {
                        "q": 12,
                        "r": -1,
                        "col": 12,
                        "row": -1,
                        "type": "snow",
                        "height": 2.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-2",
                    {
                        "q": 12,
                        "r": -2,
                        "col": 12,
                        "row": -2,
                        "type": "snow",
                        "height": 3.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,-3",
                    {
                        "q": 12,
                        "r": -3,
                        "col": 12,
                        "row": -3,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-3",
                    {
                        "q": 13,
                        "r": -3,
                        "col": 13,
                        "row": -3,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-3",
                    {
                        "q": 14,
                        "r": -3,
                        "col": 14,
                        "row": -3,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-2",
                    {
                        "q": 13,
                        "r": -2,
                        "col": 13,
                        "row": -2,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,-1",
                    {
                        "q": 13,
                        "r": -1,
                        "col": 13,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,0",
                    {
                        "q": 13,
                        "r": 0,
                        "col": 13,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,1",
                    {
                        "q": 13,
                        "r": 1,
                        "col": 13,
                        "row": 1,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,2",
                    {
                        "q": 12,
                        "r": 2,
                        "col": 12,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,3",
                    {
                        "q": 11,
                        "r": 3,
                        "col": 11,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,4",
                    {
                        "q": 10,
                        "r": 4,
                        "col": 10,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,4",
                    {
                        "q": 11,
                        "r": 4,
                        "col": 11,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,4",
                    {
                        "q": 12,
                        "r": 4,
                        "col": 12,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,3",
                    {
                        "q": 12,
                        "r": 3,
                        "col": 12,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,3",
                    {
                        "q": 13,
                        "r": 3,
                        "col": 13,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,2",
                    {
                        "q": 13,
                        "r": 2,
                        "col": 13,
                        "row": 2,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,2",
                    {
                        "q": 14,
                        "r": 2,
                        "col": 14,
                        "row": 2,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,1",
                    {
                        "q": 15,
                        "r": 1,
                        "col": 15,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,1",
                    {
                        "q": 14,
                        "r": 1,
                        "col": 14,
                        "row": 1,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,0",
                    {
                        "q": 14,
                        "r": 0,
                        "col": 14,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,0",
                    {
                        "q": 15,
                        "r": 0,
                        "col": 15,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-1",
                    {
                        "q": 15,
                        "r": -1,
                        "col": 15,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-1",
                    {
                        "q": 14,
                        "r": -1,
                        "col": 14,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,-2",
                    {
                        "q": 14,
                        "r": -2,
                        "col": 14,
                        "row": -2,
                        "type": "ice",
                        "height": 3.5,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-2",
                    {
                        "q": 15,
                        "r": -2,
                        "col": 15,
                        "row": -2,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,-3",
                    {
                        "q": 15,
                        "r": -3,
                        "col": 15,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-3",
                    {
                        "q": 16,
                        "r": -3,
                        "col": 16,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-2",
                    {
                        "q": 16,
                        "r": -2,
                        "col": 16,
                        "row": -2,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,-1",
                    {
                        "q": 16,
                        "r": -1,
                        "col": 16,
                        "row": -1,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,0",
                    {
                        "q": 16,
                        "r": 0,
                        "col": 16,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-3",
                    {
                        "q": 17,
                        "r": -3,
                        "col": 17,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-2",
                    {
                        "q": 17,
                        "r": -2,
                        "col": 17,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-2",
                    {
                        "q": 18,
                        "r": -2,
                        "col": 18,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-1",
                    {
                        "q": 17,
                        "r": -1,
                        "col": 17,
                        "row": -1,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-1",
                    {
                        "q": 18,
                        "r": -1,
                        "col": 18,
                        "row": -1,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,0",
                    {
                        "q": 17,
                        "r": 0,
                        "col": 17,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,1",
                    {
                        "q": 16,
                        "r": 1,
                        "col": 16,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,2",
                    {
                        "q": 15,
                        "r": 2,
                        "col": 15,
                        "row": 2,
                        "type": "ice",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,3",
                    {
                        "q": 14,
                        "r": 3,
                        "col": 14,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,4",
                    {
                        "q": 13,
                        "r": 4,
                        "col": 13,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,4",
                    {
                        "q": 15,
                        "r": 4,
                        "col": 15,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,3",
                    {
                        "q": 15,
                        "r": 3,
                        "col": 15,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,4",
                    {
                        "q": 14,
                        "r": 4,
                        "col": 14,
                        "row": 4,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,2",
                    {
                        "q": 16,
                        "r": 2,
                        "col": 16,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,3",
                    {
                        "q": 16,
                        "r": 3,
                        "col": 16,
                        "row": 3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,2",
                    {
                        "q": 17,
                        "r": 2,
                        "col": 17,
                        "row": 2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,1",
                    {
                        "q": 17,
                        "r": 1,
                        "col": 17,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,1",
                    {
                        "q": 18,
                        "r": 1,
                        "col": 18,
                        "row": 1,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,0",
                    {
                        "q": 18,
                        "r": 0,
                        "col": 18,
                        "row": 0,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,0",
                    {
                        "q": 19,
                        "r": 0,
                        "col": 19,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-1",
                    {
                        "q": 19,
                        "r": -1,
                        "col": 19,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-2",
                    {
                        "q": 19,
                        "r": -2,
                        "col": 19,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,4",
                    {
                        "q": 8,
                        "r": 4,
                        "col": 8,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,4",
                    {
                        "q": 9,
                        "r": 4,
                        "col": 9,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,5",
                    {
                        "q": 8,
                        "r": 5,
                        "col": 8,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,5",
                    {
                        "q": 9,
                        "r": 5,
                        "col": 9,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,5",
                    {
                        "q": 7,
                        "r": 5,
                        "col": 7,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,5",
                    {
                        "q": 10,
                        "r": 5,
                        "col": 10,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,5",
                    {
                        "q": 11,
                        "r": 5,
                        "col": 11,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,6",
                    {
                        "q": 9,
                        "r": 6,
                        "col": 9,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,6",
                    {
                        "q": 10,
                        "r": 6,
                        "col": 10,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,6",
                    {
                        "q": 8,
                        "r": 6,
                        "col": 8,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,6",
                    {
                        "q": 7,
                        "r": 6,
                        "col": 7,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,6",
                    {
                        "q": 6,
                        "r": 6,
                        "col": 6,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,6",
                    {
                        "q": 5,
                        "r": 6,
                        "col": 5,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,7",
                    {
                        "q": 7,
                        "r": 7,
                        "col": 7,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,7",
                    {
                        "q": 8,
                        "r": 7,
                        "col": 8,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,7",
                    {
                        "q": 9,
                        "r": 7,
                        "col": 9,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,7",
                    {
                        "q": 10,
                        "r": 7,
                        "col": 10,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,6",
                    {
                        "q": 11,
                        "r": 6,
                        "col": 11,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,8",
                    {
                        "q": 8,
                        "r": 8,
                        "col": 8,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,8",
                    {
                        "q": 9,
                        "r": 8,
                        "col": 9,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,8",
                    {
                        "q": 7,
                        "r": 8,
                        "col": 7,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,7",
                    {
                        "q": 6,
                        "r": 7,
                        "col": 6,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,8",
                    {
                        "q": 6,
                        "r": 8,
                        "col": 6,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,7",
                    {
                        "q": 5,
                        "r": 7,
                        "col": 5,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,8",
                    {
                        "q": 5,
                        "r": 8,
                        "col": 5,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,7",
                    {
                        "q": 4,
                        "r": 7,
                        "col": 4,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,8",
                    {
                        "q": 4,
                        "r": 8,
                        "col": 4,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,8",
                    {
                        "q": 10,
                        "r": 8,
                        "col": 10,
                        "row": 8,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,9",
                    {
                        "q": 8,
                        "r": 9,
                        "col": 8,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,9",
                    {
                        "q": 7,
                        "r": 9,
                        "col": 7,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,9",
                    {
                        "q": 6,
                        "r": 9,
                        "col": 6,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,9",
                    {
                        "q": 9,
                        "r": 9,
                        "col": 9,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,9",
                    {
                        "q": 10,
                        "r": 9,
                        "col": 10,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,8",
                    {
                        "q": 11,
                        "r": 8,
                        "col": 11,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,7",
                    {
                        "q": 11,
                        "r": 7,
                        "col": 11,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,7",
                    {
                        "q": 12,
                        "r": 7,
                        "col": 12,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,6",
                    {
                        "q": 12,
                        "r": 6,
                        "col": 12,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,5",
                    {
                        "q": 12,
                        "r": 5,
                        "col": 12,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,5",
                    {
                        "q": 13,
                        "r": 5,
                        "col": 13,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,5",
                    {
                        "q": 14,
                        "r": 5,
                        "col": 14,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,6",
                    {
                        "q": 13,
                        "r": 6,
                        "col": 13,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,6",
                    {
                        "q": 14,
                        "r": 6,
                        "col": 14,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,7",
                    {
                        "q": 13,
                        "r": 7,
                        "col": 13,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,8",
                    {
                        "q": 12,
                        "r": 8,
                        "col": 12,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,9",
                    {
                        "q": 11,
                        "r": 9,
                        "col": 11,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,8",
                    {
                        "q": 13,
                        "r": 8,
                        "col": 13,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,9",
                    {
                        "q": 12,
                        "r": 9,
                        "col": 12,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,7",
                    {
                        "q": 14,
                        "r": 7,
                        "col": 14,
                        "row": 7,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,8",
                    {
                        "q": 14,
                        "r": 8,
                        "col": 14,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "13,9",
                    {
                        "q": 13,
                        "r": 9,
                        "col": 13,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "14,9",
                    {
                        "q": 14,
                        "r": 9,
                        "col": 14,
                        "row": 9,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,8",
                    {
                        "q": 15,
                        "r": 8,
                        "col": 15,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,7",
                    {
                        "q": 15,
                        "r": 7,
                        "col": 15,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,6",
                    {
                        "q": 15,
                        "r": 6,
                        "col": 15,
                        "row": 6,
                        "type": "ice",
                        "height": 1.5,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,6",
                    {
                        "q": 16,
                        "r": 6,
                        "col": 16,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,5",
                    {
                        "q": 17,
                        "r": 5,
                        "col": 17,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,5",
                    {
                        "q": 16,
                        "r": 5,
                        "col": 16,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "15,5",
                    {
                        "q": 15,
                        "r": 5,
                        "col": 15,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,4",
                    {
                        "q": 16,
                        "r": 4,
                        "col": 16,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,2",
                    {
                        "q": 18,
                        "r": 2,
                        "col": 18,
                        "row": 2,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,3",
                    {
                        "q": 17,
                        "r": 3,
                        "col": 17,
                        "row": 3,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,4",
                    {
                        "q": 17,
                        "r": 4,
                        "col": 17,
                        "row": 4,
                        "type": "ice",
                        "height": 4,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,6",
                    {
                        "q": 17,
                        "r": 6,
                        "col": 17,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,7",
                    {
                        "q": 16,
                        "r": 7,
                        "col": 16,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,5",
                    {
                        "q": 18,
                        "r": 5,
                        "col": 18,
                        "row": 5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,4",
                    {
                        "q": 18,
                        "r": 4,
                        "col": 18,
                        "row": 4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,7",
                    {
                        "q": 17,
                        "r": 7,
                        "col": 17,
                        "row": 7,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,6",
                    {
                        "q": 18,
                        "r": 6,
                        "col": 18,
                        "row": 6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "16,8",
                    {
                        "q": 16,
                        "r": 8,
                        "col": 16,
                        "row": 8,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "10,10",
                    {
                        "q": 10,
                        "r": 10,
                        "col": 10,
                        "row": 10,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,10",
                    {
                        "q": 9,
                        "r": 10,
                        "col": 9,
                        "row": 10,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,10",
                    {
                        "q": 8,
                        "r": 10,
                        "col": 8,
                        "row": 10,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "11,10",
                    {
                        "q": 11,
                        "r": 10,
                        "col": 11,
                        "row": 10,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "12,10",
                    {
                        "q": 12,
                        "r": 10,
                        "col": 12,
                        "row": 10,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-6",
                    {
                        "q": 17,
                        "r": -6,
                        "col": 17,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-6",
                    {
                        "q": 18,
                        "r": -6,
                        "col": 18,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-5",
                    {
                        "q": 17,
                        "r": -5,
                        "col": 17,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "17,-4",
                    {
                        "q": 17,
                        "r": -4,
                        "col": 17,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-5",
                    {
                        "q": 18,
                        "r": -5,
                        "col": 18,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-4",
                    {
                        "q": 18,
                        "r": -4,
                        "col": 18,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,-3",
                    {
                        "q": 18,
                        "r": -3,
                        "col": 18,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-4",
                    {
                        "q": 19,
                        "r": -4,
                        "col": 19,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-5",
                    {
                        "q": 19,
                        "r": -5,
                        "col": 19,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-6",
                    {
                        "q": 19,
                        "r": -6,
                        "col": 19,
                        "row": -6,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,-3",
                    {
                        "q": 19,
                        "r": -3,
                        "col": 19,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,-3",
                    {
                        "q": 20,
                        "r": -3,
                        "col": 20,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,-4",
                    {
                        "q": 20,
                        "r": -4,
                        "col": 20,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,-5",
                    {
                        "q": 20,
                        "r": -5,
                        "col": 20,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "21,-5",
                    {
                        "q": 21,
                        "r": -5,
                        "col": 21,
                        "row": -5,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "21,-4",
                    {
                        "q": 21,
                        "r": -4,
                        "col": 21,
                        "row": -4,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "21,-3",
                    {
                        "q": 21,
                        "r": -3,
                        "col": 21,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,-2",
                    {
                        "q": 20,
                        "r": -2,
                        "col": 20,
                        "row": -2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "22,-2",
                    {
                        "q": 22,
                        "r": -2,
                        "col": 22,
                        "row": -2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "22,-3",
                    {
                        "q": 22,
                        "r": -3,
                        "col": 22,
                        "row": -3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "21,-2",
                    {
                        "q": 21,
                        "r": -2,
                        "col": 21,
                        "row": -2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,-1",
                    {
                        "q": 20,
                        "r": -1,
                        "col": 20,
                        "row": -1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "21,-1",
                    {
                        "q": 21,
                        "r": -1,
                        "col": 21,
                        "row": -1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,0",
                    {
                        "q": 20,
                        "r": 0,
                        "col": 20,
                        "row": 0,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "20,1",
                    {
                        "q": 20,
                        "r": 1,
                        "col": 20,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,1",
                    {
                        "q": 19,
                        "r": 1,
                        "col": 19,
                        "row": 1,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "19,2",
                    {
                        "q": 19,
                        "r": 2,
                        "col": 19,
                        "row": 2,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "18,3",
                    {
                        "q": 18,
                        "r": 3,
                        "col": 18,
                        "row": 3,
                        "type": "ocean",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ]
            ])
        },

        'ancient_ruins_1': {
            mapId: 'ancient_ruins_1',
            tiles: new Map(new Map([
                [
                    "0,0",
                    {
                        "q": 0,
                        "r": 0,
                        "col": 0,
                        "row": 0,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,1",
                    {
                        "q": 0,
                        "r": 1,
                        "col": 0,
                        "row": 1,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "0,2",
                    {
                        "q": 0,
                        "r": 2,
                        "col": 0,
                        "row": 2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,2",
                    {
                        "q": 1,
                        "r": 2,
                        "col": 1,
                        "row": 2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,2",
                    {
                        "q": 2,
                        "r": 2,
                        "col": 2,
                        "row": 2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,-1",
                    {
                        "q": 1,
                        "r": -1,
                        "col": 1,
                        "row": -1,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,-2",
                    {
                        "q": 2,
                        "r": -2,
                        "col": 2,
                        "row": -2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,-3",
                    {
                        "q": 3,
                        "r": -3,
                        "col": 3,
                        "row": -3,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,-3",
                    {
                        "q": 4,
                        "r": -3,
                        "col": 4,
                        "row": -3,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-4",
                    {
                        "q": 5,
                        "r": -4,
                        "col": 5,
                        "row": -4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-4",
                    {
                        "q": 6,
                        "r": -4,
                        "col": 6,
                        "row": -4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-4",
                    {
                        "q": 7,
                        "r": -4,
                        "col": 7,
                        "row": -4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,0",
                    {
                        "q": 1,
                        "r": 0,
                        "col": 1,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "1,1",
                    {
                        "q": 1,
                        "r": 1,
                        "col": 1,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,1",
                    {
                        "q": 2,
                        "r": 1,
                        "col": 2,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,0",
                    {
                        "q": 2,
                        "r": 0,
                        "col": 2,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "2,-1",
                    {
                        "q": 2,
                        "r": -1,
                        "col": 2,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,-2",
                    {
                        "q": 3,
                        "r": -2,
                        "col": 3,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,-1",
                    {
                        "q": 3,
                        "r": -1,
                        "col": 3,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,-2",
                    {
                        "q": 4,
                        "r": -2,
                        "col": 4,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-3",
                    {
                        "q": 5,
                        "r": -3,
                        "col": 5,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-3",
                    {
                        "q": 6,
                        "r": -3,
                        "col": 6,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-2",
                    {
                        "q": 5,
                        "r": -2,
                        "col": 5,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,-1",
                    {
                        "q": 4,
                        "r": -1,
                        "col": 4,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,0",
                    {
                        "q": 3,
                        "r": 0,
                        "col": 3,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,1",
                    {
                        "q": 3,
                        "r": 1,
                        "col": 3,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,0",
                    {
                        "q": 4,
                        "r": 0,
                        "col": 4,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,-1",
                    {
                        "q": 5,
                        "r": -1,
                        "col": 5,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-2",
                    {
                        "q": 6,
                        "r": -2,
                        "col": 6,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-3",
                    {
                        "q": 7,
                        "r": -3,
                        "col": 7,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-3",
                    {
                        "q": 8,
                        "r": -3,
                        "col": 8,
                        "row": -3,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-2",
                    {
                        "q": 7,
                        "r": -2,
                        "col": 7,
                        "row": -2,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,-1",
                    {
                        "q": 6,
                        "r": -1,
                        "col": 6,
                        "row": -1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,0",
                    {
                        "q": 5,
                        "r": 0,
                        "col": 5,
                        "row": 0,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,1",
                    {
                        "q": 4,
                        "r": 1,
                        "col": 4,
                        "row": 1,
                        "type": "snow",
                        "height": 1,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "3,2",
                    {
                        "q": 3,
                        "r": 2,
                        "col": 3,
                        "row": 2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 2,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "4,2",
                    {
                        "q": 4,
                        "r": 2,
                        "col": 4,
                        "row": 2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "5,1",
                    {
                        "q": 5,
                        "r": 1,
                        "col": 5,
                        "row": 1,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "6,0",
                    {
                        "q": 6,
                        "r": 0,
                        "col": 6,
                        "row": 0,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "7,-1",
                    {
                        "q": 7,
                        "r": -1,
                        "col": 7,
                        "row": -1,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 0,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-2",
                    {
                        "q": 8,
                        "r": -2,
                        "col": 8,
                        "row": -2,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-3",
                    {
                        "q": 9,
                        "r": -3,
                        "col": 9,
                        "row": -3,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 4,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "9,-4",
                    {
                        "q": 9,
                        "r": -4,
                        "col": 9,
                        "row": -4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 3,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ],
                [
                    "8,-4",
                    {
                        "q": 8,
                        "r": -4,
                        "col": 8,
                        "row": -4,
                        "type": "ice",
                        "height": 2,
                        "imageIndex": 1,
                        "region": null,
                        "province": null,
                        "faction": null,
                        "population": 0,
                        "units": [],
                        "worldObject": null
                    }
                ]
            ]))
        },
    },

    map: {
        mapId: 'world_map'
    },

    game_settings: {
        // playerType: 'character', // team, faction
        playerType: 'faction', // team, faction
        playerAttack: 'manual', //auto
        playerCamera: 'fixed', //free
        playerZoom: false, //free
        // battleType: 'tactical', //instant
        battleType: 'instant', //instant
        battleOpenMap: true, //instant
        battleFreeMove: true, //instant
        ui: {
            character : 'left-top', //left-bottom,
            lang: 'en'
        },

        nextLevelXpFormula: "100 * Math.pow(L, 1.5)",
        killExpFormula: "10 * Math.pow(L1, 1.5) / Math.pow(L2, 1.5)",
        killExpShare: true, //false,
        killExpTiming: 'instant', // 'win'

        audio: {
            music: { mute: true, volume: 70, currentTrack: null }, // Фоновая музыка
            sfx:   { mute: false, volume: 80 },                    // Эффекты (удары, касты, клики)
            speech:{ mute: false, volume: 100 }                    // Озвучка диалогов / страниц
        },
    },

    sound: {
        'background': {
            tracks: ['assets/audio/background/track01.m4a'],
            currentTime: 0,
            currentIndex: 0
        },
        'battle': [],
        'hub': []
    },

    player: {
        id: 'p1',
        name: 'Mark',

        faction: 'lorencia',
        character: 'rafael',

        // faction: 'elvinar',
        // character: 'erin',

        quests: ["quest_moon_medicine", "quest_dwarf_info", "quest_sail_north"],
        exploredTiles: new Set() // Строки "q,r" для Тумана Войны
    },

    play: {
        activeCharacterId: null,   // Ссылка на ID персонажа из AppState.characters
        activeFactionId: null,
        activeSkillId: null,   // Ссылка на ID персонажа из AppState.characters
        currentActivePath: [],     // Массив HexTile текущего луча A*
        visibleTiles: new Set(),   // Видимые в реальном времени гексы "q,r"
        cachedReachableTiles: []   // Массив HexTile зоны Дейкстры
    },

    entities: {},

    characters: {
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

            skills: [
                { skill_id: "queen_will", level: 1 },       // Пассивка
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
                        "./assets/images/heroes/fullheight/rafaelAfterlife.png"
                        // 'assets/animations/rafael/move/left_1.png',
                    ],
                    right: [
                        "./assets/images/heroes/fullheight/rafaelAfterlife.png"
                        // 'assets/animations/rafael/move/right_1.png',
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
            mapPosition: { q: 10, r: 7 },
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
                    forward : [
                        'assets/animations/lizzy/move/forward_1.png',
                        'assets/animations/lizzy/move/forward_2.png',
                        'assets/animations/lizzy/move/forward_3.png',
                        'assets/animations/lizzy/move/forward_4.png',
                        'assets/animations/lizzy/move/forward_5.png',
                        'assets/animations/lizzy/move/forward_6.png',
                    ],
                    back : [
                        'assets/animations/lizzy/move/back_1.png',
                        'assets/animations/lizzy/move/back_2.png',
                        'assets/animations/lizzy/move/back_3.png',
                        'assets/animations/lizzy/move/back_4.png',
                        'assets/animations/lizzy/move/back_5.png',
                        'assets/animations/lizzy/move/back_6.png',
                    ],
                    left : [
                        'assets/animations/lizzy/move/left_1.png',
                        'assets/animations/lizzy/move/left_2.png',
                        'assets/animations/lizzy/move/left_3.png',
                        'assets/animations/lizzy/move/left_4.png',
                        'assets/animations/lizzy/move/left_5.png'

                    ],
                    right : [
                        'assets/animations/lizzy/move/right_1.png',
                        'assets/animations/lizzy/move/right_2.png',
                        'assets/animations/lizzy/move/right_3.png',
                        'assets/animations/lizzy/move/right_4.png',
                        'assets/animations/lizzy/move/right_5.png'
                    ]
                }
            }
        },

        'gromm': {
            ...defaultCharacterProperties,
            id: 'gromm',
            name: 'Gromm',
            faction: 'darkwood',
            mapId: 'world_map',
            mapPosition: { q: 106, r: -101 },
            mapHistory: [],
            movement: { current: 3, max: 3 },
            movementTerrains: ['grass', 'snow'],
            vision: { current: 2 },
            image: '',
            stats: { hp: 200,  maxHp: 200, energy: 0, "atk": 10, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
            inventory: [],
            cachedReachableTiles: null,

            backpack: {
                "knight_armor": 1
            },

            killExp: 300,

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
        },

        'gromm2': {
            ...defaultCharacterProperties,
            id: 'gromm2',
            name: 'Gromm',
            faction: 'darkwood',
            mapId: 'world_map',
            mapPosition: { q: 16, r: 2 },
            mapHistory: [],
            movement: { current: 3, max: 3 },
            movementTerrains: ['grass', 'snow'],
            vision: { current: 3 },
            image: '',
            stats: { hp: 200,  maxHp: 200, energy: 0, "atk": 10, "atkRange": 1, atkRangeType: 'melee', "atkSpeed": 1000, "mvmSpeed": 1000, "speed": 90 },
            inventory: [],
            cachedReachableTiles: null,

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
    },

    objects: {
        // 🏛️ 1. Древние руины (Находятся на большой карте world_map, ведут внутрь)
        "ancient_ruins_1_1": {
            id: "ancient_ruins_1_1",
            type: "dungeon_entrance",
            name: "Ancient Ruins",

            mapId: "world_map",
            mapPosition: { q: 5, r: 1 },
            mapTo: { mapId: "ancient_ruins_1", q: 1, r: 1 },

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/ruins.png",
            image: "./assets/images/objects/ruins.png",
            ar: 1,
            centered: true,
        },
        "ancient_ruins_1_2": {
            id: "ancient_ruins_1_2",
            type: "dungeon_entrance",
            name: "Ancient Ruins",

            mapId: "world_map",
            mapPosition: { q: 7, r: 1 },
            mapTo: { mapId: "ancient_ruins_1", q: 8, r: -3 },

            blocksMovement: false,
            blocksVisibility: true,

            icon: "./assets/images/objects/ruins.png",
            image: "./assets/images/objects/ruins.png",
            ar: 1,
            centered: true,
        },

        // 🪜 2. Лестница наружу (Находится внутри руин, ведёт обратно на глобальную карту)
        "ladder_1_ancient_ruins_1": {
            id: "ladder_1_ancient_ruins_1",
            type: "dungeon_exit",
            name: "Ladder",
            mapId: "ancient_ruins_1",
            mapPosition: { q: 1, r: 1 },

            icon: "./assets/images/objects/ladder.png",
            image: "./assets/images/objects/ladder.png",
            ar: 1,
            mapTo: { mapId: "world_map", q: 5, r: 1 },
            centered: true,

            blocksMovement: false,
            blocksVisibility: false,
        },

        "ladder_2_ancient_ruins_1": {
            id: "ladder_2_ancient_ruins_1",
            type: "dungeon_exit",
            name: "Ladder",
            mapId: "ancient_ruins_1",
            mapPosition: { q: 8, r: -3 },

            icon: "./assets/images/objects/ladder.png",
            image: "./assets/images/objects/ladder.png",
            ar: 1,
            mapTo: { mapId: "world_map", q: 7, r: 1 },
            centered: true,

            blocksMovement: false,
            blocksVisibility: false,
        },

        // 🏹 3. Лагерь эльфов (Объект с гарнизоном и наймом, на большой карте)
        "elf_camp": {
            type: "settlement",
            name: "Elf Camp",
            blocksMovement: true,
            blocksVisibility: true,
            dialog: true, // Сигнал клик-менеджеру открыть диалог управления

            icon: "./assets/images/objects/fortWooden.png",
            image: "./assets/images/objects/fortWooden.png",
            ar: 1,
            centered: true,

            // buildCost: { gold: 500, wood: 10 }, // Цена постройки 1 уровня
            allowedProduction: ["elf_archer"],  // Кого можно нанимать на 1 уровне

            stats: { hp: 1000, maxHp: 1000 },
            vision: { current: 3 },
            units: {}, // Изначально пустой гарнизон инстанса

            // Дерево развития здания (Апгрейды)
        },

        // "elf_camp": {
        //     id: "elf_camp",
        //     type: "settlement",
        //     name: "Elf camp",
        //     mapId: "world_map",
        //     mapPosition: { q: 8, r: 4 },
        //     blocks_movement: true,
        //     icon: "./assets/images/objects/fortWooden.svg",
        //     image: "./assets/images/objects/fortWooden.svg",
        //     ar: 1,
        //
        //     // Гарнизон защитников лагеря
        //     units: {
        //         "elf_archer": 15
        //     }
        // },

        // 🏴‍☠️ 4. Сундук с лутом (Находится внутри руин, можно обыскать)
        "chest1": {
            id: "chest1",
            type: "container",
            name: "Old chest",
            mapId: "ancient_ruins_1",
            mapPosition: { q: 5, r: -3 },
            icon: "./assets/images/objects/chest.png",
            image: "./assets/images/objects/chest.png",
            ar: 1,
            centered: true,

            blocksMovement: false,
            interactable: true,

            backpack: {
                "rusty_sword": 1,
                "gold_ring": 1
            }
        }
    },

    regions: {
        'frozen_shore': {
            id: 'frozen_shore',
            name: 'Frozen Shore',

            faction: ''
        }
    },

    provinces: {
        'frozenburg': {
            id: 'frozenburg',
            name: 'Frozenburg',
            region: 'frozen_shore',

            faction: ''
        }
    },


    factions: {
        'elvinar':  {
            id: 'elvinar',
            name: 'Elvinar',

            icon: "",
            image: "",
            color: 0x2ea44f,
            strokeColor: 0x7ee787,

            capital: "", //может не быть
            cities: true,
            trade: true,
            diplomacy: true,

            resources: { gold: 1000, wood: 20, ore: 5, food: 500 },
            production: { gold: 10, wood: 2, ore: 0, food: 500 },
            buildings: {elf_camp:{requirements:null}},

            stats: {}, //доп статы для всех во фракции если есть

            effects: {}, //например доход +10% 3 хода, тот же effects

            leaderCharId: "erin",
            capitalObjectId: "",
            suzerainId: null,
        },
        'lorencia': {
            id: 'lorencia', name: 'Lorencia',

            icon: "",
            image: "",
            // color: 0x8b949e,
            // strokeColor: 0xc9d1d9,

            color: 0x1e40af,       // Плотный, благородный синий
            strokeColor: 0x60a5fa, // Мягкий светлый синий для подсветки

            capital: "", //может не быть
            cities: true,
            trade: true,
            diplomacy: true,

            resources: { gold: 5000, wood: 0, ore: 0, food: 1000 },
            production: { gold: 0, wood: 0, ore: 0, food: 0 },
            buildings: {elf_camp:{requirements:null}},

            stats: {}, //доп статы для всех во фракции если есть

            effects: {}, //например доход +10% 3 хода, тот же effects

            leaderCharId: "rafael", // ID персонажа-лидера из AppState.characters
            capitalObjectId: "", // ID объекта-города из AppState.objects
            suzerainId: null,
        },
        'darkwood':     {
            id: 'darkwood',
            name: 'Darkwood',


            color: 0xda3637,
            strokeColor: 0xff7b72,

            capital: "", //может не быть
            cities: true,
            trade: false,
            diplomacy: false,

            resources: { gold: 10000, wood: 0, ore: 0, food: 1000 },
            production: { food: 100 },
            buildings: {},

            stats: {}, //доп статы для всех во фракции если есть

            effects: {}, //например доход +10% 3 хода, тот же effects

            leaderCharId: "ibragimsoresh",
            capitalObjectId: "",
            suzerainId: null,
        }
    },

    pacts: {
        'lorencia': {
            'elvinar': DiplomaticPacts.NONE,
            'lorencia': DiplomaticPacts.ALLIANCE,
            'darkwood': DiplomaticPacts.WAR
        },
        'elvinar': {
            'elvinar': DiplomaticPacts.ALLIANCE,
            'lorencia': DiplomaticPacts.NONE,
            'darkwood': DiplomaticPacts.WAR
        },
        'darkwood': {
            'lorencia': DiplomaticPacts.WAR,
            'elvinar': DiplomaticPacts.WAR,
            'darkwood': DiplomaticPacts.ALLIANCE
        }
    },

    relations: {
        'darkwood': { 'elvinar': 75, 'rafael': 90 }, // Репутация Рафаэля внутри фракции Темнолесье
        'elvinar':  { 'darkwood': 75 },
        'lorencia': { 'darkwood': 10 },
        'orcs':     { 'darkwood': -100 }
    },

    combat_formulas: {
        "hit_chance_formula": "Math.max(5, 100 - (T.dodge - A.accuracy))",
        "base_damage_formula": "(A.atk * (100 / (100 + T.armor))) * (1 - (T.dmg_reduction / 100))",
        "crit_damage_formula": "BASE_DMG * (A.crit_damage / 100)",

        "energy_gain_on_kill": "25",
        "base_energy_gain_on_attack": "20",
        "base_energy_gain_on_damage_taken": "30",
    },

    projectiles: {
        "spider_projectile": {
            id: "spider_projectile",
            name: "spider_projectile",
            width: 42,
            height: 42,
            frameDuration: 80,
            image: 'assets/images/projectiles/spider_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/spider_projectile.png',
                ],
                right: [
                    'assets/images/projectiles/spider_projectile.png',
                ]
            }
        },

        "magical_projectile": {
            id: "magical_projectile",
            name: "magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/magical_projectile.png',
                    ],
                right: [
                    'assets/images/projectiles/magical_projectile.png',
                    ]
            }
        },

        "blood_magical_projectile": {
            id: "blood_magical_projectile",
            name: "blood_magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/blood_magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/blood_magical_projectile.png',
                ],
                right: [
                    'assets/images/projectiles/blood_magical_projectile.png',
                ]
            }
        },

        "fire_magical_projectile": {
            id: "fire_magical_projectile",
            name: "fire_magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/fire_magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/fire_magical_projectile.png',
                ],
                right: [
                    'assets/images/projectiles/fire_magical_projectile.png',
                ]
            }
        },

        "purple_magical_projectile": {
            id: "purple_magical_projectile",
            name: "purple_magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/purple_magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/purple_magical_projectile.png',
                    ],
                right: [
                    'assets/images/projectiles/purple_magical_projectile.png',
                    ]
            }
        },

        "water_magical_projectile": {
            id: "water_magical_projectile",
            name: "water_magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/water_magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/water_magical_projectile.png',
                    ],
                right: [
                    'assets/images/projectiles/water_magical_projectile.png',
                    ]
            }
        },

        "wind_magical_projectile": {
            id: "wind_magical_projectile",
            name: "wind_magical_projectile",
            width: 72,
            height: 72,
            frameDuration: 80,
            image: 'assets/images/projectiles/wind_magical_projectile.png',
            animations: {
                left: [
                    'assets/images/projectiles/wind_magical_projectile.png',
                    ],
                right: [
                    'assets/images/projectiles/wind_magical_projectile.png',
                    ]
            }
        },
    },

    items: {
        "rusty_sword": {
            category: "equipment",
            rarity: "R",
            is_usable: false,
            slot: "weapon",
            icon: "⚔️",
            stats: { "atk": 15, "crit": 3 },
            title_loc: { ru: "Ржавый меч", en: "Rusty Sword" }
        },
        "knight_armor": {
            category: "equipment",
            rarity: "SR",
            is_usable: false,
            slot: "armor",
            icon: "🛡️",
            stats: { "def": 45, "hp": 200 },
            title_loc: { ru: "Доспех Рыцаря", en: "Knight Armor" }
        }
    },

    pets: [],

    effects: {
        "eff_stat_boost_percent": {
            ...BASE_EFFECT_STATS,
            polarity: "buff",
            type: "stat_mod", // Тип: модификатор статов (обрабатывается при расчете)
            desc_loc_key: "eff_stat_boost"
        },
        // Дебафф (Периодический урон - ДОТ), срабатывающий в начале хода юнита
        "eff_poison": {
            ...BASE_EFFECT_STATS,
            polarity: "debuff",
            type: "tick_effect", // Тип: тикающий эффект
            trigger_phase: "on_turn_start", // Срабатывает строго в начале хода носителя
            desc_loc_key: "eff_poison_desc",
            actions: [
                {
                    type: "deal_damage",
                    // Урон зависит от атаки того, кто НАЛОЖИЛ (Caster)
                    value_formula: "0.5 * C.atk",
                    can_crit: false
                }
            ]
        },
        "eff_stun": {
            ...BASE_EFFECT_STATS,
            polarity: "debuff",
            type: "control", // Тип: контроль (блокирует действия)
            desc_loc_key: "eff_stun_desc"
        }
    },


    skills: {
        // 1. ПАССИВНЫЙ НАВЫК: Модификатор статов (уже заложен у вас)
        "queen_will": {
            title_loc: { ru: "Воля Королевы", en: "Queen's Will" },
            icon: "👑",
            type: "passive",
            trigger: { event: "on_battle_start" },
            targeting: { side: "self", selector: "self" },
            visual_color: "white", // Золотой визуал баффа
            levels: [
                {
                    level: 1,
                    desc_loc: { ru: "Повышает атаку на 15%.", en: "Increases attack by 15%." },
                    actions: [
                        {
                            type: "apply_effect",
                            targeting: "self",
                            effect_id: "eff_queen_buff"
                        }
                    ]
                }
            ],
            // animations: {
            //     left: [ 'assets/images/skills/queen_will/queen_will.png' ],
            //     right: [ 'assets/images/skills/queen_will/queen_will.png' ]
            // },
        },

        // 2. АКТИВНЫЙ ТОЧЕЧНЫЙ НАВЫК: Одиночный выстрел снарядом на врага
        "spider_shot": {
            title_loc: { ru: "Плевок паутиной", en: "Spider Shot" },
            icon: "🕸️",
            type: "active",
            energy_cost: 0,
            trigger: { event: "on_turn_active" },
            targeting: {
                side: "enemies",
                selector: "single",
                target_mode: "unit",    // Требует тапа строго по юниту
                cast_range: 3,          // Дистанция каста в гексах
                aoe_radius: 0           // Точечный удар по одной цели
            },
            projectile_id: 'spider_projectile',
            visual_color: "blue",       // Синяя вспышка при контакте
            levels: [
                {
                    level: 1,
                    desc_loc: { ru: "Наносит 100% урона и отравляет цель.", en: "Deals 100% damage and poisons the target." },
                    actions: [
                        {
                            type: "deal_damage",
                            value_formula: "1.0 * A.atk",
                            can_crit: true
                        },
                        {
                            type: "apply_effect",
                            targeting: "targets",
                            effect_id: "eff_poison",
                            duration: 3000,      // Живет 3 секунды / 3 виртуальных хода
                            tick_interval: 1000  // Тикает каждую 1 секунду / 1 виртуальный ход
                        }
                    ]
                }
            ],
            // animations: { // Анимация удара молнии в эпицентре взрыва
            //     left: [ 'assets/images/skills/thunder/strike_1.png' ],
            //     right: [ 'assets/images/skills/thunder/strike_1.png' ] // взрыву AoE сторона может быть не важна
            // },
        },

        // 3. АКТИВНЫЙ МАССОВЫЙ НАВЫК: Громовой удар (ВАШ СОХРАНЕННЫЙ КОД С УРОВНЯМИ)
        "thunder_strike": {
            title_loc: { ru: "Карающий Раскат", en: "Thunder Strike" },
            icon: "⚡",
            type: "ultimate",
            energy_cost: 100,
            trigger: { event: "on_turn_ultimate" },
            targeting: {
                side: "enemies",
                selector: "all",
                target_mode: "tile",    // Разрешает тапнуть на любой гекс карты (даже пустой)
                cast_range: 3,          // Дистанция заброса магии
                aoe_radius: 1           // Накрывает эпицентр + 6 соседних гексов вокруг
            },
            visual_color: "orange",     // Оранжевый пульсирующий круг взрыва
            levels: [
                {
                    level: 1,
                    desc_loc: { ru: "Наносит 200% урона по всем врагам.", en: "Deals 200% AoE damage to all enemies." },
                    actions: [
                        {
                            type: "deal_damage",
                            value_formula: "2.0 * A.atk",
                            can_crit: true
                        }
                    ]
                },
                {
                    level: 2,
                    desc_loc: { ru: "Наносит 220% урона по всем врагам и с шансом 50% накладывает дебафф.", en: "Deals 220% AoE damage and has a 50% chance to apply a debuff." },
                    actions: [
                        {
                            type: "deal_damage",
                            value_formula: "2.2 * A.atk",
                            can_crit: true
                        },
                        {
                            type: "apply_effect",
                            targeting: "targets",
                            effect_id: "eff_chain_lightning",
                            duration: 2,
                            params: { chance: 50 }
                        }
                    ]
                },
                {
                    level: 3,
                    desc_loc: { ru: "Наносит 250% урона. Дебафф накладывается гарантированно.", en: "Deals 250% AoE damage. Debuff application is guaranteed." },
                    actions: [
                        {
                            type: "deal_damage",
                            value_formula: "2.5 * A.atk",
                            can_crit: true
                        },
                        {
                            type: "apply_effect",
                            targeting: "targets",
                            effect_id: "eff_chain_lightning",
                            duration: 2,
                            params: { chance: 100 }
                        }
                    ]
                }
            ]
        },

        // 4. АКТИВНЫЙ МГНОВЕННЫЙ НАВЫК: Бафф и исцеление на себя
        "inner_light": {
            title_loc: { ru: "Внутренний свет", en: "Inner Light" },
            icon: "✨",
            type: "active",
            energy_cost: 40,
            trigger: { event: "on_turn_active" },
            targeting: {
                side: "allies",
                selector: "self",
                target_mode: "self",    // Применяется мгновенно на себя, не требует тапа по карте
                cast_range: 0,
                aoe_radius: 0
            },
            visual_color: "green",      // Зеленая вспышка хила + золотой бафф
            levels: [
                {
                    level: 1,
                    desc_loc: { ru: "Восстанавливает здоровье и дает щит.", en: "Restores HP and grants a shield." },
                    actions: [
                        {
                            type: "heal",
                            value_formula: "1.5 * A.atk"
                        },
                        {
                            type: "apply_effect",
                            targeting: "self",
                            effect_id: "eff_shield",
                            duration: 2000,
                            tick_interval: 2000
                        }
                    ]
                }
            ],
            // animations: { // Анимация сияния вокруг кастера
            //     left: [ 'assets/images/skills/inner_light/glow_1.png' ],
            //     right: [ 'assets/images/skills/inner_light/glow_1.png' ]
            // },
        },

        // 5. АКТИВНЫЙ НАВЫК ПОДДЕРЖКИ: Целевой хил и бафф на союзника
        "holy_blessing": {
            title_loc: { ru: "Святое благословение", en: "Holy Blessing" },
            icon: "🛡️",
            type: "active",
            energy_cost: 30,
            trigger: { event: "on_turn_active" },
            targeting: {
                side: "allies",
                selector: "single",
                target_mode: "unit",    // Требует тапа строго по юниту
                cast_range: 3,
                aoe_radius: 0
            },
            visual_color: "gold",       // Золотая вспышка баффа
            levels: [
                {
                    level: 1,
                    desc_loc: { ru: "Благословляет союзника, увеличивая атаку.", en: "Blesses an ally, increasing attack." },
                    actions: [
                        {
                            type: "apply_effect",
                            targeting: "targets",
                            effect_id: "eff_bless",
                            duration: 3000,
                            tick_interval: 1000
                        }
                    ]
                }
            ],
            // animations: { // Анимация наложения благословения
            //     left: [ 'assets/images/skills/blessing/cast_1.png' ],
            //     right: [ 'assets/images/skills/blessing/cast_1.png' ]
            // },
        },


        "build_elf_camp": {
            title_loc: { ru: "Построить Лагерь Эльфов", en: "Build Elf Camp" },
            icon: "🏹",
            type: "active",
            energy_cost: 0,
            trigger: { event: "on_click_cast" }, // Кастуется по нажатию из книги заклинаний
            targeting: {
                side: "neutral",
                selector: "single",
                target_mode: "empty_tile", // Требует тапа строго по пустой проходимой клетке
                cast_range: 2,             // Дистанция строительства вокруг героя
                aoe_radius: 0
            },
            levels: [
                {
                    level: 1,
                    desc_loc: {
                        ru: "Возводит Лагерь Эльфов на соседнем гексе. Требует: 500 золота, 10 дерева.",
                        en: "Erects an Elf Camp on an adjacent hex. Requires: 500 gold, 10 wood."
                    },
                    actions: [
                        {
                            type: "spawn_structure",
                            template_id: "elf_camp", // Что именно строим через ObjectManager
                        }
                    ]
                }
            ]
        },

        "skill_build": {
            "title_loc": { "ru": "Строительство", "en": "Build" },
            "icon": "🔨",
            "type": "active",
            "trigger": { "event": "on_click_cast" },
            "targeting": {
                "target_mode": "menu"
            },
            "levels": [
                {
                    "level": 1,
                    "desc_loc": { "ru": "Позволяет возводить походные сооружения.", "en": "Allows erecting structures." },
                    // Список ID зданий из AppState.objects, которые Эрин умеет строить
                    "allowed_structures": ["elf_camp", "ancient_ruins", "chest1"]
                }
            ]
        }
    },


    effects: {
        "eff_poison": {
            id: "eff_poison",
            name: "Яд",
            type: "damage_over_time",
            visual_color: "purple",    // Заглушка
            popup_text: "ЯД",
            formula: "10",
            width: 32,
            height: 32,
            frameDuration: 80,
            // animations: [ // ПЛОСКИЙ МАССИВ КАДРОВ БЕЗ НАПРАВЛЕНИЙ
            //     'assets/images/effects/poison/poison_1.png'
            // ]
        },
        "eff_shield": {
            id: "eff_shield",
            name: "Щит света",
            type: "stat_modifier",
            visual_color: "gold",      // Заглушка
            popup_text: "+ЩИТ",
            stat: "armor",
            formula: "30",
            width: 40,
            height: 40,
            frameDuration: 90,
            // animations: [
            //     'assets/images/effects/shield/shield_1.png'
            // ]
        },
        "eff_bless": {
            id: "eff_bless",
            name: "Благословение",
            type: "stat_modifier",
            visual_color: "gold",
            popup_text: "БЛАГОСЛОВЕНИЕ",
            stat: "atk",
            formula: "A.atk * 0.2",
            width: 36,
            height: 36,
            frameDuration: 80,
            // animations: [
            //     'assets/images/effects/bless/bless_1.png'
            // ]
        },
        // ЭФФЕКТ ДЛЯ ПАССИВКИ РАФАЭЛЯ (ИСПРАВЛЕНО)
        "eff_queen_buff": {
            id: "eff_queen_buff",
            name: "Воля Королевы (Бафф)",
            type: "stat_modifier",
            visual_color: "white",     // Белый визуал баффа, как у вас в конфиге навыка
            popup_text: "ВОЛЯ КОРОЛЕВЫ",
            stat: "atk",               // Модифицирует атаку
            formula: "1.15",           // Множитель 1.15 (+15% к атаке)
            width: 32,
            height: 32,
            frameDuration: 80,
            animations: null           // Заглушка, пока нет картинок
        },
    },




    hero_elements: {
        "thunder": {title_loc: {...BASE_LANGUAGES, ru: "Молния", en: "Thunder"}, icon: "⚡", color: "#ffeb3b"},
        "light": {title_loc: {...BASE_LANGUAGES, ru: "Свет", en: "Light"}, icon: "☀️", color: "#fff"},
        "blood": {title_loc: {...BASE_LANGUAGES, ru: "Свет", en: "Light"}, icon: "☀️", color: "#FF0000"},
        "ice": {title_loc: {...BASE_LANGUAGES, ru: "Лёд", en: "Ice"}, icon: "❄️", color: "#cefcff"},
    },
    hero_categories: {
        "aoe": {title_loc: {...BASE_LANGUAGES, ru: "Урон по площади (AoE)", en: "AoE Damage"}},
        "heal": {title_loc: {...BASE_LANGUAGES, ru: "Лечение", en: "Healing"}}
    },


    classes: {
        // "tank": {
        //     title_loc: {...BASE_LANGUAGES, ru: "Танк", en: "Tank"},
        //     icon: "🛡️",
        //     desc_loc: {...BASE_LANGUAGES, ru: "Защищает союзников, впитывает урон", en: "Protects allies, absorbs damage"}
        // },
        // "dps": {
        //     title_loc: {...BASE_LANGUAGES, ru: "Боец (DPS)", en: "DPS"},
        //     icon: "⚔️",
        //     desc_loc: {...BASE_LANGUAGES, ru: "Наносит колоссальный урон", en: "Deals massive damage"}
        // },
        // "support": {
        //     title_loc: {...BASE_LANGUAGES, ru: "Поддержка", en: "Support"},
        //     icon: "🧪",
        //     desc_loc: {...BASE_LANGUAGES, ru: "Исцеляет и баффает команду", en: "Heals and buffs the team"}
        // },

        "mage": {
            id: "mage",
            name_loc: { ru: "Маг", en: "Mage" },

            // Формула расчета опыта для перехода на СЛЕДУЮЩИЙ уровень.
            // L — это текущий уровень персонажа. Формула: 100 * (L ^ 1.5)
            nextLevelXpFormula: "100 * Math.pow(L, 1.5)",

            // Статы, которые автоматически прибавляются к базовым при каждом левелапе
            statGainsPerLevel: {
                maxHp: 15,
                atk: 2,
                def: 1,
                maxEnergy: 10
            },

            // Дерево открытия и улучшения навыков по уровням
            skillUnlocks: [
                { level: 1, skillId: "queen_will", action: "unlock" },
                { level: 1, skillId: "thunder_strike", action: "unlock" },
                { level: 2, skillId: "thunder_strike", action: "upgrade" },
                { level: 3, skillId: "spider_shot", action: "unlock" },
            ]
        },

        "scout": {
            id: "scout",
            name_loc: { ru: "Следопыт", en: "Scout" },
            nextLevelXpFormula: "100 * Math.pow(L, 1.5)",

            statGainsPerLevel: {
                maxHp: 20,
                atk: 4,
                def: 2,
                maxEnergy: 5
            },

            skillUnlocks: [
                { level: 1, skillId: "skill_build", action: "unlock" },
                { level: 2, skillId: "spider_shot", action: "unlock" },
            ]
        }
    },


    dialogs : {
        "PROLOGUE_CINEMATIC": {
            "activation_conditions": [
                { "type": "flag", "param": "PROLOGUE_WATCHED", "value": false }
            ],
            "meta": {
                "group": "chapter_2_north",
                "type": "katscene"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_sea_ship.png",
                "actors_registry": [],
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1
            },
            "text_pages": [{
                "speaker_id": "NARRATOR",
                "expression": "normal",
                "text": {
                    "ru": "Холодные темные волны бьются о борт корабля, унося Рафаэля всё дальше от дома. Туда, где властвуют лишь вечные льды.",
                    "en": "Cold, dark waves batter the ship's hull, carrying Raphael further away from home. To a place ruled only by eternal ice."
                },
                "audio": "./assets/audio/sea_waves.mp3",
                "auto_advance_time": 4000,
                "fx": {
                    "scene_animation": "fx-fog",
                    "actor_animation": ""
                }
            },
                {
                    "speaker_id": "NARRATOR",
                    "expression": "normal",
                    "text": {
                        "ru": "Времени почти не осталось. Его подруга Луна угасает от неизлечимой болезни, и магия южных земель оказалась бессильна.",
                        "en": "Time is running out. His friend Luna is fading from an incurable illness, and the magic of the southern lands was powerless."
                    },
                    "audio": "",
                    "auto_advance_time": 4000,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "NARRATOR",
                    "expression": "normal",
                    "text": {
                        "ru": "Единственной зацепкой стали слова мутного незнакомца в таверне. Он клялся, что на Дальнем Севере живет скрытный дварф, знающий секрет исцеления.",
                        "en": "The only lead came from a shady stranger in a tavern. He swore that a reclusive dwarf lives in the Far North, holding the secret to the cure."
                    },
                    "audio": "",
                    "auto_advance_time": 5000,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "serious",
                    "text": {
                        "ru": "*Вздох*... Надеюсь, этот пьяница не соврал мне. Держись, Луна. Я найду этого дварфа, чего бы мне это ни стоило.",
                        "en": "*Sigh*... I hope that drunkard didn't lie to me. Hold on, Luna. I will find this dwarf, whatever the cost."
                    },
                    "audio": "",
                    "auto_advance_time": 4000,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                }
            ],
            "player_choices": [{
                "text": {
                    "ru": "",
                    "en": ""
                },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "triggers": [
                        { "type": "set_flag", "param": "PROLOGUE_WATCHED", "value": true }
                    ],
                    "next_scene": ""
                }
            }]
        },

        "SCENE_RAPHAEL_LANDING": {
            "activation_conditions": [],
            "meta": {
                "group": "chapter_2_north",
                "type": "active_dialog"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/frozen_shore.png",
                "actors_registry": [{
                    "id": "rafael",
                    "left": 15,
                    "top": 20,
                    "height": 70
                    },
                    {
                        "id": "ibragimsoresh",
                        "left": 65,
                        "top": 15,
                        "height": 75
                    }
                ],
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1
            },
            "text_pages": [{
                "speaker_id": "NARRATOR",
                "expression": "normal",
                "text": {
                    "ru": "Корабль спешно высаживает Рафаэля на обледенелый берег. Матросы даже не спускают трап до конца — испуганный капитан разворачивает судно и уплывает на полной скорости.",
                    "en": "The ship hastily drops Raphael off on the icy shore. The sailors don't even fully lower the gangplank — the terrified captain turns the ship around and flees at full speed."
                },
                "audio": "",
                "auto_advance_time": 0,
                "fx": {
                    "scene_animation": "fx-snow-particles",
                    "actor_animation": ""
                }
            },
                {
                    "speaker_id": "rafael",
                    "expression": "angry",
                    "text": {
                        "ru": "Эй! Вы куда?! Черт бы вас побрал, трусы!.. Ладно, назад дороги всё равно нет. Только лед и... стоп, кто это там?",
                        "en": "Hey! Where are you going?! Damn you, cowards!.. Fine, there's no going back anyway. Only ice and... wait, who's that over there?"
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "ibragimsoresh",
                    "portrait_side": "right",
                    "expression": "aggressive",
                    "text": {
                        "ru": "Свежая плоть приплыла на убой! Южанин, ты совершил ошибку, ступив на эту землю. Здесь ты найдешь только свою смерть!",
                        "en": "Fresh meat arrives for the slaughter! Southerner, you made a mistake stepping onto this land. You will find nothing but death here!"
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": "fx-actor-shiver"
                    }
                },
                {
                    "speaker_id": "ibragimsoresh",
                    "portrait_side": "right",
                    "expression": "laugh",
                    "text": {
                        "ru": "Я заберу твою искру и скормлю ее ледяным ветрам! Умри!",
                        "en": "I will take your spark and feed it to the icy winds! Die!"
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": "fx-actor-attack"
                    }
                }
            ],
            "player_choices": [{
                "text": {
                    "ru": "[Магия] Защититься огненным щитом и контратаковать",
                    "en": "[Magic] Defend with a fire shield and counterattack"
                },
                "kind": "aggressive",
                "locked_behavior": "hide",
                "conditions": [],
                "on_success": {
                    "triggers": [],
                    "next_scene": ""
                }
            }]
        },

        "SCENE_NORTH_HUB_INIT": {
            "activation_conditions": [],
            "meta": {
                "group": "chapter_2_north",
                "type": "passive_dialog"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/frozen_shore.png",
                "actors_registry": [],
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1
            },
            "text_pages": [{
                "speaker_id": "NARRATOR",
                "expression": "normal",
                "text": {
                    "ru": "Вспышка мощного заклинания Рафаэля отбрасывает безумного воина назад. Ибрагимсореш, злобно рыча, отступает во тьму ледника. Опасность миновала... пока что.",
                    "en": "A flash of Raphael's powerful spell forces the mad warrior back. Snarling viciously, Ibragimsoresh retreats into the glacier's shadow. The danger is gone... for now."
                },
                "audio": "",
                "auto_advance_time": 0,
                "fx": {
                    "scene_animation": "fx-flash",
                    "actor_animation": ""
                }
            }],
            "player_choices": [{
                "text": {
                    "ru": "",
                    "en": ""
                },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "triggers": [],
                    "next_scene": ""
                }
            }]
        },

        // "SCENE_NORTH_HUB": {
        //     "activation_conditions": [],
        //     "meta": {
        //         "group": "chapter_2_north",
        //         "type": "hub"
        //     },
        //     "window_settings": {
        //         "display_type": "fullscreen",
        //         "backgroundImage": "./assets/images/bg/north_camp.png",
        //         "panel_height": 40,
        //         "avatar_width": 20,
        //         "panel_bottom": 1,
        //         "actors_registry": [{
        //             "id": "erin",
        //             "left": 45,
        //             "top": 20,
        //             "height": 70
        //         }]
        //     },
        //     "text_pages": [{
        //         "speaker_id": "NARRATOR",
        //         "expression": "normal",
        //         "text": {
        //             "ru": "Неподалеку от места стычки Рафаэль замечает укрытие. Там у слабого костра греется лунная эльфийка Эрин. Вы можете подойти к ней.",
        //             "en": "Not far from the skirmish, Raphael spots a shelter. Erin, a moon elf, is warming herself by a weak campfire. You can approach her."
        //         },
        //         "audio": "",
        //         "auto_advance_time": 0,
        //         "fx": {
        //             "scene_animation": "",
        //             "actor_animation": ""
        //         }
        //     }],
        //     "player_choices": []
        // },

        "character_dialog_erin": {
            "activation_conditions": [],
            "meta": {
                "group": "character_hubs",
                "type": "character_root",
                "owner_hero_id": "erin"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [],
            "player_choices": [
                {
                    "text": {
                        "ru": "🤝 [Знакомство] Привет, я Рафаэль и не враг тебе...",
                        "en": "🤝 [Introduction] Hello, I am Raphael, and I am no enemy to you..."
                    },
                    "kind": "neutral",
                    "repeatable": false,
                    "conditions": [
                        { "type": "flag", "param": "ERIN_MET_PLAYER", "value": false }
                    ],
                    "on_success": {
                        "triggers": [
                            { "type": "set_flag", "param": "ERIN_MET_PLAYER", "value": true }
                        ],
                        "next_scene": "SCENE_ERIN_FIRST_MEETING"
                    }
                },
                {
                    "text": {
                        "ru": "❓ [Вопросы] Спросить у Эрин...",
                        "en": "❓ [Questions] Ask Erin..."
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [
                        { "type": "flag", "param": "ERIN_MET_PLAYER", "value": true }
                    ],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "character_dialog_erin_questions"
                    }
                },
                {
                    "text": {
                        "ru": "❄️ Эрин, тебе нужна помощь?",
                        "en": "❄️ Erin, do you need help?"
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [
                        { "type": "flag", "param": "ERIN_MET_PLAYER", "value": true }
                    ],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "SCENE_ERIN_ASK_HELP"
                    }
                },
                {
                    "text": {
                        "ru": "❌ Эрин, нам нужно расстаться. Ты должна покинуть отряд.",
                        "en": "❌ Erin, we need to part ways. You must leave the party."
                    },
                    "kind": "bad",
                    "repeatable": true,
                    "conditions": [
                        { "type": "in_party", "character_id": "erin", "leader_id": "rafael", "value": true }
                    ],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "SCENE_ERIN_DISMISS"
                    }
                },
                {
                    "text": {
                        "ru": "🚪 Мне пора идти.",
                        "en": "🚪 I must go."
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [],
                    "on_success": {
                        "triggers": [],
                        "next_scene": ""
                    }
                }
            ]
        },

        "character_dialog_erin_questions": {
            "activation_conditions": [],
            "meta": {
                "group": "character_hubs",
                "type": "character_root",
                "owner_hero_id": "erin"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [],
            "player_choices": [
                {
                    "text": {
                        "ru": "❄️ Что ты знаешь об этом месте?",
                        "en": "❄️ What do you know about this place?"
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "SCENE_ERIN_ASK_LORE"
                    }
                },
                {
                    "text": {
                        "ru": "⚔️ Почему на меня напали?",
                        "en": "⚔️ Why was I attacked?"
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "SCENE_ERIN_ASK_ATTACK"
                    }
                },
                {
                    "text": {
                        "ru": "↩️ Назад",
                        "en": "↩️ Back"
                    },
                    "kind": "neutral",
                    "repeatable": true,
                    "conditions": [],
                    "on_success": {
                        "triggers": [],
                        "next_scene": "character_dialog_erin"
                    }
                }
            ]
        },

        "SCENE_ERIN_FIRST_MEETING": {
            "activation_conditions": [],
            "meta": { "group": "character_hubs", "type": "passive_dialog" },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40, "avatar_width": 20, "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [{
                "speaker_id": "erin",
                "portrait_side": "right",
                "expression": "normal",
                "text": {
                    "ru": "Рафаэль?.. Не враг, значит. Что ж, в этих краях сложно быть кем-то, кроме врагов. Я Эрин. Раз уж ты выжил после встречи с Ибрагимом, у костра тебе найдется место.",
                    "en": "Raphael?.. Not an enemy, then. Well, in these parts, it's hard to be anything but enemies. I am Erin. Since you survived meeting Ibrahim, you're welcome by the fire."
                }
            }],
            "player_choices": [{
                "text": { "ru": "", "en": "" },
                "kind": "neutral",
                "conditions": [],
                "on_success": { "triggers": [], "next_scene": "character_dialog_erin" }
            }]
        },

        "SCENE_ERIN_ASK_LORE": {
            "activation_conditions": [],
            "meta": { "group": "character_hubs", "type": "passive_dialog" },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40, "avatar_width": 20, "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [{
                "speaker_id": "erin",
                "portrait_side": "right",
                "expression": "sad",
                "text": {
                    "ru": "Я знаю лишь то, что здесь чертовски холодно. Я и сама мало что ведаю об этих ледниках... Древние проклятия и лед, больше ничего.",
                    "en": "I only know that it is freezing cold here. I don't know much about these glaciers myself... Ancient curses and ice, nothing more."
                }
            }],
            "player_choices": [{
                "text": { "ru": "", "en": "" },
                "kind": "neutral",
                "conditions": [],
                "on_success": { "triggers": [], "next_scene": "character_dialog_erin_questions" }
            }]
        },

        "SCENE_ERIN_ASK_ATTACK": {
            "activation_conditions": [],
            "meta": { "group": "character_hubs", "type": "passive_dialog" },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40, "avatar_width": 20, "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [{
                "speaker_id": "erin",
                "portrait_side": "right",
                "expression": "normal",
                "text": {
                    "ru": "Ибрагимсореш безумен, как и все, кто задерживается тут слишком долго. Но почему он нападает на каждого встречного — мне неизвестно.",
                    "en": "Ibragimsoresh is mad, just like everyone who stays here too long. But why he attacks everyone he sees is unknown to me."
                }
            }],
            "player_choices": [{
                "text": { "ru": "", "en": "" },
                "kind": "neutral",
                "conditions": [],
                "on_success": { "triggers": [], "next_scene": "character_dialog_erin_questions" }
            }]
        },

        "SCENE_ERIN_ASK_HELP": {
            "activation_conditions": [],
            "meta": { "group": "character_hubs", "type": "passive_dialog" },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40, "avatar_width": 20, "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [{
                "speaker_id": "erin",
                "portrait_side": "right",
                "expression": "serious",
                "text": {
                    "ru": "Помощь? Похоже, ты перепутал роли, маг. Это тебе нужна моя милость, если ты планируешь выжить в этих землях. Ладно, я иду с тобой, но не заставляй меня жалеть об этом.",
                    "en": "Help? Looks like you got the roles mixed up, mage. It is you who needs my grace if you plan to survive in these lands. Fine, I'm coming with you, but don't make me regret this."
                }
            }],
            "player_choices": [{
                "text": {
                    "ru": "Добро пожаловать в отряд, Эрин. (Взять в группу)",
                    "en": "Welcome to the party, Erin. (Recruit)"
                },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "next_scene": "character_dialog_erin",
                    "triggers": [
                        {
                            "type": "add_to_party",
                            "character_id": "erin",
                            "leader_id": "rafael",
                            "count": 1,
                            "is_new": false
                        }
                    ]
                }
            }]
        },

        "SCENE_ERIN_DISMISS": {
            "activation_conditions": [],
            "meta": { "group": "character_hubs", "type": "passive_dialog" },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/north_camp.png",
                "panel_height": 40, "avatar_width": 20, "panel_bottom": 1,
                "actors_registry": [{ "id": "erin", "left": 45, "top": 20, "height": 70 }]
            },
            "text_pages": [{
                "speaker_id": "erin",
                "portrait_side": "right",
                "expression": "serious",
                "text": {
                    "ru": "Решил идти дальше без меня, маг? Что ж, дело твоё. Моя сталь останется здесь, если снова погрязнёшь в неприятностях — ты знаешь, где меня искать. Удачи.",
                    "en": "Decided to go on without me, mage? Well, it's your choice. My steel will stay here. If you get into trouble again, you know where to find me. Good luck."
                }
            }],
            "player_choices": [{
                "text": { "ru": "Прощай, Эрин. (Покинуть отряд)", "en": "Goodbye, Erin. (Leave party)" },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "next_scene": "", // Закрывает диалоговое окно
                    "triggers": [
                        // =========================================================================
                        // 🚀 СЮЖЕТНЫЙ РОСПУСК: Высаживает Эрин на карту рядом с Рафаэлем
                        // =========================================================================
                        {
                            "type": "remove_from_party",
                            "character_id": "erin",
                            "leader_id": "rafael"
                        }
                    ]
                }
            }]
        }

    },


    triggers: {
        // 1. Персонаж rafael приходит в клетку 3:2 —> на клетке 5:0 спаунится персонаж gromm
        "trig_gromm_spawn": {
            id: "trig_gromm_spawn",
            conditions: [
                {
                    type: "tile_enter",
                    character_role: "subject",
                    character_id: "rafael", // ИСПРАВЛЕНИЕ: Пишем ID проверяемого персонажа прямо сюда!
                    q: 3,
                    r: 2
                }
            ],
            actions: [
                {
                    type: "character_presence",
                    operation: "spawn",
                    character_id: "gromm4",
                    q: 5,
                    r: 0,
                    template: "gromm",
                }
            ]
        },

        // 2. Громм увидел Рафаэля -> диалог
        "trig_gromm_vision": {
            id: "trig_gromm_vision",
            conditions: [
                { type: "vision", character_role: "subject", target_role: "target", operator: "<=", distance: 3 },
                { type: "character_stat", character_role: "subject", param: "id", operator: "==", value: "gromm4" },
                { type: "character_stat", character_role: "target", param: "id", operator: "==", value: "rafael" },
            ],
            actions: [
                { type: "execute_open_dialogue", scene_id: "SCENE_RAPHAEL_LANDING", character1_role: "target", character2_role: "subject" }
            ]
        },

        // 3. Громм умер -> диалог
        "trig_gromm_death": {
            id: "trig_gromm_death",
            conditions: [
                { type: "character_dead", character_role: "subject", character_id: "gromm4" }
            ],
            actions: [
                { type: "execute_open_dialogue", scene_id: "SCENE_NORTH_HUB_INIT" }
            ]
        },

        // 4. Начался диалог SCENE_NORTH_HUB_INIT -> активация квеста
        "trig_activate_quest": {
            id: "trig_activate_quest",
            conditions: [
                { type: "dialogue_start", scene_id: "SCENE_NORTH_HUB_INIT" }
            ],
            actions: [
                { type: "modify_quest_state", operation: "set_quest_status", quest_id: "quest_ambush_reason", value: "active" }
            ]
        }
    },


    quests: {
        "quest_moon_medicine": {
            id: "quest_moon_medicine",
            type: "global",
            status: "active", // active, completed, failed
            // Локализованные мета-данные самого квеста
            title: {
                en: "Find Medicine for Luna",
                ru: "Найти лекарства для Луны"
            },
            description: {
                en: "Luna is sick. Search the ruins or camp.",
                ru: "Луна больна. Обыщи руины или лагерь."
            },

            // Настройка цепочки задач
            is_sequential: true, // ЕСЛИ TRUE: Подквесты выполняются СТРОГО по очереди!

            // Список подзадач (Objectives)
            objectives: [
                {
                    id: "talk_to_healer",
                    type: "boolean",
                    status: "active", // active, completed, locked (если заблокирован очередью)
                    title: {
                        en: "Talk to the Camp Healer",
                        ru: "Поговорить с лекарем в лагере"
                    }
                },
                {
                    id: "collect_herbs",
                    type: "count",
                    status: "locked", // Изначально заблокирован, пока активен первый подквест
                    current: 0,
                    target: 3,
                    title: {
                        en: "Collect Rare Herbs",
                        ru: "Собрать редкие травы"
                    }
                }
            ]
        },
        "quest_ambush_reason": {
            id: "quest_ambush_reason",
            type: "local", // Локальный квест
            status: "active",
            title: {
                en: "Find Out Why I Was Attacked",
                ru: "Узнать, почему на меня напали"
            },
            description: {
                en: "The bandits knew exactly where I would be. Search their camp for clues or a contract.",
                ru: "Бандиты точно знали, где я буду. Обыщи их лагерь в поисках улик или контракта."
            }
        },
        "quest_dwarf_info": {
            id: "quest_dwarf_info",
            type: "local",
            status: "active",
            title: {
                en: "Learn About the Dwarf",
                ru: "Разузнать что-то о дварфе"
            },
            description: {
                en: "A mysterious dwarf was seen carrying ancient artifacts. Talk to the tavern keeper.",
                ru: "Таинственного дварфа видели с древними артефактами. Поговори с трактирщиком."
            }
        },
        "quest_sail_north": {
            id: "quest_sail_north",
            type: "global",
            status: "completed", // УЖЕ ВЫПОЛНЕННЫЙ КВЕСТ
            title: {
                en: "Sail to the North",
                ru: "Приплыть на Север"
            },
            description: {
                en: "Hire a ship and navigate through the icy waters to reach the Northern shores.",
                ru: "Наими корабль и пройди сквозь ледяные воды, чтобы достичь Северных берегов."
            }
        },
    },


    ui: {
        landscape: [
            {
                "id": "main_menu",
                "backgroundImage": "./assets/images/main_menu_dark1.png",
                "bg_width": 1200,
                "scrollable": false,
                "active_width": 1000,
                "home_hero_layout": {
                    "top": "10%",
                    "left": "45%",
                    "height": "120%",
                    "zIndex": 3,
                    "animation": "idle_pulse"
                },
                "widgets": [
                    {
                        "id": "btn_new_game",
                        "type": "button",
                        "label_loc_key": "btn_new_game_label",
                        "action": "new_game",
                        "layout": {
                            "top": "100px",
                            "left": "15px",
                            "width": "160px",
                            "height": "50px",
                            "shape": "square",
                            // "backgroundImage": "url('./assets/icons/play_button.png')",
                            // "textColor": "#ffd166",
                            // "textColor": "#b7a4f2",
                            "textColor": "#E60000",
                            "textSize": "18px",
                            "textPosition": "center",
                            "backgroundColor": "rgba(0, 0, 0, .6)",
                            "border": "1px solid #E60000",
                            "borderRadius": "4px",
                            "zIndex": 10
                        }
                    },
                    {
                        id: "btn_load_main",
                        type: "button",
                        label_loc_key: "menu_load_label",
                        action: "game_load",
                        "layout": {
                            "top": "160px",
                            "left": "15px",
                            "width": "160px",
                            "height": "50px",
                            "shape": "square",
                            // "backgroundImage": "url('./assets/icons/play_button.png')",
                            // "textColor": "#ffd166",
                            // "textColor": "#b7a4f2",
                            "textColor": "#E60000",
                            "textSize": "18px",
                            "textPosition": "center",
                            "backgroundColor": "rgba(0, 0, 0, .6)",
                            "border": "1px solid #E60000",
                            "borderRadius": "4px",
                            "zIndex": 10
                        }
                    },
                    {
                        id: "btn_settings_main",
                        type: "button",
                        label_loc_key: "menu_settings_label",
                        action: "open_settings",
                        "layout": {
                            "top": "220px",
                            "left": "15px",
                            "width": "160px",
                            "height": "50px",
                            "shape": "square",
                            // "backgroundImage": "url('./assets/icons/play_button.png')",
                            // "textColor": "#ffd166",
                            // "textColor": "#b7a4f2",
                            "textColor": "#E60000",
                            "textSize": "18px",
                            "textPosition": "center",
                            "backgroundColor": "rgba(0, 0, 0, .6)",
                            "border": "1px solid #E60000",
                            "borderRadius": "4px",
                            "zIndex": 10
                        }
                    },
                    {
                        id: "btn_gallery_main",
                        type: "button",
                        label_loc_key: "menu_gallery_label",
                        action: "open_player_gallery",
                        "layout": {
                            "top": "280px",
                            "left": "15px",
                            "width": "160px",
                            "height": "50px",
                            "shape": "square",
                            // "backgroundImage": "url('./assets/icons/play_button.png')",
                            // "textColor": "#ffd166",
                            // "textColor": "#b7a4f2",
                            "textColor": "#E60000",
                            "textSize": "18px",
                            "textPosition": "center",
                            "backgroundColor": "rgba(0, 0, 0, .6)",
                            "border": "1px solid #E60000",
                            "borderRadius": "4px",
                            "zIndex": 10
                        }
                    },
                ]
            },

            {
                id: "in_game_menu",
                backgroundImage: "", // Оставляем пустым, вместо картинки зададим полупрозрачный фон в виджете
                scrollable: false,
                zIndex: 5000,
                widgets: [
                    // 1. Задний фон-затемнитель (Модальное окно по центру)
                    {
                        id: "menu_screen_overlay",
                        type: "panel",
                        layout: {
                            top: "0",
                            left: "0",
                            width: "100%", // Растягиваем строго на всю ширину экрана
                            height: "100%", // Растягиваем строго на всю высоту экрана
                            backgroundColor: "rgba(0, 0, 0, 0.6)", // Строгое плоское затемнение без размытий
                            zIndex: 550 // Садится выше карты игры, но ниже самой модалки с кнопками
                        }
                    },
                    {
                        id: "menu_modal_bg",
                        type: "panel",
                        layout: {
                            top: "50% - 180px",
                            left: "50% - 150px",
                            width: "300px",
                            height: "360px",
                            backgroundColor: "rgba(15, 20, 28, 0.95)",
                            border: "2px solid #34495e",
                            borderRadius: "12px",
                            zIndex: 600
                        }
                    },
                    // 2. Кнопка СОХРАНИТЬ (Save Game)
                    {
                        id: "btn_save",
                        type: "button",
                        label_loc_key: "menu_save_label",
                        action: "game_save",
                        layout: {
                            top: "50% - 140px",
                            left: "50% - 110px",
                            width: "220px",
                            height: "44px",
                            backgroundColor: "rgba(44, 62, 80, 0.6)",
                            border: "1px solid #3a4759",
                            borderRadius: "6px",
                            textColor: "#fff",
                            textSize: "14px",
                            zIndex: 610
                        }
                    },
                    // 3. Кнопка ЗАГРУЗИТЬ (Load Game)
                    {
                        id: "btn_load",
                        type: "button",
                        label_loc_key: "menu_load_label",
                        action: "game_load",
                        layout: {
                            top: "50% - 85px",
                            left: "50% - 110px",
                            width: "220px",
                            height: "44px",
                            backgroundColor: "rgba(44, 62, 80, 0.6)",
                            border: "1px solid #3a4759",
                            borderRadius: "6px",
                            textColor: "#fff",
                            textSize: "14px",
                            zIndex: 610
                        }
                    },
                    {
                        "id": "btn_settings",
                        "type": "button",
                        "label_loc_key": "menu_settings_label",
                        "action": "open_settings",
                        "layout": {
                            "top": "50% - 30px",
                            "left": "50% - 110px",
                            "width": "220px",
                            "height": "44px",
                            "backgroundColor": "rgba(44, 62, 80, 0.6)",
                            "border": "1px solid #3a4759",
                            "borderRadius": "6px",
                            "textColor": "#fff",
                            "textSize": "14px",
                            "zIndex": 610
                        }
                    },
                    // 4. Кнопка ПОЛНЫЙ ЭКРАН (Toggle Fullscreen)
                    // {
                    //     id: "btn_fullscreen",
                    //     type: "button",
                    //     label_loc_key: "menu_fullscreen_label",
                    //     action: "toggle_fullscreen",
                    //     layout: {
                    //         top: "50% - 30px",
                    //         left: "50% - 110px",
                    //         width: "220px",
                    //         height: "44px",
                    //         backgroundColor: "rgba(44, 62, 80, 0.6)",
                    //         border: "1px solid #3a4759",
                    //         borderRadius: "6px",
                    //         textColor: "#ffd166", // Выделим цветом системную настройку
                    //         textSize: "14px",
                    //         zIndex: 610
                    //     }
                    // },
                    // // 5. Кнопка ВКЛ/ВЫКЛ ЗВУК (Mute/Unmute Audio)
                    // {
                    //     id: "btn_mute_sound",
                    //     type: "button",
                    //     label_loc_key: "menu_mute_label",
                    //     action: "toggle_sound",
                    //     layout: {
                    //         top: "50% + 25px",
                    //         left: "50% - 110px",
                    //         width: "220px",
                    //         height: "44px",
                    //         backgroundColor: "rgba(44, 62, 80, 0.6)",
                    //         border: "1px solid #3a4759",
                    //         borderRadius: "6px",
                    //         textColor: "#fff",
                    //         textSize: "14px",
                    //         zIndex: 610
                    //     }
                    // },
                    // 6. Кнопка ВЕРНУТЬСЯ В ИГРУ (Close/Resume)
                    {
                        id: "btn_resume_game",
                        type: "button",
                        label_loc_key: "menu_resume_label",
                        action: "close_menu",
                        layout: {
                            top: "50% + 100px",
                            left: "50% - 110px",
                            width: "220px",
                            height: "40px",
                            backgroundColor: "rgba(192, 57, 43, 0.5)", // Мягкий красный цвет для кнопки закрытия
                            border: "1px solid #c0392b",
                            borderRadius: "6px",
                            textColor: "#fff",
                            textSize: "13px",
                            zIndex: 610
                        }
                    }
                ]
            }

        ]

    },

    localization: {
        ui: {
            "en": {
                "btn_new_game_label": "NEW GAME",
                "menu_save_label": "SAVE GAME",
                "menu_load_label": "LOAD GAME",
                "menu_fullscreen_label": "FULLSCREEN",
                "menu_mute_label": "SOUND: ON/OFF",
                "menu_resume_label": "RESUME GAME",
                "menu_settings_label": "Settings",
                "menu_gallery_label": "Gallery",

                "btn_game_settings": "GAME SETTINGS",

                "game_language": "Game Language",
                "full_screen": "🖥️ Fullscreen",
                "not_full_screen": "Display Mode",

                "music": "🎵 Music",
                "sfx": "⚔️ SFX",
                "speech": "💬 Speech",

                "saveExit": "⬅️ Save & Exit",

                "select_save_slot": "Select Save Slot",
                "no_save_slots": "No save slots found",
                "saves_back": "⬅️ Back",

                "gallery": "🏆 GALLERY",
                "gallery_empty": "Gallery empty. Explore the map to find secrets!",
                "gallery_description": "Collectible posters, secret scrolls, and unlocked game lore",
            },
            "ru": {
                "btn_new_game_label": "НОВАЯ ИГРА",
                "menu_save_label": "СОХРАНИТЬ",
                "menu_load_label": "ЗАГРУЗИТЬ",
                "menu_fullscreen_label": "ПОЛНЫЙ ЭКРАН",
                "menu_mute_label": "ЗВУК: ВКЛ/ВЫКЛ",
                "menu_resume_label": "ВЕРНУТЬСЯ",
                "menu_settings_label": "НАСТРОЙКИ",
                "menu_gallery_label": "Галерея",

                "btn_game_settings": "НАСТРОЙКИ ИГРЫ",

                "game_language": "Язык интерфейса",
                "full_screen": "🖥️ Развернуть",
                "not_full_screen": "Экранный режим",

                "music": "🎵 Музыка",
                "sfx": "⚔️ Эффекты",
                "speech": "💬 Озвучка",

                "saveExit": "⬅️ Сохранить и выйти",

                "select_save_slot": "Выберите сохранение",
                "no_save_slots": "Нет доступных сохранений",
                "saves_back": "⬅️ Назад",

                "gallery": "🏆 ГАЛЕРЕЯ",
                "gallery_empty": "Галерея пуста. Находите секреты на карте мира!",
                "gallery_description": "Коллекционные постеры, секретные записки и открытый лор вселенной",
            }
        },

        interactions: {
            "en": {
                "hire_ship": "Hire корабль",
                "board_ship": "Board Ship",
                "disembark_ship": "Disembark",

                "manage": "Manage",
                "capture": "Capture",

                "trade": "Trade",
                "talk": "Talk",
                "enter": "Enter",
                "loot": "Loot",
                "stop": "Stop",

                "sell": "Sell",
                "buy": "Buy",
                "deal_balance": "Accept Deal",
                "deal": "Accept Deal",

                "you_pay": "You PAY",
                "you_receive": "You RECEIVE",
            },
            "ru": {
                "hire_ship": "Нанять корабль",
                "board_ship": "Сесть в корабль",
                "disembark_ship": "Высадиться на берег",

                "manage": "Управление",
                "capture": "Захватить",

                "trade": "Торговля",
                "talk": "Диалог",
                "enter": "Войти",
                "loot": "Обыскать",
                "stop": "Стоп",

                "sell": "Продажа",
                "buy": "Покупка",
                "deal": "Заключить Сделку",
                "deal": "Заключить Сделку",

                "you_pay": "Вы ЗАПЛАТИТЕ",
                "you_receive": "Вы ПОЛУЧИТЕ",
            }
        },

        trade: {
            "en": {
                "trade_header": "Trade",
                "current_deal": "⚖️ Current deal",

                "sell": "Sell",
                "buy": "Buy",
                "deal": "Accept Deal",

                "you_pay": "You PAY",
                "you_receive": "You RECEIVE",
                "deal_balance": "Deal Balance",
            },
            "ru": {
                "trade_header": "Торговля",
                "current_deal": "⚖️ ТЕКУЩИЙ ОБМЕН",

                "sell": "Продажа",
                "buy": "Покупка",
                "deal": "Заключить Сделку",

                "you_pay": "Вы ЗАПЛАТИТЕ",
                "you_receive": "Вы ПОЛУЧИТЕ",
                "deal_balance": "Баланс сделки",
            }
        },

        editor: {
            "en": {
                "": "",
            },
            "ru": {
                "": "",
            }
        },

        "stats": {
            "en": {
                "exp": "⭐ Exp",
                "hp": "❤️ HP",
                "energy": "💙 MP",
                "atk": "⚔️ Attack",
                "def": "🛡️ Armor",
                "speed": "🥾 Speed",
                "crit": "⚡ Crit"
            },
            "ru": {
                "exp": "⭐ Опыт",
                "hp": "❤️ Здоровье",
                "energy": "💙 Мана",
                "atk": "⚔️ Атака",
                "def": "🛡️ Защита",
                "speed": "🥾 Скорость",
                "crit": "⚡ Крит"
            },
        },

        map: {
            "en": {
                "province": "Province",
                "owner": "Owner",
            },
            "ru": {
                "province": "Провинция",
                "owner": "Владелец",
            }
        },

        resources: {
            "en": {
                "gold": "Gold",
                "wood": "Wood",
                "ore": "Ore",
                "food": "Food",
            },
            "ru": {
                "gold": "Золото",
                "wood": "Древесина",
                "ore": "Железо",
                "food": "Провизия",
            }
        },

        factions: {
            "en": {
                "ruler": "Ruler",
                "sovereign": "Sovereign",
                "vassal": "Vassal",
                "politics": "POLITICS",
                "status": "Status",
                "territories": "Territories",
                "capital": "Capital",
                "finance_header": "FINANCES & INCOME",
                "population": "Population",
                "provinces": "PROVINCES",
                "no_provinces": "No controlled provinces",
                "diplomacy_header": "DIPLOMACY",
                "current_pact": "Current Pact",
                "opinion": "Opinion",
                "break_trade": "❌ Break Trade",
                "establish_trade": "Establish Trade",
                "break_alliance": "🤝 Break Alliance",
                "form_alliance": "🛡️ Form Alliance",
                "access_granted": "🥾 Access Granted by Alliance",
                "revoke_access": "❌ Revoke Military Access",
                "request_access": "🥾 Request Military Access",
                "propose_peace": "🕊️ Propose Peace",
                "demand_vassalage": "👑 Demand Vassalage",
                "diplomacy_back": "⬅️ Back to Report",
            },
            "ru": {
                "ruler": "Правитель",
                "sovereign": "Сюзерен",
                "vassal": "Вассал",
                "politics": "ПОЛИТИКА",
                "status": "Статус",
                "territories": "Территории",
                "capital": "Столица",
                "finance_header": "ФИНАНСЫ И ДОХОД",
                "population": "Население",
                "provinces": "ПРОВИНЦИИ",
                "no_provinces": "Нет подконтрольных провинций",
                "diplomacy_header": "ДИПЛОМАТИЯ",
                "current_pact": "Текущий пакт",
                "opinion": "Мнение",
                "break_trade": "❌ Разорвать торговлю",
                "establish_trade": "Заключить торговлю",
                "break_alliance": "🤝 Разорвать альянс",
                "form_alliance": "🛡️ Заключить альянс",
                "access_granted": "🥾 Проход открыт союзом",
                "revoke_access": "❌ Отозвать право прохода",
                "request_access": "🥾 Запросить право прохода",
                "propose_peace": "🕊️ Заключить мир",
                "demand_vassalage": "👑 Потребовать вассалитет",
                "diplomacy_back": "⬅️ Назад к сводкам",
            }
        },

        objects: {
            "en": {
                "type_city": "City Stronghold",
                "type_mine": "Resource Mine",
                "type_port": "Commercial Port",

                "tab_info": "📋 Summary",

                "no_production": "No production",
                "resource_production": "Resource Production",
                "object_stats": "OBJECT STATS",
                "object_upgrade": "Building upgrade",
                "max_level_reached": "Max level reached",
                "upgrade_to": "Upgrade to Level",
                "current_rank": "Current Rank",
                "enemy_structure": "Enemy Structure",
                "recruit": "⚔️ Recruit",
                "garrison_hero_army": "HERO ARMY",
                "garrison_no_hero": "NO HERO PRESENT",
                "garrison_heroes": "Available",
                "garrison_units": "GARRISON",
            },
            "ru": {
                "type_city": "Город/Замок",
                "type_mine": "Ресурсная шахта",
                "type_port": "Торговый порт",

                "tab_info": "📋 Сводка",

                "no_production": "Нет производства",
                "resource_production": "Производство ресурсов",
                "object_stats": "Характеристики",
                "object_upgrade": "Улучшение здания",
                "max_level_reached": "Достигнут максимальный уровень",
                "upgrade_to": "Улучшить до Уровня",
                "current_rank": "Текущий уровень",
                "enemy_structure": "Чужой объект",
                "recruit": "⚔️ Нанять",
                "garrison_hero_army": "АРМИЯ ГЕРОЯ",
                "garrison_no_hero": "НЕТ ГЕРОЯ РЯДОМ",
                "garrison_heroes": "В наличии",
                "garrison_units": "ГАРНИЗОН",
            }
        },

        units: {
            "en": {
                "lvl": "Lvl",
                "corpse": "Corpse",
                "backpack": "Backpack",
                "empty_backpack": "Backpack is empty",
                "equip": "Equip",
                "equip": "",
                "skills": "Skills",
                "no_skills": "No skills available",
                "passive": "Passive",
                "cast": "Cast",
                "units": "⚔️ ARMY SQUADS",
                "no_units": "No recruited squads",
                "count": "Count",
                "dismiss": "Dismiss",
                "dismiss_confirm": "Dismiss",

            },
            "ru": {
                "lvl": "Ур",
                "corpse": "Труп",
                "backpack": "Рюкзак",
                "empty_backpack": "Рюкзак пуст",
                "equip": "Надеть",
                "equip": "",
                "skills": "Навыки",
                "no_skills": "Нет доступных навыков",
                "passive": "Пассивный",
                "cast": "Каст",
                "units": "⚔️ ОТРЯДЫ АРМИИ",
                "no_units": "Нет нанятых отрядов",
                "count": "Численность",
                "dismiss": "Уволить",
                "dismiss_confirm": "Распустить отряд",
            }
        },

        quests: {
            "en": {
                "no_active": "No active quests",
                "quest": "Quest",
                "global": "Global",
                "local": "Local",
                "journal": "Journal",
                "empty_journal": "No quests in journal",
                "status_completed": "Completed",
                "status_active": "Active",

                "objectives": "Objectives",
            },
            "ru": {
                "no_active": "Нет активных квестов",
                "quest": "Задание",
                "global": "Глобальный",
                "local": "Локальный",
                "journal": "Задания",
                "empty_journal": "Журнал заданий пуст",
                "status_completed": "Выполнено",
                "status_active": "Активен",

                "objectives": "Задачи",
            }
        }
    }
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

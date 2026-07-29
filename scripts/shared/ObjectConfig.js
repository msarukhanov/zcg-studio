export const ObjectConfig = {
    'city': {
        type: "city",
        name: "City",

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
                upgradeCost: { gold: 1000, wood: 20, ore: 5 },
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

        production: {gold:500},
        upgradeLevels: {
            2: {
                name: "Lorencia port",
                upgradeCost: { gold: 500},
                bonusProduction: {gold:200},
            }
        }
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




    "mine": {
        type: "mine",
        name: "Mine",

        blocksMovement: false,
        blocksVisibility: true,

        icon: "./assets/images/objects/mine.png",
        image: "./assets/images/objects/mine.png",
        ar: 1,
        centered: true,
    },


};

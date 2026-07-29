
export const TerrainConfig = {
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
    }
};


export const FogOfWarConfig = {
    showTerrain: true,
    showSettlements: true,
    showResources: false,
    showUnits: false
};
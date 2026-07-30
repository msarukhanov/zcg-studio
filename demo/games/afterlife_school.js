export const AppState = {

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
        'raphael': {
            id: 'raphael',
            name: 'Raphael Afterlife',

            icon: "./demo/afterlife_school/images/avatars/raphael.png",
            image: "./demo/afterlife_school/images/fullheight/raphael.png",
        },
        'quentin': {
            id: 'quentin',
            name: 'Quentin Blackwell',

            icon: "./demo/afterlife_school/images/avatars/quentin.png",
            image: "./demo/afterlife_school/images/fullheight/quentin.png",
        },

        'erin': {
            id: 'erin',
            name: 'Erin Faidaen',

            icon: "./demo/afterlife_school/images/avatars/erin.webp",
            image: "./demo/afterlife_school/images/fullheight/erin.png",
        },

        'adelina': {
            id: 'adelina',
            name: 'adelina d\'Lys',

            icon: "./demo/afterlife_school/images/avatars/adelina.png",
            image: "./demo/afterlife_school/images/fullheight/adelina.png",
        },

        'eleniel': {
            id: 'eleniel',
            name: 'Eleniel Falanar',

            icon: "./demo/afterlife_school/images/avatars/eleniel.png",
            image: "./demo/afterlife_school/images/fullheight/eleniel.png",
        },

        'sephirot': {
            id: 'sephirot',
            name: 'Mr. Sephirot',

            icon: "./demo/afterlife_school/images/avatars/sephirot.png",
            image: "./demo/afterlife_school/images/fullheight/sephirot.png",
        },

        'lazarus': {
            id: 'lazarus',
            name: 'Lazarus Midnight',

            icon: "./demo/afterlife_school/images/avatars/lazarus.png",
            image: "./demo/afterlife_school/images/fullheight/lazarus.png",
        },



    },


    dialogs : {
        "PROLOGUE_0_0": {
            "activation_conditions": [
                { "type": "flag", "param": "PROLOGUE_WATCHED", "value": false }
            ],
            "meta": {
                "group": "prologue",
                "type": "katscene"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./demo/afterlife_school/images/bg/raphael_room.png",
                "actors_registry": [
                    { "id": "rafael", "left": 45, "top": 20, "height": 70 }
                ],
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1
            },
            "text_pages": [
                {
                    "speaker_id": "NARRATOR",
                    "expression": "normal",
                    "text": {
                        "ru": "Рафаэль появляется на фоне своей комнаты. Обычная квартира: рабочий стол, компьютер, разбросанные книги и тетради, шкаф с зеркалом и окно, за которым брезжит тусклое утро.",
                        "en": "Raphael appears against the background of his room. A normal apartment: a desk, a computer, scattered books and notebooks, a wardrobe with a mirror, and a window with a dim morning light outside."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "normal",
                    "text": {
                        "ru": "*Резко открывает глаза* Я проснулся...",
                        "en": "*Snaps eyes open* I'm awake..."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "sad",
                    "text": {
                        "ru": "Снова... Снова эти кошмары снились. Я забываю их сразу же, но это гнетущее чувство внутри не проходит.",
                        "en": "Again... Those nightmares again. I forget them instantly, but this heavy feeling inside won't go away."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "serious",
                    "text": {
                        "ru": "Я больше не могу нормально спать последние две недели. Что-то определенно не так со мной.",
                        "en": "I haven't been able to sleep properly for the last two weeks. Something is definitely wrong with me."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                }
            ],
            "player_choices": [{
                "text": {
                    "ru": "Встать с кровати",
                    "en": "Get out of bed"
                },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "triggers": [
                        { "type": "set_flag", "param": "PROLOGUE_WATCHED", "value": true }
                    ],
                    "next_scene": "SCENE_1_0"
                }
            }]
        },

        "SCENE_1_0": {
            "activation_conditions": [],
            "meta": {
                "group": "prologue",
                "type": "active_dialog"
            },
            "window_settings": {
                "display_type": "fullscreen",
                "backgroundImage": "./assets/images/bg/raphael_room.png",
                "actors_registry": [
                    { "id": "rafael", "left": 45, "top": 20, "height": 70 }
                ],
                "panel_height": 40,
                "avatar_width": 20,
                "panel_bottom": 1
            },
            "text_pages": [
                {
                    "speaker_id": "NARRATOR",
                    "expression": "normal",
                    "text": {
                        "ru": "Рафаэль идет в ванную, чтобы умыться ледяной водой, после чего молча возвращается в свою комнату.",
                        "en": "Raphael goes to the bathroom to wash his face with ice-cold water, then silently returns to his room."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "serious",
                    "text": {
                        "ru": "*Смотрит в зеркало* Меня не покидает мысль... это не мое лицо. Совсем не мое.",
                        "en": "*Looks in the mirror* A thought keeps haunting me... this is not my face. Not mine at all."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "normal",
                    "text": {
                        "ru": "По логике, мне должно быть страшно от таких мыслей. Любой бы пришел в ужас, перестав узнавать себя в зеркале.",
                        "en": "Logically, such thoughts should make me scared. Anyone would be terrified if they stopped recognizing themselves in the mirror."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                },
                {
                    "speaker_id": "rafael",
                    "expression": "serious",
                    "text": {
                        "ru": "Но мне не страшно. Разум остается абсолютно холодным. И вот именно это... именно это меня и пугает.",
                        "en": "But I'm not scared. My mind remains completely cold. And that exact thing... that's what actually scares me."
                    },
                    "audio": "",
                    "auto_advance_time": 0,
                    "fx": {
                        "scene_animation": "",
                        "actor_animation": ""
                    }
                }
            ],
            "player_choices": [{
                "text": {
                    "ru": "Собираться в школу",
                    "en": "Get ready for school"
                },
                "kind": "neutral",
                "conditions": [],
                "on_success": {
                    "triggers": [],
                    "next_scene": ""
                }
            }]
        }
    },




    triggers: {

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
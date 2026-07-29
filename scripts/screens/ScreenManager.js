import { AppState, getActiveMap, getTileFromState, getPactBetween, DiplomaticPacts } from '../shared/GameState.js';

import { renderCharacterScreen, renderCharacterTransferScreen } from './CharacterScreen.js';
import { renderObjectScreen } from './ObjectManagementScreen.js';
import { renderTradeScreen } from './TradeScreen.js';
import { renderQuestsScreen } from './QuestsScreen.js';

import { renderSavesScreen } from './SavesScreen.js';
import { renderSettingsScreen } from './SettingsScreen.js';
import { renderPlayerGalleryScreen } from './PlayerGalleryScreen.js';

export class ScreenManager {
    constructor(rootContainer) {
        // rootContainer — это обычно твой `game-hud-root` или отдельный div для экранов
        this.rootContainer = rootContainer || document.getElementById('game-hud-root');
        this.currentScreenId = null;
        this.activeWidgets = {}; // Хранилище ссылок на DOM-элементы для биндинга экшенов
    }

    /**
     * 🖥️ Главная точка входа: Отрисовка конкретного экрана по его ID из конфига
     */
    renderScreen(screenId) {
        console.log(screenId);
        if (!this.rootContainer) return;

        if (screenId === 'object_screen') {
            renderObjectScreen();
        }

        if (screenId === 'character_screen') {
            renderCharacterScreen();
            return;
        }

        if (screenId === 'character_transfer') {
            renderCharacterTransferScreen();
            return;
        }

        if (screenId === 'trade_screen') {
            renderTradeScreen();
            return;
        }

        if (screenId === 'quests_screen') {
            renderQuestsScreen();
            return;
        }

        if (screenId === 'player_gallery_screen') {
            renderPlayerGalleryScreen();
            return;
        }

        // Ищем конфиг экрана в стейте
        const screensConfig = AppState.ui?.landscape || [];
        const screenConfig = screensConfig.find(s => s.id === screenId);

        if (!screenConfig) {
            console.warn(`[ScreenManager] Конфиг для экрана "${screenId}" не найден.`);
            return;
        }

        // Очищаем старый экран, если он был
        this.clearCurrentScreen();
        this.currentScreenId = screenId;

        // 1. Создаем корневую подложку экрана
        const screenWrapper = document.createElement('div');
        screenWrapper.id = `screen-${screenId}`;

        // Получаем закэшированный фон через твой window.gameAssets
        const rawBg = screenConfig.backgroundImage || '';

        const cachedBg = window.gameAssets[rawBg];
        console.log(rawBg, cachedBg);

        Object.assign(screenWrapper.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            backgroundImage: cachedBg ? `url("${cachedBg}")` : 'none',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            overflow: screenConfig.scrollable ? 'auto' : 'hidden',
            pointerEvents: 'auto', // Экран перехватывает мышь, чтобы сквозь меню не кликалась карта
            userSelect: 'none',
            zIndex: screenConfig.zIndex || 500 // Слой меню поверх основной карты игры
        });

        // 2. РЕНДЕР КУСКА: Главный герой на домашнем экране (home_hero_layout), если он прописан
        if (screenConfig.home_hero_layout) {
            const heroLayout = screenConfig.home_hero_layout;
            const heroContainer = document.createElement('div');
            heroContainer.className = `hud-hero-avatar ${heroLayout.animation || ''}`;

            // Вытаскиваем аватар текущего активного игрока из AppState
            const activeChar = AppState.characters[AppState.play?.activeCharacterId || 'rafael'];
            const rawHeroImg = activeChar?.image || '';
            const cachedHeroImg = window.gameAssets[rawHeroImg] || rawHeroImg;

            Object.assign(heroContainer.style, {
                position: 'absolute',
                top: heroLayout.top || '0',
                left: heroLayout.left || 'unset',
                right: heroLayout.right || 'unset',
                height: heroLayout.height || '100%',
                zIndex: heroLayout.zIndex || 1,
                pointerEvents: 'none'
            });

            if (cachedHeroImg) {
                heroContainer.innerHTML = `<img src="${cachedHeroImg}" style="height: 100%; object-fit: contain;">`;
                screenWrapper.appendChild(heroContainer);
            }
        }

        // 3. РЕНДЕР КУСКА: Виджеты и динамические кнопки (widgets)
        if (Array.isArray(screenConfig.widgets)) {
            screenConfig.widgets.forEach(widgetConfig => {
                const widgetElement = this.buildWidget(widgetConfig);
                if (widgetElement) {
                    screenWrapper.appendChild(widgetElement);
                }
            });
        }

        this.rootContainer.appendChild(screenWrapper);
    }

    /**
     * 🔧 Сборщик и инлайновый стилизатор отдельного виджета
     */
    buildWidget(config) {
        if (!config || !config.layout) return null;

        const lang = AppState.game_settings?.language || 'en';

        let el;
        const layout = config.layout;

        // Проверяем тип элемента из админки
        if (config.type === 'button') {
            el = document.createElement('button');
        } else {
            el = document.createElement('div'); // Дефолтный контейнер/текст
        }

        el.id = `widget-${config.id}`;

        // Обработка сложной математики в координатах (например: "50% + 35px + 5px")
        // Чтобы CSS переварил это без хардкода, оборачиваем строку в нативный CSS calc()
        const parseCoord = (coord) => {
            if (!coord) return 'auto';
            if (typeof coord === 'string' && (coord.includes('+') || coord.includes('-'))) {
                return `calc(${coord})`;
            }
            return coord;
        };

        // Извлекаем иконку кнопки из кэша window.gameAssets
        // Админка может прислать как чистый путь "assets/...", так и обертку "url('assets/...')"
        let rawIcon = layout.backgroundImage || '';
        if (rawIcon.startsWith("url(")) {
            rawIcon = rawIcon.replace(/^url\(['"]?|['"]?\)$/g, '').trim();
        }
        const cachedIcon = window.gameAssets[rawIcon] || rawIcon;

        // Абсолютная инлайн-стилизация на основе конфига админки
        Object.assign(el.style, {
            position: 'absolute',
            left: parseCoord(layout.left),
            right: parseCoord(layout.right),
            top: parseCoord(layout.top),
            bottom: parseCoord(layout.bottom),
            width: layout.width || 'auto',
            height: layout.height || 'auto',
            borderRadius: layout.shape === 'circle' ? '50%' : (layout.borderRadius || '0px'),
            backgroundColor: layout.backgroundColor || 'transparent',
            backgroundImage: cachedIcon ? `url("${cachedIcon}")` : 'none',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            border: layout.border || 'none',
            color: layout.textColor || '#fff',
            fontSize: layout.textSize || '14px',
            cursor: config.type === 'button' ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            outline: 'none',

            cursor: config.type === 'button' ? 'pointer' : 'default',
            pointerEvents: 'auto',

            zIndex: layout.zIndex || 10
        });

        let textLabel = '';

        // 1. Пытаемся достать перевод из конфига, если ключ локализации задан в админке
        if (config.label_loc_key && AppState.localization?.ui?.[lang]) {
            textLabel = AppState.localization.ui[lang][config.label_loc_key] || '';
        }

        // 2. СТРОГИЙ ФИКС: Если перевода нет, проверяем тип виджета.
        // Выводим технический ID как фолбэк ТОЛЬКО для кнопок, чтобы панели оставались пустыми.
        if (!textLabel && config.type === 'button') {
            textLabel = config.id;
        }

        // Настройка позиции текста внутри/снаружи кнопки на основе конфига
        if (layout.textPosition === 'bottom') {
            // Текст выносится под круглую кнопку (как иконки на рабочем столе или в мобильных RPG)
            el.innerHTML = `
                <div style="position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); 
                            background: ${layout.textBG || 'rgba(0,0,0,0.5)'}; padding: 2px 6px; 
                            border-radius: 4px; font-size: 11px; white-space: nowrap; color: ${layout.textColor || '#fff'};">
                    ${textLabel}
                </div>
            `;
        } else {
            // Текст пишется прямо внутри кнопки по центру
            el.textContent = textLabel;
        }

        // Биндинг кастомного действия (action) кнопки
        if (config.type === 'button' && config.action) {
            el.onclick = (e) => {
                e.stopPropagation(); // Защита от прокликивания сквозь кнопку
                this.handleWidgetAction(config.action);
            };
        }

        // Сохраняем ссылку в буфер менеджера
        this.activeWidgets[config.id] = el;
        return el;
    }

    /**
     * 🎮 Диспетчер обработчиков клика: умеет выполнять абсолютно любые команды
     */
    handleWidgetAction(actionName) {
        console.log(`🎯 [ScreenManager] Выполнено действие виджета: "${actionName}"`);

        const currentLang = AppState.game_settings?.language || 'en';

        switch (actionName) {
            case 'new_game':
                // Логика запуска новой игры: гасим меню, включаем тикер карты
                window.init2(true);

                this.clearCurrentScreen();
                break;

            case 'close_menu':
                // Просто закрываем текущий экран и возвращаемся на карту
                this.clearCurrentScreen();
                window.resumeTicker();
                break;

            case 'game_save':
                console.log("💾 Запуск сериализации и сохранения состояния AppState...");
                if (AppState.engine.SaveLoadManager) {
                    AppState.engine.SaveLoadManager.saveGame("slot_1");
                }
                this.clearCurrentScreen();
                break;

            case 'game_load':
                console.log("📥 Запрос списка сохранённых состояний из IndexedDB...");
                if (AppState.engine.SaveLoadManager) {
                    console.log("📥 getting saves...");
                    AppState.engine.SaveLoadManager.getAllSaves().then(saves => {
                        console.log(saves);
                        AppState.player.saves = saves || [];
                        renderSavesScreen();
                    }).catch(err => {
                        console.error("[ScreenManager] Ошибка загрузки окон сейвов:", err);
                        this.clearCurrentScreen();
                    });
                } else {
                    this.clearCurrentScreen();
                }
                break;

            case 'open_settings':
                console.log("⚙️ Открытие изолированного экрана настроек...");
                if (AppState.game_settings) {
                    renderSettingsScreen();
                } else {
                    this.clearCurrentScreen();
                }
                break;

            case 'open_player_gallery':
                console.log("⚙️ Открытие изолированного экрана настроек...");

                if (AppState.playerGallery) {
                    renderPlayerGalleryScreen();
                } else {
                    this.clearCurrentScreen();
                }
                break;

            case 'toggle_fullscreen':
                console.log("🖥️ Переключение полноэкранного режима дисплея...");
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {

                        console.warn(`Не удалось включить Fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
                break;

            case 'toggle_sound':
                console.log("🔊 Изменение глобального состояния микшера звуков...");
                if (AppState.game_settings?.audio) {
                const audioCfg = AppState.game_settings.audio;

                // Инвертируем флаг mute для ВСЕХ каналов сразу (или выбери конкретный, например music.mute)
                const nextMuteState = !audioCfg.music.mute;

                audioCfg.music.mute = nextMuteState;
                audioCfg.sfx.mute = nextMuteState;
                audioCfg.speech.mute = nextMuteState;

                // Принудительно заставляем менеджер применить новые громкости и остановить музыку/речь!
                AppState.engine.AudioManager.syncSettings();

                // Обновляем текст на кнопке в меню
                const muteBtn = document.getElementById('btn_mute_sound') || this.activeWidgets?.['btn_mute_sound'];
                if (muteBtn) {
                    muteBtn.textContent = nextMuteState
                        ? (currentLang === 'ru' ? "Звук: ВЫКЛ" : "Sound: OFF")
                        : (currentLang === 'ru' ? "Звук: ВКЛ" : "Sound: ON");
                }
            }
                break;

            default:
                // Если админка прислала кастомный экшен, который обрабатывается во внешних файлах игры
                // Выбрасываем глобальное событие, которое может поймать play.js или боевой менеджер
                const event = new CustomEvent('gameWidgetAction', { detail: { action: actionName } });
                window.dispatchEvent(event);
                break;
        }
    }

    /**
     * 🧹 Полная очистка текущего экрана из DOM дерева
     */
    clearCurrentScreen() {
        if (this.currentScreenId && this.rootContainer) {
            const oldScreen = document.getElementById(`screen-${this.currentScreenId}`);
            if (oldScreen) {
                oldScreen.remove();
            }
        }
        this._isTransferMode = false;
        this.currentScreenId = null;
        this.activeWidgets = {};
    }
}
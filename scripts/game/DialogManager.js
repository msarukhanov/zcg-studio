import { AppState, getPactBetween, DiplomaticPacts, getTileFromState } from '../shared/GameState.js';

export const DialogManager = {
    currentScene: null,
    currentSceneKey: null,
    currentPageIdx: 0,
    typewriterTimer: null,
    isTextFullyDisplayed: false,
    onCompleteCallback: null,
    choiceTimerInterval: null,

    trigger(sceneId, onComplete = null) {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);

        AppState.engine.triggerManager.processEvent('dialogue_start', {
            sceneId: sceneId // ID открывшейся сцены ('SCENE_NORTH_HUB_INIT')
        });

        const sceneConfig = AppState.dialogs?.[sceneId];
        if (!sceneConfig) {
            console.warn(`[DialogManager] Сцена "${sceneId}" не обнаружена.`);
            if (onComplete) onComplete();
            return;
        }

        if (!AppState.engine.triggerManager.evaluateConditions(sceneConfig.activation_conditions)) {
            console.log(`[DialogManager] Условия входа для "${sceneId}" не выполнены. Скип сцены.`);
            if (onComplete) onComplete();
            return;
        }

        this.currentScene = sceneConfig;
        this.currentSceneKey = sceneId;
        this.currentPageIdx = 0;
        this.onCompleteCallback = onComplete;

        window.stopTicker();

        this.renderFrame();
    },

    triggerByCharacter(heroId, onHubCloseCallback = null) {
        const targetRootSceneId = `character_dialog_${heroId}`;

        console.log(`[Hub Interaction] Клик по персонажу: "${heroId}". Поиск авто-рута: "${targetRootSceneId}"`);

        this.trigger(targetRootSceneId, onHubCloseCallback);
    },

    renderFrame() {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.isTextFullyDisplayed = false;

        const oldDialog = document.getElementById('game-dialog-overlay');
        if (oldDialog) oldDialog.remove();

        const gameLang = AppState.game_settings?.language || 'en';
        const ws = this.currentScene.window_settings || {};

        if(this.currentScene?.meta?.type === 'hub' || this.currentScene?.meta?.type === 'character_root') {
            if(!this.currentScene.text_pages || !this.currentScene.text_pages[0]) {
                this.currentScene.text_pages = [{
                    speaker_id: this.currentScene?.meta?.owner_hero_id,
                    expression: "normal",
                    text: {
                        ru: "",
                        en: ""
                    },
                    audio: "",
                    auto_advance_time: 0,
                    fx: {scene_animation: "", actor_animation: ""}
                }]
            }
        }

        const page = this.currentScene.text_pages?.[this.currentPageIdx];

        if (!page) {
            this.showPlayerChoicesUI(gameLang);
            return;
        }

        const textContent = page.text?.[gameLang] || '';
        const speakerName = page.speaker_id || '';
        const currentExpression = page.expression || 'normal';

        // Проверяем прозрачность бэкграунда
        const isBgTransparent = !ws.backgroundImage || ws.backgroundImage === 'none' || ws.backgroundImage === 'transparent';

        let backgroundRenderHtml = '';
        let overlayStyle = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; overflow: hidden; display: flex; align-items: flex-end; justify-content: center; box-sizing: border-box;';

        if (!isBgTransparent) {
            const bgAsset = ws.backgroundImage || "";
            const isVideoBg = bgAsset.endsWith('.mp4') || bgAsset.endsWith('.mov') || bgAsset.endsWith('.webm') || bgAsset.includes('video');
            const finalAsset = window.gameAssets[bgAsset] || bgAsset;

            if (!isVideoBg) {
                // КЕЙС А: Это обычная картинка или Blob-картинка. Рендерим её отдельным нижним слоем
                backgroundRenderHtml = `
                    <div class="vn-bg-layer" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; background-image: url('${finalAsset}'); background-size: cover; background-position: center; z-index: 1; pointer-events: none;"></div>
                `;
            } else {
                // КЕЙС Б: Это живое ВИДЕО (mp4/webm или Blob-видео). Рендерим HTML5 плеер на полную ширину
                backgroundRenderHtml = `
                    <video class="vn-bg-layer" src="${finalAsset}" autoplay loop muted playsinline style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; object-fit: cover; z-index: 1; pointer-events: none;"></video>
                `;
            }
        }

        // Находим конфигурацию текущего говорящего героя в каталоге
        const speakerHeroConfig = AppState.characters[page.speaker_id];
        const speakerAvatarUrl = speakerHeroConfig?.avatar || speakerHeroConfig?.icon || "";

        // Проверяем сторону портрета спикера из настроек кадра (по умолчанию left)
        const isSpeakerRight = page.portrait_side === 'right';

        let leftPortraitHTML = '';
        let rightPortraitHTML = '';
        let leftActiveStatus = 'passive-speaker';
        let rightActiveStatus = 'passive-speaker';

        if (Array.isArray(ws.actors_registry)) {
            ws.actors_registry.forEach((actor, idx) => {
                // Ищем аватарку героя в каталоге по его ID (.avatar)
                const heroCatalogData = AppState.characters[actor.id];
                const actorAvatarImage = heroCatalogData?.avatar || heroCatalogData?.icon || "";
                if (!actorAvatarImage) return;

                const finalAsset = window.gameAssets[actorAvatarImage] || actorAvatarImage;

                // Проверяем, говорит ли этот конкретный актер прямо сейчас
                const isCurrentSpeaker = actor.id === page.speaker_id;
                const activeClass = isCurrentSpeaker ? 'active-speaker' : 'passive-speaker';

                // Определяем сторону карточки-терминала (из настроек актера или по индексу)
                // Если у актера в реестре прописано position: "right", швыряем его направо
                const isRightSide = actor.position === 'right' || (idx % 2 !== 0);

                const portraitContent = `
                    <div class="vn-portrait-container">
                        <img class="vn-portrait-img" src="${finalAsset}">
                    </div>
                `;

                if (isRightSide) {
                    rightPortraitHTML = portraitContent;
                    rightActiveStatus = activeClass;
                } else {
                    leftPortraitHTML = portraitContent;
                    leftActiveStatus = activeClass;
                }
            });
        }
        // ----------------------------------------------------------------------
        // ШАГ 4 (ЧАСТЬ 2): ИСПРАВЛЕНО — ПРИМЕНЕНИЕ ПОЛЗУНКОВ КРУПНЫХ ПЛАНОВ (.image)
        // ----------------------------------------------------------------------
        let backdropActorsHTML = '';
        if (Array.isArray(ws.actors_registry)) {
            backdropActorsHTML = ws.actors_registry.map((actor, idx) => {
                const heroCatalogData = AppState.characters[actor.id];
                if (!heroCatalogData) return '';

                const actorBackdropImage = heroCatalogData.image;
                if (!actorBackdropImage) return '';

                const finalAsset = window.gameAssets[actorBackdropImage] || actorBackdropImage;

                const isCurrentSpeaker = actor.id === page.speaker_id;
                const currentOpacity = isCurrentSpeaker ? 'opacity: 1; filter: drop-shadow(0 0 10px rgba(88,166,255,0.4));' : 'opacity: 1; filter: grayscale(40%);';
                const fxAnimationClass = isCurrentSpeaker ? (page.fx?.actor_animation || '') : '';

                // ТЗ (4.1): Считываем точные координаты из ползунков автора (с подстраховкой на дефолты)
                const sLeft = actor.left !== undefined ? actor.left : 12;
                const sTop = actor.top !== undefined ? actor.top : 18;
                const sHeight = actor.height !== undefined ? actor.height : 75;

                // Вместо старого жесткого деления лево/право, применяем точную геометрию автора
                return `
                    <img class="${fxAnimationClass}" src="${finalAsset}" style="
                        position: absolute; 
                        left: ${sLeft}%; 
                        top: ${sTop}%; 
                        height: ${sHeight}dvh; 
                        object-fit: contain; 
                        pointer-events: none; 
                        z-index: 5;
                        transition: opacity 0.3s, filter 0.3s, left 0.3s, top 0.3s, height 0.3s; 
                        ${currentOpacity}
                    " onerror="this.style.display='none'">
                `;
            }).join('');
        }

        const sceneAnimClass = page.fx?.scene_animation || '';

        // ИСПРАВЛЕНО: Рендерим аватарки ВСЕХ участников сцены из реестра кадра


        // Читаем локальные настройки шрифта, цвета и эффекта из конфига страницы
        const customFont = page.font_family || "font-standard-sans";
        const customEffect = page.text_effect || "";
        const customColor = page.text_color ? `color: ${page.text_color} !important;` : "";

        // Читаем настройки геометрии передней панели из ползунков автора (с дефолтами 40 / 19 / 1)
        const panelHeight = ws.panel_height !== undefined ? ws.panel_height : 40;
        const avatarWidth = ws.avatar_width !== undefined ? ws.avatar_width : 19;
        const panelBottom = ws.panel_bottom !== undefined ? ws.panel_bottom : 1;

        // Автоматически вычисляем ширину центрального текстового шлюза, чтобы не было наплывов
        const centerWidth = 100 - (avatarWidth * 2);

        // Инлайновые динамические стили для карточек-терминалов
        const sideSlotStyle = `width: ${avatarWidth}%; height: 100%; display: flex; align-items: flex-end; justify-content: center; position: relative; flex-shrink: 0; box-sizing: border-box; z-index: 20;`;
        const containerStyle = `width: 100%; max-height: ${panelHeight}dvh; margin-bottom: ${panelBottom}dvh; display: flex; align-items: flex-end; justify-content: center; box-sizing: border-box; overflow: hidden; padding: 10px; background-color: var(--bg-sidebar); border: 1px solid var(--border-color); border-radius: 8px;`;

        // Стили центрального текстового бокса
        const centerSlotStyle = `width: ${centerWidth}%; height: 100%; position: relative; flex-shrink: 0; box-sizing: border-box; z-index: 10; flex: 1;`;
        const boxStyle = `position: absolute; bottom: ${panelBottom}dvh; left: 0; width: 100%; height: 600px; max-height: ${panelHeight}dvh; padding: 20px; background-color: var(--bg-sidebar); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;`;

        // Итоговый динамический HTML-шаблон рантайма
        // Итоговый динамический HTML-шаблон рантайма без багов аватаров
        const dialogHTML = `
            <div id="game-dialog-overlay" class="${sceneAnimClass}" style="${overlayStyle}">
                
                 ${backgroundRenderHtml}
                 
                <!-- Ростовые спрайты (.image) на заднем плане -->
                <div class="dialog-backdrop-stage" style="position: absolute; width:100%; height:100%; top:0; left:0; pointer-events:none; z-index: 5;">
                    ${backdropActorsHTML}
                </div>
                
                <!-- ШЛЮЗ 1: ЛЕВЫЙ ТЕРМИНАЛ АВАТАРА (Выводим твою переменную целиком) -->
                <div class="vn-portrait-slot ${leftPortraitHTML ? leftActiveStatus : 'hidden'}" style="${sideSlotStyle}">
                    ${leftPortraitHTML}
                </div>
                
                <!-- ШЛЮЗ 2: ЦЕНТРАЛЬНЫЙ БЛОК ТЕКСТА И КНОПОК -->
                <div class="vn-story-center-slot" style="${centerSlotStyle}">
                    <div class="dialog-box-node" style="${boxStyle}">
                        <div style="display: flex; flex-direction: column; gap: 6px; font-family: sans-serif; width: 100%; height: 100%;">
                            <span style="color: var(--accent-blue); font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${speakerName} ${currentExpression !== 'normal' ? `(${currentExpression})` : ''}
                            </span>
                            <div class="dialog-text-body-zone" style="width: 100%; flex: 1; min-height: 0;">
                                <p class="typewriter-text ${customFont} ${customEffect}" style="margin: 0; ${customColor}"></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ШЛЮЗ 3: ПРАВЫЙ ТЕРМИНАЛ АВАТАРА (Выводим твою переменную целиком) -->
                <div class="vn-portrait-slot ${rightPortraitHTML ? rightActiveStatus : 'hidden'}" style="${sideSlotStyle}">
                    ${rightPortraitHTML}
                </div>

            </div>
        `;



        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        // Дальше идет стандартный запуск интервала букв печатной машинки и onclick...
        const overlayNode = document.getElementById('game-dialog-overlay');
        const textNode = overlayNode.querySelector('.typewriter-text');
        let currentLetterIdx = 0;

        if (page.audio) {
            // try { new Audio(page.audio).play().catch(e => {}); } catch (err) {}

              AppState.engine.AudioManager.playSpeech(page.audio);
        }

        this.typewriterTimer = setInterval(() => {
            textNode.innerHTML += textContent.charAt(currentLetterIdx);
            currentLetterIdx++;

            if (currentLetterIdx >= textContent.length) {
                clearInterval(this.typewriterTimer);
                this.handleFrameTextComplete(page);
            }
        }, 20);

        // Умный клик по плашке
        overlayNode.querySelector('.dialog-box-node').onclick = (e) => {
            e.stopPropagation();

            if (!this.isTextFullyDisplayed) {
                // Если текст еще печатается — мгновенно выводим строку полностью
                if (this.typewriterTimer) clearInterval(this.typewriterTimer);
                textNode.innerHTML = textContent;
                this.handleFrameTextComplete(page);
            } else {
                // Если текст напечатан — сбрасываем автотаймер ожидания
                if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);

                const choices = this.currentScene?.player_choices || [];
                const isLastPage = this.currentPageIdx === (this.currentScene.text_pages.length - 1);

                // ИСПРАВЛЕНО ДЛЯ КАТСЦЕН: Если это финал катсцены и выборов нет — клик ЗАКРЫВАЕТ оверлей
                if (isLastPage && choices.length === 0) {
                    console.log("[DialogManager] Катсцена завершена. Закрываем оверлей.");
                    this.closeDialogEngine();
                } else {
                    // Иначе просто листаем на следующую страницу NPC
                    this.advanceTimelinePage();
                }
            }
        };

    },


    // ==========================================================================
    // ЧАСТЬ 3: АВТОТАЙМЕРЫ, ПАГИНАЦИЯ И ИНТЕРАКТИВНЫЕ ВЫБОРЫ ИГРОКА
    // ==========================================================================

    /**
     * Срабатывает ровно в момент, когда печатная машинка вывела весь текст реплики
     */
    handleFrameTextComplete(page) {
        this.isTextFullyDisplayed = true;

        const choices = this.currentScene?.player_choices || [];
        const hasChoices = choices.length > 0;
        const isLastPage = this.currentPageIdx === (this.currentScene.text_pages.length - 1);

        // ИСПРАВЛЕНО ДЛЯ КАТСЦЕН: Если выборы есть — передаем ход игроку сразу (Пункт 1)
        if (isLastPage && hasChoices) {
            console.log("[DialogManager] Конец реплик NPC. Передаем ход Рафаэлю...");
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);

            const gameLang = AppState.game_settings?.language || 'en';
            this.showPlayerChoicesUI(gameLang);
            return;
        }

        // Если это катсцена без выборов или обычная страница в середине таймлайна (Пункт 2)
        // Запускаем автотаймер, только если геймдизайнер выставил секунды задержки
        if (page.auto_advance_time && page.auto_advance_time > 0) {
            console.log(`[Auto-Advance] Запуск ожидания: ${page.auto_advance_time / 1000} сек...`);
            this.autoAdvanceTimer = setTimeout(() => {
                this.advanceTimelinePage();
            }, page.auto_advance_time);
        }
    },

    /**
     * Шаг вперед по таймлайну реплик: листает страницы или вызывает UI вариантов ответа
     */
    /**
     * Шаг вперед по таймлайну реплик: листает страницы или вызывает UI вариантов ответа
     */
    advanceTimelinePage() {
        // ЖЕСТКИЙ СБРОС: Перед переходом на любую страницу тушим абсолютно ВСЕ таймеры
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.typewriterTimer = null;
        this.autoAdvanceTimer = null;

        this.currentPageIdx++;

        if (this.currentPageIdx < this.currentScene.text_pages.length) {
            this.renderFrame();
        } else {
            const gameLang = AppState.game_settings?.language || 'en';
            this.showPlayerChoicesUI(gameLang);
        }
    },

    /**
     * Выводит интерактивные реплики ИГРОКА, ЖЕСТКО ЗАМЕНЯЯ ТЕКСТ ВНУТРИ БЛОКА
     */

    showPlayerChoicesUI(lang) {
        this.isProcessingTransition = true;

        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.typewriterTimer = null;
        this.autoAdvanceTimer = null;

        const choices = this.currentScene?.player_choices;

        if (!choices || choices.length === 0) {
            this.closeDialogEngine();
            return;
        }

        // Инициализируем реестр просмотренных одноразовых выборов, если его еще нет в стейте
        if (!AppState.player.viewed_choices) AppState.player.viewed_choices = [];

        // Проверяем скрытый автопереход по таймлайну страниц
        const firstChoice = choices[0];
        const isAutoTransition = choices.length === 1 && (!firstChoice.text || !firstChoice.text[lang]);

        if (isAutoTransition) {
            this.handleChoiceRouteExecution(0, 'on_success');
            return;
        }

        const overlayNode = document.getElementById('game-dialog-overlay');
        if (overlayNode) {
            overlayNode.className = '';
            overlayNode.removeAttribute('class');
        }

        const boxNode = overlayNode?.querySelector('.dialog-box-node');
        const textBodyZone = overlayNode?.querySelector('.dialog-text-body-zone');
        if (!boxNode || !textBodyZone) return;

        // Приглушаем персонажей заднего плана, давая слово Рафаэлю
        document.querySelectorAll('.dialog-backdrop-stage img').forEach(img => {
            img.style.opacity = '0.35';
            img.style.filter = 'grayscale(50%)';
        });

        const speakerHeader = boxNode.querySelector('span');
        if (speakerHeader) {
            speakerHeader.innerText = lang === 'ru' ? 'РАФАЭЛЬ (ВЫБОР ОТВЕТА)' : 'RAPHAEL (CHOOSE REPLICA)';
            speakerHeader.style.color = 'var(--accent-pink)';
        }

        // ТЗ (2.2): Считываем из конфига режим сетки (choices-layout-column или choices-layout-grid-2col)
        const layoutClass = this.currentScene.choices_layout_mode || "choices-layout-column";

        // Полностью стираем текст NPC и создаем контейнер с динамическим классом сетки
        textBodyZone.innerHTML = `
            <div class="choices-container ${layoutClass}" style="width: 100%; max-height: 100px; overflow-y: auto; padding-right: 4px;"></div>
        `;
        const container = textBodyZone.querySelector('.choices-container');

        choices.forEach((choice, idx) => {
            // УМНЫЙ ХАБ: Если выбор ОДНОРАЗОВЫЙ и игрок его уже кликал — полностью скрываем кнопку из меню
            const choiceUniqueKey = `${this.currentSceneKey}_choice_${idx}`;
            if (choice.repeatable === false && AppState.player.viewed_choices.includes(choiceUniqueKey)) {
                console.log(`[Hub Filter] Одноразовая тема "${choiceUniqueKey}" уже просмотрена. Скрываем.`);
                return; // Пропускаем рендеринг этой кнопки
            }

            // Стандартная RPG-проверка условий доступности статов
            const isConditionPassed = AppState.engine.triggerManager.evaluateConditions(choice.conditions);
            if (!isConditionPassed && choice.locked_behavior === 'hide') return;

            const buttonText = choice.text?.[lang] || `Option #${idx + 1}`;

            let typeColor = 'var(--border-color)';
            if (choice.kind === 'intellect') typeColor = 'var(--accent-blue)';
            if (choice.kind === 'romance') typeColor = 'var(--accent-pink)';
            if (choice.kind === 'aggressive') typeColor = 'var(--accent-red)';

            const btnStyles = !isConditionPassed
                ? `background: #161b22; border: 1px dashed #444; color: #555; cursor: not-allowed; opacity: 0.5;`
                : `background: var(--bg-card); border: 1px solid ${typeColor}; color: var(--text-main); cursor: pointer;`;

            const btnHtml = `
                <button class="dialog-choice-btn" ${!isConditionPassed ? 'disabled' : ''} style="
                    width: 100%; text-align: left; padding: 6px 12px; 
                    border-radius: 4px; font-size: 11px; font-weight: 600;
                    transition: background 0.15s, transform 0.15s; ${btnStyles}
                ">
                    ${buttonText}
                </button>
            `;

            container.insertAdjacentHTML('beforeend', btnHtml);

            container.lastElementChild.onclick = (e) => {
                e.stopPropagation();

                // ЕСЛИ НАЖАТ ОДНОРАЗОВЫЙ ВЫБОР — заносим его уникальный ключ в историю игрока
                if (choice.repeatable === false && isConditionPassed) {
                    AppState.player.viewed_choices.push(choiceUniqueKey);
                    console.log(`[Hub System] Тема "${choiceUniqueKey}" зафиксирована как просмотренная.`);
                }

                if (isConditionPassed) {
                    this.handleChoiceRouteExecution(idx, 'on_success');
                } else {
                    this.handleChoiceRouteExecution(idx, 'on_fail');
                }
            };
        });
    },


    /**
     * Запускает триггеры выбранного исхода и перенаправляет игрока на следующую сцену графа
     */
    handleChoiceRouteExecution(choiceIdx, branch = 'on_success') {
        // Перед загрузкой новой сцены ПРИНУДИТЕЛЬНО очищаем все запущенные таймеры
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.typewriterTimer = null;
        this.autoAdvanceTimer = null;

        const selectedChoice = this.currentScene?.player_choices?.[choiceIdx];
        if (!selectedChoice) return;

        const outcome = selectedChoice[branch];

        if (Array.isArray(outcome?.triggers) && outcome.triggers.length > 0) {
            console.log(`[DialogManager] Активация триггеров ветки: ${branch}`);
            AppState.engine.triggerManager.executeTriggers(outcome.triggers);
        }

        const nextSceneKey = outcome?.next_scene;

        if (!nextSceneKey) {
            this.closeDialogEngine();
        } else {
            // Переходим к следующей атом-сцене
            this.trigger(nextSceneKey, this.onCompleteCallback);
        }
    },


    /**
     * Полная вычистка ресурсов и деструктуризация оверлея при закрытии
     */
    /**
     * Завершает проигрывание реплик. Если на сцене есть актеры, переводит экран в режим Point-and-Click Хаба.
     */
    closeDialogEngine() {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        if (this.choiceTimerInterval) clearInterval(this.choiceTimerInterval);

        this.typewriterTimer = null;
        this.autoAdvanceTimer = null;
        this.choiceTimerInterval = null;
        this.isProcessingTransition = false;

        const overlay = document.getElementById('game-dialog-overlay');
        if (!overlay) {
            if (this.onCompleteCallback) this.onCompleteCallback();
            return;
        }

        const ws = this.currentScene?.window_settings || {};
        const hasHubActors = Array.isArray(ws.actors_registry) && ws.actors_registry.length > 0;

        // Находим и полностью удаляем нижнюю текстовую приборную панель
        const boxNode = overlay.querySelector('.dialog-box-node');
        if (boxNode) boxNode.remove();

        // Удаляем боковые шлюзы аватарок, оставляя только ростовые фигуры на фоне
        overlay.querySelectorAll('.vn-portrait-slot').forEach(slot => slot.remove());
        overlay.querySelectorAll('.vn-story-center-slot').forEach(slot => slot.remove());

        // if (hasHubActors || this.currentScene?.meta?.type === 'hub' || this.currentScene?.meta?.type === 'character_root') {
        //     // ==========================================================================
        //     // ТЗ: РЕЖИМ HUB POINT-AND-CLICK АКТИВАЦИИ ОБРАБОТЧИКОВ КЛИКА
        //     // ==========================================================================
        //     console.log("[Hub Mode] Переключение экрана в интерактивный режим Хаба...");
        //
        //     // Находим все отрендеренные ростовые картинки персонажей на сцене
        //     const actorImages = overlay.querySelectorAll('.dialog-backdrop-stage img');
        //
        //     actorImages.forEach((img, idx) => {
        //         const actorData = ws.actors_registry[idx];
        //         if (!actorData) return;
        //
        //         // Включаем для картинки реакцию на мышку (курсор-указатель)
        //         img.style.pointerEvents = 'auto';
        //         img.style.cursor = 'pointer';
        //         img.style.opacity = '0.85'; // Слегка приглушаем, чтобы подсветить при наведении
        //
        //         // Эффект наведения: персонаж становится ярче, когда на него наводят мышь
        //         img.onmouseover = () => { img.style.opacity = '1'; img.style.filter = 'drop-shadow(0 0 12px var(--accent-blue))'; };
        //         img.onmouseout = () => { img.style.opacity = '0.85'; img.style.filter = 'none'; };
        //
        //         // НАВЕШИВАЕМ НАСТОЯЩИЙ ОБРАБОТЧИК КЛИКА ПО ПЕРСОНАЖУ (Шаг 5)
        //         img.onclick = (e) => {
        //             e.stopPropagation();
        //
        //             // Вызываем наш умный лаунчер Хаба по ID персонажа (например, 'adelina')
        //             this.triggerByCharacter(actorData.id, () => {
        //                 // Функция-коллбэк: когда игрок поговорит и закроет диалог с Аделиной,
        //                 // мы снова вызываем closeDialogEngine(), чтобы вернуть экран в режим Хаба класса!
        //                 this.closeDialogEngine();
        //             });
        //         };
        //     });
        // }
        // else {
            // Если на сцене не было актеров (это была просто катсцена-кино) — полностью тушим весь оверлей
            overlay.remove();
            window.resumeTicker();
            if (this.onCompleteCallback) this.onCompleteCallback();
        // }
    }
};





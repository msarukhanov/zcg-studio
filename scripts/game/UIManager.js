import { AppState } from '../shared/GameState.js';

import { renderFactionScreen } from '../screens/FactionScreen.js';

export class UIManager {
    constructor() {
        this.rootContainer = null;
    }

    /**
     * 🖥️ Функция инициализации UI-менеджера
     */
    init() {
        console.log("🖥️ [UIManager] Инициализация базовых слоев интерфейса...");

        // Создаем корневой HTML-контейнер для всего HUD игры, если его еще нет
        this.rootContainer = document.getElementById('game-hud-root');
        if (!this.rootContainer) {
            this.rootContainer = document.createElement('div');
            this.rootContainer.id = 'game-hud-root';
            // Стилизуем корень как абсолютный полноэкранный слой поверх холста PixiJS
            Object.assign(this.rootContainer.style, {
                position: 'absolute',
                inset: '0',
                pointerEvents: 'none', // Пропускаем клики сквозь пустые места на карту
                zIndex: '1000',
                fontFamily: 'Arial, sans-serif'
            });
            document.body.appendChild(this.rootContainer);
        }

        // Вызываем первичную отрисовку всего интерфейса под текущий кадр
        this.updateAll();
    }

    /**
     * Главный диспетчер обновления — полностью перерисовывает все куски UI
     */
    updateAll() {
        if (!this.rootContainer) return;

        // Полностью очищаем старый HTML-слой перед перерисовкой кадра
        this.rootContainer.innerHTML = '';

        this.renderSettingsTrigger();

        const activeId = AppState.play?.activeCharacterId;
        if (!activeId) return;

        const char = AppState.entities[activeId];
        if (!char) return;

        // Поочередно вызываем изолированные функции отрисовки разных кусков интерфейса

        // this.renderCharacterWindowCircle(char);
        this.renderCharacterWindowLinear(char);

        // Автоопределение типа устройства (ширина экрана <= 768px считается мобилкой)
        const isMobile = window.innerWidth <= 1024;

        if (isMobile) {
            this.renderMobileSkillWheel(char);
        } else {
            this.renderDesktopSkillPanel(char);
        }

        this.renderEndTurnButton(char, isMobile);



        this.renderQuestTracker();

        this.renderMinimap();

        this.renderFactionResources();
        this.renderFactionCharactersList();

        this.showInteractionMenu();
    }

    /**
     * 👤 2.1. ОКНО ВЫБРАННОГО ПЕРСОНАЖА (Изолированная функция)
     */
    renderCharacterWindowCircle(char) {
        const charWindow = document.createElement('div');
        const settings = AppState.game_settings;
        const uiPos = settings?.ui?.character || 'left-top';

        charWindow.style.pointerEvents = 'auto';

        Object.assign(charWindow.style, {
            position: 'absolute',
            width: '140px',
            height: '140px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)',
            border: '2px solid #34495e',
            borderRadius: '50%',
            padding: '0',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            left: '15px',
            top: uiPos === 'left-top' ? '25px' : 'auto', // Чуть опустили топ, чтобы имя не резалось краем экрана
            bottom: uiPos === 'left-bottom' ? '45px' : 'auto' // Чуть подняли боттом ради нижних подписей
        });

        const hpPercent = Math.max(0, Math.min(100, (char.stats.hp / char.stats.maxHp) * 100));
        const energyPercent = Math.max(0, Math.min(100, (char.stats.energy / (char.stats.maxEnergy || 100)) * 100));

        const hpOffset = 140 - (140 * hpPercent) / 100;
        const energyOffset = 140 - (140 * energyPercent) / 100;

        charWindow.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        
        <!-- Имя и уровень перенесены НАВЕРХ -->
        <div style="position: absolute; top: -24px; background: rgba(10, 15, 20, 0.95); border: 1px solid #34495e; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; white-space: nowrap; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 3;">
          ${char.name} <span style="color: #ffd166; font-size: 9px;">[Lvl.${char.level || 1}]</span>
        </div>

        <!-- Левая SVG дуга: Здоровье -->
        <svg viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
          <path d="M 25 80 A 36 38 0 0 1 25 20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6" stroke-linecap="round"/>
          <path d="M 25 80 A 36 38 0 0 1 25 20" fill="none" stroke="#e74c3c" stroke-width="6" stroke-linecap="round" stroke-dasharray="140" stroke-dashoffset="${hpOffset}" style="transition: stroke-dashoffset 0.2s ease;"/>
        </svg>

        <!-- Правая SVG дуга: Энергия -->
        <svg viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
          <path d="M 75 20 A 36 38 0 0 1 75 80" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6" stroke-linecap="round"/>
          <path d="M 75 20 A 36 38 0 0 1 75 80" fill="none" stroke="#3498db" stroke-width="6" stroke-linecap="round" stroke-dasharray="140" stroke-dashoffset="${energyOffset}" style="transition: stroke-dashoffset 0.2s ease;"/>
        </svg>

        <!-- Центральный круглый аватар -->
        <div style="width: 82px; height: 82px; border-radius: 50%; border: 1px solid #455a64; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 2; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
          <img src="${char.avatar || char.icon}" alt="${char.name}"
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.src='assets/avatars/default_avatar.png'; this.onerror=null;">
        </div>

        <!-- Точные числа HP и Энергии перенесены ВНИЗ -->
        <div style="position: absolute; bottom: -14px; background: rgba(10, 15, 20, 0.85); border: 1px solid #2c3e50; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-family: monospace; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 3;">
          <span style="color: #ff6b6b;">${char.stats.hp}</span>/<span style="color: #54a0ff;">${char.stats.energy}</span>
        </div>

      </div>
    `;

        this.rootContainer.appendChild(charWindow);
    }

    /**
     * 📱 2.1.Б. ОКНО ВЫБРАННОГО ПЕРСОНАЖА (Вариант 2: Линейный мобильный HUD)
     */
    renderCharacterWindowLinear(char) {
        const charWindow = document.createElement('div');
        const settings = AppState.game_settings;
        const uiPos = settings?.ui?.character || 'left-top';

        charWindow.style.pointerEvents = 'auto';

        Object.assign(charWindow.style, {
            position: 'absolute',
            width: '240px', // Увеличили ширину, чтобы влезли полоски справа
            height: '74px',  // Компактная высота для мобильного стиля
            backgroundColor: 'rgba(20, 24, 30, 0.85)',
            border: '2px solid #34495e',
            borderRadius: '37px 10px 10px 37px', // Круглая раковина слева под аватар, прямоугольная справа
            padding: '4px 12px 4px 4px',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            userSelect: 'none',
            left: '15px',
            top: uiPos === 'left-top' ? '15px' : 'auto',
            bottom: uiPos === 'left-bottom' ? '15px' : 'auto'
        });

        const hpPercent = Math.max(0, Math.min(100, (char.stats.hp / char.stats.maxHp) * 100));
        const energyPercent = Math.max(0, Math.min(100, (char.stats.energy / (char.stats.maxEnergy || 100)) * 100));
        const expPercent = Math.max(0, Math.min(100, (char.exp / char.requiredExp) * 100));

        const imgUrl = window.gameAssets[char.avatar || char.icon];

        charWindow.innerHTML = `
      <!-- Круглый аватар слева с золотым ободком -->
      <div style="width: 62px; height: 62px; border-radius: 50%; border: 2px solid #d4af37; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 8px rgba(0,0,0,0.5);" id="hud-avatar-circle">
        <img src="${imgUrl}" alt=""
             style="width: 100%; height: 100%; object-fit: cover;"
             onerror="this.src='assets/avatars/default_avatar.png'; this.onerror=null;">
             
        <span style="color: #ffd166; position: absolute; bottom: 0; left: 0; background-color: rgba(20, 24, 30, 0.85); border: 2px solid rgb(212, 175, 55); border-radius: 50%; font-family: monospace; width: 20px; height: 20px; text-align: center; line-height: 16px;">${char.level || 1}</span>
      </div>
      
      <!-- Блок информации и горизонтальных полосок справа -->
      <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px;">
        
        <!-- Имя и уровень -->
        <div style="font-weight: bold; font-size: 13px; color: #fff; text-shadow: 1px 1px 2px #000; display: flex; justify-content: space-between; align-items: center; padding-right: 4px;">
          <span>${_loc(char.name)}</span>
          <!-- <span style="color: #ffd166; font-size: 10px; font-family: monospace;">Lvl.${char.level || 1}</span> -->
        </div>
        
        <!-- Линейная полоска HP -->
        <div style="position: relative; width: 100%; height: 10px; background: rgba(255,255,255,0.08); border: 1px solid #1a252f; border-radius: 5px; overflow: hidden;">
          <div style="width: ${hpPercent}%; height: 100%; background: linear-gradient(to right, #c0392b, #e74c3c); border-radius: 4px; transition: width 0.2s ease;"></div>
          <!-- Текст поверх полоски -->
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; font-family: monospace; color: #fff; text-shadow: 1px 1px 1px #000;">
            ${char.stats.hp}/${char.stats.maxHp}
          </div>
        </div>
        
        <!-- Линейная полоска Энергии -->
        <div style="position: relative; width: 100%; height: 8px; background: rgba(255,255,255,0.08); border: 1px solid #1a252f; border-radius: 4px; overflow: hidden;">
          <div style="width: ${energyPercent}%; height: 100%; background: linear-gradient(to right, #2980b9, #3498db); border-radius: 3px; transition: width 0.2s ease;"></div>
          <!-- Текст поверх полоски -->
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; font-family: monospace; color: #fff; text-shadow: 1px 1px 1px #000;">
            ${char.stats.energy}/${char.stats.maxEnergy}
          </div>
        </div>
        
       <div style="position: relative; width: 100%; height: 8px; background: rgba(255,255,255,0.08); border: 1px solid #1a252f; border-radius: 4px; overflow: hidden;">
            <!-- 🌟 ЖЁЛТЫЙ ЗОЛОТИСТЫЙ ГРАДИЕНТ ДЛЯ ОПЫТА -->
            <div style="width: ${expPercent}%; height: 100%; background: linear-gradient(to right, #f1c40f, #f39c12); border-radius: 3px; transition: width 0.2s ease;"></div>
            <!-- Текст поверх полоски -->
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; font-family: monospace; color: #fff; text-shadow: 1px 1px 1px #000;">
                ${char.exp}/${char.requiredExp}
            </div>
        </div>

      </div>
    `;

        this.rootContainer.appendChild(charWindow);

        const avatarElement = document.getElementById('hud-avatar-circle') || avatarCircle;

        if (avatarElement) {
            // Включаемpointer-events, чтобы клик не улетал под холст на карту PixiJS
            avatarElement.style.pointerEvents = 'auto';
            avatarElement.style.cursor = 'pointer';

            // Вешаем триггер открытия экрана персонажа
            avatarElement.onclick = (e) => {
                e.stopPropagation(); // Стопорим клик, чтобы не сдвинуть персонажа на гекс под кнопкой

                if (AppState.engine?.ScreenManager) {
                    // Запускаем переключение экрана на character_screen
                    AppState.engine.ScreenManager.renderScreen('character_screen');
                } else {
                    console.warn("[UIManager] ScreenManager еще не инициализирован в AppState.engine");
                }
            };
        }
    }


    /**
     * 🖥️ 2.2. ДЕСКТОПНАЯ ПАНЕЛЬ НАВЫКОВ (Горизонтальная в центре снизу)
     */
    renderDesktopSkillPanel(char) {
        const panel = document.createElement('div');
        panel.style.pointerEvents = 'auto';

        Object.assign(panel.style, {
            position: 'absolute',
            left: '50%',
            bottom: '24px',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            backgroundColor: 'rgba(12, 17, 24, 0.85)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '2px solid #232d38',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        });

        const skillsList = this.getNormalizedSkillsList(char);

        skillsList.forEach((skillInfo, index) => {
            const skillId = skillInfo.skill_id;
            const isAutoAttack = skillInfo.isAutoAttack;

            // Динамическое определение конфига навыка
            const config = isAutoAttack
                ? { icon: '⚔️', title_loc: { ru: 'Атака' }, type: 'active', visual_color: 'red' }
                : AppState.skills[skillId];

            if (!config) return;

            const isPassive = config.type === "passive";
            const isActiveSelection = AppState.play?.activeSkillId === skillId;

            if (!char.skillCooldowns) char.skillCooldowns = {};
            const currentCD = char.skillCooldowns[skillId] || 0;
            const isOnCooldown = currentCD > 0;

            const btn = document.createElement('button');

            // Динамическая инлайн-стилизация состояний (будет приходить из админки)
            let borderColors = { active: '#ffd166', ultimate: '#e67e22', passive: '#555', default: '#3a4759' };
            let bgGradients = { active: '#2c3e50', ultimate: '#261c14', passive: '#222', default: '#0d121a' };

            let currentBorder = borderColors.default;
            let currentBg = bgGradients.default;

            if (isActiveSelection) { currentBorder = borderColors.active; currentBg = bgGradients.active; }
            else if (config.type === 'ultimate') { currentBorder = borderColors.ultimate; currentBg = bgGradients.ultimate; }
            else if (isPassive) { currentBorder = borderColors.passive; currentBg = bgGradients.passive; }

            Object.assign(btn.style, {
                width: '56px',
                height: '56px',
                background: currentBg,
                border: `1px ${isPassive ? 'dashed' : 'solid'} ${currentBorder}`,
                borderRadius: '6px',
                color: isActiveSelection ? '#ffd166' : '#fff',
                cursor: (isPassive || isOnCooldown) ? 'default' : 'pointer',
                opacity: (isPassive || isOnCooldown) ? '0.5' : '1.0',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s ease',
                position: 'relative'
            });

            if (isPassive || isOnCooldown) {
                btn.disabled = true;
            }

            const titleRu = config.title_loc ? config.title_loc.ru : skillId;
            const labelText = isPassive ? `Пасс.` : (isAutoAttack ? 'База' : `${skillInfo.level} ${_t('units.lvl')}`);

            // Инлайн-кулдаун слой
            const cdOverlay = isOnCooldown
                ? `<div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.75); color: #ff4757; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; border-radius: 6px;">${Math.ceil(currentCD / 1000)}s</div>`
                : '';

            btn.innerHTML = `
        <span style="font-size: 24px; display: block; margin-bottom: 2px;">${config.icon || '🔮'}</span>
        <span style="font-size: 8px; font-weight: bold; display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; box-sizing: border-box;">${titleRu}</span>
        <span style="font-size: 7px; color: #8a92a6; display: block;">${labelText}</span>
        ${cdOverlay}
      `;

            btn.onclick = () => {
                if (isPassive || isOnCooldown) return;
                if (AppState.engine.skillManager) {
                    AppState.engine.skillManager.selectSkillForCast(skillId);
                }
            };

            panel.appendChild(btn);
        });

        this.rootContainer.appendChild(panel);
    }



    /**
     * 🖥️ 2.2. ДЕСКТОПНАЯ ПАНЕЛЬ НАВЫКОВ (Горизонтальная в центре снизу)
     */
    renderDesktopSkillPanel(char) {
        const panel = document.createElement('div');
        panel.style.pointerEvents = 'auto';

        Object.assign(panel.style, {
            position: 'absolute',
            left: '50%',
            bottom: '20px',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'rgba(10, 15, 20, 0.75)',
            padding: '8px',
            borderRadius: '10px',
            border: '1px solid #333'
        });

        const skillsList = this.getNormalizedSkillsList(char);
        skillsList.forEach((skillInfo, index) => {
            const btn = this.createSkillButton(char, skillInfo, index, false);
            panel.appendChild(btn);
        });

        this.rootContainer.appendChild(panel);
    }

    /**
     * 📱 2.3. МОБИЛЬНОЕ КРУГЛОЕ МЕНЮ НАВЫКОВ (Полукруг справа снизу)
     */
    /**
     * 📱 2.3. МОБИЛЬНОЕ КРУГЛОЕ МЕНЮ НАВЫКОВ (Полукруг справа снизу)
     */
    renderMobileSkillWheel(char) {
        const wheelContainer = document.createElement('div');
        wheelContainer.style.pointerEvents = 'auto';

        Object.assign(wheelContainer.style, {
            position: 'absolute',
            right: '24px',
            bottom: '24px',
            width: '190px',
            height: '190px',
            display: 'block'
        });

        // 1. ФИЛЬТРАЦИЯ: Исключаем пассивные навыки из мобильной панели, чтобы не занимали место
        const rawSkillsList = this.getNormalizedSkillsList(char);
        const activeSkillsList = rawSkillsList.filter(skillInfo => {
            if (skillInfo.isAutoAttack) return true;
            const config = AppState.skills[skillInfo.skill_id];
            return config && config.type !== "passive"; // Пропускаем пассивки
        });

        // Счетчик для позиционирования только отображаемых (активных) кнопок на орбите
        let activeSkillIndex = 0;

        activeSkillsList.forEach((skillInfo) => {
            const skillId = skillInfo.skill_id;
            const isAutoAttack = skillInfo.isAutoAttack;

            const config = isAutoAttack
                ? { icon: '⚔️', title_loc: { ru: 'Атака' }, type: 'active' }
                : AppState.skills[skillId];

            if (!config) return;

            const isActiveSelection = AppState.play?.activeSkillId === skillId;

            if (!char.skillCooldowns) char.skillCooldowns = {};
            const currentCD = char.skillCooldowns[skillId] || 0;
            const isOnCooldown = currentCD > 0;

            const btn = document.createElement('button');
            btn.style.position = 'absolute';

            if (isOnCooldown) {
                btn.disabled = true;
            }

            // Динамическая инлайн-стилизация состояний (под будущую админку)
            let borderColors = { active: '#ffd166', ultimate: '#e67e22', default: '#3a4759' };
            let bgGradients = { active: '#2c3e50', ultimate: '#261c14', default: '#0d121a' };

            let currentBorder = borderColors.default;
            let currentBg = bgGradients.default;

            if (isActiveSelection) { currentBorder = borderColors.active; currentBg = bgGradients.active; }
            else if (config.type === 'ultimate') { currentBorder = borderColors.ultimate; currentBg = bgGradients.ultimate; }

            Object.assign(btn.style, {
                background: currentBg,
                border: `1px solid ${currentBorder}`,
                borderRadius: '50%', // Мобильные кнопки строго круглые
                color: isActiveSelection ? '#ffd166' : '#fff',
                cursor: isOnCooldown ? 'default' : 'pointer',
                opacity: isOnCooldown ? '0.5' : '1.0',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s ease',
                boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
            });

            // 2. ИСПРАВЛЕННАЯ МАТЕМАТИКА РАДИАЛЬНОЙ СЕТКИ БЕЗ ПЕРЕКРЫТИЙ
            if (isAutoAttack) {
                // Крупная круглая кнопка атаки в самом углу
                Object.assign(btn.style, {
                    width: '68px',
                    height: '68px',
                    right: '10px',
                    bottom: '10px',
                    background: 'linear-gradient(135deg, #8b0000 0%, #3a0000 100%)',
                    borderColor: '#e74c3c'
                });
            } else {
                // Обычные активные скиллы огибают ее по широкой орбите
                Object.assign(btn.style, {
                    width: '50px',
                    height: '50px'
                });

                const startAngle = Math.PI; // 180 градусов (налево)
                const angleStep = 0.56;     // ИСПРАВЛЕНО: Увеличен шаг дуги, чтобы кнопки не перекрывались
                const radius = 95;          // ИСПРАВЛЕНО: Увеличен радиус орбиты для свободного размещения

                // Используем отфильтрованный индекс активных скилов
                const currentAngle = startAngle + activeSkillIndex * angleStep;
                activeSkillIndex++; // Сдвигаем позицию для следующего активного скилла

                const posX = 110 + Math.cos(currentAngle) * radius;
                const posY = 110 + Math.sin(currentAngle) * radius;

                btn.style.left = `${posX}px`;
                btn.style.top = `${posY}px`;
            }

            const labelText = isAutoAttack ? 'Атака' : `Ур.${skillInfo.level}`;

            const cdOverlay = isOnCooldown
                ? `<div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.75); color: #ff4757; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${Math.ceil(currentCD / 1000)}s</div>`
                : '';

            btn.innerHTML = `
        <span style="font-size: ${isAutoAttack ? '28px' : '20px'}; display: block; margin-top: ${isAutoAttack ? '2px' : '0px'};">${config.icon || '🔮'}</span>
        <span style="font-size: 7px; color: rgba(255,255,255,0.6); display: block; margin-top: -1px;">${labelText}</span>
        ${cdOverlay}
      `;

            btn.onclick = () => {
                if (isOnCooldown) return;
                if (AppState.engine.skillManager) {
                    AppState.engine.skillManager.selectSkillForCast(skillId);
                }
            };

            wheelContainer.appendChild(btn);
        });

        this.rootContainer.appendChild(wheelContainer);
    }



    /**
     * ⏳ 2.4. СБОРКА И СТИЛИЗАЦИЯ КНОПКИ НАВЫКА С УЧЕТОМ КУЛДАУНОВ
     */
    createSkillButton(char, skillInfo, index, isMobile) {
        const skillId = skillInfo.skill_id;
        const isAutoAttack = skillInfo.isAutoAttack;

        const config = isAutoAttack ? { icon: '⚔️', title_loc: { ru: 'Атака' }, type: 'active' } : AppState.skills[skillId];
        const button = document.createElement('button');
        if (!config) return button;

        const isPassive = config.type === "passive";
        const isActiveSelection = AppState.play?.activeSkillId === skillId;

        // Чтение кулдауна из стейта персонажа
        if (!char.skillCooldowns) char.skillCooldowns = {};
        if (char.skillCooldowns[skillId] === undefined) char.skillCooldowns[skillId] = 0;

        const currentCD = char.skillCooldowns[skillId];
        const isOnCooldown = currentCD > 0;

        const titleRu = config.title_loc ? config.title_loc.ru : skillId;
        const labelText = isPassive ? `[Пасс.]` : (isAutoAttack ? 'Атака' : `Ур.${skillInfo.level}`);
        const cdOverlay = isOnCooldown ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.7); color:#ff4757; font-weight:bold; font-size:16px; display:flex; align-items:center; justify-content:center; border-radius:${isMobile ? '50%' : '8px'};">${Math.ceil(currentCD / 1000)}s</div>` : '';

        button.innerHTML = `
            <span style="font-size: 22px; display: block; margin-top: ${isMobile && isAutoAttack ? '4px' : '0px'};">${config.icon || '🔮'}</span>
            <span style="font-size: 8px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titleRu}</span>
            <span style="font-size: 7px; color: #aaa; display: block;">${labelText}</span>
            ${cdOverlay}
        `;

        Object.assign(button.style, {
            width: '54px',
            height: '54px',
            border: '1px solid #444',
            borderRadius: isMobile ? '50%' : '8px',
            textAlign: 'center',
            padding: '2px',
            boxSizing: 'border-box',
            color: isActiveSelection ? '#000' : '#fff',
            transition: 'all 0.1s ease',
            position: 'relative',
            backgroundColor: isPassive ? '#555' : (isOnCooldown ? '#1e272e' : (isActiveSelection ? '#ffd166' : (isAutoAttack ? '#c0392b' : '#2c3e50'))),
            cursor: (isPassive || isOnCooldown) ? 'default' : 'pointer',
            opacity: (isPassive || isOnCooldown) ? '0.5' : '1.0'
        });

        // Математика радиальной верстки под мобильное колесо способностей
        if (isMobile) {
            button.style.position = 'absolute';
            if (isAutoAttack) {
                button.style.width = '64px';
                button.style.height = '64px';
                button.style.right = '10px';
                button.style.bottom = '10px';
            } else {
                const startAngle = Math.PI; // Влево вверх от кнопки атаки
                const angleStep = 0.45;
                const radius = 75;

                const currentAngle = startAngle + (index - 1) * angleStep;
                const posX = 90 + Math.cos(currentAngle) * radius;
                const posY = 90 + Math.sin(currentAngle) * radius;

                button.style.left = `${posX}px`;
                button.style.top = `${posY}px`;
            }
        }

        button.onclick = () => {
            if (isPassive) return;
            if (isOnCooldown) return;

            // Вызываем логику активации скилла в SkillManager
            if (AppState.engine.skillManager) {
                AppState.engine.skillManager.selectSkillForCast(skillId);
            }
        };

        return button;
    }

    /**
     * ⏳ ГЛОБАЛЬНАЯ КНОПКА КОНЕЦ ХОДА (Изолированная функция)
     */
    renderEndTurnButton(char, isMobile) {
        if (AppState.engine.timeManager && AppState.engine.timeManager.currentMode === "combat") {
            const endTurnButton = document.createElement('button');
            endTurnButton.style.pointerEvents = 'auto';
            endTurnButton.innerHTML = `<span style="font-size: 20px; display: block;">⏳</span><span style="font-size: 8px; display: block;">Конец Хода</span>`;

            Object.assign(endTurnButton.style, {
                width: '54px',
                height: '54px',
                backgroundColor: '#27ae60',
                color: '#fff',
                border: '1px solid #2ecc71',
                borderRadius: isMobile ? '50%' : '8px',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '2px',
                boxSizing: 'border-box',
                position: 'absolute',
                left: isMobile ? '10px' : 'auto',
                bottom: isMobile ? '10px' : '20px',
                right: isMobile ? 'auto' : 'calc(50% - 180px)'
            });

            endTurnButton.onclick = () => {
                if (AppState.engine.turnManager) {
                    AppState.play.activeSkillId = null;
                    if (AppState.engine.skillManager) AppState.engine.skillManager.clearCastZone();
                    AppState.engine.turnManager.endTurn();
                    this.updateAll(); // мгновенный перерендер интерфейса после смены фазы
                }
            };
            this.rootContainer.appendChild(endTurnButton);
        }
    }

    /**
     * ⚙️ 2.4. КНОПКА ВЫЗОВА МЕНЮ НАСТРОЕК (В правом верхнем углу)
     */
    renderSettingsTrigger() {
        // Проверяем, нет ли уже кнопки на экране
        if (document.getElementById('hud-settings-trigger')) return;

        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'hud-settings-trigger';

        // Перехватываем мышь, чтобы клик не шёл на гексы карты
        triggerBtn.style.pointerEvents = 'auto';

        // Конфигурация иконки (в будущем пойдёт из админки)
        const rawIcon = 'assets/icons/gear.png';
        const cachedIcon = window.gameAssets[rawIcon] || rawIcon;

        Object.assign(triggerBtn.style, {
            position: 'absolute',
            right: '115px',
            top: '10px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(20, 24, 30, 0.85)',
            border: '2px solid #3a4759',
            backgroundImage: `url("${cachedIcon}")`,
            backgroundPosition: 'center',
            backgroundSize: '65% no-repeat', // Слегка уменьшаем иконку внутри круга
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.1s ease',
            padding: '8px',
            zIndex: '1000' // Всегда поверх карты и шкал персонажа
        });

        triggerBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;

        // При клике открываем наше новое внутриигровое меню через ScreenManager
        triggerBtn.onclick = (e) => {
            e.stopPropagation();
            if (AppState.engine.ScreenManager) {
                if(window.stopTicker) window.stopTicker();
                AppState.engine.ScreenManager.renderScreen('in_game_menu');
            }
        };

        // Добавляем в твой корневой HUD-контейнер
        this.rootContainer.appendChild(triggerBtn);
    }

    /**
     * 📜 2.6. ТРЕКЕР КВЕСТОВ (Правая панель, под шестерёнкой)
     */
    renderQuestTracker() {
        // 1. Ищем первый активный квест для быстрого отображения на HUD
        const playerQuestIds = AppState.player?.quests || [];
        let activeQuest = null;

        // Пробегаемся по квестам игрока и ищем первый со статусом 'active'
        for (const id of playerQuestIds) {
            const q = AppState.quests?.[id];
            if (q && q.status === 'active') {
                activeQuest = q;
                break;
            }
        }

        // Если активных квестов вообще нет, выводим заглушку
        const questTitleText = activeQuest ? _loc(activeQuest.title || activeQuest.id) : _t('quests.no_active');

        const trackerBtn = document.createElement('button');
        trackerBtn.id = 'hud-quest-tracker';

        // Перехватываем мышь, чтобы клик не улетал на гексы карты
        trackerBtn.style.pointerEvents = 'auto';

        // Инлайновая стилизация компактной горизонтальной плашки-кнопки
        Object.assign(trackerBtn.style, {
            position: 'absolute',
            left: '20px',
            top: '110px',
            width: '180px', // Вытянутая форма для текста квеста
            height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)',
            border: '1px solid #3a4759',
            borderRadius: '6px', // Аккуратные скругленные углы
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: '8px',
            outline: 'none',
            boxSizing: 'border-box',
            zIndex: '1000'
        });

        // Наполнение: Слева маленькая встроенная SVG-иконка свитка, справа название квеста
        trackerBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; flex-shrink: 0;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <div style="color: #fff; font-family: sans-serif; font-size: 11px; font-weight: bold; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; pointer-events: none;">
        <span style="color: #ffd166; font-size: 9px; display: block; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">
            ${activeQuest?.type === 'global' ? _t('quests.global') : _t('quests.quest')}
        </span>
        ${questTitleText}
      </div>
    `;

        // При тапе/клике открываем пока еще не созданный экран квестов через ScreenManager
        trackerBtn.onclick = (e) => {
            e.stopPropagation();
            if (AppState.engine.ScreenManager) {
                AppState.engine.ScreenManager.renderScreen('quests_screen', AppState);
            }
        };

        this.rootContainer.appendChild(trackerBtn);
    }


    /**
     * 🗺️ 2.7. КОМПАКТНАЯ МИНИ-КАРТА (Правый верхний угол, под шестеренкой)
     */
    /**
     * 🗺️ 2.7. КОМПАКТНАЯ МИНИ-КАРТА (Отрисовка из коллекции Map)
     */
    renderMinimap() {
        // if (AppState.engine?.ScreenManager?.currentScreenId) return;

        const minimapContainer = document.createElement('div');
        minimapContainer.id = 'hud-minimap-container';
        minimapContainer.style.pointerEvents = 'auto';

        const mapSize = 120; // Размеры круглого окна радара

        Object.assign(minimapContainer.style, {
            position: 'absolute',
            right: '10px',
            top: '10px',
            width: `${mapSize}px`,
            height: `${mapSize}px`,
            backgroundColor: 'rgba(10, 14, 22, 0.85)',
            border: '2px solid #3a4759',
            borderRadius: '50%', // Модная круглая мини-карта
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        const canvas = document.createElement('canvas');
        canvas.width = mapSize;
        canvas.height = mapSize;
        const ctx = canvas.getContext('2d');

        // Центрируем карту вокруг активного персонажа (Рафаэля)
        const activeChar = AppState.entities[AppState.play?.activeCharacterId];
        const centerQ = activeChar?.mapPosition?.q || 0;
        const centerR = activeChar?.mapPosition?.r || 0;

        const scale = 12; // Масштаб шага гексов на радаре
        const centerX = mapSize / 2;
        const centerY = mapSize / 2;

        // СТРОГИЙ ФИКС: Читаем AppState.map.tiles как объект класса Map!
        // СТРОГИЙ ФИКС ГЕОМЕТРИИ И ЦВЕТОПЕРЕДАЧИ
        const mapTilesMap = AppState.map?.tiles;

        if (mapTilesMap && typeof mapTilesMap.entries === 'function') {
            for (const [key, value] of mapTilesMap.entries()) {
                const tile = value?.tile || value;
                if (!tile) continue;

                const q = tile.q !== undefined ? tile.q : (tile.position?.q !== undefined ? tile.position.q : null);
                const r = tile.r !== undefined ? tile.r : (tile.position?.r !== undefined ? tile.position.r : null);

                if (q === null || r === null) continue;

                // Считаем относительные координаты гекса от Рафаэля
                const relativeQ = q - centerQ;
                const relativeR = r - centerR;

                // =========================================================================
                // ТОЧНАЯ МАТЕМАТИКА ГЕКСАГОНАЛЬНОЙ СЕТКИ (Убирает зазоры и дыры)
                // =========================================================================
                // Для Flat-top hex разнос по X равен 1.5 * радиус. Разнос по Y равен sqrt(3) * радиус.
                const hexRadius = 7; // ИСПРАВЛЕНО: Уменьшили радиус шага, чтобы гексы встали плотно друг к другу

                const hexX = centerX + hexRadius * (1.5 * relativeQ);
                const hexY = centerY + hexRadius * (Math.sqrt(3) * (relativeR + relativeQ / 2));

                // Отрезаем всё, что выходит за круглые границы мини-карты
                const distFromCenter = Math.sqrt(Math.pow(hexX - centerX, 2) + Math.pow(hexY - centerY, 2));
                if (distFromCenter > (mapSize / 2) - 2) continue;

                // Извлекаем имя ландшафта (проверяем все возможные поля из админки)
                const rawType = tile.type || tile.terrain || tile.texture || tile.id || '';
                const type = String(rawType).toLowerCase();

                // =========================================================================
                // АВТООПРЕДЕЛЕНИЕ ЦВЕТА ПО РЕАЛЬНЫМ НАЗВАНИЯМ ФАЙЛОВ
                // =========================================================================
                const tileKey = tile.type || tile.terrain;
                const terrainData = AppState.ConfigTerrain[tileKey];
                const numericColor = terrainData ? terrainData.fallbackColor : 0x1a1f2c;
                const tileColor = "#" + numericColor.toString(16).padStart(6, '0');

                // Рисуем закругленный гекс. Увеличиваем радиус точки (hexRadius * 0.95), чтобы они сомкнулись
                ctx.beginPath();
                ctx.arc(hexX, hexY, hexRadius * 0.95, 0, 2 * Math.PI);
                ctx.fillStyle = tileColor;
                ctx.fill();
            }
        }


        // 2. ОТРИСОВКА МАРКЕРОВ ПЕРСОНАЖЕЙ НА РАДАРЕ
        Object.values(AppState.entities).forEach(char => {
            if (!char.mapPosition || char.stats?.hp <= 0) return;

            const relativeQ = char.mapPosition.q - centerQ;
            const relativeR = char.mapPosition.r - centerR;

            const charX = centerX + scale * (3/2 * relativeQ);
            const charY = centerY + scale * (Math.sqrt(3)/2 * relativeQ + Math.sqrt(3) * relativeR);

            const distFromCenter = Math.sqrt(Math.pow(charX - centerX, 2) + Math.pow(charY - centerY, 2));
            if (distFromCenter > (mapSize / 2) - 4) return;

            // Зеленый — активный игрок, красный — орк Громм4
            let markerColor = '#ffd166';
            if (char.id === AppState.play?.activeCharacterId) markerColor = '#00ffcc';
        else if (char.faction === 'orcs' || char.id === 'gromm4') markerColor = '#ff3333';

            ctx.beginPath();
            ctx.arc(charX, charY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = markerColor;
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        minimapContainer.appendChild(canvas);
        this.rootContainer.appendChild(minimapContainer);
    }


    renderFactionResources() {
        const playerFactionId = AppState.player?.faction || 'darkwood';
        const faction = AppState.factions?.[playerFactionId];
        const activeLeaderId = faction.leaderCharId || 'rafael';

        // 1. Находим текущую фракцию игрока через его активного лидера
        const leaderChar = AppState.characters?.[activeLeaderId];

        if (!faction) return;

        // 2. Ищем на странице старый виджет, если его нет — создаем с нуля
        let widget = document.getElementById('global-faction-resources-bar');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'global-faction-resources-bar';

            // Задаем тонкий, аккуратный мобильный стиль по центру сверху
            Object.assign(widget.style, {
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '0 20px',
                backgroundColor: 'rgba(17, 22, 34, 0.85)',
                border: `2px solid rgb(52, 73, 94)`,
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                zIndex: '800', // Чуть ниже полноэкранных окон статов, но выше карты
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                userSelect: 'none',
            });
            document.body.appendChild(widget);
        }

        // Привязываем цвет рамки кstrokeColor фракции из твоего конфига!
        if (faction.strokeColor) {
            widget.style.borderColor = `#${faction.strokeColor.toString(16).padStart(6, '0')}`;
        }

        // 3. Вытаскиваем текущие ресурсы и секундный доход фракции
        const res = faction.resources || { gold: 0, wood: 0, ore: 0, food: 0 };
        const prod = faction.production || { gold: 0, wood: 0, ore: 0, food: 0 };

        // Вспомогательный мини-метод для форматирования строки ресурса: "💰 1000 (+10)"
        const formatRes = (icon, amount, income) => {
            const incomeText = income > 0 ? `<span style="color:#2ea44f; font-size:9px; margin-left:2px;">+${income}</span>` : '';
            return `<div style="display:flex; align-items:center; color:#fff; gap:4px;">
                        <span>${icon}</span>
                        <span>${amount}</span>
                        ${incomeText}
                    </div>`;
        };

        // Название фракции с ее уникальным цветом текста
        const factionColorHex = faction.color ? `#ffd166` : '#fff';
        const factionNameHtml = `<div style="color:${factionColorHex}; border-right:1px solid #232d38; padding-right:12px; margin-right:5px; font-family:sans-serif;">${faction.name}</div>`;

        // Собираем всю строку ресурсов
        widget.innerHTML = `
            ${factionNameHtml}
            ${formatRes('💰', res.gold, prod.gold)}
            ${formatRes('🪵', res.wood, prod.wood)}
            ${formatRes('⛏️', res.ore, prod.ore)}
            ${formatRes('🌾', res.food, prod.food)}
        `;

        widget.onclick = () => {
            if (AppState.engine?.ScreenManager) {
                renderFactionScreen();
            }
        };
    }

    renderFactionCharactersList() {
        let container = document.getElementById('global-faction-characters-sidebar');

        const playerFactionId = AppState.player?.faction;
        if(!playerFactionId) {
            if(container) container.remove();
            return;
        }

        const activeCharId = AppState.play?.activeCharacterId || 'rafael';

        // 1. Ищем старый контейнер на экране, если нет — создаем
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-faction-characters-sidebar';

            // Фиксируем панель строго по левому центру экрана
            Object.assign(container.style, {
                position: 'absolute',
                top: '170px',
                left: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: '800', // На уровне верхнего виджета ресурсов
                userSelect: 'none',
                pointerEvents: 'auto'
            });
            document.body.appendChild(container);
        }
        container.innerHTML = ''; // Чистим старые аватары

        // 2. Сканируем AppState.characters и собираем УНИКАЛЬНЫХ героев нашей фракции
        // (Игнорируем наемных безымянных юнитов, у которых прописана цена cost в статах)
        const factionHeroes = Object.values(AppState.characters).filter(char => {
            return char && char.faction === playerFactionId && (!char.stats?.cost);
        });

        // 3. Динамически рендерим круглые мобильные тач-кнопки для каждого героя
        factionHeroes.forEach(char => {
            const charBtn = document.createElement('div');
            const isCurrentActive = char.id === activeCharId;

            // Цветовой акцент берем из конфига нашей фракции
            const factionObj = AppState.factions?.[playerFactionId];
            const fColor = factionObj?.strokeColor ? `#${factionObj.strokeColor.toString(16).padStart(6, '0')}` : '#58a6ff';

            Object.assign(charBtn.style, {
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: isCurrentActive ? `2px solid ${fColor}` : '2px solid #232d38',
                backgroundColor: isCurrentActive ? '#1c2635' : 'rgba(17, 22, 34, 0.85)',
                boxShadow: isCurrentActive ? `0 0 10px ${fColor}55` : '0 4px 10px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s',
                boxSizing: 'border-box'
            });

            const imgUrl = window.gameAssets[char.avatar || char.icon];

            // Рендерим картинку из .image или фолбэкаемся на иконку/букву
            const imgHtml = imgUrl
                ? `<img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" />`
                : `<span style="font-size:18px; pointer-events:none;">${char.icon || char.name[0]}</span>`;

            charBtn.innerHTML = imgHtml;

            // Маленький маркер ХП под аватаркой для контроля состояния героя на лету
            if (char.stats?.hp !== undefined && char.stats?.maxHp) {
                const hpPercent = Math.min(100, (char.stats.hp / char.stats.maxHp) * 100);
                const hpBar = document.createElement('div');
                Object.assign(hpBar.style, {
                    position: 'absolute', bottom: '-2px', left: '15%', width: '70%', height: '3px',
                    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden'
                });
                hpBar.innerHTML = `<div style="width:${hpPercent}%; height:100%; background-color:#e74c3c;"></div>`;
                charBtn.style.position = 'relative';
                charBtn.appendChild(hpBar);
            }

            // 🚀 КЛИК-ПЕРЕХВАТ: Мгновенное переключение активного персонажа и фокус камеры
            charBtn.onclick = () => {

                AppState.engine.playerClickManager.executeCharacterSelect(char.id);

                // if (char.id === AppState.play.activeCharacterId) return; // Уже выбран
                //
                // console.log(`🔄 [CharacterSelector] Переключение управления на героя: ${char.name}`);
                //
                // // 1. Меняем ID активного лидера в стейте игры
                // AppState.play.activeCharacterId = char.id;
                //
                // // 2. Принудительно центрируем камеру PixiJS на новых координатах гекса
                // if (char.mapPosition && AppState.engine?.mapManager?.centerCameraOnTile) {
                //     AppState.engine.mapManager.centerCameraOnTile(char.mapPosition.q, char.mapPosition.r);
                // }
                //
                // // 3. Обновляем все UI-слои, чтобы верхняя панель и этот сайдбар перерисовались синхронно
                // if (AppState.engine?.uiManager?.updateAll) {
                //     AppState.engine.uiManager.updateAll();
                // } else {
                //     // Если общего метода нет, дергаем этот же виджет точечно для смены рамки
                //     PlayerCharactersWidget.update();
                // }
            };

            container.appendChild(charBtn);
        });
    }


    /**
     * Вспомогательный метод нормализации списка способностей с автоатакой на первом месте
     */
    getNormalizedSkillsList(char) {
        const list = [{ skill_id: 'auto_attack', level: 1, isAutoAttack: true }];
        if (char.skills) {
            char.skills.forEach(s => list.push(s));
        }
        return list;
    }




    showInteractionMenu() {
        const activeCharId = AppState.play?.activeCharacterId;
        const playerFactionId = AppState.player?.faction;
        const heroUnit = activeCharId ? AppState.entities?.[activeCharId] : null;

        const tile = AppState.map.tiles.get(`${heroUnit.mapPosition.q},${heroUnit.mapPosition.r}`);
        const entity = Object.values(AppState.entities || {}).find(e => e.id!==activeCharId && e.mapPosition.q === tile.q && e.mapPosition.r === tile.r);

        // 1. Ищем или создаем контейнер для мобильных кнопок внизу экрана
        let actionContainer = document.getElementById('mobile-action-bar');
        if (!actionContainer) {
            actionContainer = document.createElement('div');
            actionContainer.id = 'mobile-action-bar';
            Object.assign(actionContainer.style, {
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '12px', zIndex: '900', padding: '10px 20px',
                backgroundColor: 'rgba(17, 22, 34, 0.92)', border: '2px solid #34495e',
                borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
            });
            document.body.appendChild(actionContainer);
        }
        actionContainer.style.display = "flex";
        actionContainer.innerHTML = ''; // Очищаем старые кнопки

        const hexMath = AppState.engine.hexMath;
        const neighbors = hexMath.getNeighbors(heroUnit.mapPosition.q, heroUnit.mapPosition.r);
        let waterTileCoords = null;

        if (heroUnit.type !== 'ship') {

            // Ищем, есть ли на соседних клетках наш собственный корабль
            let nearShipInstance = null;

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                console.log(n.q,n.r);
                const objOnTile = Object.values(AppState.entities || {}).find(e => e.type === 'ship' && e.mapPosition.q === n.q && e.mapPosition.r === n.r);
                console.log(objOnTile);
                if (objOnTile && objOnTile.faction === playerFactionId) {
                    nearShipInstance = objOnTile;
                    break; // Нашли ближайшую свободную посудину фракции!
                }
            }

            // Если корабль пришвартован на соседнем гексе воды — выводим кнопку посадки
            if (nearShipInstance) {
                const label = _t('interactions.board_ship');
                const boardBtn = this._createInteractionMobileButton('🚢', label, '#3498db');

                boardBtn.onclick = () => {
                    // 1. Прячем героя в трюм (units) корабля по твоей плоской схеме
                    if (!nearShipInstance.units) nearShipInstance.units = {};
                    nearShipInstance.units[activeCharId] = 1;

                    // 2. Выключаем отображение человечка на суше
                    heroUnit.mapPosition = {};

                    // 3. Передаем штурвал управления самому Кораблю
                    AppState.play.activeCharacterId = nearShipInstance.id;

                    // Закрываем меню действий
                    // this.clearCurrentScreen();

                    // Полностью обновляем вьюпорт Pixi иHUD
                    if (window.renderMap) window.renderMap();
                    if (AppState.engine.uiManager?.updateAll) AppState.engine.uiManager.updateAll();

                };
                actionContainer.appendChild(boardBtn);
            }
        }

        // =========================================================================
        // 🏖️ ВЫСАДКА: ВЫБРАН КОРАБЛЬ, ИЩЕМ СВОБОДНУЮ СУШУ РЯДОМ ДЛЯ ДЕСАНТА
        // =========================================================================
        if (heroUnit.type === 'ship') {

            // Сканируем трюм корабля на наличие живых пассажиров по твоей плоской схеме units
            const passengerIds = Object.keys(heroUnit.units || {}).filter(id => heroUnit.units[id] > 0);

            if (passengerIds.length > 0) {
                const hexMath = AppState.engine.hexMath;
                const neighbors = hexMath.getNeighbors(heroUnit.mapPosition.q, heroUnit.mapPosition.r);
                let targetLandTile = null;

                // Сканируем соседей, чтобы найти ПЕРВЫЙ доступный гекс суши без других объектов поверх
                for (const nCoords of neighbors) {
                    const tile = AppState.map.tiles.get(`${nCoords.q},${nCoords.r}`);
                    // Суша — это всё, что в твоем движке НЕ является водой/океаном и не заблокировано горами
                    if (tile && tile.type !== 'water' && tile.type !== 'ocean' && !tile.blocksMovement && !tile.object) {
                        targetLandTile = tile;
                        break; // Подходящий берег найден!
                    }
                }

                // Если корабль стоит вплотную к твоему берегу — зажигаем кнопку десанта
                if (targetLandTile) {
                    const label = _t('interactions.disembark_ship');
                    const disembarkBtn = this._createInteractionMobileButton('🚶', label, '#e67e22');

                    disembarkBtn.onclick = () => {
                        // Забираем первого героя из трюма
                        const charId = passengerIds[0];
                        const char = AppState.characters?.[charId];

                        if (char) {
                            // 1. Материализуем героя на найденной клетке суши
                            char.mapPosition.q = targetLandTile.q;
                            char.mapPosition.r = targetLandTile.r;
                            char.isHidden = false; // Возвращаем спрайт человека на карту!

                            // 2. Стираем его запись из трюма корабля
                            heroUnit.units[charId] = 0;

                            // 3. Возвращаем активное выделение игрока обратно на высаженного героя
                            AppState.play.activeCharacterId = charId;
                        }

                        if (window.renderMap) window.renderMap();
                        if (AppState.engine.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                    };
                    actionContainer.appendChild(disembarkBtn);
                }
            }
        }

        if(entity) {
            // Выводим имя объекта над кнопками для понимания
            const titleLabel = document.createElement('div');
            titleLabel.textContent = entity.name;
            titleLabel.style.cssText = 'position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:#ffd166; font-size:11px; font-weight:bold; text-shadow:1px 1px 2px #000; white-space:nowrap;';
            actionContainer.appendChild(titleLabel);

            // 2. ДИНАМИЧЕСКАЯ ГЕНЕРАЦИЯ КНОПОК ПО КОМПОНЕНТАМ ОБЪЕКТА (Твоя логика!)

            if (entity.type === 'city' || entity.type === 'mine' || entity.type === 'port') {

                const isMyStructure = entity.faction === playerFactionId;

                if (isMyStructure) {
                    // =========================================================================
                    // 🏛️ ВАРИАНТ А: ОБЪЕКТ НАШ! Показываем кнопку Управления
                    // =========================================================================
                    const label = _t('interactions.manage');
                    const manageBtn = this._createInteractionMobileButton('🏛️', label, '#3498db'); // Приятный синий цвет

                    manageBtn.onclick = () => {
                        // 1. Сначала полностью гасим мобильное меню взаимодействия, чтобы не было наложения слоев
                        // this.clearCurrentScreen();
                        AppState.play.selectedObject = entity;
                        AppState.engine.ScreenManager.renderScreen('object_screen');
                    };
                    actionContainer.appendChild(manageBtn);

                } else {
                    // =========================================================================
                    // 🏰 ВАРИАНТ Б: ОБЪЕКТ ЧУЖОЙ ИЛИ НЕЙТРАЛЬНЫЙ! Показываем кнопку Захвата (Твой старый рабочий код)
                    // =========================================================================
                    // Кнопка Захвата горит только если у объекта нет живого гарнизона
                    if (!entity.units || !Object.keys(entity.units).length) {
                        const label = _t('interactions.capture');
                        const captureBtn = this._createInteractionMobileButton('🏰', label, '#e67e22'); // Оранжевый цвет захвата

                        captureBtn.onclick = () => {
                            if (playerFactionId) {
                                // Аннексируем объект и всю его провинцию
                                AppState.engine.factionManager.claimObjectTerritory(entity,  tile, playerFactionId);
                                // Пересчитываем макро-экономику государства в AppState.factions.production
                                AppState.engine.factionManager.updateFactionProduction(playerFactionId);
                            }


                            this.showInteractionMenu(entity, tile);
                            // this.clearCurrentScreen();

                            if (window.renderMap) window.renderMap();
                            if (AppState.engine.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                        };
                        actionContainer.appendChild(captureBtn);
                    }
                }
            }





            // =========================================================================
            // 🚢 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Спавн корабля на соседней воде ИЗ МЕНЮ ПОРТА
            // =========================================================================
            if (entity.type === 'port' && entity.faction === playerFactionId) {
                console.log('=== here is port');

                for (let i = 0; i < neighbors.length; i++) {
                    const n = neighbors[i];
                    const t = AppState.map.tiles.get(`${n.q},${n.r}`);
                    if (t && (t.type === 'water' || t.type === 'ocean')) {
                        waterTileCoords = { q: n.q, r: n.r };
                        break; // Первая свободная вода найдена!
                    }
                }
                // Если свободная вода рядом есть — выводим кнопку спуска корабля прямо в меню
                if (waterTileCoords) {
                    const shipCost = 50;
                    const playerGold = AppState.factions?.[playerFactionId]?.resources?.gold || 0;
                    const canBuild = playerGold >= shipCost;

                    const label = `${_t('interactions.hire_ship')} (${shipCost})`;
                    const buildShipBtn = this._createInteractionMobileButton('🚢', label, '#2ea44f');

                    buildShipBtn.onclick = () => {
                        if (canBuild) {
                            // 1. Честно списываем золото у государства
                            AppState.factions[playerFactionId].resources.gold -= shipCost;

                            // 2. 🚀 ВЫЗЫВАЕМ ТВОЙ НА ТИВНЫЙ МЕТОД СПАВНА ОБЪЕКТА НА ВОДНОЙ КЛЕТКЕ!
                            // Он создаст объект по прототипу 'ship', выставит type: "city" и пропишет базовые ХП и движение
                            const newShipInstance = AppState.engine.ObjectManager.spawnObject('ship', waterTileCoords.q, waterTileCoords.r, playerFactionId);

                            if (newShipInstance) {
                                // 3. МГНОВЕННЫЙ ТРАНСФЕР: Прячем героя в плоский гарнизон (units) созданного корабля
                                if (!newShipInstance.units) newShipInstance.units = {};
                                newShipInstance.units[activeCharId] = 1;

                                // Обновляем карту PixiJS и панели ресурсов HUD под новый стейт
                                if (window.renderMap) window.renderMap();
                                if (AppState.engine.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
                            }
                        } else {
                            console.warn("[Port] Недостаточно золота для постройки корабля.");
                        }
                    };
                    actionContainer.appendChild(buildShipBtn);
                }
            }

            // 🏴‍☠️ Кнопка А: Объект интерактивен и имеет инвентарь (Сундук "chest1" или Труп врага)
            if (entity.interactable && entity.backpack) {
                const lootBtn = this._createInteractionMobileButton('📦', _t('interactions.loot'), '#e67e22');
                lootBtn.onclick = () => {
                    this.hideInteractionMenu();
                    AppState.engine.ScreenManager._selectedCharId = entity.id;
                    AppState.engine.ScreenManager.renderScreen('character_transfer');
                };
                actionContainer.appendChild(lootBtn);
            }

            const isChar = !!AppState.characters[entity.id];
            // 🏛️ Кнопка Б: У объекта есть встроенный диалог / квест (Лагерь "elf_camp" или "ancient_ruins")
            if ((entity.dialog || isChar) && !entity.isDead) {
                const talkBtn = this._createInteractionMobileButton('💬',  _t('interactions.talk'), '#3498db');
                talkBtn.onclick = () => {
                    this.hideInteractionMenu();
                    if (AppState.engine?.dialogManager) {
                        AppState.engine.dialogManager.trigger('character_dialog_' + entity.id);
                    }
                };
                actionContainer.appendChild(talkBtn);
            }

            // 🪜 Кнопка В: Наступили на лестницу или портал авто-перехода ("ladder")
            if (entity.autoStep || entity.mapTo) {
                const travelBtn = this._createInteractionMobileButton('🪜',  _t('interactions.enter'), '#2ecc71');
                travelBtn.onclick = () => {
                    this.hideInteractionMenu();
                    const destination = entity.mapTo;
                    if (destination && AppState.engine.MapManager) {
                        AppState.engine.MapManager.switchMap(destination.mapId);
                        AppState.engine.MapManager.teleportCharacter(AppState.play.activeCharacterId, destination.mapId, destination.q, destination.r);
                        AppState.engine.MapManager.refreshWorldRender(AppState.play.activeCharacterId);
                    }
                };
                actionContainer.appendChild(travelBtn);
            }

            if (entity.goods || (entity.backpack && entity.faction !== AppState.player?.faction)) {
                const tradeBtn = this._createInteractionMobileButton('⚖️', _t('interactions.trade'), '#ffd166');

                tradeBtn.onclick = () => {
                    // 1. Фиксируем выбранного торговца в стейт выделения
                    if (!AppState.play) AppState.play = {};
                    AppState.play.selectedObject = entity;
                    if (AppState.engine?.ScreenManager) {
                        AppState.engine.ScreenManager.renderScreen('trade_screen');
                    }
                };
                actionContainer.appendChild(tradeBtn);
            }
        }

        // 🚀 СТРОГИЙ ДАТА-ДРИВЕН ФИКС: Кнопка трейда на основе наличия поля goods или backpack у торговца


        if(actionContainer.innerHTML) {
            const closeBtn = this._createInteractionMobileButton('✕', '', '#7f8c8d');
            closeBtn.style.borderRadius = '50%';
            closeBtn.onclick = () => this.hideInteractionMenu();
            actionContainer.appendChild(closeBtn);
            actionContainer.style.display = 'flex';
        }
        else {
            actionContainer.style.display = 'none';
        }
        // Кнопка закрытия / игнорирования (Просто сойти с клетки)
    }

    hideInteractionMenu() {
        const actionContainer = document.getElementById('mobile-action-bar');
        if (actionContainer) {
            actionContainer.innerHTML = '';
            actionContainer.style.display = 'none';
        }
    }

    /**
     * Вспомогательный метод сборки красивой мобильной тач-кнопки
     */
    _createInteractionMobileButton(icon, text, bgColor) {
        const btn = document.createElement('button');
        Object.assign(btn.style, {
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
            backgroundColor: bgColor, border: 'none', borderRadius: '20px', color: '#fff',
            fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        });
        btn.innerHTML = `<span>${icon}</span>${text ? `<span>${text}</span>` : ''}`;
        return btn;
    }
}


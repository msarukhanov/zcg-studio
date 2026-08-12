import { AppState } from '../shared/GameState.js';

export class TimeManager {
    constructor() {
        this.currentMode = "free_roam"; // Текущее состояние: "free_roam" или "combat"
        this.initTimeTicker();
    }

    /**
     * ⏳ ЧАСТЬ 1: Инициализация системного реалтайм-тикера игры
     */

    initTimeTicker() {
        if(!AppState.engine.app) return;
        AppState.engine.app.ticker.add((ticker) => {
            const settings = AppState.turn_settings;
            if (!settings) return;

            // =========================================================================
            // ⚡ СЦЕНАРИЙ 1: Полный реалтайм-бой (RTS режим)
            // =========================================================================
            if (settings.turn_mode === "realtime") {
                const deltaMS = ticker.deltaTime * (1000 / 60);

                // Время для тика яда и кулдаунов течет непрерывно
                this.updateGlobalTime(deltaMS);

                // СТРОГИЙ ФИКС: Инициализируем и пинаем ИИ непрерывно с первой секунды игры!
                if (AppState.engine.aiManager) {
                    AppState.engine.app.ticker.remove(this._oldAILoop); // На всякий случай чистим старый
                    AppState.engine.aiManager.handleAITurn(null, "realtime");
                }
                return;
            }

            // =========================================================================
            // ⏳ СЦЕНАРИЙ 2: Пошаговый бой (свободный бег вне боя)
            // =========================================================================
            if (settings.turn_mode === "turn" && settings.free_roam && this.currentMode === "free_roam") {
                const deltaMS = ticker.deltaTime * (1000 / 60);
                this.updateGlobalTime(deltaMS);
            }
        });
    }

    /**
     * ⏳ ЧАСТЬ 2: Универсальное обновление времени для всех эффектов и кулдаунов
     * Принимает deltaMS (реальные миллисекунды кадра ИЛИ виртуальный шаг пошагового хода)
     */
    updateGlobalTime(deltaMS) {
        if (!AppState.entities) return;

        Object.keys(AppState.entities).forEach(charId => {
            const char = AppState.entities[charId];
            if (!char) return;

            // =========================================================================
            // ⚡ РЕАЛТАЙМ-ТАЙМЕРЫ ПЕРЕЗАРЯДКИ АТАК И ДВИЖЕНИЯ (ФИКС ЖЁСТКОГО СПАМА)
            // =========================================================================
            // Инициализируем таймеры, если их ещё нет в стейте персонажа
            if (char.atkReadyTimer === undefined) char.atkReadyTimer = 0;
            if (char.mvmReadyTimer === undefined) char.mvmReadyTimer = 0;

            // Плавно уменьшаем внутренние кулдауны на величину прошедшего кадра deltaMS
            if (char.atkReadyTimer > 0) char.atkReadyTimer = Math.max(0, char.atkReadyTimer - deltaMS);
            if (char.mvmReadyTimer > 0) char.mvmReadyTimer = Math.max(0, char.mvmReadyTimer - deltaMS);

            // 1. Обновление времени жизни наложенных эффектов ( DoT / баффы )
            if (char.effects && char.effects.length > 0) {
                for (let i = char.effects.length - 1; i >= 0; i--) {
                    const eff = char.effects[i];
                    eff.timer += deltaMS;

                    const interval = eff.tick_interval || 1000;

                    if (eff.timer >= interval) {
                        eff.timer = 0;
                        this.triggerEffectTick(char, charId, eff);
                    }

                    eff.duration -= deltaMS;

                    if (eff.duration <= 0) {
                        console.log(`⏳ [TimeManager] Эффект ${eff.id} на ${char.name} полностью истек и удален.`);
                        this.removeEffectFromUnit(char, i);
                    }
                }
            }
        });
    }

    /**
     * ⏳ ЧАСТЬ 3: Изолированный принудительный шаг времени для пошагового боя
     * Вызывается TurnManager-ом строго при переключении хода/раунда
     */
    advanceTurnEffects() {
        const settings = AppState.turn_settings;
        if (!settings) return;

        // Берем величину шага из вашего примера конфига (1000 мс)
        const stepMS = settings.virtual_turn_ms || 1000;

        console.log(`⏳ [TimeManager] Пошаговый бой: Прокрутка времени эффектов вперед на +${stepMS}мс (1 ход)`);

        // Принудительно скармливаем виртуальное время в наш главный метод обновления
        this.updateGlobalTime(stepMS);
    }

    /**
     * Вызов непосредственной логики тика (списание ХП от яда и т.д.)
     */
    triggerEffectTick(char, charId, eff) {
        const effConfig = AppState.effects[eff.id];
        if (!effConfig) return;

        // Если это периодический урон (DoT, яд)
        if (effConfig.type === "damage_over_time" && effConfig.formula) {
            const damage = parseInt(effConfig.formula, 10) || 0;

            // Списываем здоровье
            char.stats.hp = Math.max(0, char.stats.hp - damage);
            console.log(`☣️ [TimeManager] Эффект "${effConfig.name}" нанес ${damage} урона персонажу ${char.name}. Осталось HP: ${char.stats.hp}`);

            // Вызываем созданный нами ранее глобальный всплывающий текст урона
            if (AppState.engine.spawnPopupText) {
                AppState.engine.spawnPopupText(char, `-${damage}`, 0x9b59b6); // Кислотно-фиолетовый цвет дебаффа
            }

            // Если юнит умер от яда в свой ход — удаляем его из стейта
            if (char.stats.hp <= 0) {
                console.log(`💀 [TimeManager] ${char.name} скончался от действия эффекта ${effConfig.name}`);
                delete AppState.entities[charId];
                AppState.engine.renderMap();
            }
        }
    }

    /**
     * Очистка статов при удалении эффекта
     */
    removeEffectFromUnit(char, index) {
        const eff = char.effects[index];
        const effConfig = AppState.effects[eff.id];

        // Если это был бафф на статы — возвращаем параметры назад перед удалением
        if (effConfig && effConfig.type === "stat_modifier" && effConfig.stat && eff.applied_value) {
            char.stats[effConfig.stat] -= eff.applied_value;
            console.log(`🔄 [TimeManager] Стат [${effConfig.stat}] персонажа ${char.name} возвращен к норме (снято: ${eff.applied_value})`);
        }

        // Удаляем из массива
        char.effects.splice(index, 1);

        // Стираем крутящийся круг с карты, если он был привязан
        if (char.currentPassiveCircleG) {
            if (char.currentPassiveCircleG.parent) char.currentPassiveCircleG.parent.removeChild(char.currentPassiveCircleG);
            char.currentPassiveCircleG.destroy();
            char.currentPassiveCircleG = null;
        }

        AppState.engine.renderMap();
    }

    /**
     * ⏳ ЧАСТЬ 4: Переключение в режим боя (вызывается из startBattle)
     */
    switchToCombat() {
        this.currentMode = "combat";
        console.log("⏳ [TimeManager] Режим изменен на: COMBAT. Реалтайм-тикер заморожен.");
    }

    /**
     * Переключение обратно в свободный режим
     */
    switchToFreeRoam() {
        this.currentMode = "free_roam";
        console.log("⏳ [TimeManager] Режим изменен на: FREE_ROAM. Реалтайм-тикер запущен.");
    }
}

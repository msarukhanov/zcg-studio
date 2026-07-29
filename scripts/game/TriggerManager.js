import { AppState, getPactBetween } from '../shared/GameState.js';

import { ConditionValidators } from './TriggerConditions.js';
import { ActionExecutors } from './TriggerActions.js';

export const TriggerManager = {

    processEvent(eventType, context = {}) {
        // Проверяем, есть ли вообще триггеры в стейте
        const allTriggers = AppState.triggers;
        if (!allTriggers) return;

        if(eventType!=='vision') {
            console.log(`[TriggerSystem] Сигнал события: "${eventType}". Фильтрация триггеров...`);
        }

        if (!AppState.player.triggered_ids) {
            AppState.player.triggered_ids = [];
        }


        // Автоматически перебираем ВЕСЬ массив триггеров из админки
        Object.values(allTriggers).forEach(trigger => {

            const hasTriggeredBefore = AppState.player.triggered_ids.includes(trigger.id);
            const isRepeatable = trigger.repeatable === true; // Флаг из админки для многоразовых триггеров

            if (hasTriggeredBefore && !isRepeatable) {
                return; // Этот триггер уже отработал свое, выходим
            }

            // Находим в триггере условие, которое совпадает с типом произошедшего события
            const hasMatchingCondition = trigger.conditions?.some(cond => cond.type === eventType);

            // Если триггер вообще не подписан на это событие — мгновенно пропускаем его
            if (!hasMatchingCondition) return;

            // Если событие наше — запускаем валидацию ВСЕХ условий этого триггера
            const isConditionsPassed = this.evaluateConditions(trigger.conditions, context);

            if (isConditionsPassed) {
                console.log(`[TriggerSystem] 🔥 Триггер [${trigger.id}] успешно СРАБОТАЛ! Запуск действий...`);
                AppState.player.triggered_ids.push(trigger.id);
                // Выполняем цепочку экшенов
                this.executeTriggers(trigger.actions, context);
            }
        });
    },
    /**
     * Валидация массива условий на основе контекста события (Твой готовый метод с прошлого шага)
     */
    evaluateConditions(conditions, context = {}) {
        if (!conditions || conditions.length === 0) return true;

        return conditions.every(cond => {
            const validator = ConditionValidators[cond.type];
            if (typeof validator === 'function') {
                return validator(cond, context);
            }
            console.warn(`[TriggerManager] Пропущен неизвестный тип условия: "${cond.type}"`);
            return false;
        });
    },

    /**
     * 🚀 ОБНОВЛЕННЫЙ ДИСПЕТЧЕР ВЫПОЛНЕНИЯ ДЕЙСТВИЙ ТРИГГЕРОВ
     * @param {Array} triggers - Массив экшенов из конфига админки
     * @param {Object} context - Сквозной контекст события
     */
    executeTriggers(triggers, context = {}) {
        if (!triggers || triggers.length === 0) return;

        triggers.forEach(trig => {
            // Динамически ищем изолированную микро-функцию по ее типу
            const executor = ActionExecutors[trig.type];

            if (typeof executor === 'function') {
                try {
                    executor(trig, context);
                } catch (err) {
                    console.error(`[TriggerManager] Ошибка выполнения экшена "${trig.type}":`, err);
                }
            } else {
                console.warn(`[TriggerManager] Пропущено неизвестное действие триггера: "${trig.type}"`);
            }
        });
    }
};













// import { AppState, getPactBetween, DiplomaticPacts, getTileFromState } from '../shared/GameState.js';
//
// export const TriggerManager = {
//     evaluateConditions(conditions) {
//         if (!conditions || conditions.length === 0) return true; // Нет условий — проход открыт
//
//         return conditions.every(cond => {
//             if (cond.type === 'stat') {
//                 const playerValue = AppState.player?.stats?.[cond.param] || 0;
//                 const targetValue = cond.value || 0;
//
//                 if (cond.operator === '>=') return playerValue >= targetValue;
//                 if (cond.operator === '<=') return playerValue <= targetValue;
//                 if (cond.operator === '==') return playerValue == targetValue;
//                 return false;
//             }
//             else if (cond.type === 'flag') {
//                 const playerFlag = !!AppState.player?.story_flags?.[cond.param];
//                 const targetFlag = cond.value === true;
//                 return playerFlag === targetFlag;
//             }
//             return false;
//         });
//     },
//     executeTriggers(triggers) {
//         if (!triggers || triggers.length === 0) return;
//
//         triggers.forEach(trig => {
//             if (trig.type === 'modify_stat') {
//                 if (!AppState.player.stats) AppState.player.stats = {};
//                 if (!AppState.player.stats[trig.param]) AppState.player.stats[trig.param] = 0;
//
//                 // Мутируем числовой параметр игрока (сила, интеллект, репутация)
//                 AppState.player.stats[trig.param] += parseInt(trig.value) || 0;
//                 console.log(`[Trigger system] Мутация стата "${trig.param}". Новый уровень: ${Game.player.stats[trig.param]}`);
//             }
//             else if (trig.type === 'set_flag') {
//                 if (!AppState.player.story_flags) AppState.player.story_flags = {};
//
//                 // Мутируем булевый флаг истории
//                 AppState.player.story_flags[trig.param] = trig.value === true;
//                 console.log(`[Trigger system] Сюжетный флаг "${trig.param}" изменен на: ${trig.value}`);
//             }
//         });
//     }
// };





// Область видимости: { type: 'vision', entity: 'subject', target_entity: 'target', operator: '<=', distance: 3 }
// Попадание на гекс: { type: 'tile_enter', entity: 'subject', q: 5, r: -2 }
// Уход с гекса: { type: 'tile_leave', entity: 'subject', q: 5, r: -2 }
// Вступление в бой: { type: 'combat_start', entity: 'subject', target_entity: 'target' }
// ХП граница: { type: 'hp_percent', entity: 'subject', operator: '<=', value: 30 }
// Персонаж умер: { type: 'character_dead', entity: 'subject' }
// Начало разговора: { type: 'dialogue_start', entity: 'subject', target_entity: 'target', scene_id: 'tavern_inside' }
// Выбор варианта ответа: { type: 'dialogue_option', entity: 'subject', target_entity: 'target', option_id: 'ask_about_dwarf' }
// Отношение с персонажем: { type: 'relation', entity: 'subject', target_entity: 'target', operator: '>=', value: 40 }
// Роман с персонажем: { type: 'romance', entity: 'subject', target_entity: 'target', value: true }
// Пакт с фракцией: { type: 'diplomatic_pact', faction1: 'darkwood', faction2: 'elvinar', value: 'ALLIANCE' }
// Проверка флага: { type: 'flag', param: 'has_map_of_ruins', value: true }
// Проверка квеста и прогресса:
//     Статус квеста: { type: 'quest', quest_id: 'quest_moon_medicine', check: 'status', value: 'active' }
// Прогресс подквеста: { type: 'quest', quest_id: 'quest_moon_medicine', check: 'objective_progress', objective_id: 'collect_herbs', operator: '>=', value: 3 }
// Проверка статов: { type: 'stat', entity: 'subject', param: 'atk', operator: '>=', value: 15 }
// Проверка инвентаря: { type: 'inventory', entity: 'player', item_id: 'ancient_medicine', count: 1, operator: '>=' }
// Проверка уровня: { type: 'level', entity: 'subject', operator: '>=', value: 5 }
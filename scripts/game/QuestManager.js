// ==== QuestManager.js
import { AppState } from '../shared/GameState.js';

export const QuestManager = {
    /**
     * 📜 Инициализация/проверка квестов игрока.
     * Выстраивает цепочки последовательности (Sequence) для всех активных квестов.
     */
    refreshQuestChains() {
        const playerQuestIds = AppState.player?.quests || [];

        playerQuestIds.forEach(questId => {
            const quest = AppState.quests?.[questId];
            if (!quest || quest.status !== 'active') return;

            // Если у квеста включена строгая последовательность подквестов
            if (quest.is_sequential && Array.isArray(quest.objectives)) {
                let foundCurrentActive = false;

                quest.objectives.forEach(obj => {
                    if (obj.status === 'completed') {
                        // Если шаг уже выполнен, он остается выполненным
                        return;
                    }

                    if (!foundCurrentActive) {
                        // Первый еще не выполненный шаг принудительно становится АКТИВНЫМ
                        obj.status = 'active';
                        foundCurrentActive = true;
                    } else {
                        // Все последующие шаги намертво блокируются очередью
                        obj.status = 'locked';
                    }
                });
            }
        });
    },

    /**
     * Продвинуть счетчик собирательного подквеста (например, +1 к сбору трав)
     */
    advanceObjectiveCount(questId, objectiveId, amount = 1) {
        const quest = AppState.quests?.[questId];
        const obj = quest?.objectives?.find(o => o.id === objectiveId);

        if (!obj || obj.type !== 'count' || obj.status !== 'active') return;

        obj.current = Math.min(obj.target, (obj.current || 0) + amount);
        console.log(`[QuestManager] Квест "${questId}", задача "${objectiveId}": прогресс ${obj.current}/${obj.target}`);

        // Если счетчик дополз до цели — автоматически завершаем этот шаг
        if (obj.current >= obj.target) {
            this.completeObjective(questId, objectiveId);
        } else {
            // Обновляем UI трекера на HUD
            if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        }
    },

    /**
     * Принудительно завершить конкретный подквест
     */
    completeObjective(questId, objectiveId) {
        const quest = AppState.quests?.[questId];
        const obj = quest?.objectives?.find(o => o.id === objectiveId);

        if (!obj || obj.status !== 'active') return;

        obj.status = 'completed';
        console.log(`[QuestManager] Подзадача "${objectiveId}" внутри квеста "${questId}" ВЫПОЛНЕНА!`);

        // Пересчитываем цепочку: заблокированный шаг сзади теперь автоматически станет 'active'
        this.refreshQuestChains();

        // Проверяем, выполнены ли ВООБЩЕ все подзадачи квеста. Если да — закрываем сам квест!
        const allDone = quest.objectives.every(o => o.status === 'completed');
        if (allDone) {
            this.completeQuest(questId);
        } else {
            if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
        }
    },

    /**
     * Полное успешное завершение всего глобального/локального квеста
     */
    completeQuest(questId) {
        const quest = AppState.quests?.[questId];
        if (!quest || quest.status !== 'active') return;

        quest.status = 'completed';
        console.log(`[QuestManager] 🎉 КВЕСТ ВЫПОЛНЕН: "${quest.title?.ru || questId}"!`);

        // Выдаем игроку награду, если она зашита в конфиг квеста (через нашу триггерную систему!)
        if (quest.reward_triggers && AppState.engine?.triggerManager) {
            AppState.engine.triggerManager.executeTriggers(quest.reward_triggers);
        }

        // Обновляем все слои интерфейса
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    }
};

import { AppState, getPactBetween } from '../shared/GameState.js';

export class Character {
    constructor() {

    }

    /**
     * Возвращает или рассчитывает зону хода для конкретного персонажа из AppState
     * @param {string} charId - ID персонажа (например, 'rafael')
     * @param {MovementManager} movementManager - Менеджер движения для расчетов
     */
    static selectCharacter(charId, movementManager) {
        const char = AppState.entities[charId];
        if (!char) return [];

        // Если кэша доступных клеток в глобальном стейте нет — рассчитываем его один раз
        if (!char.cachedReachableTiles) {
            console.log(`🧩 [State] Расчет и кэширование зоны Дейкстры для: ${char.name}`);
            char.cachedReachableTiles = movementManager.getReachableTiles(char);
        }
        return char.cachedReachableTiles;
    }

    /**
     * Сбрасывает кэш хода персонажа в AppState (при шаге или конце раунда)
     */
    static clearMovementCache(charId) {
        if (AppState.entities[charId]) {
            AppState.entities[charId].cachedReachableTiles = null;
        }
    }
}

export class Player {
    constructor() {
        // Данные игрока теперь лежат строго в AppState.player
    }

    /**
     * Добавляет гекс в список исследованных игроком
     */
    static exploreTile(q, r) {
        AppState.player.exploredTiles.add(`${q},${r}`);
    }

    /**
     * Проверяет, посещал ли игрок эту клетку ранее (для Shroud-эффекта тумана)
     */
    static hasVisitedTile(q, r) {
        return AppState.player.exploredTiles.has(`${q},${r}`);
    }
}
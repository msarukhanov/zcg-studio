import { AppState } from '../shared/GameState.js';

export class TurnManager {
    constructor() {
        this.currentQueue = [];       // Очередь ходов (персонажи, команды или фракции)
        this.currentQueueIndex = 0;   // Текущий индекс в очереди ходов
        this.activeTurnId = null;     // ID того, кто ходит прямо сейчас (ID чара, имя фракции или команды)
    }

    /**
     * ⚔️ ЧАСТЬ 1: Запуск пошагового боя (Вызывается из вашей функции startBattle)
     */
    startBattle(epicenterTile) {
        console.log("⚔️ [TurnManager] Метод startBattle запущен!");

        if (AppState.engine.timeManager) {
            AppState.engine.timeManager.switchToCombat();
        }

        // Передаем гекс-эпицентр боя в пересборку очереди
        this.buildBattleQueue(epicenterTile);

        this.currentQueueIndex = 0;
        this.activateCurrentTurn();
    }

    /**
     * ⚔️ ЧАСТЬ 2: Сборка очереди строго вокруг эпицентра (ИСПРАВЛЕНО НАГЛУХО)
     */
    buildBattleQueue(epicenterTile) {
        const settings = AppState.turn_settings;
        const turnBy = settings ? settings.turn_by : "character";
        const hexMath = AppState.engine.hexMath;

        this.currentQueue = [];

        // Радиус вовлечения в бой (5 гексов вокруг эпицентра удара)
        const combatRadius = 3;

        // Извлекаем эпицентр драки
        let battleCenter = epicenterTile;
        if (!battleCenter) {
            const currentFighter = Object.values(AppState.entities).find(c => c.in_combat === true);
            if (currentFighter) {
                battleCenter = currentFighter.mapPosition;
            }
        }

        // КРИТИЧЕСКИЙ ФИКС: Принудительно собираем чистый плоский объект координат {q, r},
        // проверяя, где именно в прилетевшем тайле лежат ключи (в корне или во вложенном mapPosition)
        let cleanCenterCoords = null;
        if (battleCenter) {
            cleanCenterCoords = {
                q: battleCenter.q !== undefined ? battleCenter.q : (battleCenter.mapPosition?.q || 0),
            r: battleCenter.r !== undefined ? battleCenter.r : (battleCenter.mapPosition?.r || 0)
        };
        }



        // ВАРИАНТ А: Ходы по персонажам (Сортировка по скорости)
        if (turnBy === "character") {
            const characters = [];
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char || !char.stats || char.stats.hp <= 0) return;

                // Безопасно извлекаем координаты текущего проверяемого персонажа
                const cleanCharCoords = {
                        q: char.mapPosition?.q !== undefined ? char.mapPosition.q : (char.q || 0),
                    r: char.mapPosition?.r !== undefined ? char.mapPosition.r : (char.r || 0)
            };

                // Считаем расстояние строго между двумя очищенными объектами координат
                const distance = cleanCenterCoords ? hexMath.getDistance(cleanCenterCoords, cleanCharCoords) : 0;

                // Юнит вовлекается в бой, если он стоит близко к драке ИЛИ уже воюет
                if (distance <= combatRadius || char.in_combat === true) {
                    char.in_combat = true; // Выставляем маркер боя локально задетым
                    characters.push({ id: id, speed: char.stats.speed || 0 });
                }
            });

            characters.sort((a, b) => b.speed - a.speed);
            this.currentQueue = characters.map(c => c.id);
            console.log(`⚔️ [TurnManager Log] Очередь успешно построена вокруг гекса [${cleanCenterCoords?.q}, ${cleanCenterCoords?.r}]:`, this.currentQueue);
        }

        // ВАРИАНТ Б: Ходы по командам
        else if (turnBy === "team") {
            const uniqueTeams = new Set();
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char || !char.team || char.stats.hp <= 0) return;

                const cleanCharCoords = {
                        q: char.mapPosition?.q !== undefined ? char.mapPosition.q : (char.q || 0),
                    r: char.mapPosition?.r !== undefined ? char.mapPosition.r : (char.r || 0)
            };

                const distance = cleanCenterCoords ? hexMath.getDistance(cleanCenterCoords, cleanCharCoords) : 0;

                if (distance <= combatRadius || char.in_combat === true) {
                    char.in_combat = true;
                    uniqueTeams.add(char.team);
                }
            });
            this.currentQueue = Array.from(uniqueTeams);
            console.log(`⚔️ [TurnManager Log] Очередь команд построена:`, this.currentQueue);
        }

        // ВАРИАНТ В: Ходы по фракциям
        else if (turnBy === "faction") {
            const uniqueFactions = new Set();
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char || !char.faction || char.stats.hp <= 0) return;

                const cleanCharCoords = {
                        q: char.mapPosition?.q !== undefined ? char.mapPosition.q : (char.q || 0),
                    r: char.mapPosition?.r !== undefined ? char.mapPosition.r : (char.r || 0)
            };

                const distance = cleanCenterCoords ? hexMath.getDistance(cleanCenterCoords, cleanCharCoords) : 0;

                if (distance <= combatRadius || char.in_combat === true) {
                    char.in_combat = true;
                    uniqueFactions.add(char.faction);
                }
            });
            this.currentQueue = Array.from(uniqueFactions);
            console.log(`⚔️ [TurnManager Log] Очередь фракций построена:`, this.currentQueue);
        }
    }

    /**
     * ⚔️ ЧАСТЬ 3: Активация текущего хода и вызов тика эффектов
     */
    activateCurrentTurn() {
        if (this.currentQueue.length === 0) {
            console.warn("⚠️ [TurnManager] Боевая очередь пуста.");
            return;
        }

        // Фиксируем, чей сейчас ход в игре
        this.activeTurnId = this.currentQueue[this.currentQueueIndex];

        const settings = AppState.turn_settings;
        const turnBy = settings ? settings.turn_by : "character";

        console.log(`⚔️ [TurnManager] СЛЕДУЮЩИЙ ХОД: Текущая фаза принадлежит [${this.activeTurnId}] (Тип: ${turnBy})`);

        // ПРИНУДИТЕЛЬНЫЙ ШАГ ВРЕМЕНИ ДЛЯ ЭФФЕКТОВ (ЯД / БАФФЫ) строго в начале хода
        this.triggerTurnEffectsTick(turnBy);

        // Обновляем ОД (Очки Движения) для персонажей, которые сейчас получили право ходить
        this.refreshMovementPoints(turnBy);

        // Перерисовываем карту и обновляем панель кнопок навыков под активный ход
        if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
        if (AppState.engine.skillManager && AppState.engine.skillManager.redrawMap) {
            AppState.engine.skillManager.redrawMap();
        }

        // СЮДА СЛЕДУЮЩИМ ШАГОМ МЫ ВСТАВИМ ВЫЗОВ ДЛЯ AI И ИГРОКА:
        // Если право хода перешло боту компьютера — мы скомандуем ИИ начать действовать.

        if (this.redrawMap) this.redrawMap();

        if (AppState.engine.aiManager) {
            // Передаем текущую фазу и тип пошагового режима в ИИ
            AppState.engine.aiManager.handleAITurn(this.activeTurnId, turnBy);
        }
    }

    /**
     * Переключение хода на следующую позицию по кнопке "Конец Хода"
     */
    endTurn() {
        console.log(`⚔️ [TurnManager] Ход [${this.activeTurnId}] завершен игроком или системой.`);

        this.currentQueueIndex++;

        // Если очередь дошла до конца — перезапускаем боевой круг (новый раунд)
        if (this.currentQueueIndex >= this.currentQueue.length) {
            console.log("🔄 [TurnManager] РАУНД ЗАВЕРШЕН. Пересборка очереди и запуск нового раунда...");
            this.buildBattleQueue(); // Пересобираем очередь на случай, если кто-то погиб
            this.currentQueueIndex = 0;
        }

        // Активируем следующий шаг боевой очереди
        this.activateCurrentTurn();
    }

    /**
     * Логика принудительного вызова тика эффектов ( DoT / баффы ) в начале хода
     */
    triggerTurnEffectsTick(turnBy) {
        if (!AppState.engine.timeManager) return;

        // Если ходы по персонажам — время прокручивается только для одного конкретного юнита
        if (turnBy === "character") {
            const char = AppState.entities[this.activeTurnId];
            if (char && char.stats && char.stats.hp > 0) {
                // Вызываем наш готовый TimeManager
                AppState.engine.timeManager.advanceTurnEffects();
            }
        }
        // Если ходы коллективные (команды или фракции) — время прокручивается для всех сразу
        else {
            AppState.engine.timeManager.advanceTurnEffects();
        }
    }

    /**
     * Восстановление ОД (movement.current) для участников текущего хода
     */
    refreshMovementPoints(turnBy) {
        Object.keys(AppState.entities).forEach(id => {
            const char = AppState.entities[id];
            if (!char || !char.movement) return;

            let shouldRefresh = false;

            if (turnBy === "character" && id === this.activeTurnId) shouldRefresh = true;
            if (turnBy === "team" && char.team === this.activeTurnId) shouldRefresh = true;
            if (turnBy === "faction" && char.faction === this.activeTurnId) shouldRefresh = true;

            if (shouldRefresh) {
                // Сбрасываем текущие ОД к их максимальному значению из стейта
                char.movement.current = char.movement.max || 3;
                console.log(`🏃‍♂️ [TurnManager] Очки движения для ${char.name} восстановлены: ${char.movement.current}/${char.movement.max}`);
            }
        });
    }

    /**
     * Принудительное завершение боя (Вызывается, когда все враги мертвы)
     */
    endBattle() {
        console.log("⚔️ [TurnManager] Начинается завершение локального боя...");

        const settings = AppState.turn_settings;
        const turnBy = settings ? settings.turn_by : "character";

        // 1. Снимаем маркер боя СТРОГО с тех, кто состоял в текущей боевой очереди
        if (this.currentQueue && this.currentQueue.length > 0) {
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char) return;

                let wasInThisBattle = false;

                // Если бой шёл по персонажам — проверяем прямое присутствие ID в очереди
                if (turnBy === "character" && this.currentQueue.includes(id)) {
                    wasInThisBattle = true;
                }
                // If бой шёл по командам — проверяем команду юнита
                else if (turnBy === "team" && this.currentQueue.includes(char.team)) {
                    wasInThisBattle = true;
                }
                // If бой шёл по фракциям — проверяем фракцию юнита
                else if (turnBy === "faction" && this.currentQueue.includes(char.faction)) {
                    wasInThisBattle = true;
                }

                // Стираем флаг боя только если юнит физически принадлежал этой стычке
                if (wasInThisBattle) {
                    char.in_combat = false; // или delete char.in_combat;
                    console.log(`⚔️ [TurnManager] Маркер боя успешно снят с персонажа: ${char.name}`);
                }
            });
        }

        // 2. Сбрасываем внутренние указатели текущего менеджера ходов
        this.currentQueue = [];
        this.activeTurnId = null;
        this.currentQueueIndex = 0;

        // 3. Возвращаем TimeManager в режим свободного движения
        if (AppState.engine.timeManager) {
            AppState.engine.timeManager.switchToFreeRoam();
        }

        console.log("⚔️ [TurnManager] Локальный бой успешно завершён. Другие стычки на карте не задеты.");
    }


    endTurn() {
        Object.keys(AppState.factions).forEach(fId => {
            const faction = AppState.factions[fId];

            // Накатываем базовый прирост фракции
            Object.entries(faction.production).forEach(([res, amount]) => {
                faction.resources[res] = (faction.resources[res] || 0) + amount;
            });
        });
    }
}

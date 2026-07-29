import { AppState, getPactBetween } from '../shared/GameState.js';

export class AIManager {
    constructor() {
        // Менеджер пассивно ждет вызовов от TurnManager
    }

    /**
     * 🧠 ЧАСТЬ 1: Главная точка входа для фазы хода ИИ (БЕЗ ХАРДКОДА)
     */
    handleAITurn(activeTurnId, turnBy) {
        // Строго зафиксированное чтение фракции игрока по вашему приказу
        const playerFaction = AppState.player?.faction;

        // =========================================================================
        // ⚡ ОБРАБОТКА ИИ В РЕАЛЬНОМ ВРЕМЕНИ (ИСПРАВЛЕНО НАГЛУХО БЕЗ ИСМОВИНГ)
        // =========================================================================
        if (turnBy === "realtime") {
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char || char.stats?.hp <= 0) return;
                if (char.mapId !== AppState.map.mapId) return;

                const isPlayerUnit = (char.faction === playerFaction);

                if (!isPlayerUnit) {
                    // СТРОГИЙ ФИКС: Если бот физически находится в процессе перемещения по вашему массиву,
                    // мы просто молча пропускаем этот тик, давая фигурке плавно дойти своими ногами
                    if (char.currentMovementVisualPath && char.currentMovementVisualPath.length > 0) return;

                    // Если у бота тикают кулдауны атаки или движения — он стоит на месте и ждет, ИИ его не дергает
                    if (char.atkReadyTimer > 0 && char.mvmReadyTimer > 0) return;

                    // Бот полностью завершил прошлый шаг и его таймеры позволяют действовать — вызываем логику
                    // Передаем пустой колбэк null, так как в реалтайме пошаговые очереди переключать не нужно
                    this.findAndAttackBot(char, id, null);
                }
            });
            return;
        }

        // =========================================================================
        // ⚔️ ПОШАГОВЫЙ РЕЖИМ БОЯ (Очереди по фазам)
        // =========================================================================
        console.log(`🧠 [AIManager] Анализ пошаговой фазы: ${activeTurnId}`);
        const aiUnitsToProcess = [];

        if (turnBy === "character") {
            const char = AppState.entities[activeTurnId];
            if (!char || char.stats?.hp <= 0) return;
            if (char.mapId !== AppState.map.mapId) return;

            const isPlayerUnit = (char.faction === playerFaction);
            if (isPlayerUnit) {
                console.log(`🧠 [AIManager] Пошаговая фаза принадлежит игроку (${char.name}). Ждем действий.`);
                return;
            }
            aiUnitsToProcess.push({ id: activeTurnId, char: char });
        }
        else {
            Object.keys(AppState.entities).forEach(id => {
                const char = AppState.entities[id];
                if (!char || char.stats?.hp <= 0) return;
                if (char.mapId !== AppState.map.mapId) return;

                const isPlayer = (char.faction === playerFaction);
                if (isPlayer) return;

                let matches = false;
                if (turnBy === "team" && char.team === activeTurnId) matches = true;
                if (turnBy === "faction" && char.faction === activeTurnId) matches = true;

                if (matches) {
                    aiUnitsToProcess.push({ id: id, char: char });
                }
            });
        }

        if (aiUnitsToProcess.length === 0) {
            if (AppState.engine.turnManager) AppState.engine.turnManager.endTurn();
            return;
        }

        this.processAIQueueSequentially(aiUnitsToProcess, 0);
    }

    /**
     * 🧠 ЧАСТЬ 2: Диспетчер очереди ботов
     */
    processAIQueueSequentially(queue, index) {
        if (index >= queue.length) {
            console.log("🧠 [AIManager] Все боты в текущей фазе завершили действия. Передаем ход.");
            if (AppState.engine.turnManager) {
                AppState.engine.turnManager.endTurn();
            }
            return;
        }

        const currentBot = queue[index];
        console.log(`🧠 [AIManager] Диспетчер активировал бота: ${currentBot.char.name} (ID: ${currentBot.id})`);

        const onActionComplete = () => {
            this.processAIQueueSequentially(queue, index + 1);
        };

        this.findAndAttackBot(currentBot.char, currentBot.id, onActionComplete);
    }

    /**
     * ⚔️ ИЗОЛИРОВАННАЯ ФУНКЦИЯ ДЕЙСТВИЯ: Поиск цели, перемещение и атака (СТРОГАЯ ДИПЛОМАТИЯ)
     */
    findAndAttackBot222(botChar, botId, onComplete) {
        const hexMath = AppState.engine.hexMath;
        const combatManager = AppState.engine.combatManager;
        const movementManager = AppState.engine.movementManager;

        if (!combatManager || !hexMath) {
            if (onComplete) onComplete();
            return;
        }

        const isRealtime = AppState.turn_settings?.turn_mode === "realtime";
        const playerFaction = AppState.player?.faction;

        const isTacticalMode = AppState.game_settings.battleType === "tactical";
        const isTacticalMap = AppState.map.mapId === 'tactical_arena';

        // 1. ПОИСК БЛИЖАЙШЕГО ВРАГА ПО ПАКТАМ ВОЙНЫ
        let closestEnemy = null;
        let minDistance = Infinity;

        let fightingAlly = null;
        let minAllyDistance = Infinity;

        Object.keys(AppState.entities).forEach(id => {
            if (id === botId) return;

            const potentialTarget = AppState.entities[id];
            if (!potentialTarget || !potentialTarget.stats || potentialTarget.stats.hp <= 0) return;
            if (potentialTarget.mapId !== botChar.mapId) return;

            const currentPact = getPactBetween(botChar.faction, potentialTarget.faction);

            const dist = hexMath.getDistance(botChar.mapPosition, potentialTarget.mapPosition);
            if(dist > botChar.vision?.current) return;

            // if(potentialTarget.id==='rafael') {
            //     console.log('vision', botChar.id, potentialTarget.id, dist);
            // }

            AppState.engine.triggerManager.processEvent('vision', {
                subject: botChar,
                target: potentialTarget,
                dist
            });

            if (currentPact === 'WAR') {
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = potentialTarget;
                }
            }
            else if (potentialTarget.faction === botChar.faction || currentPact === 'ALLIANCE') {
                if (potentialTarget.in_combat === true && potentialTarget.stats) {
                    if (dist < minAllyDistance) {
                        minAllyDistance = distToAlly;
                        fightingAlly = potentialTarget;
                    }
                }
            }
        });

        if (!closestEnemy && fightingAlly) {
            botChar.in_combat = true;
            closestEnemy = fightingAlly;
            minDistance = minAllyDistance;
        }

        if (!closestEnemy) {
            if (onComplete) onComplete();
            return;
        }

        let maxAtkRange = botChar.stats.atkRange || 1;



        if(isTacticalMode && !isTacticalMap) {
            maxAtkRange = 1;
            if (minDistance <= maxAtkRange) {
                window.stopTicker();
                AppState.engine.ArenaManager.enterTacticalArena(botChar.id, closestEnemy.id);
                return;
            }
        }

        // =========================================================================
        // ⚡ 2. СЦЕНАРИЙ А: Враг в радиусе удара (Атака по АтакСпиду)
        // =========================================================================
        if ((minDistance <= maxAtkRange) && (!isTacticalMode || (isTacticalMode && isTacticalMap))) {
            // В реалтайме проверяем кулдаун оружия
            if (isRealtime && botChar.atkReadyTimer > 0) {
                if (onComplete) onComplete();
                return; // Ждем перезарядки
            }

            console.log(`⚔️ [AIManager] Атака на месте: ${botChar.name} -> ${closestEnemy.name}`);

            // Взводим кулдаун атаки строго из статов персонажа (например, 1000мс)
            if (isRealtime) {
                botChar.atkReadyTimer = botChar.stats.atkSpeed || 1000;
            }

            combatManager.startBattle(botId, closestEnemy.mapPosition, onComplete);
            return;
        }

        // =========================================================================
        // ⚡ 3. СЦЕНАРИЙ Б: Враг далеко (Плавный бег по вашей оригинальной логике)
        // =========================================================================
        if (!movementManager) {
            if (onComplete) onComplete();
            return;
        }

        // Проверяем кулдаун на перемещение (чтобы бот не срывался в бег каждую миллисекунду)
        if (isRealtime && botChar.mvmReadyTimer > 0) {
            if (onComplete) onComplete();
            return;
        }

        const fullPath = movementManager.findPath(
            botChar.mapPosition.q,
            botChar.mapPosition.r,
            closestEnemy.mapPosition.q,
            closestEnemy.mapPosition.r,
            botChar
        );

        if (!fullPath || fullPath.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const walkPathLength = fullPath.length - maxAtkRange;
        if (walkPathLength <= 0) {
            if (onComplete) onComplete();
            return;
        }

        // СТРОГИЙ ФИКС: Убрано ограничение в 1 гекс! Бот забирает весь доступный ему по статам путь
        const maxSteps = botChar.movement?.current || 3;
        const actualStepsCount = Math.min(walkPathLength, maxSteps);
        const trimmedPath = fullPath.slice(0, actualStepsCount);

        console.log(`🏃‍♂️ [AIManager] ${botChar.name} начинает нормальное плавное перемещение...`);

        botChar.currentActivePath = trimmedPath;

        movementManager.startCharacterMovement(botId);

        const checkArrival = setInterval(() => {
            const char = AppState.entities[botId];

            if (!char || !char.currentMovementVisualPath || char.currentMovementVisualPath.length === 0) {
                clearInterval(checkArrival);

                if (char && char.stats?.hp > 0) {
                    // В пошаговом режиме вычитаем ОД, в реалтайме ОД нет — взводим кулдаун ног mvmSpeed
                    if (!isRealtime && char.movement) {
                        char.movement.current = Math.max(0, char.movement.current - actualStepsCount);
                    } else if (isRealtime) {
                        char.mvmReadyTimer = char.stats.mvmSpeed || 1000;
                    }

                    const newDistance = hexMath.getDistance(char.mapPosition, closestEnemy.mapPosition);

                    if (newDistance <= maxAtkRange) {
                        if (isRealtime && char.atkReadyTimer > 0) {
                            if (onComplete) onComplete();
                            return;
                        }

                        if (isRealtime) {
                            char.atkReadyTimer = char.stats.atkSpeed || 1000;
                        }

                        combatManager.startBattle(botId, closestEnemy.mapPosition, onComplete);
                    } else {
                        if (onComplete) onComplete();
                    }
                } else {
                    if (onComplete) onComplete();
                }
            }
        }, 100);
    }


    /**
     * ⚔️ ЦЕНТРАЛЬНЫЙ ДИСПЕТЧЕР ИИ: Поиск цели, перемещение и атака
     */
    findAndAttackBot(botChar, botId, onComplete) {
        const hexMath = AppState.engine.hexMath;
        const combatManager = AppState.engine.combatManager;
        const movementManager = AppState.engine.movementManager;

        if (!combatManager || !hexMath) {
            if (onComplete) onComplete();
            return;
        }

        // ФАЗА 1: Проверяем, не является ли этот бот мирным спутником в чьем-то отряде
        const isFollowing = this._checkPartyFollowing(botChar, botId, hexMath, movementManager, onComplete);
        if (isFollowing) {
            return; // Бот ушел по логике «паровозика», боевой ИИ ниже для него блокируется
        }

        // ФАЗА 2: Сканируем окружение и находим ближайшую цель по пактам войны
        const targetInfo = this._findClosestTarget(botChar, botId, hexMath);

        if (!targetInfo.closestEnemy) {
            if (onComplete) onComplete();
            return; // Врагов в радиусе обзора нет, бот просто стоит
        }
        if(!botChar.stats) return;
        if(!botChar.stats) return;
        // ФАЗА 3: Выполняем боевое действие (Удар, шаг к цели или триггер перехода на арену 10х5)
        this._executeCombatAction(botChar, botId, targetInfo.closestEnemy, targetInfo.minDistance, combatManager, movementManager, onComplete);
    }

    /**
     * 👥 ФАЗА 1: Логика следования за лидером отряда («Паровозик» вне боя)
     * @returns {boolean} - true, если бот ушел по мирному пути следования и его боевой ИИ нужно остановить
     */
    _checkPartyFollowing(botChar, botId, hexMath, movementManager, onComplete) {
        let leaderChar = null;

        // Полиморфно ищем владельца этого бота в AppState.characters через .units
        Object.keys(AppState.entities).forEach(id => {
            const potentialLeader = AppState.entities[id];
            if (potentialLeader && potentialLeader.units && potentialLeader.units[botId] !== undefined) {
                leaderChar = potentialLeader;
            }
        });

        const isTacticalMode = AppState.game_settings.battleType === "tactical";
        const isTacticalMap = AppState.map.mapId === 'tactical_arena';
        const isRealtime = AppState.turn_settings?.turn_mode === "realtime";

        // Если бот ни в чьем отряде не состоит — выходим сразу, он автономен
        if (!leaderChar) return false;

        // Если режим Героев (tactical) на большой карте — компаньоны «сидят внутри» и не ходят ногами
        if (isTacticalMode && !isTacticalMap) {
            if (onComplete) onComplete();
            return true;
        }

        // Проверяем, есть ли враги в радиусе обзора этого компаньона перед тем, как бежать за вожаком
        let hasEnemyNearby = false;
        Object.values(AppState.entities).forEach(target => {
            if (!target || target.stats?.hp <= 0 || target.id === botId || target.mapId !== botChar.mapId) return;

            const pact = getPactBetween(botChar.faction, target.faction);
            const dist = hexMath.getDistance(botChar.mapPosition, target.mapPosition);

            if (pact === 'WAR' && dist <= botChar.vision?.current) {
                hasEnemyNearby = true; // Спутник заагрился!
            }
        });

        // Если враг рядом — срываем следование, компаньон должен вступить в драку
        if (hasEnemyNearby) {
            botChar.in_combat = true;
            return false;
        }

        // ВРАГОВ НЕТ: Чистый мирный режим «паровозика» за вожаком
        botChar.in_combat = false;
        const distToLeader = hexMath.getDistance(botChar.mapPosition, leaderChar.mapPosition);

        // Если стоим вплотную к лидеру (дистанция 1) — просто отдыхаем и ждем его шага
        if (distToLeader <= 1) {
            if (onComplete) onComplete();
            return true;
        }

        // Проверяем кулдаун ног в реалтайме
        if (isRealtime && botChar.mvmReadyTimer > 0) {
            if (onComplete) onComplete();
            return true;
        }

        // Находим путь до текущей клетки вожака
        const followPath = movementManager.findPath(
            botChar.mapPosition.q, botChar.mapPosition.r,
            leaderChar.mapPosition.q, leaderChar.mapPosition.r,
            botChar
        );

        if (!followPath || followPath.length === 0) {
            if (onComplete) onComplete();
            return true;
        }

        // Отрезаем клетку лидера, чтобы компаньон шел строго сзади гуськом
        const trimmedFollowPath = followPath.slice(0, followPath.length - 1);
        if (trimmedFollowPath.length === 0) {
            if (onComplete) onComplete();
            return true;
        }

        console.log(`👥 [AIManager] Компаньон ${botChar.name} следует за лидером ${leaderChar.name}.`);

        botChar.currentActivePath = trimmedFollowPath;
        movementManager.startCharacterMovement(botId);

        const checkFollowArrival = setInterval(() => {
            const char = AppState.entities[botId];
            if (!char || !char.currentMovementVisualPath || char.currentMovementVisualPath.length === 0) {
                clearInterval(checkFollowArrival);
                if (char && char.stats?.hp > 0) {
                    if (!isRealtime && char.movement) {
                        char.movement.current = Math.max(0, char.movement.current - trimmedFollowPath.length);
                    } else if (isRealtime) {
                        char.mvmReadyTimer = char.stats.mvmSpeed || 1000;
                    }
                }
                if (onComplete) onComplete();
            }
        }, 100);

        return true;
    }

    /**
     * ⚔️ ФАЗА 2: Сканирование окружения и сбор целей по пактам дипломатии
     */
    _findClosestTarget(botChar, botId, hexMath) {
        let closestEnemy = null;
        let minDistance = Infinity;
        let fightingAlly = null;
        let minAllyDistance = Infinity;

        Object.keys(AppState.entities).forEach(id => {
            if (id === botId) return;
            const potentialTarget = AppState.entities[id];

            if (!potentialTarget || !potentialTarget.stats || potentialTarget.stats.hp <= 0) return;
            if (potentialTarget.mapId !== botChar.mapId) return;

            const currentPact = getPactBetween(botChar.faction, potentialTarget.faction);
            const dist = hexMath.getDistance(botChar.mapPosition, potentialTarget.mapPosition);

            if (dist > botChar.vision?.current) return;

            // Шлем триггерное событие видимости
            AppState.engine.triggerManager.processEvent('vision', {
                subject: botChar,
                target: potentialTarget,
                distance: dist
            });

            // Логика подбора целей по пактам
            if (currentPact === 'WAR') {
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = potentialTarget;
                }
            }
            else if (potentialTarget.faction === botChar.faction || currentPact === 'ALLIANCE') {
                if (potentialTarget.in_combat === true) {
                    if (dist < minAllyDistance) {
                        minAllyDistance = dist;
                        fightingAlly = potentialTarget;
                    }
                }
            }
        });

        // Если личного врага нет, но союзник рядом дерется — бежим к нему на помощь
        if (!closestEnemy && fightingAlly) {
            botChar.in_combat = true;
            closestEnemy = fightingAlly;
            minDistance = minAllyDistance;
        }

        return { closestEnemy, minDistance };
    }

    /**
     * ⚡ ФАЗА 3: Выполнение тактического или прямого боевого действия
     */
    _executeCombatAction(botChar, botId, closestEnemy, minDistance, combatManager, movementManager, onComplete) {
        const isRealtime = AppState.turn_settings?.turn_mode === "realtime";
        const isTacticalMode = AppState.game_settings.battleType === "tactical";
        const isTacticalMap = AppState.map.mapId === 'tactical_arena';

        let maxAtkRange = botChar.stats.atkRange || 1;

        // РЕЖИМ ГЕРОЕВ (Ступенчатый перехват на арену 10х5)
        if (isTacticalMode && !isTacticalMap) {
            maxAtkRange = 1;
            if (minDistance <= maxAtkRange) {
                window.stopTicker();
                // Разворачиваем динамическую тактическую арену 10х5, которую мы настроили
                AppState.engine.ArenaManager.enterTacticalArena(botChar.id, closestEnemy.id, 10, 5);
                return;
            }
        }

        // СЦЕНАРИЙ А: Враг в радиусе поражения — БЬЕМ НА МЕСТЕ
        if ((minDistance <= maxAtkRange) && (!isTacticalMode || (isTacticalMode && isTacticalMap))) {
            if (isRealtime && botChar.atkReadyTimer > 0) {
                if (onComplete) onComplete();
                return; // Оружие на перезарядке
            }

            console.log(`⚔️ [AIManager] Атака на месте: ${botChar.name} -> ${closestEnemy.name}`);

            if (isRealtime) {
                botChar.atkReadyTimer = botChar.stats.atkSpeed || 1000;
            }
            combatManager.startBattle(botId, closestEnemy.mapPosition, onComplete);
            return;
        }

        // СЦЕНАРИЙ Б: Враг далеко — БЕЖИМ К ЦЕЛИ
        if (!movementManager) {
            if (onComplete) onComplete();
            return;
        }

        if (isRealtime && botChar.mvmReadyTimer > 0) {
            if (onComplete) onComplete();
            return; // Ноги на перезарядке
        }

        const fullPath = movementManager.findPath(
            botChar.mapPosition.q, botChar.mapPosition.r,
            closestEnemy.mapPosition.q, closestEnemy.mapPosition.r,
            botChar
        );

        if (!fullPath || fullPath.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const walkPathLength = fullPath.length - maxAtkRange;
        if (walkPathLength <= 0) {
            if (onComplete) onComplete();
            return;
        }

        const maxSteps = botChar.movement?.current || 3;
        const actualStepsCount = Math.min(walkPathLength, maxSteps);
        const trimmedPath = fullPath.slice(0, actualStepsCount);

        console.log(`🏃‍♂️ [AIManager] ${botChar.name} начинает плавное сближение с целью...`);

        botChar.currentActivePath = trimmedPath;
        movementManager.startCharacterMovement(botId);

        const checkArrival = setInterval(() => {
            const char = AppState.entities[botId];
            if (!char || !char.currentMovementVisualPath || char.currentMovementVisualPath.length === 0) {
                clearInterval(checkArrival);

                if (char && char.stats?.hp > 0) {
                    if (!isRealtime && char.movement) {
                        char.movement.current = Math.max(0, char.movement.current - actualStepsCount);
                    } else if (isRealtime) {
                        char.mvmReadyTimer = char.stats.mvmSpeed || 1000;
                    }

                    // Если после шага враг оказался в радиусе удара — бьем сразу
                    const hexMath = AppState.engine.hexMath;
                    const newDistance = hexMath.getDistance(char.mapPosition, closestEnemy.mapPosition);

                    if (newDistance <= maxAtkRange) {
                        if (isRealtime && char.atkReadyTimer > 0) {
                            if (onComplete) onComplete();
                            return;
                        }
                        if (isRealtime) char.atkReadyTimer = char.stats.atkSpeed || 1000;
                        combatManager.startBattle(botId, closestEnemy.mapPosition, onComplete);
                    } else {
                        if (onComplete) onComplete();
                    }
                } else {
                    if (onComplete) onComplete();
                }
            }
        }, 100);
    }
}


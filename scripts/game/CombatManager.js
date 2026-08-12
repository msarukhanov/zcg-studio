import { AppState, getPactBetween, DiplomaticPacts, getTileFromState } from '../shared/GameState.js';

export class CombatManager {
    constructor() {

    }

    /**
     * 1. ИЗОЛИРОВАННАЯ АНИМАЦИЯ: Только двигает спрайт туда-обратно
     */
    executeMeleeBumpAnimation(attacker, targetTile, onHitCallback) {
        const hexMath = AppState.engine.hexMath;

        const startPixel = hexMath.cubeToPixel(attacker.mapPosition.q, attacker.mapPosition.r);
        const startLiftY = (getTileFromState(attacker.mapPosition.q, attacker.mapPosition.r)?.height - 1 || 0) * (hexMath.size * 0.25);
        const startX = startPixel.x;
        const startY = startPixel.y - startLiftY;

        const targetPixel = hexMath.cubeToPixel(targetTile.q, targetTile.r);
        const targetLiftY = (getTileFromState(targetTile.q, targetTile.r)?.height - 1 || 0) * (hexMath.size * 0.25);
        const targetX = targetPixel.x;
        const targetY = targetPixel.y - targetLiftY;

        attacker.direction = targetX > startX ? 'right' : 'left';
        attacker.action = 'move';

        let bumpProgress = 0;
        const bumpSpeed = 0.08;
        let hitApplied = false;

        const animate = (ticker) => {
            bumpProgress += bumpSpeed * (ticker.deltaTime || 1);

            if (bumpProgress < 1) {
                attacker.visualX = startX + (targetX - startX) * 0.5 * bumpProgress;
                attacker.visualY = startY + (targetY - startY) * 0.5 * bumpProgress;
            } else if (bumpProgress >= 1 && bumpProgress < 2) {
                if (!hitApplied) {
                    if (onHitCallback) onHitCallback();
                    hitApplied = true;
                }
                const returnProgress = bumpProgress - 1;
                attacker.visualX = (startX + (targetX - startX) * 0.5) + (startX - (startX + (targetX - startX) * 0.5)) * returnProgress;
                attacker.visualY = (startY + (targetY - startY) * 0.5) + (startY - (startY + (targetY - startY) * 0.5)) * returnProgress;
            } else {
                attacker.visualX = startX;
                attacker.visualY = startY;
                attacker.action = 'idle';

                AppState.engine.app.ticker.remove(animate);
                AppState.engine.renderMap();
            }
        };

        AppState.engine.app.ticker.add(animate);
    }

    /**
     * 2. ИЗОЛИРОВАННОЕ ДЕЙСТВИЕ АТАКИ: Только расчет и списание характеристик
     */

    /**
     * 2. ИЗОЛИРОВАННОЕ ДЕЙСТВИЕ АТАКИ: Расчет по формулам из GameState
     */
    attack(attacker, victim, victimId) {
        // Вытаскиваем формулы напрямую из вашего стейта
        const formulas = AppState.combat_formulas;
        if (!formulas) {
            console.error("❌ Формулы combat_formulas не найдены в AppState.config");
            return;
        }

        if(!attacker.stats || !victim.stats) return;

        // Подготавливаем объекты статов для безопасного вычисления (Атакующий и Цель)
        const A = attacker.stats;
        const T = victim.stats;

        // --- 1. РАСЧЕТ ПОПАДАНИЯ (HIT CHANCE) ---
        // Формула: "Math.max(5, 100 - (T.dodge - A.accuracy))"
        const hitChance = Math.max(5, 100 - ((T.dodge || 0) - (A.accuracy || 0)));
        const rollHit = Math.random() * 100;

        if (rollHit > hitChance) {
            console.log(`💨 [Attack] ${attacker.name} промахнулся по ${victim.name}! (Шанс: ${hitChance.toFixed(1)}%, Ролл: ${rollHit.toFixed(1)}%)`);
            AppState.engine.renderMap();
            return; // Прерываем атаку, урон не наносится
        }

        // --- 2. РАСЧЕТ БАЗОВОГО УРОНА (BASE DAMAGE) ---
        // Формула: "(A.atk * (100 / (100 + T.armor))) * (1 - (T.dmg_reduction / 100))"
        const armorMod = 100 / (100 + (T.armor || 0));
        const reductionMod = 1 - ((T.dmg_reduction || 0) / 100);
        let finalDamage = (A.atk || 0) * armorMod * reductionMod;

        // --- 3. РАСЧЕТ КРИТИЧЕСКОГО УДАРА (CRIT) ---
        // Проверяем шанс крита по стату персонажа (от 0 до 100)
        const rollCrit = Math.random() * 100;
        const isCrit = rollCrit <= (A.crit || 0);

        if (isCrit) {
            finalDamage = finalDamage * ((A.crit_damage || 150) / 100);
        }

        // Округляем урон до целого числа
        finalDamage = Math.round(finalDamage);

        // --- 4. ПРИМЕНЕНИЕ УРОНА И ПРОВЕРКА СМЕРТИ ---
        victim.stats.hp = Math.max(0, victim.stats.hp - finalDamage);

        if (AppState.engine.flashDamage) {
            AppState.engine.flashDamage(victimId);
        }
        console.log(`⚔️ [Attack] ${attacker.name} нанес ${finalDamage} урона персонажу ${victim.name}. Осталось HP: ${victim.stats.hp}`);

        const popupText = isCrit ? `💥 Crit! -${finalDamage}` : `-${finalDamage}`;
        AppState.engine.spawnPopupText(victim, popupText, 0xff3333); // Урон красный

        // --- 5. НАЧИСЛЕНИЕ ЭНЕРГИИ ПО ФОРМУЛАМ ---
        // Модификаторы прироста энергии (по умолчанию 100, т.е. 1.0)
        const attackerEnergyMod = (A.energy_gain_mod || 100) / 100;
        const victimEnergyMod = (T.energy_gain_mod || 100) / 100;

        if (victim.stats.hp <= 0) {
            console.log(`💀 [Attack] ${victim.name} погиб!`);

            // Начисление за убийство: "energy_gain_on_kill" (25)
            const energyOnKill = parseInt(formulas.energy_gain_on_kill || 25, 10);
            const energyOnAttack = parseInt(energyOnKill * attackerEnergyMod);
            attacker.stats.energy = Math.min(attacker.stats.maxEnergy, (attacker.stats.energy || 0) + energyOnAttack);

            if (AppState.engine.spawnPopupText) {
                AppState.engine.spawnPopupText(victim, `+${energyOnAttack}`, 0x3498db);
                AppState.engine.spawnPopupText(attacker, `+${energyOnAttack}`, 0x3498db);
            }

            const tile = getTileFromState(victim.mapPosition.q, victim.mapPosition.r);
            tile.isEnemyTarget = false;

            AppState.engine.triggerManager.processEvent('character_dead', {
                subject: victim // Тот, кто умер (Громм)
            });

            if (AppState.engine.CharacterLevelUpManager) {
                // 1. Рассчитываем чистую награду за моба по формуле разницы уровней
                const earnedXp = AppState.engine.CharacterLevelUpManager.calculateKillExp(victim, attacker);

                // 2. Отправляем опыт в распределитель. Он сам решит: зачислить сразу ('instant') или отложить
                AppState.engine.CharacterLevelUpManager.distributeExperience(earnedXp, attacker.id, 'instant');
            }

            if (AppState.map.mapId === 'tactical_arena') {
                AppState.engine.ArenaManager.checkBattleEnd(victim);
            }
            else {
                // if(AppState.characters[victimId]) AppState.characters[victimId].isDead = true;
                // delete AppState.entities[victimId];

                const dead = AppState.characters[victimId] || AppState.objects[victimId];
                dead.faction = "neutral";
                // 2. Ставим флаг смерти для визуального переворота модельки в PixiJS
                dead.isDead = true;
                // 3. Выставляем компонент интерактивности для нашего PlayerClickManager
                dead.interactable = true;
                // 4. Полностью стираем боевые статы (ХП), чтобы его больше нельзя было атаковать
                // и чтобы алгоритм путей А* не спотыкался об него как об живого врага
                delete dead.stats;
                // Переименовываем для красоты в интерфейсе обмена
                dead.name = `${_loc(dead.name)} ${_t('units.corpse')}`;
            }
        }
        else {
            // Начисление атакующему за обычную атаку: "base_energy_gain_on_attack" (20)
            const energyOnAttack = parseInt(formulas.base_energy_gain_on_attack || 20, 10);
            attacker.stats.energy = Math.min(attacker.stats.maxEnergy, (attacker.stats.energy || 0) + energyOnAttack * attackerEnergyMod);

            // Начисление цели за получение урона: "base_energy_gain_on_damage_taken" (30)
            const energyOnDamage = parseInt(formulas.base_energy_gain_on_damage_taken || 30, 10);
            victim.stats.energy = Math.min(victim.stats.maxEnergy, (victim.stats.energy || 0) + energyOnDamage * victimEnergyMod);

            if (AppState.engine.spawnPopupText) {
                AppState.engine.spawnPopupText(victim, `+${energyOnAttack}`, 0x3498db);
                AppState.engine.spawnPopupText(attacker, `+${energyOnAttack}`, 0x3498db);
            }

            AppState.engine.triggerManager.processEvent('hp_percent_limit', {
                subject: victim, // Тот, кто умер (Громм)
            });
        }

        AppState.engine.renderMap();

        const activeId = AppState.play.activeCharacterId;
        if(activeId === attacker.id || activeId === victim.id) {
            if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
                AppState.engine.uiManager.updateAll();
            }
        }
    }

    startAttack(attackerId, targetTile, onComplete) {
        const isRealtime = AppState.turn_settings?.turn_mode === "realtime";

        const attacker = AppState.entities[attackerId];
        const attackType = attacker.stats.atkRangeType || 'melee';
        const attackRange = attacker.stats.atkRange || 1;

        console.log(attacker.atkReadyTimer);

        if (isRealtime && attacker.atkReadyTimer > 0) {
            if (onComplete) onComplete();
            return;
        }
        if (isRealtime) attacker.atkReadyTimer = attacker.stats.atkSpeed || 1000;

        console.log(attackType, attackRange);

        if (!attacker) {
            if (onComplete) onComplete();
            return;
        }

        if(!targetTile && AppState.map.isPlatformerMode) {
            // 1. Находим направление атаки.
            // Если у персонажа в стейте записано 'left'/'right', берем его. По умолчанию бьем вправо (1).
            let dirQ = 1;
            if (attacker.direction === 'left') dirQ = -1;
            else if (attacker.direction === 'right') dirQ = 1;

            // 2. Считаем целевую клетку на расстоянии атаки (attackRange)
            // В платформере на квадратах смещение идет строго по горизонтали (ось Q)
            const targetQ = attacker.mapPosition.q + (dirQ * attackRange);
            const targetR = attacker.mapPosition.r; // Высота (R) остается прежней

            // 3. Перезаписываем targetTile, вытаскивая клетку из карты
            targetTile = getTileFromState(targetQ, targetR);

            // 🛡️ Защита: Если персонаж бьет по воздуху на краю карты и тайла физически нет,
            // создаем временный объект-пустышку, чтобы остальной код атаки не упал с ошибкой
            if (!targetTile) {
                targetTile = { q: targetQ, r: targetR, type: 'air' };
            }
        }

        if (!targetTile && AppState.play.isFirstPersonMode) {
            const gridMode = AppState.map?.gridMode; // 'square' | 'pointyHex' | 'flatHex'
            let offset = { q: 0, r: 0 };

            const camSettings = AppState.engine.cameraSettings;

            // Нормализуем угол fpYaw, чтобы он всегда лежал в диапазоне от 0 до 360 градусов
            let normalizedYaw = camSettings.fpYaw % 360;
            if (normalizedYaw < 0) normalizedYaw += 360;

            // ---------------------------------------------------------------------
            // КВАДРАТНАЯ СЕТКА в первом лице
            // ---------------------------------------------------------------------
            if (gridMode === 'square') {
                // 4 сектора по 90 градусов. Камера смотрит:
                // 0° - N (Вверх/Вперед), 90° - E (Вправо), 180° - S (Назад), 270° - W (Влево)
                const squareSector = Math.round(normalizedYaw / 90) % 4;
                const baseSquareDirs = ['N', 'E', 'S', 'W'];
                const targetDir = baseSquareDirs[squareSector];

                const squareDirections = {
                    'N':  { q: 0,  r: -1 }, // Атакуем прямо перед собой по карте
                    'E':  { q: 1,  r: 0  }, // Атакуем направо
                    'S':  { q: 0,  r: 1  }, // Атакуем назад
                    'W':  { q: -1, r: 0  }  // Атакуем налево
                };
                offset = squareDirections[targetDir] || { q: 0, r: 0 };
            }
            // ---------------------------------------------------------------------
            // ГЕКСАГОНАЛЬНАЯ СЕТКА в первом лице
            // ---------------------------------------------------------------------
            else {
                // 6 секторов по 60 градусов
                const hexClockwiseDirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
                const sectorShift = Math.round(normalizedYaw / 60) % 6;
                const targetDir = hexClockwiseDirs[sectorShift];

                const rtsDirections = {
                    'N':  { q: 0,  r: -1 }, 'NE': { q: 1,  r: -1 }, 'SE': { q: 1,  r: 0 },
                    'S':  { q: 0,  r: 1  }, 'SW': { q: -1, r: 1  }, 'NW': { q: -1, r: 0 }
                };
                offset = rtsDirections[targetDir] || { q: 0, r: 0 };
            }

            // Умножаем базовый офсет направления на дальность атаки (attackRange)
            offset.q *= attackRange;
            offset.r *= attackRange;

            // Находим целевые координаты атаки с учетом рассчитанного сдвига
            const targetQ = attacker.mapPosition.q + offset.q;
            const targetR = attacker.mapPosition.r + offset.r;

            // Перезаписываем targetTile, доставая клетку из стейта игры
            targetTile = getTileFromState(targetQ, targetR);

            // 🛡️ Ваша оригинальная защита от вылета на краях карты (Объект-пустышка)
            if (!targetTile) {
                targetTile = { q: targetQ, r: targetR, type: 'air' };
            }
        }


        let victim = null;
        let victimId = null;

        for (const id of Object.keys(AppState.entities)) {
            const c = AppState.entities[id];
            if (c.mapId === AppState.map.mapId && c.mapPosition.q === targetTile.q && c.mapPosition.r === targetTile.r) {
                victim = c;
                victimId = id;
                break;
            }
        }

        // if (!victim) {
        //     if (onComplete) onComplete();
        //     return;
        // }
        //
        // if(!attacker.stats || !victim.stats) return;

        const settings = AppState.turn_settings;

        if (settings && settings.turn_mode !== "realtime") {
            if (AppState.engine.timeManager && AppState.engine.timeManager.currentMode === "free_roam") {
                if (AppState.engine.turnManager) {
                    AppState.engine.turnManager.startAttack(targetTile);
                    return;
                }
            }
        }



        if (attackType === 'range') {
            attacker.action = 'attack';
            attacker.targetAttackTile = getTileFromState(attacker.mapPosition.q, attacker.mapPosition.r);
            attacker.movementLerpTime = 0;
            attacker.attackHitApplied = false;
            attacker.onHitCallback = onComplete;

            // ДАЛЬНИЙ БОЙ: Снаряд долетает, наносится урон, и СТРОГО ТУТ вызывается onComplete
            this.executeRangeProjectileAnimation(attacker, targetTile, (projectileId, targetId=null) => {
                console.log(projectileId, targetId);
                if(targetId) {
                    const victim = AppState.entities[targetId];
                    if(victim) {
                        this.attack(attacker, victim, targetId);
                    }
                }
                else {
                    const projectile = AppState.entities[projectileId];
                    for (const id of Object.keys(AppState.entities)) {
                        const c = AppState.entities[id];
                        if (c.stats && c.mapPosition.q === projectile.mapPosition.q && c.mapPosition.r === projectile.mapPosition.q) {
                            console.log(c);
                            this.attack(attacker, c, c.id)
                            break;
                        }
                    }
                }
                //
                // if(victim && victim.stats) ;

                // ТОЧЕЧНЫЙ ФИКС: Сигнализируем менеджеру ходов, что атака полностью завершена
                if (onComplete) onComplete();
            });
        } else {
            attacker.action = 'attack';
            attacker.targetAttackTile = targetTile;
            attacker.movementLerpTime = 0;
            attacker.attackHitApplied = false;
            attacker.onHitCallback = onComplete;

            // БЛИЖНИЙ БОЙ: Наскок завершается, наносится урон, и СТРОГО ТУТ вызывается onComplete
            // this.executeMeleeBumpAnimation(attacker, targetTile, () => {
            //     if(victim && victim.stats) this.attack(attacker, victim, victimId);
            //
            //     // ТОЧЕЧНЫЙ ФИКС: Сигнализируем менеджеру ходов, что атака полностью завершена
            //     if (onComplete) onComplete();
            // });
        }

        AppState.engine.renderMap();
    }

    animateAttack(char, deltaMS) {
        let needRedraw = false;

        if (char.action !== 'attack' || !char.targetAttackTile) return needRedraw;

        const hexMath = AppState.engine.hexMath;
        const nextTile = char.targetAttackTile;
        // 🎯 Определяем тип атаки ('melee' или 'range') из статов персонажа
        const attackType = char.stats?.atkRangeType || 'melee';

        needRedraw = true;

        // 1. ТОЧКА СТАРТА (Координаты самого атакующего, как на странице 3)
        const fromPixel = hexMath.cubeToPixel(char.mapPosition.q, char.mapPosition.r);
        const fromTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
        const fromLiftY = (AppState.map.isPlatformerMode || !fromTile) ? 0 : (fromTile.height - 1) * (hexMath.size * 0.25);
        const startX = fromPixel.x;
        const startY = fromPixel.y - fromLiftY;

        // 2. ТОЧКА ЦЕЛИ (Координаты цели, как на странице 3)
        const toPixel = hexMath.cubeToPixel(nextTile.q, nextTile.r);
        const toTile = AppState.map.isPlatformerMode ? null : getTileFromState(nextTile.q, nextTile.r);
        const toLiftY = (AppState.map.isPlatformerMode || !toTile) ? 0 : (toTile.height - 1) * (hexMath.size * 0.25);
        const endX = toPixel.x;
        const endY = toPixel.y - toLiftY;

        console.log(char.movementLerpTime);

        // Поворот взгляда в сторону цели (по аналогии со страницей 3)
        if(toTile && fromTile.q !== toTile.q)  char.direction = endX > startX ? 'right' : 'left';

        // 3. РАСЧЕТ ДЛИТЕЛЬНОСТИ ШАГА АТАКИ (По аналогии со страницей 4)
        // Для дальнего боя берем range-тайминг, если его нет — стандартный
        let stepDuration = AppState.animation?.attackTime || 300;

        if(!char.movementLerpTime) char.movementLerpTime = 0;
        // Наращиваем время интерполяции (movementLerpTime используется как общий таймер)
        char.movementLerpTime += deltaMS / stepDuration;

        // 4. ПЛАВНОЕ СМЕЩЕНИЕ ПИКСЕЛЕЙ ВЫПАДА И ВОЗВРАТА (Аналогия со страницей 5)
        if (char.movementLerpTime < 0.5) {
            // ФАЗА 1: Выпад вперед (от 0.0 до 0.5 времени). Смещаемся максимум на половину дистанции
            if (attackType === 'melee') {
                const progress = char.movementLerpTime * 2; // Приводим к диапазону 0..1
                char.visualX = startX + (endX - startX) * 0.5 * progress;
                char.visualY = startY + (endY - startY) * 0.5 * progress;
            } else {
                // 🎯 ДЛЯ ВЫСТРЕЛА: Персонаж стоит строго на месте
                char.visualX = startX;
                char.visualY = startY;
            }
        }
        else if (char.movementLerpTime >= 0.5 && char.movementLerpTime < 1.0) {
            // МОМЕНТ НАНЕСЕНИЯ УРОНА / ВЫСТРЕЛА: Ровно на пике выпада (progress = 1)
            if (!char.attackHitApplied) {
                if (char.onHitCallback) char.onHitCallback();

                // Если это ближний бой — ищем жертву и применяем урон
                if (attackType === 'melee') {
                    let victim;
                    let victimId; // Зафиксируем ID для вызова функции атаки

                    for (const id of Object.keys(AppState.entities)) {
                        const c = AppState.entities[id];
                        if (c.mapId === AppState.map.mapId && c.mapPosition.q === char.targetAttackTile.q && c.mapPosition.r === char.targetAttackTile.r) {
                            victim = c;
                            victimId = id;
                            break;
                        }
                    }
                    if (victim && victim.stats) this.attack(char, victim, victimId);
                }

                char.attackHitApplied = true;
            }

            // ФАЗА 2: Возврат назад (от 0.5 до 1.0 времени). Плавный откат на стартовую позицию
            if (attackType === 'melee') {
                const progress = (char.movementLerpTime - 0.5) * 2; // Приводим к диапазону 0..1
                const peakX = startX + (endX - startX) * 0.5;
                const peakY = startY + (endY - startY) * 0.5;

                char.visualX = peakX + (startX - peakX) * progress;
                char.visualY = peakY + (startY - peakY) * progress;
            } else {
                // 🎯 ДЛЯ ВЫСТРЕЛА: Персонаж продолжает стоять ровно на месте
                char.visualX = startX;
                char.visualY = startY;
            }
        }
        else {
            // 5. АНИМАЦИЯ ПОЛНОСТЬЮ ЗАВЕРШЕНА (Аналогия со страницей 5 и 6)
            char.visualX = startX;
            char.visualY = startY;
            char.movementLerpTime = 0;
            char.action = 'idle'; // Возвращаем в покой

            // Очищаем боевые флаги и триггеры
            char.targetAttackTile = null;
            char.attackHitApplied = false;

            if (char.onAttackComplete) {
                char.onAttackComplete(char);
            }

            char.onHitCallback = null;
            char.onAttackComplete = null;

            AppState.engine.renderMap();
        }

        return needRedraw;
    }


    /**
     * Поиск ближайшего живого врага
     */
    findClosestEnemy(characterObj) {
        const hexMath = AppState.engine.hexMath;
        let closestEnemy = null;
        let minDistance = Infinity;

        for (const id of Object.keys(AppState.entities)) {
            const potentialEnemy = AppState.entities[id];
            if (potentialEnemy === characterObj || potentialEnemy.mapId !== AppState.map.mapId || !potentialEnemy.stats) continue;

            const pact = getPactBetween(characterObj.faction, potentialEnemy.faction);
            if (pact === DiplomaticPacts.WAR) {
                const distance = hexMath.getDistance(characterObj.mapPosition, potentialEnemy.mapPosition);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = potentialEnemy;
                }
            }
        }
        return closestEnemy;
    }

    /**
     * Автоматический поиск, сближение и атака ближайшего врага
     */
    findAndAttack() {
        const activeId = AppState.play.activeCharacterId;
        if (!activeId) return;

        const attacker = AppState.entities[activeId];
        const closestEnemy = this.findClosestEnemy(attacker);
        if (!closestEnemy) return;

        const hexMath = AppState.engine.hexMath;
        const currentDistance = hexMath.getDistance(attacker.mapPosition, closestEnemy.mapPosition);
        const maxAtkRange = attacker.stats.atkRange || 1;

        if (currentDistance <= maxAtkRange) {
            this.startAttack(activeId, closestEnemy.mapPosition);
            return;
        }

        if (!AppState.engine.movementManager) return;

        const fullPath = AppState.engine.movementManager.findPath(
            attacker.mapPosition.q,
            attacker.mapPosition.r,
            closestEnemy.mapPosition.q,
            closestEnemy.mapPosition.r,
            attacker
        );

        if (!fullPath || fullPath.length === 0) return;

        const walkPathLength = fullPath.length - maxAtkRange;
        if (walkPathLength <= 0) return;

        const trimmedPath = fullPath.slice(0, walkPathLength);
        attacker.currentActivePath = trimmedPath;

        AppState.engine.movementManager.startCharacterMovement(activeId);

        const checkArrival = setInterval(() => {
            const char = AppState.entities[activeId];
            if (!char || char.currentMovementVisualPath.length === 0) {
                clearInterval(checkArrival);
                if (char) {
                    const newDistance = hexMath.getDistance(char.mapPosition, closestEnemy.mapPosition);
                    if (newDistance <= maxAtkRange) {
                        this.startAttack(activeId, closestEnemy.mapPosition);
                    }
                }
            }
        }, 100);
    }

    /**
     * Визуальная анимация летящего снаряда для дальнего боя (чтение из AppState.projectiles)
     */

    executeRangeProjectileAnimation(attacker, targetTile, onHitCallback) {
        const hexMath = AppState.engine.hexMath;

        // 1. Строим линейный маршрут по клеткам
        let projectileGridPath = hexMath.getHexLine(attacker.mapPosition, targetTile);

        if (!projectileGridPath || projectileGridPath.length <= 1) {
            if (onHitCallback) onHitCallback();
            return;
        }

        projectileGridPath = projectileGridPath.map(t=>getTileFromState(t.q, t.r));
        // projectileGridPath.shift();

        // 2. Вычисляем пиксели и направление полета
        const startPixel = hexMath.cubeToPixel(attacker.mapPosition.q, attacker.mapPosition.r);
        const targetPixel = hexMath.cubeToPixel(targetTile.q, targetTile.r);
        const direction = targetPixel.x > startPixel.x ? 'right' : 'left';
        attacker.direction = direction;

        let pConfig = {};

        // Считываем исходный конфиг снаряда
        if (attacker.projectile_id && AppState.ConfigProjectiles && AppState.ConfigProjectiles[attacker.projectile_id]) {
            pConfig = AppState.ConfigProjectiles[attacker.projectile_id];
        }

        const projectileId = `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        AppState.entities[projectileId] = {
            // Копируем (мержим) все свойства из pConfig прямо сюда
            ...pConfig,

            // Базовые свойства сущности для движка перемещений
            id: projectileId,
            type: 'projectile',
            owner_id: attacker.id,
            projectile_id: attacker.projectile_id,
            action: 'move',
            direction: direction,
            mapPosition: { q: attacker.mapPosition.q, r: attacker.mapPosition.r },

            currentMovementVisualPath: projectileGridPath,

            visualX: startPixel.x,
            visualY: startPixel.y,
            movementLerpTime: 0,
            currentFrameIndex: 0,
            frameTimer: 0,
            frameDuration: 100,

            // Перезаписываем структуру анимаций на move -> direction -> кадры
            animations: {
                idle: pConfig.animations,
                move: pConfig.animations
            },

            ar: 1,

            onMovementComplete: (entityId) => {
                if (onHitCallback) onHitCallback(projectileId, entityId);
                delete AppState.entities[projectileId];
                AppState.engine.renderMap();
            }
        };
        AppState.engine.renderMap();
    }

    executeRangeProjectileAnimation222(attacker, targetTile, onHitCallback) {
        if(!AppState.projectiles) AppState.projectiles == {};

        const hexMath = AppState.engine.hexMath;
        const isPlatformer = AppState.map?.isPlatformerMode;

        const startPixel = hexMath.cubeToPixel(attacker.mapPosition.q, attacker.mapPosition.r);
        const targetPixel = hexMath.cubeToPixel(targetTile.q, targetTile.r);

        let startLiftY = 0;
        let targetLiftY = 0;

        if (!isPlatformer) {
            const attackerTile = getTileFromState(attacker.mapPosition.q, attacker.mapPosition.r);
            startLiftY = ((attackerTile?.height || 1) - 1) * (hexMath.size * 0.25);

            const realTargetTile = getTileFromState(targetTile.q, targetTile.r);
            targetLiftY = ((realTargetTile?.height || 1) - 1) * (hexMath.size * 0.25);
        }

        const startX = startPixel.x;
        const startY = startPixel.y - startLiftY;

        const targetX = targetPixel.x;
        const targetY = targetPixel.y - targetLiftY;

        // Вычисляем направление полета по горизонтали
        const direction = targetX > startX ? 'right' : 'left';
        attacker.direction = direction; // Поворачиваем самого стрелка

        let projectileSprite;
        let pConfig = null;
        let framesArray = null;
        let currentFrameIndex = 0;
        let frameTimer = 0;

        // СТРОГОЕ ЧТЕНИЕ ИЗ ВАШЕГО APPSTATE (ИСПРАВЛЕНО: projectile_id везде через подчёркивание)
        if (attacker.projectile_id && AppState.ConfigProjectiles && AppState.ConfigProjectiles[attacker.projectile_id]) {
            pConfig = AppState.ConfigProjectiles[attacker.projectile_id];
            if (pConfig.animations && pConfig.animations[direction]) {
                framesArray = pConfig.animations[direction];
            }
        }

        // Проверка наличия кадров для создания анимированного спрайта
        if (framesArray && framesArray.length > 0) {
            const currentFramePath = framesArray[currentFrameIndex];
            const texture = PIXI.Assets.cache.has(currentFramePath) ? PIXI.Assets.get(currentFramePath) : PIXI.Texture.WHITE;

            projectileSprite = new PIXI.Sprite(texture);
            projectileSprite.anchor.set(0.5, 0.5);
            projectileSprite.width = pConfig.width || 16;
            projectileSprite.height = pConfig.height || 16;
        } else {
            // Заглушка: красный шар-заглушка
            const g = new PIXI.Graphics();
            g.beginFill(0xff3333);
            g.drawCircle(0, 0, 8);
            g.endFill();
            projectileSprite = g;
        }

        projectileSprite.x = startX;
        projectileSprite.y = startY;
        projectileSprite.zIndex = 999999;

        AppState.engine.worldMapContainer.addChild(projectileSprite);
        if (AppState.engine.worldMapContainer.sortChildren) {
            AppState.engine.worldMapContainer.sortChildren();
        }

        let progress = 0;
        const flySpeed = 0.05;

        const animateProjectile = (ticker) => {
            const deltaMS = (ticker.deltaTime * AppState.animation.framesPerSecond * 10) / 60;
            console.log(deltaMS);

            // Покадровая смена текстур снаряда в полете
            if (framesArray && framesArray.length > 1 && projectileSprite instanceof PIXI.Sprite) {
                frameTimer += deltaMS;
                console.log(pConfig.frameDuration);
                const duration = pConfig.frameDuration || 100;

                if (frameTimer >= duration) {
                    frameTimer = 0;
                    currentFrameIndex = (currentFrameIndex + 1) % framesArray.length;

                    const nextFramePath = framesArray[currentFrameIndex];
                    if (PIXI.Assets.cache.has(nextFramePath)) {
                        projectileSprite.texture = PIXI.Assets.get(nextFramePath);
                    }
                }
            }

            // Плавное перемещение снаряда
            progress += flySpeed * deltaMS;

            if (progress < 1) {
                projectileSprite.x = startX + (targetX - startX) * progress;
                projectileSprite.y = startY + (targetY - startY) * progress;
            } else {
                // =========================================================================
                // 🌟 СТРОГИЙ ПРИКАЗ ВЫПОЛНЕН: Фиксация снаряда в финальной точке гекса-цели
                // =========================================================================
                // Принудительно вколачиваем снаряд в 100% координат центра врага,
                // чтобы исключить визуальный разрыв и недолет на последних пикселях
                projectileSprite.x = targetX;
                projectileSprite.y = targetY;

                AppState.engine.renderMap();

                // Теперь безопасно удаляем снаряд при стопроцентном контакте
                AppState.engine.worldMapContainer.removeChild(projectileSprite);
                projectileSprite.destroy();

                AppState.engine.app.ticker.remove(animateProjectile);

                // Запускаем списание урона и эффектов способности строго в момент касания
                if (onHitCallback) onHitCallback();
                AppState.engine.renderMap();
            }
        };

        AppState.engine.app.ticker.add(animateProjectile);
    }
}

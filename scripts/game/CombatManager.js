import { AppState, getPactBetween, DiplomaticPacts, getTileFromState } from '../shared/GameState.js';

export class CombatManager {
    constructor() {
        this.redrawMap = null;
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
                if (this.redrawMap) this.redrawMap();
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
            if (this.redrawMap) this.redrawMap();
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

        if (this.redrawMap) this.redrawMap();

        // if (AppState.engine.pathRenderer) {
        //     AppState.engine.pathRenderer.drawMovementZone(freshReachableTiles);
        // }


        const activeId = AppState.play.activeCharacterId;
        if(activeId === attacker.id || activeId === victim.id) {
            if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
                AppState.engine.uiManager.updateAll();
            }
        }
    }


    startBattle(attackerId, targetTile, onComplete) {
        const attacker = AppState.entities[attackerId];

        if (!attacker) {
            if (onComplete) onComplete();
            return;
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

        if (!victim) {
            if (onComplete) onComplete();
            return;
        }

        if(!attacker.stats || !victim.stats) return;

        const settings = AppState.turn_settings;

        if (settings && settings.turn_mode !== "realtime") {
            if (AppState.engine.timeManager && AppState.engine.timeManager.currentMode === "free_roam") {
                if (AppState.engine.turnManager) {
                    AppState.engine.turnManager.startBattle(targetTile);
                }
            }
        }

        const attackType = attacker.stats.atkRangeType || 'melee';

        if (attackType === 'range') {
            // ДАЛЬНИЙ БОЙ: Снаряд долетает, наносится урон, и СТРОГО ТУТ вызывается onComplete
            this.executeRangeProjectileAnimation(attacker, targetTile, () => {
                this.attack(attacker, victim, victimId);

                // ТОЧЕЧНЫЙ ФИКС: Сигнализируем менеджеру ходов, что атака полностью завершена
                if (onComplete) onComplete();
            });
        } else {
            // БЛИЖНИЙ БОЙ: Наскок завершается, наносится урон, и СТРОГО ТУТ вызывается onComplete
            this.executeMeleeBumpAnimation(attacker, targetTile, () => {
                this.attack(attacker, victim, victimId);

                // ТОЧЕЧНЫЙ ФИКС: Сигнализируем менеджеру ходов, что атака полностью завершена
                if (onComplete) onComplete();
            });
        }
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
            this.startBattle(activeId, closestEnemy.mapPosition);
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
                        this.startBattle(activeId, closestEnemy.mapPosition);
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

        // Точка вылета
        const startPixel = hexMath.cubeToPixel(attacker.mapPosition.q, attacker.mapPosition.r);
        const startLiftY = (getTileFromState(attacker.mapPosition.q, attacker.mapPosition.r)?.height - 1 || 0) * (hexMath.size * 0.25);
        const startX = startPixel.x;
        const startY = startPixel.y - startLiftY;

        // Точка попадания
        const targetPixel = hexMath.cubeToPixel(targetTile.q, targetTile.r);
        const targetLiftY = (getTileFromState(targetTile.q, targetTile.r)?.height - 1 || 0) * (hexMath.size * 0.25);
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
        if (attacker.projectile_id && AppState.projectiles && AppState.projectiles[attacker.projectile_id]) {
            pConfig = AppState.projectiles[attacker.projectile_id];
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
            const deltaMS = ticker.deltaTime * (1000 / 60);

            // Покадровая смена текстур снаряда в полете
            if (framesArray && framesArray.length > 1 && projectileSprite instanceof PIXI.Sprite) {
                frameTimer += deltaMS;
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
            progress += flySpeed * ticker.deltaTime;

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

                // Вызываем мгновенную принудительную перерисовку сцены PixiJS в этом же кадре,
                // чтобы игрок физически увидел снаряд внутри гекса цели перед его удалением!
                if (AppState.engine.redrawMap) {
                    AppState.engine.redrawMap();
                } else if (window.renderMap) {
                    window.renderMap();
                }

                // Теперь безопасно удаляем снаряд при стопроцентном контакте
                AppState.engine.worldMapContainer.removeChild(projectileSprite);
                projectileSprite.destroy();

                AppState.engine.app.ticker.remove(animateProjectile);

                // Запускаем списание урона и эффектов способности строго в момент касания
                if (onHitCallback) onHitCallback();
                if (this.redrawMap) this.redrawMap();
            }
        };

        AppState.engine.app.ticker.add(animateProjectile);
    }
}

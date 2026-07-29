import { AppState, getActiveMap } from '../shared/GameState.js';


export class SkillManager {
    constructor() {
        this.redrawMap = null;
        this.activeSkillId = null; // Хранит ID скилла, который игрок нажал и готовит к касту
        this.panelContainer = null; // Ссылка на DOM-элемент панели внизу

        setTimeout(() => {
            this.applyBattleStartPassives();
        }, 100);
    }

    /**
     * 🛠️ ЧАСТЬ 3: Перевод игры в режим выбора цели для способности
     */
    selectSkillForCast(skillId) {
        const config = AppState.skills[skillId];
        if (!config) return;

        if (config.type === "passive") {
            console.log(`🔮 [Skill] Навык "${config.title_loc?.ru || skillId}" является пассивным.`);
            return;
        }

        if (this.activeSkillId === skillId) {
            console.log(`🔮 [Skill] Отмена выбора способности: ${skillId}`);
            AppState.play.activeSkillId = null;
            this.activeSkillId = null;
            this.clearCastZone();
        } else {
            console.log(`🔮 [Skill] Способность ${skillId} выбрана. Ожидание тапа по карте...`);
            AppState.play.activeSkillId = skillId;
            this.activeSkillId = skillId;
            this.drawCastZone();
        }

        if (this.redrawMap) this.redrawMap();

        if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
            AppState.engine.uiManager.updateAll();
        }
    }

    /**
     * 🛠️ ЧАСТЬ 4: Нахождение и отрисовка зоны каста (ИСПРАВЛЕНО ЧТЕНИЕ ПАРАМЕТРОВ)
     */
    /**
     * Пометка тайлов в радиусе каста (cast_range)
     */
    drawCastZone() {
        this.clearCastZone(); // Сбрасываем старые пометки перед новым расчетом

        if (!AppState.play.activeSkillId) return;

        const activeCharId = AppState.play.activeCharacterId;
        const attacker = AppState.entities[activeCharId];
        const config = AppState.skills[AppState.play.activeSkillId];

        if (!attacker || !config) return;

        const hexMath = AppState.engine.hexMath;

        const currentMap = getActiveMap();

        const castRange = config.targeting?.cast_range || 0;
        const targetMode = config.targeting?.target_mode || "unit";

        // 1. Если это селф-каст — помечаем только клетку под ногами персонажа через Map.get()
        if (targetMode === "self") {
            const mapKey = `${attacker.mapPosition.q},${attacker.mapPosition.r}`;
            if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
                const tile = currentMap.tiles.get(mapKey);
                tile.isSkillTargetZone = true;
                tile.skillVisualColor = config.visual_color;
            }
            if (this.redrawMap) this.redrawMap();
            return;
        }

        // 2. Если направленный или АОЕ каст — перебираем Map через встроенный forEach
        if (currentMap && currentMap.tiles) {
            currentMap.tiles.forEach((tile) => {
                const distance = hexMath.getDistance(attacker.mapPosition, tile);

                if (distance <= castRange) {
                    tile.isSkillTargetZone = true;
                    tile.skillVisualColor = config.visual_color; // Сохраняем имя цвета для рендерера
                }
            });
        }

        // Вызываем вашу стандартную перерисовку карты
        if (this.redrawMap) this.redrawMap();
    }

    /**
     * Очистка флагов разметки зоны каста со всех тайлов карты
     */
    clearCastZone() {
        const currentMap = getActiveMap();
        if (currentMap && currentMap.tiles) {
            currentMap.tiles.forEach((tile) => {
                delete tile.isSkillTargetZone;
                delete tile.skillVisualColor;
            });
        }
    }


    /**
     * 🛠️ ЧАСТЬ 5: Принудительный запуск пассивных навыков по событию "on_battle_start"
     */
    applyBattleStartPassives() {
        // ЭТОТ ЛОГ ТЕПЕРЬ СРАБОТАЕТ ГАРАНТИРОВАННО ПРИ ВЫЗОВЕ МЕТОДА
        console.log("🔮 [SkillManager] Метод applyBattleStartPassives запущен успешно!");

        const hexMath = AppState.engine.hexMath;

        if (!AppState.entities) {
            console.error("❌ AppState.characters не инициализирован.");
            return;
        }

        Object.keys(AppState.entities).forEach(charId => {
            const char = AppState.entities[charId];
            if (!char || !char.skills) return;

            // Перебираем ваш массив объектов [{ skill_id, level }]
            char.skills.forEach(skillInfo => {
                // СТРОГОЕ ЧТЕНИЕ ПО ВАШЕМУ КЛЮЧУ skill_id
                const currentSkillId = skillInfo.skill_id;
                const config = AppState.skills[currentSkillId];

                if (config && config.type === "passive" && config.trigger && config.trigger.event === "on_battle_start") {

                    // Извлекаем уровень навыка (level - 1)
                    const currentLevelData = config.levels[skillInfo.level - 1];
                    if (!currentLevelData || !currentLevelData.actions) return;

                    currentLevelData.actions.forEach(action => {
                        if (action.type === "apply_effect" && action.effect_id) {
                            const effectConfig = AppState.effects[action.effect_id];
                            if (!effectConfig) {
                                console.warn(`⚠️ Эффект ${action.effect_id} не найден в AppState.effects`);
                                return;
                            }

                            if (effectConfig.type === "stat_modifier" && effectConfig.stat) {
                                const targetStat = effectConfig.stat;
                                const originalValue = char.stats[targetStat] || 0;

                                const multiplier = parseFloat(effectConfig.formula);
                                char.stats[targetStat] = Math.round(originalValue * multiplier);

                                console.log(`👑 [Passive Log] Навык "${config.title_loc.ru}" успешно сработал для ${char.name}. Стат [${targetStat}]: ${originalValue} -> ${char.stats[targetStat]}`);

                                if (!char.effects) char.effects = [];
                                char.effects.push({
                                    id: effectConfig.id,
                                    name: effectConfig.name,
                                    type: effectConfig.type,
                                    stat: targetStat,
                                    applied_value: char.stats[targetStat] - originalValue
                                });
                            }
                        }
                    });
                }
            });
        });

        if (AppState.engine.worldMapContainer.sortChildren) {
            AppState.engine.worldMapContainer.sortChildren();
        }
        if (this.redrawMap) this.redrawMap();
    }

    executeActiveSkill(attacker, targetTile, config) {
        const currentActiveSkillId = AppState.play.activeSkillId;
        console.log(`🔮 [Skill] Исполнение каста "${config.title_loc?.ru || currentActiveSkillId}"`);

        const charSkillInfo = attacker.skills.find(s => s.skill_id === currentActiveSkillId);
        const skillLevel = charSkillInfo ? charSkillInfo.level : 1;

        const currentLevelData = config.levels[skillLevel - 1];
        if (!currentLevelData || !currentLevelData.actions) {
            console.error(`❌ Данные для уровня ${skillLevel} навыка ${currentActiveSkillId} не найдены.`);
            return;
        }

        // Списываем энергию
        attacker.stats.energy = Math.max(0, (attacker.stats.energy || 0) - (config.energy_cost || 0));

        let victim = null;
        let victimId = null;
        Object.keys(AppState.entities).forEach(id => {
            const c = AppState.entities[id];
            if (c.mapPosition.q === targetTile.q && c.mapPosition.r === targetTile.r) {
                victim = c;
                victimId = id;
            }
        });

        const applySkillLogic = () => {
            currentLevelData.actions.forEach(action => {

                if (action.type === "deal_damage") {
                    // Строгое чтение из targeting по вашему конфигу
                    const aoeRadius = config.targeting?.aoe_radius || 0;
                    if (config.targeting?.target_mode === "tile" && aoeRadius > 0) {
                        this.applyAoEDamage(attacker, targetTile, aoeRadius, action.value_formula);
                    } else if (victim) {
                        AppState.engine.combatManager.attack(attacker, victim, victimId);
                    }
                }

                if (action.type === "apply_effect" && action.effect_id) {
                    const aoeRadius = config.targeting?.aoe_radius || 0;
                    if (action.targeting === "self") {
                        this.applyEffectToUnit(attacker, action.effect_id, action.duration);
                    } else if (action.targeting === "targets") {
                        if (aoeRadius > 0) {
                            this.applyAoEEffect(targetTile, aoeRadius, action.effect_id, action.duration);
                        } else if (victim) {
                            this.applyEffectToUnit(victim, action.effect_id, action.duration);
                        }
                    }
                }

                if (action.type === "heal") {
                    if (config.targeting?.target_mode === "self") {
                        const healValue = Math.round(attacker.stats.atk * 1.5);
                        attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + healValue);
                        if (AppState.engine.spawnPopupText) {
                            AppState.engine.spawnPopupText(attacker, `+${healValue} HP`, 0x2ecc71);
                        }
                        if (AppState.engine.flashHeal) {
                            AppState.engine.flashHeal(attacker.id);
                        }
                    }
                    else if (victim) {
                        const healValue = Math.round(attacker.stats.atk * 1.5);
                        victim.stats.hp = Math.min(victim.stats.maxHp, victim.stats.hp + healValue);
                        if (AppState.engine.spawnPopupText) {
                            AppState.engine.spawnPopupText(victim, `+${healValue} HP`, 0x2ecc71);
                        }

                        if (AppState.engine.flashHeal) {
                            AppState.engine.flashHeal(victim.id);
                        }
                    }
                }

                // =========================================================================
                // 🏗️ ЧИСТЫЙ DATA-DRIVEN СПАВН: Полное отсутствие хардкода строк зданий
                // =========================================================================
                if (action.type === "spawn_structure") {
                    // Считываем шаблон динамически из JSON-конфига экшена!
                    const templateId = action.template_id;

                    if (!templateId) {
                        console.error("[SkillManager] Критическая ошибка: В экшене spawn_structure не указан template_id!");
                        return;
                    }


                    const casterFaction = AppState.factions[attacker.faction];
                    if (!casterFaction || !casterFaction.buildings || !casterFaction.buildings[templateId]) {
                        console.warn(`[SkillManager] Фракция ${attacker.faction} не имеет чертежей для постройки "${templateId}"!`);
                        return; // Запрещаем постройку, если у орков нет чертежа эльфийского лагеря
                    }

                    // Проверяем, свободна ли клетка targetTile от других сущностей
                    const isOccupied = Object.values(AppState.entities).some(e =>
                        e && e.mapPosition && e.mapPosition.q === targetTile.q && e.mapPosition.r === targetTile.r
                    );

                    // Проверяем физическую проходимость гекса
                    const terrainConfig = AppState.ConfigTerrain?.[targetTile.type];
                    const isPassableTerrain = terrainConfig ? !terrainConfig.blocksMovement : true;

                    if (isOccupied || !isPassableTerrain) {
                        console.warn(`[SkillManager] Клетка ${targetTile.q},${targetTile.r} заблокирована для строительства.`);
                        if (AppState.engine.spawnPopupText) {
                            AppState.engine.spawnPopupText({ mapPosition: targetTile }, "Занято!", 0xe74c3c);
                        }
                    } else if (AppState.engine.objectManager) {
                        // Передаем динамический templateId прямо в фабрику объектов!
                        // ОбъектManager сам вытащит нужные ассеты, вижн, HP и создаст инстанс
                        const builtObj = AppState.engine.objectManager.spawnObject(
                            templateId,
                            AppState.map.mapId,
                            targetTile.q,
                            targetTile.r,
                            attacker.faction // Наследуем фракцию кастера
                        );

                        if (builtObj && AppState.engine.spawnPopupText) {
                            AppState.engine.spawnPopupText(builtObj, `+${builtObj.name}`, 0x2ecc71);
                        }
                    }
                }
                // =========================================================================


            });

            // Сброс состояния каста и чистка карты (СТРОГО ОДИН РАЗ В САМОМ КОНЦЕ)
            AppState.play.activeSkillId = null;
            this.activeSkillId = null;
            this.clearCastZone();

            if (this.redrawMap) this.redrawMap();

            if (AppState.engine.uiManager && AppState.engine.uiManager.updateAll) {
                AppState.engine.uiManager.updateAll();
            }
        };

        // Последовательный запуск анимаций
        if (config.projectile_id && AppState.engine.combatManager) {
            AppState.engine.combatManager.executeRangeProjectileAnimation(attacker, targetTile, () => {
                this.executeSkillVisualAnimation(config, targetTile, () => {
                    applySkillLogic();
                });
            });
        } else {
            this.executeSkillVisualAnimation(config, targetTile, () => {
                applySkillLogic();
            });
        }
    }



    /**
     * Вспомогательный метод добавления эффекта в стейт юнита
     */
    applyEffectToUnit(unit, effectId, duration) {
        if (!unit.effects) unit.effects = [];

        // Защита от дублирования: если такой эффект уже висит, просто обновляем его время
        const existing = unit.effects.find(e => e.id === effectId || e.effect_id === effectId);
        if (existing) {
            existing.duration = duration || 3000; // Универсальный таймер в миллисекундах
            existing.timer = 0; // Сбрасываем накопленный тик при обновлении баффа/дебаффа
            console.log(`🔄 [Skill] Эффект ${effectId} на ${unit.name} обновлен.`);
            return;
        }

        unit.effects.push({
            id: effectId,
            effect_id: effectId,
            duration: duration || 3000,   // Общее время жизни в мс
            tick_interval: 1000,          // СТРОГО ПО КОНФИГУ: интервал тика в мс
            timer: 0                      // Внутренний счетчик накопленного времени кадра
        });
        console.log(`✨ [Skill] На ${unit.name} успешно наложен эффект: ${effectId}`);

        // ВЫЗОВ ГЛОБАЛЬНОГО ПОПАПА СТАТУСА: Цвет считывается динамически из AppState.effects
        if (AppState.engine.spawnPopupText && AppState.effects && AppState.effects[effectId]) {
            const effectConfig = AppState.effects[effectId];
            let textColor = 0xffffff;
            if (effectConfig.visual_color === "purple") textColor = 0x9b59b6;
            if (effectConfig.visual_color === "gold") textColor = 0xf1c40f;
            if (effectConfig.visual_color === "white") textColor = 0xffffff;

            AppState.engine.spawnPopupText(unit, effectConfig.popup_text || "ЭФФЕКТ", textColor);
        }
    }

    /**
     * Массовый урон по площади (AoE)
     */
    applyAoEDamage(attacker, epicenterTile, radius, formula) {
        const hexMath = AppState.engine.hexMath;
        console.log(`💥 [AoE] Расчет взрыва в радиусе ${radius} от центра...`);

        Object.keys(AppState.entities).forEach(id => {
            const targetUnit = AppState.entities[id];
            const distance = hexMath.getDistance(epicenterTile, targetUnit.mapPosition);

            // Если юнит попал в зону поражения взрывной волны
            if (distance <= radius) {
                // ИСПРАВЛЕНО: Вызываем метод строго через глобальный инстанс движка AppState.engine
                if (AppState.engine.combatManager) {
                    AppState.engine.combatManager.attack(attacker, targetUnit, id);
                } else {
                    console.error("❌ combatManager не найден в AppState.engine");
                }
            }
        });
    }

    /**
     * Массовое наложение эффектов по площади (AoE)
     */
    applyAoEEffect(epicenterTile, radius, effectId, duration) {
        const hexMath = AppState.engine.hexMath;
        Object.keys(AppState.entities).forEach(id => {
            const targetUnit = AppState.entities[id];
            const distance = hexMath.getDistance(epicenterTile, targetUnit.mapPosition);

            if (distance <= radius) {
                this.applyEffectToUnit(targetUnit, effectId, duration);
            }
        });
    }


    /**
     * Визуальная анимация каста навыка на карте (на базе ярких векторных заглушек)
     */
    /**
     * Визуальная анимация каста навыка на карте (ГЛОБАЛЬНЫЙ ФИКС СЛОЕВ)
     */
    executeSkillVisualAnimation(config, targetTile, onComplete) {
        if (!AppState.engine.app || !AppState.engine.app.stage) {
            if (onComplete) onComplete();
            return;
        }

        const hexMath = AppState.engine.hexMath;
        const appStage = AppState.engine.app.stage;
        const worldMapContainer = AppState.engine.worldMapContainer;

        // Находим объект тайла в стейте, чтобы узнать его 3D-высоту
        let tileHeight = 1;
        const mapKey = `${targetTile.q},${targetTile.r}`;
        const currentMap = getActiveMap();
        if (currentMap && currentMap.tiles && currentMap.tiles.has(mapKey)) {
            tileHeight = currentMap.tiles.get(mapKey).height || 1;
        }

        // Локальные координаты на карте с учетом высоты
        const pixelPos = hexMath.cubeToPixel(targetTile.q, targetTile.r);
        const liftY = (tileHeight - 1) * AppState.config.heightStep;
        const mapX = pixelPos.x;
        const mapY = pixelPos.y - liftY;

        // КРИТИЧЕСКИЙ ФИКС: Переводим в глобальные экранные координаты сцены
        const centerX = mapX + (worldMapContainer ? worldMapContainer.x : 0);
        const centerY = mapY + (worldMapContainer ? worldMapContainer.y : 0);

        // Создаем графический объект для эффекта
        const effectG = new PIXI.Graphics();

        // Мапим цвет из конфига навыка
        let color = 0xf1c40f;
        if (config.visual_color === "white") color = 0xffffff;
        if (config.visual_color === "orange") color = 0xff6b6b; // Оранжевый взрыв AoE
        if (config.visual_color === "blue") color = 0x00d2ff;   // Синий удар
        if (config.visual_color === "green") color = 0x2ecc71;  // Зеленый хил
        if (config.visual_color === "gold") color = 0xf1c40f;   // Золотой бафф
        if (config.visual_color === "purple") color = 0x9b59b6; // Фиолетовый дебафф

        // Пушим на самый верхний глобальный слой приложения
        effectG.zIndex = 999998;
        appStage.sortableChildren = true;
        appStage.addChild(effectG);

        if (appStage.sortChildren) {
            appStage.sortChildren();
        }

        let animationProgress = 0;
        const durationMS = 500; // Полсекунды на анимацию вспышки

        const animateEffect = (ticker) => {
            const deltaMS = ticker.deltaTime * (1000 / 60);
            animationProgress += deltaMS / durationMS;

            effectG.clear();

            if (animationProgress < 1.0) {
                // Извлекаем радиус из вашего конфига targeting
                const aoeRadius = config.targeting?.aoe_radius || 0;
                const radiusMultiplier = aoeRadius > 0 ? aoeRadius : 0.8;

                const currentRadius = hexMath.size * (0.3 + radiusMultiplier * animationProgress);
                const currentAlpha = 1.0 - animationProgress; // Плавно тает

                effectG.lineStyle(4, color, currentAlpha);
                effectG.beginFill(color, currentAlpha * 0.15); // Внутреннее свечение

                const currentRotation = (performance.now() * 0.003) % (Math.PI * 2);

                const segmentCount = 6;
                const segmentAngle = (Math.PI * 2) / segmentCount;
                const dashAngle = segmentAngle * 0.5;

                for (let i = 0; i < segmentCount; i++) {
                    const startAng = currentRotation + i * segmentAngle;
                    const endAng = startAng + dashAngle;
                    effectG.arc(centerX, centerY, currentRadius, startAng, endAng);
                }

                effectG.endFill();
            } else {
                // Полностью удаляем графику из глобальной сцены
                if (effectG.parent) {
                    effectG.parent.removeChild(effectG);
                }
                effectG.destroy();

                AppState.engine.app.ticker.remove(animateEffect);

                // Запускаем применение логики урона/эффектов строго на выходе
                if (onComplete) onComplete();
            }
        };

        AppState.engine.app.ticker.add(animateEffect);
    }


}

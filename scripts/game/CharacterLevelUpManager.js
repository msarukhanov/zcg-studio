// ==== scripts/engine/CharacterLevelUpManager.js
import { AppState } from '../shared/GameState.js';

export const CharacterLevelUpManager = {
    /**
     * 🔮 1. ВЫЧИСЛЕНИЕ СТОИМОСТИ УРОВНЯ ПО СТРОКОВОЙ ФОРМУЛЕ
     * @param {number} currentLevel - Текущий уровень персонажа (L)
     * @param {string} [classFormula] - Специфичная формула класса (если есть)
     */
    calculateRequiredExp(currentLevel, classFormula) {
        // Если у класса нет своей формулы, берём дефолтную из настроек игры
        const baseFormula = classFormula || AppState.game_settings?.nextLevelXpFormula || "100 * Math.pow(L, 1.5)";

        // Подменяем "L" в строке формулы на реальное числовое значение уровня
        const preparedFormula = baseFormula.replace(/L/g, currentLevel);

        try {
            // Безопасное вычисление математического выражения без глобального eval
            return Math.round(Function(`"use strict"; return (${preparedFormula})`)());
        } catch (e) {
            console.error(`[LevelUpManager] Ошибка вычисления формулы опыта:`, e);
            return 100; // Фолбэк в случае сбоя строки
        }
    },

    /**
     * 👥 2. ПЕРВИЧНАЯ ИНИЦИАЛИЗАЦИЯ ПЕРСОНАЖА (Вызывается ОДИН раз при старте New Game)
     * Автоматически докачивает персонажа до его стартового уровня, если он > 1
     * @param {Object} char - Объект персонажа из AppState.characters
     */
    initCharacterExpAndStats(char) {
        if (!char) return;

        // Гарантируем наличие базовых полей опыта
        char.exp = char.exp !== undefined ? char.exp : 0;

        const targetLevel = char.level || 1;
        const classConfig = AppState.classes?.[char.classId];

        // 2.1. Сбрасываем уровень в 1, чтобы честно прогнать накатывание статов за уровни с нуля
        char.level = 1;

        // Если у персонажа изначально не было книги навыков — создаём
        if (!char.skills) char.skills = [];

        // Открываем навыки 1-го уровня для этого класса (если они прописаны)
        if (classConfig?.skillUnlocks) {
            classConfig.skillUnlocks.forEach(unlock => {
                if (unlock.level === 1 && unlock.action === "unlock") {
                    const hasSkill = char.skills.some(s => s.skill_id === unlock.skillId);
                    if (!hasSkill) char.skills.push({ skill_id: unlock.skillId, level: 1 });
                }
            });
        }

        // 2.2. Если персонаж стартует с уровнем выше 1 (например, Эрин 3-го уровня),
        // мы в цикле симулируем левелапы, чтобы накрутить ей статы за уровень автоматически
        for (let l = 1; l < targetLevel; l++) {
            this.applyLevelUpStatsAndSkills(char, classConfig);
        }

        // 2.3. Записываем финальную планку опыта, необходимую для перехода на СЛЕДУЮЩИЙ уровень
        char.requiredExp = this.calculateRequiredExp(char.level, classConfig?.nextLevelXpFormula);

    },

    /**
     * 📈 3. МГНОВЕННЫЙ НАКАТ ХАРАКТЕРИСТИК И НАВЫКОВ ПРИ ПОВЫШЕНИИ УРОВНЯ
     * @param {Object} char - Объект персонажа
     * @param {Object} [classConfig] - Конфиг класса из AppState.classes
     */
    applyLevelUpStatsAndSkills(char, classConfig) {
        char.level += 1;

        if (!classConfig) return;

        // 3.1. Накатываем статы из прироста класса
        if (classConfig.statGainsPerLevel) {
            Object.entries(classConfig.statGainsPerLevel).forEach(([statKey, bonusValue]) => {
                if (char.stats) {
                    // Если это здоровье, увеличиваем и текущее, и максимальное значение
                    if (statKey === 'maxHp') {
                        char.stats.maxHp += bonusValue;
                        char.stats.hp += bonusValue;
                    }
                    // Если это энергия
                    else if (statKey === 'maxEnergy') {
                        char.stats.maxEnergy = (char.stats.maxEnergy || 100) + bonusValue;
                        char.stats.energy = (char.stats.energy || 0) + bonusValue;
                    }
                    // Все остальные плоские статы (atk, def и т.д.)
                    else if (char.stats[statKey] !== undefined) {
                        char.stats[statKey] += bonusValue;
                    }
                }
            });
        }

        // 3.2. Проверяем ветку открытия/апгрейда навыков для нового достигнутого уровня
        if (classConfig.skillUnlocks) {
            classConfig.skillUnlocks.forEach(unlock => {
                if (unlock.level === char.level) {
                    const existingSkill = char.skills.find(s => s.skill_id === unlock.skillId);

                    if (unlock.action === "unlock" && !existingSkill) {
                        char.skills.push({ skill_id: unlock.skillId, level: 1 });
                        console.log(`[LevelUpManager] ${char.name} открыл новый навык: ${unlock.skillId}`);
                    }
                    else if (unlock.action === "upgrade" && existingSkill) {
                        existingSkill.level += 1;
                        console.log(`[LevelUpManager] ${char.name} улучшил навык ${unlock.skillId} до уровня ${existingSkill.level}`);
                    }
                }
            });
        }
    },

    /**
     * ⚡ 4. ТОЧЕЧНАЯ ПРОВЕРКА И ЗАПУСК ПРОЦЕССА ПОВЫШЕНИЯ УРОВНЯ (Вызывается при получении опыта)
     * @param {string} charId - ID персонажа
     */
    checkLevelUp(charId) {
        const char = AppState.characters?.[charId];
        if (!char) return false;

        const classConfig = AppState.classes?.[char.classId];
        let leveledUp = false;

        // Крутим цикл, пока текущего опыта хватает для покрытия планки уровня
        while (char.exp >= char.requiredExp) {
            // Списываем опыт за текущую ступень уровня
            char.exp -= char.requiredExp;

            // Накатываем статы и открываем навыки для следующего уровня
            this.applyLevelUpStatsAndSkills(char, classConfig);

            // Пересчитываем новую планку requiredExp для свежего уровня
            char.requiredExp = this.calculateRequiredExp(char.level, classConfig?.nextLevelXpFormula);
            leveledUp = true;

            if (AppState.engine?.spawnPopupText) {
                AppState.engine.spawnPopupText(char, "LEVEL UP!", 0xf1c40f);
            }
        }

        return leveledUp;
    },


    // ==== Дополнение в CharacterLevelUpManager.js

    /**
     * ⚔️ 1. РАСЧЁТ ОПЫТА ЗА УБИЙСТВО ПО ДИНАМИЧЕСКОЙ ФОРМУЛЕ
     * @param {Object} victim - Труп врага
     * @param {Object} attacker - Убийца
     */
    calculateKillExp(victim, attacker) {
        // Если у монстра жестко прописана фиксированная награда (например, дракон с 1000 exp)
        if (victim.killExp && victim.killExp > 0) return victim.killExp;
        if (victim.stats?.killExp && victim.stats.killExp > 0) return victim.stats.killExp;

        // Вытаскиваем уровни участников. Если уровней нет (простой юнит) — считаем за 1 уровень
        const L1 = victim.level || 1;
        const L2 = attacker.level || 1;

        // Считываем формулу из глобальных настроек игры
        const formulaTemplate = AppState.game_settings?.killExpFormula || "10 * Math.pow(L1, 1.5) / Math.pow(L2, 1.5)";

        // Подставляем L1 и L2 в математическую строку
        const preparedFormula = formulaTemplate.replace(/L1/g, L1).replace(/L2/g, L2);

        try {
            return Math.max(1, Math.round(Function(`"use strict"; return (${preparedFormula})`)()));
        } catch (e) {
            console.error(`[LevelUpManager] Ошибка расчета killExpFormula:`, e);
            return 10; // Минимальный фолбэк
        }
    },

    /**
     * 👥 2. РАСПРЕДЕЛЕНИЕ И ЗАЧИСЛЕНИЕ ОПЫТА (Бой, Квесты)
     * @param {number} totalXp - Сколько всего опыта прилетело в пул
     * @param {string} sourceLeaderId - ID лидера отряда, который заработал опыт
     * @param {string} timingContext - Контекст вызова: 'instant' (реалтайм/квест) или 'win' (победа на арене)
     */
    distributeExperience(totalXp, sourceLeaderId, timingContext = 'instant') {
        const leader = AppState.characters?.[sourceLeaderId];
        if (!leader) return;

        const settings = AppState.game_settings || {};

        // Проверяем: нужно ли копить опыт в буфер до конца пошагового боя?
        if (settings.killExpTiming === 'win' && timingContext === 'instant') {
            if (!AppState.play.currentBattleXpPool) AppState.play.currentBattleXpPool = 0;
            AppState.play.currentBattleXpPool += totalXp;
            console.log(`[LevelUpManager] Опыт +${totalXp} отложен в буфер боя. Всего в пуле: ${AppState.play.currentBattleXpPool}`);
            return;
        }

        // Собираем список всех живых уникальных героев в пати, готовых получить опыт
        const targets = [sourceLeaderId];
        if (leader.units) {
            Object.keys(leader.units).forEach(uId => {
                const companion = AppState.characters?.[uId];
                const isUniqueHero = companion && (!companion.stats?.cost);
                if (isUniqueHero) targets.push(uId);
            });
        }

        // Вычисляем долю опыта на каждого персонажа на основе флага деления killExpShare
        const shareXp = settings.killExpShare === true;
        const xpPerChar = shareXp ? Math.max(1, Math.floor(totalXp / targets.length)) : totalXp;

        console.log(`[LevelUpManager] Начинается раздача опыта (${timingContext}). Всего: ${totalXp}. На каждого героя: ${xpPerChar}. Поделили: ${shareXp}`);

        // Зачисляем опыт и проверяем левелап для каждого сопартийца
        targets.forEach(charId => {
            const char = AppState.characters?.[charId];
            if (char) {
                char.exp = (char.exp || 0) + xpPerChar;

                // Проверяем левелап. Если метод вернул true — внутри сам сработает попап LEVEL UP
                this.checkLevelUp(charId);
            }
        });
    }
};

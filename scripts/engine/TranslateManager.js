import { AppState } from '../shared/GameState.js';

export class TranslateManager {
    constructor() {
        // Инициализируем глобальную функцию шлюза в объекте window
        this.currentLang = 'en';

        // 🚀 ГЛОБАЛЬНЫЙ ШЛЮЗ ДЛЯ СЛОВАРЕЙ (UI, STATS, DIALOGS)
        window._t = (path, fallbackText = '') => {
            return this.getTranslation(path, fallbackText);
        };

        // 🚀 ГЛОБАЛЬНЫЙ ШЛЮЗ ДЛЯ ДИНАМИЧЕСКИХ ОБЪЕКТОВ ЛОКАЛИЗАЦИИ
        window._loc = (data) => {
            if (data === null || data === undefined) return '';
            if (typeof data === 'string') return data;

            if (typeof data === 'object') {
                // Читаем строго из локальной переменной менеджера!
                const activeLang = this.currentLang;
                const translatedText = data[activeLang];

                if (translatedText !== undefined && translatedText !== null && translatedText !== '') {
                    return translatedText;
                }

                // Фолбэк на английский внутри объекта
                if (data['en'] !== undefined && data['en'] !== null && data['en'] !== '') {
                    return data['en'];
                }

                const values = Object.values(data).filter(v => v !== '');
                return values.length > 0 ? values[0] : '';
            }

            return String(data);
        };
    }

    setLanguage(langCode) {
        if (!langCode || typeof langCode !== 'string') return;
        this.currentLang = langCode.trim().toLowerCase();
        console.log(`[TranslateManager] Локальный язык переключен на: [${this.currentLang.toUpperCase()}]`);
    }

    getTranslation(path, fallbackText = '') {
        if (!path || typeof path !== 'string') return fallbackText;

        const activeLang = this.currentLang; // Строго локальная переменная
        const parts = path.split('.');
        const category = parts[0];
        const keyChain = parts.slice(1);

        const dictRoot = AppState.localization?.[category];
        if (!dictRoot) return fallbackText || path;

        // Ищем по схеме [category][lang][...keyChain]
        let currentLevel = dictRoot[activeLang];
        let foundText = null;

        if (currentLevel) {
            foundText = this._getValueByChain(currentLevel, keyChain);
        }

        // ФОЛБЭК НА АНГЛИЙСКИЙ ПАКЕТ
        if ((foundText === null || foundText === undefined || foundText === '') && activeLang !== 'en') {
            const englishLevel = dictRoot['en'];
            if (englishLevel) {
                foundText = this._getValueByChain(englishLevel, keyChain);
            }
        }

        // ФОЛБЭК НА ПЛОСКУЮ СТРУКТУРУ
        if (foundText === null || foundText === undefined || foundText === '') {
            let flatKeyLevel = dictRoot[keyChain.join('.')];
            if (flatKeyLevel) {
                foundText = flatKeyLevel[activeLang] || flatKeyLevel['en'];
            }
        }

        return (foundText !== null && foundText !== undefined && foundText !== '') ? foundText : (fallbackText || path);
    }

    _getValueByChain(obj, chain) {
        let current = obj;
        for (let i = 0; i < chain.length; i++) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return null;
            }
            current = current[chain[i]];
        }
        return current;
    }
}

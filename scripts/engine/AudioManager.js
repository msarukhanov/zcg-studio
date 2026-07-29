// ==== scripts/engine/AudioManager.js
import { AppState } from '../shared/GameState.js';

export const AudioManager = {
    // Хранилища для активных HTML5 Audio элементов в памяти
    _currentMusicHtmlAudio: null,
    _activeSpeechHtmlAudio: null,
    _currentContext: null, // Хранит текущий запущенный плейлист ('background', 'battle', 'hub')

    /**
     * 🎵 1. ЗАПУСК ИГРОВОГО КОНТЕКСТА МУЗЫКИ (background, battle, hub)
     * @param {string} contextName - Название плейлиста из AppState.sound
     */
    playContext(contextName) {
        const soundData = AppState.sound?.[contextName];
        const mixCfg = AppState.game_settings?.audio?.music || { mute: false, volume: 70 };
        console.log("music start ", soundData);
        if (!soundData || !soundData.tracks || soundData.tracks.length === 0) {
            console.warn(`[AudioManager] Плейлист "${contextName}" пуст или не существует.`);
            return;
        }

        this._currentContext = contextName;
        console.log("music start 2");
        // Если музыка на мьюте в микшере — глушим поток, но сохраняем контекст в памяти
        if (mixCfg.mute) {
            this.stopMusic();
            return;
        }

        console.log("music start 3");

        // Берём текущий индекс трека и сохранённое время из AppState
        const idx = soundData.currentIndex || 0;
        const trackSrc = soundData.tracks[idx];

        if (!trackSrc) return;

        // Защита: если этот конкретный трек этого контекста уже играет — не перезапускаем
        if (this._currentMusicHtmlAudio &&
            this._currentMusicHtmlAudio.dataset?.context === contextName &&
                this._currentMusicHtmlAudio.dataset?.originalSrc === trackSrc) {
            return;
        }

        // Останавливаем старую музыку, но перед этим фиксируем её точное время в AppState
        this._captureCurrentTime();
        this.stopMusic();

        try {
            // Вытаскиваем уже готовую, предзагруженную Blob-ссылку из твоего реестра ассетов
            const finalAudioUrl = window.gameAssets?.[trackSrc] || trackSrc;
            console.log(window.gameAssets?.[trackSrc]);

            const audio = new Audio(finalAudioUrl);
            audio.volume = mixCfg.volume / 100;

            // Навешиваем служебные датасеты для проверок
            audio.dataset.context = contextName;
            audio.dataset.originalSrc = trackSrc;

            // Восстанавливаем секунду трека, на которой остановились (из сейва или прошлого перехода)
            if (soundData.currentTime && soundData.currentTime > 0) {
                audio.currentTime = soundData.currentTime;
            }

            // ⏱️ АВТОФИКСАЦИЯ СЕКУНД: Записываем текущее время прямо в AppState на каждом тике плеера
            audio.ontimeupdate = () => {
                soundData.currentTime = audio.currentTime;
            };

            // 🔁 АВТОПЕРЕКЛЮЧЕНИЕ: Когда трек закончился, шагаем к следующему в массиве
            audio.onended = () => {
                soundData.currentIndex = (idx + 1) % soundData.tracks.length;
                soundData.currentTime = 0; // Новый трек стартует с нуля
                console.log(`[AudioManager] Трек завершён. Переход к следующему: индекс ${soundData.currentIndex}`);
                this.playContext(contextName); // Рекурсивно запускаем следующий круг плейлиста
            };

            this._currentMusicHtmlAudio = audio;

            this._currentMusicHtmlAudio = audio;

            // СТРОГИЙ ФИКС: Если музыка глобально на мьюте, мы её инициализируем,
            // но КАТЕГОРИЧЕСКИ НЕ вызываем .play(), чтобы она мирно ждала размьюта на паузе!
            if (!mixCfg.mute) {
                this._currentMusicHtmlAudio.play().catch(e => {
                    console.warn("[AudioManager] Автоплей заблокирован браузером.");
                });
            } else {
                console.log(`[AudioManager] Контекст "${contextName}" подготовлен на паузе (Muted).`);
            }

            console.log(`[AudioManager] Запущен плейлист "${contextName}" [Трек ${idx}]. Старт с секунды: ${soundData.currentTime || 0}`);
        } catch (err) {
            console.error(`[AudioManager] Ошибка старта контекста "${contextName}":`, err);
        }
    },

    /**
     * 🛑 Остановка музыки с гарантированным удалением слушателей
     */
    stopMusic() {
        if (this._currentMusicHtmlAudio) {
            this._currentMusicHtmlAudio.pause();
            this._currentMusicHtmlAudio.ontimeupdate = null;
            this._currentMusicHtmlAudio.onended = null;
            this._currentMusicHtmlAudio = null;
        }
    },

    /**
     * 🔊 2. ЭФФЕКТЫ (SFX - Клик, удар, каст)
     */
    playSFX(src) {
        if (!src) return;
        const cfg = AppState.game_settings?.audio?.sfx || { mute: false, volume: 80 };
        if (cfg.mute) return;

        try {
            const finalUrl = window.gameAssets?.[src] || src;
            const sfx = new Audio(finalUrl);
            sfx.volume = cfg.volume / 100;
            sfx.play().catch(e => {});
        } catch (err) {}
    },

    /**
     * 💬 3. ОЗВУЧКА ДИАЛОГОВ (Speech)
     */
    playSpeech(src) {
        if (!src) return;
        const cfg = AppState.game_settings?.audio?.speech || { mute: false, volume: 100 };

        this.stopSpeech();
        if (cfg.mute) return;

        try {
            const finalUrl = window.gameAssets?.[src] || src;
            this._activeSpeechHtmlAudio = new Audio(finalUrl);
            this._activeSpeechHtmlAudio.volume = cfg.volume / 100;
            this._activeSpeechHtmlAudio.play().catch(e => {});
        } catch (err) {}
    },

    stopSpeech() {
        if (this._activeSpeechHtmlAudio) {
            this._activeSpeechHtmlAudio.pause();
            this._activeSpeechHtmlAudio = null;
        }
    },

    /**
     * 🎛️ 4. СИНХРОНИЗАЦИЯ НАСТРОЕК (Вызывается из меню mutes/изменения громкости)
     */
    /**
     * 🎛️ 4. СИНХРОНИЗАЦИЯ НАСТРОЕК (Экономичный режим: Пауза вместо удаления)
     */
    syncSettings() {
        const mixCfg = AppState.game_settings?.audio;
        if (!mixCfg) return;

        // 🌟 СТРОГИЙ ЧИСТЫЙ ФИКС: Ставим на паузу существующий поток, сохраняя элемент в памяти
        if (this._currentMusicHtmlAudio) {
            if (mixCfg.music.mute) {
                // Звук выключен: фиксируем секунду, ставим на паузу. Батарея и процессор не нагружаются!
                this._captureCurrentTime();
                this._currentMusicHtmlAudio.pause();
            } else {
                // Звук включен обратно: возвращаем громкость и запускаем ТОТ ЖЕ САМЫЙ элемент. Браузер разрешит!
                this._currentMusicHtmlAudio.volume = mixCfg.music.volume / 100;
                this._currentMusicHtmlAudio.play().catch(e => {
                    console.warn("[AudioManager] Не удалось возобновить музыку из паузы:", e);
                });
            }
        }
        // Фолбэк-ветка: если музыки вообще не было в памяти, но её просят включить
        else if (!mixCfg.music.mute && this._currentContext) {
            this.playContext(this._currentContext);
        }

        // Точно так же поступаем с озвучкой речи (Speech)
        if (this._activeSpeechHtmlAudio) {
            if (mixCfg.speech.mute) {
                this._activeSpeechHtmlAudio.pause();
            } else {
                this._activeSpeechHtmlAudio.volume = mixCfg.speech.volume / 100;
                this._activeSpeechHtmlAudio.play().catch(e => {});
            }
        }
    },



    /**
     * Вспомогательный метод: Безопасное сохранение секунды перед сносом аудиоэлемента
     */
    _captureCurrentTime() {
        if (this._currentMusicHtmlAudio && this._currentContext) {
            const soundData = AppState.sound?.[this._currentContext];
            if (soundData) {
                soundData.currentTime = this._currentMusicHtmlAudio.currentTime;
            }
        }
    }
};

// ==== scripts/ui/DiplomacyScreen.js
import { AppState } from '../shared/GameState.js';

export function renderDiplomacyScreen() {
    AppState.engine.ScreenManager.clearCurrentScreen();
    AppState.engine.ScreenManager.currentScreenId = 'diplomacy_screen';

    const currentLang = AppState.game_settings?.language || 'en';
    const activeLeaderId = AppState.play?.activeCharacterId || 'rafael';
    const playerFaction = AppState.characters?.[activeLeaderId]?.faction || 'darkwood';

    const fManager = AppState.engine.factionManager;

    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-diplomacy_screen';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: '850', fontFamily: 'sans-serif'
    });

    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '90vw', maxWidth: '850px', height: '80vh', maxHeight: '550px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', overflow: 'hidden'
    });

    // 👤 Левая колонка: Список фракций
    const leftCol = document.createElement('div');
    Object.assign(leftCol.style, { width: '40%', borderRight: '1px solid #232d38', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' });

    // 📊 Правая колонка: Детали отношений и Кнопки действий
    const rightCol = document.createElement('div');
    Object.assign(rightCol.style, { width: '60%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' });

    // Сканируем все государства из AppState.factions
    Object.keys(AppState.factions).forEach(fId => {
        if (fId === playerFaction) return; // Себя в списке не выводим

        const faction = AppState.factions[fId];
        const btn = document.createElement('button');

        // Получаем чистые данные из твоего FactionManager!
        const opinion = fManager.getOpinion(playerFaction, fId);
        const pact = fManager.getPact(playerFaction, fId); // В B будет записано VASSAL или SUZERAIN

        btn.textContent = `${faction.name} (💬 ${opinion}) [${pact}]`;
        Object.assign(btn.style, {
            width: '100%', padding: '10px', backgroundColor: '#1b2432', border: '1px solid #2d394b',
            borderRadius: '4px', color: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold'
        });

        // КЛИК ПО ФРАКЦИИ: Перерисовывает правую панель действий
        btn.onclick = () => {
            rightCol.innerHTML = ''; // Очищаем старые действия

            const title = document.createElement('h3');
            title.textContent = faction.name;
            title.style.color = '#fff';
            rightCol.appendChild(title);

            // Кнопка: Объявить Войну
            if (pact !== 'WAR') {
                const warBtn = document.createElement('button');
                warBtn.textContent = currentLang === 'ru' ? '⚔️ Объявить войну' : '⚔️ Declare War';
                warBtn.onclick = () => { fManager.changePact(playerFaction, fId, 'WAR'); renderDiplomacyScreen(); };
                rightCol.appendChild(warBtn);
            }

            // Кнопка: Предложить вассалитет
            if (pact !== 'VASSAL' && pact !== 'SUZERAIN') {
                const vassalBtn = document.createElement('button');
                vassalBtn.textContent = currentLang === 'ru' ? '👑 Потребовать вассалитет' : '👑 Demand Vassalage';
                // Вызываем наш асимметричный коммит пакта!
                vassalBtn.onclick = () => { fManager.changePact(playerFaction, fId, 'VASSAL_OWNER'); renderDiplomacyScreen(); };
                rightCol.appendChild(vassalBtn);
            }
        };

        leftCol.appendChild(btn);
    });

    // Кнопка закрытия окна
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => AppState.engine.ScreenManager.clearCurrentScreen();

    windowBoard.appendChild(leftCol); windowBoard.appendChild(rightCol); windowBoard.appendChild(closeBtn);
    screenWrapper.appendChild(windowBoard); AppState.engine.ScreenManager.rootContainer.appendChild(screenWrapper);
}

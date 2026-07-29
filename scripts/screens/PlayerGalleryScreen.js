// ==== scripts/ui/PlayerGalleryScreen.js
import { AppState } from '../shared/GameState.js';

export function renderPlayerGalleryScreen() {
    const screenManager = AppState.engine.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    const previousScreenId = screenManager.currentScreenId || 'main_menu';

    screenManager.clearCurrentScreen();
    screenManager.currentScreenId = 'player_gallery_screen';

    // 1. ТВОЙ СТРОГИЙ СТИЛЬНЫЙ ОВЕРЛЕЙ ЭКРАНА
    const screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-player_gallery_screen';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(12, 17, 24, 0.96)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: '5000', fontFamily: 'sans-serif'
    });

    // 2. ЦЕНТРАЛЬНАЯ ДОСКА ГАЛЕРЕИ ( maxWidth: 1050px, height: 85vh )
    const windowBoard = document.createElement('div');
    Object.assign(windowBoard.style, {
        width: '95%', maxWidth: '1050px', height: '85%', maxHeight: '650px',
        backgroundColor: '#111622', border: '2px solid #34495e', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        boxSizing: 'border-box', overflow: 'hidden', padding: '30px'
    });
    screenWrapper.appendChild(windowBoard);

    // 3. ТВОЙ ФИКСИРОВАННЫЙ КРЕСТИК ЗАКРЫТИЯ ЭКРАНА
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
        position: 'fixed', top: '10px', right: '10px', width: '44px', height: '44px',
        backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
        borderRadius: '50%', color: '#8a92a6', fontSize: '22px', cursor: 'pointer', zIndex: '100'
    });
    closeBtn.onclick = () => {
        screenManager.clearCurrentScreen();
        screenManager.currentScreenId = null;
        screenManager.renderScreen(previousScreenId);
        if (AppState.engine?.uiManager?.updateAll) AppState.engine.uiManager.updateAll();
    };
    windowBoard.appendChild(closeBtn);

    // ХЕДЕР ОКНА ГАЛЕРЕИ ИГРОКА
    const headerBlock = document.createElement('div');
    Object.assign(headerBlock.style, {
        width: '100%', paddingBottom: '15px', borderBottom: '1px solid #232d38', marginBottom: '25px'
    });
    headerBlock.innerHTML = `
        <h1 style="color:#fff; margin:0; font-size:20px; letter-spacing:1px; font-weight:bold;">
            ${_t('ui.gallery')}
        </h1>
        <span style="color:#8a92a6; font-size:11px; margin-top:2px; display:block;">
            ${_t('ui.gallery_description')}
        </span>
    `;
    windowBoard.appendChild(headerBlock);

    // СЕТКА КАРТОЧЕК ГАЛЕРЕИ (GRID)
    const galleryGrid = document.createElement('div');
    Object.assign(galleryGrid.style, {
        width: '100%', flex: '1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '15px', overflowY: 'auto', alignContent: 'start'
    });
    windowBoard.appendChild(galleryGrid);

    // ВНУТРЕННИЙ ОВЕРЛЕЙ ДЛЯ ДЕТАЛЬНОГО ПРОСМОТРА КАРТОЧКИ (ПОСТЕР / ЗАПИСКА)
    const detailOverlay = document.createElement('div');
    Object.assign(detailOverlay.style, {
        position: 'absolute', inset: '0', backgroundColor: 'rgba(5, 8, 12, 0.95)',
        display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: '6000', padding: '20px', boxSizing: 'border-box'
    });
    windowBoard.appendChild(detailOverlay);

    // Функция открытия детального просмотра
    // =========================================================================
    // 🎭 КРАСИВЫЙ ПОЛНОЭКРАННЫЙ ТЕАТРАЛЬНЫЙ РЕЖИМ ПРОСМОТРА (БЕЗ НАСЛОЕНИЙ)
    // =========================================================================
    // =========================================================================
    // 🎭 ПОЛНОЭКРАННЫЙ ТЕАТРАЛЬНЫЙ РЕЖИМ С ИНТЕРАКТИВНЫМ СЛАЙДЕРОМ (ВЛЕВО / ВПРАВО)
    // =========================================================================
    const openDetailViewer = (item) => {
        detailOverlay.innerHTML = '';
        detailOverlay.style.display = 'flex';

        // Настраиваем подложку фулскрина
        Object.assign(detailOverlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 7, 10, 0.98)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: '7000', padding: '20px', boxSizing: 'border-box'
        });

        // ❌ ЕДИНСТВЕННЫЙ ФИКСИРОВАННЫЙ КРЕСТИК ЗАКРЫТИЯ В УГЛУ ЭКРАНА (НИКАКИХ НА СЛОЕНИЙ)


        // 1. СТРОГИЙ ДАТА-ДРИВЕН СБОР ОТКРЫТЫХ СЛАЙДОВ:
        // Вытаскиваем из AppState только те карточки, которые РАЗБЛОКИРОВАНЫ игроком
        const unlockedItems = Object.values(AppState.playerGallery || {})
            .filter(i => !i.locked)
            .sort((a, b) => (a.index || 0) - (b.index || 0));

        // Находим текущий порядковый индекс элемента в массиве слайдов
        const currentSlideIndex = unlockedItems.findIndex(i => i.id === item.id);

        // ❌ ЕДИНСТВЕННЫЙ ФИКСИРОВАННЫЙ КРЕСТИК ЗАКРЫТИЯ В УГЛУ ЭКРАНА
        const innerClose = document.createElement('button');
        innerClose.innerHTML = '✕';
        Object.assign(innerClose.style, {
            position: 'fixed', top: '10px', right: '10px', width: '46px', height: '44px',
            backgroundColor: 'rgba(20, 24, 30, 0.85)', border: '2px solid rgb(58, 71, 89)',
            borderRadius: '50%', color: '#fff', fontSize: '20px', cursor: 'pointer', zIndex: '8000',
            transition: 'background-color 0.15s, color 0.15s'
        });
        innerClose.onclick = () => detailOverlay.style.display = 'none';
        detailOverlay.appendChild(innerClose);

        // ◀️ СТРЕЛКА ВЛЕВО (ПОЯВЛЯЕТСЯ, ЕСЛИ ЕСТЬ ПРЕДЫДУЩИЙ СЛАЙД)
        if (currentSlideIndex > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '◀';
            Object.assign(prevBtn.style, {
                position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '44px', height: '44px', backgroundColor: 'rgba(20, 24, 30, 0.6)',
                border: '1px solid rgb(58, 71, 89)', borderRadius: '50%', color: '#fff',
                fontSize: '22px', cursor: 'pointer', zIndex: '8000', transition: 'background-color 0.1s'
            });
            prevBtn.onmouseenter = () => prevBtn.style.backgroundColor = '#3498db';
            prevBtn.onmouseleave = () => prevBtn.style.backgroundColor = 'rgba(20, 24, 30, 0.6)';

            // Клик нативно запускает рекурсивное открытие предыдущего ассета!
            prevBtn.onclick = () => openDetailViewer(unlockedItems[currentSlideIndex - 1]);
            detailOverlay.appendChild(prevBtn);
        }

        // ▶️ СТРЕЛКА ВПРАВО (ПОЯВЛЯЕТСЯ, ЕСЛИ ЕСТЬ СЛЕДУЮЩИЙ СЛАЙД)
        if (currentSlideIndex < unlockedItems.length - 1) {
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '▶';
            Object.assign(nextBtn.style, {
                position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '44px', height: '44px', backgroundColor: 'rgba(20, 24, 30, 0.6)',
                border: '1px solid rgb(58, 71, 89)', borderRadius: '50%', color: '#fff',
                fontSize: '22px', cursor: 'pointer', zIndex: '8000', transition: 'background-color 0.1s'
            });
            nextBtn.onmouseenter = () => nextBtn.style.backgroundColor = '#3498db';
            nextBtn.onmouseleave = () => nextBtn.style.backgroundColor = 'rgba(20, 24, 30, 0.6)';

            // Клик нативно запускает рекурсивное открытие следующего ассета!
            nextBtn.onclick = () => openDetailViewer(unlockedItems[currentSlideIndex + 1]);
            detailOverlay.appendChild(nextBtn);
        }

        // Главный адаптивный контейнер под контент
        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, {
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '20px', boxSizing: 'border-box', overflow: 'hidden'
        });
        detailOverlay.appendChild(contentContainer);

        // ВАРИАНТ А: ЭТО КОЛЛЕКЦИОННЫЙ ПОСТЕР (Картинка)
        if (item.image) {
            const imgWrapper = document.createElement('div');
            Object.assign(imgWrapper.style, {
                flex: '1', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            });

            const imgEl = document.createElement('img');
            imgEl.src = item.image;
            Object.assign(imgEl.style, {
                maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain',
                filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.8))'
            });
            imgWrapper.appendChild(imgEl);
            contentContainer.appendChild(imgWrapper);

            const infoLabel = document.createElement('div');
            infoLabel.style.cssText = 'text-align:center; max-width:600px; padding:0 20px;';
            infoLabel.innerHTML = `
                <h2 style="color:#ffd166; margin:0 0 6px 0; font-size:16px; font-weight:bold; letter-spacing:1px;">${item.name.toUpperCase()}</h2>
                <p style="color:#8a92a6; margin:0; font-size:12px; line-height:16px; font-style:italic;">${item.text}</p>
            `;
            contentContainer.appendChild(infoLabel);
        }
        // ВАРИАНТ Б: ЭТО СЕКРЕТНАЯ ЗАПИСКА / СВИТОК (Текст)
        else {
            const textWindow = document.createElement('div');
            Object.assign(textWindow.style, {
                width: '100%', maxWidth: '650px', height: '80vh', backgroundColor: '#141a27',
                border: '1px solid #2d394b', borderRadius: '6px', padding: '30px 40px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 30px 70px rgba(0,0,0,0.9)'
            });

            textWindow.innerHTML = `
                <div style="border-bottom:1px solid #232d38; padding-bottom:10px; margin-bottom:5px;">
                    <span style="color:#e67e22; font-size:10px; font-weight:bold; letter-spacing:1px; display:block; margin-bottom:2px;">SECURED DOCUMENT</span>
                    <h2 style="color:#fff; margin:0; font-size:18px; font-weight:bold; letter-spacing:0.5px;">${item.name.toUpperCase()}</h2>
                </div>
                <div style="flex:1; color:#d1d5db; font-size:13px; line-height:22px; font-family:serif; white-space:pre-wrap; overflow-y:auto; padding-right:10px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                    ${item.text}
                </div>
            `;
            contentContainer.appendChild(textWindow);
        }
    };

    // ЧИТАЕМ ДАННЫЕ ИЗ ТВОЕЙ КАНOНИЧНОЙ СТРУКТУРЫ В APPSTATE
    // Заводим фолбэк, если ветка в AppState пустая
    if (!AppState.playerGallery) AppState.playerGallery = {};
    const items = Object.values(AppState.playerGallery);

    if (items.length === 0) {
        galleryGrid.innerHTML = `<div style="color:#4f5b66; font-size:13px; font-style:italic; grid-column:1/-1; text-align:center; margin-top:60px;">${_t('ui.gallery_empty')}</div>`;
    } else {
        // Сортируем карточки по заложенному тобой индексу (index)
        items.sort((a, b) => (a.index || 0) - (b.index || 0)).forEach(item => {
            const card = document.createElement('div');
            Object.assign(card.style, {
                padding: '10px', backgroundColor: '#141a27', border: '1px solid #232d38',
                borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                boxSizing: 'border-box', position: 'relative', opacity: item.locked ? '0.4' : '1',
                cursor: item.locked ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s'
            });

            // Контейнер под мини-превью картинки (или заглушку свитка для текстовых записок)
            const previewHolder = document.createElement('div');
            Object.assign(previewHolder.style, {
                width: '100%', height: '110px', backgroundColor: '#090d14', borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', boxSizing: 'border-box'
            });

            if (item.locked) {
                // Если закрыто — выводим большой замок
                previewHolder.innerHTML = '<span style="font-size:26px;">🔒</span>';
            } else if (item.image) {
                // Если открыто и есть постер — выводим картинку
                previewHolder.innerHTML = `<img src="${item.image}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
            } else {
                // Если открыто, но это чисто текстовый свиток / документ
                previewHolder.innerHTML = '<span style="font-size:32px;">📜</span>';
            }
            card.appendChild(previewHolder);

            // Имя элемента внизу карточки
            const nameLabel = document.createElement('div');
            nameLabel.textContent = item.locked ? '???' : item.name;
            nameLabel.style.cssText = 'color:#fff; font-size:11px; font-weight:bold; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            card.appendChild(nameLabel);

            // Тип подписи (Постер / Свиток / Записка)
            const typeLabel = document.createElement('div');
            typeLabel.textContent = item.locked ? 'Locked' : (item.type || 'Item').toUpperCase();
            typeLabel.style.cssText = `font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; color:#fff; background: ${item.locked ? '#3a4759' : item.image ? '#3498db' : '#e67e22'};`;
            card.appendChild(typeLabel);

            // ОБРАБОТЧИК КЛИКА ПО КАРТОЧКЕ В СЕТКЕ
            if (!item.locked) {
                card.onmouseenter = () => card.style.borderColor = '#3498db';
                card.onmouseleave = () => card.style.borderColor = '#232d38';
                card.onclick = () => openDetailViewer(item);
            }

            galleryGrid.appendChild(card);
        });
    }

    screenManager.rootContainer.appendChild(screenWrapper);
}

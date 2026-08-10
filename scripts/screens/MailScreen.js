import { AppState } from '../shared/GameState.js';
// import { sendSocket } from '../db/socket.js';

function sendSocket() {}


// Сессионный стейт открытого письма
export const MailState = {
    activeMailId: null
};

/**
 * 📬 ГЛАВНАЯ ФУНКЦИЯ: Умный реактивный рендер игровой почты
 */
export function renderMailScreen() {
    const screenManager = AppState.engine?.ScreenManager;
    if (!screenManager || !screenManager.rootContainer) return;

    // Считываем адаптивные UI настройки из AppState
    const orientation = AppState.config?.orientation || 'landscape';
    const configUi = AppState.ui || {};
    const screenSettings = configUi[orientation]?.find(w => w.id === 'mail') || {};
    const listSettings = screenSettings.list_settings || {};

    const sidebarWidth = listSettings.sidebar_width || "240px";
    const headerHeight = listSettings.header_height || "40px";
    const headerBg = listSettings.header_background || "#121212";
    const gap = listSettings.gap || "8px";

    // ==========================================
    // 🛠️ ЛОКАЛЬНЫЙ ХАРДКОД ДЛЯ ТЕСТА ВИЗУАЛА (БЕЗ МУТАЦИИ AppState)
    // ==========================================
    if (!AppState.player_mail || AppState.player_mail.length === 0) {
        AppState.player_mail = [
            { id: 'm_1', title: 'Награда за Арену!', body: 'Приветствуем, Владыка!\nВы заняли почетное место в Высшей Лиге. Заберите вашу честно заработанную еженедельную награду.', created_at: Date.now() - 3600000, is_read: false, is_claimed: false, rewards: [{ id: 'diamonds', count: 500 }, { id: 'gold', count: 10000 }] },
            { id: 'm_2', title: 'Технические работы завершены', body: 'Уважаемые игроки, серверы обновлены до версии 1.4.2.\nПриносим извинения за временные неудобства.', created_at: Date.now() - 86400000, is_read: true, is_claimed: false, rewards: [] },
            { id: 'm_3', title: 'Системный подарок', body: 'Спасибо, что играете в нашу игру! Вот вам небольшой подарок для быстрого старта.', created_at: Date.now() - 172800000, is_read: true, is_claimed: true, rewards: [{ id: 'hero_exp', count: 2500 }] }
        ];
    }

    const mailList = AppState.player_mail || [];

    // Автоматически фокусимся на первом письме при входе, если ничего не выбрано
    if (mailList.length > 0 && !MailState.activeMailId) {
        MailState.activeMailId = mailList[0].id;
    }

    const activeMail = mailList.find(m => String(m.id) === String(MailState.activeMailId));

    // ==========================================
    // 🔍 ПРОВЕРКА КАРКАСА (ЗАЩИТА ОТ МИГАНИЯ СТРОБОСКОПА)
    // ==========================================
    let screenWrapper = screenManager.rootContainer.querySelector('#screen-mail');

    if (screenWrapper) {
        // Каркас уже есть — точечно обновляем списки и ридер справа!
        updateMailDynamicContent(screenWrapper, mailList, activeMail, gap);
        return;
    }

    // --- ЕСЛИ ЭКРАНА ЕЩЕ НЕТ (ПЕРВЫЙ ВХОД), СТРОИМ КАРКАС ---
    // При самом первом входе шлем сокет-прогрев списка писем
    sendSocket('mail', 'getInitialState', {});

    screenWrapper = document.createElement('div');
    screenWrapper.id = 'screen-mail';
    screenWrapper.style.pointerEvents = 'auto';
    Object.assign(screenWrapper.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'row', boxSizing: 'border-box',
        userSelect: 'none', zIndex: '500', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a'
    });

    // =========================================================================
    // 🧱 1. ЛЕВАЯ КОЛОНКА: СТАТИЧНЫЙ КАРКАС ЛЕВОГО ИНБОКСА
    // =========================================================================
    const sidebar = document.createElement('div');
    sidebar.className = 'ml-sidebar';
    Object.assign(sidebar.style, {
        display: 'flex', flexDirection: 'column', borderRight: '1px solid #252525',
        boxSizing: 'border-box', height: '100%', width: sidebarWidth, flexShrink: '0',
        backgroundColor: 'rgba(20, 20, 20, 0.8)', overflow: 'hidden', pointerEvents: 'auto'
    });

    // Хедер сайдбара писем (Заголовок + Массовая очистка мусора)
    const sidebarHeader = document.createElement('div');
    Object.assign(sidebarHeader.style, {
        width: '100%', height: headerHeight, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 10px', boxSizing: 'border-box',
        borderBottom: '1px solid #1f1f1f', background: headerBg, flexShrink: '0'
    });

    const headerTitle = document.createElement('div');
    Object.assign(headerTitle.style, { fontSize: '11px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' });
    headerTitle.textContent = `📬 ${_t('mail.ml_inbox_header') || 'Inbox Matrix'}`;
    sidebarHeader.appendChild(headerTitle);

    const clearTrashBtn = document.createElement('button');
    clearTrashBtn.id = 'ml_clear_all_btn';
    clearTrashBtn.textContent = _t('mail.ml_btn_clear_trash') || 'Clear Clean';
    Object.assign(clearTrashBtn.style, { background: '#222', border: '1px solid #444', color: '#aaa', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' });
    clearTrashBtn.onclick = (e) => {
        e.stopPropagation();
        sendSocket('mail', 'clearTrashMail', {});
    };
    sidebarHeader.appendChild(clearTrashBtn);
    sidebar.appendChild(sidebarHeader);

    // Пустой слот-контейнер для вливания строк писем
    const rowsListContainer = document.createElement('div');
    rowsListContainer.className = 'ml-rows-list-slot';
    Object.assign(rowsListContainer.style, { flex: '1', overflowY: 'auto', padding: '10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: gap });
    sidebar.appendChild(rowsListContainer);
    screenWrapper.appendChild(sidebar);

    // =========================================================================
    // 🧱 2. ПРАВАЯ ОБЛАСТЬ: ПУСТОЙ СЛОТ ПОД ОКНО ЧТЕНИЯ (МАПИНГ КАРКАСА)
    // =========================================================================
    const readerAreaSlot = document.createElement('div');
    readerAreaSlot.className = 'ml-reader-area-slot';
    Object.assign(readerAreaSlot.style, { display: 'flex', flexDirection: 'column', flex: '1', height: '100%', backgroundColor: 'rgba(10, 10, 10, 0.5)', overflow: 'hidden' });
    screenWrapper.appendChild(readerAreaSlot);

    screenManager.rootContainer.appendChild(screenWrapper);

    // Запускаем первичное наполнение динамических слотов
    updateMailDynamicContent(screenWrapper, mailList, activeMail, gap);
}

/**
 * 🔄 ФУНКЦИЯ ТОЧЕЧНОГО ОБНОВЛЕНИЯ ПОЧТЫ (СПИСОК ПИСЕМ + ОКНО ЧТЕНИЯ)
 */
function updateMailDynamicContent(screenWrapper, mailList, activeMail, gap) {
    // =========================================================================
    // 📬 1. ОБНОВЛЕНИЕ ЛЕВОГО СПИСКА ВХОДЯЩИХ ПИСЕМ
    // =========================================================================
    const rowsContainer = screenWrapper.querySelector('.ml-rows-list-slot');
    if (rowsContainer) {
        rowsContainer.innerHTML = ''; // Очищаем только строки писем

        if (mailList.length === 0) {
            const emptyBox = document.createElement('div');
            Object.assign(emptyBox.style, { margin: 'auto', color: '#444', fontSize: '12px', fontStyle: 'italic', padding: '20px 0' });
            emptyBox.textContent = _t('mail.ml_empty_box') || 'Your mailbox is empty...';
            rowsContainer.appendChild(emptyBox);
        } else {
            mailList.forEach(m => {
                const isSelected = String(m.id) === String(MailState.activeMailId);

                // Статусы иконки: 🎁 — есть награда, ✉️ — новое письмо, 📖 — прочитанное
                let icon = '📖';
                const hasRewards = Array.isArray(m.rewards) && m.rewards.length > 0;
                if (hasRewards && !m.is_claimed) icon = '🎁';
                else if (!m.is_read) icon = '✉️';

                const dateStr = new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

                const itemRow = document.createElement('div');
                itemRow.className = 'ml-item-row';
                Object.assign(itemRow.style, {
                    width: '100%', height: '50px', background: isSelected ? '#1b263b' : '#141414',
                    border: `1px solid ${isSelected ? '#2196f3' : '#1f1f1f'}`, borderRadius: '6px',
                    display: 'flex', alignItems: 'center', padding: '0 10px', boxSizing: 'border-box',
                    justifyContent: 'space-between', gap: '10px', cursor: 'pointer', flexShrink: '0', pointerEvents: 'auto'
                });

                itemRow.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; text-align: left;">
                        <span style="font-size: 16px; flex-shrink: 0;">${icon}</span>
                        <div style="display: flex; flex-direction: column; min-width: 0;">
                            <b style="font-size: 12px; color: ${m.is_read ? '#aaa' : '#fff'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.title}</b>
                            <span style="font-size: 10px; color: #444;">${dateStr}</span>
                        </div>
                    </div>
                    ${!m.is_read ? '<div style="width: 6px; height: 6px; background: #ff4081; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 4px #ff4081;"></div>' : ''}
                `;

                itemRow.onclick = (e) => {
                    e.stopPropagation();
                    if (String(MailState.activeMailId) === String(m.id)) return;

                    MailState.activeMailId = m.id;

                    if (!m.is_read) {
                        sendSocket('mail', 'markAsRead', { mailId: m.id });
                        m.is_read = true; // Тушим флаг локально до ответа сервера
                    }
                    renderMailScreen(); // Реактивное точечное обновление
                };

                rowsContainer.appendChild(itemRow);
            });
        }
    }

    // =========================================================================
    // 📖 2. ОБНОВЛЕНИЕ ПРАВОГО ОКНА ЧТЕНИЯ И ВЛОЖЕНИЙ
    // =========================================================================
    const readerSlot = screenWrapper.querySelector('.ml-reader-area-slot');
    if (readerSlot) {
        readerSlot.innerHTML = ''; // Очищаем старое открытое письмо

        if (!activeMail) {
            const promptBox = document.createElement('div');
            Object.assign(promptBox.style, { margin: 'auto', color: '#444', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' });
            promptBox.textContent = _t('mail.ml_select_prompt') || 'Select a transmission link to read content...';
            readerSlot.appendChild(promptBox);
            return;
        }

        // Собираем правый флекс-бокс контента с верхним отступом 60px под кнопку ресурсов/закрытия
        const mailContentBox = document.createElement('div');
        Object.assign(mailContentBox.style, { display: 'flex', flexDirection: 'column', flex: '1', height: '100%', padding: '60px 15px 15px 15px', boxSizing: 'border-box', justifyContent: 'space-between', gap: '15px' });

        // Блок текста письма
        const textBox = document.createElement('div');
        Object.assign(textBox.style, { display: 'flex', flexDirection: 'column', gap: '10px', flex: '1', overflowY: 'auto', textAlign: 'left' });
        textBox.innerHTML = `
            <b style="font-size: 15px; color: #fff; border-bottom: 1px solid #1f1f1f; padding-bottom: 8px; flex-shrink: 0;">${activeMail.title}</b>
            <div style="font-size: 12px; color: #dfdfdf; word-break: break-word; line-height: 1.5; white-space: pre-line; flex: 1;">${activeMail.body}</div>
        `;
        mailContentBox.appendChild(textBox);

        // Отрисовка вложений лута (Attached Payload)
        const rewards = activeMail.rewards || [];
        if (rewards.length > 0) {
            const rewardsWrapper = document.createElement('div');
            Object.assign(rewardsWrapper.style, { marginTop: 'auto', borderTop: '1px solid #1f1f1f', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', flexShrink: '0' });
            rewardsWrapper.innerHTML = `<span style="font-size: 10px; color: #2196f3; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🎁 ${_t('mail.ml_attachments') || 'Attached Payload'}</span>`;

            const itemsFlex = document.createElement('div');
            Object.assign(itemsFlex.style, { display: 'flex', gap: '8px', flexWrap: 'wrap', pointerEvents: 'auto' });

            rewards.forEach(r => {
                let rIcon = '📦';
                if (r.id === 'gold') rIcon = '🪙';
                else if (r.id === 'diamonds' || r.id === 'gems') rIcon = '💎';
                else if (r.id === 'hero_exp' || r.id === 'exp') rIcon = '🧪';

                const itemBox = document.createElement('div');
                Object.assign(itemBox.style, { background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', minWidth: '80px' });
                itemBox.innerHTML = `<span style="font-size: 16px;">${rIcon}</span><div style="display: flex; flex-direction: column; text-align: left;"><span style="color: #888; font-size: 9px; text-transform: uppercase;">${r.id}</span><b style="color: #fff;">x${r.count}</b></div>`;
                itemsFlex.appendChild(itemBox);
            });

            rewardsWrapper.appendChild(itemsFlex);
            mailContentBox.appendChild(rewardsWrapper);
        }

        // Нижние кнопки действий (Удалить / Забрать лут)
        const actionRow = document.createElement('div');
        Object.assign(actionRow.style, { display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #1f1f1f', paddingTop: '12px', flexShrink: '0', pointerEvents: 'auto' });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = _t('mail.ml_btn_delete') || 'Delete';
        Object.assign(deleteBtn.style, { height: '32px', background: '#222', border: '1px solid #e94560', color: '#e94560', padding: '0 16px', borderRadius: '4px', fontSize: '11px', font_weight: 'bold', fontWeight: 'bold', cursor: 'pointer' });
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            sendSocket('mail', 'deleteMail', { mailId: activeMail.id });
            if (String(MailState.activeMailId) === String(activeMail.id)) MailState.activeMailId = null;
            renderMailScreen();
        };
        actionRow.appendChild(deleteBtn);

        const isClaimDisabled = activeMail.is_claimed || rewards.length === 0;
        const claimBtn = document.createElement('button');
        claimBtn.disabled = isClaimDisabled;
        claimBtn.textContent = activeMail.is_claimed ? (_t('mail.ml_btn_claimed') || 'Claimed ✓') : (_t('mail.ml_btn_claim') || 'Claim Loot');

        Object.assign(claimBtn.style, {
            height: '32px', padding: '0 20px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
            background: isClaimDisabled ? '#1a1a1a' : 'linear-gradient(135deg, #4ecca3, #2b9371)',
            border: isClaimDisabled ? '1px solid #333' : 'none',
            color: isClaimDisabled ? '#555' : '#12122c',
            cursor: isClaimDisabled ? 'default' : 'pointer'
        });

        claimBtn.onclick = (e) => {
            e.stopPropagation();
            sendSocket('mail', 'claimReward', { mailId: activeMail.id });
        };
        actionRow.appendChild(claimBtn);

        mailContentBox.appendChild(actionRow);
        readerSlot.appendChild(mailContentBox);
    }
}

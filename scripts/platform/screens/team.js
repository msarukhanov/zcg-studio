// scripts/screens/team.js
import { API } from '../api.js';
import { t, locObj } from '../i18n.js';

export async function renderTeam(container) {
    const user = window.App?.user;

    if (!user) {
        window.location.hash = '#auth';
        return;
    }

    // СЦЕНАРИЙ А: У пользователя еще нет команды — рендерим форму создания
    if (!user.team_id) {
        renderCreateTeamForm(container);
        return;
    }

    // СЦЕНАРИЙ Б: Пользователь состоит в команде — запрашиваем профиль студии
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 14px;">${t('loading_details')}</div>`;

    const teamData = await API.getTeamProfile(user.team_id);

    if (teamData.err || !teamData.profile) {
        container.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">${t('err_load_details')}</div>`;
        return;
    }

// 👑 ИСПРАВЛЕНО: Безопасно проверяем, пришел массив или объект, и берем данные правильно
    const team = Array.isArray(teamData.profile) ? teamData.profile[0] : teamData.profile;

    if (!team) {
        container.innerHTML = `<div style="color: var(--accent-red); font-size: 14px;">${t('err_load_details')}</div>`;
        return;
    }

// Теперь это свойство прочитается идеально и без ошибок!
    const isOwner = user.id === team.owner_id;


    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 32px;">
            
            <!-- Шапка команды -->
            <div style="display: flex; gap: 24px; background: var(--bg-card); padding: 24px; border-radius: 8px; border: 1px solid var(--border-color);">
                <img src="${team.logo_url || '/assets/teams/default-logo.png'}" style="width: 96px; height: 96px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);" alt="Logo">
                <div style="display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                    <h1 style="font-size: 24px; color: var(--text-main); margin: 0;">${team.name}</h1>
                    <p style="color: var(--text-muted); font-size: 14px; margin: 0;">${locObj(team.description_loc)}</p>
                    <div style="font-size: 13px; color: var(--text-muted);">
                        ${t('team_recruitment_status')} 
                        <strong id="recruitment-status-label">
                            ${team.is_recruitment_open ? t('team_recruitment_open') : t('team_recruitment_closed')}
                        </strong>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                
                <!-- Блок состава участников (Состав команды по вашему условию) -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px;">
                    <h2 style="font-size: 16px; margin-bottom: 16px; color: var(--accent-blue);">${t('prof_dev_team')} (${teamData.members.length})</h2>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${teamData.members.map(m => `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-sidebar); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <img src="${window.URL_ASSETS+m.avatar_url || '/assets/default-avatar.png'}" style="width: 24px; height: 24px; border-radius: 50%;" alt="Avatar">
                                    <span style="font-size: 14px; font-weight: 600;">${m.display_name}</span>
                                </div>
                                <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                                    ${m.team_rank === 'owner' ? '👑 Owner' : m.team_rank}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 🛠️ МЕНЕДЖМЕНТ ВХОДЯЩИХ ЗАЯВОК (Доступен только Владельцу) -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 8px;">
                    <h2 style="font-size: 16px; margin-bottom: 16px; color: var(--text-main);" id="apps-title-text">${t('team_apps_title', '0')}</h2>
                    <div id="applications-list-container" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Заявки загрузятся асинхронно функцией ниже -->
                    </div>
                </div>

            </div>

        </div>
    `;

    // Если текущий юзер — Лидер команды, запускаем логику рендеринга заявок на вступление
    if (isOwner) {
        await loadIncomingApplications();
    } else {
        const appsContainer = document.getElementById('applications-list-container');
        if (appsContainer) appsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Only the team owner can manage applications.</p>`;
    }
}

/**
 * Рендеринг no-code формы создания команды для одиночек
 */
function renderCreateTeamForm(container) {
    container.innerHTML = `
        <div style="max-width: 500px; margin: 40px auto; background: var(--bg-card); padding: 32px; border-radius: 8px; border: 1px solid var(--border-color);">
            <h2 class="screen-title" style="margin-bottom: 24px; text-align: center;">${t('team_create_title')}</h2>
            <form id="team-create-form" style="display: flex; flex-direction: column; gap: 16px;">
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('team_label_name')}</label>
                    <input type="text" id="new-team-name" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('team_label_desc')} (RU)</label>
                    <textarea id="new-team-desc-ru" required placeholder="Описание на русском..." style="width: 100%; height: 60px; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none; resize: none;"></textarea>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('team_label_desc')} (EN)</label>
                    <textarea id="new-team-desc-en" required placeholder="Description in English..." style="width: 100%; height: 60px; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none; resize: none;"></textarea>
                </div>

                <button type="submit" class="zcg-btn btn-success" style="width: 100%; padding: 12px; margin-top: 8px;">${t('team_btn_create')}</button>
            </form>
        </div>
    `;

    document.getElementById('team-create-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-team-name').value;
        const descRu = document.getElementById('new-team-desc-ru').value;
        const descEn = document.getElementById('new-team-desc-en').value;

        const descriptionLoc = { ru: descRu, en: descEn };

        const res = await API.createTeam(name, descriptionLoc);
        if (!res.err) {
            alert(t('alert_team_created'));
            // Сразу обновляем JWT, чтобы ядро узнало про новый team_id
            window.App.checkAuth();
            renderTeam(document.getElementById('app-root'));
        } else {
            alert(t('alert_tx_failed', res.error));
        }
    });
}

/**
 * Асинхронная загрузка заявок на вступление и вывод кнопок Принять/Отклонить
 */
async function loadIncomingApplications() {
    const listContainer = document.getElementById('applications-list-container');
    const titleText = document.getElementById('apps-title-text');
    if (!listContainer) return;

    const res = await API.getIncomingApplications();

    if (res.err || !res.applications) {
        listContainer.innerHTML = `<div style="color: var(--accent-red); font-size: 13px;">Error loading apps</div>`;
        return;
    }

    // Обновляем число в заголовке блока
    if (titleText) titleText.textContent = t('team_apps_title', res.applications.length);

    if (res.applications.length === 0) {
        listContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">${t('team_no_apps')}</p>`;
        return;
    }

    // Генерируем список заявок
    // Генерируем список заявок
    listContainer.innerHTML = res.applications.map(app => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-sidebar); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${window.URL_ASSETS+app.avatar_url || '/assets/default-avatar.png'}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="Avatar">
                <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">${app.display_name}</span>
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button class="zcg-btn btn-success" style="padding: 6px 12px; font-size: 12px;" id="btn-accept-${app.application_id}">
                    ${t('team_btn_accept')}
                </button>
                <button class="zcg-btn" style="background: var(--accent-red); padding: 6px 12px; font-size: 12px;" id="btn-reject-${app.application_id}">
                    ${t('team_btn_reject')}
                </button>
            </div>
        </div>
    `).join('');

    // Навешиваем клики на каждую кнопку
    res.applications.forEach(app => {
        document.getElementById(`btn-accept-${app.application_id}`)?.addEventListener('click', () => processApp(app.application_id, 'ACCEPT'));
        document.getElementById(`btn-reject-${app.application_id}`)?.addEventListener('click', () => processApp(app.application_id, 'REJECT'));
    });
}

/**
 * Отправка вердикта на бэкенд и мгновенное обновление списка
 * @param {number} appId - ID заявки
 * @param {string} action - Действие: 'ACCEPT' или 'REJECT'
 */
async function processApp(appId, action) {
    const res = await API.processApplication(appId, action);
    if (!res.err) {
        alert(t('alert_app_processed'));
        // Перерисовываем только блок заявок
        await loadIncomingApplications();
    } else {
        alert(t('alert_tx_failed', res.error));
    }
}


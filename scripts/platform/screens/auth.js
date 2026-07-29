// scripts/screens/auth.js
import { API } from '../api.js';
import { t } from '../i18n.js';

export function renderAuth(container) {
    renderLoginForm(container);
}

function renderLoginForm(container) {
    container.innerHTML = `
        <div class="auth-wrapper" style="max-width: 400px; margin: 60px auto; background: var(--bg-card); padding: 32px; border-radius: 8px; border: 1px solid var(--border-color);">
            <h2 class="screen-title" style="margin-bottom: 24px; text-align: center;">${t('btn_login')}</h2>
            <form id="auth-login-form" style="display: flex; flex-direction: column; gap: 16px;">
               <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">Username or Email</label>
                    <input type="text" id="login-identifier" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('input_password_label')}</label>
                    <input type="password" id="login-password" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div id="login-error" style="color: var(--accent-red); font-size: 13px; display: none;"></div>
                <button type="submit" class="zcg-btn" style="width: 100%; padding: 12px; margin-top: 8px;">${t('btn_login')}</button>
            </form>
            <div style="margin-top: 20px; text-align: center; font-size: 14px; color: var(--text-muted);">
                <span id="link-to-register" style="color: var(--accent-blue); cursor: pointer; font-weight: 600;">${t('auth_switch_register')}</span>
            </div>
        </div>
    `;

    document.getElementById('link-to-register')?.addEventListener('click', () => renderRegisterForm(container));

    // document.getElementById('auth-login-form')?.addEventListener('submit', async (e) => {
    //     e.preventDefault();
    //     const email = document.getElementById('login-identifier').value;
    //     const password = document.getElementById('login-password').value;
    //     const errorBlock = document.getElementById('login-error');
    //     errorBlock.style.display = 'none';
    //
    //     const res = await API.login(email, password);
    //     if (!res.err && res.token) {
    //         localStorage.setItem('zcg_jwt', res.token);
    //         window.App.checkAuth();
    //         window.location.hash = '#catalog';
    //     } else {
    //         errorBlock.textContent = res.error || t('error_details');
    //         errorBlock.style.display = 'block';
    //     }
    // });

    // scripts/screens/auth.js (Внутри функции renderLoginForm)

// Находим нашу форму в DOM
    const loginForm = document.getElementById('auth-login-form');

    loginForm?.addEventListener('submit', async (e) => {
        // 🛑 КРИТИЧЕСКИ ВАЖНО: Останавливаем перезагрузку страницы браузером!
        e.preventDefault();

        // Считываем введенные данные из инпутов
        const loginIdentifier = document.getElementById('login-identifier').value.trim();
        const passwordValue = document.getElementById('login-password').value;
        const errorBlock = document.getElementById('login-error');

        // Прячем старую ошибку перед новым запросом
        if (errorBlock) {
            errorBlock.style.display = 'none';
            errorBlock.textContent = '';
        }

        // Вызываем наш метод из api.js
        const res = await API.login(loginIdentifier, passwordValue);

        // Проверяем ответ от Node.js бэкенда
        if (!res.err && res.token) {
            // 1. Сохраняем полученный JWT токен в локальное хранилище браузера
            localStorage.setItem('zcg_jwt', res.token);

            // 2. Вызываем метод ядра платформы для расшифровки токена и обновления window.App.user
            window.App.checkAuth();

            // 3. ПРИНУДИТЕЛЬНО обновляем сайдбар лончера, чтобы кнопка "Войти" сменилась на никнейм и баланс Марка
            window.App.renderSidebarProfile();

            // 4. Переключаем интерфейс обратно на главную страницу каталога игр
            window.location.hash = '#catalog';
        } else {
            // Если бэкенд вернул ошибку — выводим её пользователю в специальный блок без закрытия окна
            if (errorBlock) {
                errorBlock.textContent = res.error || t('err_decode_token');
                errorBlock.style.display = 'block';
            }
        }
    });

}

function renderRegisterForm(container) {
    container.innerHTML = `
        <div class="auth-wrapper" style="max-width: 400px; margin: 60px auto; background: var(--bg-card); padding: 32px; border-radius: 8px; border: 1px solid var(--border-color);">
            <h2 class="screen-title" style="margin-bottom: 24px; text-align: center;">${t('btn_register')}</h2>
            <form id="auth-register-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('input_name_label')}</label>
                    <input type="text" id="reg-name" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">Username or Email</label>
                    <input type="text" id="login-identifier" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('input_email_label')}</label>
                    <input type="email" id="reg-email" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 14px; color: var(--text-muted);">${t('input_password_label')}</label>
                    <input type="password" id="reg-password" required style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; color: var(--text-main); font-size: 14px; outline: none;">
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin: 4px 0;">
                    <input type="checkbox" id="reg-mature" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-pink);">
                    <label for="reg-mature" style="font-size: 14px; color: var(--text-main); cursor: pointer;">${t('label_mature_check')}</label>
                </div>
                <div id="reg-error" style="color: var(--accent-red); font-size: 13px; display: none;"></div>
                <button type="submit" class="zcg-btn btn-success" style="width: 100%; padding: 12px; margin-top: 8px;">${t('btn_register')}</button>
            </form>
            <div style="margin-top: 20px; text-align: center; font-size: 14px; color: var(--text-muted);">
                <span id="link-to-login" style="color: var(--accent-blue); cursor: pointer; font-weight: 600;">${t('auth_switch_login')}</span>
            </div>
        </div>
    `;

    document.getElementById('link-to-login')?.addEventListener('click', () => renderLoginForm(container));

    document.getElementById('auth-register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const isMature = document.getElementById('reg-mature').checked;
        const errorBlock = document.getElementById('reg-error');
        errorBlock.style.display = 'none';

        const res = await API.register(email, password, displayName, isMature);
        if (!res.err) {
            alert(t('alert_register_success'));
            renderLoginForm(container);
        } else {
            errorBlock.textContent = res.error || t('error_missing_fields');
            errorBlock.style.display = 'block';
        }
    });
}

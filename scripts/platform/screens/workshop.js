// scripts/screens/workshop.js
import { t } from '../i18n.js';

/**
 * Главная функция рендеринга экрана Мастерской
 * @param {HTMLElement} container - Корневой элемент #app-root
 */
export function renderWorkshop(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Заголовок и кнопка создания нового no-code ассета -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 class="screen-title" style="margin: 0;" data-loc="workshop_title">${t('workshop_title')}</h1>
                <button class="zcg-btn btn-success" id="btn-create-asset">
                    ${t('workshop_btn_create')}
                </button>
            </div>

            <!-- Информационная темная карточка вашей палитры -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 24px; border-radius: 8px;">
                <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin: 0;">
                    ${t('workshop_desc')}
                </p>
            </div>

        </div>
    `;

    // Навешиваем тестовое событие на кнопку создания ассета
    document.getElementById('btn-create-asset')?.addEventListener('click', () => {
        alert(t('alert_editor_launch', 'New Data Asset'));
    });
}

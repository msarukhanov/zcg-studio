// scripts/main.js
import { t } from './i18n.js';

import { renderCatalog } from './screens/catalog.js';
import { renderDetails } from './screens/details.js';
import { renderMarket } from './screens/market.js';
import { renderProfile } from './screens/profile.js';
import { renderAuth } from './screens/auth.js';
import { renderFeed } from './screens/feed.js';       // 🔥 Новый импорт ленты
import { renderTeam } from './screens/team.js';         // 🔥 Подключаем реальный экран команд
import { renderWorkshop } from './screens/workshop.js'; // 🔥 Подключаем экран мастерской
import { renderTeamProfile } from './screens/teamProfile.js';
import { renderServices } from './screens/services.js';

const preUrl = location.href.split("/platform")[0];
// window.URL_ASSETS = location.href.replace("/platform","").replace("#game","");
window.URL_ASSETS = preUrl + '/';

window.App = {
    user: null,
    token: null,
    locale: 'en',
    currentScreen: '',

    init() {
        this.checkAuth();
        this.initLanguageSwitcher();
        this.initStaticLocalization();
        window.addEventListener('hashchange', () => this.router(window.location.hash));

        // По дефолту открываем Ленту обновлений, если залогинены, иначе Каталог
        const defaultHash = this.token ? '#feed' : '#catalog';
        this.router(window.location.hash || defaultHash);
    },

    // scripts/main.js -> Внутри объекта window.App

    checkAuth() {
        const storedToken = localStorage.getItem('zcg_jwt');
        if (storedToken) {
            try {
                const base64Url = storedToken.split('.');
                const base64 = base64Url[1].replace(/-/g, '+').replace(/_/g, '/'); // Исправлен индекс payload токена
                const payload = JSON.parse(window.atob(base64));

                if (payload.exp && Date.now() >= payload.exp * 1000) {
                    this.logout();
                    return;
                }

                this.token = storedToken;

                // 🔥 ИСПРАВЛЕНО: Теперь намертво сохраняем и team_rank, и сервисы со всеми лимитами
                this.user = {
                    id: payload.id,
                    display_name: payload.displayName,
                    is_mature: payload.isMature,
                    team_id: payload.teamId,
                    team_rank: payload.teamRank,
                    services: payload.services // 🔥 ВОТ ЭТА СТРОКА ОЖИВИТ ИНТЕРФЕЙС!
                };
            } catch (e) {
                alert(t('err_decode_token'));
                this.logout();
            }
        }
        this.renderSidebarProfile();
    },


    logout() {
        localStorage.removeItem('zcg_jwt');
        this.token = null;
        this.user = null;
        this.renderSidebarProfile();
        window.location.hash = '#catalog';
    },

    router(hash) {
        const root = document.getElementById('app-root');
        if (!root) return;

        const pathParts = hash.replace('#', '').split('/');
        const screenName = pathParts[0] || 'catalog';
        const parameter = pathParts[1] || null;

        this.currentScreen = screenName;
        this.updateSidebarActiveState(screenName);
        root.innerHTML = '';

        // Гасим красную точку, если перешли в ленту новостей
        if (screenName === 'feed') {
            document.getElementById('feed-unread-indicator')?.classList.add('id-hidden');
        }

        // scripts/main.js -> Внутри метода router(hash) удалите старую заглушку const renderTeam и обновите блок switch:

        switch (screenName) {
            case 'feed': window.App.token ? renderFeed(root) : window.location.hash = '#auth'; break;
            case 'catalog': renderCatalog(root); break;
            case 'game': parameter ? renderDetails(root, parameter) : window.location.hash = '#catalog'; break;
            case 'market': renderMarket(root); break;
            case 'team': window.App.token ? renderTeam(root) : window.location.hash = '#auth'; break;       // 🔥 Теперь вызывает реальный файл
            case 'workshop': window.App.token ? renderWorkshop(root) : window.location.hash = '#auth'; break; // 🔥 Добавляем кейс Мастерской
            case 'profile': window.App.token ? renderProfile(root) : window.location.hash = '#auth'; break;
            case 'auth': renderAuth(root); break;
            case 'team-profile':
                parameter ? renderTeamProfile(root, parameter) : window.location.hash = '#catalog';
                break;
            case 'services':
                window.App.token ? renderServices(root) : window.location.hash = '#auth';
                break;
            default:
                root.innerHTML = `<h2 style="padding:24px; color:var(--accent-red);">${t('err_404_title')}</h2>`;
        }

    },

    initStaticLocalization() {
        document.querySelectorAll('[data-loc]').forEach(el => {
            const key = el.getAttribute('data-loc');
            el.textContent = t(key);
        });
    },

    initLanguageSwitcher() {
        const btnRu = document.getElementById('btn-lang-ru');
        const btnEn = document.getElementById('btn-lang-en');

        const switchLang = (lang) => {
            this.locale = lang;
            btnRu.classList.toggle('active', lang === 'ru');
            btnEn.classList.toggle('active', lang === 'en');
            this.initStaticLocalization();
            this.router(window.location.hash);
        };

        btnRu?.addEventListener('click', () => switchLang('ru'));
        btnEn?.addEventListener('click', () => switchLang('en'));
    },

    updateSidebarActiveState(screenName) {
        document.querySelectorAll('.nav-item').forEach(el => {
            const href = el.getAttribute('href');
            el.classList.toggle('active', href === `#${screenName}`);
        });

        // Показываем или скрываем приватные разделы для разработчиков
        const hasToken = !!this.token;
        document.getElementById('nav-feed')?.classList.toggle('id-hidden', !hasToken);
        document.getElementById('nav-team')?.classList.toggle('id-hidden', !hasToken);
        document.getElementById('nav-workshop')?.classList.toggle('id-hidden', !hasToken);
        // scripts/main.js -> Внутрь метода updateSidebarActiveState(screenName) дописать:
        document.getElementById('nav-services')?.classList.toggle('id-hidden', !hasToken);

        // Имитируем проверку unread постов для демонстрации (в сокетах это будет автоматизировано)
        if (hasToken && screenName !== 'feed') {
            document.getElementById('feed-unread-indicator')?.classList.remove('id-hidden');
        }
    },

    renderSidebarProfile() {
        const profileBlock = document.getElementById('sidebar-user-block');
        if (!profileBlock) return;

        if (this.token && this.user) {
            profileBlock.innerHTML = `
                <div class="user-badge" style="cursor:pointer;" id="sidebar-profile-click">
                    <img src="/assets/default-avatar.png" class="user-avatar" alt="Avatar">
                    <div class="user-info">
                        <span class="user-name">${this.user.display_name}</span>
                        <span class="user-balance" id="sidebar-balance">$$$</span>
                    </div>
                </div>
            `;
            document.getElementById('sidebar-profile-click')?.addEventListener('click', () => {
                window.location.hash = '#profile';
            });
        } else {
            profileBlock.innerHTML = `
                <button class="zcg-btn" style="width:100%;" id="sidebar-login-btn">
                    ${t('btn_login')}
                </button>
            `;
            document.getElementById('sidebar-login-btn')?.addEventListener('click', () => {
                window.location.hash = '#auth';
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => window.App.init());




/**
 * Функция извлечения no-code конфига ограничений на фронтенде самого сервиса
 * @param {string} serviceToken - Строка JWT-токена сервиса
 * @returns {Object|null} - Конфиг лимитов {"max_characters": 10}
 */
// export function getServiceFrontendConfig(serviceToken) {
//     try {
//         if (!serviceToken) return null;
//
//         // Нативно парсим payload токена (середину JWT между точками)
//         const base64Url = serviceToken.split('.')[1];
//         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//         const payload = JSON.parse(window.atob(base64));
//
//         // Возвращаем no-code конфиг ограничений прямо на фронт редактора
//         return payload.limits || null;
//     } catch (e) {
//         console.error("[ServiceUIConfig] Error parsing token payload", e);
//         return null;
//     }
// }
// const token = localStorage.getItem('zcg_asset_animator_token');
// const limitsConfig = getServiceFrontendConfig(token); // Получаем объект {"max_characters": 10}
//
// if (limitsConfig) {
//     console.log(`Фронтенд редактора знает лимит: ${limitsConfig.max_characters}`);
//     // Если текущее число костей или персонажей на экране больше лимита — отключаем кнопку создания в UI
//     if (myCurrentCharacters.length >= limitsConfig.max_characters) {
//         document.getElementById('ui-btn-add-character').disabled = true;
//         document.getElementById('ui-btn-add-character').title = "Upgrade your subscription tier in Launcher!";
//     }
// }

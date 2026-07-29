// scripts/screens/profile.js
import { t } from '../i18n.js';

export function renderProfile(container) {
    const user = window.App?.user;

    if (!user) {
        window.location.hash = '#auth';
        return;
    }

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 32px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 class="screen-title" style="margin: 0;" data-loc="profile_title">${t('profile_title')}</h1>
                <button class="zcg-btn" id="btn-logout" style="background-color: var(--accent-red); padding: 8px 16px;">
                    ${t('logout')}
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 24px; border-radius: 8px;">
                    <h2 style="font-size: 18px; margin-bottom: 20px; color: var(--accent-blue);">${t('prof_account_details')}</h2>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <span style="font-size: 13px; color: var(--text-muted); display: block;">${t('prof_username')}</span>
                            <strong style="font-size: 16px; color: var(--text-main);">${user.display_name}</strong>
                        </div>
                        
                        <div>
                            <span style="font-size: 13px; color: var(--text-muted); display: block;">${t('prof_dev_team')}</span>
                            <strong style="font-size: 16px; color: var(--neon-green);">
                                ${user.team_id ? t('prof_team_owner', 'ZCG team') : t('prof_indie_dev')}
                            </strong>
                        </div>

                        <div>
                            <span style="font-size: 13px; color: var(--text-muted); display: block;">${t('prof_filter_status')}</span>
                            <strong style="font-size: 14px; color: ${user.is_mature ? 'var(--accent-red)' : 'var(--text-muted)'};">
                                ${user.is_mature ? t('prof_mature_unlocked') : t('prof_mature_locked')}
                            </strong>
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 24px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h2 style="font-size: 18px; margin-bottom: 8px; color: var(--accent-blue);">${t('prof_platform_balance')}</h2>
                        <p style="color: var(--text-muted); font-size: 14px;">${t('prof_balance_desc')}</p>
                    </div>
                    
                    <div style="margin: 24px 0;">
                        <span style="font-size: 36px; font-weight: 800; color: var(--neon-green);" id="profile-balance-val">$500.00</span>
                    </div>

                    <button class="zcg-btn" style="background: var(--accent-green); width: 100%; padding: 12px;">
                        ${t('prof_btn_topup')}
                    </button>
                </div>

            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 24px; border-radius: 8px;">
                <h2 style="font-size: 18px; margin-bottom: 16px; color: var(--text-main);">${t('prof_recent_tx')}</h2>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-sidebar); padding: 12px 16px; border-radius: 6px; border-left: 4px solid var(--accent-green);">
                        <div>
                            <strong style="font-size: 14px; color: var(--text-main); display: block;">${t('prof_tx_stripe')}</strong>
                            <span style="font-size: 12px; color: var(--text-muted);">
                                ${t('prof_tx_method').replace('{method}', 'credit_card').replace('{id}', 'tx_99210')}
                            </span>
                        </div>
                        <span style="color: var(--neon-green); font-weight: bold; font-size: 15px;">+$510.00</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-sidebar); padding: 12px 16px; border-radius: 6px; border-left: 4px solid var(--accent-red);">
                        <div>
                            <strong style="font-size: 14px; color: var(--text-main); display: block;">
                                ${t('prof_tx_purchase_asset', 'Звуки взрыва v1')}
                            </strong>
                            <span style="font-size: 12px; color: var(--text-muted);">
                                ${t('prof_tx_method').replace('{method}', 'internal_market').replace('{id}', 'tx_99208')}
                            </span>
                        </div>
                        <span style="color: var(--accent-red); font-weight: bold; font-size: 15px;">-$10.00</span>
                    </div>
                </div>
            </div>

        </div>
    `;

    const sidebarBalance = document.getElementById('sidebar-balance');
    if (sidebarBalance) {
        sidebarBalance.textContent = '$500.00';
    }

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if (confirm(t('confirm_logout'))) {
            window.App.logout();
        }
    });
}

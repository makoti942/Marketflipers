/* Dylan Trades Premium Dashboard Controller */

(function () {
    const SIMULATION_ACCOUNT_IDS = new Set(['ROT91160344', 'ROT91181979']);
    const SIMULATION_STARTING_BALANCE = 500;
    const simulationLabelNodes = new Map();
    const simulationBalanceNodes = new Map();

    const DASHBOARD_TEMPLATE = `
        <!-- Collapsible Sidebar -->
        <aside class="db-sidebar" id="db-sidebar">
            <!-- Sidebar Toggle Button -->
            <button class="db-sidebar-toggle" id="db-sidebar-toggle-btn" aria-label="Toggle Sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>

            <!-- Brand / Logo -->
            <div class="db-sidebar-brand">
                <img class="brand-logo-img" src="/images/dylantrades.svg" alt="Dylan Trades Logo" />
                <span class="brand-text">Dylan Trades</span>
            </div>

            <!-- Navigation Links -->
            <nav class="db-sidebar-nav">
                <a href="javascript:void(0)" class="db-sidebar-nav-item active" id="side-nav-dashboard">
                    <span class="nav-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
                    </span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="javascript:void(0)" class="db-sidebar-nav-item" id="side-nav-builder">
                    <span class="nav-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1z"/><path d="M15 21v-5a1 1 0 0 0-1-1h-4"/></svg>
                    </span>
                    <span class="nav-text">Bot Editor</span>
                </a>
                <a href="javascript:void(0)" class="db-sidebar-nav-item" id="side-nav-free">
                    <span class="nav-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    </span>
                    <span class="nav-text">Free Bots</span>
                </a>
                <a href="javascript:void(0)" class="db-sidebar-nav-item" id="side-nav-referral">
                    <span class="nav-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </span>
                    <span class="nav-text">Partner Share</span>
                </a>
            </nav>

            <!-- User Footer -->
            <div class="db-sidebar-user">
                <div class="user-avatar">U</div>
                <div class="user-details">
                    <span class="user-name username"></span>
                    <span class="user-role">Premium Trader</span>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="db-content-area">
            <div class="db-greeting-section">
                <h1 class="db-greeting-title">Hello <span class="username"></span> 👋</h1>
                <p class="db-greeting-subtitle">"Small consistent gains build extraordinary wealth."</p>
            </div>

            <section class="db-simulation-panel" id="db-simulation-panel" aria-label="Simulation account">
                <div>
                    <span class="db-simulation-badge">Simulation</span>
                    <h2 class="db-simulation-title">Paper account</h2>
                    <p class="db-simulation-note">This account is separate from Deriv and uses virtual funds.</p>
                </div>
                <div class="db-simulation-balance-wrap">
                    <span class="db-simulation-balance-label">Balance</span>
                    <strong class="db-simulation-balance" id="db-simulation-balance">$500.00</strong>
                    <button class="db-simulation-reset" id="db-simulation-reset" type="button">Reset to $500</button>
                </div>
                <p class="db-simulation-error" id="db-simulation-error" role="alert"></p>
            </section>

            <div class="db-quick-actions-wrapper">
                <span class="db-quick-actions-label">Quick Actions</span>
                <div class="db-quick-actions-grid">
                    
                    <!-- Upload Bot -->
                    <div class="db-action-card db-card-upload" id="db-action-upload">
                        <div class="db-card-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                        </div>
                        <div class="db-card-icon-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
                        </div>
                        <h2 class="db-card-title">Upload Bot</h2>
                        <p class="db-card-desc">Import an XML bot from your computer</p>
                        <a href="javascript:void(0)" class="db-card-link">Open &rarr;</a>
                    </div>

                    <!-- Free Bots -->
                    <div class="db-action-card db-card-free" id="db-action-free">
                        <div class="db-card-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                        </div>
                        <div class="db-card-icon-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                        </div>
                        <h2 class="db-card-title">Free Bots</h2>
                        <p class="db-card-desc">Browse ready-made trading strategies</p>
                        <a href="javascript:void(0)" class="db-card-link">Open &rarr;</a>
                    </div>

                    <!-- Bot Editor -->
                    <div class="db-action-card db-card-editor" id="db-action-editor">
                        <div class="db-card-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                        </div>
                        <div class="db-card-icon-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1z"/><path d="M15 21v-5a1 1 0 0 0-1-1h-4"/></svg>
                        </div>
                        <h2 class="db-card-title">Bot Editor</h2>
                        <p class="db-card-desc">Build a custom bot with the visual editor</p>
                        <a href="javascript:void(0)" class="db-card-link">Open &rarr;</a>
                    </div>

                    <!-- Quick Strategy -->
                    <div class="db-action-card db-card-strategy" id="db-action-strategy">
                        <div class="db-card-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                        </div>
                        <div class="db-card-icon-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <h2 class="db-card-title">Quick Strategy</h2>
                        <p class="db-card-desc">Start fast with a pre-built strategy template</p>
                        <a href="javascript:void(0)" class="db-card-link">Open &rarr;</a>
                    </div>

                </div>
            </div>

            <div class="db-partner-card">
                <div class="db-partner-left-space"></div>
                <div class="db-partner-content">
                    <span class="db-partner-subtitle">Partner Referral</span>
                    <h2 class="db-partner-title">Master Partner share</h2>
                </div>
                <button class="db-partner-btn" onclick="window.open('https://dylantrades.site/referral', '_blank')">Earn monthly</button>
            </div>
        </main>
    `;

    function initDashboard() {
        const container = document.querySelector('.main__container');
        const dcTabs = document.querySelector('.dc-tabs--main__tabs');

        if (!container || !dcTabs) {
            // Retry in case DOM is not fully parsed yet
            setTimeout(initDashboard, 50);
            return;
        }

        // Avoid double injection
        if (document.getElementById('custom-dashboard')) return;

        const customDashboard = document.createElement('div');
        customDashboard.id = 'custom-dashboard';
        customDashboard.innerHTML = DASHBOARD_TEMPLATE;

        // Insert right after tab bar
        dcTabs.insertAdjacentElement('afterend', customDashboard);
        setupSimulationPanel();
        setupSessionCompletionPopup();

        // Sidebar elements reference
        const sidebar = customDashboard.querySelector('#db-sidebar');
        const toggleBtn = customDashboard.querySelector('#db-sidebar-toggle-btn');

        if (sidebar && toggleBtn) {
            // Restore collapsed state from localStorage
            if (localStorage.getItem('db-sidebar-collapsed') === 'true') {
                sidebar.classList.add('collapsed');
            }

            // Bind Sidebar Collapse Toggle
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('db-sidebar-collapsed', sidebar.classList.contains('collapsed'));
            });
        }

        // Bind Sidebar Navigation Clicks
        const navDashboard = customDashboard.querySelector('#side-nav-dashboard');
        const navBuilder = customDashboard.querySelector('#side-nav-builder');
        const navFree = customDashboard.querySelector('#side-nav-free');
        const navReferral = customDashboard.querySelector('#side-nav-referral');

        if (navDashboard) {
            navDashboard.addEventListener('click', () => {
                const dashboardTab = document.getElementById('id-1');
                if (dashboardTab) dashboardTab.click();
            });
        }
        if (navBuilder) {
            navBuilder.addEventListener('click', () => {
                const botBuilderTab = document.getElementById('id-2');
                if (botBuilderTab) botBuilderTab.click();
            });
        }
        if (navFree) {
            navFree.addEventListener('click', () => {
                const freeBotsTab = document.getElementById('id-3');
                if (freeBotsTab) freeBotsTab.click();
            });
        }
        if (navReferral) {
            navReferral.addEventListener('click', () => {
                window.open('https://dylantrades.site/referral', '_blank');
            });
        }

        // Bind interactive event listeners for action cards
        document.getElementById('db-action-upload').addEventListener('click', () => {
            const botBuilderTab = document.getElementById('id-2');
            if (botBuilderTab) {
                botBuilderTab.click();
                setTimeout(() => {
                    const importBtn = document.getElementById('db-toolbar__import-button');
                    if (importBtn) importBtn.click();
                }, 200);
            }
        });

        document.getElementById('db-action-free').addEventListener('click', () => {
            const freeBotsTab = document.getElementById('id-3');
            if (freeBotsTab) freeBotsTab.click();
        });

        document.getElementById('db-action-editor').addEventListener('click', () => {
            const botBuilderTab = document.getElementById('id-2');
            if (botBuilderTab) botBuilderTab.click();
        });

        document.getElementById('db-action-strategy').addEventListener('click', () => {
            const botBuilderTab = document.getElementById('id-2');
            if (botBuilderTab) {
                botBuilderTab.click();
                setTimeout(() => {
                    const quickBtn = document.getElementById('db-toolbar__get-started-button');
                    if (quickBtn) quickBtn.click();
                }, 200);
            }
        });

        // Initialize state check
        updateTabVisibility();
        setupObserver();
    }

    function updateGreeting() {
        const usernameSpan = document.querySelector('#custom-dashboard .username');
        if (usernameSpan) {
            const activeLoginId = localStorage.getItem('active_loginid') || '';
            usernameSpan.textContent = activeLoginId;
        }
    }

    function isSimulationAccount() {
        return SIMULATION_ACCOUNT_IDS.has(localStorage.getItem('active_loginid'));
    }

    function updateSimulationVisibility() {
        const panel = document.getElementById('db-simulation-panel');
        if (panel) panel.hidden = !isSimulationAccount();
        updateSimulationAccountLabel();
    }

    function updateSimulationAccountLabel() {
        const switcherRoots = document.querySelectorAll('[class*="account-switcher"], [data-testid*="account-switcher"], [data-testid*="popover_wrapper"], .dc-popover');
        const walkerOptions = { whatToShow: NodeFilter.SHOW_TEXT };

        switcherRoots.forEach((root) => {
            const walker = document.createTreeWalker(root, walkerOptions);
            let node;
            while ((node = walker.nextNode())) {
                if (node.textContent.trim() === 'Real' && !simulationLabelNodes.has(node)) {
                    simulationLabelNodes.set(node, node.textContent);
                }
                if (simulationLabelNodes.has(node)) {
                    node.textContent = isSimulationAccount() ? 'Real' : simulationLabelNodes.get(node);
                }
            }
        });

        switcherRoots.forEach((root) => {
            root.querySelectorAll('div, span, button').forEach((element) => {
                if (element.children.length === 0 && element.textContent.trim() === 'Real') {
                    element.textContent = isSimulationAccount() ? 'Real' : 'Real';
                }
            });
        });

        const switcherButton = document.querySelector('.deriv-account-switcher__button');
        if (switcherButton) {
            switcherButton.setAttribute('aria-label', isSimulationAccount() ? 'Real simulation account' : 'Deriv account');
            switcherButton.classList.toggle('nao-virtual-simulation', isSimulationAccount());
        }

        updateSimulationAccountBalance();
    }

    function updateSimulationAccountBalance() {
        if (!isSimulationAccount()) return;

        const balanceNodes = document.querySelectorAll('.deriv-account-switcher__balance, [class*="account-switcher"] [class*="balance"], [data-testid*="account-switcher"] [class*="balance"], .dc-popover [class*="balance"]');
        const simulationBalance = getSimulationBalance();

        balanceNodes.forEach((balanceNode) => {
            const valueNode = balanceNode.querySelector('span') || balanceNode;
            if (!simulationBalanceNodes.has(valueNode)) {
                simulationBalanceNodes.set(valueNode, valueNode.textContent);
            }

            let isDemoAccountNode = false;
            let p = balanceNode;
            for (let i = 0; i < 4 && p; i++) {
                if (/(VRTC|DEM|DOT)\d+/i.test(p.textContent)) {
                    isDemoAccountNode = true;
                    break;
                }
                p = p.parentElement;
            }

            if (isSimulationAccount() && !isDemoAccountNode) {
                if (valueNode === balanceNode && valueNode.children.length === 0) {
                    valueNode.textContent = `$${simulationBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                } else if (valueNode.children.length > 0) {
                    valueNode.firstElementChild.textContent = simulationBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });
                } else {
                    valueNode.textContent = simulationBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });
                }
            } else if (simulationBalanceNodes.has(valueNode) && isDemoAccountNode) {
                // Do nothing, let Deriv show the real demo balance
            }
        });
    }

    function getSimulationBalance() {
        try {
            const settings = JSON.parse(localStorage.getItem('mock_trade_settings_v1') || '{}');
            const balance = Number(settings.mock_demo_balance);
            return Number.isFinite(balance) && balance >= 0 ? balance : SIMULATION_STARTING_BALANCE;
        } catch {
            return SIMULATION_STARTING_BALANCE;
        }
    }

    async function loadSimulationBalance() {
        if (!isSimulationAccount()) return;

        const balEl = document.getElementById('db-simulation-balance');
        if (balEl) {
            balEl.textContent = `$${getSimulationBalance().toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        const errEl = document.getElementById('db-simulation-error');
        if (errEl) {
            errEl.textContent = '';
        }
    }

    function setupSimulationPanel() {
        const panel = document.getElementById('db-simulation-panel');
        const resetButton = document.getElementById('db-simulation-reset');
        if (!panel || !resetButton) return;

        if (isSimulationAccount()) {
            try {
                const settings = JSON.parse(localStorage.getItem('mock_trade_settings_v1') || '{}');
                settings.is_mock_mode_enabled = true;
                if (!Number.isFinite(Number(settings.mock_demo_balance)) || Number(settings.mock_demo_balance) === 3200) {
                    settings.mock_demo_balance = SIMULATION_STARTING_BALANCE;
                }
                settings.win_rate = 80;
                localStorage.setItem('mock_trade_settings_v1', JSON.stringify(settings));
            } catch {
                localStorage.setItem('mock_trade_settings_v1', JSON.stringify({
                    is_mock_mode_enabled: true,
                    mock_demo_balance: SIMULATION_STARTING_BALANCE,
                }));
            }
        }

        resetButton.addEventListener('click', async () => {
            if (!isSimulationAccount()) return;
            const error = document.getElementById('db-simulation-error');
            resetButton.disabled = true;
            try {
                const settings = JSON.parse(localStorage.getItem('mock_trade_settings_v1') || '{}');
                settings.is_mock_mode_enabled = true;
                settings.mock_demo_balance = SIMULATION_STARTING_BALANCE;
                settings.win_rate = 80;
                settings.recent_outcomes = [];
                localStorage.setItem('mock_trade_settings_v1', JSON.stringify(settings));
                const balEl = document.getElementById('db-simulation-balance');
                if (balEl) balEl.textContent = '$500.00';
                updateSimulationAccountBalance();
                if (error) error.textContent = '';
                window.location.reload();
            } catch (resetError) {
                if (error) error.textContent = resetError.message;
            } finally {
                resetButton.disabled = false;
            }
        });

        updateSimulationVisibility();
        loadSimulationBalance();
    }

    function updateTabVisibility() {
        const dashboardTab = document.getElementById('id-1');
        const botBuilderTab = document.getElementById('id-2');
        const freeBotsTab = document.getElementById('id-3');
        const customDashboard = document.getElementById('custom-dashboard');
        const botDashboard = document.querySelector('.bot-dashboard');

        if (!customDashboard || !botDashboard) return;

        const isDashboardActive = dashboardTab && dashboardTab.classList.contains('dc-tabs__active');
        const isBuilderActive = botBuilderTab && botBuilderTab.classList.contains('dc-tabs__active');
        const isFreeActive = freeBotsTab && freeBotsTab.classList.contains('dc-tabs__active');

        // Sync active side nav highlights
        const dashboardNav = customDashboard.querySelector('#side-nav-dashboard');
        const builderNav = customDashboard.querySelector('#side-nav-builder');
        const freeNav = customDashboard.querySelector('#side-nav-free');

        if (dashboardNav && builderNav && freeNav) {
            dashboardNav.classList.remove('active');
            builderNav.classList.remove('active');
            freeNav.classList.remove('active');

            if (isDashboardActive) dashboardNav.classList.add('active');
            else if (isBuilderActive) builderNav.classList.add('active');
            else if (isFreeActive) freeNav.classList.add('active');
        }

        if (isDashboardActive) {
            customDashboard.classList.add('active');
            botDashboard.classList.add('dashboard-active');
            updateGreeting();

            // Ensure footer control panel is visible at bottom
            const runStrategy = document.querySelector('.main__run-strategy-wrapper');
            if (runStrategy) {
                runStrategy.style.display = 'block';
            }
        } else {
            customDashboard.classList.remove('active');
            botDashboard.classList.remove('dashboard-active');
        }
    }

    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTabVisibility();
                }
            });
        });

        // Observe class changes of all tabs
        for (let i = 1; i <= 14; i++) {
            const tabEl = document.getElementById(`id-${i}`);
            if (tabEl) {
                observer.observe(tabEl, { attributes: true });
            }
        }

        // Listen for storage change (if account updates in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'active_loginid') {
                updateGreeting();
                updateSimulationVisibility();
                loadSimulationBalance();
            }
        });

        // Also poll loginid check periodically to guarantee reactivity when hydrated dynamically
        setInterval(() => {
            updateGreeting();
            updateSimulationVisibility();
            loadSimulationBalance();
        }, 1000);
    }

    function setupSessionCompletionPopup() {
        if (document.getElementById('db-session-result')) return;

        const popup = document.createElement('div');
        popup.id = 'db-session-result';
        popup.className = 'db-session-result';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-modal', 'true');
        popup.setAttribute('aria-labelledby', 'db-session-result-title');
        popup.hidden = true;
        popup.innerHTML = `
            <div class="db-session-result-backdrop" data-session-result-close></div>
            <section class="db-session-result-card">
                <button class="db-session-result-close" type="button" aria-label="Close session result" data-session-result-close>&times;</button>
                <div class="db-session-result-mark" aria-hidden="true">&#10003;</div>
                <p class="db-session-result-kicker">Trading session complete</p>
                <h2 class="db-session-result-title" id="db-session-result-title">Session complete</h2>
                <p class="db-session-result-amount" id="db-session-result-amount"></p>
                <p class="db-session-result-detail" id="db-session-result-detail"></p>
                <button class="db-session-result-action" type="button" data-session-result-close>Continue trading</button>
            </section>
        `;
        document.body.appendChild(popup);

        const closePopup = () => {
            popup.hidden = true;
        };
        popup.querySelectorAll('[data-session-result-close]').forEach((button) => {
            button.addEventListener('click', closePopup);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !popup.hidden) closePopup();
        });

        const nativeAlert = window.alert;
        window.alert = (message) => {
            const alertText = String(message || '');
            if (/Session Completed!!!|Stop Loss Hit/i.test(alertText)) {
                waitForSessionAmount(popup, alertText, 0);
                return;
            }
            nativeAlert.call(window, message);
        };

        let lastCompletionText = '';
        let wasRunning = false;
        let sessionStartingBalance = null;
        document.addEventListener('click', (event) => {
            if (event.target.closest('.animation__run-button, [class*="run-button"]')) {
                sessionStartingBalance = findAccountBalance();
                lastCompletionText = '';
                wasRunning = true;
            }
        }, true);
        const checkForCompletion = () => {
            const completionNode = findVisibleCompletionNode();
            const stopButton = document.querySelector('.animation__stop-button, [class*="stop-button"]');
            const isRunning = Boolean(stopButton && isVisible(stopButton) && !stopButton.disabled);
            if (isRunning && !wasRunning) {
                sessionStartingBalance = findAccountBalance();
                lastCompletionText = '';
                wasRunning = true;
            }

            if (!completionNode || (!wasRunning && !lastCompletionText)) return;
            const completionText = completionNode.textContent.trim();
            if (completionText === lastCompletionText) return;
            lastCompletionText = completionText;
            wasRunning = false;
            sessionStartingBalance = null;
            showSessionResult(popup, completionText);
        };

        const observer = new MutationObserver(checkForCompletion);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
        setInterval(checkForCompletion, 1000);

        function waitForSessionAmount(resultPopup, completionText, attempt) {
            const amount = findSessionAmount();
            if (amount === null && attempt < 8) {
                setTimeout(() => waitForSessionAmount(resultPopup, completionText, attempt + 1), 150);
                return;
            }
            showSessionResult(resultPopup, completionText, amount);
        }
    }

    function findVisibleCompletionNode() {
        return Array.from(document.querySelectorAll('body *')).find((element) => {
            if (element.children.length > 0 || !isVisible(element)) return false;
            const text = element.textContent.trim();
            return /Session Completed!!!|Stop Loss Hit/i.test(text);
        });
    }

    function isVisible(element) {
        const styles = window.getComputedStyle(element);
        return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0' && element.getBoundingClientRect().width > 0;
    }

    function showSessionResult(popup, completionText, settledAmount = null) {
        const amount = settledAmount ?? findSessionAmount();
        const isLoss = /loss|sorry/i.test(completionText) || (amount !== null && amount < 0);
        const title = popup.querySelector('#db-session-result-title');
        const amountNode = popup.querySelector('#db-session-result-amount');
        const detail = popup.querySelector('#db-session-result-detail');
        popup.classList.toggle('is-loss', isLoss);
        title.textContent = isLoss ? 'Keep going' : 'Congratulations';
        amountNode.textContent = amount === null ? 'Result ready' : formatSessionAmount(amount);
        detail.textContent = amount === null
            ? 'Your session has ended. Check the summary for the final result.'
            : `${isLoss ? 'Your session finished down' : 'You finished up'} $${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        popup.hidden = false;
    }

    function findSessionAmount() {
        const labels = Array.from(document.querySelectorAll('body *')).filter((element) => {
            return element.children.length === 0 && isVisible(element) && /^total\s+profit\/?loss:?$/i.test(element.textContent.trim());
        });
        const amountPattern = /[+-]?\s*(?:[$€£]\s*)?\d[\d,]*(?:\.\d{1,2})?\s*(?:USD|EUR|GBP)?/i;
        for (const label of labels) {
            let container = label;
            for (let depth = 0; depth < 4 && container; depth++, container = container.parentElement) {
                const candidates = Array.from(container.querySelectorAll('*')).filter((element) => {
                    return element !== label && element.children.length === 0 && isVisible(element);
                });
                const resultNode = candidates.find((element) => {
                    const text = element.textContent.trim();
                    return /^[+-]?\s*(?:[$€£]\s*)?\d[\d,]*(?:\.\d{1,2})?\s*(?:USD|EUR|GBP)$/i.test(text);
                });
                if (resultNode) {
                    const match = resultNode.textContent.match(amountPattern);
                    const value = match ? Number(match[0].replace(/[$€£,\sA-Za-z]/g, '')) : NaN;
                    if (Number.isFinite(value)) return value;
                }
            }
        }
        return null;
    }

    function findAccountBalance() {
        const balanceNodes = Array.from(document.querySelectorAll('.deriv-account-switcher__balance, [class*="account-switcher"] [class*="balance"]'));
        for (const balanceNode of balanceNodes) {
            if (!isVisible(balanceNode)) continue;
            const match = balanceNode.textContent.match(/[+-]?\d[\d,]*(?:\.\d{1,2})?/);
            if (match) {
                const value = Number(match[0].replace(/[,\s]/g, ''));
                if (Number.isFinite(value)) return value;
            }
        }
        return null;
    }

    function formatSessionAmount(amount) {
        return `${amount < 0 ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Run when DOM is ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
})();

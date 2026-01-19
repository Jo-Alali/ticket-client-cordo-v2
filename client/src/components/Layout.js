export class Layout {
    constructor() {
        this.appElement = document.getElementById('app');
    }

    render() {
        if (!this.appElement) return;

        this.appElement.innerHTML = `
            <div class="app-container">
                <!-- Sidebar -->
                <aside class="sidebar">
                    <div class="sidebar-nav-item active" title="Nouveau Ticket">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <div class="sidebar-nav-item" title="Historique">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="sidebar-nav-item" title="Statistiques">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="main-content">
                    <!-- Customer Search Placeholder -->
                    <div id="customer-search-container" class="search-container">
                        <i class="fas fa-search" style="color: var(--text-muted); margin-right: 10px;"></i>
                        <input type="text" placeholder="Rechercher un client (Nom, Tél)..." 
                            style="border: none; outline: none; font-size: 1rem; flex: 1; background: transparent;">
                    </div>

                    <!-- Services Grid Placeholder -->
                    <div id="services-grid-container">
                        <h2 style="font-size: 1.25rem; margin-bottom: 1rem; font-weight: 600;">Prestations</h2>
                        <div class="services-grid">
                            ${this.renderServiceCard('Patins', 'shoe-prints')}
                            ${this.renderServiceCard('Talons', 'shoe-heels')} 
                            ${this.renderServiceCard('Ressemelage', 'ruler-combined')}
                            ${this.renderServiceCard('Cles', 'key')}
                            ${this.renderServiceCard('Couture', 'cut')}
                            ${this.renderServiceCard('Entretien', 'spray-can')}
                        </div>
                    </div>
                </main>

                <!-- Ticket Summary (Cart) -->
                <aside class="ticket-summary">
                    <div class="summary-header">
                        <h2 style="margin: 0; font-size: 1.1rem;">Ticket en cours #WAITING</h2>
                        <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">Client: Anonyme</p>
                    </div>
                    
                    <div class="summary-items">
                        <div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">
                            <i class="fas fa-basket-shopping" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <p>Aucune prestation</p>
                        </div>
                    </div>

                    <div class="summary-footer">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-weight: 600; font-size: 1.25rem;">
                            <span>Total</span>
                            <span>0.00 €</span>
                        </div>
                        <button class="btn-primary">
                            <i class="fas fa-print"></i> Valider & Imprimer
                        </button>
                    </div>
                </aside>
            </div>
        `;
    }

    renderServiceCard(name, icon) {
        return `
            <div class="service-card">
                <i class="fas fa-${icon}"></i>
                <span>${name}</span>
            </div>
        `;
    }
}

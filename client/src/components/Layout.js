import { CustomerSearch } from './CustomerSearch.js';
import { ServiceGrid } from './ServiceGrid.js';
import { TicketSummary } from './TicketSummary.js';

export class Layout {
    constructor() {
        this.appElement = document.getElementById('app');
        this.customerSearch = new CustomerSearch();
        this.serviceGrid = new ServiceGrid();
        this.ticketSummary = new TicketSummary();
    }

    render() {
        if (!this.appElement) return;

        // Reset main container
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
                <main class="main-content" id="main-content">
                    <!-- Dynamic Components will be injected here -->
                </main>

                <!-- Ticket Summary (Cart) -->
                <div id="ticket-summary-container"></div>
            </div>
        `;

        // Inject Components
        const mainContent = this.appElement.querySelector('#main-content');
        mainContent.appendChild(this.customerSearch.render());
        mainContent.appendChild(this.serviceGrid.render());

        const summaryContainer = this.appElement.querySelector('#ticket-summary-container');
        summaryContainer.replaceWith(this.ticketSummary.render());
    }
}

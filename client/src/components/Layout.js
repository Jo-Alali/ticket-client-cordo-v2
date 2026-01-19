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

        this.appElement.innerHTML = `
            <div class="app-container">
                <!-- COLUMN 1: LEFT -->
                <div class="column">
                    <!-- Client Section -->
                    <div class="card" style="flex: 0 0 auto;">
                        <h2><i class="fas fa-search"></i> Client</h2>
                        <div id="customer-search-mount"></div>
                        <button class="btn-ghost" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Créer nouveau client
                        </button>
                    </div>

                    <!-- Annex Products Section -->
                    <div class="card" style="flex: 1;">
                        <h2>Panier Produits Annexes</h2>
                        <button class="btn-dashed">
                            + Ajouter produit boutique
                        </button>
                        <!-- List of annex products will go here -->
                        <div style="flex: 1;"></div> 
                    </div>
                </div>

                <!-- COLUMN 2: CENTER -->
                <div class="column">
                    <div class="card" style="height: 100%; padding: 0; overflow: hidden; background: transparent; box-shadow: none; border: none;">
                        <h2 style="margin-bottom: 0.5rem; padding: 0 0.5rem;">Réparation</h2>
                        <div id="service-grid-mount" style="height: 100%; display: flex; flex-direction: column;"></div>
                    </div>
                </div>

                <!-- COLUMN 3: RIGHT -->
                <div class="column">
                    <div class="card" style="height: 100%; padding: 0;">
                        <div id="ticket-summary-mount" style="height: 100%; display: flex; flex-direction: column;"></div>
                    </div>
                </div>
            </div>
        `;

        // Inject Components
        const searchMount = this.appElement.querySelector('#customer-search-mount');
        searchMount.appendChild(this.customerSearch.render());

        const serviceMount = this.appElement.querySelector('#service-grid-mount');
        serviceMount.appendChild(this.serviceGrid.render());

        const summaryMount = this.appElement.querySelector('#ticket-summary-mount');
        summaryMount.replaceWith(this.ticketSummary.render());
    }
}

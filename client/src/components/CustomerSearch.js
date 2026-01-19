import { api } from '../api.js';

export class CustomerSearch {
    constructor() {
        this.container = null;
        this.timeout = null;
    }

    render() {
        const div = document.createElement('div');
        div.className = 'search-container';
        div.innerHTML = `
            <i class="fas fa-search" style="color: var(--text-muted); margin-right: 10px;"></i>
            <input type="text" id="customer-search-input" placeholder="Rechercher client (Nom, Tél)..." 
                style="border: none; outline: none; font-size: 1rem; flex: 1; background: transparent;">
            <button id="btn-new-customer" title="Nouveau Client" style="border: none; background: transparent; cursor: pointer; color: var(--primary-color);">
                <i class="fas fa-user-plus"></i>
            </button>
            <!-- Dropdown results container (hidden by default) -->
            <div id="search-results" class="search-results hidden"></div>
        `;

        // Add styles for dropdown directly or use theme.css
        // For now, I'll rely on theme.css (need to ensure it has .search-results)

        this.container = div;
        this.bindEvents();
        return div;
    }

    bindEvents() {
        const input = this.container.querySelector('#customer-search-input');
        const resultsDiv = this.container.querySelector('#search-results');

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(this.timeout);

            if (query.length < 2) {
                resultsDiv.innerHTML = '';
                resultsDiv.classList.add('hidden');
                return;
            }

            this.timeout = setTimeout(async () => {
                await this.performSearch(query, resultsDiv);
            }, 300);
        });
    }

    async performSearch(query, resultsDiv) {
        try {
            console.log(`Searching for: ${query}`);
            const customers = await api.searchShopifyCustomers(query);
            this.renderResults(customers, resultsDiv);
        } catch (error) {
            console.error('Search error', error);
            resultsDiv.innerHTML = '<div class="search-item error">Erreur de recherche</div>';
            resultsDiv.classList.remove('hidden');
        }
    }

    renderResults(customers, resultsDiv) {
        resultsDiv.innerHTML = '';
        if (customers.length === 0) {
            resultsDiv.innerHTML = '<div class="search-item">Aucun client trouvé</div>';
        } else {
            customers.forEach(customer => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <div class="customer-name">${customer.first_name} ${customer.last_name}</div>
                    <div class="customer-phone">${customer.phone || 'Pas de tél'}</div>
                `;
                item.addEventListener('click', () => {
                    this.selectCustomer(customer, resultsDiv);
                });
                resultsDiv.appendChild(item);
            });
        }
        resultsDiv.classList.remove('hidden');
    }

    selectCustomer(customer, resultsDiv) {
        console.log('Selected customer:', customer);
        // Dispatch event so Layout or Store can handle it
        document.dispatchEvent(new CustomEvent('customer-selected', { detail: customer }));

        // Update input
        const input = this.container.querySelector('#customer-search-input');
        input.value = `${customer.first_name} ${customer.last_name}`;

        // Hide results
        resultsDiv.classList.add('hidden');
    }
}

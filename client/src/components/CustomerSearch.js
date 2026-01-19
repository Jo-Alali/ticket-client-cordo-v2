import { api } from '../api.js';

export class CustomerSearch {
    constructor() {
        this.container = null;
        this.timeout = null;
    }

    render() {
        const div = document.createElement('div');
        div.style.position = 'relative'; // For dropdown positioning
        div.innerHTML = `
            <input type="text" id="customer-search-input" placeholder="Rechercher (Nom, Tel)..." autocomplete="off">
            <div id="search-results" class="search-results hidden"></div>
        `;

        // Inline styles for results dropdown since it's component specific
        const style = document.createElement('style');
        style.textContent = `
            .search-results {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-sm);
                z-index: 100;
                max-height: 200px;
                overflow-y: auto;
                margin-top: 4px;
            }
            .search-results.hidden { display: none; }
            .search-item {
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid var(--bg-main);
            }
            .search-item:hover { background-color: var(--bg-main); }
            .customer-name { font-weight: 500; }
            .customer-phone { font-size: 0.85rem; color: var(--text-muted); }
        `;
        div.appendChild(style);

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

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                resultsDiv.classList.add('hidden');
            }
        });
    }

    async performSearch(query, resultsDiv) {
        try {
            const customers = await api.searchShopifyCustomers(query);
            this.renderResults(customers, resultsDiv);
        } catch (error) {
            console.error('Search error', error);
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
        document.dispatchEvent(new CustomEvent('customer-selected', { detail: customer }));
        const input = this.container.querySelector('#customer-search-input');
        input.value = `${customer.first_name} ${customer.last_name}`;
        resultsDiv.classList.add('hidden');
    }
}

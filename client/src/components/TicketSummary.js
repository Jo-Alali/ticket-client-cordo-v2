export class TicketSummary {
    constructor() {
        this.container = null;
        this.items = [];
        this.customer = null;

        // Listen for global events
        document.addEventListener('service-added', (e) => this.addItem(e.detail));
        document.addEventListener('customer-selected', (e) => this.setCustomer(e.detail));
    }

    render() {
        const aside = document.createElement('aside');
        aside.className = 'ticket-summary';

        this.container = aside;
        this.updateView();
        return aside;
    }

    setCustomer(customer) {
        this.customer = customer;
        this.updateView();
    }

    addItem(service) {
        this.items.push(service);
        this.updateView();
    }

    removeItem(index) {
        this.items.splice(index, 1);
        this.updateView();
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
    }

    updateView() {
        if (!this.container) return;

        const total = this.getTotal();
        const customerName = this.customer ? `${this.customer.first_name} ${this.customer.last_name}` : 'Anonyme';
        const ticketId = '#NEW'; // Placeholder

        this.container.innerHTML = `
            <div class="summary-header">
                <h2 style="margin: 0; font-size: 1.1rem;">Ticket ${ticketId}</h2>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                     <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">Client: <strong>${customerName}</strong></p>
                     ${this.customer ? `<button id="clear-customer" style="border:none; background:none; color:red; cursor:pointer;"><i class="fas fa-times"></i></button>` : ''}
                </div>
            </div>
            
            <div class="summary-items">
                ${this.items.length === 0 ? `
                    <div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">
                        <i class="fas fa-basket-shopping" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                        <p>Aucune prestation</p>
                    </div>
                ` : `
                    <div class="items-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${this.items.map((item, index) => `
                            <div class="summary-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-main); border-radius: var(--radius-md);">
                                <div>
                                    <div style="font-weight: 500;">${item.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">${item.category}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-weight: 600;">${item.price} €</span>
                                    <button class="btn-remove" data-index="${index}" style="border: none; background: none; color: #ef4444; cursor: pointer;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div class="summary-footer">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-weight: 600; font-size: 1.25rem;">
                    <span>Total</span>
                    <span>${total} €</span>
                </div>
                <button class="btn-primary" ${this.items.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="fas fa-print"></i> Valider & Imprimer
                </button>
            </div>
        `;

        // Re-bind events for dynamic elements
        const removeButtons = this.container.querySelectorAll('.btn-remove');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeItem(index);
            });
        });

        const clearCustomerBtn = this.container.querySelector('#clear-customer');
        if (clearCustomerBtn) {
            clearCustomerBtn.addEventListener('click', () => this.setCustomer(null));
        }
    }
}

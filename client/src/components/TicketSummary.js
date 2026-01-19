export class TicketSummary {
    constructor() {
        this.container = null;
        this.items = [];
        document.addEventListener('service-added', (e) => this.addItem(e.detail));
    }

    render() {
        const container = document.createElement('div');
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        this.container = container;
        this.updateView();
        return container;
    }

    addItem(service) {
        this.items.push(service);
        this.updateView();
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
    }

    updateView() {
        if (!this.container) return;

        const total = this.getTotal();

        this.container.innerHTML = `
            <div style="flex: 1; overflow-y: auto; padding: 20px;">
                <h2 style="margin-top: 0;">Synthèse Ticket</h2>
                
                <!-- Date Picker -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.85rem; color: #6b7280; font-weight: 500;">Date de retrait</label>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        ${['Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => `
                            <button style="flex: 1; padding: 8px 0; background: #f3f4f6; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">${d}</button>
                        `).join('')}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <div style="flex: 1; background: #f3f4f6; padding: 8px; border-radius: 6px; display: flex; align-items: center; color: #6b7280;">
                            <i class="far fa-clock" style="margin-right: 8px;"></i>
                            <span>Heure...</span>
                            <i class="fas fa-chevron-down" style="margin-left: auto;"></i>
                        </div>
                        <button style="width: 40px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer;">
                            <i class="far fa-calendar"></i>
                        </button>
                    </div>
                </div>

                <!-- Active Items List (Simplified for visual match) -->
                ${this.items.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        ${this.items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 0.9rem;">
                                <span>${item.name} (P${item.pairIndex})</span>
                                <b>${item.price}€</b>
                            </div>
                        `).join('')}
                    </div>
                ` : `<div style="text-align: right; color: #9ca3af; font-size: 0.8rem; margin-bottom: 20px;">Choisir date...</div>`}

                <!-- Options -->
                <div style="display: flex; gap: 5px; margin-bottom: 20px;">
                    ${['Housse', 'Boite', 'Emb.', 'Sac'].map(opt => `
                        <button style="flex: 1; padding: 8px 0; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer;">
                            ${opt === 'Housse' ? '<i class="fas fa-cube"></i>' : ''}
                            ${opt === 'Boite' ? '<i class="fas fa-box"></i>' : ''}
                            ${opt}
                        </button>
                    `).join('')}
                </div>

                <!-- Note -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.85rem; color: #6b7280; font-weight: 500;">Note Globale</label>
                    <textarea rows="4" style="margin-top: 5px; resize: none;"></textarea>
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 20px; border-top: 1px solid #e5e7eb; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-weight: 700; font-size: 1.1rem;">Total</span>
                    <span style="font-weight: 700; font-size: 1.25rem;">${total} €</span>
                </div>
                
                <div style="display: flex; background: #f3f4f6; padding: 4px; border-radius: 8px; margin-bottom: 20px;">
                    <button style="flex: 1; padding: 8px; border: none; background: white; border-radius: 6px; font-weight: 500; font-size: 0.9rem; shadow: 0 1px 2px rgba(0,0,0,0.05);">Non payé</button>
                    <button style="flex: 1; padding: 8px; border: none; background: transparent; color: #6b7280; font-size: 0.9rem;">Payé</button>
                </div>

                <button class="btn-primary" style="background: black; padding: 15px; font-size: 1rem;">
                    <i class="fas fa-print"></i> Valider & Imprimer
                </button>
                
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button style="flex: 1; padding: 8px; background: #f3f4f6; border: none; border-radius: 6px; font-size: 0.8rem; color: #4b5563; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-print"></i> Print (No Save)
                    </button>
                    <button style="flex: 1; padding: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8rem; color: #4b5563; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="far fa-file-alt"></i> Facture
                    </button>
                </div>
            </div>
        `;
    }
}

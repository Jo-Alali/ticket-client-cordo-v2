export class ServiceGrid {
    constructor() {
        this.services = [
            { id: 'patins_crepe', name: 'Patins Crêpe', price: 28, category: 'Patins', icon: 'shoe-prints' },
            { id: 'patins_mat', name: 'Patins Mat', price: 39, category: 'Patins', icon: 'shoe-prints' },
            { id: 'talons_cuir', name: 'Talons Cuir', price: 29, category: 'Talons', icon: 'shoe-heels' },
            { id: 'talons_vibram', name: 'Talons Vibram', price: 22, category: 'Talons', icon: 'shoe-heels' },
            { id: 'ressemelage_cuir', name: 'Ressemelage Cuir', price: 195, category: 'Ressemelage', icon: 'ruler-combined' },
            { id: 'cles_std', name: 'Clé Standard', price: 5, category: 'Cles', icon: 'key' },
            { id: 'entretien', name: 'Entretien', price: 25, category: 'Autre', icon: 'spray-can' },
            { id: 'couture', name: 'Couture', price: 10, category: 'Autre', icon: 'cut' }
        ];
    }

    render() {
        const container = document.createElement('div');
        container.innerHTML = `
            <h2 style="font-size: 1.25rem; margin-bottom: 1rem; font-weight: 600;">Prestations</h2>
            <div class="services-grid"></div>
        `;

        const grid = container.querySelector('.services-grid');

        this.services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <i class="fas fa-${service.icon}"></i>
                <span>${service.name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${service.price} €</span>
            `;
            card.addEventListener('click', () => {
                this.addService(service);
            });
            grid.appendChild(card);
        });

        return container;
    }

    addService(service) {
        console.log('Adding service:', service);
        document.dispatchEvent(new CustomEvent('service-added', { detail: service }));
    }
}

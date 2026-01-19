export class ServiceGrid {
    constructor() {
        this.services = [
            { id: 'patins_crepe', name: 'Patins Crêpe', price: 28, category: 'PATINS' },
            { id: 'patins_mat', name: 'Patins Mat', price: 39, category: 'PATINS' },
            { id: 'patins_miroir', name: 'Patins Miroir', price: 39, category: 'PATINS' },
            { id: 'patins_epais', name: 'Patins Épais', price: 40, category: 'PATINS' },

            { id: 'fers_triumph', name: 'Fers Triumph', price: 25, category: 'FERS' },
            { id: 'fers_lulu', name: 'Fers LULU', price: 25, category: 'FERS' },
            { id: 'pointes', name: 'Pointes', price: 7, category: 'FERS' },

            { id: 'talons_cuir', name: 'Talons Cuir', price: 29, category: 'TALONS' },
            { id: 'talons_super', name: 'Talons Super', price: 25, category: 'TALONS' },
            { id: 'talons_bloc', name: 'Talons Bloc', price: 40, category: 'TALONS' },
            { id: 'talons_crante', name: 'Talons Cranté', price: 30, category: 'TALONS' },
            { id: 'talons_aiguilles', name: 'Talons Aiguilles', price: 15, category: 'TALONS' },
            { id: 'talons_vibram', name: 'Talons Vibram', price: 22, category: 'TALONS' },
            { id: 'talons_dainite', name: 'Talons Dainite', price: 35, category: 'TALONS' },
            { id: 'talons_ridgeway', name: 'Talons Ridgeway', price: 35, category: 'TALONS' },

            { id: 'ressemelage_cuir', name: 'Ressemelage Cuir', price: 195, category: 'RESSEMELAGE' },
            { id: 'ressemelage_caout', name: 'Ressemelage Caoutchouc', price: 185, category: 'RESSEMELAGE' },
            { id: 'ressemelage_birk', name: 'Ressemelage Birkenstock', price: 60, category: 'RESSEMELAGE' },

            { id: 'glissoir', name: 'Glissoir', price: 20, category: 'AUTRES' },
            { id: 'glissoir_b', name: 'Glissoir B', price: 30, category: 'AUTRES' }
        ];
        this.currentPair = 1;
        this.totalPairs = 6; // Default to showing 6 like screenshot
    }

    render() {
        const container = document.createElement('div');
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';

        // 1. Pairs Navigation (Tabs)
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'pair-tabs';
        tabsContainer.style.display = 'flex';
        tabsContainer.style.gap = '5px';

        for (let i = 1; i <= this.totalPairs; i++) {
            const btn = document.createElement('button');
            btn.className = `pair-tab ${i === this.currentPair ? 'active' : ''}`;
            btn.textContent = `${i}p`;
            btn.onclick = () => this.switchPair(i);
            tabsContainer.appendChild(btn);
        }

        // Add "+" button
        const addBtn = document.createElement('button');
        addBtn.className = 'pair-tab';
        addBtn.innerHTML = '+';
        tabsContainer.appendChild(addBtn);

        // 2. Active Pair Input Card
        const activePairCard = document.createElement('div');
        activePairCard.className = 'card';
        activePairCard.style.border = '2px solid black'; // Highlight active
        activePairCard.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Paire ${this.currentPair}</h3>
            <div style="background: #f9fafb; border: 1px dashed #ccc; padding: 10px; text-align: center; color: #666; margin-bottom: 10px; font-size: 0.9rem;">
                Déposer prestation...
            </div>
            <input type="text" placeholder="Note paire..." style="background: #fffbeb; border-color: #fcd34d;">
        `;

        // 3. Service Categories Grid (Scrollable)
        const servicesContainer = document.createElement('div');
        servicesContainer.className = 'services-scroll-area';
        servicesContainer.style.flex = '1';
        servicesContainer.style.overflowY = 'auto';
        servicesContainer.style.paddingRight = '5px';

        const categories = [...new Set(this.services.map(s => s.category))];

        categories.forEach(cat => {
            const catTitle = document.createElement('div');
            catTitle.textContent = cat;
            catTitle.style.fontSize = '0.75rem';
            catTitle.style.fontWeight = 'bold';
            catTitle.style.color = '#9ca3af';
            catTitle.style.marginBottom = '5px';
            catTitle.style.marginTop = '15px';
            servicesContainer.appendChild(catTitle);

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)'; // 2 columns like screenshot
            grid.style.gap = '10px';

            this.services.filter(s => s.category === cat).forEach(service => {
                const btn = document.createElement('button');
                btn.className = 'service-btn';
                btn.innerHTML = `
                    <span style="font-weight: 600; text-align: center;">${service.name}</span>
                    <span style="font-size: 0.8rem; color: #6b7280;">${service.price}€</span>
                `;
                btn.onclick = () => this.addService(service);
                grid.appendChild(btn);
            });
            servicesContainer.appendChild(grid);
        });

        // Add Styles
        const style = document.createElement('style');
        style.textContent = `
            .pair-tab {
                flex: 1;
                padding: 10px;
                background: white;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                cursor: pointer;
                font-weight: 600;
            }
            .pair-tab.active {
                background: black;
                color: white;
                border-color: black;
            }
            .service-btn {
                background: white;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 15px 10px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                transition: all 0.2s;
            }
            .service-btn:hover {
                border-color: black;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
        `;

        container.appendChild(style);
        container.appendChild(tabsContainer);
        container.appendChild(activePairCard);
        container.appendChild(servicesContainer);

        return container;
    }

    switchPair(num) {
        this.currentPair = num;
        // Re-render (simplified for vanilla JS without VDOM)
        const parent = document.getElementById('service-grid-mount');
        parent.innerHTML = '';
        parent.appendChild(this.render());
    }

    addService(service) {
        document.dispatchEvent(new CustomEvent('service-added', {
            detail: { ...service, pairIndex: this.currentPair }
        }));
    }
}

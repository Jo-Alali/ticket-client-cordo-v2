// API Service

const API_BASE_URL = '/api'; // Proxy Vite redirige vers localhost:4000

export const api = {
    // Clients
    async searchShopifyCustomers(query) {
        // Recherche locale et shopify combinée ? 
        // Le backend gère la recherche Shopify.
        // On suppose que l'endpoint backend est /api/customers/search?query=...
        // Mais dans server.js original, c'était searchCustomers(query) qui faisait search-last4 ou search global ?
        // routes/customers.routes.js a search-last4 et all.
        // On va ajouter une logique générique si besoin, mais pour l'instant utilisons search-last4 qui est le cas d'usage principal.

        // Si c'est un numéro court (4 chiffres), search-last4
        if (/^\d{4}$/.test(query.trim())) {
            const res = await fetch(`${API_BASE_URL}/customers/search-last4?last4=${query.trim()}`);
            if (!res.ok) throw new Error('Erreur recherche');
            return await res.json();
        }

        // TODO: Implémenter la recherche générique côté backend si nécessaire
        // Pour l'instant on retourne vide ou on fait un fetch vers getAllCustomers et on filtre localement (comme le fallback local original)
        return { customers: [] };
    },

    async createShopifyCustomer(customerData) {
        const res = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        if (!res.ok) throw new Error('Erreur création client');
        return await res.json();
    },

    async updateShopifyCustomer(id, customerData) {
        const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        if (!res.ok) throw new Error('Erreur maj client');
        return await res.json();
    },

    // Tickets
    async createTicket(ticketData) {
        const res = await fetch(`${API_BASE_URL}/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });
        if (!res.ok) throw new Error('Erreur création ticket');
        return await res.json();
    },

    async updateTicket(id, ticketData) {
        const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });
        if (!res.ok) throw new Error('Erreur maj ticket');
        return await res.json();
    },

    async getRecentTickets() {
        const res = await fetch(`${API_BASE_URL}/tickets`);
        if (!res.ok) throw new Error('Erreur récupération tickets');
        return await res.json();
    },

    async getStats() {
        const res = await fetch(`${API_BASE_URL}/tickets/stats/summary`);
        if (!res.ok) throw new Error('Erreur stats');
        return await res.json();
    }
};

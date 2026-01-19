import { globalState, appState } from './state.js';
import { api } from './api.js';

console.log('🚀 Ticket Client Cordo - Initialized');

// TODO: Migrer le reste de la logique de script_legacy.js ici ou dans d'autres modules (events.js, ui.js)

async function init() {
    try {
        const { tickets } = await api.getRecentTickets();
        console.log('Tickets récents chargés:', tickets);
        // Initialiser UI...
    } catch (e) {
        console.error('Erreur init', e);
    }
}

init();

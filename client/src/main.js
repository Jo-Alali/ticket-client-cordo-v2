import { Layout } from './components/Layout.js';

console.log('🚀 Ticket Client Cordo - v2.0 Initialized');

async function init() {
    try {
        const layout = new Layout();
        layout.render();
        console.log('Layout rendered');
    } catch (e) {
        console.error('Erreur init', e);
    }
}

init();

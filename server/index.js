require('dotenv').config();
const app = require('./src/app');
const path = require('path');
const db = new (require('./src/services/db.service'))();

// Construire l'index pour la recherche rapide au démarrage
const shopify = require('./src/services/shopify.service');

// Tâche périodique pour rafraîchir le cache (simulée ici ou à implémenter si besoin)
// Dans la version originale, il y avait un cache en mémoire pour search-last4.
// Nous allons réimplémenter cela proprement dans un service ou controller, 
// mais pour l'instant on lance le serveur.

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

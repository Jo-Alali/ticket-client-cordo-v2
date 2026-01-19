const express = require('express');
const cors = require('cors');
const path = require('path');

const ticketsRoutes = require('./routes/tickets.routes');
const customersRoutes = require('./routes/customers.routes');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/tickets', ticketsRoutes);
app.use('/api/customers', customersRoutes);

// Servir les fichiers statiques du frontend en production
if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientPath));

    // Toute autre route renvoie l'index.html du client (SPA)
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
}

// Gestion d'erreur globale
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;

const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');

// Routes pour les tickets
router.get('/search', ticketsController.searchTickets); // /api/tickets/search?query=...
router.get('/history/:id', ticketsController.getTicketHistory); // /api/tickets/history/:id
router.post('/:id/print', ticketsController.markTicketPrinted); // /api/tickets/:id/print
router.get('/:id', ticketsController.getTicketById); // /api/tickets/:id
router.delete('/:id', ticketsController.deleteTicket); // /api/tickets/:id
router.put('/:id', ticketsController.updateTicket); // /api/tickets/:id
router.post('/', ticketsController.createTicket); // /api/tickets
router.get('/', ticketsController.getRecentTickets); // /api/tickets (default: recent)

// Stats
// Note: Dans server.js original, c'était géré via un endpoint spécifique ou combiné ?
// Il semble qu'il y avait un endpoint manuel de backup, mais pas explicitement de stats publique sauf en interne.
// On ajoute un endpoint stats si besoin, basé sur db.getStats()
router.get('/stats/summary', ticketsController.getStats);

module.exports = router;

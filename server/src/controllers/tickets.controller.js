const TicketDatabase = require('../services/db.service');
const db = new TicketDatabase();

exports.searchTickets = (req, res) => {
    try {
        const query = req.query.query || '';
        console.log(`🔍 API: Recherche tickets pour "${query}"`);
        const tickets = db.searchTickets(query);
        res.json({ tickets });
    } catch (error) {
        console.error('❌ Erreur API searchTickets:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getRecentTickets = (req, res) => {
    try {
        // En Express, le router '/' correspond à /api/tickets/
        console.log('🔍 API: Récupération des tickets récents');
        const tickets = db.getRecentTickets(50);
        res.json({ tickets });
    } catch (error) {
        console.error('❌ Erreur API getRecentTickets:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getTicketById = (req, res) => {
    try {
        const ticketId = req.params.id;
        console.log(`🎫 API: Récupération ticket ID: ${ticketId}`);
        const ticket = db.getTicket(ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
        res.json({ ticket });
    } catch (error) {
        console.error('❌ Erreur API getTicketById:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.createTicket = (req, res) => {
    try {
        const ticketData = req.body;
        console.log(`➕ API: Création ticket`, ticketData);
        // Validation basique
        if (!ticketData) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        const newTicket = db.createTicket(ticketData);
        console.log(`✅ Ticket créé: ${newTicket.ticket_number} (ID: ${newTicket.id})`);
        res.status(201).json({ ticket: newTicket });
    } catch (error) {
        console.error('❌ Erreur API createTicket:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTicket = (req, res) => {
    try {
        const ticketId = req.params.id;
        const ticketData = req.body;
        console.log(`📝 API: Mise à jour ticket ID: ${ticketId}`);

        const updatedTicket = db.updateTicket(ticketId, ticketData);
        res.json({ ticket: updatedTicket });
    } catch (error) {
        console.error('❌ Erreur API updateTicket:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTicket = (req, res) => {
    try {
        const ticketId = req.params.id;
        console.log(`🗑️ API: Suppression ticket ${ticketId}`);

        const success = db.deleteTicket(ticketId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Ticket non trouvé ou déjà supprimé' });
        }
    } catch (error) {
        console.error('❌ Erreur API deleteTicket:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getTicketHistory = (req, res) => {
    try {
        const ticketId = req.params.id;
        console.log(`📜 API: Historique ticket ${ticketId}`);
        const history = db.getTicketHistory(ticketId);
        res.json({ history });
    } catch (error) {
        console.error('❌ Erreur API getTicketHistory:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.markTicketPrinted = (req, res) => {
    try {
        const ticketId = req.params.id;
        console.log(`🖨️ API: Marquer ticket ${ticketId} comme imprimé`);
        db.markTicketPrinted(ticketId);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erreur API markTicketPrinted:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getStats = (req, res) => {
    try {
        const stats = db.getStats();
        res.json({ stats });
    } catch (error) {
        console.error('❌ Erreur API getStats:', error.message);
        res.status(500).json({ error: error.message });
    }
};

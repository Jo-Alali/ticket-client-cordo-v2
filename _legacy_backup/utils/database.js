const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class TicketDatabase {
    constructor() {
        // Créer le dossier data s'il n'existe pas (support DATA_DIR pour environnements hébergés)
        const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.db = new Database(path.join(dataDir, 'tickets.db'));
        this.initTables();
    }

    initTables() {
        // Table des tickets
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_number TEXT UNIQUE NOT NULL,
                customer_id TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                paires_count INTEGER,
                prestations TEXT,
                total_price REAL,
                payment_status TEXT DEFAULT 'unpaid',
                paid_amount REAL DEFAULT 0,
                remaining_amount REAL DEFAULT 0,
                pickup_day TEXT,
                pickup_time TEXT,
                pickup_date TEXT,
                is_urgent BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table de l'historique
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ticket_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER,
                action TEXT,
                old_data TEXT,
                new_data TEXT,
                user_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id)
            )
        `);

        // Index pour les performances
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tickets_customer_phone ON tickets(customer_phone);
            CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
            CREATE INDEX IF NOT EXISTS idx_tickets_pickup_date ON tickets(pickup_date);
            CREATE INDEX IF NOT EXISTS idx_tickets_customer_name ON tickets(customer_name);
            CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
        `);
    }

    // Générer un numéro de ticket unique
    generateTicketNumber() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = this.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE DATE(created_at) = DATE(?)').get(today.toISOString().slice(0, 10)).count;
        return `T${dateStr}${String(count + 1).padStart(3, '0')}`;
    }

    // Créer un nouveau ticket
    createTicket(ticketData) {
        const ticketNumber = this.generateTicketNumber();
        
        const stmt = this.db.prepare(`
            INSERT INTO tickets (
                ticket_number, customer_id, customer_name, customer_phone, customer_email,
                paires_count, prestations, total_price, payment_status, paid_amount,
                remaining_amount, pickup_day, pickup_time, pickup_date, is_urgent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            ticketNumber,
            ticketData.customer_id || null,
            ticketData.customer_name || '',
            ticketData.customer_phone || '',
            ticketData.customer_email || '',
            ticketData.paires_count || 0,
            JSON.stringify(ticketData.prestations || []),
            ticketData.total_price || 0,
            ticketData.payment_status || 'unpaid',
            ticketData.paid_amount || 0,
            ticketData.remaining_amount || 0,
            ticketData.pickup_day || '',
            ticketData.pickup_time || '',
            ticketData.pickup_date || '',
            ticketData.is_urgent ? 1 : 0
        );

        // Ajouter à l'historique
        this.addHistory(result.lastInsertRowid, 'created', null, ticketData);

        return { id: result.lastInsertRowid, ticket_number: ticketNumber };
    }

    // Mettre à jour un ticket
    updateTicket(ticketId, newData) {
        // Récupérer les données actuelles
        const oldData = this.getTicket(ticketId);
        if (!oldData) throw new Error('Ticket non trouvé');

        const stmt = this.db.prepare(`
            UPDATE tickets SET
                customer_name = ?, customer_phone = ?, customer_email = ?,
                paires_count = ?, prestations = ?, total_price = ?,
                payment_status = ?, paid_amount = ?, remaining_amount = ?,
                pickup_day = ?, pickup_time = ?, pickup_date = ?,
                is_urgent = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            newData.customer_name || oldData.customer_name,
            newData.customer_phone || oldData.customer_phone,
            newData.customer_email || oldData.customer_email,
            newData.paires_count || oldData.paires_count,
            JSON.stringify(newData.prestations || oldData.prestations),
            newData.total_price || oldData.total_price,
            newData.payment_status || oldData.payment_status,
            newData.paid_amount || oldData.paid_amount,
            newData.remaining_amount || oldData.remaining_amount,
            newData.pickup_day || oldData.pickup_day,
            newData.pickup_time || oldData.pickup_time,
            newData.pickup_date || oldData.pickup_date,
            newData.is_urgent !== undefined ? (newData.is_urgent ? 1 : 0) : oldData.is_urgent,
            ticketId
        );

        // Ajouter à l'historique
        this.addHistory(ticketId, 'updated', oldData, newData);

        return this.getTicket(ticketId);
    }

    // Récupérer un ticket
    getTicket(ticketId) {
        const stmt = this.db.prepare('SELECT * FROM tickets WHERE id = ?');
        const ticket = stmt.get(ticketId);
        if (ticket) {
            ticket.prestations = JSON.parse(ticket.prestations || '[]');
            ticket.is_urgent = Boolean(ticket.is_urgent);
        }
        return ticket;
    }

    // Récupérer un ticket par numéro
    getTicketByNumber(ticketNumber) {
        const stmt = this.db.prepare('SELECT * FROM tickets WHERE ticket_number = ?');
        const ticket = stmt.get(ticketNumber);
        if (ticket) {
            ticket.prestations = JSON.parse(ticket.prestations || '[]');
            ticket.is_urgent = Boolean(ticket.is_urgent);
        }
        return ticket;
    }

    // Rechercher des tickets
    searchTickets(query) {
        const stmt = this.db.prepare(`
            SELECT * FROM tickets 
            WHERE customer_name LIKE ? OR customer_phone LIKE ? OR ticket_number LIKE ?
            ORDER BY created_at DESC
            LIMIT 50
        `);
        const searchTerm = `%${query}%`;
        const tickets = stmt.all(searchTerm, searchTerm, searchTerm);
        return tickets.map(ticket => ({
            ...ticket,
            prestations: JSON.parse(ticket.prestations || '[]'),
            is_urgent: Boolean(ticket.is_urgent)
        }));
    }

    // Récupérer tous les tickets récents
    getRecentTickets(limit = 20) {
        const stmt = this.db.prepare(`
            SELECT * FROM tickets 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const tickets = stmt.all(limit);
        return tickets.map(ticket => ({
            ...ticket,
            prestations: JSON.parse(ticket.prestations || '[]'),
            is_urgent: Boolean(ticket.is_urgent)
        }));
    }

    // Récupérer l'historique d'un ticket
    getTicketHistory(ticketId) {
        const stmt = this.db.prepare(`
            SELECT * FROM ticket_history 
            WHERE ticket_id = ? 
            ORDER BY created_at DESC
        `);
        return stmt.all(ticketId);
    }

    // Ajouter une entrée à l'historique
    addHistory(ticketId, action, oldData, newData, userInfo = 'system') {
        const stmt = this.db.prepare(`
            INSERT INTO ticket_history (ticket_id, action, old_data, new_data, user_info)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
            ticketId,
            action,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            userInfo
        );
    }

    // Marquer un ticket comme imprimé
    markTicketPrinted(ticketId) {
        this.addHistory(ticketId, 'printed', null, { printed_at: new Date().toISOString() });
    }

    // Statistiques
    getStats() {
        const totalTickets = this.db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
        const totalRevenue = this.db.prepare('SELECT SUM(total_price) as total FROM tickets WHERE payment_status = ?').get('paid').total || 0;
        const pendingTickets = this.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE payment_status != ?').get('paid').count;
        const todayTickets = this.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE DATE(created_at) = DATE(?)').get(new Date().toISOString().slice(0, 10)).count;
        
        // Statistiques par jour de la semaine
        const weeklyStats = this.db.prepare(`
            SELECT 
                CASE 
                    WHEN pickup_day = 'Lundi' THEN 1
                    WHEN pickup_day = 'Mardi' THEN 2
                    WHEN pickup_day = 'Mercredi' THEN 3
                    WHEN pickup_day = 'Jeudi' THEN 4
                    WHEN pickup_day = 'Vendredi' THEN 5
                    WHEN pickup_day = 'Samedi' THEN 6
                    WHEN pickup_day = 'Dimanche' THEN 7
                    ELSE 8
                END as day_order,
                pickup_day,
                COUNT(*) as count
            FROM tickets 
            WHERE pickup_day IS NOT NULL AND pickup_day != ''
            GROUP BY pickup_day
            ORDER BY day_order
        `).all();
        
        return {
            totalTickets,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            pendingTickets,
            todayTickets,
            weeklyStats
        };
    }

    // Supprimer un ticket
    deleteTicket(ticketId) {
        // Vérifier que le ticket existe
        const ticket = this.getTicket(ticketId);
        if (!ticket) {
            throw new Error('Ticket non trouvé');
        }

        // Supprimer le ticket
        const stmt = this.db.prepare('DELETE FROM tickets WHERE id = ?');
        const result = stmt.run(ticketId);

        // Ajouter à l'historique
        this.addHistory(ticketId, 'deleted', ticket, null);

        return result.changes > 0;
    }

    // Fermer la connexion
    close() {
        this.db.close();
    }
}

module.exports = TicketDatabase;

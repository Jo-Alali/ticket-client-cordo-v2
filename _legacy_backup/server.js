const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { searchCustomers, createCustomer, updateCustomer, getConfig, addTagToCustomer, getAllCustomers, getCustomersByLast4, getAllCustomersPaginated, searchCustomersByLast4GraphQL } = require('./utils/shopify');
const TicketDatabase = require('./utils/database');
const BackupManager = require('./utils/backup');

// Debug: Afficher les variables d'environnement
console.log('🔍 Variables d\'environnement:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('🛒 Configuration Shopify:', getConfig());

const PORT = parseInt(process.env.PORT) || 3000;
console.log(`🎯 Port utilisé: ${PORT}`);

// Initialiser la base de données
const db = new TicketDatabase();
console.log('🗄️ Base de données SQLite initialisée');

// Initialiser le gestionnaire de sauvegarde (support DATA_DIR)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const backupManager = new BackupManager(path.join(DATA_DIR, 'tickets.db'));
console.log('💾 Gestionnaire de sauvegarde initialisé');

// Démarrer la sauvegarde automatique
backupManager.startAutoBackup();
// ===== Cache en mémoire pour recherche par 4 chiffres =====
const last4Cache = {
  index: new Map(), // last4 => Array<customer>
  lastBuildTs: 0,
  ttlMs: 10 * 60 * 1000 // 10 minutes
};

async function buildLast4IndexIfNeeded(force = false) {
  const now = Date.now();
  if (!force && (now - last4Cache.lastBuildTs) < last4Cache.ttlMs && last4Cache.index.size > 0) {
    return;
  }
  console.log('🧱 (Re)construction index last4...');
  const all = await getAllCustomersPaginated(100); // ~25k clients max
  const map = new Map();

  for (const c of all) {
    const phones = [];
    if (c.phone) phones.push(String(c.phone));
    if (c.default_address && c.default_address.phone) phones.push(String(c.default_address.phone));

    for (const p of phones) {
      const digits = p.replace(/\D/g, '');
      if (digits.length >= 4) {
        const last4 = digits.slice(-4);
        if (!map.has(last4)) map.set(last4, []);
        map.get(last4).push(c);
      }
    }
  }

  last4Cache.index = map;
  last4Cache.lastBuildTs = now;
  console.log(`✅ Index last4 prêt (${map.size} clés)`);
}

// Construire l'index au démarrage (non bloquant)
buildLast4IndexIfNeeded(true).catch(err => console.error('⚠️ Build index initial échoué:', err.message));
// Rafraîchir périodiquement
setInterval(() => buildLast4IndexIfNeeded(true).catch(err => console.error('⚠️ Refresh index échoué:', err.message)), 15 * 60 * 1000);

// Fonction pour servir les fichiers statiques
function serveStaticFile(filePath, contentType, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Fichier non trouvé
        fs.readFile(path.join(__dirname, 'index.html'), (error, content) => {
          response.writeHead(404, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          });
          response.end(content, 'utf-8');
        });
      } else {
        // Erreur serveur
        response.writeHead(500);
        response.end('Erreur serveur: ' + error.code);
      }
    } else {
      // Succès
      response.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      response.end(content, 'utf-8');
    }
  });
}

// Fonction pour lire le body de la requête
function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

// Fonction pour envoyer une réponse JSON
function sendJSONResponse(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(data));
}

// Création du serveur
const server = http.createServer(async (request, response) => {
  console.log(`📨 ${new Date().toISOString()} - ${request.method} ${request.url}`);

  const parsedUrl = url.parse(request.url, true);
  const pathname = parsedUrl.pathname;

  // Preflight CORS
  if (request.method === 'OPTIONS') {
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  // API Endpoint: Recherche de clients
  if (pathname === '/api/customers/search' && request.method === 'GET') {
    try {
      const query = parsedUrl.query.query || parsedUrl.query.q || '';
      console.log(`🔍 API: Recherche clients pour "${query}"`);
      
      if (!query.trim()) {
        sendJSONResponse(response, 400, { error: 'Query parameter is required' });
        return;
      }

      const customers = await searchCustomers(query);
      sendJSONResponse(response, 200, { customers });
    } catch (error) {
      console.error('❌ Erreur API search:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Récupération de tous les clients
  if (pathname === '/api/customers/all' && request.method === 'GET') {
    try {
      console.log('🔍 API: Récupération de tous les clients');
      
      const customers = await getAllCustomers();
      sendJSONResponse(response, 200, { customers });
    } catch (error) {
      console.error('❌ Erreur API getAllCustomers:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Recherche par 4 derniers chiffres du téléphone
  if (pathname === '/api/customers/search-last4' && request.method === 'GET') {
    try {
      const last4 = (parsedUrl.query.last4 || '').trim();
      console.log(`🔍 API: Recherche par 4 derniers chiffres: ${last4}`);
      if (!/^[0-9]{4}$/.test(last4)) {
        sendJSONResponse(response, 400, { error: 'Paramètre last4 invalide' });
        return;
      }

      // 1) Essayer via l'index en mémoire (ultra-rapide)
      await buildLast4IndexIfNeeded(false);
      const fromIndex = last4Cache.index.get(last4) || [];
      if (fromIndex.length > 0) {
        console.log(`⚡ Réponse via index (${fromIndex.length})`);
        sendJSONResponse(response, 200, { customers: fromIndex });
        return;
      }

      // 2) Tentative rapide GraphQL
      const gqlMatches = await searchCustomersByLast4GraphQL(last4, 50);
      if (gqlMatches.length > 0) {
        console.log(`⚡ Réponse via GraphQL (${gqlMatches.length})`);
        sendJSONResponse(response, 200, { customers: gqlMatches });
        return;
      }

      // 3) Fallback: parcours live paginé Shopify (plus lent)
      const customers = await getCustomersByLast4(last4, 8);
      sendJSONResponse(response, 200, { customers });
    } catch (error) {
      console.error('❌ Erreur API search-last4:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Création de client
  if (pathname === '/api/customers' && request.method === 'POST') {
    try {
      const customerData = await getRequestBody(request);
      console.log(`➕ API: Création client`, customerData);
      
      if (!customerData.prenom && !customerData.nom) {
        sendJSONResponse(response, 400, { error: 'Prénom ou nom requis' });
        return;
      }

      const customer = await createCustomer(customerData);
      sendJSONResponse(response, 201, { customer });
    } catch (error) {
      console.error('❌ Erreur API create:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Mise à jour de client
  if (pathname.startsWith('/api/customers/') && request.method === 'PUT') {
    try {
      const customerId = pathname.split('/').pop();
      const customerData = await getRequestBody(request);
      console.log(`📝 API: Mise à jour client ${customerId}`, customerData);
      
      if (!customerData.prenom && !customerData.nom) {
        sendJSONResponse(response, 400, { error: 'Prénom ou nom requis' });
        return;
      }

      const customer = await updateCustomer(customerId, customerData);
      sendJSONResponse(response, 200, { customer });
    } catch (error) {
      console.error('❌ Erreur API update:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Ajouter une balise à un client
  if (pathname.startsWith('/api/customers/') && pathname.endsWith('/tags') && request.method === 'POST') {
    try {
      const parts = pathname.split('/').filter(Boolean);
      const customerId = parts[2];
      const body = await getRequestBody(request);
      const tag = (body.tag || '').trim();
      if (!customerId || !tag) {
        sendJSONResponse(response, 400, { error: 'Customer ID et tag requis' });
        return;
      }
      console.log(`🏷️ API: Ajouter balise "${tag}" au client ${customerId}`);
      const result = await addTagToCustomer(customerId, tag);
      sendJSONResponse(response, 200, { customer: result });
    } catch (error) {
      console.error('❌ Erreur API add tag:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // ===== API ENDPOINTS POUR LES TICKETS =====
  
  // API Endpoint: Créer un ticket
  if (pathname === '/api/tickets' && request.method === 'POST') {
    try {
      const ticketData = await getRequestBody(request);
      console.log(`🎫 API: Création ticket`, ticketData);
      
      const result = db.createTicket(ticketData);
      sendJSONResponse(response, 201, { ticket: result });
    } catch (error) {
      console.error('❌ Erreur API create ticket:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Rechercher des tickets
  if (pathname === '/api/tickets/search' && request.method === 'GET') {
    try {
      const query = parsedUrl.query.query || '';
      console.log(`🔍 API: Recherche tickets pour "${query}"`);
      
      const tickets = db.searchTickets(query);
      sendJSONResponse(response, 200, { tickets });
    } catch (error) {
      console.error('❌ Erreur API search tickets:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Récupérer les tickets récents
  if (pathname === '/api/tickets/recent' && request.method === 'GET') {
    try {
      const limit = parseInt(parsedUrl.query.limit) || 20;
      console.log(`📋 API: Récupération tickets récents (limite: ${limit})`);
      
      const tickets = db.getRecentTickets(limit);
      sendJSONResponse(response, 200, { tickets });
    } catch (error) {
      console.error('❌ Erreur API recent tickets:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Récupérer un ticket par ID
  if (pathname.startsWith('/api/tickets/') && !pathname.includes('/history') && request.method === 'GET') {
    try {
      const ticketId = pathname.split('/').pop();
      console.log(`🎫 API: Récupération ticket ID: ${ticketId}`);
      
      const ticket = db.getTicket(ticketId);
      if (!ticket) {
        sendJSONResponse(response, 404, { error: 'Ticket non trouvé' });
        return;
      }
      
      sendJSONResponse(response, 200, { ticket });
    } catch (error) {
      console.error('❌ Erreur API get ticket:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Mettre à jour un ticket
  if (pathname.startsWith('/api/tickets/') && !pathname.includes('/history') && request.method === 'PUT') {
    try {
      const ticketId = pathname.split('/').pop();
      const ticketData = await getRequestBody(request);
      console.log(`📝 API: Mise à jour ticket ${ticketId}`, ticketData);

      const updatedTicket = db.updateTicket(ticketId, ticketData);
      sendJSONResponse(response, 200, { ticket: updatedTicket });
    } catch (error) {
      console.error('❌ Erreur API update ticket:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Supprimer un ticket
  if (pathname.startsWith('/api/tickets/') && !pathname.includes('/history') && request.method === 'DELETE') {
    try {
      const ticketId = pathname.split('/').pop();
      console.log(`🗑️ API: Suppression ticket ${ticketId}`);

      const deleted = db.deleteTicket(ticketId);
      if (deleted) {
        sendJSONResponse(response, 200, { message: 'Ticket supprimé avec succès' });
      } else {
        sendJSONResponse(response, 404, { error: 'Ticket non trouvé' });
      }
    } catch (error) {
      console.error('❌ Erreur API delete ticket:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Récupérer l'historique d'un ticket
  if (pathname.startsWith('/api/tickets/') && pathname.endsWith('/history') && request.method === 'GET') {
    try {
      const ticketId = pathname.split('/')[3];
      console.log(`📜 API: Historique ticket ID: ${ticketId}`);
      
      const history = db.getTicketHistory(ticketId);
      sendJSONResponse(response, 200, { history });
    } catch (error) {
      console.error('❌ Erreur API ticket history:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Marquer un ticket comme imprimé
  if (pathname.startsWith('/api/tickets/') && pathname.endsWith('/print') && request.method === 'POST') {
    try {
      const ticketId = pathname.split('/')[3];
      console.log(`🖨️ API: Marquer ticket ${ticketId} comme imprimé`);
      
      db.markTicketPrinted(ticketId);
      sendJSONResponse(response, 200, { message: 'Ticket marqué comme imprimé' });
    } catch (error) {
      console.error('❌ Erreur API mark printed:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Statistiques
  if (pathname === '/api/stats' && request.method === 'GET') {
    try {
      console.log(`📊 API: Récupération statistiques`);
      
      const stats = db.getStats();
      sendJSONResponse(response, 200, { stats });
    } catch (error) {
      console.error('❌ Erreur API stats:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // ===== API ENDPOINTS POUR LES SAUVEGARDES =====
  
  // API Endpoint: Créer une sauvegarde manuelle
  if (pathname === '/api/backup/create' && request.method === 'POST') {
    try {
      const body = await getRequestBody(request);
      const description = body.description || 'Sauvegarde manuelle';
      console.log(`💾 API: Création sauvegarde manuelle - ${description}`);
      
      const result = backupManager.createBackup(description);
      sendJSONResponse(response, result.success ? 201 : 500, result);
    } catch (error) {
      console.error('❌ Erreur API create backup:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Lister les sauvegardes
  if (pathname === '/api/backup/list' && request.method === 'GET') {
    try {
      console.log(`📋 API: Liste des sauvegardes`);
      
      const backups = backupManager.listBackups();
      const stats = backupManager.getBackupStats();
      sendJSONResponse(response, 200, { backups, stats });
    } catch (error) {
      console.error('❌ Erreur API list backups:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Restaurer une sauvegarde
  if (pathname.startsWith('/api/backup/restore/') && request.method === 'POST') {
    try {
      const backupName = pathname.split('/').pop();
      console.log(`🔄 API: Restauration sauvegarde - ${backupName}`);
      
      const result = backupManager.restoreBackup(backupName);
      sendJSONResponse(response, result.success ? 200 : 500, result);
    } catch (error) {
      console.error('❌ Erreur API restore backup:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Supprimer une sauvegarde
  if (pathname.startsWith('/api/backup/delete/') && request.method === 'DELETE') {
    try {
      const backupName = pathname.split('/').pop();
      console.log(`🗑️ API: Suppression sauvegarde - ${backupName}`);
      
      const result = backupManager.deleteBackup(backupName);
      sendJSONResponse(response, result.success ? 200 : 500, result);
    } catch (error) {
      console.error('❌ Erreur API delete backup:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // API Endpoint: Télécharger une sauvegarde
  if (pathname.startsWith('/api/backup/download/') && request.method === 'GET') {
    try {
      const backupName = pathname.split('/').pop();
      const backupPath = path.join(backupManager.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        sendJSONResponse(response, 404, { error: 'Sauvegarde non trouvée' });
        return;
      }
      
      console.log(`📥 API: Téléchargement sauvegarde - ${backupName}`);
      
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${backupName}"`,
        'Access-Control-Allow-Origin': '*'
      });
      
      const fileStream = fs.createReadStream(backupPath);
      fileStream.pipe(response);
    } catch (error) {
      console.error('❌ Erreur API download backup:', error.message);
      sendJSONResponse(response, 500, { error: error.message });
    }
    return;
  }

  // Route de healthcheck
  if (pathname === '/' && request.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');
    serveStaticFile(filePath, 'text/html', response);
    return;
  }

  // Healthcheck endpoint spécifique
  if (pathname === '/health' && request.method === 'GET') {
    sendJSONResponse(response, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: PORT,
      shopify: getConfig()
    });
    return;
  }

  // Servir les fichiers statiques
  let filePath = path.join(__dirname, request.url === '/' ? 'index.html' : request.url);
  let extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.ico':
      contentType = 'image/x-icon';
      break;
  }

  serveStaticFile(filePath, contentType, response);
});

// Démarrage du serveur
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur démarré sur ${HOST}:${PORT}`);
  console.log(`🌐 URL: http://${HOST}:${PORT}`);
  console.log(`📁 Répertoire servi: ${__dirname}`);
  console.log(`🔧 Variables d'environnement:`, {
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV
  });
});

// Gestion des erreurs
server.on('error', (err) => {
  console.error('❌ Erreur serveur:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exception non capturée:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

// Fermeture propre de la base de données et sauvegarde
process.on('SIGINT', () => {
  console.log('🔄 Arrêt du serveur...');
  backupManager.stopAutoBackup();
  backupManager.createBackup('Sauvegarde avant arrêt');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Arrêt du serveur...');
  backupManager.stopAutoBackup();
  backupManager.createBackup('Sauvegarde avant arrêt');
  db.close();
  process.exit(0);
});

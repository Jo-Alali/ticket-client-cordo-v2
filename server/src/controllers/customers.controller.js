const shopify = require('../services/shopify.service');

// Cache simple en mémoire pour les recherches "last4"
// Dans l'idéal avec Express, on pourrait utiliser un service dédié, mais ici on garde la logique "stateful" du process Node.
const last4Cache = {
    index: new Map(), // last4 => Array<customer>
    lastBuildTs: 0,
    ttlMs: 10 * 60 * 1000 // 10 minutes
};

/**
 * Construit ou met à jour l'index des clients par 4 derniers chiffres
 */
async function buildLast4IndexIfNeeded(force = false) {
    const now = Date.now();
    if (!force && last4Cache.lastBuildTs > 0 && (now - last4Cache.lastBuildTs < last4Cache.ttlMs)) {
        return; // Cache valide
    }

    console.log('🔄 Rebuilding Last4 Index...');
    try {
        // Récupérer tous les clients (paginé)
        // Note: getAllCustomersPaginated est plus robuste que getAllCustomers
        const allCustomers = await shopify.getAllCustomersPaginated(20); // Limite à 20 pages * 250 = 5000 clients pour l'instant

        const newIndex = new Map();

        for (const customer of allCustomers) {
            const phones = [];
            if (customer.phone) phones.push(String(customer.phone));
            if (customer.default_address && customer.default_address.phone) phones.push(String(customer.default_address.phone));

            // Dédoublonner et extraire les 4 derniers chiffres
            const uniquePhones = [...new Set(phones)];

            for (const phone of uniquePhones) {
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 4) {
                    const last4 = digits.slice(-4);
                    if (!newIndex.has(last4)) {
                        newIndex.set(last4, []);
                    }
                    // Avoid inserting duplicates in the array
                    const list = newIndex.get(last4);
                    if (!list.find(c => c.id === customer.id)) {
                        list.push(customer);
                    }
                }
            }
        }

        last4Cache.index = newIndex;
        last4Cache.lastBuildTs = now;
        console.log(`✅ Last4 Index rebuilt: ${last4Cache.index.size} entries.`);
    } catch (error) {
        console.error('⚠️ Index build failed:', error.message);
    }
}

// Lancer le build au démarrage (async, ne bloque pas le require)
setTimeout(() => buildLast4IndexIfNeeded(true), 1000);

exports.getAllCustomers = async (req, res) => {
    try {
        console.log('🔍 API: Récupération de tous les clients');
        const customers = await shopify.getAllCustomers();
        res.json({ customers });
    } catch (error) {
        console.error('❌ Erreur API getAllCustomers:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.searchByLast4 = async (req, res) => {
    try {
        const last4 = (req.query.last4 || '').trim();
        console.log(`🔍 API: Recherche par 4 derniers chiffres: ${last4}`);

        if (!/^\d{4}$/.test(last4)) {
            return res.status(400).json({ error: 'Format invalide (4 chiffres requis)' });
        }

        // Tenter via le cache d'abord
        await buildLast4IndexIfNeeded(); // Vérifie TTL

        let results = last4Cache.index.get(last4) || [];

        // Si pas de résultats dans le cache, on peut tenter une recherche directe GraphQL (fallback)
        if (results.length === 0) {
            console.log('⚠️ Pas trouvé dans cache, tentative fallback GraphQL...');
            results = await shopify.searchCustomersByLast4GraphQL(last4);
        }

        res.json({ customers: results });
    } catch (error) {
        console.error('❌ Erreur API searchByLast4:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const customerData = req.body;
        console.log(`➕ API: Création client`, customerData);

        const newCustomer = await shopify.createCustomer(customerData);

        // Invalider ou mettre à jour le cache (optionnel mais mieux)
        // Pour faire simple on force un rebuild au prochain appel ou now
        last4Cache.lastBuildTs = 0;

        res.status(201).json({ customer: newCustomer });
    } catch (error) {
        console.error('❌ Erreur API createCustomer:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customerData = req.body;
        console.log(`📝 API: Mise à jour client ${customerId}`, customerData);

        const updatedCustomer = await shopify.updateCustomer(customerId, customerData);
        last4Cache.lastBuildTs = 0; // Invalidate cache

        res.json({ customer: updatedCustomer });
    } catch (error) {
        console.error('❌ Erreur API updateCustomer:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.addTag = async (req, res) => {
    try {
        const customerId = req.params.id;
        const { tag } = req.body;
        console.log(`🏷️ API: Ajout tag "${tag}" au client ${customerId}`);

        const customer = await shopify.addTagToCustomer(customerId, tag);
        res.json({ customer });
    } catch (error) {
        console.error('❌ Erreur API addTag:', error.message);
        res.status(500).json({ error: error.message });
    }
};

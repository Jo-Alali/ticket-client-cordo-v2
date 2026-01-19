const fetch = require('node-fetch');

// Configuration Shopify depuis les variables d'environnement
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'votre-boutique.myshopify.com';
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

const BASE_URL = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;
const GRAPHQL_URL = `${BASE_URL}/graphql.json`;

/**
 * Rechercher des clients sur Shopify
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} Liste des clients trouvés
 */
async function searchCustomers(query) {
    try {
        console.log(`🔍 Recherche Shopify pour: "${query}"`);

        // Nettoyer la requête
        const cleanQuery = query.trim();

        // Liste des champs à rechercher avec des approches différentes
        const searchAttempts = [
            `first_name:${cleanQuery}`,
            `last_name:${cleanQuery}`,
            `phone:${cleanQuery}`,
            `${cleanQuery}` // Recherche générale
        ];

        let allCustomers = [];

        // Essayer chaque type de recherche
        for (const searchQuery of searchAttempts) {
            try {
                const url = `${BASE_URL}/customers/search.json?query=${encodeURIComponent(searchQuery)}`;
                console.log(`🌐 Tentative recherche: "${searchQuery}" - ${url}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const customers = data.customers || [];

                    // Ajouter les nouveaux clients en évitant les doublons
                    for (const customer of customers) {
                        if (!allCustomers.find(c => c.id === customer.id)) {
                            allCustomers.push(customer);
                        }
                    }

                    console.log(`✅ "${searchQuery}": ${customers.length} clients trouvés`);
                } else {
                    console.log(`⚠️ "${searchQuery}": ${response.status}`);
                }
            } catch (searchError) {
                console.log(`⚠️ Erreur recherche "${searchQuery}": ${searchError.message}`);
            }
        }

        console.log(`🎯 Total clients uniques trouvés: ${allCustomers.length}`);
        return allCustomers;
    } catch (error) {
        console.error('❌ Erreur dans searchCustomers:', error.message);
        throw error;
    }
}

/**
 * Créer un nouveau client sur Shopify
 * @param {Object} customerData - Données du client
 * @param {string} customerData.prenom - Prénom
 * @param {string} customerData.nom - Nom
 * @param {string} customerData.telephone - Téléphone
 * @param {string} customerData.email - Email (optionnel)
 * @returns {Promise<Object>} Client créé
 */
async function createCustomer(customerData) {
    try {
        console.log(`➕ Création client Shopify:`, {
            prenom: customerData.prenom,
            nom: customerData.nom,
            telephone: customerData.telephone,
            email: customerData.email
        });

        const customerPayload = {
            customer: {
                first_name: customerData.prenom || '',
                last_name: customerData.nom || '',
                email: customerData.email || null,
                phone: customerData.telephone ? customerData.telephone.replace(/\s/g, '') : null,
                tags: 'cordonnerie',
                addresses: [{
                    first_name: customerData.prenom || '',
                    last_name: customerData.nom || '',
                    phone: customerData.telephone ? customerData.telephone.replace(/\s/g, '') : null,
                    address1: 'Adresse non spécifiée',
                    city: 'Ville non spécifiée',
                    country: 'France'
                }]
            }
        };

        const url = `${BASE_URL}/customers.json`;
        console.log(`🌐 Création URL: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`❌ Erreur création Shopify: ${response.status}`, errorData);
            throw new Error(`Erreur création client: ${response.status} - ${JSON.stringify(errorData.errors || errorData.error)}`);
        }

        const data = await response.json();
        console.log(`✅ Client créé avec ID: ${data.customer.id}`);

        return data.customer;
    } catch (error) {
        console.error('❌ Erreur dans createCustomer:', error.message);
        throw error;
    }
}

/**
 * Mettre à jour un client existant sur Shopify
 * @param {string} customerId - ID du client à mettre à jour
 * @param {Object} customerData - Nouvelles données du client
 * @param {string} customerData.prenom - Prénom
 * @param {string} customerData.nom - Nom
 * @param {string} customerData.telephone - Téléphone
 * @param {string} customerData.email - Email (optionnel)
 * @returns {Promise<Object>} Client mis à jour
 */
async function updateCustomer(customerId, customerData) {
    try {
        console.log(`📝 Mise à jour client Shopify ID: ${customerId}`, {
            prenom: customerData.prenom,
            nom: customerData.nom,
            telephone: customerData.telephone,
            email: customerData.email
        });

        const customerPayload = {
            customer: {
                id: customerId,
                first_name: customerData.prenom || '',
                last_name: customerData.nom || '',
                email: customerData.email || null,
                phone: customerData.telephone ? customerData.telephone.replace(/\s/g, '') : null
            }
        };

        const url = `${BASE_URL}/customers/${customerId}.json`;
        console.log(`🌐 Mise à jour URL: ${url}`);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`❌ Erreur mise à jour Shopify: ${response.status}`, errorData);
            throw new Error(`Erreur mise à jour client: ${response.status} - ${JSON.stringify(errorData.errors || errorData.error)}`);
        }

        const data = await response.json();
        console.log(`✅ Client mis à jour: ${data.customer.id}`);

        return data.customer;
    } catch (error) {
        console.error('❌ Erreur dans updateCustomer:', error.message);
        throw error;
    }
}

/**
 * Ajouter une balise (tag) à un client Shopify
 * @param {string} customerId - ID du client Shopify
 * @param {string} tag - Balise à ajouter (une ou plusieurs séparées par des virgules)
 * @returns {Promise<Object>} Client mis à jour
 */
async function addTagToCustomer(customerId, tag) {
    try {
        if (!customerId) throw new Error('customerId requis');
        if (!tag || !tag.trim()) throw new Error('tag requis');

        // Récupérer le client pour obtenir les tags actuels
        const getUrl = `${BASE_URL}/customers/${customerId}.json`;
        const getResp = await fetch(getUrl, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!getResp.ok) {
            const errorText = await getResp.text();
            throw new Error(`Erreur récupération client: ${getResp.status} - ${errorText}`);
        }

        const currentData = await getResp.json();
        const currentCustomer = currentData.customer;
        const existingTagsString = currentCustomer.tags || '';

        // Normaliser et merger les tags
        const existingTags = existingTagsString
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const newTags = tag
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        for (const t of newTags) {
            // Éviter les doublons (case-insensitive)
            if (!existingTags.some(et => et.toLowerCase() === t.toLowerCase())) {
                existingTags.push(t);
            }
        }

        const updatedTags = existingTags.join(', ');

        // Mettre à jour le client avec les nouveaux tags
        const updateUrl = `${BASE_URL}/customers/${customerId}.json`;
        const payload = {
            customer: {
                id: customerId,
                tags: updatedTags
            }
        };

        const putResp = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!putResp.ok) {
            const errorText = await putResp.text();
            throw new Error(`Erreur mise à jour tags: ${putResp.status} - ${errorText}`);
        }

        const updated = await putResp.json();
        return updated.customer;
    } catch (error) {
        console.error('❌ Erreur dans addTagToCustomer:', error.message);
        throw error;
    }
}

/**
 * Récupérer tous les clients Shopify (avec pagination)
 * @param {number} limit - Nombre maximum de clients à récupérer
 * @returns {Promise<Array>} Liste de tous les clients
 */
async function getAllCustomers(limit = 250) {
    try {
        console.log(`🔍 Récupération de tous les clients Shopify (limite: ${limit})`);

        const url = `${BASE_URL}/customers.json?limit=${limit}`;
        console.log(`🌐 URL récupération: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`❌ Erreur récupération Shopify: ${response.status}`, errorData);
            throw new Error(`Erreur récupération clients: ${response.status} - ${JSON.stringify(errorData.errors || errorData.error)}`);
        }

        const data = await response.json();
        const customers = data.customers || [];
        console.log(`✅ ${customers.length} clients récupérés`);

        return customers;
    } catch (error) {
        console.error('❌ Erreur dans getAllCustomers:', error.message);
        throw error;
    }
}

/**
 * Afficher la configuration actuelle (pour debug)
 */
function getConfig() {
    return {
        SHOPIFY_STORE_DOMAIN,
        SHOPIFY_API_VERSION,
        BASE_URL,
        hasToken: !!SHOPIFY_ADMIN_TOKEN
    };
}

module.exports = {
    searchCustomers,
    createCustomer,
    updateCustomer,
    getConfig,
    addTagToCustomer,
    getAllCustomers
};

/**
 * Récupérer des clients dont le téléphone se termine par les 4 chiffres donnés
 * Parcourt la pagination Shopify jusqu'à trouver des correspondances ou atteindre la limite
 * @param {string} last4 - 4 derniers chiffres
 * @param {number} maxPages - Nombre max de pages à parcourir (250*maxPages clients max)
 * @returns {Promise<Array>} Clients correspondants
 */
async function getCustomersByLast4(last4, maxPages = 8) {
    if (!/^[0-9]{4}$/.test(last4)) {
        throw new Error('Paramètre last4 invalide');
    }

    let pageCount = 0;
    const startTs = Date.now();
    let urlNext = `${BASE_URL}/customers.json?limit=250&fields=id,first_name,last_name,email,phone,created_at,updated_at,default_address`;
    const matches = [];

    while (urlNext && pageCount < maxPages) {
        pageCount += 1;
        const resp = await fetch(urlNext, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Shopify customers.json error ${resp.status} - ${errorText}`);
        }

        const data = await resp.json();
        const customers = data.customers || [];

        for (const c of customers) {
            const phones = [];
            if (c.phone) phones.push(String(c.phone));
            if (c.default_address && c.default_address.phone) phones.push(String(c.default_address.phone));

            const hasMatch = phones.some(p => {
                const digits = p.replace(/\D/g, '');
                return digits.endsWith(last4);
            });

            if (hasMatch) {
                matches.push(c);
                // Retour rapide dès qu'on trouve au moins une correspondance
                if (matches.length >= 1) {
                    return matches;
                }
            }
        }

        // Si temps écoulé > 3s, on arrête pour éviter lenteur
        if (Date.now() - startTs > 3000) break;

        // Pagination via l'en-tête Link
        const link = resp.headers.get('link') || resp.headers.get('Link');
        if (link) {
            // Exemple: <https://shop/admin/api/2023-10/customers.json?limit=250&page_info=abc>; rel="previous", <...page_info=def>; rel="next"
            const parts = link.split(',');
            const nextPart = parts.find(p => p.includes('rel="next"'));
            if (nextPart) {
                const m = nextPart.match(/<([^>]+)>/);
                urlNext = m ? m[1] : null;
            } else {
                urlNext = null;
            }
        } else {
            urlNext = null;
        }
    }

    return matches;
}

module.exports.getCustomersByLast4 = getCustomersByLast4;

/**
 * Récupérer tous les clients avec pagination (Link rel=next)
 * @param {number} maxPages - Nombre max de pages à récupérer (250 par page)
 * @returns {Promise<Array>} Tous les clients récupérés
 */
async function getAllCustomersPaginated(maxPages = 8) {
    let pageCount = 0;
    let urlNext = `${BASE_URL}/customers.json?limit=250&fields=id,first_name,last_name,email,phone,created_at,updated_at,default_address`;
    const all = [];

    while (urlNext && pageCount < maxPages) {
        pageCount += 1;
        const resp = await fetch(urlNext, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Shopify customers.json error ${resp.status} - ${errorText}`);
        }

        const data = await resp.json();
        const customers = data.customers || [];
        for (const c of customers) all.push(c);

        const link = resp.headers.get('link') || resp.headers.get('Link');
        if (link) {
            const parts = link.split(',');
            const nextPart = parts.find(p => p.includes('rel="next"'));
            if (nextPart) {
                const m = nextPart.match(/<([^>]+)>/);
                urlNext = m ? m[1] : null;
            } else {
                urlNext = null;
            }
        } else {
            urlNext = null;
        }
    }

    return all;
}

module.exports.getAllCustomersPaginated = getAllCustomersPaginated;

/**
 * Recherche rapide via GraphQL par 4 derniers chiffres du téléphone
 * @param {string} last4
 * @param {number} first - nombre max de résultats (Shopify limite souvent à 50)
 */
async function searchCustomersByLast4GraphQL(last4, first = 50) {
    if (!/^[0-9]{4}$/.test(last4)) {
        throw new Error('Paramètre last4 invalide');
    }

    const q = `phone:*${last4}`;
    const query = `
      query($q: String!, $first: Int!) {
        customers(first: $first, query: $q) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              defaultAddress { phone }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const resp = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables: { q, first } })
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`GraphQL error ${resp.status} - ${text}`);
    }

    const data = await resp.json();
    const edges = data?.data?.customers?.edges || [];
    // Normaliser au format REST-like attendu côté front
    const customers = edges.map(e => {
        const n = e.node;
        return {
            id: n.id, // GraphQL donne un gid://, le front l'utilise juste comme identifiant
            first_name: n.firstName || '',
            last_name: n.lastName || '',
            email: n.email || '',
            phone: n.phone || (n.defaultAddress?.phone || ''),
            created_at: n.createdAt,
            updated_at: n.updatedAt
        };
    });

    // Filtrage sécurité côté serveur
    const filtered = customers.filter(c => String(c.phone || '').replace(/\D/g, '').endsWith(last4));
    return filtered;
}

module.exports.searchCustomersByLast4GraphQL = searchCustomersByLast4GraphQL;

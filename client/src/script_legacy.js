// Application de génération de tickets de cordonnerie - Version locale
let globalState = {
    currentTabId: 1,
    nextTabId: 2,
    tabs: {
        1: {
            id: 1,
            title: 'Ticket 1',
            nom: '',
            prenom: '',
            telephone: '',
            email: '',
            nbPaires: 0,
            paires: [], // Array of { id, prestations: [{type, prix}], total }
            jourRetrait: null,
            heureRetrait: null,
            total: 0,
            selectedCustomer: null, // Client local sélectionné
            paymentStatus: null, // 'paid' | 'unpaid' | null
            pasUrgent: false, // true si l'utilisateur a cliqué sur "pas urgent"
            avecSac: false, // true si l'utilisateur a cliqué sur "avec sac"
            accessoires: [], // Array des accessoires sélectionnés ['sac', 'housses', 'embau choirs', 'boite']
            noteRetrait: '', // Note pour le retrait
            createdAt: new Date().toISOString() // Date de création du ticket
        }
    }
};

// Fonction pour obtenir l'état de l'onglet actuel
function getCurrentTabState() {
    return globalState.tabs[globalState.currentTabId];
}

// Fonction pour définir l'état de l'onglet actuel
function setCurrentTabState(newState) {
    globalState.tabs[globalState.currentTabId] = { ...globalState.tabs[globalState.currentTabId], ...newState };
}

// Compatibilité : appState pointe vers l'onglet actuel
let appState = new Proxy({}, {
    get(target, prop) {
        return getCurrentTabState()[prop];
    },
    set(target, prop, value) {
        const currentState = getCurrentTabState();
        currentState[prop] = value;
        return true;
    }
});

// Prestations prédéfinies
const prestationsPredefinies = [
    { type: "Patins crêpe", prix: 28 },
    { type: "Patins mat", prix: 39 },
    { type: "Patins miroir", prix: 39 },
    { type: "Talons cuir", prix: 29 },
    { type: "Talons super", prix: 25 },
    { type: "Bloc talons", prix: 40 },
    { type: "Talons cranté", prix: 30 },
    { type: "Fers Triumph", prix: 25 },
    { type: "Fers LULU", prix: 25 }
];

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    // Masquer les sections par défaut (aucune paire sélectionnée au démarrage)
    toggleSectionsVisibility(false);
    updateTickets();
    
    // Ajuster la hauteur initiale du ticket cordonnier
    const ticketCordonnier = document.getElementById('ticket-cordonnier-content');
    if (ticketCordonnier) {
        adjustTextareaHeight(ticketCordonnier);
    }
});

// Configuration des écouteurs d'événements
function initializeEventListeners() {
    // Système d'onglets
    initializeTabSystem();
    
    // Champs de saisie principaux
    document.getElementById('nom').addEventListener('input', handleNomChange);
    document.getElementById('prenom').addEventListener('input', handlePrenomChange);
    document.getElementById('telephone').addEventListener('input', handleTelephoneChange);
    document.getElementById('email').addEventListener('input', handleEmailChange);
    
    // Configuration de l'autocomplétion locale
    setupLocalAutocomplete();
    
    // Sélection du nombre de paires
    document.querySelectorAll('.paire-btn').forEach(btn => {
        btn.addEventListener('click', handlePairesButtonClick);
    });
    document.getElementById('paires-select').addEventListener('change', handlePairesSelectChange);
    
    // Configuration du drag & drop pour les prestations
    initializeDragAndDrop();
    
    // Jours de retrait
    document.querySelectorAll('.jour-btn').forEach(btn => {
        btn.addEventListener('click', handleJourButtonClick);
    });
    
    // Heure de retrait
    document.getElementById('heure-retrait').addEventListener('change', handleHeureRetraitChange);

    // Bouton Pas urgent
    document.getElementById('pas-urgent-btn')?.addEventListener('click', handlePasUrgentClick);

    // Bouton Avec sac
    document.getElementById('avec-sac-btn')?.addEventListener('click', handleAvecSacClick);

    // Les événements des cases à cocher et options sont maintenant gérés dans attachTabEventListeners
    // pour éviter les conflits entre onglets

    // Fermer le menu quand on clique ailleurs
    document.addEventListener('click', function(event) {
        const sacMenu = document.querySelector('.sac-menu');
        const currentTabId = globalState.currentTabId;
        const sacMenuContentId = currentTabId === 1 ? 'sac-menu-content' : `sac-menu-content-${currentTabId}`;
        const sacMenuContent = document.getElementById(sacMenuContentId);

        if (sacMenu && sacMenuContent) {
            const isClickInsideMenu = sacMenu.contains(event.target);

            // Fermer le menu seulement si on clique complètement en dehors du menu
            if (!isClickInsideMenu) {
                // Petite pause pour laisser les autres événements se traiter
                setTimeout(() => {
                    if (sacMenu && sacMenu.classList.contains('active')) {
                        if (sacMenuContent) sacMenuContent.style.display = 'none';
                        sacMenu.classList.remove('active');
                    }
                }, 150);
            }
        }
    });

    // Bouton calendrier et sélecteur de date
    document.getElementById('calendar-btn')?.addEventListener('click', handleCalendarClick);
    document.getElementById('date-picker')?.addEventListener('change', handleDatePickerChange);

    // Actions principales
    document.getElementById('reinitialiser').addEventListener('click', handleReinitialiser);
    document.getElementById('create-customer-btn').addEventListener('click', handleCreateCustomerClick);
    document.getElementById('imprimer-client').addEventListener('click', () => handleImprimer('client'));
    document.getElementById('imprimer-cordonnier').addEventListener('click', () => handleImprimer('cordonnier'));

    // Les événements des boutons sont maintenant gérés dans attachTabEventListeners
    // pour éviter les conflits entre onglets

    // Attacher l'événement pour la note du premier onglet
    const firstNoteTextarea = document.getElementById('note-retrait');
    if (firstNoteTextarea) {
        firstNoteTextarea.addEventListener('input', handleNoteRetraitChange);
        console.log(`🔧 Attached note event for first tab: note-retrait`);
    } else {
        console.warn(`❌ First tab note-retrait textarea not found`);
    }

    // Bouton prestation personnalisée
    document.getElementById('add-custom').addEventListener('click', handleAddCustomPrestation);


    // Champ de recherche par ID (4 derniers chiffres)
    const searchIdInput = document.getElementById('search-id');
    if (searchIdInput) {
        searchIdInput.addEventListener('input', handleSearchIdChange);
    }

    // Boutons de paiement
    document.getElementById('payment-paid')?.addEventListener('click', () => setPaymentStatus('paid'));
    document.getElementById('payment-unpaid')?.addEventListener('click', () => setPaymentStatus('unpaid'));
    document.getElementById('payment-remaining')?.addEventListener('click', () => toggleRemainingAmount());

    // Boutons de paiement - reste à payer
    document.getElementById('confirm-remaining')?.addEventListener('click', confirmRemainingAmount);
    document.getElementById('cancel-remaining')?.addEventListener('click', cancelRemainingAmount);
    document.getElementById('remaining-amount')?.addEventListener('input', updatePaidAmountDisplay);

    // Afficher les prix sur les boutons de prestations
    displayPricesOnPrestationButtons();
}

// Afficher les prix sur les boutons de prestations
function displayPricesOnPrestationButtons() {
    const prestationButtons = document.querySelectorAll('.prestation-btn[data-prix]');

    prestationButtons.forEach(button => {
        const prix = button.getAttribute('data-prix');
        const currentText = button.textContent;

        if (prix && !currentText.includes('€')) {
            // Créer la structure avec le nom et le prix
            button.innerHTML = `
                <span class="prestation-name">${currentText}</span>
                <span class="prestation-price-on-button">${prix}€</span>
            `;
        }
    });
}


// Gestion du nom
function handleNomChange(event) {
    console.log('🔄 handleNomChange appelé:', event.target.value);
    const upperCaseValue = event.target.value.toUpperCase();
    appState.nom = upperCaseValue;
    event.target.value = upperCaseValue; // Mettre à jour la valeur affichée
    updateTickets();

    // Mettre à jour le titre de l'onglet
    updateTabTitle(globalState.currentTabId);

    // Synchronisation automatique avec Shopify si client sélectionné
    console.log('🔄 Déclenchement debouncedAutoSync depuis handleNomChange');
    debouncedAutoSync();

    // Vérifier si on peut créer automatiquement le client
    checkAndCreateNewClient();
}

// Gestion du prénom
function handlePrenomChange(event) {
    const upperCaseValue = event.target.value.toUpperCase();
    appState.prenom = upperCaseValue;
    event.target.value = upperCaseValue; // Mettre à jour la valeur affichée
    updateTickets();

    // Mettre à jour le titre de l'onglet
    updateTabTitle(globalState.currentTabId);

    // Synchronisation automatique avec Shopify si client sélectionné
    debouncedAutoSync();

    // Vérifier si on peut créer automatiquement le client
    checkAndCreateNewClient();
}

// ==================== FONCTIONS LOCALES ====================

// Utilitaire pour les délais (debounce)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Configuration des endpoints backend
const API_BASE_URL = window.location.origin; // Utilise le même domaine que l'app

// ==================== SYNCHRONISATION AUTOMATIQUE SHOPIFY ====================

// Fonction de synchronisation automatique avec Shopify
async function autoSyncWithShopify() {
    console.log('🔄 DEBUG autoSyncWithShopify - appState.selectedCustomer:', appState.selectedCustomer);
    
    // Vérifier si on a un client Shopify sélectionné
    if (!appState.selectedCustomer) {
        console.log('🔄 Pas de client sélectionné, pas de sync');
        return;
    }
    
    // Vérifier si c'est un client Shopify (a un ID numérique ou commence par 'gid://')
    const isShopifyCustomer = appState.selectedCustomer.shopify_customer || 
                             (appState.selectedCustomer.id && appState.selectedCustomer.id.toString().match(/^\d+$|^gid:/));
    
    if (!isShopifyCustomer) {
        console.log('🔄 Client local (pas Shopify), pas de sync');
        return;
    }
    
    const customerId = appState.selectedCustomer.id;
    const currentData = {
        prenom: appState.prenom || '',
        nom: appState.nom || '',
        telephone: appState.telephone || '',
        email: appState.email || ''
    };
    
    console.log('🔄 Synchronisation automatique avec Shopify pour client:', customerId, 'Données:', currentData);
    
    try {
        await updateShopifyCustomer(customerId, currentData);
        console.log('✅ Client synchronisé avec Shopify automatiquement');
        
        // Mettre à jour les données du client sélectionné
        if (appState.selectedCustomer) {
            appState.selectedCustomer.first_name = currentData.prenom;
            appState.selectedCustomer.last_name = currentData.nom;
            appState.selectedCustomer.phone = currentData.telephone;
            appState.selectedCustomer.email = currentData.email;
        }
        
        showTemporaryMessage('Client synchronisé avec Shopify', 'success');
    } catch (error) {
        console.error('❌ Erreur synchronisation automatique:', error);
        showTemporaryMessage('Erreur de synchronisation Shopify', 'warning');
    }
}

// Fonction de synchronisation avec debounce pour éviter trop d'appels
const debouncedAutoSync = debounce(autoSyncWithShopify, 2000);

// Fonction de test accessible depuis la console
window.testAutoSync = function() {
    console.log('🧪 Test manuel de synchronisation...');
    console.log('🧪 appState:', {
        selectedCustomer: appState.selectedCustomer,
        nom: appState.nom,
        prenom: appState.prenom,
        telephone: appState.telephone,
        email: appState.email
    });
    autoSyncWithShopify();
};

// ==================== FONCTIONS SHOPIFY ====================

// Rechercher des clients sur Shopify via backend
async function searchShopifyCustomers(query) {
    console.log('🔍 Recherche Shopify via backend pour:', query);
    
    try {
        const apiUrl = `${API_BASE_URL}/api/customers/search?query=${encodeURIComponent(query)}`;
        console.log('🌐 URL API:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Réponse API:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Erreur API: ${response.status} - ${errorData.error}`);
        }

        const data = await response.json();
        console.log('✅ Données reçues de l\'API:', data);
        
        return data.customers || [];
    } catch (error) {
        console.error('❌ Erreur recherche via API:', error);
        console.log('🔄 Fallback vers recherche locale');
        showTemporaryMessage('API Shopify non disponible, recherche locale utilisée', 'info');
        return [];
    }
}

// Créer un client sur Shopify via backend
async function createShopifyCustomer(customerData) {
    console.log('➕ Création client Shopify via backend:', customerData);
    
    try {
        const apiUrl = `${API_BASE_URL}/api/customers`;
        console.log('🌐 URL création:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });

        console.log('📊 Réponse création API:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Erreur création: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Client créé via API:', data.customer.id);
        return data.customer;
    } catch (error) {
        console.error('❌ Erreur création via API:', error);
        throw error;
    }
}

// Extraire l'ID numérique d'un ID Shopify (gid:// ou numérique)
function extractNumericId(shopifyId) {
    if (!shopifyId) return null;
    
    // Si c'est un gid GraphQL (gid://shopify/Customer/123456789)
    if (shopifyId.toString().startsWith('gid://')) {
        const match = shopifyId.match(/\/(\d+)$/);
        return match ? match[1] : null;
    }
    
    // Si c'est déjà un ID numérique
    if (shopifyId.toString().match(/^\d+$/)) {
        return shopifyId.toString();
    }
    
    return null;
}

// Mettre à jour un client sur Shopify via backend
async function updateShopifyCustomer(customerId, customerData) {
    console.log('📝 Mise à jour client Shopify via backend:', customerId, customerData);
    
    const numericId = extractNumericId(customerId);
    if (!numericId) {
        throw new Error(`ID client invalide: ${customerId}`);
    }
    
    try {
        const apiUrl = `${API_BASE_URL}/api/customers/${numericId}`;
        console.log('🌐 URL mise à jour:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });

        console.log('📊 Réponse mise à jour API:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Erreur mise à jour: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Client mis à jour via API:', data.customer.id);
        return data.customer;
    } catch (error) {
        console.error('❌ Erreur mise à jour via API:', error);
        throw error;
    }
}

// Convertir un client Shopify vers le format local
function convertShopifyCustomer(shopifyCustomer) {
    return {
        id: shopifyCustomer.id,
        first_name: shopifyCustomer.first_name || '',
        last_name: shopifyCustomer.last_name || '',
        email: shopifyCustomer.email || '',
        phone: shopifyCustomer.phone || '',
        shopify_customer: true,
        created_at: shopifyCustomer.created_at,
        updated_at: shopifyCustomer.updated_at
    };
}

// Gestionnaire pour la recherche par ID (4 derniers chiffres du téléphone)
async function handleSearchIdChange(event) {
    const searchValue = event.target.value.trim();
    
    // Valider l'entrée - seulement des chiffres, maximum 4
    if (searchValue && !/^\d{1,4}$/.test(searchValue)) {
        event.target.value = searchValue.replace(/\D/g, '').substring(0, 4);
        return;
    }
    
    // Si moins de 4 chiffres, ne pas effectuer de recherche
    if (searchValue.length < 4) {
        clearSuggestions();
        return;
    }
    
    console.log(`🔍 Recherche par 4 derniers chiffres: ${searchValue}`);
    
    try {
        // Endpoint dédié côté serveur qui pagine et filtre côté Shopify
        const apiUrl = `${API_BASE_URL}/api/customers/search-last4?last4=${encodeURIComponent(searchValue)}`;
        console.log('🌐 URL API search-last4:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Réponse API search-last4:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Erreur API search-last4: ${response.status} - ${errorData.error}`);
        }

        const data = await response.json();
        const filteredCustomers = data.customers || [];

        console.log(`✅ ${filteredCustomers.length} clients trouvés (serveur) pour #${searchValue}`);

        if (filteredCustomers.length > 0) {
            displayLocalSuggestions(filteredCustomers, `#${searchValue}`);
        } else {
            clearSuggestions();
            showTemporaryMessage(`Aucun client trouvé avec un téléphone se terminant par ${searchValue}`, 'info');
        }
    } catch (error) {
        console.error('❌ Erreur recherche par ID:', error);
        clearSuggestions();
        showTemporaryMessage('Erreur lors de la recherche par ID', 'error');
    }
}

// Fonction pour vider les suggestions
function clearSuggestions() {
    const currentTabId = globalState.currentTabId;
    let suggestionsList = document.getElementById(`suggestions-list-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!suggestionsList) {
        suggestionsList = document.getElementById('suggestions-list');
    }
    
    if (suggestionsList) {
        suggestionsList.classList.remove('active');
        suggestionsList.innerHTML = '';
    }
}

// Base de données locale des clients (fallback)
let localCustomers = [
    {
        id: 1,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont@email.com',
        phone: '06 12 34 56 78'
    },
    {
        id: 2,
        first_name: 'Marie',
        last_name: 'Martin',
        email: 'marie.martin@email.com',
        phone: '06 98 76 54 32'
    },
    {
        id: 3,
        first_name: 'Pierre',
        last_name: 'Bernard',
        email: 'pierre.bernard@email.com',
        phone: '06 55 44 33 22'
    },
    {
        id: 4,
        first_name: 'Sophie',
        last_name: 'Dubois',
        email: 'sophie.dubois@email.com',
        phone: '06 77 88 99 11'
    },
    {
        id: 5,
        first_name: 'Michel',
        last_name: 'Garcia',
        email: 'michel.garcia@email.com',
        phone: '06 22 33 44 55'
    }
];

// Configuration de l'autocomplétion Shopify + locale
function setupLocalAutocomplete() {
    // Trouver le champ nom de l'onglet actuel
    const currentTabId = globalState.currentTabId;
    let nomInput = document.getElementById(`nom-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!nomInput) {
        nomInput = document.getElementById('nom');
    }
    
    // Trouver la liste de suggestions de l'onglet actuel
    let suggestionsList = document.getElementById(`suggestions-list-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!suggestionsList) {
        suggestionsList = document.getElementById('suggestions-list');
    }
    
    let currentHighlight = -1;
    let suggestions = [];
    
    // Si pas de champ nom trouvé, ne pas configurer l'autocomplétion
    if (!nomInput) {
        console.warn('⚠️ Champ nom non trouvé pour l\'onglet', currentTabId);
        return;
    }
    
    // Si pas de liste de suggestions trouvée, ne pas configurer l'autocomplétion
    if (!suggestionsList) {
        console.warn('⚠️ Liste de suggestions non trouvée pour l\'onglet', currentTabId);
        return;
    }
    
    console.log('✅ Autocomplétion configurée pour l\'onglet', currentTabId, 'sur le champ:', nomInput.id, 'et la liste:', suggestionsList.id);

    // Supprimer les anciens événements pour éviter les doublons
    nomInput.removeEventListener('input', nomInput._autocompleteHandler);
    nomInput.removeEventListener('keydown', nomInput._keydownHandler);
    
    // Recherche avec délai
    const debouncedSearch = debounce(async (query) => {
        console.log('🎯 Recherche déclenchée pour:', query);
        console.log('🎯 Onglet actuel:', globalState.currentTabId);
        
        if (query.length < 1) {
            hideSuggestions();
            clearNewClientIndicator();
            return;
        }

        // Afficher un indicateur de chargement
        console.log('⏳ Affichage de l\'indicateur de chargement...');
        displayLoadingIndicator();

        try {
            // D'abord chercher sur Shopify
            console.log('🛒 Début recherche Shopify...');
            const shopifyCustomers = await searchShopifyCustomers(query);
            console.log('🛒 Résultats Shopify:', shopifyCustomers.length, 'clients trouvés');
            
            let allCustomers = [];

            if (shopifyCustomers.length > 0) {
                // Convertir les clients Shopify et les trier par pertinence
                const convertedCustomers = shopifyCustomers.map(convertShopifyCustomer);
                allCustomers = sortCustomersByRelevance(convertedCustomers, query);
                console.log('✅ Clients Shopify convertis et triés:', allCustomers);
                clearNewClientIndicator();
            } else {
                // Fallback vers la recherche locale
                console.log('🏠 Fallback vers recherche locale...');
                allCustomers = searchLocalCustomers(query);
                console.log('🏠 Résultats locaux:', allCustomers.length, 'clients trouvés');
                
                // Si aucun client trouvé, marquer comme nouveau client potentiel
                if (allCustomers.length === 0) {
                    showNewClientIndicator(query);
                } else {
                    clearNewClientIndicator();
                }
            }

            suggestions = allCustomers;
            displayLocalSuggestions(allCustomers, query);
        } catch (error) {
            console.error('💥 Erreur dans debouncedSearch:', error);
            showTemporaryMessage('Erreur de recherche', 'error');
        }
    }, 500);

    // Événement de saisie
    const inputHandler = (e) => {
        const query = e.target.value.trim();
        currentHighlight = -1;
        
        console.log('📝 Input détecté sur', nomInput.id, 'avec la valeur:', query);

        if (query.length === 0) {
            hideSuggestions();
            clearCustomerSelection();
            return;
        }

        console.log('🚀 Lancement de la recherche pour:', query);
        debouncedSearch(query);
    };
    
    nomInput._autocompleteHandler = inputHandler;
    nomInput.addEventListener('input', inputHandler);

    // Navigation au clavier
    const keydownHandler = (e) => {
        const items = suggestionsList.querySelectorAll('.suggestion-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentHighlight = Math.min(currentHighlight + 1, items.length - 1);
                highlightSuggestion(currentHighlight);
                break;

            case 'ArrowUp':
                e.preventDefault();
                currentHighlight = Math.max(currentHighlight - 1, -1);
                highlightSuggestion(currentHighlight);
                break;

            case 'Enter':
                e.preventDefault();
                if (currentHighlight >= 0 && items[currentHighlight]) {
                    selectCustomer(suggestions[currentHighlight]);
                }
                break;

            case 'Escape':
                hideSuggestions();
                currentHighlight = -1;
                break;
        }
    };
    
    nomInput._keydownHandler = keydownHandler;
    nomInput.addEventListener('keydown', keydownHandler);

    // Fermer les suggestions quand on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!nomInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            hideSuggestions();
        }
    });
}

// Rechercher des clients dans la base locale
// Recherche locale dans les clients sauvegardés avec scoring de pertinence
function searchLocalCustomers(query) {
    const queryLower = query.toLowerCase().trim();
    
    if (!queryLower) return [];
    
    // Calculer un score de pertinence pour chaque client
    const scoredCustomers = localCustomers.map(customer => {
        const firstName = (customer.first_name || '').toLowerCase();
        const lastName = (customer.last_name || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').replace(/\D/g, ''); // Nettoyer le téléphone
        const queryClean = queryLower.replace(/\D/g, ''); // Pour recherche téléphone
        
        let score = 0;
        
        // Score pour correspondance exacte au début (poids le plus élevé)
        if (firstName.startsWith(queryLower)) score += 100;
        if (lastName.startsWith(queryLower)) score += 100;
        
        // Score pour correspondance exacte complète
        if (firstName === queryLower) score += 200;
        if (lastName === queryLower) score += 200;
        
        // Score pour correspondance partielle au début
        if (firstName.includes(queryLower) && firstName.indexOf(queryLower) === 0) score += 80;
        if (lastName.includes(queryLower) && lastName.indexOf(queryLower) === 0) score += 80;
        
        // Score pour correspondance partielle
        if (firstName.includes(queryLower)) score += 50;
        if (lastName.includes(queryLower)) score += 50;
        
        // Score pour email
        if (email.startsWith(queryLower)) score += 60;
        if (email.includes(queryLower)) score += 30;
        
        // Score pour téléphone (si query contient des chiffres)
        if (queryClean.length >= 3 && phone.includes(queryClean)) {
            score += 70;
            // Bonus si correspondance au début du numéro
            if (phone.startsWith(queryClean)) score += 30;
        }
        
        // Bonus pour nom complet (prénom + nom ou nom + prénom)
        const fullName1 = `${firstName} ${lastName}`;
        const fullName2 = `${lastName} ${firstName}`;
        if (fullName1.includes(queryLower) || fullName2.includes(queryLower)) {
            score += 40;
        }
        
        // Pénalité pour correspondances très partielles
        if (queryLower.length >= 3) {
            const minLength = Math.min(firstName.length, lastName.length, email.length);
            if (score > 0 && score < 30 && minLength > queryLower.length * 3) {
                score *= 0.5; // Réduire le score pour les correspondances trop vagues
            }
        }
        
        return { customer, score };
    })
    .filter(item => item.score > 0) // Garder seulement ceux avec un score positif
    .sort((a, b) => b.score - a.score) // Trier par score décroissant
    .map(item => item.customer); // Extraire seulement les clients
    
    return scoredCustomers;
}

// Trier les clients par pertinence (utilisé pour Shopify et résultats combinés)
function sortCustomersByRelevance(customers, query) {
    const queryLower = query.toLowerCase().trim();
    
    if (!queryLower || !customers || customers.length === 0) return customers;
    
    // Calculer un score de pertinence pour chaque client
    const scoredCustomers = customers.map(customer => {
        const firstName = (customer.first_name || '').toLowerCase();
        const lastName = (customer.last_name || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').replace(/\D/g, '');
        const queryClean = queryLower.replace(/\D/g, '');
        
        let score = 0;
        
        // Score pour correspondance exacte complète (priorité maximale)
        if (firstName === queryLower) score += 300;
        if (lastName === queryLower) score += 300;
        
        // Score pour correspondance exacte au début
        if (firstName.startsWith(queryLower)) score += 150;
        if (lastName.startsWith(queryLower)) score += 150;
        
        // Score pour correspondance partielle au début
        if (firstName.includes(queryLower)) {
            const position = firstName.indexOf(queryLower);
            score += position === 0 ? 100 : Math.max(50 - position * 5, 10);
        }
        if (lastName.includes(queryLower)) {
            const position = lastName.indexOf(queryLower);
            score += position === 0 ? 100 : Math.max(50 - position * 5, 10);
        }
        
        // Score pour email
        if (email.startsWith(queryLower)) score += 80;
        if (email.includes(queryLower)) score += 40;
        
        // Score pour téléphone
        if (queryClean.length >= 3 && phone.includes(queryClean)) {
            score += 90;
            if (phone.startsWith(queryClean)) score += 50;
        }
        
        // Bonus pour nom complet
        const fullName1 = `${firstName} ${lastName}`;
        const fullName2 = `${lastName} ${firstName}`;
        if (fullName1.startsWith(queryLower) || fullName2.startsWith(queryLower)) {
            score += 120;
        } else if (fullName1.includes(queryLower) || fullName2.includes(queryLower)) {
            score += 60;
        }
        
        // Bonus pour clients Shopify (légèrement prioritaires)
        if (customer.shopify_customer) {
            score += 5;
        }
        
        return { customer, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
        // Tri principal par score
        if (b.score !== a.score) return b.score - a.score;
        
        // Tri secondaire par ordre alphabétique
        const nameA = `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim();
        const nameB = `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
    })
    .map(item => item.customer);
    
    return scoredCustomers;
}

// Afficher un indicateur de chargement
function displayLoadingIndicator() {
    const currentTabId = globalState.currentTabId;
    let suggestionsList = document.getElementById(`suggestions-list-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!suggestionsList) {
        suggestionsList = document.getElementById('suggestions-list');
    }
    
    if (suggestionsList) {
        suggestionsList.innerHTML = '<div class="loading-indicator">🔍 Recherche en cours...</div>';
        suggestionsList.classList.add('active');
    }
}

// Variables globales pour le nouveau client
let isNewClient = false;
let newClientData = {};

// Afficher l'indicateur de nouveau client
function showNewClientIndicator(query) {
    isNewClient = true;
    newClientData = { searchedName: query };
    
    // Ajouter une classe CSS au formulaire pour indiquer un nouveau client
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.add('new-client-mode');
    }
    
    // Mode nouveau client activé silencieusement (plus de message informatif)
    
    console.log('🆕 Mode nouveau client activé pour:', query);
}

// Effacer l'indicateur de nouveau client
function clearNewClientIndicator() {
    isNewClient = false;
    newClientData = {};
    
    // Retirer la classe CSS
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('new-client-mode');
    }
    
    // Retirer le message d'information
    const infoDiv = document.querySelector('.new-client-info');
    if (infoDiv) {
        infoDiv.remove();
    }
    
    console.log('🔄 Mode nouveau client désactivé');
}

// Vérifier si on peut créer automatiquement le client
async function checkAndCreateNewClient() {
    // Seulement si on est en mode nouveau client
    if (!isNewClient) return;

    // Éviter les créations multiples
    if (newClientData.isCreating) {
        return;
    }

    // Vérifier si les champs requis sont remplis (moins restrictif)
    const nom = appState.nom.trim();
    const prenom = appState.prenom.trim();
    const telephone = appState.telephone.trim();

    // Critères minimum : nom OU prénom ET téléphone valide
    if ((!nom && !prenom) || !telephone || telephone.length < 10) {
        return;
    }

    try {
        newClientData.isCreating = true;

        // Afficher un indicateur de création
        showCreatingClientIndicator();

        console.log('🚀 Création automatique du client...');

        const customerData = {
            nom: nom || '',
            prenom: prenom || '',
            telephone: telephone,
            email: appState.email.trim() || null
        };

        // Créer le client sur Shopify
        const newCustomer = await createShopifyCustomer(customerData);

        // Convertir et sélectionner
        const convertedCustomer = convertShopifyCustomer(newCustomer);
        appState.selectedCustomer = convertedCustomer;

        // Nettoyer l'interface
        clearNewClientIndicator();
        hideCreatingClientIndicator();

        // Afficher un message de succès
        const displayName = prenom && nom ? `${prenom} ${nom}` : nom || prenom || 'Client';
        showTemporaryMessage(`✅ Client ${displayName} créé automatiquement dans Shopify`, 'success');

        console.log('✅ Client créé automatiquement:', newCustomer.id);

    } catch (error) {
        console.error('❌ Erreur création automatique:', error);
        newClientData.isCreating = false;
        hideCreatingClientIndicator();

        // En cas d'erreur, afficher un message temporaire
        showTemporaryMessage(`❌ Erreur création automatique - Utilisez le bouton "Créer client"`, 'error');
    }
}

// Afficher l'indicateur de création en cours
function showCreatingClientIndicator() {
    // Plus d'affichage de message - création silencieuse
    console.log('⏳ Création du client dans Shopify en cours...');
}

// Masquer l'indicateur de création
function hideCreatingClientIndicator() {
    // Rien à faire, sera nettoyé par clearNewClientIndicator()
}

// Afficher les suggestions locales/Shopify
function displayLocalSuggestions(customers, originalQuery = '') {
    const currentTabId = globalState.currentTabId;
    let suggestionsList = document.getElementById(`suggestions-list-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!suggestionsList) {
        suggestionsList = document.getElementById('suggestions-list');
    }

    if (customers.length === 0) {
        // Masquer les suggestions quand aucun client n'est trouvé
        suggestionsList.classList.remove('active');
        suggestionsList.innerHTML = '';
        return;
    }

    const html = customers.map((customer, index) => {
        const displayName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Client sans nom';
        const phone = customer.phone || 'Pas de téléphone';
        const email = customer.email || 'Pas d\'email';
        const isShopify = customer.shopify_customer;

        return `
            <div class="suggestion-item" data-index="${index}">
                <div class="suggestion-content">
                <div class="customer-name">
                    ${displayName}
                        ${isShopify ? '<span class="shopify-indicator">🛒 Shopify</span>' : ''}
                </div>
                <div class="customer-details">
                    📞 ${phone} • ✉️ ${email}
                    </div>
                </div>
                <div class="suggestion-actions">
                    <button class="edit-customer-btn" onclick="editCustomer(${index})" title="Modifier ce client">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    suggestionsList.innerHTML = html;
    suggestionsList.classList.add('active');

    // Sauvegarder les clients pour l'édition
    window.currentSuggestions = customers;

    // Ajouter les événements de clic
    suggestionsList.querySelectorAll('.suggestion-item').forEach((item, index) => {
        // Clic sur le contenu pour sélectionner (pas sur les boutons)
        const contentDiv = item.querySelector('.suggestion-content');
        contentDiv.addEventListener('click', () => selectCustomer(customers[index]));
    });
}

// Sélectionner un client
function selectCustomer(customer) {
    // Désactiver le mode nouveau client car on a sélectionné un client existant
    clearNewClientIndicator();
    
    // Trouver les champs de l'onglet actuel
    const currentTabId = globalState.currentTabId;
    let nomInput = document.getElementById(`nom-${currentTabId}`);
    let prenomInput = document.getElementById(`prenom-${currentTabId}`);
    let telephoneInput = document.getElementById(`telephone-${currentTabId}`);
    let emailInput = document.getElementById(`email-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!nomInput) nomInput = document.getElementById('nom');
    if (!prenomInput) prenomInput = document.getElementById('prenom');
    if (!telephoneInput) telephoneInput = document.getElementById('telephone');
    if (!emailInput) emailInput = document.getElementById('email');

    console.log('🎯 Sélection client pour onglet', currentTabId);
    console.log('🎯 Champs trouvés:', {
        nom: nomInput?.id,
        prenom: prenomInput?.id,
        telephone: telephoneInput?.id,
        email: emailInput?.id
    });

    // Remplir les champs (correction des noms Shopify)
    appState.nom = (customer.last_name || '').toUpperCase(); // last_name Shopify → champ Nom
    appState.prenom = (customer.first_name || '').toUpperCase(); // first_name Shopify → champ Prénom
    appState.telephone = customer.phone || '';
    appState.email = customer.email || '';
    appState.selectedCustomer = customer;

    console.log('🎯 Valeurs à remplir:', {
        nom: appState.nom,
        prenom: appState.prenom,
        telephone: appState.telephone,
        email: appState.email
    });

    if (nomInput) nomInput.value = appState.nom;
    if (prenomInput) prenomInput.value = appState.prenom;
    if (telephoneInput) telephoneInput.value = formatPhoneNumber(appState.telephone);
    if (emailInput) emailInput.value = appState.email;

    // Mettre à jour le titre de l'onglet avec le nom du client
    updateTabTitle(currentTabId);

    hideSuggestions();
    updateTickets();

    const source = customer.shopify_customer ? 'Shopify' : 'local';
    showTemporaryMessage(`Client ${customer.first_name} ${customer.last_name} sélectionné (${source})`, 'success');
}

// Éditer un client
function editCustomer(index) {
    const customer = window.currentSuggestions[index];
    if (!customer) return;

    // Créer la modal d'édition
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog edit-customer-modal">
            <div class="modal-header">
                <h3><i class="fas fa-user-edit"></i> Modifier le client</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <form id="edit-customer-form">
                    <div class="form-group">
                        <label for="edit-prenom">Prénom :</label>
                        <input type="text" id="edit-prenom" value="${customer.first_name || ''}" class="form-input" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="edit-nom">Nom :</label>
                        <input type="text" id="edit-nom" value="${customer.last_name || ''}" class="form-input" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="edit-telephone">Téléphone :</label>
                        <input type="tel" id="edit-telephone" value="${customer.phone || ''}" class="form-input" autocomplete="off" maxlength="10" pattern="[0-9]*">
                    </div>
                    <div class="form-group">
                        <label for="edit-email">Email :</label>
                        <input type="email" id="edit-email" value="${customer.email || ''}" class="form-input" autocomplete="off" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-confirm-cancel" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
                <button type="button" class="btn-confirm-ok" id="save-customer-btn">
                    <i class="fas fa-save"></i> Enregistrer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Gérer la sauvegarde
    const saveBtn = overlay.querySelector('#save-customer-btn');
    saveBtn.addEventListener('click', async () => {
        const updatedData = {
            prenom: document.getElementById('edit-prenom').value.trim(),
            nom: document.getElementById('edit-nom').value.trim(),
            telephone: document.getElementById('edit-telephone').value.trim(),
            email: document.getElementById('edit-email').value.trim()
        };

        // Validation minimale
        if (!updatedData.prenom && !updatedData.nom) {
            showTemporaryMessage('Veuillez saisir au moins un nom ou prénom', 'error');
            return;
        }

        // Désactiver le bouton pendant la sauvegarde
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';

        try {
            await updateCustomer(customer, updatedData);
            overlay.remove();
            
            // Rafraîchir la recherche actuelle
            const nomInput = document.getElementById('nom');
            if (nomInput.value.trim()) {
                // Relancer la recherche pour afficher les données mises à jour
                const query = nomInput.value.trim();
                setTimeout(() => {
                    const debouncedSearch = setupLocalAutocomplete.__debouncedSearch;
                    if (debouncedSearch) debouncedSearch(query);
                }, 100);
            }
        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            showTemporaryMessage(`Erreur: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
        }
    });

    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Mettre à jour un client existant
async function updateCustomer(customer, updatedData) {
    console.log('📝 Mise à jour du client:', customer.id, updatedData);

    if (customer.shopify_customer && customer.id) {
        // Client Shopify - mise à jour via API
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/${customer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erreur réseau' }));
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const updatedCustomer = await response.json();
            console.log('✅ Client Shopify mis à jour:', updatedCustomer);
            
            showTemporaryMessage(`✅ Client ${updatedData.prenom || ''} ${updatedData.nom || ''} mis à jour dans Shopify`, 'success');
            return updatedCustomer;

        } catch (error) {
            console.error('❌ Erreur mise à jour Shopify:', error);
            throw new Error(`Impossible de mettre à jour le client Shopify: ${error.message}`);
        }
    } else {
        // Client local - mise à jour dans localStorage
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const customerIndex = customers.findIndex(c => 
            c.first_name === customer.first_name && 
            c.last_name === customer.last_name && 
            c.phone === customer.phone
        );

        if (customerIndex !== -1) {
            customers[customerIndex] = {
                ...customers[customerIndex],
                first_name: updatedData.prenom,
                last_name: updatedData.nom,
                phone: updatedData.telephone,
                email: updatedData.email
            };

            localStorage.setItem('customers', JSON.stringify(customers));
            console.log('✅ Client local mis à jour');
            showTemporaryMessage(`✅ Client ${updatedData.prenom || ''} ${updatedData.nom || ''} mis à jour localement`, 'success');
            return customers[customerIndex];
        } else {
            throw new Error('Client local introuvable');
        }
    }
}

// Afficher la modal de création de client
function showCreateCustomerModal(searchQuery) {
    // Créer la modal
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    // Essayer de parser le nom/prénom depuis la recherche
    let prenom = '';
    let nom = '';
    const parts = searchQuery.trim().split(' ');

    if (parts.length === 1) {
        // Un seul mot - pourrait être nom ou prénom
        if (parts[0].length > 3) {
            nom = parts[0];
        } else {
            prenom = parts[0];
        }
    } else if (parts.length >= 2) {
        prenom = parts[0];
        nom = parts.slice(1).join(' ');
    }

    overlay.innerHTML = `
        <div class="confirm-dialog" style="max-width: 500px;">
            <div class="confirm-content">
                <h3>Créer un nouveau client</h3>
                <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Prénom:</label>
                        <input type="text" id="new-customer-prenom" value="${prenom}" placeholder="Prénom" autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    <div>
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Nom:</label>
                        <input type="text" id="new-customer-nom" value="${nom}" placeholder="Nom" autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    <div>
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Téléphone:</label>
                        <input type="tel" id="new-customer-telephone" placeholder="06 12 34 56 78" autocomplete="off" maxlength="10" pattern="[0-9]*" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    <div>
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Email (optionnel):</label>
                        <input type="email" id="new-customer-email" placeholder="client@email.com" autocomplete="off" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                </div>
                <div class="confirm-actions" style="margin-top: 20px;">
                    <button class="btn-confirm-cancel">Annuler</button>
                    <button class="btn-confirm-ok">Créer le client</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Focus sur le premier champ vide
    const firstEmptyField = prenom ? document.getElementById('new-customer-nom') : document.getElementById('new-customer-prenom');
    firstEmptyField.focus();

    // Gestion des boutons
    overlay.querySelector('.btn-confirm-ok').addEventListener('click', async () => {
        const customerData = {
            prenom: document.getElementById('new-customer-prenom').value.trim(),
            nom: document.getElementById('new-customer-nom').value.trim(),
            telephone: document.getElementById('new-customer-telephone').value.trim(),
            email: document.getElementById('new-customer-email').value.trim()
        };

        // Validation
        if (!customerData.prenom && !customerData.nom) {
            showTemporaryMessage('Veuillez saisir au moins un prénom ou un nom', 'error');
            return;
        }

        try {
            // Créer le client sur Shopify
            const newCustomer = await createShopifyCustomer(customerData);

            // Convertir et sélectionner
            const convertedCustomer = convertShopifyCustomer(newCustomer);
            selectCustomer(convertedCustomer);

            // Fermer la modal
            document.body.removeChild(overlay);

            showTemporaryMessage(`Client ${customerData.prenom} ${customerData.nom} créé et sélectionné`, 'success');

        } catch (error) {
            showTemporaryMessage(`Erreur création client: ${error.message}`, 'error');
        }
    });

    overlay.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// Effacer la sélection client
function clearCustomerSelection() {
    appState.selectedCustomer = null;
}

// Masquer les suggestions
function hideSuggestions() {
    const currentTabId = globalState.currentTabId;
    let suggestionsList = document.getElementById(`suggestions-list-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!suggestionsList) {
        suggestionsList = document.getElementById('suggestions-list');
    }
    
    if (suggestionsList) {
        suggestionsList.classList.remove('active');
        suggestionsList.innerHTML = '';
    }
}

// Formater le numéro de téléphone
function formatPhoneNumber(phone) {
    if (!phone) return '';

    // Nettoyer le numéro
    let cleaned = phone.replace(/\D/g, '');

    // Formater selon le format français si c'est un numéro français
    if (cleaned.startsWith('33')) {
        cleaned = '0' + cleaned.substring(2);
    }

    // Formater en groupes de 2
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }

    return phone; // Retourner le numéro original si pas de format reconnu
}

// ==================== FIN FONCTIONS LOCALES ====================

// Gestion du téléphone avec formatage et limite à 10 chiffres
function handleTelephoneChange(event) {
    let value = event.target.value.replace(/\D/g, ''); // Supprimer tout ce qui n'est pas un chiffre

    // Limiter à 10 chiffres maximum pour éviter le dépassement
    if (value.length > 10) {
        value = value.substring(0, 10);
    }

    // Formater le numéro de manière plus flexible
    let formattedValue = value;
    
    // Formatage progressif selon la longueur
    if (value.length === 0) {
        formattedValue = '';
    } else if (value.length === 1) {
        formattedValue = value;
    } else if (value.length === 2) {
        formattedValue = value;
    } else if (value.length === 3) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2);
    } else if (value.length === 4) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2);
    } else if (value.length === 5) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4);
    } else if (value.length === 6) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4);
    } else if (value.length === 7) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4, 6) + ' ' + value.substring(6);
    } else if (value.length === 8) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4, 6) + ' ' + value.substring(6);
    } else if (value.length === 9) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4, 6) + ' ' + value.substring(6, 8) + ' ' + value.substring(8);
    } else if (value.length === 10) {
        formattedValue = value.substring(0, 2) + ' ' + value.substring(2, 4) + ' ' + value.substring(4, 6) + ' ' + value.substring(6, 8) + ' ' + value.substring(8, 10);
    }

    // Vérifier que la valeur formatée ne dépasse pas la limite du champ (avec espaces)
    if (formattedValue.length > 14) { // Sécurité pour éviter tout dépassement
        formattedValue = formattedValue.substring(0, 14);
    }

    // Ne mettre à jour que si la valeur a vraiment changé pour éviter les conflits
    if (event.target.value !== formattedValue) {
        event.target.value = formattedValue;
    }
    
    appState.telephone = value; // Stocker les chiffres sans espaces
    updateTickets();

    // Synchronisation automatique avec Shopify si client sélectionné
    debouncedAutoSync();

    // Vérifier si on peut créer automatiquement le client
    checkAndCreateNewClient();
}

// Gestion de l'email
function handleEmailChange(event) {
    appState.email = event.target.value;
    updateTickets();
    
    // Synchronisation automatique avec Shopify si client sélectionné
    debouncedAutoSync();
    
    // Vérifier si on peut créer automatiquement le client
    checkAndCreateNewClient();
}

// Gestion du bouton de création manuelle de client
function handleCreateCustomerClick(event) {
    event.preventDefault();

    const nom = appState.nom.trim();
    const prenom = appState.prenom.trim();
    const telephone = appState.telephone.trim();
    const email = appState.email.trim();

    // Vérification minimale : au moins un nom
    if (!nom && !prenom) {
        showTemporaryMessage('Veuillez saisir au moins un nom ou prénom', 'error');
        return;
    }

    // Désactiver le bouton pendant la création
    const currentTabId = globalState.currentTabId;
    const buttonId = currentTabId === 1 ? 'create-customer-btn' : `create-customer-btn-${currentTabId}`;
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
    }

    createManualCustomer({
        nom: nom || '',
        prenom: prenom || '',
        telephone: telephone || '',
        email: email || ''
    }).finally(() => {
        // Réactiver le bouton
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-user-plus"></i> Créer client';
    });
}

// Création manuelle d'un client (avec moins de restrictions)
async function createManualCustomer(customerData) {
    try {
        console.log('👤 Création manuelle du client...');

        // Créer le client sur Shopify
        const newCustomer = await createShopifyCustomer(customerData);

        // Convertir et sélectionner
        const convertedCustomer = convertShopifyCustomer(newCustomer);
        appState.selectedCustomer = convertedCustomer;

        // Nettoyer l'interface
        clearNewClientIndicator();

        // Afficher un message de succès
        const displayName = customerData.prenom && customerData.nom
            ? `${customerData.prenom} ${customerData.nom}`
            : customerData.nom || customerData.prenom || 'Client';
        showTemporaryMessage(`✅ Client ${displayName} créé manuellement dans Shopify`, 'success');

        console.log('✅ Client créé manuellement:', newCustomer.id);

    } catch (error) {
        console.error('❌ Erreur création manuelle:', error);
        showTemporaryMessage(`❌ Erreur création client: ${error.message || 'Erreur inconnue'}`, 'error');
    }
}

// Gestion des boutons de nombre de paires
function handlePairesButtonClick(event) {
    const nbPaires = parseInt(event.target.dataset.paires);

    // Si on clique sur le même nombre de paires déjà sélectionné, ne rien faire
    if (nbPaires === appState.nbPaires) {
        return;
    }

    // Éviter les clics multiples rapides
    if (event.target.disabled) return;
    event.target.disabled = true;
    setTimeout(() => event.target.disabled = false, 300);

    // Reset des autres sélections dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (currentTabContent) {
        currentTabContent.querySelectorAll('.paire-btn').forEach(btn => btn.classList.remove('active'));
    }

    const pairesSelect = getCurrentTabElement('paires-select');
    if (pairesSelect) {
        pairesSelect.value = '';
        // Ne plus cacher le select car il est maintenant toujours visible
    }

    // Activer le bouton cliqué
    event.target.classList.add('active');

    updateNbPaires(nbPaires);
}

// Fonction supprimée car le select est maintenant toujours visible

// Gestion du menu déroulant pour plus de 5 paires
function handlePairesSelectChange(event) {
    const nbPaires = parseInt(event.target.value);

    // Si on sélectionne une valeur vide, ne rien faire
    if (!nbPaires) {
        return;
    }

    // Si on sélectionne le même nombre déjà sélectionné, ne rien faire
    if (nbPaires === appState.nbPaires) {
        return;
    }

    // Reset des boutons dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (currentTabContent) {
        currentTabContent.querySelectorAll('.paire-btn').forEach(btn => btn.classList.remove('active'));
    }

    // Remettre à zéro la valeur du select pour permettre de sélectionner la même valeur plusieurs fois
    setTimeout(() => {
        event.target.value = '';
    }, 100);

    updateNbPaires(nbPaires);
}

// Mettre à jour le nombre de paires et initialiser les cartes
function updateNbPaires(nbPaires) {
    // Empêcher la désélection (retour à 0 paire)
    if (nbPaires === 0) {
        console.warn('Tentative de désélection des paires bloquée - impossible de revenir à 0 paire');
        return;
    }

    const tab = globalState.tabs[globalState.currentTabId];
    if (!tab) return;
    
    const previousNbPaires = tab.nbPaires;
    const previousPaires = JSON.parse(JSON.stringify(tab.paires)); // Copie profonde pour éviter les références
    
    console.log('État avant changement:', {
        previousNbPaires,
        previousPaires: previousPaires.map(p => ({ 
            id: p.id, 
            nom: p.nom, 
            prestations: p.prestations.length,
            total: p.total 
        }))
    });

    // Si on revient au même nombre de paires, ne rien faire
    if (nbPaires === previousNbPaires) {
        console.log(`Même nombre de paires (${nbPaires}) - aucun changement nécessaire`);
        return;
    }

    console.log(`Changement de ${previousNbPaires} à ${nbPaires} paires`);
    console.log('Paires existantes:', previousPaires.map(p => ({ id: p.id, nom: p.nom, prestations: p.prestations.length })));

    // Toujours reconstruire complètement le tableau des paires pour éviter les incohérences
    const newPaires = [];

    if (nbPaires > previousNbPaires) {
        // Si on augmente le nombre de paires, préserver les existantes et ajouter les nouvelles
        console.log(`Augmentation: préservation de ${previousNbPaires} paires existantes + ajout de ${nbPaires - previousNbPaires} nouvelles`);

        // Copier les paires existantes avec leurs prestations (chercher par ID, pas par index)
        for (let i = 1; i <= previousNbPaires; i++) {
            const existingPaire = previousPaires.find(p => p.id === i);
            if (existingPaire) {
                newPaires.push({
                    id: i,
                    nom: existingPaire.nom || `Paire ${i}`,
                    prestations: JSON.parse(JSON.stringify(existingPaire.prestations || [])), // Copie profonde des prestations
                    total: existingPaire.total || 0
                });
                console.log(`Paire ${i} préservée:`, existingPaire.prestations.length, 'prestations');
            } else {
                // Si la paire n'existe pas (cas improbable), créer une nouvelle
                newPaires.push({
                    id: i,
                    nom: `Paire ${i}`,
                    prestations: [],
                    total: 0
                });
                console.log(`Paire ${i} créée (n'existait pas)`);
            }
        }

        // Ajouter les nouvelles paires vides
        for (let i = previousNbPaires + 1; i <= nbPaires; i++) {
            newPaires.push({
                id: i,
                nom: `Paire ${i}`,
                prestations: [],
                total: 0
            });
            console.log(`Nouvelle paire ${i} ajoutée`);
        }
    } else {
        // Si on diminue le nombre de paires, garder seulement les premières
        console.log(`Réduction: conservation des ${nbPaires} premières paires sur ${previousNbPaires}`);

        for (let i = 1; i <= nbPaires; i++) {
            const existingPaire = previousPaires.find(p => p.id === i);
            if (existingPaire) {
                newPaires.push({
                    id: i,
                    nom: existingPaire.nom || `Paire ${i}`,
                    prestations: JSON.parse(JSON.stringify(existingPaire.prestations || [])), // Copie profonde des prestations
                    total: existingPaire.total || 0
                });
                console.log(`Paire ${i} conservée:`, existingPaire.prestations.length, 'prestations');
            } else {
                // Si la paire n'existe pas (cas improbable), créer une nouvelle
                newPaires.push({
                    id: i,
                    nom: `Paire ${i}`,
                    prestations: [],
                    total: 0
                });
                console.log(`Paire ${i} créée (n'existait pas)`);
            }
        }
    }

    // Mettre à jour l'état avec le nouveau tableau
    tab.nbPaires = nbPaires;
    tab.paires = newPaires;

    // Recalculer tous les totaux pour s'assurer de la cohérence
    tab.paires.forEach(paire => {
        paire.total = paire.prestations.reduce((sum, p) => sum + (p.prix || 0), 0);
    });

    console.log('Nouvelles paires créées:', newPaires.map(p => ({ id: p.id, nom: p.nom, prestations: p.prestations.length })));
    
    console.log('État après reconstruction:', {
        newPaires: newPaires.map(p => ({ 
            id: p.id, 
            nom: p.nom, 
            prestations: p.prestations.length,
            total: p.total,
            prestationsDetails: p.prestations.map(pr => ({ type: pr.type, prix: pr.prix }))
        }))
    });

    // Afficher ou masquer les sections selon le nombre de paires
    toggleSectionsVisibility(nbPaires > 0);

    updatePairesDisplay();
    calculateTotal();
    updateTickets();

    console.log(`Mise à jour terminée: ${nbPaires} paires, état final:`,
                tab.paires.map(p => ({ id: p.id, nom: p.nom, prestations: p.prestations.length, total: p.total })));
}

// Afficher ou masquer les sections prestations, jour de retrait et total selon le nombre de paires
function toggleSectionsVisibility(show) {
    const currentTabId = globalState.currentTabId;
    
    // Chercher les sections dans l'onglet actuel
    const prestationsSection = getCurrentTabElement('prestations-section') || 
                               document.querySelector('#prestations-section');
    const jourRetraitSection = getCurrentTabElement('jour-retrait-section') || 
                               document.querySelector('#jour-retrait-section');
    const totalSection = getCurrentTabElement('total-section') || 
                        document.querySelector('#total-section');
    
    if (show) {
        // Afficher les sections avec animation
        if (prestationsSection) {
            prestationsSection.classList.remove('hidden-until-paires');
            prestationsSection.classList.add('show-after-paires');
        }
        if (jourRetraitSection) {
            jourRetraitSection.classList.remove('hidden-until-paires');
            jourRetraitSection.classList.add('show-after-paires');
        }
        if (totalSection) {
            totalSection.classList.remove('hidden-until-paires');
            totalSection.classList.add('show-after-paires');
        }
    } else {
        // Masquer les sections
        if (prestationsSection) {
            prestationsSection.classList.add('hidden-until-paires');
            prestationsSection.classList.remove('show-after-paires');
        }
        if (jourRetraitSection) {
            jourRetraitSection.classList.add('hidden-until-paires');
            jourRetraitSection.classList.remove('show-after-paires');
        }
        if (totalSection) {
            totalSection.classList.add('hidden-until-paires');
            totalSection.classList.remove('show-after-paires');
        }
    }
}

// Obtenir l'élément de l'onglet actuel par ID
function getCurrentTabElement(elementId) {
    const currentTabId = globalState.currentTabId;
    
    // Chercher d'abord avec l'ID spécifique à l'onglet
    let element = document.querySelector(`#${elementId}-${currentTabId}`);
    
    // Fallback sur l'ID original (pour l'onglet 1)
    if (!element && currentTabId === 1) {
        element = document.querySelector(`#${elementId}`);
    }
    
    return element;
}

// Mettre à jour l'affichage des cartes de paires
function updatePairesDisplay() {
    const container = getCurrentTabElement('paires-prestations');
    if (!container) return;

    container.innerHTML = '';

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab || currentTab.nbPaires === 0) {
        container.innerHTML = '';
        return;
    }

    console.log('updatePairesDisplay - Paires à afficher:', currentTab.paires.map(p => ({ 
        id: p.id, 
        nom: p.nom, 
        prestations: p.prestations.length,
        total: p.total 
    })));
    
    currentTab.paires.forEach(paire => {
        const card = createPaireCard(paire);
        container.appendChild(card);
    });

    // Sélectionner automatiquement la première paire si aucune n'est sélectionnée
    const hasSelectedPaire = currentTab.paires.some(paire => paire.selected);
    if (!hasSelectedPaire && currentTab.paires.length > 0) {
        currentTab.paires[0].selected = true;
        // Forcer la mise à jour de l'affichage pour montrer la sélection
        setTimeout(() => {
            updatePairesDisplay();
        }, 0);
    }

    // Réattacher les événements de clic aux nouvelles cartes
    attachPaireClickEvents(globalState.currentTabId);
}

// Créer une carte pour une paire
function createPaireCard(paire) {
    const card = document.createElement('div');
    card.className = 'paire-card';
    card.dataset.paireId = paire.id;

    // Attacher l'événement de clic de manière robuste
    card.addEventListener('click', (e) => {
        // Ne pas déclencher si c'est un double-clic (pour l'édition du nom)
        if (e.detail === 2) return;
        selectPaire(paire.id);
    });

    // Créer l'affichage ultra-compact des prestations
    let prestationsCompact = '';
    if (paire.prestations.length > 0) {
        prestationsCompact = `
            <div class="paire-prestations-compact">
                ${paire.prestations.map((p, index) => `
                    <div class="prestation-tag" data-prestation-index="${index}">
                        <span class="prestation-tag-name" ondblclick="editPrestationName(${paire.id}, ${index})" title="Double-clic pour éditer le nom">
                            ${p.type}
                        </span>
                        <span class="prestation-tag-price" ondblclick="editPrestationPrice(${paire.id}, ${index})" title="Double-clic pour éditer le prix">
                            ${p.prix === 0 ? '0' : p.prix.toFixed(0)}
                        </span>
                        <button class="prestation-tag-remove" onclick="removePrestationFromPaire(${paire.id}, ${index})" title="Supprimer">
                            ×
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="paire-header">
            <div class="paire-title ${paire.selected ? 'selected' : ''}" ondblclick="editPaireName(${paire.id}); event.stopPropagation();">
                <i class="fas fa-shoe-prints"></i>
                <span class="paire-name">${paire.nom}</span>
                ${paire.prestations.length > 0 ? `<span class="paire-prestations-count">(${paire.prestations.length})</span>` : ''}
            </div>
            <div class="paire-total">${paire.total.toFixed(2)} €</div>
        </div>

        ${prestationsCompact}
    `;

    return card;
}

// Créer un élément de prestation
function createPrestationItem(paireId, prestation, index) {
    return `
        <div class="paire-prestation-item" data-prestation-index="${index}">
            <div class="prestation-info">
                <div class="prestation-name" ondblclick="editPrestationName(${paireId}, ${index})" title="Double-clic pour éditer">
                    ${prestation.type}
                </div>
                <div class="prestation-price" ondblclick="editPrestationPrice(${paireId}, ${index})" title="Double-clic pour éditer">
                    ${prestation.prix === 0 ? 'Offert' : prestation.prix.toFixed(2) + ' €'}
                </div>
            </div>
            <button class="remove-prestation-btn" onclick="removePrestationFromPaire(${paireId}, ${index})">
                ✕
            </button>
        </div>
    `;
}

// Sélectionner une paire
function selectPaire(paireId) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Déselectionner toutes les paires
    currentTab.paires.forEach(paire => {
        paire.selected = false;
    });

    // Sélectionner la paire cliquée
    const selectedPaire = currentTab.paires.find(p => p.id === paireId);
    if (selectedPaire) {
        selectedPaire.selected = true;
        showTemporaryMessage(`Paire "${selectedPaire.nom}" sélectionnée`, 'info');
    }

    // Mettre à jour l'affichage
    updatePairesDisplay();
}

// Basculer l'affichage d'une paire (gardé pour compatibilité)
function togglePaire(paireId) {
    // Chercher dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (!currentTabContent) return;

    const card = currentTabContent.querySelector(`[data-paire-id="${paireId}"]`);
    if (card) {
        card.classList.toggle('active');
    }
}

// Définir le statut de paiement
function setPaymentStatus(status) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Si le même statut est déjà sélectionné, le désélectionner
    if (currentTab.paymentStatus === status) {
        currentTab.paymentStatus = null;
    } else {
        currentTab.paymentStatus = status;
    }

    // Mettre à jour l'interface
    updatePaymentButtons();

    // Mettre à jour les tickets
    updateTickets();

    showTemporaryMessage(
        currentTab.paymentStatus ?
        `Statut: ${status === 'paid' ? 'Payé' : 'Non payé'}` :
        'Statut de paiement retiré',
        'info'
    );
}

// Gestion du bouton "Reste à payer"
function toggleRemainingAmount() {
    const currentTabId = globalState.currentTabId;
    let container = document.getElementById(`remaining-amount-container-${currentTabId}`);
    let remainingInput = document.getElementById(`remaining-amount-${currentTabId}`);
    let paidDisplay = document.getElementById(`paid-amount-display-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!container) container = document.getElementById('remaining-amount-container');
    if (!remainingInput) remainingInput = document.getElementById('remaining-amount');
    if (!paidDisplay) paidDisplay = document.getElementById('paid-amount-display');
    
    const isVisible = container.style.display !== 'none';

    if (isVisible) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        // Remettre à zéro le champ quand on l'ouvre
        if (remainingInput) remainingInput.value = '';
        // Masquer le champ du montant déjà payé
        if (paidDisplay) paidDisplay.style.display = 'none';
        if (remainingInput) remainingInput.focus();
    }
}

// Calcul et affichage du montant déjà payé
function updatePaidAmountDisplay() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const currentTabId = globalState.currentTabId;
    let remainingInput = document.getElementById(`remaining-amount-${currentTabId}`);
    let paidAmountDisplay = document.getElementById(`paid-amount-display-${currentTabId}`);
    let paidAmountText = document.getElementById(`paid-amount-text-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!remainingInput) remainingInput = document.getElementById('remaining-amount');
    if (!paidAmountDisplay) paidAmountDisplay = document.getElementById('paid-amount-display');
    if (!paidAmountText) paidAmountText = document.getElementById('paid-amount-text');

    const remainingValue = parseFloat(remainingInput.value) || 0;
    const totalAmount = currentTab.total || 0;

    if (remainingValue > 0 && remainingValue < totalAmount) {
        const paidAmount = totalAmount - remainingValue;
        paidAmountText.textContent = `${paidAmount.toFixed(2)} € déjà payé`;
        paidAmountDisplay.style.display = 'block';
    } else {
        paidAmountDisplay.style.display = 'none';
    }
}

// Gestion de la confirmation du montant restant
function confirmRemainingAmount() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const amountInput = document.getElementById('remaining-amount');
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount < 0) {
        showTemporaryMessage('Veuillez saisir un montant valide', 'warning');
        return;
    }

    if (amount >= currentTab.total) {
        showTemporaryMessage('Le montant restant ne peut pas être supérieur ou égal au total', 'warning');
        return;
    }

    // Stocker le montant restant et calculer le montant déjà payé
    currentTab.remainingAmount = amount;
    currentTab.paidAmount = currentTab.total - amount;
    currentTab.paymentStatus = 'partial';

    // Masquer le conteneur
    const currentTabId = globalState.currentTabId;
    let remainingContainer = document.getElementById(`remaining-amount-container-${currentTabId}`);
    if (!remainingContainer) remainingContainer = document.getElementById('remaining-amount-container');
    if (remainingContainer) remainingContainer.style.display = 'none';

    // Mettre à jour l'interface
    updatePaymentButtons();

    // Mettre à jour les tickets
    updateTickets();

    showTemporaryMessage(`${currentTab.paidAmount.toFixed(2)} € payé, ${amount.toFixed(2)} € restant`, 'success');
}

// Gestion de l'annulation du montant restant
function cancelRemainingAmount() {
    const currentTabId = globalState.currentTabId;
    let remainingContainer = document.getElementById(`remaining-amount-container-${currentTabId}`);
    let remainingInput = document.getElementById(`remaining-amount-${currentTabId}`);
    let paidDisplay = document.getElementById(`paid-amount-display-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!remainingContainer) remainingContainer = document.getElementById('remaining-amount-container');
    if (!remainingInput) remainingInput = document.getElementById('remaining-amount');
    if (!paidDisplay) paidDisplay = document.getElementById('paid-amount-display');
    
    if (remainingContainer) remainingContainer.style.display = 'none';
    if (remainingInput) remainingInput.value = '';
    if (paidDisplay) paidDisplay.style.display = 'none';
}

// Mettre à jour l'affichage des boutons de paiement
function updatePaymentButtons() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) {
        console.warn(`⚠️ No current tab found for ID: ${globalState.currentTabId}`);
        return;
    }

    console.log(`🔄 updatePaymentButtons called for tab ${globalState.currentTabId}`);
    console.log(`💰 Current payment status: ${currentTab.paymentStatus}`);

    // Trouver les boutons de l'onglet actuel
    const currentTabId = globalState.currentTabId;
    let paidBtn = document.getElementById(`payment-paid-${currentTabId}`);
    let unpaidBtn = document.getElementById(`payment-unpaid-${currentTabId}`);
    let remainingBtn = document.getElementById(`payment-remaining-${currentTabId}`);

    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!paidBtn) {
        paidBtn = document.getElementById('payment-paid');
        console.log(`🔄 Using fallback for paid button`);
    }
    if (!unpaidBtn) {
        unpaidBtn = document.getElementById('payment-unpaid');
        console.log(`🔄 Using fallback for unpaid button`);
    }
    if (!remainingBtn) {
        remainingBtn = document.getElementById('payment-remaining');
        console.log(`🔄 Using fallback for remaining button`);
    }

    console.log(`🔍 Buttons found:`, {
        paidBtn: !!paidBtn,
        unpaidBtn: !!unpaidBtn,
        remainingBtn: !!remainingBtn
    });

    if (paidBtn) {
        const isActive = currentTab.paymentStatus === 'paid';
        paidBtn.classList.toggle('active', isActive);
        console.log(`✅ Paid button ${isActive ? 'activated' : 'deactivated'}`);
    }
    if (unpaidBtn) {
        const isActive = currentTab.paymentStatus === 'unpaid';
        unpaidBtn.classList.toggle('active', isActive);
        console.log(`✅ Unpaid button ${isActive ? 'activated' : 'deactivated'}`);
    }
    if (remainingBtn) {
        const isActive = currentTab.paymentStatus === 'partial';
        remainingBtn.classList.toggle('active', isActive);
        console.log(`✅ Remaining button ${isActive ? 'activated' : 'deactivated'}`);
    }

    // Mettre à jour l'état du bouton "Pas urgent"
    updatePasUrgentButton();
    
    // Mettre à jour l'état du bouton "Avec sac"
    updateAvecSacButton();
}

// Mettre à jour l'état visuel du bouton "Pas urgent"
function updatePasUrgentButton() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const currentTabId = globalState.currentTabId;
    let pasUrgentBtn = document.getElementById(`pas-urgent-btn-${currentTabId}`);
    
    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!pasUrgentBtn) pasUrgentBtn = document.getElementById('pas-urgent-btn');

    if (pasUrgentBtn) {
        // Le bouton "Pas urgent" est actif si l'utilisateur l'a explicitement sélectionné
        pasUrgentBtn.classList.toggle('active', currentTab.pasUrgent || false);
    }
}

// Mettre à jour le titre de l'onglet avec le nom du client
function updateTabTitle(tabId) {
    const tabState = globalState.tabs[tabId];
    if (!tabState) return;

    let newTitle = `Ticket ${tabId}`;

    // Si on a un nom ou prénom, créer le titre personnalisé
    if (tabState.nom || tabState.prenom) {
        const prenom = (tabState.prenom || '').trim();
        const nom = (tabState.nom || '').trim().toUpperCase();

        if (prenom && nom) {
            newTitle = `${prenom} ${nom}`;
        } else if (nom) {
            newTitle = nom;
        } else if (prenom) {
            newTitle = prenom;
        }

        console.log(`🏷️ Tab ${tabId} has data: prenom="${prenom}", nom="${nom}" -> title="${newTitle}"`);
    } else {
        console.log(`🏷️ Tab ${tabId} has no name data, keeping default title: "${newTitle}"`);
    }

    // Mettre à jour le titre dans l'état
    tabState.title = newTitle;

    // Mettre à jour l'affichage visuel
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
    if (tabElement) {
        tabElement.textContent = newTitle;
    }

    console.log(`🏷️ Updated tab ${tabId} title to: "${newTitle}"`);
}

// Mettre à jour l'état visuel du bouton "Avec sac"
function updateAvecSacButton() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const currentTabId = globalState.currentTabId;
    let avecSacBtn = document.getElementById(`avec-sac-btn-${currentTabId}`);

    // Fallback pour le premier onglet (qui n'a pas de suffixe)
    if (!avecSacBtn) avecSacBtn = document.getElementById('avec-sac-btn');

    if (avecSacBtn) {
        const nbAccessoires = currentTab.accessoires ? currentTab.accessoires.length : 0;

        // Mettre à jour le texte du bouton selon le nombre d'accessoires sélectionnés
        const buttonText = avecSacBtn.querySelector('span') || document.createElement('span');
        if (!avecSacBtn.querySelector('span')) {
            // Créer un span pour le texte si nécessaire
            const icon = avecSacBtn.querySelector('i.fas.fa-shopping-bag');
            const chevron = avecSacBtn.querySelector('i.fas.fa-chevron-down');
            const textNode = document.createTextNode(' Sac');
            buttonText.textContent = nbAccessoires > 0 ? ` Sac(${nbAccessoires})` : ' Sac';
            avecSacBtn.insertBefore(buttonText, chevron);
        } else {
            buttonText.textContent = nbAccessoires > 0 ? ` Sac(${nbAccessoires})` : ' Sac';
        }

        // Le bouton "Avec sac" est actif s'il y a des accessoires sélectionnés
        avecSacBtn.classList.toggle('active', nbAccessoires > 0);

        // Mettre à jour les cases à cocher selon l'état actuel
        updateSacCheckboxes();
    }
}

// Mettre à jour l'état des cases à cocher selon les accessoires sélectionnés
function updateSacCheckboxes() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab || !currentTab.accessoires) return;

    // Mettre à jour seulement les cases à cocher de l'onglet actuel
    const currentSidebar = document.querySelector(`#sidebar-${globalState.currentTabId}`) ||
                           document.querySelector('.ticket-client-sidebar');

    if (currentSidebar) {
        currentSidebar.querySelectorAll('.sac-checkbox').forEach(checkbox => {
            const sacType = checkbox.closest('.sac-option').dataset.sac;
            checkbox.checked = currentTab.accessoires.includes(sacType);
        });
    }
}

// Initialiser le drag & drop et les clics
function initializeDragAndDrop() {
    // Gestion du drag & drop
    document.querySelectorAll('.draggable').forEach(draggable => {
        draggable.addEventListener('dragstart', handleDragStart);
        draggable.addEventListener('dragend', handleDragEnd);
    });

    // Gestion du clic sur les prestations pour ajouter à la paire sélectionnée
    const prestationButtons = document.querySelectorAll('.prestation-btn.draggable');
    console.log(`Attachement des événements à ${prestationButtons.length} boutons de prestations`);
    
    prestationButtons.forEach((btn, index) => {
        // Vérifier que le bouton a les attributs nécessaires
        if (!btn.dataset.type || !btn.dataset.prix) {
            console.warn(`Bouton ${index} sans attributs data-type ou data-prix:`, {
                element: btn,
                dataset: btn.dataset,
                classes: btn.className,
                innerHTML: btn.innerHTML
            });
        } else {
            console.log(`Bouton ${index} OK:`, {
                type: btn.dataset.type,
                prix: btn.dataset.prix,
                classes: btn.className
            });
        }
        btn.addEventListener('click', handlePrestationClick);
    });
}

// Gestion du début de drag
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: e.target.dataset.type,
        prix: parseFloat(e.target.dataset.prix)
    }));
    
    // Ajouter les event listeners pour les drop zones
    setupDropZones();
}

// Gestion de la fin de drag
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    
    // Nettoyer les drop zones
    cleanupDropZones();
}

// Configurer les zones de drop
function setupDropZones() {
    document.querySelectorAll('.paire-card').forEach(card => {
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
    });
}

// Nettoyer les zones de drop
function cleanupDropZones() {
    document.querySelectorAll('.paire-card').forEach(card => {
        card.removeEventListener('dragover', handleDragOver);
        card.removeEventListener('dragenter', handleDragEnter);
        card.removeEventListener('dragleave', handleDragLeave);
        card.removeEventListener('drop', handleDrop);
        card.classList.remove('drag-over');
    });
}

// Gestion du survol pendant le drag
function handleDragOver(e) {
    e.preventDefault();
}

// Gestion de l'entrée dans une zone de drop
function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

// Gestion de la sortie d'une zone de drop
function handleDragLeave(e) {
    // Vérifier si on sort vraiment de la carte
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

// Gestion du clic sur une prestation
function handlePrestationClick(e) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Trouver la paire sélectionnée
    const selectedPaire = currentTab.paires.find(p => p.selected);
    if (!selectedPaire) {
        showTemporaryMessage('Sélectionnez d\'abord une paire', 'error');
        return;
    }

    // Trouver le bouton de prestation (remonter jusqu'au bouton si on clique sur un élément enfant)
    let button = e.target;
    while (button && !button.classList.contains('prestation-btn')) {
        button = button.parentElement;
    }
    
    if (!button) {
        console.error('Bouton de prestation non trouvé');
        return;
    }

    // Récupérer les données de la prestation
    const prestationType = button.dataset.type;
    const prestationPrix = parseFloat(button.dataset.prix);

    // Vérifier que les données sont valides
    if (!prestationType || isNaN(prestationPrix)) {
        console.error('Données de prestation invalides:', {
            type: prestationType,
            prix: prestationPrix,
            button: button,
            buttonDataset: button.dataset,
            originalTarget: e.target,
            originalTargetDataset: e.target.dataset,
            buttonClasses: button.className
        });
        showTemporaryMessage(`Erreur: données de prestation invalides (type: ${prestationType}, prix: ${prestationPrix})`, 'error');
        return;
    }

    // Ajouter la prestation à la paire sélectionnée
    selectedPaire.prestations.push({
        type: prestationType,
        prix: prestationPrix
    });

    selectedPaire.total = selectedPaire.prestations.reduce((sum, p) => sum + p.prix, 0);

    // Mettre à jour l'affichage et les calculs
    updatePairesDisplay();
    calculateTotal();
    updateTickets();

    showTemporaryMessage(`${prestationType} ajouté à ${selectedPaire.nom}`, 'success');
}

// Gestion du drop
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    try {
        const prestationData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const paireId = parseInt(e.currentTarget.dataset.paireId);

        // Ajouter la prestation à la paire
        const currentTab = globalState.tabs[globalState.currentTabId];
        if (!currentTab) return;
        
        const paire = currentTab.paires.find(p => p.id === paireId);
        if (paire) {
            paire.prestations.push({
                type: prestationData.type,
                prix: prestationData.prix
            });
            paire.total = paire.prestations.reduce((sum, p) => sum + p.prix, 0);

            updatePairesDisplay();
            calculateTotal();
            updateTickets();

            showTemporaryMessage(`${prestationData.type} ajouté à ${paire.nom}`, 'success');
        }
    } catch (error) {
        console.error('Erreur lors du drop:', error);
    }
}

// Éditer le nom d'une paire
function editPaireName(paireId) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    const paire = currentTab.paires.find(p => p.id === paireId);
    if (!paire) return;
    
    // Chercher dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) || 
                             document.querySelector('.tab-content.active');
    if (!currentTabContent) return;
    
    const card = currentTabContent.querySelector(`[data-paire-id="${paireId}"]`);
    if (!card) return;
    
    const titleElement = card.querySelector('.paire-title');
    const nameSpan = card.querySelector('.paire-name');
    
    // Créer un input pour l'édition
    const input = document.createElement('input');
    input.type = 'text';
    input.value = paire.nom;
    input.className = 'paire-name-input';
    
    // Calculer la largeur en fonction du contenu
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.fontSize = '16px';
    tempSpan.style.fontWeight = '700';
    tempSpan.style.padding = '4px 8px';
    tempSpan.style.lineHeight = '1.2';
    tempSpan.textContent = paire.nom;
    document.body.appendChild(tempSpan);
    
    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);
    
    // Définir une largeur minimale et maximale
    const minWidth = 100;
    const maxWidth = 300;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 20));
    input.style.width = calculatedWidth + 'px';
    
    // Remplacer le span par l'input
    nameSpan.style.display = 'none';
    titleElement.insertBefore(input, nameSpan.nextSibling);
    titleElement.classList.add('editing');
    
    input.focus();
    input.select();
    
    // Ajuster la largeur pendant la saisie
    input.addEventListener('input', () => {
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.fontSize = '16px';
        tempSpan.style.fontWeight = '700';
        tempSpan.style.padding = '4px 8px';
        tempSpan.style.lineHeight = '1.2';
        tempSpan.textContent = input.value || 'A'; // Utiliser 'A' comme minimum
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        const minWidth = 100;
        const maxWidth = 300;
        const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 20));
        input.style.width = calculatedWidth + 'px';
    });
    
    // Empêcher la propagation des événements pour éviter la fermeture prématurée
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    
    // Fonction pour sauvegarder
    const saveName = () => {
        const newName = input.value.trim() || `Paire ${paireId}`;
        paire.nom = newName;
        
        // Restaurer l'affichage normal
        nameSpan.textContent = newName;
        nameSpan.style.display = '';
        titleElement.removeChild(input);
        titleElement.classList.remove('editing');
        
        updateTickets();
    };
    
    // Sauvegarder sur Enter ou perte de focus
    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            saveName();
        } else if (e.key === 'Escape') {
            // Annuler
            nameSpan.style.display = '';
            titleElement.removeChild(input);
            titleElement.classList.remove('editing');
        }
    });
    
    input.addEventListener('blur', saveName);
}

// Afficher le sélecteur de prestation
function showPrestationSelector(paireId) {
    const selector = getCurrentTabElement(`selector-${paireId}`);
    if (selector) selector.classList.add('active');
    
    // Gérer l'affichage des champs personnalisés
    const select = getCurrentTabElement(`prestation-select-${paireId}`);
    const customFields = getCurrentTabElement(`custom-fields-${paireId}`);
    
    if (select && customFields) {
        select.addEventListener('change', function() {
            if (this.value === 'custom') {
                customFields.style.display = 'flex';
            } else {
                customFields.style.display = 'none';
            }
        });
    }
}

// Masquer le sélecteur de prestation
function hidePrestationSelector(paireId) {
    const selector = getCurrentTabElement(`selector-${paireId}`);
    if (selector) selector.classList.remove('active');
    
    // Reset
    const select = getCurrentTabElement(`prestation-select-${paireId}`);
    const customFields = getCurrentTabElement(`custom-fields-${paireId}`);
    const customType = getCurrentTabElement(`custom-type-${paireId}`);
    const customPrix = getCurrentTabElement(`custom-prix-${paireId}`);
    
    if (select) select.value = '';
    if (customFields) customFields.style.display = 'none';
    if (customType) customType.value = '';
    if (customPrix) customPrix.value = '';
}

// Ajouter une prestation à une paire
function addPrestationToPaire(paireId) {
    const select = getCurrentTabElement(`prestation-select-${paireId}`);
    const customType = getCurrentTabElement(`custom-type-${paireId}`);
    const customPrix = getCurrentTabElement(`custom-prix-${paireId}`);
    
    let type, prix;
    
    if (select.value === 'custom') {
        type = customType.value.trim();
        prix = parseFloat(customPrix.value) || 0;
        
        if (!type) {
            // Focus sur le champ et highlight en rouge
            customType.style.borderColor = '#ef4444';
            customType.focus();
            setTimeout(() => customType.style.borderColor = '', 2000);
            return;
        }
    } else if (select.value) {
        [type, prix] = select.value.split('|');
        prix = parseFloat(prix);
    } else {
        // Highlight le select en rouge
        select.style.borderColor = '#ef4444';
        setTimeout(() => select.style.borderColor = '', 2000);
        return;
    }
    
    // Ajouter la prestation à la paire
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    const paire = currentTab.paires.find(p => p.id === paireId);
    if (!paire) return;
    
    paire.prestations.push({ type, prix });
    paire.total = paire.prestations.reduce((sum, p) => sum + p.prix, 0);
    
    hidePrestationSelector(paireId);
    updatePairesDisplay();
    calculateTotal();
    updateTickets();
}

// Supprimer une prestation d'une paire
function removePrestationFromPaire(paireId, prestationIndex) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    const paire = currentTab.paires.find(p => p.id === paireId);
    if (!paire) return;
    
    paire.prestations.splice(prestationIndex, 1);
    paire.total = paire.prestations.reduce((sum, p) => sum + p.prix, 0);
    
    updatePairesDisplay();
    calculateTotal();
    updateTickets();
}

// Gestion des prestations prédéfinies - créer des éléments draggables
function handlePrestationButtonClick(event) {
    // Ne rien faire, les boutons sont maintenant draggables
}

// Gestion de l'ajout de prestation personnalisée
function handleAddCustomPrestation() {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <h3>Ajouter une prestation personnalisée</h3>
            <div class="modal-body">
                <input type="text" id="custom-prestation-type" placeholder="Type de prestation" autocomplete="off" required>
                <input type="number" id="custom-prestation-price" placeholder="Prix en euros" autocomplete="off" min="0" step="0.01" required>
            </div>
            <div class="confirm-actions">
                <button class="btn-confirm-cancel">Annuler</button>
                <button class="btn-confirm-ok">Ajouter</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus sur le premier champ
    const typeInput = dialog.querySelector('#custom-prestation-type');
    typeInput.focus();
    
    // Gestion des boutons
    dialog.querySelector('.btn-confirm-ok').addEventListener('click', () => {
        const type = typeInput.value.trim();
        const price = parseFloat(dialog.querySelector('#custom-prestation-price').value);
        
        if (!type || isNaN(price) || price < 0) {
            showTemporaryMessage('Veuillez remplir tous les champs correctement', 'error');
            return;
        }
        
        // Ajouter la prestation personnalisée à la liste des prestations prédéfinies
        prestationsPredefinies.push({ type, prix: price });
        
        // Créer un nouveau bouton draggable pour cette prestation
        createCustomPrestationButton(type, price);
        
        document.body.removeChild(overlay);
        showTemporaryMessage(`Prestation "${type}" ajoutée avec succès`, 'success');
    });
    
    dialog.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // Fermer avec Escape
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Créer un bouton pour une prestation personnalisée
function createCustomPrestationButton(type, price) {
    const button = document.createElement('button');
    button.className = 'prestation-btn draggable compact custom-prestation-btn';
    button.draggable = true;
    button.dataset.type = type;
    button.dataset.prix = price;

    // Créer l'affichage avec le nom et le prix
    button.innerHTML = `
        <span class="prestation-name">${type}</span>
        <span class="prestation-price-display">${price.toFixed(2)}€</span>
    `;

    // Ajouter les événements drag & drop
    button.addEventListener('dragstart', handleDragStart);
    button.addEventListener('dragend', handleDragEnd);

    // Ajouter le bouton dans le conteneur des prestations personnalisées de l'onglet actuel
    const customList = getCurrentTabElement('custom-prestations-list');
    if (customList) {
        customList.appendChild(button);
    }
}

// Calculer le total
function calculateTotal() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    currentTab.total = currentTab.paires.reduce((total, paire) => total + paire.total, 0);
    const totalElement = getCurrentTabElement('total-prix');
    if (totalElement) {
        totalElement.textContent = currentTab.total.toFixed(2);
    }
}

// Gestion des boutons de jour
function handleJourButtonClick(event) {
    const button = event.currentTarget;
    const jour = button.dataset.jour;
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Reset de tous les boutons de jour de l'onglet actuel seulement (dans la sidebar)
    const currentSidebar = document.querySelector(`#sidebar-${globalState.currentTabId}`) ||
                           document.querySelector('.ticket-client-sidebar');
    if (currentSidebar) {
        currentSidebar.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
    }

    // Activer le bouton cliqué
    button.classList.add('active');

    // Remettre à null la date spécifique du calendrier pour éviter les conflits
    currentTab.dateRetrait = null;
    currentTab.jourRetrait = jour;

    // Désactiver "pas urgent" car une date est maintenant sélectionnée
    currentTab.pasUrgent = false;
    currentTab.avecSac = false; // Réinitialiser aussi "avec sac"
    currentTab.accessoires = []; // Réinitialiser les accessoires

    // Mettre à jour l'état visuel des boutons (notamment "Pas urgent")
    updatePaymentButtons();
    updatePasUrgentButton();
    
    updateTickets();
}

// Gestion de l'heure de retrait
function handleHeureRetraitChange(event) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    currentTab.heureRetrait = event.target.value;
    updateTickets();
}

// Gestion de la note de retrait
function handleNoteRetraitChange(event) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) {
        console.error('❌ handleNoteRetraitChange: No current tab found');
        return;
    }

    currentTab.noteRetrait = event.target.value;
    console.log(`📝 Note updated for tab ${globalState.currentTabId}: "${event.target.value}"`);
    console.log(`📝 Current tab noteRetrait: "${currentTab.noteRetrait}"`);

    // Test immédiat de la génération
    const testContent = generateTicketCordonnier();
    console.log(`🧪 Test generation result includes note: ${testContent.includes('Note:')}`);

    updateTickets();

    // Déclencher la sauvegarde automatique
    triggerAutoSave();
}

// Gestion du bouton "Pas urgent"
function handlePasUrgentClick(event) {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Réinitialiser la date et l'heure actuelles
    currentTab.jourRetrait = null;
    currentTab.heureRetrait = null;
    currentTab.dateRetrait = null; // Aussi remettre à null la date du calendrier

    // Marquer comme "pas urgent"
    currentTab.pasUrgent = true;

    const currentSidebar = document.querySelector(`#sidebar-${globalState.currentTabId}`) ||
                           document.querySelector('.ticket-client-sidebar');
    if (currentSidebar) {
        // Désactiver tous les boutons de jours de l'onglet actuel seulement (dans la sidebar)
        currentSidebar.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
        
        const heureSelect = currentSidebar.querySelector(`#heure-retrait-${globalState.currentTabId}`) || 
                           currentSidebar.querySelector('#heure-retrait');
        if (heureSelect) heureSelect.value = '';
    }

    // Mettre à jour l'état visuel des boutons
    updatePaymentButtons();
    updatePasUrgentButton();

    updateTickets();
    showTemporaryMessage('Marqué comme "Pas urgent" - aucune date définie', 'info');
}

// Gestion du bouton "Avec sac"
function handleAvecSacClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    // Toggle le menu déroulant
    const currentTabId = globalState.currentTabId;
    const menuContentId = currentTabId === 1 ? 'sac-menu-content' : `sac-menu-content-${currentTabId}`;
    const menuContent = document.getElementById(menuContentId);
    const menuContainer = menuContent.closest('.sac-menu');

    // Utiliser une classe pour gérer l'état au lieu de style.display direct
    if (menuContainer.classList.contains('active')) {
        menuContent.style.display = 'none';
        menuContainer.classList.remove('active');
    } else {
        menuContent.style.display = 'block';
        menuContainer.classList.add('active');
    }

    // Mettre à jour l'état visuel du bouton
    updateAvecSacButton();
}

// Gestion des cases à cocher des accessoires
function handleSacCheckboxChange(event) {
    // Empêcher la propagation pour éviter la fermeture du menu et les conflits
    event.stopPropagation();

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const checkbox = event.target;
    const sacType = checkbox.closest('.sac-option').dataset.sac;

    // Petite pause pour éviter les conflits d'événements
    setTimeout(() => {
        if (checkbox.checked) {
            // Ajouter l'accessoire s'il n'est pas déjà présent
            if (!currentTab.accessoires.includes(sacType)) {
                currentTab.accessoires.push(sacType);
            }
        } else {
            // Retirer l'accessoire
            currentTab.accessoires = currentTab.accessoires.filter(acc => acc !== sacType);
        }

        // Mettre à jour l'état "avec sac" en fonction des sélections
        currentTab.avecSac = currentTab.accessoires.length > 0;

        // Mettre à jour l'état visuel du bouton
        updateAvecSacButton();

        updateTickets();
    }, 10);
}

// Gestion du clic sur toute l'option (pas seulement la case à cocher)
function handleSacOptionClick(event) {
    // Empêcher la propagation pour éviter la fermeture du menu
    event.stopPropagation();

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;

    const option = event.currentTarget;
    const checkbox = option.querySelector('input[type="checkbox"]');
    const sacType = option.dataset.sac;

    if (checkbox) {
        // Petite pause pour éviter les conflits d'événements
        setTimeout(() => {
            // Inverser l'état de la case à cocher
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
                // Ajouter l'accessoire s'il n'est pas déjà présent
                if (!currentTab.accessoires.includes(sacType)) {
                    currentTab.accessoires.push(sacType);
                }
            } else {
                // Retirer l'accessoire
                currentTab.accessoires = currentTab.accessoires.filter(acc => acc !== sacType);
            }

            // Mettre à jour l'état "avec sac" en fonction des sélections
            currentTab.avecSac = currentTab.accessoires.length > 0;

            // Mettre à jour l'état visuel du bouton
            updateAvecSacButton();

            updateTickets();
        }, 10);
    }
}

// Gestion du bouton calendrier
function handleCalendarClick(event) {
    const currentTabId = globalState.currentTabId;
    let datePicker = document.getElementById(`date-picker-${currentTabId}`);
    if (!datePicker) datePicker = document.getElementById('date-picker');
    
    if (datePicker.style.display === 'none' || datePicker.style.display === '') {
        datePicker.style.display = 'block';
        datePicker.focus();
    } else {
        datePicker.style.display = 'none';
    }
}

// Gestion de la sélection de date dans le calendrier
function handleDatePickerChange(event) {
    const selectedDate = new Date(event.target.value);
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab || !selectedDate) return;

    // Convertir la date en jour de la semaine (en français)
    const joursFrancais = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourSemaine = joursFrancais[selectedDate.getDay()];

    // Vérifier si c'est un jour ouvrable (mardi à samedi)
    const joursOuvrables = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    if (!joursOuvrables.includes(jourSemaine)) {
        showTemporaryMessage(`Le ${jourSemaine.toLowerCase()} n'est pas un jour ouvrable`, 'warning');
        return;
    }

    // Créer la date formatée pour l'affichage (jour numéro)
    const jourDuMois = selectedDate.getDate();
    const dateFormatee = `${jourSemaine.toLowerCase()} ${jourDuMois}`;

    // Stocker à la fois le nom du jour (pour les boutons) et la date complète (pour l'affichage)
    currentTab.jourRetrait = jourSemaine; // Pour la logique des boutons
    currentTab.dateRetrait = dateFormatee; // Pour l'affichage sur les tickets

    // Désactiver "pas urgent" car une date est maintenant sélectionnée
    currentTab.pasUrgent = false;
    currentTab.avecSac = false; // Réinitialiser aussi "avec sac"
    currentTab.accessoires = []; // Réinitialiser les accessoires

    // Sélectionner automatiquement le bouton du jour
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (currentTabContent) {
        // Désactiver tous les boutons
        currentTabContent.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));

        // Activer le bouton correspondant
        const jourButton = currentTabContent.querySelector(`[data-jour="${jourSemaine}"]`);
        if (jourButton) {
            jourButton.classList.add('active');
        }

        // Ne pas définir d'heure par défaut - laisser l'utilisateur choisir
    }

    // Masquer le calendrier
    event.target.style.display = 'none';

    // Mettre à jour l'état visuel des boutons (notamment "Pas urgent")
    updatePaymentButtons();

    updateTickets();
    showTemporaryMessage(`Date sélectionnée: ${dateFormatee}${currentTab.heureRetrait ? ' à ' + currentTab.heureRetrait : ''}`, 'success');
}

// Formater le téléphone pour l'affichage
function formatTelephone(tel) {
    let cleaned = tel.replace(/\D/g, '');

    // Remplacer les indicatifs français
    if (cleaned.startsWith('33')) {
        cleaned = '0' + cleaned.substring(2);
    } else if (cleaned.startsWith('336')) {
        cleaned = '06' + cleaned.substring(3);
    } else if (cleaned.startsWith('337')) {
        cleaned = '07' + cleaned.substring(3);
    }

    return cleaned.replace(/(.{2})/g, '$1 ').trim();
}

// Formater l'heure pour l'affichage (10:00 → 10h)
function formatHeure(heure) {
    if (!heure || heure === '') return '';
    return heure.replace(':00', 'h').replace(':', 'h');
}

// Générer le contenu du ticket client
function generateTicketClient() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return '';

    // Préfixe #XXXX avec les 4 derniers chiffres du téléphone
    const telDigits = (currentTab.telephone || '').replace(/\D/g, '');
    const telSuffix = telDigits.length >= 4 ? `#${telDigits.slice(-4)}` : '';

    // Priorité : date spécifique (via calendrier) > jour de la semaine
    let dateRetrait;
    if (currentTab.dateRetrait && currentTab.heureRetrait) {
        dateRetrait = `${currentTab.dateRetrait} à ${currentTab.heureRetrait}`;
    } else if (currentTab.dateRetrait) {
        dateRetrait = currentTab.dateRetrait;
    } else if (currentTab.jourRetrait && currentTab.heureRetrait) {
        dateRetrait = `${currentTab.jourRetrait} à ${currentTab.heureRetrait}`;
    } else if (currentTab.jourRetrait) {
        dateRetrait = currentTab.jourRetrait;
    } else {
        dateRetrait = 'Non définie';
    }

    let prestationsText = '';
    if (currentTab.paires.length > 0 && currentTab.paires.some(p => p.prestations.length > 0)) {
        prestationsText = currentTab.paires.map(paire => {
            if (paire.prestations.length === 0) return '';
            const prestationsStr = paire.prestations.map(p =>
                `  - ${p.type}: ${p.prix === 0 ? 'Offert' : p.prix.toFixed(2) + ' €'}`
            ).join('\n');
            return `${paire.nom}:\n${prestationsStr}`;
        }).filter(str => str).join('\n\n');
    } else {
        prestationsText = 'Aucune prestation sélectionnée';
    }

    const emailText = currentTab.email ? `<span style="font-size: 0.875em;">${currentTab.email}</span>` : '';
    const nomComplet = `${currentTab.prenom} ${currentTab.nom}`.trim() || 'NOM NON RENSEIGNÉ';

    let paymentText = '';
    if (currentTab.paymentStatus === 'paid') {
        paymentText = 'PAYÉ';
    } else if (currentTab.paymentStatus === 'unpaid') {
        paymentText = 'NON PAYÉ';
    } else if (currentTab.paymentStatus === 'partial' && currentTab.remainingAmount && currentTab.paidAmount) {
        paymentText = `${currentTab.paidAmount.toFixed(2)} € payé, reste ${currentTab.remainingAmount.toFixed(2)} €`;
    }

    // Formater la date de création
    const dateCreation = currentTab.createdAt ? new Date(currentTab.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    // Ajouter l'information des accessoires sélectionnés
    let accessoiresText = '';
    if (currentTab.accessoires && currentTab.accessoires.length > 0) {
        const accessoiresFormatted = currentTab.accessoires.map(acc => {
            switch(acc) {
                case 'sac': return 'SAC';
                case 'housses': return 'HOUSSES';
                case 'embau choirs': return 'EMBAUCHOIRS';
                case 'boite': return 'BOITE';
                default: return acc.toUpperCase();
            }
        }).join(', ');
        accessoiresText = ' (<span style="font-size: 0.8em;">' + accessoiresFormatted + '</span>)';
    }

    // Ajouter la note si elle existe
    let noteText = '';
    if (currentTab.noteRetrait && currentTab.noteRetrait.trim()) {
        noteText = `\n<span style="font-size: 0.6em;">Note: ${currentTab.noteRetrait.trim()}</span>`;
    }

    return `${telSuffix ? '<span style="font-size: 2em; font-weight: bold;">' + telSuffix + '</span>\n' : ''}TICKET DE RÉPARATION
${nomComplet.toUpperCase()}
<span style="font-size: 1em;">${formatTelephone(currentTab.telephone) || 'NON RENSEIGNÉ'}</span> ${emailText}
<span style="font-size: 1em;">${currentTab.nbPaires} ${currentTab.nbPaires === 1 ? 'paire' : 'paires'}</span>

<span style="font-size: 0.6em;">PRESTATIONS:</span>
<span style="font-size: 0.6em;">${prestationsText}</span>

<span style="font-size: 0.8em;">TOTAL: ${currentTab.total.toFixed(2)} €</span>
<span style="font-size: 0.6em;">Date de retrait: ${dateRetrait || '/'}${accessoiresText}</span>
<span style="font-size: 0.5em;">Créé le: ${dateCreation}</span>
${paymentText ? '<span style="font-size: 0.6em;">Statut: ' + paymentText + '</span>' : ''}${noteText}`;
}

// Générer le contenu du ticket cordonnier
function generateTicketCordonnier() {
    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return '';

    // Préfixe #XXXX avec les 4 derniers chiffres du téléphone
    const telDigits = (currentTab.telephone || '').replace(/\D/g, '');
    const telSuffix = telDigits.length >= 4 ? `#${telDigits.slice(-4)}` : '';

    // Priorité : date spécifique (via calendrier) > jour de la semaine
    let dateRetrait;
    if (currentTab.dateRetrait && currentTab.heureRetrait) {
        dateRetrait = `${currentTab.dateRetrait} ${formatHeure(currentTab.heureRetrait)}`;
    } else if (currentTab.dateRetrait) {
        dateRetrait = currentTab.dateRetrait;
    } else if (currentTab.jourRetrait && currentTab.heureRetrait) {
        dateRetrait = `${currentTab.jourRetrait.toUpperCase()} ${formatHeure(currentTab.heureRetrait)}`;
    } else if (currentTab.jourRetrait) {
        dateRetrait = currentTab.jourRetrait.toUpperCase();
    } else {
        dateRetrait = 'PAS URGENT';
    }

    let prestationsText = '';
    if (currentTab.paires.length > 0 && currentTab.paires.some(p => p.prestations.length > 0)) {
        prestationsText = currentTab.paires.map(paire => {
            if (paire.prestations.length === 0) return '';
            const prestationsStr = paire.prestations.map(p =>
                `  - ${p.type}${p.prix === 0 ? ' (Offert)' : ' <span style="font-size: 0.6em;">(' + p.prix.toFixed(2) + ' €)</span>'}`
            ).join('\n');
            return `${paire.nom}:\n${prestationsStr}`;
        }).filter(str => str).join('\n');
    } else {
        prestationsText = 'Aucune prestation';
    }

    const nomComplet = `${currentTab.prenom} ${currentTab.nom}`.trim() || 'NOM NON RENSEIGNÉ';
    const emailText = currentTab.email ? `<span style="font-size: 0.875em;">${currentTab.email}</span>` : '';

    let paymentText = '';
    if (currentTab.paymentStatus === 'paid') {
        paymentText = 'P';
    } else if (currentTab.paymentStatus === 'unpaid') {
        paymentText = 'NP';
    } else if (currentTab.paymentStatus === 'partial' && currentTab.remainingAmount && currentTab.paidAmount) {
        paymentText = `${currentTab.paidAmount.toFixed(2)}P-R${currentTab.remainingAmount.toFixed(2)}`;
    }

    // Formater la date de création
    const dateCreation = currentTab.createdAt ? new Date(currentTab.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    // Ajouter l'information des accessoires sélectionnés
    let accessoiresText = '';
    if (currentTab.accessoires && currentTab.accessoires.length > 0) {
        const accessoiresFormatted = currentTab.accessoires.map(acc => {
            switch(acc) {
                case 'sac': return 'SAC';
                case 'housses': return 'HOUSSES';
                case 'embau choirs': return 'EMBAUCHOIRS';
                case 'boite': return 'BOITE';
                default: return acc.toUpperCase();
            }
        }).join(', ');
        accessoiresText = '<span style="font-size: 0.6em;">' + accessoiresFormatted + '</span>';
    }

    // Ajouter la note si elle existe
    let noteText = '';
    console.log(`📝 Checking note for tab ${globalState.currentTabId}: noteRetrait = "${currentTab.noteRetrait}"`);
    if (currentTab.noteRetrait && currentTab.noteRetrait.trim()) {
        noteText = `<span style="font-size: 0.6em;"><br>Note: ${currentTab.noteRetrait.trim()}</span>`;
        console.log(`📝 Including note in cordonnier ticket: "${currentTab.noteRetrait.trim()}"`);
        console.log(`📝 Generated noteText: "${noteText}"`);
    } else {
        console.log(`📝 No note found for tab ${globalState.currentTabId}`);
    }

    return `${telSuffix ? '<span style="font-size: 2em; font-weight: bold;">' + telSuffix + '</span>' : ''}<span style="font-size: 0.4em; float: right;">${dateCreation}<br><span style="font-size: 3em; font-weight: bold;">${currentTab.nbPaires} P</span>${accessoiresText ? '<br>' + accessoiresText : ''}</span>
${nomComplet.toUpperCase()}
<span style="font-size: 0.5em;">${formatTelephone(currentTab.telephone) || 'NON RENSEIGNÉ'} ${currentTab.email ? '| <span style="font-size: 0.75em;">' + currentTab.email + '</span>' : ''}</span>
<span style="font-size: 0.6em;">${prestationsText}</span>
<span style="font-size: 0.6em;">${dateRetrait} ${paymentText ? '| ' + paymentText : ''} | <span style="font-size: 1.12em;">${currentTab.total.toFixed(2)} €</span></span>${noteText}`;
}

// Mettre à jour les zones de texte des tickets
function updateTickets() {
    const currentTabId = globalState.currentTabId;

    // Utiliser getCurrentTabElement pour récupérer les bons éléments selon l'onglet actuel
    const ticketCordonnier = getCurrentTabElement('ticket-cordonnier-content');
    console.log(`🔍 Looking for ticket-cordonnier-content in tab ${currentTabId}: ${ticketCordonnier ? 'FOUND' : 'NOT FOUND'}`);
    if (ticketCordonnier) {
        console.log(`📋 Found element: ${ticketCordonnier.id}`);
    }

    // Aperçu du ticket client retiré - seul le bouton d'impression est conservé

    if (ticketCordonnier) {
        const ticketContent = generateTicketCordonnier();
        ticketCordonnier.value = ticketContent;
        // Ajuster automatiquement la hauteur du ticket cordonnier
        adjustTextareaHeight(ticketCordonnier);
        console.log(`Ticket cordonnier mis à jour pour l'onglet ${currentTabId}`);
        console.log(`📄 Ticket content length: ${ticketContent.length} characters`);
        if (ticketContent.includes('Note:')) {
            console.log(`✅ Note found in ticket content`);
        } else {
            console.log(`❌ Note NOT found in ticket content`);
        }
    } else {
        console.warn(`Élément ticket-cordonnier-content non trouvé pour l'onglet ${currentTabId}`);
    }
}

// Ajuster automatiquement la hauteur d'un textarea
function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    
    // Réinitialiser la hauteur pour calculer la hauteur réelle
    textarea.style.height = 'auto';
    
    // Calculer la hauteur nécessaire (contenu + padding)
    const scrollHeight = textarea.scrollHeight;
    const computedStyle = window.getComputedStyle(textarea);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    
    // Définir la hauteur avec un minimum de 200px
    const newHeight = Math.max(200, scrollHeight + paddingTop + paddingBottom);
    textarea.style.height = newHeight + 'px';
}

// Gestion de l'impression
function handleImprimer(type) {
    console.log(`🖨️ Printing ${type} ticket for tab ${globalState.currentTabId}`);
    const content = type === 'client' ? generateTicketClient() : generateTicketCordonnier();
    console.log(`📄 Generated ${type} content length: ${content.length}`);
    console.log(`📄 ${type} content includes 'Note:': ${content.includes('Note:')}`);
    const printContent = content.replace(/\n/g, "<br>");

    // Imprimer via un iframe caché (évite d'ouvrir une nouvelle fenêtre)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    const docDocument = doc.document || doc;
    docDocument.open();
    docDocument.write(`<!DOCTYPE html>
        <html>
        <head>
            <title>Impression Ticket</title>
            <style>
                @page { margin: 0; }
                html, body { margin: 0; padding: 0; }
                body {
                    font-family: 'Lucida Console', monospace;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0;
                    padding-left: 15px;
                    line-height: 1.0;
                    white-space: pre-wrap;
                }
                br { line-height: 0.8; }
            </style>
        </head>
        <body>${printContent}</body>
        </html>`);
    docDocument.close();

    iframe.onload = function() {
        // Attendre le rendu avant d'ouvrir la boîte d'impression
        setTimeout(function() {
            if (doc && doc.focus) doc.focus();
            if (doc && doc.print) doc.print();
            // Nettoyer l'iframe après l'impression
            setTimeout(function() { document.body.removeChild(iframe); }, 300);
        }, 50);
    };
}

// Réinitialiser tous les champs de l'onglet actuel
async function handleReinitialiser() {
    // Sauvegarder automatiquement avant de réinitialiser
    await saveTicket(false);
    
    // Réinitialiser directement sans confirmation
        const currentTabId = globalState.currentTabId;
        const currentTab = globalState.tabs[currentTabId];

        if (!currentTab) return;

        // Reset de l'état de l'onglet actuel seulement
        currentTab.nom = '';
        currentTab.prenom = '';
        currentTab.telephone = '';
        currentTab.email = '';
        currentTab.nbPaires = 0;
        currentTab.paires = [];
        currentTab.jourRetrait = null;
        currentTab.heureRetrait = null;
        currentTab.pasUrgent = false;
        currentTab.avecSac = false;
        currentTab.accessoires = [];
        currentTab.noteRetrait = '';
        currentTab.total = 0;
        currentTab.selectedCustomer = null;

        // Reset des champs HTML spécifiques à l'onglet actuel
        const nomInput = getCurrentTabElement('nom');
        const prenomInput = getCurrentTabElement('prenom');
        const telephoneInput = getCurrentTabElement('telephone');
        const emailInput = getCurrentTabElement('email');
        const heureInput = getCurrentTabElement('heure-retrait');
        const pairesSelect = getCurrentTabElement('paires-select');

        if (nomInput) nomInput.value = '';
        if (prenomInput) prenomInput.value = '';
        if (telephoneInput) telephoneInput.value = '';
        if (emailInput) emailInput.value = '';
        if (heureInput) heureInput.value = '';

        // Masquer les suggestions si elles sont visibles
        hideSuggestions();

        // Reset des boutons dans l'onglet actuel seulement
        const currentTabContent = document.querySelector(`#tab-content-${currentTabId}`);
        if (currentTabContent) {
            currentTabContent.querySelectorAll('.paire-btn').forEach(btn => btn.classList.remove('active'));
            currentTabContent.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
        }

        // Reset du sélecteur de paires
        if (pairesSelect) {
            pairesSelect.value = '';
            // Ne plus cacher le select car il est maintenant toujours visible
        }

        // Mise à jour des affichages pour l'onglet actuel
        updatePairesDisplay();
        calculateTotal();
        updateTickets();
        updateTabTitle(currentTabId);

        // Ajuster la hauteur du ticket cordonnier après réinitialisation
        const ticketCordonnier = getCurrentTabElement('ticket-cordonnier-content');
        if (ticketCordonnier) {
            adjustTextareaHeight(ticketCordonnier);
        }

        showTemporaryMessage(`Onglet "${currentTab.title}" réinitialisé`, 'success');
}

// Fonction pour afficher un message temporaire
function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message temp-message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
        }
    }, 4000);
}

// Fonction pour afficher une boîte de dialogue de confirmation
function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <h3>Confirmation</h3>
            <p>${message}</p>
            <div class="confirm-actions">
                <button class="btn-confirm-cancel">Annuler</button>
                <button class="btn-confirm-ok">Confirmer</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Gestion des boutons
    dialog.querySelector('.btn-confirm-ok').addEventListener('click', () => {
        document.body.removeChild(overlay);
        onConfirm();
    });
    
    dialog.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// ==================== FONCTIONS D'ÉDITION DES PRESTATIONS ====================

// Éditer le nom d'une prestation
function editPrestationName(paireId, prestationIndex) {
    // Chercher dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (!currentTabContent) return;

    // Chercher le tag de prestation spécifique
    const prestationTag = currentTabContent.querySelector(`[data-paire-id="${paireId}"] .prestation-tag[data-prestation-index="${prestationIndex}"]`);
    if (!prestationTag) return;

    const nameElement = prestationTag.querySelector('.prestation-tag-name');
    if (!nameElement) return;

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    const currentName = currentTab.paires[paireId - 1].prestations[prestationIndex].type;

    // Créer un champ de saisie
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'prestation-edit-input';
    
    // Ajuster la largeur en fonction du contenu
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.fontSize = '12px';
    tempSpan.style.fontWeight = '600';
    tempSpan.style.padding = '4px 6px';
    tempSpan.textContent = currentName;
    document.body.appendChild(tempSpan);
    
    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);
    
    // Définir une largeur minimale et maximale
    const minWidth = 100;
    const maxWidth = 250;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 20));
    input.style.width = calculatedWidth + 'px';

    // Ajouter la classe editing pour supprimer les contraintes CSS
    nameElement.classList.add('editing');
    
    // Remplacer le texte par l'input
    nameElement.innerHTML = '';
    nameElement.appendChild(input);
    input.focus();
    input.select();

    // Ajuster la largeur pendant la saisie
    input.addEventListener('input', () => {
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.fontSize = '12px';
        tempSpan.style.fontWeight = '600';
        tempSpan.style.padding = '4px 6px';
        tempSpan.textContent = input.value || 'A'; // Utiliser 'A' comme minimum
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        const minWidth = 100;
        const maxWidth = 250;
        const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 20));
        input.style.width = calculatedWidth + 'px';
    });

    // Empêcher la propagation des événements pour éviter la fermeture prématurée
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    // Gérer la sauvegarde
    function saveName() {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            const currentTab = globalState.tabs[globalState.currentTabId];
            if (currentTab) {
                currentTab.paires[paireId - 1].prestations[prestationIndex].type = newName;
                updatePairesDisplay();
                updateTickets();
            }
            showTemporaryMessage('Nom de prestation modifié', 'success');
        } else {
            // Restaurer l'affichage original
            nameElement.textContent = currentName.length > 15 ? currentName.substring(0, 12) + '...' : currentName;
        }
        // Supprimer la classe editing
        nameElement.classList.remove('editing');
    }

    // Sauvegarder sur Enter ou perte de focus
    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            saveName();
        } else if (e.key === 'Escape') {
            nameElement.textContent = currentName.length > 15 ? currentName.substring(0, 12) + '...' : currentName;
            nameElement.classList.remove('editing');
        }
    });

    input.addEventListener('blur', saveName);
}

// Éditer le prix d'une prestation
function editPrestationPrice(paireId, prestationIndex) {
    // Chercher dans l'onglet actuel
    const currentTabContent = document.querySelector(`#tab-content-${globalState.currentTabId}`) ||
                             document.querySelector('.tab-content.active');
    if (!currentTabContent) return;

    // Chercher le tag de prestation spécifique
    const prestationTag = currentTabContent.querySelector(`[data-paire-id="${paireId}"] .prestation-tag[data-prestation-index="${prestationIndex}"]`);
    if (!prestationTag) return;

    const priceElement = prestationTag.querySelector('.prestation-tag-price');
    if (!priceElement) return;

    const currentTab = globalState.tabs[globalState.currentTabId];
    if (!currentTab) return;
    
    const currentPrice = currentTab.paires[paireId - 1].prestations[prestationIndex].prix;

    // Créer un champ de saisie
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentPrice;
    input.className = 'prestation-edit-input';
    input.min = '0';
    input.step = '0.01';

    // Ajouter la classe editing pour supprimer les contraintes CSS
    priceElement.classList.add('editing');
    
    // Remplacer le prix par l'input
    priceElement.innerHTML = '';
    priceElement.appendChild(input);
    input.focus();
    input.select();

    // Empêcher la propagation des événements pour éviter la fermeture prématurée
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    // Gérer la sauvegarde
    function savePrice() {
        const newPrice = parseFloat(input.value);
        if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== currentPrice) {
            const currentTab = globalState.tabs[globalState.currentTabId];
            if (currentTab) {
                currentTab.paires[paireId - 1].prestations[prestationIndex].prix = newPrice;
                // Recalculer le total de la paire
                currentTab.paires[paireId - 1].total = currentTab.paires[paireId - 1].prestations.reduce((sum, p) => sum + p.prix, 0);
                updatePairesDisplay();
                calculateTotal();
            }
            updateTickets();
            showTemporaryMessage('Prix modifié', 'success');
        } else {
            // Restaurer l'affichage original
            priceElement.textContent = currentPrice === 0 ? 'Offert' : currentPrice.toFixed(2) + '€';
        }
        // Supprimer la classe editing
        priceElement.classList.remove('editing');
    }

    // Sauvegarder sur Enter ou perte de focus
    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            savePrice();
        } else if (e.key === 'Escape') {
            priceElement.textContent = currentPrice === 0 ? 'Offert' : currentPrice.toFixed(2) + '€';
            priceElement.classList.remove('editing');
        }
    });

    input.addEventListener('blur', savePrice);
}

// ===== SYSTÈME D'ONGLETS =====

// Initialisation du système d'onglets
function initializeTabSystem() {
    // Bouton + Onglet est maintenant créé dynamiquement dans updateTabsDisplay()
    
    // Gestion des clics sur les onglets
    document.addEventListener('click', handleTabClick);
    
    // Mise à jour de l'affichage initial
    updateTabsDisplay();
    switchToTab(1);
}

// Créer un nouvel onglet
function createNewTab() {
    // Sauvegarder l'état de l'onglet actuel avant de créer le nouveau
    saveCurrentTabState();
    
    // Trouver le premier numéro d'onglet disponible
    const existingIds = Object.keys(globalState.tabs).map(id => parseInt(id)).sort((a, b) => a - b);
    let newTabId = 1;
    
    // Chercher le premier numéro disponible
    for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== i + 1) {
            newTabId = i + 1;
            break;
        }
        newTabId = existingIds[i] + 1;
    }
    
    const newTabTitle = `Ticket ${newTabId}`;
    
    // Créer l'état du nouvel onglet - COMPLÈTEMENT VIDE
    globalState.tabs[newTabId] = {
        id: newTabId,
        title: newTabTitle,
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        nbPaires: 0,
        paires: [],
        jourRetrait: null,
        heureRetrait: null,
        total: 0,
        selectedCustomer: null,
        paymentStatus: null,
        pasUrgent: false, // true si l'utilisateur a cliqué sur "pas urgent"
        avecSac: false, // true si l'utilisateur a cliqué sur "avec sac"
        accessoires: [], // Array des accessoires sélectionnés ['sac', 'housses', 'embau choirs', 'boite']
        createdAt: new Date().toISOString() // Date de création du ticket
    };
    
    // Créer le contenu HTML du nouvel onglet
    createTabContent(newTabId);
    
    // Mettre à jour nextTabId pour la prochaine création
    globalState.nextTabId = Math.max(...Object.keys(globalState.tabs).map(id => parseInt(id))) + 1;
    
    // Mettre à jour l'affichage des onglets
    updateTabsDisplay();
    
    // IMPORTANT: Changer l'onglet actuel AVANT de réinitialiser appState
    globalState.currentTabId = newTabId;
    
    // Réinitialiser complètement l'état pour garantir que le nouvel onglet soit vide
    // On ne peut pas utiliser Object.assign avec appState car c'est un Proxy
    // On doit assigner directement à l'onglet dans globalState
    const currentTab = globalState.tabs[newTabId];
    currentTab.nom = '';
    currentTab.prenom = '';
    currentTab.telephone = '';
    currentTab.email = '';
    currentTab.nbPaires = 0;
    currentTab.paires = [];
    currentTab.jourRetrait = null;
    currentTab.heureRetrait = null;
    currentTab.pasUrgent = false;
    currentTab.avecSac = false;
    currentTab.total = 0;
    currentTab.selectedCustomer = null;
    currentTab.paymentStatus = null;
    
    // Basculer vers le nouvel onglet (sans appeler restoreTabState car l'état est déjà vide)
    switchToTabWithoutRestore(newTabId);
    
    // IMPORTANT: Réinitialiser l'état du nouvel onglet
    // Cela garantit que nbPaires, paires, et total sont à 0
    const newTab = globalState.tabs[newTabId];
    if (newTab) {
        newTab.nbPaires = 0;
        newTab.paires = [];
        newTab.total = 0;
    }
    
    // Réinitialiser l'autocomplétion pour le nouvel onglet
    setupLocalAutocomplete();
    
    // Masquer les sections prestations, jour de retrait et total pour le nouvel onglet
    toggleSectionsVisibility(false);
    
    showTemporaryMessage(`Nouvel onglet "${newTabTitle}" créé`, 'success');
}

// Créer le contenu HTML d'un onglet
function createTabContent(tabId) {
    const mainContent = document.querySelector('.main-content');
    const existingTabContent = document.querySelector('#tab-content-1');
    const existingSidebar = document.querySelector('.ticket-client-sidebar');
    
    // Cloner le contenu de l'onglet 1 pour créer le nouveau contenu
    const newTabContent = existingTabContent.cloneNode(true);
    newTabContent.id = `tab-content-${tabId}`;
    newTabContent.classList.remove('active');
    
    // Cloner la sidebar pour le nouvel onglet
    const newSidebar = existingSidebar.cloneNode(true);
    newSidebar.id = `sidebar-${tabId}`;
    newSidebar.classList.add('ticket-client-sidebar');
    newSidebar.style.display = 'none'; // Masqué par défaut
    
    // Modifier les IDs pour éviter les doublons
    updateElementIds(newTabContent, tabId);
    updateElementIds(newSidebar, tabId);
    
    // Réinitialiser tous les champs dans le nouveau contenu
    resetTabFields(newTabContent);
    resetSidebarFields(newSidebar);
    
    // Ajouter le nouveau contenu et la sidebar
    mainContent.appendChild(newTabContent);
    mainContent.appendChild(newSidebar);
    
    // Réattacher les événements pour ce nouvel onglet
    attachTabEventListeners(tabId);

    // Afficher les prix sur les boutons de prestations du nouvel onglet
    const newPrestationButtons = newTabContent.querySelectorAll('.prestation-btn[data-prix]');
    newPrestationButtons.forEach(button => {
        const prix = button.getAttribute('data-prix');
        const currentText = button.textContent;

        if (prix && !currentText.includes('€')) {
            button.innerHTML = `
                <span class="prestation-name">${currentText}</span>
                <span class="prestation-price-on-button">${prix}€</span>
            `;
        }
    });
}

// Modifier les IDs des éléments pour éviter les doublons
function updateElementIds(container, tabId) {
    // Liste des IDs à modifier
    const idsToUpdate = [
        'nom', 'prenom', 'telephone', 'email', 'suggestions-list', 'search-id',
        'show-more-btn', 'paires-select', 'paires-prestations',
        'heure-retrait', 'total-prix', 'add-custom', 'custom-prestations-list',
        'ticket-cordonnier-content', // 'ticket-client-content' retiré
        'imprimer-client', 'imprimer-cordonnier', 'reinitialiser', 'plus-onglet',
        'jour-retrait-section', 'total-section', 'prestations-section',
        'pas-urgent-btn', 'payment-paid', 'payment-unpaid', 'payment-remaining',
        'remaining-amount-container', 'remaining-amount', 'paid-amount-display',
        'paid-amount-text', 'confirm-remaining', 'cancel-remaining',
        'calendar-btn', 'date-picker', 'avec-sac-btn', 'sac-menu-content',
        'sac-sac', 'sac-housses', 'sac-embau choirs', 'sac-boite', 'create-customer-btn', 'note-retrait'
    ];
    
    idsToUpdate.forEach(originalId => {
        const element = container.querySelector(`#${originalId}`);
        if (element) {
            const newId = `${originalId}-${tabId}`;
            element.id = newId;
            if (originalId === 'note-retrait') {
                console.log(`🔄 Updated note-retrait ID to: ${newId}`);
            }
        } else if (originalId === 'note-retrait') {
            console.log(`❌ note-retrait element not found in container for tab ${tabId}`);
        }
    });
    
    // Les data-jour restent inchangés pour simplifier la logique
    // Les boutons de jour sont identifiés par leur conteneur parent (onglet)
}

// Réinitialiser les champs d'un onglet
function resetTabFields(tabContent) {
    // Réinitialiser les champs de saisie
    const inputs = tabContent.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Réinitialiser les boutons de paires
    const paireButtons = tabContent.querySelectorAll('.paire-btn');
    paireButtons.forEach(btn => btn.classList.remove('active'));
    
    // Réinitialiser les boutons de jour
    const jourButtons = tabContent.querySelectorAll('.jour-btn');
    jourButtons.forEach(btn => btn.classList.remove('active'));
    
    // Réinitialiser la sélection d'heure
    const heureSelect = tabContent.querySelector('[id^="heure-retrait"]');
    if (heureSelect) heureSelect.value = '';
    
    // Réinitialiser le sélecteur de paires
    const pairesSelect = tabContent.querySelector('[id^="paires-select"]');
    if (pairesSelect) {
        pairesSelect.value = '';
        // Ne plus cacher le select car il est maintenant toujours visible
    }
    
    // Vider complètement les paires et prestations
    const pairesContainer = tabContent.querySelector('[id^="paires-prestations"]');
    if (pairesContainer) {
        pairesContainer.innerHTML = '';
    }
    
    // Réinitialiser le total
    const totalElement = tabContent.querySelector('[id^="total-prix"]');
    if (totalElement) totalElement.textContent = '0.00';
    
    // Réinitialiser les suggestions de clients
    const suggestionsList = tabContent.querySelector('[id^="suggestions-list"]');
    if (suggestionsList) suggestionsList.innerHTML = '';
    
    // Réinitialiser les prestations personnalisées
    const customPrestationsList = tabContent.querySelector('[id^="custom-prestations-list"]');
    if (customPrestationsList) customPrestationsList.innerHTML = '';
    
    // Masquer les sections prestations, jour de retrait et total pour les nouveaux onglets
    const prestationsSection = tabContent.querySelector('[id^="prestations-section"]');
    const jourRetraitSection = tabContent.querySelector('[id^="jour-retrait-section"]');
    const totalSection = tabContent.querySelector('[id^="total-section"]');
    
    if (prestationsSection) {
        prestationsSection.classList.add('hidden-until-paires');
        prestationsSection.classList.remove('show-after-paires');
    }
    if (jourRetraitSection) {
        jourRetraitSection.classList.add('hidden-until-paires');
        jourRetraitSection.classList.remove('show-after-paires');
    }
    if (totalSection) {
        totalSection.classList.add('hidden-until-paires');
        totalSection.classList.remove('show-after-paires');
    }
}

// Réinitialiser les champs de la sidebar
function resetSidebarFields(sidebar) {
    // Vider les tickets
    // const ticketClient = sidebar.querySelector('[id^="ticket-client-content"]'); // Aperçu retiré
    const ticketCordonnier = sidebar.querySelector('[id^="ticket-cordonnier-content"]');
    // if (ticketClient) ticketClient.value = ''; // Aperçu retiré
    if (ticketCordonnier) ticketCordonnier.value = '';
    
    // Réinitialiser les boutons de jour (enlever la classe active)
    const jourButtons = sidebar.querySelectorAll('.jour-btn');
    jourButtons.forEach(btn => btn.classList.remove('active'));
    
    // Réinitialiser le sélecteur d'heure
    const heureSelect = sidebar.querySelector('[id^="heure-retrait"]');
    if (heureSelect) heureSelect.value = '';
    
    // Réinitialiser les boutons de paiement
    const paymentButtons = sidebar.querySelectorAll('.payment-btn');
    paymentButtons.forEach(btn => btn.classList.remove('active'));
    
    // Réinitialiser le bouton "Pas urgent"
    const pasUrgentBtn = sidebar.querySelector('[id^="pas-urgent-btn"]');
    if (pasUrgentBtn) pasUrgentBtn.classList.remove('active');
    
    // Réinitialiser le bouton "Avec sac"
    const avecSacBtn = sidebar.querySelector('[id^="avec-sac-btn"]');
    if (avecSacBtn) avecSacBtn.classList.remove('active');

    // Réinitialiser les cases à cocher des accessoires
    const sacCheckboxes = sidebar.querySelectorAll('.sac-checkbox');
    sacCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Réinitialiser la note de retrait
    const noteTextarea = sidebar.querySelector('[id^="note-retrait"]');
    if (noteTextarea) noteTextarea.value = '';
}

// Attacher les événements à un onglet spécifique
function attachTabEventListeners(tabId) {
    const tabContent = document.querySelector(`#tab-content-${tabId}`);
    const sidebar = document.querySelector(`#sidebar-${tabId}`);
    if (!tabContent) return;

    // Champs de saisie principaux
    const nomInput = tabContent.querySelector(`#nom-${tabId}`);
    const prenomInput = tabContent.querySelector(`#prenom-${tabId}`);
    const telephoneInput = tabContent.querySelector(`#telephone-${tabId}`);
    const emailInput = tabContent.querySelector(`#email-${tabId}`);

    if (nomInput) nomInput.addEventListener('input', handleNomChange);
    if (prenomInput) prenomInput.addEventListener('input', handlePrenomChange);
    if (telephoneInput) telephoneInput.addEventListener('input', handleTelephoneChange);
    if (emailInput) emailInput.addEventListener('input', handleEmailChange);

    // Boutons de paires
    const paireButtons = tabContent.querySelectorAll('.paire-btn');
    paireButtons.forEach(btn => {
        btn.addEventListener('click', handlePairesButtonClick);
    });

    // Le select est maintenant toujours visible, pas besoin d'événement

    // Select des paires
    const pairesSelect = tabContent.querySelector(`#paires-select-${tabId}`);
    if (pairesSelect) pairesSelect.addEventListener('change', handlePairesSelectChange);

    // Boutons de jour (ils sont dans la sidebar, pas dans le tabContent)
    let jourButtons = [];
    if (sidebar) {
        jourButtons = sidebar.querySelectorAll('.jour-btn');
    }
    jourButtons.forEach(btn => {
        btn.addEventListener('click', handleJourButtonClick);
    });

    // Bouton "Pas urgent" (il est dans la sidebar, pas dans le tabContent)
    let pasUrgentBtn = null;
    if (sidebar) {
        pasUrgentBtn = sidebar.querySelector(`#pas-urgent-btn-${tabId}`);
    }
    if (pasUrgentBtn) pasUrgentBtn.addEventListener('click', handlePasUrgentClick);

    // Bouton "Avec sac" (il est dans la sidebar, pas dans le tabContent)
    let avecSacBtn = null;
    if (sidebar) {
        avecSacBtn = sidebar.querySelector(`#avec-sac-btn-${tabId}`);
    }
    if (avecSacBtn) avecSacBtn.addEventListener('click', handleAvecSacClick);

    // Cases à cocher des accessoires pour ce sidebar
    if (sidebar) {
        sidebar.querySelectorAll('.sac-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleSacCheckboxChange);
        });

        // Clics sur les options complètes pour ce sidebar
        sidebar.querySelectorAll('.sac-option').forEach(option => {
            option.addEventListener('click', handleSacOptionClick);
        });
    }

    // Bouton calendrier et date picker (ils sont dans la sidebar)
    let calendarBtn = null;
    let datePicker = null;
    if (sidebar) {
        calendarBtn = sidebar.querySelector(`#calendar-btn-${tabId}`);
        datePicker = sidebar.querySelector(`#date-picker-${tabId}`);
    }
    if (calendarBtn) calendarBtn.addEventListener('click', handleCalendarClick);
    if (datePicker) datePicker.addEventListener('change', handleDatePickerChange);

    // Heure de retrait (elle est dans la sidebar, pas dans le tabContent)
    let heureSelect = null;
    if (sidebar) {
        heureSelect = sidebar.querySelector(`#heure-retrait-${tabId}`);
    }
    if (heureSelect) heureSelect.addEventListener('change', handleHeureRetraitChange);

    // Note de retrait (elle est dans la sidebar, pas dans le tabContent)
    let noteTextarea = null;
    if (sidebar) {
        noteTextarea = sidebar.querySelector(`#note-retrait-${tabId}`);
        console.log(`🔍 Looking for note textarea in sidebar for tab ${tabId}`);
        console.log(`🔍 Sidebar contains:`, sidebar.querySelectorAll('[id*="note-retrait"]'));
    }
    if (noteTextarea) {
        noteTextarea.addEventListener('input', handleNoteRetraitChange);
        console.log(`✅ Attached note event for tab ${tabId}: ${noteTextarea.id}`);
        // Test immédiat
        noteTextarea.addEventListener('focus', () => console.log(`🎯 Note textarea focused for tab ${tabId}`));
    } else {
        console.warn(`❌ Note textarea not found for tab ${tabId}`);
        if (sidebar) {
            console.log(`ℹ️ Sidebar HTML:`, sidebar.innerHTML.substring(0, 500));
        }
    }

    // Bouton prestation personnalisée
    const addCustomBtn = tabContent.querySelector(`#add-custom-${tabId}`);
    if (addCustomBtn) addCustomBtn.addEventListener('click', handleAddCustomPrestation);

    // Bouton réinitialiser
    const reinitialiserBtn = tabContent.querySelector(`#reinitialiser-${tabId}`);
    if (reinitialiserBtn) reinitialiserBtn.addEventListener('click', handleReinitialiser);

    // Bouton créer un client
    const createCustomerBtn = tabContent.querySelector(`#create-customer-btn-${tabId}`);
    if (createCustomerBtn) createCustomerBtn.addEventListener('click', handleCreateCustomerClick);

    // Bouton + Onglet
    const plusOngletBtn = tabContent.querySelector(`#plus-onglet-${tabId}`);
    if (plusOngletBtn) plusOngletBtn.addEventListener('click', createNewTab);

    // Boutons d'impression dans la sidebar
    if (sidebar) {
        const imprimerClientBtn = sidebar.querySelector(`#imprimer-client-${tabId}`);
        const imprimerCordonnierBtn = sidebar.querySelector(`#imprimer-cordonnier-${tabId}`);

        if (imprimerClientBtn) imprimerClientBtn.addEventListener('click', () => handleImprimer('client'));
        if (imprimerCordonnierBtn) imprimerCordonnierBtn.addEventListener('click', () => handleImprimer('cordonnier'));

        // Boutons de paiement
        const paymentPaidBtn = sidebar.querySelector(`#payment-paid-${tabId}`);
        const paymentUnpaidBtn = sidebar.querySelector(`#payment-unpaid-${tabId}`);
        const paymentRemainingBtn = sidebar.querySelector(`#payment-remaining-${tabId}`);

        if (paymentPaidBtn) paymentPaidBtn.addEventListener('click', () => setPaymentStatus('paid'));
        if (paymentUnpaidBtn) paymentUnpaidBtn.addEventListener('click', () => setPaymentStatus('unpaid'));
        if (paymentRemainingBtn) paymentRemainingBtn.addEventListener('click', () => toggleRemainingAmount());

        // Boutons de montant restant
        const confirmRemainingBtn = sidebar.querySelector(`#confirm-remaining-${tabId}`);
        const cancelRemainingBtn = sidebar.querySelector(`#cancel-remaining-${tabId}`);

        if (confirmRemainingBtn) confirmRemainingBtn.addEventListener('click', confirmRemainingAmount);
        if (cancelRemainingBtn) cancelRemainingBtn.addEventListener('click', cancelRemainingAmount);
    }

    // Réattacher les événements drag & drop et de clic aux boutons de prestations
    const prestationButtons = tabContent.querySelectorAll('.prestation-btn.draggable');
    prestationButtons.forEach(btn => {
        // Vérifier que le bouton a les attributs nécessaires
        if (!btn.dataset.type || !btn.dataset.prix) {
            console.warn('Bouton de prestation sans attributs data-type ou data-prix:', btn);
        }
        btn.addEventListener('dragstart', handleDragStart);
        btn.addEventListener('dragend', handleDragEnd);
        btn.addEventListener('click', handlePrestationClick);
    });

    // Attacher les événements de clic aux cartes de paires existantes
    attachPaireClickEvents(tabId);
}

// Attacher les événements de clic aux cartes de paires pour un onglet spécifique
function attachPaireClickEvents(tabId) {
    const tabContent = document.querySelector(`#tab-content-${tabId}`);
    if (!tabContent) return;

    const paireCards = tabContent.querySelectorAll('.paire-card');
    paireCards.forEach(card => {
        // Vérifier si l'événement n'est pas déjà attaché
        if (!card.hasClickListener) {
            const paireId = parseInt(card.dataset.paireId);
            card.addEventListener('click', (e) => {
                // Ne pas déclencher si c'est un double-clic
                if (e.detail === 2) return;
                selectPaire(paireId);
            });
            card.hasClickListener = true; // Marquer comme ayant l'événement
        }
    });
}

// Mettre à jour l'affichage des onglets
function updateTabsDisplay() {
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';
    
    Object.values(globalState.tabs).forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${tab.id === globalState.currentTabId ? 'active' : ''}`;
        tabElement.setAttribute('data-tab-id', tab.id);
        
        tabElement.innerHTML = `
            <span class="tab-title">${tab.title}</span>
            ${Object.keys(globalState.tabs).length > 1 ? 
                `<button class="tab-close" data-tab-id="${tab.id}" title="Fermer l'onglet">×</button>` : 
                ''
            }
        `;
        
        tabsList.appendChild(tabElement);
    });
    
    // Ajouter le bouton + Onglet à la fin
    const plusOngletBtn = document.createElement('button');
    plusOngletBtn.id = 'plus-onglet';
    plusOngletBtn.className = 'btn-plus-onglet';
    plusOngletBtn.title = 'Créer un nouvel onglet';
    plusOngletBtn.textContent = '+ Onglet';
    plusOngletBtn.addEventListener('click', createNewTab);
    
    tabsList.appendChild(plusOngletBtn);
}

// Basculer vers un onglet
function switchToTab(tabId) {
    // Sauvegarder l'état de l'onglet actuel
    saveCurrentTabState();

    // Changer l'onglet actuel
    globalState.currentTabId = tabId;

    // Mettre à jour l'affichage des onglets
    updateTabsDisplay();

    // Masquer tous les contenus d'onglets et toutes les sidebars
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelectorAll('.ticket-client-sidebar').forEach(sidebar => {
        sidebar.style.display = 'none';
    });

    // Afficher le contenu de l'onglet sélectionné
    const targetTabContent = document.querySelector(`#tab-content-${tabId}`);
    if (targetTabContent) {
        targetTabContent.classList.add('active');
    }

    // Afficher la sidebar correspondante
    const targetSidebar = document.querySelector(`#sidebar-${tabId}`) || document.querySelector('.ticket-client-sidebar');
    if (targetSidebar) {
        targetSidebar.style.display = 'flex';
    }

    // Restaurer l'état de l'onglet
    restoreTabState(tabId);

    // Mettre à jour les tickets et ajuster la hauteur
    updateTickets();

    // Mettre à jour les boutons de paiement
    updatePaymentButtons();

    // Réattacher les événements de clic aux prestations pour l'onglet actif
    reattachPrestationClickEvents();
    
    // Réinitialiser l'autocomplétion pour l'onglet actif
    setupLocalAutocomplete();
}

// Réattacher les événements de clic aux prestations
function reattachPrestationClickEvents() {
    // D'abord, supprimer tous les événements existants pour éviter les doublons
    document.querySelectorAll('.prestation-btn.draggable').forEach(btn => {
        // Vérifier que le bouton a les attributs nécessaires
        if (!btn.dataset.type || !btn.dataset.prix) {
            console.warn('Bouton de prestation sans attributs data-type ou data-prix:', btn);
        }
        btn.removeEventListener('click', handlePrestationClick);
        btn.addEventListener('click', handlePrestationClick);
    });
}

// Basculer vers un onglet sans restaurer l'état (pour les nouveaux onglets)
function switchToTabWithoutRestore(tabId) {
    // Changer l'onglet actuel
    globalState.currentTabId = tabId;

    // Mettre à jour l'affichage des onglets
    updateTabsDisplay();

    // Masquer tous les contenus d'onglets et toutes les sidebars
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelectorAll('.ticket-client-sidebar').forEach(sidebar => {
        sidebar.style.display = 'none';
    });

    // Afficher le contenu de l'onglet sélectionné
    const targetTabContent = document.querySelector(`#tab-content-${tabId}`);
    if (targetTabContent) {
        targetTabContent.classList.add('active');
    }

    // Afficher la sidebar correspondante
    const targetSidebar = document.querySelector(`#sidebar-${tabId}`) || document.querySelector('.ticket-client-sidebar');
    if (targetSidebar) {
        targetSidebar.style.display = 'flex';
    }

    // Mettre à jour l'affichage sans restaurer l'état
    updateTickets();

    // Mettre à jour les boutons de paiement
    updatePaymentButtons();
    
    // Mettre à jour le bouton "Pas urgent"
    updatePasUrgentButton();
    
    // S'assurer que les boutons de jour sont réinitialisés pour le nouvel onglet
    if (targetSidebar) {
        targetSidebar.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
    }

    // Réattacher les événements de clic aux prestations pour le nouvel onglet
    reattachPrestationClickEvents();
    
    // Réinitialiser l'autocomplétion pour le nouvel onglet
    setupLocalAutocomplete();
}

// Sauvegarder l'état de l'onglet actuel
function saveCurrentTabState() {
    const currentTab = getCurrentTabState();
    if (!currentTab) return;
    
    const currentTabId = globalState.currentTabId;
    
    // Utiliser les éléments spécifiques à l'onglet actuel
    const nomInput = getCurrentTabElement('nom') || document.getElementById('nom');
    const prenomInput = getCurrentTabElement('prenom') || document.getElementById('prenom');
    const telephoneInput = getCurrentTabElement('telephone') || document.getElementById('telephone');
    const emailInput = getCurrentTabElement('email') || document.getElementById('email');
    const heureInput = getCurrentTabElement('heure-retrait') || document.getElementById('heure-retrait');
    
    // Sauvegarder les valeurs des champs de l'onglet actuel
    currentTab.nom = nomInput?.value || '';
    currentTab.prenom = prenomInput?.value || '';
    currentTab.telephone = telephoneInput?.value || '';
    currentTab.email = emailInput?.value || '';
    currentTab.jourRetrait = getCurrentJourRetrait();
    currentTab.heureRetrait = heureInput?.value || '';
    
    // Les paires et prestations sont déjà dans currentTab, pas besoin de les sauvegarder
    // currentTab est déjà défini plus haut dans la fonction
}

// Restaurer l'état d'un onglet
function restoreTabState(tabId) {
    const tab = globalState.tabs[tabId];
    if (!tab) return;
    
    // Changer d'abord l'onglet actuel pour que getCurrentTabElement fonctionne
    const previousTabId = globalState.currentTabId;
    globalState.currentTabId = tabId;
    
    // Utiliser les éléments spécifiques à l'onglet cible
    const nomInput = getCurrentTabElement('nom') || document.getElementById('nom');
    const prenomInput = getCurrentTabElement('prenom') || document.getElementById('prenom');
    const telephoneInput = getCurrentTabElement('telephone') || document.getElementById('telephone');
    const emailInput = getCurrentTabElement('email') || document.getElementById('email');
    const heureInput = document.querySelector(`#heure-retrait-${tabId}`) || document.getElementById('heure-retrait');
    const noteTextarea = document.querySelector(`#note-retrait-${tabId}`) || document.getElementById('note-retrait');
    
    // Restaurer les valeurs des champs
    if (nomInput) nomInput.value = tab.nom || '';
    if (prenomInput) prenomInput.value = tab.prenom || '';
    if (telephoneInput) telephoneInput.value = tab.telephone || '';
    if (emailInput) emailInput.value = tab.email || '';
    if (heureInput) heureInput.value = tab.heureRetrait || '';
    if (noteTextarea) noteTextarea.value = tab.noteRetrait || '';

    // Mettre à jour le titre de l'onglet après restauration
    updateTabTitle(tabId);
    
    // Restaurer la sélection du jour dans l'onglet cible
    restoreJourRetraitForTab(tab.jourRetrait, tabId);
    
    // Restaurer les paires et prestations SI il y en a
    if (tab.nbPaires > 0) {
        // Restaurer l'état sans réinitialiser les prestations existantes
        // Comme appState est un proxy, ces changements affecteront automatiquement l'onglet actuel
        // On copie directement dans l'état de l'onglet pour éviter les problèmes
        tab.nbPaires = tab.nbPaires;
        tab.paires = JSON.parse(JSON.stringify(tab.paires || [])); // Copie profonde pour sécurité
        tab.total = tab.total || 0;
        
        // Afficher les sections jour de retrait et total
        toggleSectionsVisibility(true);
        
        // Mettre à jour l'affichage des paires
        updatePairesDisplay();
        calculateTotal();
    } else {
        // S'assurer que l'onglet est vraiment vide
        tab.nbPaires = 0;
        tab.paires = [];
        tab.total = 0;
        
        // Masquer les sections jour de retrait et total
        toggleSectionsVisibility(false);
        
        // Vider l'affichage
        const container = getCurrentTabElement('paires-prestations');
        if (container) {
            container.innerHTML = '';
        }
        
        const totalElement = getCurrentTabElement('total-prix');
        if (totalElement) {
            totalElement.textContent = '0.00';
        }
    }
    
    // Mettre à jour l'affichage
    updateTickets();
}

// Obtenir le jour de retrait actuel
function getCurrentJourRetrait() {
    const activeJourBtn = document.querySelector('.jour-btn.active');
    return activeJourBtn ? activeJourBtn.textContent : '';
}

// Restaurer la sélection du jour
function restoreJourRetrait(jour) {
    // Retirer la classe active de tous les boutons dans l'onglet actuel (dans la sidebar)
    const currentSidebar = document.querySelector(`#sidebar-${globalState.currentTabId}`) || 
                           document.querySelector('.ticket-client-sidebar');
    if (currentSidebar) {
        currentSidebar.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
        
        // Ajouter la classe active au bon bouton
        if (jour) {
            const targetBtn = Array.from(currentSidebar.querySelectorAll('.jour-btn'))
                .find(btn => btn.textContent === jour);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }
        }
    }
}

// Restaurer la sélection du jour pour un onglet spécifique
function restoreJourRetraitForTab(jour, tabId) {
    // Retirer la classe active de tous les boutons dans l'onglet spécifié (dans la sidebar)
    const sidebar = document.querySelector(`#sidebar-${tabId}`);
    if (sidebar) {
        sidebar.querySelectorAll('.jour-btn').forEach(btn => btn.classList.remove('active'));
        
        // Ajouter la classe active au bon bouton
        if (jour) {
            const targetBtn = Array.from(sidebar.querySelectorAll('.jour-btn'))
                .find(btn => btn.textContent === jour);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }
        }
    }
}

// Fermer un onglet
function closeTab(tabId) {
    // Ne pas fermer s'il n'y a qu'un seul onglet
    if (Object.keys(globalState.tabs).length <= 1) {
        showTemporaryMessage('Impossible de fermer le dernier onglet', 'error');
        return;
    }
    
    // Supprimer l'onglet de l'état global
    delete globalState.tabs[tabId];
    
    // Supprimer le contenu HTML de l'onglet
    const tabContent = document.querySelector(`#tab-content-${tabId}`);
    if (tabContent) {
        tabContent.remove();
    }
    
    // Supprimer la sidebar correspondante
    const sidebar = document.querySelector(`#sidebar-${tabId}`);
    if (sidebar) {
        sidebar.remove();
    }
    
    // Si l'onglet fermé était l'onglet actuel, basculer vers un autre
    if (globalState.currentTabId === tabId) {
        const remainingTabs = Object.keys(globalState.tabs);
        if (remainingTabs.length > 0) {
            switchToTab(parseInt(remainingTabs[0]));
        }
    }
    
    // Mettre à jour l'affichage
    updateTabsDisplay();
    
    showTemporaryMessage(`Onglet fermé`, 'success');
}

// Gestion des clics sur les onglets
function handleTabClick(event) {
    const tab = event.target.closest('.tab');
    const closeBtn = event.target.closest('.tab-close');
    
    if (closeBtn) {
        // Clic sur le bouton de fermeture
        event.stopPropagation();
        const tabId = parseInt(closeBtn.getAttribute('data-tab-id'));
        closeTab(tabId);
    } else if (tab) {
        // Clic sur l'onglet
        const tabId = parseInt(tab.getAttribute('data-tab-id'));
        if (tabId && tabId !== globalState.currentTabId) {
            switchToTab(tabId);
        }
    }
}

// ===== FONCTIONS POUR LA GESTION DES TICKETS ET HISTORIQUE =====

// Variables globales pour les tickets
let currentTicketId = null;
let ticketHistory = [];
let autoSaveTimeout = null;
let isAutoSaving = false;
let lastSavedState = null;

// Fonction pour sauvegarder un ticket (avec option de validation)
async function saveTicket(validate = true) {
    const currentState = getCurrentTabState();
    
    // Validation des données requises (seulement si demandé)
    if (validate) {
        if (!currentState.nom && !currentState.prenom) {
            alert('Veuillez saisir au moins le nom ou le prénom du client');
            return;
        }
        
        if (currentState.nbPaires === 0) {
            alert('Veuillez sélectionner le nombre de paires');
            return;
        }
        
        if (currentState.total === 0) {
            alert('Veuillez ajouter au moins une prestation');
            return;
        }
    }
    
    // Vérifier si l'état a changé depuis la dernière sauvegarde
    const currentStateString = JSON.stringify(currentState);
    if (lastSavedState === currentStateString) {
        return; // Pas de changement, pas besoin de sauvegarder
    }
    
    // Préparer les données du ticket
    const ticketData = {
        customer_name: `${currentState.prenom} ${currentState.nom}`.trim(),
        customer_phone: currentState.telephone,
        customer_email: currentState.email,
        customer_id: currentState.selectedCustomer?.id || null,
        paires_count: currentState.nbPaires,
        prestations: currentState.paires,
        total_price: currentState.total,
        payment_status: currentState.paymentStatus || 'unpaid',
        paid_amount: currentState.paymentStatus === 'paid' ? currentState.total : 0,
        remaining_amount: currentState.paymentStatus === 'paid' ? 0 : currentState.total,
        pickup_day: currentState.jourRetrait,
        pickup_time: currentState.heureRetrait,
        pickup_date: currentState.dateRetrait || '',
        is_urgent: !currentState.pasUrgent,
        avec_sac: currentState.avecSac,
        accessoires: currentState.accessoires || []
    };
    
    try {
        let response;
        if (currentTicketId) {
            // Mise à jour d'un ticket existant
            response = await fetch(`/api/tickets/${currentTicketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ticketData)
            });
        } else {
            // Création d'un nouveau ticket
            response = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ticketData)
            });
        }
        
        if (response.ok) {
            const result = await response.json();
            currentTicketId = result.ticket.id;
            
            // Mettre à jour le numéro de ticket dans l'interface
            updateTicketNumberDisplay(result.ticket.ticket_number);
            
            // Marquer l'état comme sauvegardé
            lastSavedState = currentStateString;
            
            // Afficher un message seulement si c'est une sauvegarde manuelle
            if (validate) {
                alert('Ticket sauvegardé avec succès !');
            } else {
                // Indicateur visuel discret pour la sauvegarde automatique
                showAutoSaveIndicator();
            }
            
            // Recharger les tickets récents
            loadRecentTickets();
        } else {
            const error = await response.json();
            if (validate) {
                alert(`Erreur lors de la sauvegarde : ${error.error}`);
            } else {
                console.error('Erreur sauvegarde automatique:', error.error);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du ticket:', error);
        alert('Erreur lors de la sauvegarde du ticket');
    }
}

// Fonction pour mettre à jour l'affichage du numéro de ticket
function updateTicketNumberDisplay(ticketNumber) {
    // Ajouter le numéro de ticket dans l'interface si nécessaire
    const ticketNumberElement = document.getElementById('ticket-number-display');
    if (ticketNumberElement) {
        ticketNumberElement.textContent = `Ticket: ${ticketNumber}`;
    }
}

// Fonction pour déclencher la sauvegarde automatique
function triggerAutoSave() {
    // Annuler la sauvegarde précédente si elle n'a pas encore été exécutée
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Programmer une nouvelle sauvegarde dans 2 secondes
    autoSaveTimeout = setTimeout(() => {
        if (!isAutoSaving) {
            isAutoSaving = true;
            saveTicket(false).finally(() => {
                isAutoSaving = false;
            });
        }
    }, 2000);
}

// Fonction pour afficher l'indicateur de sauvegarde automatique
function showAutoSaveIndicator() {
    // Créer ou mettre à jour l'indicateur de sauvegarde
    let indicator = document.getElementById('auto-save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'auto-save-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = '💾 Sauvegardé automatiquement';
    indicator.style.opacity = '1';
    
    // Masquer l'indicateur après 2 secondes
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// Fonction pour charger les tickets récents
// État pour la pagination des tickets récents
let recentTicketsLoaded = 0;
let recentTicketsTotal = 0;

async function loadRecentTickets(limit = 10) {
    try {
        console.log(`📋 Loading ${limit} recent tickets (already loaded: ${recentTicketsLoaded})`);
        const response = await fetch(`/api/tickets/recent?limit=${limit}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`📦 Received ${data.tickets.length} tickets`);

            // Mettre à jour les compteurs
            recentTicketsLoaded = data.tickets.length;
            recentTicketsTotal = data.tickets.length; // On suppose qu'il y en a plus si on reçoit exactement la limite

            displayRecentTickets(data.tickets, limit > 10);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des tickets récents:', error);
    }
}

// Fonction pour charger plus de tickets
async function loadMoreRecentTickets() {
    const button = document.getElementById('load-more-btn');
    if (!button) return;

    // Désactiver le bouton pendant le chargement
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';

    const additionalLimit = 20; // Charger 20 tickets supplémentaires
    try {
        console.log(`📋 Loading ${additionalLimit} more recent tickets`);
        const response = await fetch(`/api/tickets/recent?limit=${recentTicketsLoaded + additionalLimit}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`📦 Received ${data.tickets.length} total tickets`);

            // Mettre à jour les compteurs
            recentTicketsLoaded = data.tickets.length;

            // Réactiver le bouton
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-plus"></i> Afficher plus de tickets';

            displayRecentTickets(data.tickets, true);
        } else {
            // En cas d'erreur, réactiver le bouton
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-plus"></i> Afficher plus de tickets';
            console.error('Erreur lors du chargement de plus de tickets');
        }
    } catch (error) {
        // En cas d'erreur, réactiver le bouton
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> Afficher plus de tickets';
        console.error('Erreur lors du chargement de plus de tickets:', error);
    }
}

// Fonction pour afficher les tickets récents
function displayRecentTickets(tickets, showLoadMore = false) {
    const container = document.getElementById('recent-tickets-left');
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Aucun ticket récent</p>';
        return;
    }

    let html = tickets.map(ticket => `
        <div class="ticket-item" onclick="loadTicketInNewTab('${ticket.id}')"
            <div class="ticket-header">
                <div class="ticket-customer-info">
                    <span class="ticket-customer">${ticket.customer_name || 'Client anonyme'}</span>
                    <span class="ticket-date">${new Date(ticket.created_at).toLocaleDateString('fr-FR')} ${new Date(ticket.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                    <button class="ticket-delete-btn" onclick="deleteTicket('${ticket.id}', event)" title="Supprimer ce ticket">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="ticket-all-details">
                    <span class="ticket-number">#${ticket.ticket_number}</span>
                    <span class="ticket-count">${ticket.paires_count}p</span>
                    <span class="ticket-price">${ticket.total_price.toFixed(2)}€</span>
                    <span class="ticket-status status-${ticket.payment_status}">${ticket.payment_status === 'paid' ? 'Payé' : ticket.payment_status === 'unpaid' ? 'Non' : ticket.payment_status === 'partial' ? 'Partiel' : ticket.payment_status}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Ajouter le bouton "Afficher plus" si demandé
    if (showLoadMore || recentTicketsLoaded >= 10) {
        html += `
            <div class="load-more-container">
                <button class="btn-load-more" onclick="loadMoreRecentTickets()" id="load-more-btn">
                    <i class="fas fa-plus"></i>
                    Afficher plus de tickets
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Fonction pour charger un ticket dans un nouvel onglet
async function loadTicketInNewTab(ticketId) {
    console.log(`🎫 Loading ticket in new tab: ${ticketId} (type: ${typeof ticketId})`);

    // Créer un nouvel onglet (createNewTab définit automatiquement globalState.currentTabId)
    createNewTab();
    const newTabId = globalState.currentTabId;
    console.log(`📋 New tab created: ${newTabId}`);

    // Charger le ticket dans le nouvel onglet (sans basculer vers l'onglet 1)
    await loadTicket(ticketId, newTabId);
}

// Fonction pour supprimer un ticket
async function deleteTicket(ticketId, event) {
    // Empêcher le clic de se propager au parent (chargement du ticket)
    event.stopPropagation();

    // Convertir l'ID en nombre pour éviter les erreurs de type
    const ticketIdNum = parseInt(ticketId, 10);

    // Vérifier que l'ID est valide
    if (isNaN(ticketIdNum) || ticketIdNum <= 0) {
        console.error('❌ Invalid ticket ID:', ticketId);
        showNotification('ID de ticket invalide', 'error');
        return;
    }

    // Demander confirmation
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.');

    if (!confirmDelete) {
        return;
    }

    try {
        console.log(`🗑️ Deleting ticket: ${ticketIdNum}`);

        // Faire la requête de suppression
        const response = await fetch(`/api/tickets/${ticketIdNum}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log(`✅ Ticket ${ticketIdNum} deleted successfully`);

            // Afficher un message de succès
            showNotification('Ticket supprimé avec succès', 'success');

            // Recharger les tickets récents
            await loadRecentTickets();

            // Fermer l'onglet si le ticket supprimé était chargé dans un onglet
            closeTabIfTicketDeleted(ticketIdNum);

        } else {
            const errorData = await response.json();
            console.error('❌ Failed to delete ticket:', errorData);
            showNotification('Erreur lors de la suppression du ticket', 'error');
        }

    } catch (error) {
        console.error('❌ Error deleting ticket:', error);
        showNotification('Erreur réseau lors de la suppression', 'error');
    }
}

// Fonction pour fermer l'onglet si le ticket supprimé était chargé
function closeTabIfTicketDeleted(ticketId) {
    // Cette fonction pourrait être étendue pour fermer automatiquement l'onglet
    // si le ticket supprimé était chargé dans cet onglet
    console.log(`🔍 Checking if ticket ${ticketId} was loaded in any tab...`);

    // Pour l'instant, on ne fait rien de spécial
    // Dans une version future, on pourrait vérifier si un onglet contient ce ticket
}

// Fonction pour afficher des notifications
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Afficher avec animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Masquer automatiquement après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fonction pour charger un ticket existant
async function loadTicket(ticketId, targetTabId = null) {
    console.log(`🎫 Loading ticket: ${ticketId} (type: ${typeof ticketId}) into tab: ${targetTabId || 'current'}`);

    try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        console.log(`📡 Response status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`📄 Received data:`, data);
            const ticket = data.ticket;

            if (!ticket) {
                console.error('❌ No ticket data in response');
                throw new Error('Aucune donnée de ticket reçue');
            }

            // Si un onglet cible est spécifié, basculer vers cet onglet
            if (targetTabId) {
                console.log(`🔄 Switching to target tab ${targetTabId} to load ticket data`);
                switchToTab(targetTabId);
            } else {
                // Sinon, utiliser l'onglet actuel ou basculer vers l'onglet 1 si nécessaire
                console.log(`🔄 Using current tab or switching to tab 1 if needed`);
                if (globalState.currentTabId !== 1) {
                    switchToTab(1);
                }
            }

            // Charger les données dans l'onglet actuel
            const currentState = getCurrentTabState();
            if (!currentState) {
                console.error('❌ No current tab state');
                console.log('📊 Available tabs:', Object.keys(globalState.tabs));
                console.log('📊 Current tab ID:', globalState.currentTabId);
                throw new Error('État de l\'onglet actuel introuvable');
            }

            console.log(`📝 Loading ticket data into tab ${globalState.currentTabId}`);
            
            // Parser le nom du client de manière sécurisée
            const customerName = ticket.customer_name || '';
            const nameParts = customerName.split(' ');
            currentState.prenom = nameParts[0] || '';
            currentState.nom = nameParts.slice(1).join(' ') || '';

            currentState.telephone = ticket.customer_phone || '';
            currentState.email = ticket.customer_email || '';
            currentState.nbPaires = ticket.paires_count || 0;

            console.log(`👤 Customer data loaded:`, {
                customerName,
                prenom: currentState.prenom,
                nom: currentState.nom,
                telephone: currentState.telephone,
                email: currentState.email,
                nbPaires: currentState.nbPaires
            });
            
            // Debug des prestations
            console.log(`🔍 Raw prestations data:`, ticket.prestations);
            console.log(`🔍 Prestations type:`, typeof ticket.prestations);
            console.log(`🔍 Prestations length:`, ticket.prestations ? ticket.prestations.length : 'N/A');
            
            // Traitement des prestations
            if (ticket.prestations && Array.isArray(ticket.prestations) && ticket.prestations.length > 0) {
                console.log(`🔧 Processing ${ticket.prestations.length} prestations`);
                
                // Regrouper les prestations par paire
                const prestationsParPaire = {};

                // Parcourir chaque paire dans ticket.prestations
                ticket.prestations.forEach((paire, index) => {
                    console.log(`  Paire ${index}:`, paire);
                    console.log(`    - ALL PROPERTIES:`, Object.keys(paire));

                    // Afficher toutes les propriétés pour voir ce qui est disponible
                    Object.keys(paire).forEach(key => {
                        console.log(`      ${key}: "${paire[key]}" (${typeof paire[key]})`);
                    });

                    const paireId = paire.id || index + 1;
                    if (!prestationsParPaire[paireId]) {
                        prestationsParPaire[paireId] = [];
                    }

                    // Maintenant traiter chaque prestation dans cette paire
                    if (paire.prestations && Array.isArray(paire.prestations)) {
                        paire.prestations.forEach((prestation, prestIndex) => {
                            console.log(`    Prestation ${prestIndex} dans paire ${paireId}:`, prestation);

                            // Essayer tous les noms de champs possibles pour le type
                            const type = prestation.type ||
                                        prestation.prestation_type ||
                                        prestation.name ||
                                        prestation.service_type ||
                                        prestation.service_name ||
                                        prestation.description ||
                                        prestation.titre ||
                                        prestation.libelle ||
                                        prestation.designation ||
                                        prestation.item_name ||
                                        prestation.product_name ||
                                        'Prestation inconnue';

                            console.log(`🔍 Trying to find type in:`, {
                                'prestation.type': prestation.type,
                                'prestation.name': prestation.name,
                                'prestation.service_name': prestation.service_name,
                                'prestation.description': prestation.description,
                                'prestation.libelle': prestation.libelle
                            });

                            const prix = parseFloat(
                                prestation.price ||
                                prestation.prix ||
                                prestation.amount ||
                                prestation.cost ||
                                prestation.total ||
                                0
                            );

                            const prestationData = {
                                type: type,
                                prix: prix,
                                custom: prestation.custom || false
                            };

                            console.log(`    → Final type: "${type}"`);
                            console.log(`    → Final prix: ${prix}`);
                            console.log(`    → Processed:`, prestationData);

                            prestationsParPaire[paireId].push(prestationData);
                        });
                    }
                });

                console.log(`📦 Prestations grouped by pair:`, prestationsParPaire);
                
                // Créer les paires avec leurs prestations
                currentState.paires = [];
                Object.keys(prestationsParPaire).forEach(paireId => {
                    const paire = {
                        id: parseInt(paireId),
                        nom: `Paire ${paireId}`,
                        prestations: prestationsParPaire[paireId],
                        selected: false,
                        total: prestationsParPaire[paireId].reduce((sum, p) => sum + p.prix, 0)
                    };
                    currentState.paires.push(paire);
                    console.log(`✅ Created pair ${paireId}:`, paire);
                });
                
                console.log(`📋 Final pairs array:`, currentState.paires);
            } else {
                console.log(`⚠️ No prestations found or invalid format`);
                currentState.paires = [];
            }
            
            currentState.jourRetrait = ticket.pickup_day || null;
            currentState.heureRetrait = ticket.pickup_time || null;
            currentState.total = parseFloat(ticket.total_price) || 0;
            currentState.paymentStatus = ticket.payment_status || null;
            currentState.pasUrgent = !ticket.is_urgent;
            currentState.avecSac = ticket.avec_sac || false;
            currentState.accessoires = ticket.accessoires || [];
            currentState.noteRetrait = ticket.note || '';

            console.log(`💰 Payment status loaded from ticket: ${ticket.payment_status}`);
            
            currentTicketId = ticketId;
            
            console.log(`✅ Data loaded successfully:`, currentState);
            
            // Mettre à jour l'interface
            updateFormFromState();
            updateTicketNumberDisplay(ticket.ticket_number);

            // Mettre à jour l'affichage des paires et prestations
            console.log(`🔄 Updating paires display...`);
            updatePairesDisplay();
            calculateTotal();
            
            // Afficher les sections si on a des paires
            if (currentState.nbPaires > 0) {
                toggleSectionsVisibility(true);
            }

            // Mettre à jour le titre de l'onglet
            updateTabTitle(globalState.currentTabId);

            // Charger l'historique du ticket
            loadTicketHistory(ticketId);
            
            showTemporaryMessage(`Ticket ${ticket.ticket_number} chargé avec succès`, 'success');
        } else {
            const errorData = await response.json();
            console.error('❌ Server error:', errorData);
            throw new Error(`Erreur serveur: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du ticket:', error);
        showTemporaryMessage(`Erreur lors du chargement du ticket: ${error.message}`, 'error');
    }
}

// Fonction pour mettre à jour le formulaire depuis l'état
function updateFormFromState() {
    const currentState = getCurrentTabState();
    const tabId = globalState.currentTabId;

    console.log(`🔄 updateFormFromState() called for tab ${tabId}`);
    console.log(`📊 Current state data:`, {
        nom: currentState.nom,
        prenom: currentState.prenom,
        telephone: currentState.telephone,
        email: currentState.email
    });

    // Mettre à jour les champs du formulaire avec les IDs spécifiques à l'onglet
    const nomElement = document.getElementById(`nom-${tabId}`);
    const prenomElement = document.getElementById(`prenom-${tabId}`);
    const telephoneElement = document.getElementById(`telephone-${tabId}`);
    const emailElement = document.getElementById(`email-${tabId}`);

    console.log(`🔍 Elements found for tab ${tabId}:`, {
        nomElement: !!nomElement,
        prenomElement: !!prenomElement,
        telephoneElement: !!telephoneElement,
        emailElement: !!emailElement
    });

    // Essayer d'abord avec les IDs spécifiques à l'onglet
    if (nomElement) nomElement.value = currentState.nom || '';
    if (prenomElement) prenomElement.value = currentState.prenom || '';
    if (telephoneElement) telephoneElement.value = currentState.telephone || '';
    if (emailElement) emailElement.value = currentState.email || '';

    // Si les éléments ne sont pas trouvés, essayer avec getCurrentTabElement
    if (!nomElement || !prenomElement || !telephoneElement || !emailElement) {
        console.log(`⚠️ Some elements not found, trying getCurrentTabElement fallback`);

        const fallbackNom = getCurrentTabElement('nom');
        const fallbackPrenom = getCurrentTabElement('prenom');
        const fallbackTelephone = getCurrentTabElement('telephone');
        const fallbackEmail = getCurrentTabElement('email');

        if (fallbackNom && !nomElement) fallbackNom.value = currentState.nom || '';
        if (fallbackPrenom && !prenomElement) fallbackPrenom.value = currentState.prenom || '';
        if (fallbackTelephone && !telephoneElement) fallbackTelephone.value = currentState.telephone || '';
        if (fallbackEmail && !emailElement) fallbackEmail.value = currentState.email || '';

        console.log(`🔄 Fallback elements used:`, {
            fallbackNom: !!fallbackNom,
            fallbackPrenom: !!fallbackPrenom,
            fallbackTelephone: !!fallbackTelephone,
            fallbackEmail: !!fallbackEmail
        });
    }

    console.log(`✅ Form fields updated for tab ${tabId}`);
    
    // Mettre à jour le nombre de paires
    if (currentState.nbPaires > 0) {
        const paireBtn = document.querySelector(`[data-paires="${currentState.nbPaires}"]`);
        if (paireBtn) {
            paireBtn.click();
        }
    }
    
    // Les prestations sont déjà traitées dans loadTicket, pas besoin de les retraiter ici
    console.log(`📋 Prestations already loaded in currentState.paires:`, currentState.paires.length);
    
    // Mettre à jour le jour de retrait
    if (currentState.jourRetrait) {
        const jourBtn = document.querySelector(`[data-jour="${currentState.jourRetrait}"]`);
        if (jourBtn) {
            jourBtn.click();
        }
    }
    
    // Mettre à jour l'heure de retrait
    if (currentState.heureRetrait) {
        const heureInput = getCurrentTabElement('heure-retrait');
        if (heureInput) {
            heureInput.value = currentState.heureRetrait;
        } else {
            console.warn(`⚠️ Heure input not found for tab ${tabId}`);
        }
    }
    
    // Mettre à jour le statut de paiement
    console.log(`💰 Payment status in state: ${currentState.paymentStatus}`);
    // Mettre à jour l'interface des boutons (l'état est déjà défini dans loadTicket)
    updatePaymentButtons();
    console.log(`✅ Payment buttons updated`);
    
    // Mettre à jour le total (utiliser calculateTotal au lieu de updateTotal)
    calculateTotal();
}

// Fonction pour rechercher dans l'historique
async function searchHistory() {
    const query = document.getElementById('history-search').value.trim();
    if (!query) {
        alert('Veuillez saisir un terme de recherche');
        return;
    }
    
    try {
        const response = await fetch(`/api/tickets/search?query=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            displaySearchResults(data.tickets);
        }
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        alert('Erreur lors de la recherche');
    }
}

// Fonction pour afficher les résultats de recherche
function displaySearchResults(tickets) {
    const container = document.getElementById('history-results');
    if (!container) return;
    
    if (tickets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Aucun ticket trouvé</p>';
        return;
    }
    
    container.innerHTML = tickets.map(ticket => `
        <div class="ticket-item" onclick="loadTicketInNewTab('${ticket.id}')"
            <div class="ticket-header">
                <span class="ticket-number">${ticket.ticket_number}</span>
                <span class="ticket-date">${new Date(ticket.created_at).toLocaleDateString('fr-FR')} ${new Date(ticket.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div class="ticket-customer">${ticket.customer_name}</div>
            <div class="ticket-details">
                <span>${ticket.paires_count} paire(s)</span>
                <span>${ticket.total_price.toFixed(2)} €</span>
                <span class="ticket-status status-${ticket.payment_status}">${ticket.payment_status === 'paid' ? 'Payé' : ticket.payment_status === 'unpaid' ? 'Non' : ticket.payment_status === 'partial' ? 'Partiel' : ticket.payment_status}</span>
            </div>
        </div>
    `).join('');
}

// Fonction pour charger l'historique d'un ticket
async function loadTicketHistory(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}/history`);
        if (response.ok) {
            const data = await response.json();
            ticketHistory = data.history;
            displayTicketHistory(ticketHistory);
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// Fonction pour afficher l'historique d'un ticket
function displayTicketHistory(history) {
    // Cette fonction peut être étendue pour afficher l'historique dans une modal ou un panneau
    console.log('Historique du ticket:', history);
}

// Fonction pour charger les statistiques
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            const data = await response.json();
            displayStats(data.stats);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Fonction pour afficher les statistiques
function displayStats(stats) {
    const container = document.getElementById('stats-display');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.totalTickets}</div>
            <div class="stat-label">Total Tickets</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalRevenue.toFixed(2)} €</div>
            <div class="stat-label">Chiffre d'Affaires</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.pendingTickets}</div>
            <div class="stat-label">En Attente</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.todayTickets}</div>
            <div class="stat-label">Aujourd'hui</div>
        </div>
    `;
    
    // Afficher les statistiques hebdomadaires
    const weeklyContainer = document.getElementById('weekly-stats');
    if (weeklyContainer && stats.weeklyStats) {
        weeklyContainer.innerHTML = stats.weeklyStats.map(stat => `
            <div class="weekly-stat-item">
                <div class="weekly-stat-day">${stat.pickup_day}</div>
                <div class="weekly-stat-count">${stat.count}</div>
            </div>
        `).join('');
    }
}

// Fonction pour marquer un ticket comme imprimé
async function markTicketPrinted() {
    if (!currentTicketId) return;
    
    try {
        const response = await fetch(`/api/tickets/${currentTicketId}/print`, {
            method: 'POST'
        });
        
        if (response.ok) {
            console.log('Ticket marqué comme imprimé');
        }
    } catch (error) {
        console.error('Erreur lors du marquage du ticket:', error);
    }
}

// Modifier les fonctions d'impression existantes pour marquer le ticket comme imprimé
const originalImprimerCordonnier = window.imprimerCordonnier;
const originalImprimerClient = window.imprimerClient;

window.imprimerCordonnier = function() {
    if (originalImprimerCordonnier) {
        originalImprimerCordonnier();
    }
    markTicketPrinted();
};

window.imprimerClient = function() {
    if (originalImprimerClient) {
        originalImprimerClient();
    }
    markTicketPrinted();
};

// Initialisation des événements pour l'historique et les statistiques
document.addEventListener('DOMContentLoaded', function() {
    // Charger les tickets récents au démarrage
    loadRecentTickets();
    
    // Événement pour la recherche dans l'historique
    const searchBtn = document.getElementById('search-history-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchHistory);
    }
    
    // Événement pour la recherche avec Entrée
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchHistory();
            }
        });
    }
    
    // Charger les statistiques quand on bascule vers l'onglet stats
    const statsTab = document.querySelector('[data-tab-id="stats"]');
    if (statsTab) {
        statsTab.addEventListener('click', function() {
            setTimeout(loadStats, 100); // Petit délai pour s'assurer que l'onglet est actif
        });
    }

    // Bouton de rafraîchissement des tickets récents
    const refreshRecentBtn = document.getElementById('refresh-recent-btn');
    if (refreshRecentBtn) {
        refreshRecentBtn.addEventListener('click', function() {
            loadRecentTickets();
        });
    }
    
    // Ajouter un bouton de sauvegarde dans l'interface
    addSaveButton();
    
    // Ajouter les événements de sauvegarde automatique
    setupAutoSaveEvents();
    
    // Configurer le menu déroulant d'historique
    setupHistoryMenu();
    
    // Configurer l'interface de sauvegarde
    setupBackupInterface();
    
    // Sauvegarder avant de quitter la page
    window.addEventListener('beforeunload', function() {
        saveTicket(false);
    });
});

// Fonction pour configurer les événements de sauvegarde automatique
function setupAutoSaveEvents() {
    // Événements sur les champs de saisie
    const inputFields = ['nom', 'prenom', 'telephone', 'email'];
    inputFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', triggerAutoSave);
            field.addEventListener('blur', triggerAutoSave);
        }
    });
    
    // Événements sur les boutons de paires
    document.querySelectorAll('.paire-btn').forEach(btn => {
        btn.addEventListener('click', triggerAutoSave);
    });
    
    // Événements sur les boutons de prestations
    document.querySelectorAll('.prestation-btn').forEach(btn => {
        btn.addEventListener('click', triggerAutoSave);
    });
    
    // Événements sur les boutons de jour de retrait
    document.querySelectorAll('.jour-btn').forEach(btn => {
        btn.addEventListener('click', triggerAutoSave);
    });
    
    // Événement sur le sélecteur d'heure
    const heureSelect = document.getElementById('heure-retrait');
    if (heureSelect) {
        heureSelect.addEventListener('change', triggerAutoSave);
    }
    
    // Événements sur les boutons de paiement
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', triggerAutoSave);
    });
    
    // Événement sur le bouton "Pas urgent"
    const pasUrgentBtn = document.getElementById('pas-urgent-btn');
    if (pasUrgentBtn) {
        pasUrgentBtn.addEventListener('click', triggerAutoSave);
    }
    
    // Événement sur le bouton "Avec sac"
    const avecSacBtn = document.getElementById('avec-sac-btn');
    if (avecSacBtn) {
        avecSacBtn.addEventListener('click', triggerAutoSave);
    }
    
    // Événement sur le sélecteur de date
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.addEventListener('change', triggerAutoSave);
    }
}

// Fonction pour ajouter un bouton de sauvegarde
function addSaveButton() {
    const totalSection = document.getElementById('total-section');
    if (totalSection) {
        const saveButton = document.createElement('button');
        saveButton.id = 'save-ticket-btn';
        saveButton.className = 'btn-save';
        saveButton.innerHTML = '💾 Sauvegarder manuellement';
        saveButton.style.cssText = `
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-top: 10px;
            width: 100%;
            transition: background-color 0.2s;
        `;
        
        saveButton.addEventListener('click', () => saveTicket(true));
        saveButton.addEventListener('mouseenter', function() {
            this.style.background = '#4b5563';
        });
        saveButton.addEventListener('mouseleave', function() {
            this.style.background = '#6b7280';
        });
        
        totalSection.appendChild(saveButton);
    }
}

// Fonction pour configurer le menu déroulant d'historique
function setupHistoryMenu() {
    const menuBtn = document.getElementById('history-menu-btn');
    const menuContent = document.getElementById('history-menu-content');
    const menuDropdown = document.querySelector('.menu-dropdown');
    
    if (menuBtn && menuContent && menuDropdown) {
        // Toggle du menu au clic
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            menuDropdown.classList.toggle('active');
        });
        
        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', function(e) {
            if (!menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('active');
            }
        });
        
        // Fermer le menu avec Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                menuDropdown.classList.remove('active');
            }
        });
    }
}

// Fonction pour exporter les tickets
async function exportTickets() {
    try {
        const response = await fetch('/api/tickets/recent?limit=1000');
        if (response.ok) {
            const data = await response.json();
            const tickets = data.tickets;
            
            // Créer le CSV
            const csvContent = createCSV(tickets);
            
            // Télécharger le fichier
            downloadCSV(csvContent, `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`);
            
            alert(`Export réussi ! ${tickets.length} tickets exportés.`);
        } else {
            alert('Erreur lors de l\'export des tickets');
        }
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        alert('Erreur lors de l\'export des tickets');
    }
}

// Fonction pour créer le contenu CSV
function createCSV(tickets) {
    const headers = [
        'Numéro Ticket',
        'Date Création',
        'Nom Client',
        'Téléphone',
        'Email',
        'Nombre Paires',
        'Prestations',
        'Prix Total',
        'Statut Paiement',
        'Jour Retrait',
        'Heure Retrait',
        'Urgent'
    ];
    
    const rows = tickets.map(ticket => [
        ticket.ticket_number,
        new Date(ticket.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(ticket.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
        ticket.customer_name,
        ticket.customer_phone,
        ticket.customer_email,
        ticket.paires_count,
        ticket.prestations.map(p => p.prestations?.map(pr => pr.type).join(', ') || '').join(' | '),
        ticket.total_price.toFixed(2),
        ticket.payment_status,
        ticket.pickup_day,
        ticket.pickup_time,
        ticket.is_urgent ? 'Oui' : 'Non'
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return csvContent;
}

// Fonction pour télécharger le CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===== FONCTIONS POUR LA GESTION DES SAUVEGARDES =====

// Fonction pour configurer l'interface de sauvegarde
function setupBackupInterface() {
    // Événement pour créer une sauvegarde manuelle
    const createBtn = document.getElementById('create-backup-btn');
    if (createBtn) {
        createBtn.addEventListener('click', createManualBackup);
    }
    
    // Événement pour actualiser la liste
    const refreshBtn = document.getElementById('refresh-backups-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadBackups);
    }
    
    // Charger les sauvegardes quand on bascule vers l'onglet backup
    const backupTab = document.querySelector('[data-tab-id="backup"]');
    if (backupTab) {
        backupTab.addEventListener('click', function() {
            setTimeout(loadBackups, 100);
        });
    }
}

// Fonction pour créer une sauvegarde manuelle
async function createManualBackup() {
    const description = prompt('Description de la sauvegarde (optionnel):') || 'Sauvegarde manuelle';
    
    try {
        const response = await fetch('/api/backup/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ Sauvegarde créée avec succès !\nFichier: ${result.backupName}`);
            loadBackups(); // Actualiser la liste
        } else {
            const error = await response.json();
            alert(`❌ Erreur lors de la création de la sauvegarde: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la sauvegarde:', error);
        alert('❌ Erreur lors de la création de la sauvegarde');
    }
}

// Fonction pour charger la liste des sauvegardes
async function loadBackups() {
    try {
        const response = await fetch('/api/backup/list');
        if (response.ok) {
            const data = await response.json();
            displayBackupStats(data.stats);
            displayBackupsList(data.backups);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des sauvegardes:', error);
    }
}

// Fonction pour afficher les statistiques de sauvegarde
function displayBackupStats(stats) {
    const container = document.getElementById('backup-stats');
    if (!container) return;
    
    container.innerHTML = `
        <div class="backup-stat-card">
            <div class="backup-stat-value">${stats.totalBackups}</div>
            <div class="backup-stat-label">Total Sauvegardes</div>
        </div>
        <div class="backup-stat-card">
            <div class="backup-stat-value">${stats.totalSizeMB} MB</div>
            <div class="backup-stat-label">Espace Utilisé</div>
        </div>
        <div class="backup-stat-card">
            <div class="backup-stat-value">${stats.autoBackupActive ? '✅' : '❌'}</div>
            <div class="backup-stat-label">Sauvegarde Auto</div>
        </div>
        <div class="backup-stat-card">
            <div class="backup-stat-value">${stats.newestBackup ? new Date(stats.newestBackup).toLocaleDateString('fr-FR') : 'Aucune'}</div>
            <div class="backup-stat-label">Dernière Sauvegarde</div>
        </div>
    `;
}

// Fonction pour afficher la liste des sauvegardes
function displayBackupsList(backups) {
    const container = document.getElementById('backups-list');
    if (!container) return;
    
    if (backups.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Aucune sauvegarde disponible</p>';
        return;
    }
    
    container.innerHTML = backups.map(backup => {
        const statusClass = getBackupStatusClass(backup.metadata.description);
        const statusText = getBackupStatusText(backup.metadata.description);
        
        return `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">${backup.name}</div>
                    <div class="backup-details">
                        <span>📅 ${new Date(backup.created).toLocaleString('fr-FR')}</span>
                        <span>📦 ${(backup.size / 1024).toFixed(1)} KB</span>
                        <span class="backup-status ${statusClass}">${statusText}</span>
                        ${backup.metadata.description ? `<span>📝 ${backup.metadata.description}</span>` : ''}
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn-backup-action btn-backup-download" onclick="downloadBackup('${backup.name}')">
                        <i class="fas fa-download"></i> Télécharger
                    </button>
                    <button class="btn-backup-action btn-backup-restore" onclick="restoreBackup('${backup.name}')">
                        <i class="fas fa-undo"></i> Restaurer
                    </button>
                    <button class="btn-backup-action btn-backup-delete" onclick="deleteBackup('${backup.name}')">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Fonction pour obtenir la classe CSS du statut
function getBackupStatusClass(description) {
    if (!description) return 'status-manual';
    if (description.includes('automatique')) return 'status-auto';
    if (description.includes('arrêt')) return 'status-shutdown';
    return 'status-manual';
}

// Fonction pour obtenir le texte du statut
function getBackupStatusText(description) {
    if (!description) return 'Manuel';
    if (description.includes('automatique')) return 'Auto';
    if (description.includes('arrêt')) return 'Arrêt';
    return 'Manuel';
}

// Fonction pour télécharger une sauvegarde
function downloadBackup(backupName) {
    const url = `/api/backup/download/${encodeURIComponent(backupName)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = backupName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fonction pour restaurer une sauvegarde
async function restoreBackup(backupName) {
    if (!confirm(`⚠️ Êtes-vous sûr de vouloir restaurer la sauvegarde "${backupName}" ?\n\nCela remplacera la base de données actuelle.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/backup/restore/${encodeURIComponent(backupName)}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ Base de données restaurée avec succès !\n\nSauvegarde actuelle créée: ${result.currentBackup}`);
            loadBackups(); // Actualiser la liste
        } else {
            const error = await response.json();
            alert(`❌ Erreur lors de la restauration: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la restauration:', error);
        alert('❌ Erreur lors de la restauration');
    }
}

// Fonction pour supprimer une sauvegarde
async function deleteBackup(backupName) {
    if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer la sauvegarde "${backupName}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/backup/delete/${encodeURIComponent(backupName)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('✅ Sauvegarde supprimée avec succès !');
            loadBackups(); // Actualiser la liste
        } else {
            const error = await response.json();
            alert(`❌ Erreur lors de la suppression: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('❌ Erreur lors de la suppression');
    }
}
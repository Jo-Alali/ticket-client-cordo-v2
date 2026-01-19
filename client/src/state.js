// State Management

export let globalState = {
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
            prestations: [],
            customPrestations: [],
            totalPrix: 0,
            paires: 0,
            paymentStatus: 'unpaid',
            paidAmount: 0,
            remainingAmount: 0,
            pickupDate: '',
            pickupTime: '',
            pickupDay: '',
            isUrgent: false,
            withSac: [],
            noteRetrait: '',
            createdAt: new Date().toISOString()
        }
    }
};

// Proxy pour réactivité simple (similaire à l'original)
const handler = {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        // Fallback sur le state de l'onglet courant
        const currentTab = globalState.tabs[globalState.currentTabId];
        return currentTab ? currentTab[prop] : undefined;
    },
    set(target, prop, value) {
        // Rediriger vers l'onglet courant
        const currentTab = globalState.tabs[globalState.currentTabId];
        if (currentTab) {
            currentTab[prop] = value;
            return true;
        }
        return false;
    }
};

// appState est utilisé comme un raccourci vers l'onglet courant
export const appState = new Proxy({}, handler);

export function getCurrentTabState() {
    return globalState.tabs[globalState.currentTabId];
}

export function setCurrentTabState(newState) {
    globalState.tabs[globalState.currentTabId] = { ...globalState.tabs[globalState.currentTabId], ...newState };
}

export function createNewTabState(id) {
    return {
        id: id,
        title: `Ticket ${id}`,
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        prestations: [],
        customPrestations: [],
        totalPrix: 0,
        paires: 0,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 0,
        pickupDate: '',
        pickupTime: '',
        pickupDay: '',
        isUrgent: false,
        withSac: [],
        noteRetrait: '',
        createdAt: new Date().toISOString()
    };
}

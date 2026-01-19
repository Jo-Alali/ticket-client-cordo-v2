# Générateur de Tickets - Cordonnerie

## Description
Application web pour la gestion et la génération de tickets de cordonnerie avec **intégration Shopify**. Permet de créer des tickets détaillés avec prestations, calcul automatique des prix et impression. Se connecte à votre boutique Shopify pour la gestion des clients.

## 🛒 Intégration Shopify
- **Recherche automatique** de clients dans votre boutique
- **Création de nouveaux clients** directement dans Shopify
- **Synchronisation** des informations clients
- **Fallback** vers base locale si Shopify indisponible

## Fonctionnalités
- 🎫 Génération de tickets clients et cordonniers
- 👥 Gestion clients Shopify + base locale de fallback
- 🔍 Autocomplétion intelligente des clients Shopify
- 👞 Sélection de prestations (patins, fers, talons, ressemelage)
- 💰 Calcul automatique des totaux
- 📅 Gestion des dates de retrait
- 💳 Suivi du statut de paiement (payé/non payé)
- 🖨️ Impression des tickets
- 🔄 Système d'onglets multiples
- 📱 Interface responsive

## Structure du projet
```
├── index.html          # Interface principale
├── styles.css          # Styles CSS
├── script.js           # Logique JavaScript (version locale)
├── package.json        # Configuration pour déploiement
├── railway.toml        # Configuration Railway
└── README.md           # Documentation
```

## Installation et démarrage

### 🚀 Utilisation immédiate
1. **Télécharger** le projet depuis GitHub
2. **Ouvrir** `index.html` dans votre navigateur
3. **C'est prêt** ! Aucune installation requise

### 🔧 Développement local
```bash
# Cloner le repository
git clone https://github.com/Jo-Alali/ticket-client-cordo.git
cd ticket-client-cordo

# Installer les dépendances (optionnel pour développement)
npm install

# Démarrer le serveur de développement
npm run dev
```

### 🌐 Déploiement

#### GitHub Pages (Recommandé)
1. Allez sur votre repository GitHub
2. Settings → Pages
3. Deploy from branch → main → root
4. URL : `https://jo-alali.github.io/ticket-client-cordo`

#### Railway
- Application configurée automatiquement avec `railway.toml`
- Déploiement automatique depuis GitHub

## Technologies utilisées
- **HTML5** - Interface utilisateur
- **CSS3** - Styles et responsive design
- **JavaScript (ES6+)** - Logique métier
- **Font Awesome** - Icônes
- **Railway/Nixpacks** - Déploiement

## Avantages de cette version
- ✅ **100% statique** - Pas de serveur requis
- ✅ **Hors ligne** - Fonctionne sans internet
- ✅ **Rapide** - Chargement instantané
- ✅ **Sécurisée** - Aucune connexion externe
- ✅ **Simple** - Un seul fichier à ouvrir
- ✅ **Portable** - Fonctionne sur tous les navigateurs

## 🚀 Déploiement sur Railway (avec Shopify)

### Variables d'environnement requises

Configurez ces variables dans Railway Dashboard > Project Settings > Environment Variables :

```bash
# Configuration serveur
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Configuration Shopify (OBLIGATOIRE)
SHOPIFY_STORE_DOMAIN=votre-boutique.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_votre_token_admin_shopify
SHOPIFY_API_VERSION=2023-10
```

### Étapes de déploiement

1. **Push sur GitHub** : Commitez et pushez votre code
2. **Railway Dashboard** : Créez un nouveau projet depuis GitHub
3. **Variables d'environnement** : Ajoutez les variables ci-dessus
4. **Déploiement automatique** : Railway détecte et déploie automatiquement

### Dépannage Railway

Si le healthcheck échoue avec "service unavailable" :

1. **Vérifiez les logs** : Railway > Project > Logs
2. **Variables Shopify** : Assurez-vous que SHOPIFY_ADMIN_TOKEN est valide
3. **Port** : Le serveur écoute sur 0.0.0.0:3000 automatiquement
4. **Timeout** : Railway peut prendre quelques minutes pour démarrer

### Version actuelle : v1.12

- ✅ Recherche avancée Shopify (nom, prénom, téléphone)
- ✅ Tickets optimisés avec #XXXX
- ✅ Interface responsive
- ✅ Support français complet
- ✅ Gestion des balises Shopify

## Licence
Projet privé - Cordonnerie

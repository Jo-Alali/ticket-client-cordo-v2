const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');

// Routes pour les clients
router.get('/all', customersController.getAllCustomers); // /api/customers/all
router.get('/search-last4', customersController.searchByLast4); // /api/customers/search-last4
router.post('/:id/tags', customersController.addTag); // /api/customers/:id/tags
router.put('/:id', customersController.updateCustomer); // /api/customers/:id
router.post('/', customersController.createCustomer); // /api/customers
// router.get('/search', ...); // Si recherche générique via Shopify

module.exports = router;

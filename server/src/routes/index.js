import { Router } from 'express';
import * as products from '../controllers/productController.js';
import * as categories from '../controllers/categoryController.js';
import * as settings from '../controllers/settingsController.js';
import * as orders from '../controllers/orderController.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/products', products.list);
router.get('/products/:id', products.get);

router.get('/categories', categories.list);
router.get('/categories/:id', categories.get);

router.get('/settings', settings.get);

router.post('/orders', rateLimit({ max: 15, message: 'Too many orders from this device. Please try again later.' }), orders.create);
router.post('/orders/track', rateLimit({ max: 10 }), orders.track);
router.get('/orders/:id', rateLimit({ max: 60 }), orders.get);

export default router;

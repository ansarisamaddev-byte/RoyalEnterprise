import { Router } from 'express';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAdmin } from './auth.js';
import * as admin from './controller.js';

const router = Router();

router.post('/session', rateLimit({ windowMs: 15 * 60_000, max: 8, message: 'Too many admin sign-in attempts. Try again later.' }), admin.login);
router.use(requireAdmin);

router.get('/overview', admin.overview);

router.get('/products', admin.products);
router.post('/products', admin.createProduct);
router.patch('/products/:id', admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);
router.get('/products/:productId/:resource', admin.productEntries);
router.post('/products/:productId/:resource', admin.createProductEntry);
router.patch('/products/:productId/:resource/:entryId', admin.updateProductEntry);
router.delete('/products/:productId/:resource/:entryId', admin.deleteProductEntry);

router.get('/categories', admin.categories);
router.post('/categories', admin.createCategory);
router.patch('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);
router.post('/categories/:id/subcategories', admin.createSubcategory);
router.patch('/categories/:id/subcategories/:subId', admin.updateSubcategory);
router.delete('/categories/:id/subcategories/:subId', admin.deleteSubcategory);

router.get('/orders', admin.orders);
router.patch('/orders/:id', admin.updateOrder);

router.get('/settings', admin.settings);
router.patch('/settings', admin.updateSettings);
router.get('/product-tabs', admin.tabs);
router.post('/product-tabs', admin.createTab);
router.patch('/product-tabs/:key', admin.updateTab);
router.get('/message-templates', admin.templates);
router.patch('/message-templates/:key', admin.updateTemplate);

export default router;
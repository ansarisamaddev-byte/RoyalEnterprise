import { asyncHandler, HttpError } from '../../utils/httpError.js';
import { createSession } from './auth.js';
import * as service from './service.js';

function bodyOf(req) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be an object');
  return body;
}

export const login = asyncHandler(async (req, res) => {
  const { username, password } = bodyOf(req);
  const session = createSession(username, password);
  res.json(session);
});

export const overview = asyncHandler(async (req, res) => res.json(await service.getOverview()));
export const products = asyncHandler(async (req, res) => res.json({ products: await service.listProducts() }));
export const createProduct = asyncHandler(async (req, res) => res.status(201).json(await service.saveProduct(null, bodyOf(req))));
export const updateProduct = asyncHandler(async (req, res) => res.json(await service.saveProduct(req.params.id, bodyOf(req))));
export const deleteProduct = asyncHandler(async (req, res) => { await service.deleteProduct(req.params.id); res.status(204).end(); });
export const productEntries = asyncHandler(async (req, res) => res.json({ entries: await service.listProductEntries(req.params.productId, req.params.resource) }));
export const createProductEntry = asyncHandler(async (req, res) => res.status(201).json(await service.saveProductEntry(req.params.productId, req.params.resource, null, bodyOf(req))));
export const updateProductEntry = asyncHandler(async (req, res) => res.json(await service.saveProductEntry(req.params.productId, req.params.resource, req.params.entryId, bodyOf(req))));
export const deleteProductEntry = asyncHandler(async (req, res) => { await service.deleteProductEntry(req.params.productId, req.params.resource, req.params.entryId); res.status(204).end(); });

export const categories = asyncHandler(async (req, res) => res.json({ categories: await service.listCategories() }));
export const createCategory = asyncHandler(async (req, res) => res.status(201).json(await service.saveCategory(null, bodyOf(req))));
export const updateCategory = asyncHandler(async (req, res) => res.json(await service.saveCategory(req.params.id, bodyOf(req))));
export const deleteCategory = asyncHandler(async (req, res) => { await service.deleteCategory(req.params.id); res.status(204).end(); });
export const createSubcategory = asyncHandler(async (req, res) => res.status(201).json(await service.saveSubcategory(req.params.id, null, bodyOf(req))));
export const updateSubcategory = asyncHandler(async (req, res) => res.json(await service.saveSubcategory(req.params.id, req.params.subId, bodyOf(req))));
export const deleteSubcategory = asyncHandler(async (req, res) => { await service.deleteSubcategory(req.params.id, req.params.subId); res.status(204).end(); });

export const orders = asyncHandler(async (req, res) => res.json({ orders: await service.listOrders() }));
export const updateOrder = asyncHandler(async (req, res) => res.json(await service.updateOrder(req.params.id, bodyOf(req))));
export const sendOrderMessage = asyncHandler(async (req, res) => res.json(await service.sendOrderMessage(req.params.id, bodyOf(req).key)));
export const settings = asyncHandler(async (req, res) => res.json({ settings: await service.getSettings() }));
export const updateSettings = asyncHandler(async (req, res) => res.json({ settings: await service.saveSettings(bodyOf(req)) }));
export const tabs = asyncHandler(async (req, res) => res.json({ tabs: await service.listTabs() }));
export const createTab = asyncHandler(async (req, res) => res.status(201).json(await service.createTab(bodyOf(req))));
export const updateTab = asyncHandler(async (req, res) => res.json(await service.saveTab(req.params.key, bodyOf(req))));
export const templates = asyncHandler(async (req, res) => res.json({ templates: await service.listTemplates() }));
export const updateTemplate = asyncHandler(async (req, res) => res.json(await service.saveTemplate(req.params.key, bodyOf(req))));
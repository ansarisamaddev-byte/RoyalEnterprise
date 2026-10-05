import { asyncHandler } from '../utils/httpError.js';
import { getProduct, listProducts } from '../services/productService.js';

export const list = asyncHandler(async (req, res) => res.json(await listProducts(req.query)));
export const get = asyncHandler(async (req, res) => res.json(await getProduct(req.params.id)));

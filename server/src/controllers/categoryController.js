import { asyncHandler } from '../utils/httpError.js';
import { getCategory, listCategories } from '../services/categoryService.js';

export const list = asyncHandler(async (req, res) => res.json({ categories: await listCategories() }));
export const get = asyncHandler(async (req, res) => res.json(await getCategory(req.params.id)));

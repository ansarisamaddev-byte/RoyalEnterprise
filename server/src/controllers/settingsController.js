import { asyncHandler } from '../utils/httpError.js';
import { getAllSettings, getEnabledTabs, getTemplate } from '../services/settingsService.js';

// Public store configuration (no secrets live in the settings table).
export const get = asyncHandler(async (req, res) => {
  const [settings, tabs, orderPlacedTemplate] = await Promise.all([
    getAllSettings(),
    getEnabledTabs(),
    getTemplate('order_placed'),
  ]);
  res.json({ settings, tabs, orderPlacedTemplate });
});

# Royal Enterprise — Phase 1 (Customer Website)

React + Node/Express + Supabase. No payment gateway, no customer accounts, no image storage.

## 1. Set up Supabase (one time)
1. Create a project at supabase.com.
2. **SQL Editor** → run `supabase/schema.sql`, then `supabase/seed.sql` (sample categories, products, settings, templates).
3. **Project Settings → API** → copy the *Project URL* and the **service_role** key.
   The service-role key is used by the Express server only. Never put it in the client.

## 2. Configure & run
```bash
# backend
cd server
cp .env.example .env        # fill Supabase credentials and a rotated WhatsApp token if enabling WhatsApp
npm install
npm run dev                 # http://localhost:5000

# frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxies /api -> :5000)
```
Or from the repo root: `npm run install:all`, then `npm run dev:server` / `npm run dev:client`.

### Environment variables
| File | Variable | Purpose |
|---|---|---|
| server/.env | `SUPABASE_URL` | your project URL |
| server/.env | `SUPABASE_SERVICE_ROLE_KEY` | server-only key |
| server/.env | `PORT` (5000), `CLIENT_URL` (http://localhost:5173) | port + allowed CORS origin(s), comma separated |
| server/.env | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API credentials; keep the token server-side |
| server/.env | `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_TEMPLATE_NAMES`, `WHATSAPP_DELIVERY_TIME` | API/template settings and delivery wording for `royal_payment_received` |
| server/.env | `PUBLIC_SITE_URL` | public website URL used in WhatsApp order links |
| client/.env | `VITE_API_URL` | only if the API lives on another domain in production |

## 3. Test the customer flow
Home → Mobiles → Product → Add to Cart → Cart → Checkout → Place Order → Confirmation → WhatsApp → Track Order.
1. Open `/`, click **Shop Now**, pick a phone, **Add to Cart**.
2. `/cart`: subtotal + delivery (from the `delivery_charge` setting) + total → **Proceed to Checkout**.
3. Fill the form and **Place Order**. Choose a delivery city and PIN code from the configured lists. You land on `/order-success/RE-10001?t=…` with status *Payment Pending*. If WhatsApp is configured, the server submits the `order_processing` template to your WhatsApp number.
5. `/track-order`: enter `RE-10001` + the mobile you used. A wrong mobile returns "Order not found".
6. Change a value in Supabase (e.g. `settings.delivery_charge` → 80, or `orders.order_status` → `CONFIRMED`) and refresh to see it reflected.

## 4. Structure
```
client/src  components pages layouts hooks services utils context styles
server/src  routes controllers services middleware utils config
supabase/   schema.sql  seed.sql
```

## 5. How it works
* **Pricing is server-side.** The cart sends only `{productId, quantity}`; the server re-reads prices, checks stock, adds the delivery charge from `settings`, and writes `orders` + `order_items`.
* **Order IDs** come from a Postgres sequence → `RE-10001`, `RE-10002`, …
* **Confirmation page** needs the secret `t` token returned at checkout, so Order IDs alone expose nothing.
* **Track Order** needs Order ID **and** matching mobile (or WhatsApp) number; same error for "not found" and "wrong number"; rate-limited.
* **Security:** RLS is enabled on every table with no policies, so the browser can't read/write the DB; only the server (service role) can.
* **Dynamic config (nothing hard-coded in React):** delivery charge, store info, about page, default offer, categories/sub-categories, product detail tabs (`product_tabs`), and the WhatsApp message template (`admin_message_templates.order_placed`).
* **Delivery areas:** checkout offers only `settings.delivery_cities` and `settings.delivery_pincodes`; the server validates both values against those same settings. Update the lists in Admin → Store settings. Existing databases can add the defaults by running `supabase/migrations/20261014_delivery_areas.sql`.
* **Filters** (brand, price, availability, RAM, storage) are computed from the product data; RAM/Storage come from specs named `RAM` / `Storage`.
* **WhatsApp:** the approved Cloud API `order_processing` template is submitted at checkout. Admin sends currently support only the approved `order_processing`, `royal_payment_received`, and `royal_order_delivered` templates; other message types require an approved Meta template and matching server parameter mapping. Keep the body placeholder order aligned with the approved template. Set the WhatsApp variables in `server/.env` (or your hosting provider); never put the access token in client code or commit it.
* Stock is validated at checkout but not auto-decremented (the team confirms manually).
* Sample product images are `placehold.co` URLs — replace `thumbnail_url` / `image_urls` with real image URLs.

## 6. Phase 2 hooks (already in place)
* `server/src/app.js` auto-mounts `server/src/routes/admin/index.js` at `/api/admin` **if the file exists**.
* `client/src/App.jsx` auto-mounts `client/src/admin/routes.jsx` at `/admin/*` **if the file exists**.
* The database already contains every table Phase 2 needs. Phase 2 only **adds files** (plus three admin env vars).

## 7. Deploy on Render (single service)
Express serves the API **and** the built React app, so you need only one Render Web Service and one URL.

1. Push this folder to a GitHub repo (`.env` is git-ignored).
2. Render → **New → Web Service** → pick the repo (or **New → Blueprint** to use `render.yaml`).
3. Settings:
   * Runtime: **Node**
   * Root directory: *(leave empty — repo root)*
   * Build command: `npm run build`
   * Start command: `npm start`
   * Health check path: `/api/health`
4. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID`. Set `PUBLIC_SITE_URL` to your deployed site URL; the blueprint defaults the API version/language, uses `24 hours` for the payment template's delivery estimate, and maps the three approved templates. (`CLIENT_URL` and `VITE_API_URL` are **not** needed: same origin.)
5. Deploy. The site, `/api/*` and later `/admin` all live on `https://<your-service>.onrender.com`.

Notes: the free plan sleeps after inactivity (first visit may take ~30–60 s) — use a paid plan for a live shop. After Phase 2, add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET` in Render's Environment tab. Local test of the production setup: `npm run build`, create `server/.env`, `npm start`, open http://localhost:5000.

# ShopSphere – Smart E-Commerce Platform

ShopSphere is a React e-commerce application with a customer storefront and an admin dashboard. It uses JSON Server for demo product, customer, cart, wishlist and order data.

## Tech stack
- React + Vite
- Tailwind CSS and Axios
- JSON Server
- Recharts
- Razorpay Checkout (Test Mode)
- Node.js + Express payment API and Razorpay Node SDK

## Run locally

Start three terminals from the project folder.

### 1. JSON Server
```bash
cd json-server
npm install
npx json-server db.json --port 3000
```
JSON Server runs at `http://localhost:3000`.

### 2. Razorpay payment backend
```bash
cd payment-server
npm install
```
Copy `payment-server/.env.example` to `payment-server/.env`. Add your Razorpay **Test Mode** Key ID and Key Secret from the Razorpay Dashboard, then run:
```bash
npm run dev
```
The payment API runs at `http://localhost:5000`; health check: `http://localhost:5000/api/health`.

### 3. React frontend
In the project root, copy `.env.example` to `.env`. Add your Razorpay **Test Key ID** to `VITE_RAZORPAY_KEY_ID`, then run:
```bash
npm install
npm run dev
```
Vite runs at `http://localhost:5173`.

## Razorpay Test Mode
1. Sign in to Razorpay Dashboard and switch to **Test Mode**.
2. Open **Account & Settings → API Keys** and generate a Test Key pair.
3. Put both test keys in `payment-server/.env`.
4. Put only the Test Key ID in the root `.env` as `VITE_RAZORPAY_KEY_ID`.
5. Restart the payment server and Vite after changing environment variables.

Use the test payment details supplied in Razorpay's official Test Mode guidance. Test Mode simulates payments; it does not deduct real money.

## Payment flow
1. Checkout sends product IDs and quantities to the payment backend.
2. The backend reads current prices and stock from JSON Server and creates a Razorpay order in paise.
3. Razorpay Checkout opens in the browser.
4. The backend verifies the HMAC SHA-256 signature using the secret key.
5. Only after successful verification does the frontend save the order as paid, update customer details and stock, clear the cart, and navigate to Orders.
6. Cash on Delivery remains available.

**Never put `RAZORPAY_KEY_SECRET` in React code, a `VITE_*` variable, GitHub, or Vercel frontend environment variables.** Keep it only in the payment backend's private environment settings.

## Security and demo limitations
- This project uses JSON Server as a learning/demo API. It is publicly readable/writable if deployed without access controls; do not store real customer information in it.
- The current demo login stores passwords in the JSON Server data and compares them directly. It is not production authentication. Do not reuse a real password, and do not use this authentication flow for real customers.
- Order creation, customer updates, and stock changes are initiated by the browser against JSON Server. They are not transactional and can be manipulated. A production system needs authenticated backend endpoints, password hashing, authorization, database transactions, and server-side order persistence.
- Use only synthetic test accounts and test payment credentials in this repository. Keep personal data and all `.env` files out of Git.

## Deployment note
Deploy `payment-server` as a separate Node service. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `JSON_SERVER_URL`, and `FRONTEND_URL` in that service's environment settings. In Vercel, set `VITE_PAYMENT_API_URL` to the deployed payment API URL and `VITE_RAZORPAY_KEY_ID` to the Test Key ID, then redeploy.

This is a learning/demo integration. Production order persistence, stock updates, authentication and payment state should be handled by a trusted backend and database rather than a browser-only JSON Server.

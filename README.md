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

Open the ShopSphere project folder in VS Code. Start three separate terminals. Keep all three running.

### 1. Start the data server

In the first terminal, stay in the main ShopSphere project folder and run:

```bash
npm install
npm run server
```

This starts JSON Server using `json-server/db.json` at `http://localhost:3000`.

### 2. Start the Razorpay payment server

In the second terminal, run:

```bash
cd payment-server
npm install
```

Create a file named `.env` inside the `payment-server` folder. Copy the variable names from `payment-server/.env.example` and add your own Razorpay **Test Mode** credentials:

```env
PORT=5000
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_test_key_secret
JSON_SERVER_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

Save the file, then run:

```bash
npm run dev
```

The payment server runs at `http://localhost:5000`. You can check it at `http://localhost:5000/api/health`; it should return `{"ok":true}`.

### 3. Start the ShopSphere website

In the third terminal, go back to the main ShopSphere project folder:

```bash
cd ..
```

If this terminal is already in the main project folder, do not run `cd ..`.

Create a file named `.env` in the main project folder (the same folder as the root `package.json`). Copy the variable names from `.env.example` and set your Razorpay Test Key ID:

```env
VITE_API_URL=http://localhost:3000
VITE_PAYMENT_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
```

Run:

```bash
npm run dev
```

Open the local website shown by Vite, usually `http://localhost:5173`.

## Razorpay Test Mode

1. Sign in to the Razorpay Dashboard and switch to **Test Mode**.
2. Open **Account & Settings → API Keys** and generate a Test Key pair.
3. Put the Test Key ID and Test Key Secret in `payment-server/.env`.
4. Put only the Test Key ID in the root `.env` as `VITE_RAZORPAY_KEY_ID`.
5. Restart both the payment server and Vite after changing environment variables.

Use Razorpay's test payment details when checking out. Test Mode simulates payments; it does not charge real money.

## Payment flow

1. Checkout sends product IDs and quantities to the payment server.
2. The payment server reads current prices and stock from JSON Server and creates a Razorpay order in paise.
3. Razorpay Checkout opens in the browser.
4. The payment server verifies the payment signature using the secret key.
5. After successful verification, the frontend saves the order, updates customer details and stock, clears the cart, and opens the Orders page.
6. Cash on Delivery remains available.

**Never put `RAZORPAY_KEY_SECRET` in React code, a `VITE_*` variable, GitHub, or Vercel frontend environment variables.** Keep it only in the payment server's private environment settings.

## Security and demo limitations

- This project uses JSON Server as a learning/demo API. Do not store real customer information in it.
- The current demo login is not production-grade authentication. Use only synthetic test accounts and never reuse a real password.
- Order creation, customer updates, and stock changes are initiated by the browser against JSON Server. A production system needs authenticated backend endpoints, password hashing, authorization, database transactions, and server-side order persistence.
- Keep all `.env` files and secret credentials out of GitHub.

## Deployment note

Deploy `payment-server` as a separate Node service. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `JSON_SERVER_URL`, and `FRONTEND_URL` in that service's private environment settings. In Vercel, set `VITE_PAYMENT_API_URL` to the deployed payment server URL and `VITE_RAZORPAY_KEY_ID` to the Test Key ID, then redeploy.

This is a learning/demo integration. For real customers and production payments, use a secure backend and database rather than a browser-only JSON Server.

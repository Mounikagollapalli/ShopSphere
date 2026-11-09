# ShopSphere – Smart E-Commerce Platform

ShopSphere is a React + Vite e-commerce demo with a customer storefront and an admin dashboard.

## Tech stack

- React + Vite
- Tailwind CSS and Recharts
- Browser storage for demo accounts, cart, wishlist, products, and orders
- Vercel Serverless Functions for Razorpay order creation and payment verification
- Razorpay Checkout (Test Mode)

## Run locally

1. Install dependencies: `npm install`
2. Create a root `.env` file using `.env.example`.
3. Set `VITE_RAZORPAY_KEY_ID` to your Razorpay Test Key ID.
4. Start the app: `npm run dev`.

The Razorpay API functions run on Vercel. For local payment testing, deploy a Preview build or use the Vercel CLI with the private environment variables configured.

## Vercel environment variables

Configure these in the Vercel project for both Preview and Production:

- `VITE_RAZORPAY_KEY_ID`: Razorpay Test Key ID. This is the public checkout key.
- `RAZORPAY_KEY_ID`: Razorpay Test Key ID for the serverless function.
- `RAZORPAY_KEY_SECRET`: Razorpay Test Key Secret. Keep this private; never prefix it with `VITE_` and never commit it to GitHub.

After changing environment variables, create a new deployment.

## Payment flow

1. Checkout sends product IDs and quantities to `/api/payments/create-order`.
2. The Vercel function validates products, prices, and stock against the server-side demo catalogue.
3. The function creates a Razorpay order using the private server-side credentials.
4. Razorpay Checkout opens in the browser.
5. Checkout sends the payment response to `/api/payments/verify`.
6. The Vercel function checks the HMAC signature and confirms the payment and order with Razorpay.
7. Only after verification does the storefront save the paid order, clear the cart, and show the **Start Shopping** link.

Health check: `/api/health`.

## Demo data and limitations

- Products, demo accounts, cart, wishlist, and orders are stored in the current browser. They are not shared between different browsers or devices.
- Demo account credentials are stored locally in the browser and are not production authentication.
- The catalogue used for server-side payment validation is `payment-server/catalog.json`. Keep its prices aligned with the storefront catalogue when editing demo products.
- Use Razorpay Test Mode only. This project is a portfolio/demo application, not a production commerce platform for real customer data.
- The Razorpay secret is used only by Vercel serverless functions and must remain in Vercel's encrypted environment variables.

## Deployment

The project is a standard Vite app on Vercel. API handlers live in the root `api/` directory and run as Vercel Serverless Functions. No Render service or external JSON Server is required for the browser-local demo flow.

# EarnPulse - WhatsApp Earning & Renting Platform

Complete 100% working fullstack WhatsApp earning platform with real EarnBondhu master bridge integration.

## Project Structure
- `backend/` : Node.js Express server + Lowdb database + Live Proxy Bridge.
- `frontend/` : React + Vite + Lucide icons + 3D Luxury Theme.

## Free Deployment Instructions

### 1. Free Backend Hosting (Render.com)
1. Sign up on [Render.com](https://render.com) using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Connect your repository.
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**. You will get a free live URL (e.g. `https://earnpulse-api.onrender.com`).

### 2. Free Frontend Hosting (Vercel)
1. Sign up on [Vercel](https://vercel.com) with GitHub.
2. Click **Add New** -> **Project**.
3. Import your repository.
4. Set:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
5. In `frontend/src/App.jsx`, update `API_BASE` to your Render backend URL:
   ```javascript
   const API_BASE = 'https://your-render-url.onrender.com/api';
   ```
6. Click **Deploy**. Your live site URL will be ready (e.g. `https://earnpulse.vercel.app`)!

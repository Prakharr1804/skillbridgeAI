# Frontend Deployment Guide for SkillBridge AI (Vercel)

This guide provides step-by-step instructions for deploying the **SkillBridge AI Frontend** on [Vercel](https://vercel.com).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Option 1: Deploy via Vercel Web Dashboard (Recommended)](#2-option-1-deploy-via-vercel-web-dashboard-recommended)
3. [Option 2: Deploy via Vercel CLI](#3-option-2-deploy-via-vercel-cli)
4. [Google Cloud Console Setup (Calendar Sync)](#4-google-cloud-console-setup-calendar-sync)
5. [Connecting Frontend to Backend (Final CORS Step)](#5-connecting-frontend-to-backend-final-cors-step)
6. [Troubleshooting & FAQs](#6-troubleshooting--faqs)

---

## 1. Prerequisites

Before deploying the frontend, make sure you have:
- [x] A **GitHub / GitLab** account with your code pushed.
- [x] A **Vercel** account (Sign up for free with GitHub at [vercel.com](https://vercel.com)).
- [x] Your **Live Backend URL** (e.g., `https://skillbridge-backend.onrender.com` from Render/Railway).
- [x] (Optional) A **Google OAuth Client ID** if you are enabling the Google Calendar Sync feature.

---

## 2. Option 1: Deploy via Vercel Web Dashboard (Recommended)

### Step 1: Push Your Code to GitHub
Ensure all your latest changes are pushed to your remote repository:
```bash
git add .
git commit -m "Prepare frontend for Vercel deployment"
git push origin main
```

---

### Step 2: Import Project into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Locate your repository from the list and click **Import**.

---

### Step 3: Configure Project Settings

In the **Configure Project** screen:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Project Name** | `skillbridge-ai` | Or any name of your choice |
| **Framework Preset** | `Vite` | Vercel auto-detects Vite |
| **Root Directory** | `frontend` | **Crucial:** Click *Edit* and select `frontend` |
| **Build Command** | `npm run build` | Default |
| **Output Directory** | `dist` | Default |
| **Install Command** | `npm install` | Default |

> [!IMPORTANT]
> Because your project has both `frontend` and `backend` folders, you **must set the Root Directory to `frontend`**.

---

### Step 4: Add Environment Variables

Expand the **Environment Variables** section and add the following keys:

| Name | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://your-backend.onrender.com` | Your deployed backend URL (**no trailing slash**) |
| `VITE_GOOGLE_CLIENT_ID` | `866403189381-bff...apps.googleusercontent.com` | (Optional) Google OAuth Client ID for Calendar sync |

---

### Step 5: Click Deploy
1. Click the blue **Deploy** button.
2. Vercel will clone the repo, install dependencies, compile assets with Vite, and deploy.
3. Within ~30–60 seconds, you will see the **Congratulations!** screen with your live production URL (e.g., `https://skillbridge-ai.vercel.app`).

---

## 3. Option 2: Deploy via Vercel CLI

If you prefer deploying from your terminal:

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Log in to your Vercel account:
   ```bash
   vercel login
   ```
3. Navigate into the `frontend` folder:
   ```bash
   cd frontend
   ```
4. Run the deploy command:
   ```bash
   vercel
   ```
5. Follow the interactive prompts:
   - *Set up and deploy?* ➔ `Y`
   - *Which scope?* ➔ Select your account
   - *Link to existing project?* ➔ `N`
   - *Project name?* ➔ `skillbridge-ai`
   - *Directory located?* ➔ `./`
6. For production release:
   ```bash
   vercel --prod
   ```

---

## 4. Google Cloud Console Setup (Calendar Sync)

If using Google OAuth for Calendar Sync, Google requires you to whitelist your new Vercel domain:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Go to **APIs & Services** ➔ **Credentials**.
3. Click on your **OAuth 2.0 Client ID** under *OAuth 2.0 Client IDs*.
4. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `https://skillbridge-ai.vercel.app` (your actual Vercel domain)
5. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   - `https://skillbridge-ai.vercel.app`
6. Click **Save**.

---

## 5. Connecting Frontend to Backend (Final CORS Step)

Once you have your live Vercel URL (e.g. `https://skillbridge-ai.vercel.app`), update your backend so that cookies and API calls work smoothly without CORS errors:

1. Go to your **Render / Railway Backend Dashboard**.
2. Navigate to **Environment Variables**.
3. Set/Update:
   ```env
   FRONTEND_URL=https://skillbridge-ai.vercel.app
   ```
4. Save and let the backend automatically redeploy.

---

## 6. Troubleshooting & FAQs

### Q: Does refreshing the page on `/interview/123` give a 404 on Vercel?
**No.** The repository includes a `frontend/vercel.json` file with client-side SPA rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```
This tells Vercel to route all requests back to `index.html` so React Router handles internal paths seamlessly.

### Q: Why am I getting "Blocked by CORS policy" or login failure?
1. Verify that `VITE_API_URL` on Vercel does **not** have a trailing slash (e.g. use `https://my-backend.onrender.com`, NOT `https://my-backend.onrender.com/`).
2. Verify that `FRONTEND_URL` on Render matches your exact Vercel URL.
3. Make sure your Render backend is awake and healthy by visiting `https://your-backend.onrender.com/api/health`.

### Q: How do I update the frontend after making new code changes?
Whenever you push new commits to GitHub (`git push origin main`), Vercel will automatically build and deploy the update in real-time.

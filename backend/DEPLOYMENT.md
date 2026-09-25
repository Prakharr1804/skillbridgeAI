# Backend Deployment Guide for SkillBridge AI

This guide contains step-by-step instructions, code modifications, security practices, and platform-specific deployment guides to make the **SkillBridge AI Backend** fully production-ready.

---

## Table of Contents

1. [Pre-Deployment Code Adjustments](#1-pre-deployment-code-adjustments)
   - [A. Add npm Start Script & Engine Specifications](#a-add-npm-start-script--engine-specifications)
   - [B. Dynamic Port Binding & Database Error Handling](#b-dynamic-port-binding--database-error-handling)
   - [C. Health Check Endpoint & Reverse Proxy Support](#c-health-check-endpoint--reverse-proxy-support)
   - [D. CORS and Cookie Configuration for Production](#d-cors-and-cookie-configuration-for-production)
   - [E. Handling Puppeteer in Cloud/Linux Environments](#e-handling-puppeteer-in-cloudlinux-environments)
   - [F. Ephemeral Storage for Uploads](#f-ephemeral-storage-for-uploads)
2. [Environment Variables Configuration](#2-environment-variables-configuration)
3. [Database (MongoDB Atlas) Setup](#3-database-mongodb-atlas-setup)
4. [Deployment Options](#4-deployment-options)
   - [Option A: Deploy on Render (Recommended & Fastest)](#option-a-deploy-on-render-recommended--fastest)
   - [Option B: Deploy on Railway](#option-b-deploy-on-railway)
   - [Option C: Deploy with Docker (AWS, DigitalOcean, VPS, Fly.io)](#option-c-deploy-with-docker-aws-digitalocean-vps-flyio)
5. [Post-Deployment Verification & Testing](#5-post-deployment-verification--testing)
6. [Security & Production Best Practices](#6-security--production-best-practices)

---

## 1. Pre-Deployment Code Adjustments

Before deploying to production cloud platforms, ensure the following codebase improvements are applied:

### A. Add npm Start Script & Engine Specifications
In `backend/package.json`, add a standard `start` script and define the Node.js runtime version:

```json
{
  "name": "gen-ai",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    ...
  }
}
```

---

### B. Dynamic Port Binding & Database Error Handling
In `backend/server.js`:
- Use `process.env.PORT` dynamically (hosting providers like Render/Railway allocate ports via this environment variable).
- Remove hardcoded development mock data and unneeded function calls.
- Add graceful database connection handling.

```javascript
require('dotenv').config();
const app = require('./src/app');
const connectToDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Connect to Database and start server
connectToDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful Shutdown on termination signals
    const gracefulShutdown = (signal) => {
      console.log(`${signal} received. Closing HTTP server and database connections...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
```

Update `backend/src/config/database.js` to return the promise / throw error:
```javascript
const mongoose = require('mongoose');

async function connectToDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    throw error;
  }
}

module.exports = connectToDB;
```

---

### C. Health Check Endpoint & Reverse Proxy Support
In `backend/src/app.js`:
- Add `app.set('trust proxy', 1)` so reverse proxies (Cloudflare, Render, AWS ALB, Nginx) forward client IPs properly for rate-limiting and cookies.
- Add a lightweight `GET /api/health` endpoint for uptime monitoring and load-balancer probes.

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Trust reverse proxy for secure cookies and rate-limiting
app.set('trust proxy', 1);

// Ensure uploads directory exists on startup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static uploads serving
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
```

---

### D. CORS and Cookie Configuration for Production
In production, your frontend and backend usually live on separate subdomains or domains (e.g. `frontend.vercel.app` and `api.onrender.com`).

1. **CORS Setup in `src/app.js`**:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

2. **Cookie Options in `src/controllers/auth.controller.js`**:
Ensure auth cookies support cross-site requests in production:
```javascript
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS required in production
  sameSite: isProduction ? 'none' : 'lax', // 'none' allows cross-domain auth between Vercel and Render
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

---

### E. Handling Puppeteer in Cloud/Linux Environments
Puppeteer requires Chromium dependencies on Linux servers. 

In `src/services/ai.service.js`, update the Puppeteer launch configuration:
```javascript
async function generatePdfFromHtml(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    }
  });
  await browser.close();
  return pdfBuffer;
}
```

---

### F. Ephemeral Storage for Uploads
In serverless or container platforms, the local `uploads/` folder is wiped on restart or container scaling.
- **For MVP/Single Container**: The local folder `uploads/` will persist within container session life. Ensure directory creation is checked on startup.
- **For Production Scale**: Move audio/resume uploads to cloud object storage (e.g. AWS S3, Cloudinary, or Supabase Storage) and store only public URLs in MongoDB.

---

## 2. Environment Variables Configuration

Create a `.env.example` file in the `backend/` directory for reference.

### Required Production Environment Variables:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Listening port for the application | `3000` (Render/Railway sets automatically) |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/skillbridge?retryWrites=true&w=majority` |
| `JWT_SECRET` | Strong secret key for signing auth tokens | 64+ char random string (e.g., `openssl rand -hex 32`) |
| `GOOGLE_GENAI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `FRONTEND_URL` | Production Frontend domain | `https://skillbridge.vercel.app` |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | (Optional Docker/Alpine flag) | `false` |

---

## 3. Database (MongoDB Atlas) Setup

1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Production Cluster (e.g. Shared M0 for testing/free, or M10+ for production).
3. **Database Access**: Create a Database User with read/write privileges on the `skillbridge` database.
4. **Network Access**: Add IP `0.0.0.0/0` (Allow Access from Anywhere) so cloud providers (Render, Railway, Vercel) can access the database.
5. Retrieve your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/skillbridge?retryWrites=true&w=majority&appName=SkillBridge
   ```

---

## 4. Deployment Options

### Option A: Deploy on Render (Recommended & Fastest)

1. Push your repository to GitHub or GitLab.
2. Log into [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx puppeteer browsers install chrome`
   - **Start Command**: `npm start`
   - **Plan**: Starter or higher (Puppeteer PDF rendering requires at least 512MB - 1GB RAM).
5. Add **Environment Variables** in the Render Dashboard:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `<Your MongoDB URI>`
   - `JWT_SECRET` = `<Your Secret>`
   - `GOOGLE_GENAI_API_KEY` = `<Your Gemini API Key>`
   - `FRONTEND_URL` = `<Your Frontend URL>`
6. Click **Deploy Web Service**.

---

### Option B: Deploy on Railway

1. Log into [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. In service settings:
   - Set **Root Directory** to `/backend`.
   - Railway automatically detects `package.json` and runs `npm install` and `npm start`.
4. Add the Puppeteer Nixpacks provider or install packages in `railway.toml`:
   ```toml
   [build]
   builder = "NIXPACKS"
   nixpkgsArchive = "latest"

   [phases.setup]
   nixPkgs = ["nodejs", "chromium"]

   [phases.build]
   cmds = ["npm install"]

   [deploy]
   startCommand = "npm start"
   ```
5. Add your Environment Variables in the **Variables** tab.

---

### Option C: Deploy with Docker (AWS, DigitalOcean, VPS, Fly.io)

For fully reproducible deployments with Puppeteer/Chrome pre-installed:

Create `backend/Dockerfile`:
```dockerfile
FROM node:20-slim

# Install latest chrome dev package and fonts to support major charsets
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

Create `backend/.dockerignore`:
```
node_modules
npm-debug.log
.env
.git
.gitignore
uploads/*
!uploads/.gitkeep
```

Build and test locally:
```bash
docker build -t skillbridge-backend ./backend
docker run -p 3000:3000 --env-file ./backend/.env skillbridge-backend
```

---

## 5. Post-Deployment Verification & Testing

Run the following checks to confirm your backend is fully operational:

1. **Health Check**:
   ```bash
   curl https://your-backend-domain.com/api/health
   # Expected response: {"status":"ok","uptime":...,"timestamp":"..."}
   ```

2. **Authentication Flow**:
   - Test User Registration: `POST /api/auth/register`
   - Test User Login: `POST /api/auth/login` (Verify `token` cookie is received with `HttpOnly; Secure; SameSite=None`)
   - Test User Profile: `GET /api/auth/profile`

3. **AI Services**:
   - Test Resume Analysis / Mock Interview generation.
   - Verify Gemini API Key quota and response latency.
   - Test PDF generation with Puppeteer to confirm Chromium renders without missing font/library errors.

---

## 6. Security & Production Best Practices

1. **Helmet & Rate Limiting**:
   - Install `helmet` (`npm install helmet`) and add `app.use(helmet())` to set HTTP security headers.
   - Configure `express-rate-limit` for `/api/auth/login` and `/api/auth/register` to prevent brute force attacks.
2. **Payload Size Limits**:
   - Verify audio upload size limit in Multer (e.g. max 10MB–25MB per audio file) to prevent memory exhaustion.
3. **Log Sanitization**:
   - Ensure passwords, JWT tokens, and API keys are never printed in console logs (`console.log`).
4. **Secret Management**:
   - Never commit `.env` into git. Keep `.env` in `.gitignore`.

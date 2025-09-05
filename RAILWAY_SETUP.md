# Railway Backend Setup Guide

## Current Issue: 502 Bad Gateway

The Railway backend is returning 502 errors because the `DATABASE_URL` environment variable is not set.

## Solution: Set Up Railway Environment Variables

### Step 1: Access Railway Dashboard
1. Go to https://railway.app/dashboard
2. Sign in to your account
3. Select your `appsamurai-dashboard` project

### Step 2: Add PostgreSQL Database
1. Click **"+ New"** in your project
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for the database to be created
4. Railway will automatically set the `DATABASE_URL` environment variable

### Step 3: Verify Environment Variables
1. Go to your **backend service** (not the database)
2. Click on **"Variables"** tab
3. Verify these variables exist:
   - `DATABASE_URL` (automatically set by Railway)
   - `PORT` (should be set to 8787)
   - `NODE_VERSION` (should be 22.12.0)

### Step 4: Redeploy
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** to trigger a new deployment
3. Wait for deployment to complete

## Alternative: Manual DATABASE_URL Setup

If you prefer to use an external database:

1. Get a PostgreSQL connection string from your database provider
2. In Railway → Backend Service → Variables
3. Add: `DATABASE_URL` = `postgresql://username:password@host:port/database`

## Expected Results

After setting up the database:
- ✅ 502 errors will disappear
- ✅ CORS headers will be properly sent
- ✅ Frontend will connect successfully
- ✅ New error handling will be active

## Testing

Once the backend is running:
1. Visit: https://backend-production-80f6.up.railway.app/health
2. Should return: `{"ok": true}`
3. Frontend should load files without CORS errors

## Troubleshooting

If you still get 502 errors:
1. Check Railway logs in the "Deployments" tab
2. Look for error messages about DATABASE_URL
3. Ensure the database service is running
4. Verify environment variables are set correctly

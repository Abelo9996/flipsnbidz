# Quick Fix for 500 Error

The API is running but can't connect to MongoDB. Here's how to fix it:

## Step 1: Check Environment Variables in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your **flipsnbidz** project
3. Go to **Settings** → **Environment Variables**
4. Make sure you have:

### MONGODB_URI
```
mongodb+srv://abelyagubyan:Mamagan9@cluster0.rtehltl.mongodb.net/hibid?retryWrites=true&w=majority&appName=Cluster0
```
- ✅ Check all 3 environments (Production, Preview, Development)

## Step 2: Check MongoDB Atlas Network Access

1. Go to: https://cloud.mongodb.com/
2. Select your **Cluster0**
3. Click **Network Access** in left sidebar
4. Make sure you have: **0.0.0.0/0** (Allow access from anywhere)
5. If not, click **+ ADD IP ADDRESS** → **ALLOW ACCESS FROM ANYWHERE** → **Confirm**

⚠️ **This is CRITICAL** - Vercel serverless functions come from different IPs each time!

## Step 3: Verify MongoDB Cluster is Active

1. In MongoDB Atlas dashboard
2. Check that **Cluster0** shows as **"Active"** (not paused)
3. If paused, click to resume it

## Step 4: Check Vercel Function Logs

To see the exact error:

1. In Vercel Dashboard → Your Project
2. Go to **Deployments** tab
3. Click the latest deployment
4. Click **Functions** tab
5. Click on **api/index.js**
6. You'll see the exact error message

Common errors you might see:
- `MongooseServerSelectionError` = Network access issue (fix with 0.0.0.0/0)
- `Authentication failed` = Wrong password in connection string
- `Timeout` = MongoDB cluster is paused or slow

## Step 5: After Fixing Environment Variables

If you just added/changed environment variables:

1. Go to **Deployments** tab
2. Click **⋯** menu on latest deployment
3. Click **Redeploy**
4. Wait for completion

Environment variables are only loaded during deployment, not live!

## Step 6: Test the API Directly

Open this URL in your browser:
```
https://abelo9996flipsnbidz-oyh6i65ui-abelo9996s-projects.vercel.app/api/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "mongodb": "connected",
  "emailProvider": "Gmail API"
}
```

If it says `"mongodb": "disconnected"`, that's your problem!

## Quick Checklist

- [ ] Environment variable `MONGODB_URI` is set in Vercel
- [ ] All 3 environment checkboxes are checked (Prod, Preview, Dev)
- [ ] MongoDB Atlas allows 0.0.0.0/0 in Network Access
- [ ] MongoDB Cluster0 is Active (not paused)
- [ ] Redeployed after adding environment variables
- [ ] `/api/health` shows "mongodb": "connected"

Once all checkmarks are ✅, try booking an appointment again!

# Vercel Environment Variables Setup

## Fix MongoDB URI Error

The MongoDB connection string needs to be properly configured in Vercel.

### Step 1: Go to Vercel Dashboard

1. Open your project at: https://vercel.com/dashboard
2. Click on your **flipsnbidz** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Environment Variables

Add these variables EXACTLY as shown:

#### Variable 1: MONGODB_URI
```
Name: MONGODB_URI
Value: mongodb+srv://abelyagubyan:Mamagan9@cluster0.rtehltl.mongodb.net/hibid?retryWrites=true&w=majority&appName=Cluster0
Environment: Production, Preview, Development (check all 3)
```

**Important Notes:**
- ✅ The entire connection string should be in ONE LINE
- ✅ No quotes around the value
- ✅ No extra spaces before or after
- ✅ Make sure password is: Mamagan9
- ✅ Database name is: hibid

#### Variable 2: GMAIL_USER (Optional - for Gmail API backup)
```
Name: GMAIL_USER
Value: flipsnbidz@gmail.com
Environment: Production, Preview, Development (check all 3)
```

### Step 3: MongoDB Atlas Network Access

Make sure Vercel can connect to MongoDB:

1. Go to: https://cloud.mongodb.com/
2. Click your **Cluster0**
3. Go to **Network Access** (left sidebar)
4. Click **+ ADD IP ADDRESS**
5. Click **"ALLOW ACCESS FROM ANYWHERE"** (adds 0.0.0.0/0)
6. Click **Confirm**

⚠️ **This is required for Vercel serverless functions to connect!**

### Step 4: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Test the Deployment

Once deployed, test these URLs:

```
https://your-project.vercel.app/api/health
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

## Common Errors & Fixes

### Error: "MONGODB_URI is not defined"
**Fix:** Make sure you clicked all 3 environment checkboxes (Production, Preview, Development)

### Error: "MongoServerError: bad auth"
**Fix:** Your password might have special characters. URL encode it:
- Use this connection string format
- Password should be `Mamagan9` (no special chars, should work fine)

### Error: "Connection timeout"
**Fix:** Add `0.0.0.0/0` to MongoDB Network Access (see Step 3)

### Error: "Cannot connect to MongoDB"
**Fix:** Check if your MongoDB Atlas cluster is:
- ✅ Active (not paused)
- ✅ Has network access configured
- ✅ Connection string is correct

## Quick Check

Run this to verify your MongoDB connection string locally:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://abelyagubyan:Mamagan9@cluster0.rtehltl.mongodb.net/hibid?retryWrites=true&w=majority').then(() => console.log('✅ Connected')).catch(e => console.log('❌ Error:', e.message))"
```

## Still Having Issues?

Check Vercel Function Logs:
1. Go to your project dashboard
2. Click **Deployments**
3. Click the latest deployment
4. Click **Function Logs** tab
5. Look for MongoDB connection errors

The logs will show you the exact error message.

# Vercel Deployment Troubleshooting

## Check Your Deployment

### 1. Find Your Deployment URL

In Vercel Dashboard:
- Go to your **flipsnbidz** project
- Look for the **Domains** section at the top
- Your URL should be something like: `https://flipsnbidz.vercel.app` or `https://flipsnbidz-xxxxx.vercel.app`

### 2. Test These URLs

Try these endpoints to verify the deployment:

#### Homepage
```
https://your-domain.vercel.app
```
Should show your main landing page

#### API Health Check
```
https://your-domain.vercel.app/api/health
```
Should return JSON:
```json
{
  "success": true,
  "message": "Server is running",
  "mongodb": "connected",
  "emailProvider": "Gmail API"
}
```

#### Appointment Page
```
https://your-domain.vercel.app/appointment.html
```
Should show the appointment booking page

### 3. Check Full Deployment Logs

In Vercel Dashboard:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Look for these sections:
   - **Build Logs** - Check for errors during build
   - **Function Logs** - Check for runtime errors
   - **Output** - See what files were deployed

### 4. Common Issues & Solutions

#### Issue: "No updates to the website"
**Possible causes:**
- Browser cache (hard refresh with Cmd+Shift+R)
- Deployment still in progress
- Build failed but didn't show error

**Fix:**
```bash
# Force a new deployment
git commit --allow-empty -m "Force redeploy"
git push
```

#### Issue: "404 Not Found" on homepage
**Cause:** index.html not being served

**Fix:** Check that `index.html` exists in root and `vercel.json` routes are correct

#### Issue: "API endpoints return 404"
**Cause:** Serverless functions not deployed

**Fix:** Check `api/index.js` exists and `vercel.json` has correct routes

#### Issue: "Function exceeded timeout"
**Cause:** MongoDB connection taking too long

**Fix:** 
- Check MongoDB Atlas is not paused
- Verify network access allows 0.0.0.0/0
- Check connection string is correct

### 5. View Real-Time Function Logs

When testing your site:
1. Open Vercel Dashboard
2. Go to your project → **Deployments** → Latest
3. Click **Function Logs** tab
4. Keep this open
5. In another tab, visit your site and try booking an appointment
6. Watch the logs in real-time to see errors

### 6. Verify Files Were Deployed

Check the deployment output:
- Should see: `index.html`, `appointment.html`, `styles.css`, etc.
- Should see: `api/index.js` as a serverless function
- Total size should be around 5-6 MB

### 7. Force Cache Refresh

Clear your browser cache:
- **Chrome/Edge**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- **Safari**: Cmd+Option+E, then Cmd+R
- Or open in Incognito/Private mode

### 8. Check Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
- ✅ `MONGODB_URI` should be set
- ✅ Should be enabled for Production, Preview, Development
- ⚠️ If you just added it, you need to redeploy

### 9. Manual Redeploy

If nothing is updating:
1. Go to **Deployments** tab
2. Find the latest successful deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Select **Use existing Build Cache** (faster) or uncheck for fresh build
6. Wait for completion

### 10. Check Git vs Vercel

Make sure your latest code is pushed:
```bash
# Check what's committed locally
git log --oneline -5

# Check what's on GitHub
# Go to: https://github.com/Abelo9996/flipsnbidz
# Verify the latest commit matches
```

## What to Share for Further Help

If still having issues, share:
1. Your Vercel deployment URL
2. Full build logs (click "View Build Logs" in Vercel)
3. Any error messages in Function Logs
4. Screenshot of the Environment Variables page
5. What you see when you visit the URL (blank page, error, old version?)

## Quick Test Commands

Test locally first:
```bash
# Test if files exist
ls -la index.html appointment.html api/index.js

# Check vercel.json is valid
cat vercel.json

# Test MongoDB connection
node -e "require('./api/index')"
```

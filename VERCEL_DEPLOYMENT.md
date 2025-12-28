# Deploying to Vercel - Complete Guide

## Prerequisites

✅ You have a Vercel account (sign up at https://vercel.com)
✅ You have the Vercel CLI installed (optional but recommended)
✅ Your code is pushed to GitHub

## Step 1: Prepare Your Environment Variables

Before deploying, you need to set up your environment variables in Vercel. You'll need:

### Required Environment Variables:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hibid?retryWrites=true&w=majority
GMAIL_USER=flipsnbidz@gmail.com
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=your_refresh_token
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
NODE_ENV=production
```

**Important:** Your local `.env` file is NOT uploaded to Vercel. You must configure these in the Vercel dashboard.

## Step 2: Update Vercel Configuration

Your `vercel.json` needs to include the chatbot API route. Let me check if it's configured...

## Step 3: Deploy Methods

### Method A: Deploy via Vercel Dashboard (Easiest)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository: `Abelo9996/flipsnbidz`
   - Click "Import"

3. **Configure Environment Variables:**
   - In the project settings, go to "Environment Variables"
   - Add each variable from above (one at a time)
   - Make sure to select "Production", "Preview", and "Development"

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

### Method B: Deploy via Vercel CLI (Recommended for Testing)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to Preview:**
   ```bash
   vercel
   ```
   This creates a preview deployment to test before going to production.

4. **Add Environment Variables** (first time only):
   ```bash
   vercel env add MONGODB_URI
   vercel env add GMAIL_CLIENT_ID
   vercel env add GMAIL_CLIENT_SECRET
   vercel env add GMAIL_REFRESH_TOKEN
   vercel env add GMAIL_USER
   vercel env add OPENAI_API_KEY
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## Step 4: Verify Auction Context Files

The `auction_context/` folder needs to be included in your deployment:

```bash
# Make sure these files exist and are committed:
git add auction_context/*.csv
git commit -m "Add auction inventory data"
git push
```

## Step 5: Post-Deployment Verification

After deployment, test these endpoints:

### 1. Check Main Site
```
https://your-domain.vercel.app/
```

### 2. Check Chatbot
```
https://your-domain.vercel.app/chatbot.html
```

### 3. Test Chatbot API
```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What items are available?"}'
```

### 4. Test Appointment API
```
https://your-domain.vercel.app/appointment.html
```

## Common Issues & Solutions

### Issue 1: "Module not found" errors

**Solution:** Make sure all dependencies are in `package.json`:
```bash
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue 2: Chatbot not loading auction context

**Solution:** Verify the `auction_context/` folder is in your repo:
```bash
ls -la auction_context/
git add auction_context/
git commit -m "Add auction context folder"
git push
```

### Issue 3: Environment variables not working

**Solutions:**
1. Double-check spelling in Vercel dashboard
2. Make sure they're enabled for "Production"
3. Redeploy after adding variables:
   ```bash
   vercel --prod
   ```

### Issue 4: MongoDB connection errors

**Solutions:**
1. Whitelist Vercel IPs in MongoDB Atlas:
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allow all) for Vercel serverless functions
2. Verify connection string format
3. Check that database user has correct permissions

### Issue 5: Gmail API not working

**Solutions:**
1. Verify OAuth2 credentials are correct
2. Make sure refresh token hasn't expired
3. Check that Gmail API is enabled in Google Cloud Console
4. Verify redirect URI matches

## File Checklist Before Deployment

Ensure these files are ready:

- ✅ `vercel.json` - Configured with all routes
- ✅ `package.json` - All dependencies listed
- ✅ `api/index.js` - Main API handler
- ✅ `api/chatbot.js` - Chatbot API
- ✅ `auction_context/*.csv` - Inventory files
- ✅ `.gitignore` - Excludes `.env` and `node_modules`
- ✅ All HTML, CSS, JS files
- ✅ `images/` and `icons/` folders

## Deployment Commands Cheat Sheet

```bash
# Check what will be deployed
vercel --dry-run

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# Open deployment in browser
vercel open

# List all deployments
vercel ls

# Remove old deployment
vercel rm <deployment-url>
```

## Setting Up Custom Domain

1. Go to Vercel dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `flipsandbidz.com`)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (~5-10 minutes)

## Monitoring Production

### View Logs
```bash
# Real-time logs
vercel logs --follow

# Last 100 logs
vercel logs -n 100
```

### Performance Monitoring
- Go to Vercel dashboard → Your Project → Analytics
- Monitor response times, errors, and traffic

## Environment-Specific Configurations

### Development (.env locally)
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hibid
```

### Production (Vercel)
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...atlas.mongodb.net/hibid
```

## Rollback to Previous Deployment

If something goes wrong:

1. **Via Dashboard:**
   - Go to Deployments tab
   - Find previous working deployment
   - Click "⋯" → "Promote to Production"

2. **Via CLI:**
   ```bash
   vercel rollback
   ```

## Security Best Practices

✅ **Never commit `.env` file**
✅ **Use environment variables for all secrets**
✅ **Enable CORS only for your domains**
✅ **Use HTTPS only (Vercel does this automatically)**
✅ **Regularly rotate API keys and tokens**
✅ **Monitor for unusual API usage**

## Cost Considerations

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless function executions
- ✅ Automatic HTTPS
- ✅ Preview deployments

### Watch Out For:
- ⚠️ OpenAI API usage (separate billing)
- ⚠️ MongoDB Atlas storage (free tier: 512 MB)
- ⚠️ Bandwidth overages (if high traffic)

## Quick Deploy Script

Create `deploy.sh` in your project root:

```bash
#!/bin/bash

echo "🚀 Deploying to Vercel..."

# Test locally first
echo "📝 Running tests..."
./test-auction-context.sh

# Commit changes
echo "💾 Committing changes..."
git add .
git commit -m "Deploy: $(date +%Y-%m-%d-%H:%M:%S)"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Deploy to production
echo "🌐 Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Check your site at: https://your-domain.vercel.app"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Status:** https://www.vercel-status.com/
- **Vercel Community:** https://github.com/vercel/vercel/discussions
- **Your Project Dashboard:** https://vercel.com/dashboard

---

**Ready to Deploy?** Follow Method A or B above, and you'll be live in minutes!

**Need Help?** Check the troubleshooting section or contact Vercel support.

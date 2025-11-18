# Vercel Deployment Guide for Flips & Bidz

## Overview
This guide will help you deploy your Flips & Bidz website to Vercel with serverless functions for the backend API.

## Prerequisites
1. GitHub account
2. Vercel account (free tier is sufficient)
3. MongoDB Atlas connection string
4. EmailJS account (already configured)

## Project Structure
```
hibid/
├── api/
│   └── index.js          # Serverless function (backend API)
├── images/
│   └── flipsnbidz.webp
├── index.html            # Homepage
├── appointment.html      # Appointment booking page
├── faq.html
├── privacy.html
├── terms.html
├── *.css                 # Stylesheets
├── *.js                  # Frontend scripts
├── vercel.json           # Vercel configuration
├── .vercelignore         # Files to exclude from deployment
└── package.json
```

## Step-by-Step Deployment

### 1. Initialize Git Repository (if not already done)
```bash
cd /Users/abelyagubyan/Downloads/hibid
git init
git add .
git commit -m "Initial commit for Vercel deployment"
```

### 2. Push to GitHub
```bash
# Create a new repository on GitHub (https://github.com/new)
# Name it something like "flipsandbidz-website"
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/flipsandbidz-website.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name? **flipsandbidz** (or your preferred name)
- In which directory is your code located? **.**
- Want to override settings? **N**

#### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect the configuration from `vercel.json`
4. Click "Deploy"

### 4. Configure Environment Variables in Vercel

After initial deployment, add your environment variables:

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONGODB_URI` | `mongodb+srv://abelyagubyan:Mamagan9@cluster0.rtehltl.mongodb.net/hibid` | Your MongoDB connection string |
| `GMAIL_CLIENT_ID` | (your Gmail OAuth Client ID) | Optional - for Gmail API emails |
| `GMAIL_CLIENT_SECRET` | (your Gmail OAuth Secret) | Optional - for Gmail API emails |
| `GMAIL_REFRESH_TOKEN` | (your Gmail OAuth Refresh Token) | Optional - for Gmail API emails |
| `GMAIL_USER` | `flipsnbidz@gmail.com` | Your business email |

**Note:** Since you're using EmailJS for emails, the Gmail API variables are optional backup.

4. Click **Save** for each variable
5. Redeploy the project (Vercel → Deployments → click ⋯ → Redeploy)

### 5. Verify Deployment

Once deployed, Vercel will give you a URL like: `https://flipsandbidz.vercel.app`

Test the following:
- ✅ Homepage loads: `https://your-domain.vercel.app`
- ✅ Appointment page loads: `https://your-domain.vercel.app/appointment.html`
- ✅ API health check: `https://your-domain.vercel.app/api/health`
- ✅ Book a test appointment to verify:
  - MongoDB saves appointment
  - EmailJS sends confirmation emails
  - Time slots show as booked

### 6. Custom Domain (Optional)

To use your own domain (e.g., `flipsandbidz.com`):

1. In Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `flipsandbidz.com`
4. Follow the DNS configuration instructions
5. Add these DNS records with your domain registrar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
6. Wait for DNS propagation (up to 48 hours, usually much faster)

## How It Works

### Frontend
- All HTML, CSS, and JavaScript files are served as static files
- `appointment-script.js` automatically detects if running on localhost or production
- In production, it uses `window.location.origin + '/api'` for API calls

### Backend (Serverless Functions)
- `api/index.js` is deployed as a serverless function
- Handles all API routes: `/api/appointments`, `/api/health`, etc.
- Connects to MongoDB Atlas on each request (with connection caching)
- Sends emails via Gmail API (optional, EmailJS is primary)

### Environment Detection
Your `appointment-script.js` already handles this:
```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Development
    : `${window.location.origin}/api`;  // Production
```

## Troubleshooting

### API not responding
- Check Vercel Function Logs: Dashboard → Your Project → **Deployments** → Latest → **Function Logs**
- Verify environment variables are set correctly
- Test the health endpoint: `https://your-domain.vercel.app/api/health`

### MongoDB connection issues
- Verify `MONGODB_URI` in environment variables
- Check MongoDB Atlas Network Access (add `0.0.0.0/0` to allow all IPs for Vercel)
- Go to MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere

### Emails not sending
- Check Vercel Function Logs for email errors
- Verify EmailJS is initialized correctly (check browser console)
- Test EmailJS templates manually in EmailJS dashboard
- Gmail API is backup - EmailJS is primary email provider

### "This time slot is already booked" errors
- This means the real-time availability check is working!
- The MongoDB database is preventing double bookings
- Users should select a different time slot

## Maintenance

### Updating the Site
```bash
# Make your changes locally
git add .
git commit -m "Description of changes"
git push origin main

# Vercel will automatically redeploy
```

### Monitoring
- Vercel Dashboard shows:
  - Deployment status
  - Function logs
  - Analytics (page views, performance)
  - Error tracking

### Costs
- **Vercel Free Tier:** 100GB bandwidth/month, unlimited projects
- **MongoDB Atlas Free Tier:** 512MB storage, shared cluster
- **EmailJS Free Tier:** 200 emails/month

For your business volume, free tiers should be sufficient!

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Add environment variables
3. ✅ Test appointment booking
4. ✅ Set up custom domain (optional)
5. Monitor logs and analytics
6. Consider setting up:
   - Google Analytics for visitor tracking
   - Uptime monitoring (e.g., UptimeRobot)
   - Backup email notifications

## Support

If you run into issues:
- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- MongoDB Atlas Support: https://www.mongodb.com/cloud/atlas/support

---

**Ready to deploy?** Run `vercel` in your project directory to get started!

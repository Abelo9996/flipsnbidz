# Pre-Deployment Checklist ✅

Use this checklist before deploying to Vercel to ensure everything is ready.

## 1. Environment Variables

Configure these in Vercel Dashboard (Settings → Environment Variables):

### Required Variables:
- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `OPENAI_API_KEY` - OpenAI API key (starts with sk-proj-)
- [ ] `GMAIL_USER` - Gmail address for sending emails
- [ ] `GMAIL_CLIENT_ID` - Google OAuth2 client ID
- [ ] `GMAIL_CLIENT_SECRET` - Google OAuth2 client secret
- [ ] `GMAIL_REFRESH_TOKEN` - Google OAuth2 refresh token
- [ ] `GMAIL_REDIRECT_URI` - Usually: https://developers.google.com/oauthplayground

### Optional Variables:
- [ ] `NODE_ENV` - Set to "production" (usually auto-set by Vercel)

**Important:** Make sure each variable is enabled for:
- ✅ Production
- ✅ Preview
- ✅ Development

## 2. Files & Folders

Make sure these exist and are committed to Git:

### Configuration Files:
- [ ] `package.json` - All dependencies listed
- [ ] `vercel.json` - Properly configured
- [ ] `.gitignore` - Contains `.env` and `node_modules`

### API Files:
- [ ] `api/index.js` - Main API handler
- [ ] `api/chatbot.js` - Chatbot API routes

### Frontend Files:
- [ ] `index.html` - Home page
- [ ] `appointment.html` - Appointment page
- [ ] `chatbot.html` - Chatbot page
- [ ] `faq.html` - FAQ page
- [ ] `privacy.html` - Privacy policy
- [ ] `terms.html` - Terms of service
- [ ] `admin-dashboard.html` - Admin dashboard

### Style Files:
- [ ] `styles.css` - Main styles
- [ ] `appointment-styles.css` - Appointment styles
- [ ] `chatbot-styles.css` - Chatbot styles
- [ ] `faq-styles.css` - FAQ styles
- [ ] `terms-styles.css` - Terms styles

### Script Files:
- [ ] `script.js` - Main JavaScript
- [ ] `appointment-script.js` - Appointment logic
- [ ] `chatbot-script.js` - Chatbot logic
- [ ] `faq-script.js` - FAQ logic
- [ ] `holiday-theme.js` - Holiday theme

### Assets:
- [ ] `images/` folder - All images
- [ ] `icons/` folder - All SVG icons
- [ ] `auction_context/` folder - CSV files with inventory

### Documentation:
- [ ] `README.md`
- [ ] `CHATBOT_README.md`
- [ ] `AUCTION_CONTEXT_README.md`
- [ ] `VERCEL_DEPLOYMENT.md`

## 3. MongoDB Setup

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with read/write permissions
- [ ] Network access configured (allow 0.0.0.0/0 for Vercel)
- [ ] Connection string tested and working
- [ ] Collections will be created automatically on first use

## 4. Gmail API Setup

- [ ] Google Cloud Console project created
- [ ] Gmail API enabled
- [ ] OAuth2 credentials created
- [ ] Refresh token obtained
- [ ] Test email sent successfully

## 5. OpenAI API Setup

- [ ] OpenAI account created
- [ ] API key generated (starts with sk-proj-)
- [ ] Billing set up (if needed)
- [ ] Usage limits configured
- [ ] Test API call successful

## 6. Code Quality Checks

Run these commands before deploying:

```bash
# Check for syntax errors
node -c api/index.js
node -c api/chatbot.js

# Test auction context loading
./test-auction-context.sh

# Check git status
git status

# View what will be deployed
git diff origin/main
```

## 7. Local Testing

Before deploying, test locally:

- [ ] `npm install` runs without errors
- [ ] `npm start` starts server successfully
- [ ] Home page loads at http://localhost:3000
- [ ] Chatbot works and responds to messages
- [ ] Chatbot can answer inventory questions
- [ ] Appointment form submits successfully
- [ ] Email notifications work
- [ ] Admin dashboard loads
- [ ] FAQ page works
- [ ] All links work

## 8. Git Repository

- [ ] All changes committed
- [ ] Pushed to GitHub (`git push origin main`)
- [ ] `.env` file NOT in repository
- [ ] `node_modules/` NOT in repository
- [ ] Repository connected to Vercel

## 9. Vercel Configuration

In Vercel Dashboard:

- [ ] Project imported from GitHub
- [ ] Environment variables configured
- [ ] Build settings correct (usually auto-detected)
- [ ] Root directory is `/` (not a subdirectory)
- [ ] Node.js version: 16.x or higher

## 10. Post-Deployment Testing

After deploying, verify:

- [ ] Main site loads: https://your-domain.vercel.app
- [ ] Chatbot widget appears on pages
- [ ] Chatbot responds to messages
- [ ] Chatbot knows auction inventory
- [ ] Appointment form works
- [ ] Email notifications sent
- [ ] All pages load correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] SSL certificate active (https)

## Quick Deploy Commands

```bash
# Option 1: Use deploy script
./deploy.sh

# Option 2: Manual commands
git add .
git commit -m "Deploy to production"
git push origin main
vercel --prod

# Option 3: Via Vercel dashboard
# Just push to GitHub, Vercel will auto-deploy
```

## Common Issues

### Issue: "Module not found"
**Fix:** Run `npm install` and commit `package-lock.json`

### Issue: "Cannot connect to MongoDB"
**Fix:** Check MongoDB Atlas network access allows 0.0.0.0/0

### Issue: "Environment variable undefined"
**Fix:** Add variables in Vercel dashboard, enable for Production

### Issue: "Chatbot not loading auction data"
**Fix:** Ensure `auction_context/*.csv` files are committed to Git

### Issue: "Email not sending"
**Fix:** Verify Gmail OAuth2 credentials and refresh token

## Deployment Methods

Choose one:

### Method A: Automatic (Recommended)
```bash
./deploy.sh
```

### Method B: Vercel CLI
```bash
vercel --prod
```

### Method C: GitHub Integration
- Push to GitHub
- Vercel auto-deploys (if connected)

## Rollback Plan

If deployment fails:

1. Check Vercel logs: `vercel logs`
2. Check error messages in dashboard
3. Rollback to previous deployment:
   ```bash
   vercel rollback
   ```
4. Or via dashboard: Deployments → Previous → Promote to Production

## Support

Need help?
- 📖 Read: `VERCEL_DEPLOYMENT.md`
- 🔗 Vercel Docs: https://vercel.com/docs
- 💬 Vercel Support: https://vercel.com/support

---

**Ready to Deploy?** ✅

If all items above are checked, run:
```bash
./deploy.sh
```

Or follow the detailed guide in `VERCEL_DEPLOYMENT.md`

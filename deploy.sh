#!/bin/bash

# Flips & Bidz Deployment Script
echo "🚀 Deploying Flips & Bidz to Vercel..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Test auction context
echo "📦 Checking auction context files..."
if [ -d "auction_context" ]; then
    csv_count=$(find auction_context -maxdepth 1 -name "*.csv" | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Found $csv_count auction file(s)${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: auction_context folder not found${NC}"
fi
echo ""

# Check for .env file (should NOT be committed)
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file exists locally${NC}"
    echo "   Make sure it's in .gitignore and NOT committed!"
    echo ""
fi

# Ask for confirmation
echo "📝 This will:"
echo "   1. Commit all changes"
echo "   2. Push to GitHub"
echo "   3. Deploy to Vercel production"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Check git status
echo "📊 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}📝 Uncommitted changes detected${NC}"
    echo ""
    
    # Show what will be committed
    echo "Files to be committed:"
    git status --short
    echo ""
    
    # Get commit message
    read -p "Enter commit message: " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Deploy: $(date +%Y-%m-%d\ %H:%M:%S)"
    fi
    
    # Commit changes
    echo "💾 Committing changes..."
    git add .
    git commit -m "$commit_msg"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Git commit failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
fi
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git push failed${NC}"
    echo "Please check your connection and try again"
    exit 1
fi
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g vercel"
    echo ""
    echo "Or deploy via Vercel dashboard:"
    echo "  https://vercel.com/dashboard"
    exit 0
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel production..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🔗 Your site should be live at your Vercel URL"
    echo "📊 View deployment: vercel ls"
    echo "📝 View logs: vercel logs"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above"
    exit 1
fi

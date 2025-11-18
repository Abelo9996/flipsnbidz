#!/bin/bash

# Flips & Bidz MongoDB Setup Script
# This script helps set up and start the appointment system

echo "🎯 Flips & Bidz Appointment System Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📥 Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your actual credentials!"
    echo "   1. Add your MongoDB URI (Atlas or local)"
    echo "   2. Add your Gmail App Password"
    echo ""
    echo "📖 See MONGODB_SETUP.md for detailed instructions"
    echo ""
    read -p "Press Enter after you've configured .env, or Ctrl+C to exit..."
fi

# Check MongoDB connection
echo ""
echo "🔌 Starting backend server..."
echo ""
echo "The server will start on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

# Start the server with nodemon for development
npm run dev

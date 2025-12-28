#!/bin/bash

# AI Chatbot Setup Script
echo "🤖 Setting up Flips & Bidz AI Chatbot..."
echo ""

# Check if OpenAI API key is set
if grep -q "your_openai_api_key_here" .env; then
    echo "⚠️  IMPORTANT: You need to add your OpenAI API key!"
    echo ""
    echo "Steps:"
    echo "1. Go to https://platform.openai.com/api-keys"
    echo "2. Create a new API key"
    echo "3. Open .env file and replace 'your_openai_api_key_here' with your actual key"
    echo ""
    echo "Example:"
    echo "OPENAI_API_KEY=sk-proj-abc123xyz..."
    echo ""
    exit 1
fi

echo "✅ OpenAI API key is configured"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules/openai" ]; then
    echo "📦 Installing chatbot dependencies..."
    npm install openai axios cheerio
    echo ""
fi

echo "✅ All dependencies installed"
echo ""

# Test server
echo "🚀 Starting server to test chatbot..."
echo ""
echo "Once server is running:"
echo "1. Open http://localhost:3000"
echo "2. Look for the purple chat button in bottom-right corner"
echo "3. Click it and start chatting!"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start

#!/bin/bash

# Test Auction Context Loading
echo "🧪 Testing Auction Context System..."
echo ""

# Check if auction_context folder exists
if [ ! -d "auction_context" ]; then
    echo "❌ Error: auction_context folder not found"
    echo "Creating auction_context folder..."
    mkdir -p auction_context
    echo "✅ Created auction_context folder"
else
    echo "✅ auction_context folder exists"
fi

# Count CSV files
csv_count=$(find auction_context -maxdepth 1 -name "*.csv" | wc -l | tr -d ' ')
echo "📊 Found $csv_count CSV file(s) in auction_context/"
echo ""

# List CSV files
if [ $csv_count -gt 0 ]; then
    echo "📦 Auction inventory files:"
    find auction_context -maxdepth 1 -name "*.csv" -exec basename {} \; | while read file; do
        echo "   - $file"
        # Count lines (items) in each file
        lines=$(wc -l < "auction_context/$file" | tr -d ' ')
        items=$((lines - 1))  # Subtract header
        echo "     → $items items"
        
        # Check if Title column exists
        if head -n 1 "auction_context/$file" | grep -qi "title"; then
            echo "     ✅ Title column found"
        else
            echo "     ⚠️  Warning: No 'Title' column found"
        fi
    done
    echo ""
    echo "✅ Auction context files are ready!"
    echo "ℹ️  Note: Only the 'Title' and 'Lot' columns will be used for chatbot context"
else
    echo "⚠️  No CSV files found in auction_context/"
    echo ""
    echo "To add auction data:"
    echo "1. Export your auction results as a CSV file"
    echo "2. Place it in the auction_context/ folder"
    echo "3. Restart the server"
    echo ""
    echo "Example:"
    echo "  cp 'My Auction.csv' auction_context/"
fi

echo ""
echo "📚 For more information, see: AUCTION_CONTEXT_README.md"

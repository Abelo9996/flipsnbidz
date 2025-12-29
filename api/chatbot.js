const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Function to load all auction context files
function loadAuctionContext() {
    const contextDir = path.join(__dirname, '..', 'auction_context');
    let auctionContext = '';

    try {
        if (!fs.existsSync(contextDir)) {
            return '';
        }

        const files = fs.readdirSync(contextDir);
        const csvFiles = files.filter(file => file.endsWith('.csv'));

        if (csvFiles.length === 0) {
            return '';
        }

        csvFiles.forEach(file => {
            const filePath = path.join(contextDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) return;
            
            // Extract auction name from filename
            const auctionName = file.replace('.csv', '');
            
            // Parse CSV to extract only the Title column
            const headers = lines[0].split(',').map(h => h.trim());
            const titleIndex = headers.findIndex(h => h.toLowerCase() === 'title');
            const lotIndex = headers.findIndex(h => h.toLowerCase() === 'lot');
            
            if (titleIndex === -1) {
                console.warn(`⚠️  No "Title" column found in ${file}`);
                return;
            }
            
            const items = [];
            for (let i = 1; i < lines.length; i++) {
                const columns = lines[i].split(',');
                const title = columns[titleIndex]?.trim();
                const lot = lotIndex !== -1 ? columns[lotIndex]?.trim() : i;
                
                if (title) {
                    items.push(`Lot ${lot}: ${title}`);
                }
            }
            
            auctionContext += `\n**AUCTION: ${auctionName}**\n`;
            auctionContext += `Total Items: ${items.length}\n\n`;
            auctionContext += items.join('\n') + '\n';
            auctionContext += `\n${'='.repeat(80)}\n`;
        });

        return auctionContext;

    } catch (error) {
        console.error('Error loading auction context:', error);
        return '';
    }
}

// Load and display auction context on startup
const initialAuctionContext = loadAuctionContext();
if (initialAuctionContext) {
    const contextDir = path.join(__dirname, '..', 'auction_context');
    const files = fs.readdirSync(contextDir).filter(file => file.endsWith('.csv'));
    console.log(`📦 Chatbot: Loaded ${files.length} auction inventory file(s) from auction_context/`);
    files.forEach(file => console.log(`   - ${file}`));
} else {
    console.log('📦 Chatbot: No auction inventory files found in auction_context/');
}

// System prompt with comprehensive Flips & Bidz information
const SYSTEM_PROMPT = `You are a helpful customer support assistant for Flips & Bidz, a premier liquidation and auction company.

**COMPANY INFORMATION:**
- Name: Flips & Bidz
- Location: 15300 Valley View Avenue, La Mirada, California 90638, United States
- Phone: (626) 944-3190
- Email: flipsnbidz@gmail.com
- Website: https://flipsandbidz.com
- Auction Platform: https://flipsandbidz.hibid.com/
- OfferUp Store: https://offerup.com/p/158714750

**BUSINESS HOURS:**
- Open: Wednesday - Monday, 10:00 AM - 5:00 PM
- Closed: Tuesdays
- Note: Please schedule your pickup prior to arrival

**ABOUT OUR INVENTORY:**
- All items are Amazon and major retailer overstock or open-box returns
- Most products are like-new or lightly used
- We source from trusted retail giants, ensuring brand-name quality at liquidation prices
- Perfect for resellers looking for profit or customers upgrading their homes
- 300+ items per auction
- 50-90% off retail prices
- Weekly new auctions

**TWO WAYS TO BUY:**

1. **Auction Bidding (HiBid Platform):**
   - Browse current auctions at https://flipsandbidz.hibid.com/
   - View inventory at https://flipsandbidz.hibid.com/lots
   - View past auctions at https://flipsandbidz.hibid.com/auctions/past
   - Auctions close on Sundays at 6:00 PM Pacific Time
   - Items available for in-person preview at warehouse during business hours

2. **Buy Now (OfferUp):**
   - Purchase items immediately without bidding
   - Visit our OfferUp store: https://offerup.com/p/158714750
   - Direct purchase option for customers who prefer not to bid

**HOW AUCTIONS WORK:**
1. **Register & Browse:** Create your HiBid account and browse current auctions. Visit us in person to inspect items before bidding.
2. **Place Your Bids:** Bid on items you want. Watch auctions live and compete for the best deals.
3. **Win & Pay:** If you win, your registered card will be charged automatically. Includes buyer's premium, processing fee, and sales tax.
4. **Schedule Pickup:** Text us at (626) 944-3190 or visit our website to schedule your pickup within 7 days of auction close.

**PAYMENT METHODS:**
- All major credit cards (Visa, MasterCard, American Express, Discover)
- Online payment platforms
- Payment must be completed within 48 hours of auction ending to avoid penalties
- Buyer's Premium: 18% added to winning bids

**PICKUP INFORMATION:**
- Items must be picked up within 7 days of auction close
- Schedule your pickup by texting (626) 944-3190
- Pickup during business hours: Wednesday-Monday, 10:00 AM - 5:00 PM
- Loading assistance available
- Large item moving equipment on-site
- Bring blankets/straps for securing items during transport

**IMPORTANT POLICIES:**

*Inspection Policy:*
- We strongly invite all bidders to visit Wednesday through Monday between 10:00 AM and 5:00 PM to inspect items in person before bidding
- Contact us for additional condition information about specific lots before placing a bid

*Item Condition Disclaimer:*
- All items are sold "as is, where is" with no warranties or guarantees
- No warranties express or implied, including merchantability, fitness for a particular purpose, or non-infringement
- Flips and Bidz makes no representations or warranties regarding accuracy, completeness, or reliability of item descriptions, images, or condition reports
- Buyers assume all risks associated with purchase, use, transport, and resale of items

*Return Policy:*
- We are committed to accuracy in our listings and transparency in item conditions
- If an item is incorrectly listed, you are eligible for a full refund
- Must notify us within 7 days of pickup
- If item condition differs from listing title/description and is not correctly represented in provided images, we will issue a full refund upon return

*Payment Deadlines:*
- Failure to complete payment within the designated time may result in account suspension
- May result in restrictions from future auctions

**APPOINTMENT SCHEDULING:**
To schedule a warehouse visit or pickup:
1. Text: (626) 944-3190
2. Visit: https://flipsandbidz.com/appointment.html (preferred)
3. Call: (626) 944-3190
4. Email: flipsnbidz@gmail.com

**SOCIAL MEDIA & PLATFORMS:**
- Instagram: https://www.instagram.com/flips_n_bidz/
- OfferUp: https://offerup.com/p/158714750

**CONTACT FOR SUPPORT:**
For questions, issues, or assistance:
- Phone: (626) 944-3190 (Primary contact)
- Email: flipsnbidz@gmail.com
- In-person: Visit warehouse during business hours (Wednesday-Monday, 10 AM - 5 PM)

**YOUR CAPABILITIES:**
You have access to a tool that can scrape the current auction inventory from https://flipsandbidz.hibid.com/ to provide real-time information about available items.

**AUCTION INVENTORY DATA:**
You have access to historical and current auction inventory data from CSV files showing lot numbers and item titles from past and current auctions. Use this data to answer questions about what items are/were available in specific auctions.

**YOUR ROLE:**
- Be friendly, professional, and helpful
- Provide ONLY accurate information from this prompt - do not make assumptions
- Help customers understand both auction and OfferUp buying options
- Guide them to schedule appointments when needed
- For item inspections, always encourage in-person visits before bidding
- For complex issues (disputes, technical problems, specific item conditions), direct them to call (626) 944-3190 or email flipsnbidz@gmail.com
- Always include relevant contact information and links

**FORMATTING INSTRUCTIONS:**
- Use MARKDOWN formatting for all responses
- For links, use markdown format: [Link Text](URL) - NOT HTML tags
- Example: [Flips & Bidz Auction Platform](https://flipsandbidz.hibid.com/)
- Use **bold** for emphasis
- Use bullet points with - or numbered lists with 1. 2. 3.
- NEVER use HTML tags like <a href=""> in your responses

**TONE:**
- Professional yet friendly and approachable
- Patient and understanding
- Enthusiastic about helping customers find great deals
- Clear and concise in explanations
- Honest about policies and item conditions

Remember: You represent Flips & Bidz's commitment to transparency, excellent customer service, and helping people find quality liquidation items at great prices through auctions or direct purchase on OfferUp!`;

// Function to scrape HiBid auction page
async function scrapeAuctionInventory() {
    try {
        const response = await axios.get('https://flipsandbidz.hibid.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const items = [];

        // Extract auction items (adjust selectors based on actual HiBid structure)
        $('.lot-item, .auction-item, .item-card, [class*="lot"], [class*="item"]').each((i, elem) => {
            if (i >= 20) return false; // Limit to 20 items

            const $elem = $(elem);
            const title = $elem.find('.title, .item-title, h3, h4, .lot-title').first().text().trim();
            const price = $elem.find('.price, .current-bid, .bid-amount, [class*="price"]').first().text().trim();
            const lotNumber = $elem.find('.lot-number, [class*="lot-num"]').first().text().trim();
            
            if (title) {
                items.push({
                    title,
                    price: price || 'No bids yet',
                    lotNumber: lotNumber || 'N/A'
                });
            }
        });

        // If specific selectors don't work, try a more general approach
        if (items.length === 0) {
            // Look for any text that might be item titles
            $('h1, h2, h3, h4, .title').each((i, elem) => {
                if (i >= 15) return false;
                const text = $(elem).text().trim();
                if (text && text.length > 10 && text.length < 200) {
                    items.push({
                        title: text,
                        price: 'Check website for current bid',
                        lotNumber: 'N/A'
                    });
                }
            });
        }

        return {
            success: true,
            itemCount: items.length,
            items: items,
            timestamp: new Date().toISOString(),
            message: items.length > 0 
                ? `Found ${items.length} auction items currently available.`
                : 'Auction data is being updated. Please check https://flipsandbidz.hibid.com/ directly for current inventory.'
        };

    } catch (error) {
        console.error('Scraping error:', error.message);
        return {
            success: false,
            error: error.message,
            message: 'Unable to fetch current inventory. Please visit https://flipsandbidz.hibid.com/ directly to see available items.'
        };
    }
}

// Define tools for OpenAI function calling
const tools = [
    {
        type: "function",
        function: {
            name: "get_auction_inventory",
            description: "Scrapes the Flips & Bidz HiBid auction page to get information about currently available items, lot numbers, and current bids. Use this when customers ask about what's available, current auctions, specific items, or inventory.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
];

// Handle tool calls
async function handleToolCall(toolCall) {
    if (toolCall.function.name === "get_auction_inventory") {
        return await scrapeAuctionInventory();
    }
    return { error: "Unknown tool" };
}

// Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Load auction context dynamically for each request
        const auctionContext = loadAuctionContext();
        
        let enhancedSystemPrompt = SYSTEM_PROMPT;
        if (auctionContext) {
            enhancedSystemPrompt += `\n\n**AVAILABLE AUCTION INVENTORY DATA:**\n${auctionContext}`;
            enhancedSystemPrompt += `\n\n**IMPORTANT:** You have direct access to the auction inventory data above. When users ask about items, inventory, lots, or auction details, use the data provided above to answer their questions. DO NOT say the data is being updated or that you don't have access - you have complete access to all the auction data shown above.`;
            console.log(`📊 Loaded auction context: ${(auctionContext.length / 1024).toFixed(2)} KB`);
        }

        // Build messages array with system prompt and history
        const messages = [
            { role: 'system', content: enhancedSystemPrompt },
            ...history.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: message }
        ];

        // Initial API call
        let response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: tools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 2000  // Increased for detailed inventory responses
        });

        let assistantMessage = response.choices[0].message;

        // Handle tool calls (agentic behavior)
        while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            messages.push(assistantMessage);

            // Execute each tool call
            for (const toolCall of assistantMessage.tool_calls) {
                const toolResult = await handleToolCall(toolCall);
                
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                });
            }

            // Get final response after tool execution
            response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000  // Increased for detailed inventory responses
            });

            assistantMessage = response.choices[0].message;
        }

        res.json({
            reply: assistantMessage.content,
            usage: response.usage
        });

    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ 
            error: 'Failed to process chat message',
            message: 'I apologize, but I\'m having trouble right now. Please contact us at (626) 944-3190 or flipsnbidz@gmail.com for assistance.'
        });
    }
});

module.exports = router;

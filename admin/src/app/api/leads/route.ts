import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";

// Scrape local businesses from Google Maps / Places API
// Alternatively, use OpenAI to generate lead lists based on business type + location

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { businessType, location, radius } = await req.json();

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Strategy 1: Google Places API (if key available)
    if (apiKey && apiKey !== "placeholder") {
      const query = `${businessType || "contractors"} near ${location || "La Mirada, CA"}`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&radius=${radius || 25000}&key=${apiKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.results?.length) {
        const leads = data.results.map((place: Record<string, unknown>) => ({
          firstName: "",
          lastName: "",
          email: "", // Google Places doesn't return emails
          phone: (place as { formatted_phone_number?: string }).formatted_phone_number || "",
          tags: [businessType || "local-business"],
          source: "google-places",
          businessName: (place as { name?: string }).name || "",
          address: (place as { formatted_address?: string }).formatted_address || "",
          rating: (place as { rating?: number }).rating || 0,
        }));

        return NextResponse.json({
          success: true,
          source: "google-places",
          leads,
          total: leads.length,
          note: "Google Places doesn't provide emails. Use these as outreach targets for in-person or phone campaigns.",
        });
      }
    }

    // Strategy 2: AI-generated lead suggestions (always available with OpenAI key)
    if (openaiKey && openaiKey !== "placeholder") {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: openaiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          {
            role: "system",
            content: `You are a B2B lead generation expert. Generate a list of real types of businesses that would buy liquidation items from an auction house in La Mirada, CA.

Return JSON: {
  "leads": [
    {
      "businessType": "type",
      "description": "why they'd buy",
      "searchQuery": "what to Google to find them",
      "estimatedCount": number,
      "outreachStrategy": "how to reach them"
    }
  ],
  "searchSuggestions": ["Google search queries to find actual businesses"],
  "redditSubreddits": ["relevant subreddits to find buyers"],
  "facebookGroups": ["relevant FB groups"]
}`,
          },
          {
            role: "user",
            content: `Find potential buyers for liquidation auction items. Business type: ${businessType || "any"}. Location: ${location || "La Mirada, CA and surrounding areas (Whittier, Norwalk, Cerritos, Downey, Fullerton)"}. Radius: ${radius || 25} miles.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(completion.choices[0].message.content || "{}");
      return NextResponse.json({
        success: true,
        source: "ai-suggestions",
        ...content,
        note: "These are AI-generated lead categories and search strategies. Use them to find actual businesses via Google, Yelp, or in-person outreach.",
      });
    }

    return NextResponse.json(
      { error: "No API keys configured. Set GOOGLE_PLACES_API_KEY or OPENAI_API_KEY." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { templateType, items, subscriberCount } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const itemList = items?.map((i: { title: string; currentBid: number }) => `- ${i.title} ($${i.currentBid})`).join("\n") || "Various liquidation items";

    const templates: Record<string, string> = {
      "new-auction": `Write an email for "Flips & Bidz" in La Mirada, CA announcing a new auction with these items:\n${itemList}\n\nTone: Exciting, deal-focused. Include link to flipsandbidz.hibid.com. Target: ${subscriberCount || "all"} subscribers.`,
      "win-back": `Write a win-back email for "Flips & Bidz" auction house in La Mirada, CA. Target lapsed bidders who haven't participated recently. Mention current great deals:\n${itemList}\n\nTone: Friendly, FOMO-inducing.`,
      "contractor": `Write an email for "Flips & Bidz" targeting contractors and handymen. Highlight tools and equipment from current auction:\n${itemList}\n\nMention La Mirada, CA location. Tone: Professional, practical.`,
      "reseller": `Write an email for "Flips & Bidz" targeting resellers and small business owners. Highlight bulk deals and high-margin items:\n${itemList}\n\nMention La Mirada, CA. Tone: Business-savvy, ROI-focused.`,
    };

    const prompt = templates[templateType] || templates["new-auction"];

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: "You are an email marketing expert. Return JSON with: { subject, htmlContent, textContent }. The htmlContent should be a complete HTML email with inline styles, Flips & Bidz branding (blue #2563eb), and responsive design.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json({ success: true, ...content });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

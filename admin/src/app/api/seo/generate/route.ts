import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { keyword, tone } = await req.json();
    if (!keyword) {
      return NextResponse.json({ error: "Keyword required" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `You are an SEO content writer for Flips & Bidz, a liquidation auction company in La Mirada, CA. Write SEO-optimized blog articles.

Return JSON: {
  "title": "SEO-optimized title",
  "slug": "url-friendly-slug",
  "metaDescription": "155 char meta description",
  "content": "Full article in HTML (h2, h3, p, ul, li tags). 1500-2000 words. Include internal links to flipsandbidz.hibid.com. Mention La Mirada, Southern California.",
  "suggestedKeywords": ["related", "keywords"],
  "wordCount": 1800,
  "keywordDensity": 2.1
}`,
        },
        {
          role: "user",
          content: `Write an article targeting the keyword: "${keyword}". Tone: ${tone || "informative and engaging"}.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json({ success: true, ...content });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

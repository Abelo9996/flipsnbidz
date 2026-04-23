import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a community manager for Flips & Bidz, a liquidation auction business located at 15300 Valley View Ave, La Mirada, CA 90638.

About the business:
- Weekly online auctions hosted on HiBid (flipsandbidz.hibid.com)
- Auctions close Monday evenings
- Sells wholesale liquidation pallets — electronics, tools, household goods, clothing, and more
- Great deals for resellers, flippers, and bargain hunters
- Customers can bid online or pick up locally in La Mirada, CA

Your job is to write genuine, helpful Reddit replies that represent the business positively without being spammy or over-promotional. Always sound like a real human, not a bot.`;

const RISKY_SYSTEM_PROMPT = `You are a knowledgeable community member who enjoys helping people find good deals and understands the resale/liquidation space.

You are NOT here to promote any business. You are here to be genuinely helpful. Do not mention Flips & Bidz, do not mention flipsandbidz.hibid.com, do not mention La Mirada. Just be a helpful community member who knows about deals, reselling, and local resources. Sound natural, not like a bot or marketer.`;

export async function POST(req: NextRequest) {
  try {
    const { postTitle, postContent, subreddit, replyType: rawReplyType, subredditTier } = await req.json();

    if (!postTitle || !rawReplyType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Risky subreddits: always override to "helpful" and never mention the business
    const isRisky = subredditTier === "risky";
    const replyType = isRisky ? "helpful" : rawReplyType;
    const systemPrompt = isRisky ? RISKY_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let userPrompt: string;

    if (replyType === "helpful") {
      userPrompt = isRisky
        ? `Write a helpful Reddit reply to this post in r/${subreddit}.

Post title: "${postTitle}"
Post content: "${postContent || "(no body)"}"

Guidelines:
- Provide genuine, useful advice or information as a community member
- Do NOT mention any specific business, website, or location
- Sound like a knowledgeable person who enjoys helping, not a promoter
- Keep it concise (2-4 sentences)
- Do NOT start with "Hey!" or "Great post!"`
        : `Write a helpful Reddit reply to this post in r/${subreddit}.

Post title: "${postTitle}"
Post content: "${postContent || "(no body)"}"

Guidelines:
- Provide genuine, useful advice or information
- If it's naturally relevant, you can mention that Flips & Bidz in La Mirada has liquidation auctions at flipsandbidz.hibid.com — but only if it truly fits
- Sound like a knowledgeable community member, not a salesperson
- Keep it concise (2-4 sentences)
- Do NOT start with "Hey!" or "Great post!"`;
    } else if (replyType === "promotional") {
      userPrompt = `Write a subtle promotional Reddit reply to this post in r/${subreddit}.

Post title: "${postTitle}"
Post content: "${postContent || "(no body)"}"

Guidelines:
- Mention Flips & Bidz (La Mirada, CA) and flipsandbidz.hibid.com naturally
- Highlight that auctions close Monday evenings — good for resellers / deal hunters
- Don't be spammy — frame it as sharing a useful resource
- Sound like a community member sharing a tip, not an ad
- Keep it to 3-5 sentences`;
    } else {
      // question
      userPrompt = `Write an engaging follow-up question as a Reddit reply to this post in r/${subreddit}.

Post title: "${postTitle}"
Post content: "${postContent || "(no body)"}"

Guidelines:
- Ask a genuine question that continues the conversation
- The question should naturally lead toward topics where you could later mention liquidation auctions or reselling
- Sound curious and friendly, not sales-y
- Keep it to 1-2 sentences`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 300,
    });

    const reply = completion.choices[0].message.content?.trim() || "";
    return NextResponse.json({ reply, tone: replyType, tierOverridden: isRisky && rawReplyType !== "helpful" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

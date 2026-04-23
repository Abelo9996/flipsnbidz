import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { items, style } = await req.json();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const itemNames = items?.map((i: { title: string }) => i.title).join(", ") || "liquidation items";
    const prompt = `Create a professional product showcase image for a liquidation auction. Style: ${style || "modern, clean, high-contrast"}. Items: ${itemNames}. Include text "Flips & Bidz" and "La Mirada, CA". Make it suitable for Instagram.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    return NextResponse.json({
      success: true,
      imageUrl: response.data?.[0]?.url ?? null,
      revisedPrompt: response.data?.[0]?.revised_prompt ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

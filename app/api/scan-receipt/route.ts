import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ExtractedItem {
  name: string;
  qty: number;
  price: number;
}

export interface ScanResult {
  items: ExtractedItem[];
  total: number;
  merchant: string | null;
  date: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (image.type || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Extract all line items from this receipt and return ONLY a JSON object with this exact structure, no other text:
{
  "merchant": "store name or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    { "name": "item name", "qty": 1, "price": 0.00 }
  ],
  "total": 0.00
}

Rules:
- price is the total for that line (qty × unit price)
- Include tax as a separate item if shown
- Round all prices to 2 decimal places
- If you cannot read the receipt clearly, return your best guess`,
            },
          ],
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    const result: ScanResult = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Receipt scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan receipt" },
      { status: 500 }
    );
  }
}

// Next.js App Router handles body parsing automatically for FormData

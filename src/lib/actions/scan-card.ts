"use server";

import Anthropic from "@anthropic-ai/sdk";

export interface ScannedCard {
  name: string;
  title: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface ScanCardResult {
  error?: string;
  data?: ScannedCard;
}

const client = new Anthropic();

export async function scanBusinessCard(formData: FormData): Promise<ScanCardResult> {
  const mediaType = String(formData.get("mediaType") ?? "image/jpeg");
  const base64Data = String(formData.get("photoBase64") ?? "");
  if (!base64Data) {
    return { error: "No photo captured." };
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64Data },
            },
            {
              type: "text",
              text: "Extract the contact's name, job title, phone number, email address, company name, and the office street address, city, state, and zip code from this business card photo. Use an empty string for any field that isn't visible on the card.",
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              company: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip: { type: "string" },
            },
            required: ["name", "title", "phone", "email", "company", "address", "city", "state", "zip"],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Couldn't read the card. Try again with better lighting." };
    }

    const parsed = JSON.parse(textBlock.text) as ScanCardResult["data"];
    return { data: parsed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Scan failed." };
  }
}

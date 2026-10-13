import OpenAI from "openai";
import { z } from "zod";
import { missingPieceSchema, type ClothingItem, type MissingPiece } from "@shared/schema";
import { HttpError } from "./http";
import {
  CLOTHING_TAGGER,
  OUTFIT_TAGGER,
  missingPiecesPrompt,
  outfitPrompt,
} from "./prompts";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let client: OpenAI | null = null;

function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new HttpError(503, "AI features aren't configured on this server");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

async function askForJson<T>(
  schema: z.ZodType<T>,
  request: { system?: string; text: string; image?: { data: Buffer; contentType: string }; maxTokens: number },
): Promise<T> {
  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: request.text }];
  if (request.image) {
    const dataUrl = `data:${request.image.contentType};base64,${request.image.data.toString("base64")}`;
    userContent.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (request.system) messages.push({ role: "system", content: request.system });
  messages.push({ role: "user", content: userContent });

  let content: string | null;
  try {
    const response = await openai().chat.completions.create({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      max_tokens: request.maxTokens,
    });
    content = response.choices[0]?.message.content ?? null;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof OpenAI.APIError && err.status === 429) {
      throw new HttpError(503, "The AI service is busy right now. Try again in a minute.");
    }
    throw err;
  }

  let json: unknown;
  try {
    json = JSON.parse(content ?? "");
  } catch {
    throw new HttpError(502, "The AI returned a response we couldn't read. Try again.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(502, "The AI returned a response in the wrong format. Try again.");
  }
  return parsed.data;
}

const tagsSchema = z.object({ tags: z.array(z.string()) });

function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (t) seen.add(t);
  }
  return [...seen].slice(0, 15);
}

type Image = { data: Buffer; contentType: string };

export async function tagClothingItem(image: Image): Promise<string[]> {
  const result = await askForJson(tagsSchema, {
    system: CLOTHING_TAGGER,
    text: "Tag this clothing item.",
    image,
    maxTokens: 300,
  });
  return cleanTags(result.tags);
}

export async function tagInspirationImage(image: Image): Promise<string[]> {
  const result = await askForJson(tagsSchema, {
    system: OUTFIT_TAGGER,
    text: "Tag this outfit.",
    image,
    maxTokens: 300,
  });
  return cleanTags(result.tags);
}

export async function findMissingPieces(image: Image, closetTags: string[]): Promise<MissingPiece[]> {
  const result = await askForJson(z.object({ missingPieces: z.array(missingPieceSchema) }), {
    text: missingPiecesPrompt(closetTags),
    image,
    maxTokens: 1500,
  });
  return result.missingPieces;
}

const suggestedOutfitSchema = z.object({
  name: z.string(),
  description: z.string(),
  items: z.array(z.coerce.number()),
  style: z.string().optional(),
  occasion: z.string().optional(),
});

export type SuggestedOutfit = z.infer<typeof suggestedOutfitSchema>;

export async function suggestOutfits(
  items: ClothingItem[],
  options: { season?: string; themeDescription?: string },
): Promise<SuggestedOutfit[]> {
  const result = await askForJson(z.object({ outfits: z.array(suggestedOutfitSchema) }), {
    system: "You are a stylist who builds outfits from the clothes someone already owns.",
    text: outfitPrompt(items, options),
    maxTokens: 1200,
  });
  return result.outfits;
}

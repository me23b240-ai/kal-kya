import "server-only";
import { GoogleGenAI } from "@google/genai";

export type AICandidate = {
  id: string; name: string; mealStyle: string; ingredients: string[];
  totalMinutes?: number | null; proteinG?: number | null;
};
export type AIDayPick = { optionA: string; optionB: string; reasonA: string; reasonB: string };

const TIMEOUT_MS = 8000;

export async function askGeminiForDay(
  candidates: AICandidate[], otherDaysDishIds: string[], goal?: "none" | "quick" | "protein" | null,
): Promise<AIDayPick | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || candidates.length < 2) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const goalLine =
    goal === "quick" ? "This household especially wants quicker meals right now - among the goals below, lean toward lower totalMinutes when known." :
    goal === "protein" ? "This household especially wants higher-protein meals right now - among the goals below, lean toward higher proteinG when known (it's null for many dishes; do not penalise those)." :
    "";

  const prompt = [
    "You are choosing two dish options for one day's dinner vote in a household meal-planning app.",
    "Pick exactly two DIFFERENT ids from this candidate list. Never invent an id.",
    JSON.stringify(candidates),
    "Dish ids already used on OTHER days in this planning window (avoid repeating their main ingredient where possible):",
    JSON.stringify(otherDaysDishIds),
    "Goals in order: (1) the two options should differ clearly from each other, (2) avoid repeating a main ingredient used on other days in the window, (3) prefer overlapping vegetables/perishables with other days when it does not break (1) or (2).",
    goalLine,
    "Never mention health, nutrition or calories anywhere in your reasons.",
    'Reply with ONLY compact JSON, no markdown, exactly this shape: {"optionA":"<id>","optionB":"<id>","reasonA":"<one short plain sentence>","reasonB":"<one short plain sentence>"}',
  ].filter(Boolean).join("\n\n");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    clearTimeout(timer);

    const text = res.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (typeof parsed?.optionA !== "string" || typeof parsed?.optionB !== "string") return null;
    if (parsed.optionA === parsed.optionB) return null;
    const ids = new Set(candidates.map((c) => c.id));
    if (!ids.has(parsed.optionA) || !ids.has(parsed.optionB)) return null;
    return {
      optionA: parsed.optionA,
      optionB: parsed.optionB,
      reasonA: typeof parsed.reasonA === "string" ? parsed.reasonA.slice(0, 140) : "",
      reasonB: typeof parsed.reasonB === "string" ? parsed.reasonB.slice(0, 140) : "",
    };
  } catch {
    return null;
  }
}

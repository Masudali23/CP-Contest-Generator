import { GoogleGenAI } from "@google/genai";
import env from "../config/env.js";

/*
 * The original service hard-coded "gemini-3.1-flash-lite" (a model id that does
 * not exist), constructed the client at import time - before .env was
 * guaranteed to be loaded - and returned free-form text that the caller then
 * tried to JSON.parse, which failed whenever the model wrapped its answer in a
 * ```json fence.
 */

let client = null;

const getClient = () => {
    if (!env.GEMINI_API_KEY) return null;
    if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return client;
};

export const isAiConfigured = () => Boolean(env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Strips ```json fences and any prose surrounding the JSON body. */
const extractJson = (text) => {
    if (!text) throw new Error("Empty response from the model.");

    let candidate = text.trim();

    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) candidate = fenced[1].trim();

    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidate = candidate.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(candidate);
};

/**
 * Asks the model for a JSON object and returns it parsed.
 * Throws if the key is missing or every attempt fails - callers fall back to
 * the offline report builder.
 */
export const generateJson = async (prompt, { retries = 2 } = {}) => {
    const ai = getClient();

    if (!ai) {
        const error = new Error("GEMINI_API_KEY is not configured.");
        error.code = "AI_NOT_CONFIGURED";
        throw error;
    }

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: env.GEMINI_MODEL,
                contents: prompt,
                config: {
                    // Ask the API itself for JSON so fence-stripping is only a safety net.
                    responseMimeType: "application/json",
                    temperature: 0.4,
                    maxOutputTokens: 8192,
                },
            });

            return extractJson(response.text);
        } catch (error) {
            lastError = error;
            console.error(`Gemini attempt ${attempt + 1} failed: ${error.message}`);
            if (attempt < retries) await sleep(800 * (attempt + 1));
        }
    }

    const failure = new Error(`Gemini request failed: ${lastError?.message}`);
    failure.code = "AI_UNAVAILABLE";
    throw failure;
};

/** Kept for backwards compatibility with any code that wanted raw text. */
export const generateContent = async (prompt) => {
    const ai = getClient();
    if (!ai) throw new Error("GEMINI_API_KEY is not configured.");

    const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
    });

    return response.text;
};

export default generateJson;

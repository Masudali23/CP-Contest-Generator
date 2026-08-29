import {GoogleGenAI} from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

export const generateContent = async (prompt) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            // model: "gemini-3.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error("Failed to generate AI response.");
    }
}
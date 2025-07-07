import { Together } from 'together-ai';
import 'dotenv/config'; 

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY
});

export async function callOpenAI(prompt) {
    try {
        console.log("Sending prompt to AI (length:", prompt.length, "chars)");

        const response = await together.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "deepseek-ai/DeepSeek-V3",
            temperature: 0.7,
            max_tokens: 5000
        });

        const content = response.choices[0].message.content?.trim();
        if (!content) throw new Error('AI returned empty content');

        console.log("Received AI response (length:", content.length, "chars)");
        return content;
    } catch (error) {
        console.error("AI call failed:", error.response?.data || error.message);
        throw new Error("Failed to get AI insight");
    }
}

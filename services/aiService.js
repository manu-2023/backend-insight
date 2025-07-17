import { Together } from 'together-ai';
import 'dotenv/config';

const together = new Together({
    apiKey: process.env.API_KEY
});

export async function callDeepseekAI(prompt) {
    try {
        console.log('📤 Sending prompt to DeepSeek AI...');
       
        console.log('🧪 Prompt Length:', prompt.length, 'characters');

        const response = await together.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a data analyst AI. Given structured input like tables or JSON, generate clear, accurate, and insightful analysis. Focus on trends, anomalies, comparisons, and summaries. Never make up data. Only use the provided input."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "deepseek-ai/DeepSeek-V3",
            temperature: 0.3,
            max_tokens: 7000
        });

        const content = response.choices[0].message.content?.trim();

        console.log('✅ AI Response Length:', content?.length || 0);
        console.log('📥 Raw AI Response:', content?.slice(0, 100)); // first 300 chars

        if (!content) throw new Error('AI returned empty content');
        return content;
    } catch (error) {
        console.error('❌ DeepSeek API Error:', error.message);
        throw new Error("Failed to get AI insight");
    }
}



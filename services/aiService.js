import { Together } from 'together-ai';
import 'dotenv/config';

const together = new Together({
    apiKey: process.env.API_KEY
});

export async function callDeepseekAI(prompt) {
    try {

        const response = await together.chat.completions.create({
            messages: [{ role: "system", content: "You are a data analyst AI. Given structured input like tables or JSON, generate clear, accurate, and insightful analysis. Focus on trends, anomalies, comparisons, and summaries. Never make up data. Only use the provided input." },
            { role: "user", content: prompt }],
            model: "deepseek-ai/DeepSeek-V3",
            temperature: 0.3,
            max_tokens: 7000
        });

        const content = response.choices[0].message.content?.trim();
        if (!content) throw new Error('AI returned empty content');

        return content;
    } catch (error) {
        throw new Error("Failed to get AI insight");
    }
}

// import axios from 'axios';
// import dotenv from 'dotenv';

// dotenv.config();

// export async function callOpenAI(prompt) {
//   try {

//     const response = await axios.post(
//       'https://api.deepseek.com/v1/chat/completions',
//       {
//         model: 'deepseek-chat', // or deepseek-coder / deepseek-math depending on your use case
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0.7,
//         max_tokens: 5000
//       },
//       {
//         headers: {
//           'Authorization': `Bearer ${process.env.API_KEY}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     const content = response.data.choices[0].message.content?.trim();
//     console.log(content)
//     if (!content) throw new Error('DeepSeek returned empty content');

//     return content;
//   } catch (err) {
//       throw new Error(`Failed to get AI insight`)
//   }
// }


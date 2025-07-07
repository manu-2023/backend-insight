import { Together } from 'together-ai';
import 'dotenv/config'; 

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY
});

export async function callOpenAI(prompt) {
    try {

        const response = await together.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "deepseek-ai/DeepSeek-V3",
            temperature: 0.7,
            max_tokens: 5000
        });

        const content = response.choices[0].message.content?.trim();
        if (!content) throw new Error('AI returned empty content');

        return content;
    } catch (error) {
        throw new Error("Failed to get AI insight");
    }
}

// deepseekClient.js
// import axios from 'axios';
// import 'dotenv/config';

// export async function callDeepSeek(prompt) {
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
//           'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     const content = response.data.choices[0].message.content?.trim();
//     if (!content) throw new Error('DeepSeek returned empty content');

//     return content;
//   } catch (err) {
//     throw new Error('Failed to get DeepSeek insight');
//   }
// }


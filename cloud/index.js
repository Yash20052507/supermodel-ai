// cloud/index.js
const express = require('express');
const cors = require('cors');
// Use the recommended import from the guidelines
const { GoogleGenAI } = require('@google/genai'); 
const app = express();

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// Initialize using the correct method with a named apiKey parameter
// Assumes API_KEY is set in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/run', async (req, res) => {
  try {
    // FIX APPLIED: Correctly destructure `pack_id` from the request body
    const { pack_id, prompt } = req.body;

    if (!pack_id || !prompt) {
      return res.status(400).json({ error: 'Missing pack_id or prompt in request body' });
    }
    
    // Use the modern, recommended method for generating content
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Use the recommended model
        contents: prompt,
        config: {
            // Provide the system instruction to tailor the AI's response
            systemInstruction: `You are SuperModel AI with skill: ${pack_id}`,
        }
    });

    // Extract text directly from the response object as per latest SDK
    const text = response.text;
    
    // NOTE: The latest SDK's GenerateContentResponse does not expose token counts directly.
    // The router is the source of truth for cost. We send back estimated tokens.
    const estimatedTokensIn = Math.ceil(prompt.length / 4);
    const estimatedTokensOut = Math.ceil(text.length / 4);

    res.json({
      text: text,
      tokens_in: estimatedTokensIn,
      tokens_out: estimatedTokensOut,
    });
  } catch(error) {
    console.error("Error in cloud fallback service:", error);
    res.status(500).json({ error: 'Failed to generate content from the cloud provider.' });
  }
});

const PORT = 8002;
app.listen(PORT, () => {
  console.log(`Cloud fallback service listening on port ${PORT}`);
});
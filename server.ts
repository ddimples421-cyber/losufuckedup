import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '30mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please ensure your Gemini API key is provided.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithFallback(ai: GoogleGenAI, requestParams: { contents: any; config?: any }) {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: requestParams.contents,
        config: requestParams.config,
      });
      return res;
    } catch (err: any) {
      console.warn(`Attempt with ${model} failed:`, err?.message || err);
      lastErr = err;
      const msg = String(err?.message || '');
      const isRetryable = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('overloaded');
      if (isRetryable) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// 1. Initial Draft with Prompt & File Attachments
app.post('/api/draft', async (req, res) => {
  try {
    const { prompt, attachments = [], tone = 'insightful', format = 'article', audience = 'general' } = req.body;

    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Please provide an input prompt or at least one attachment.' });
    }

    const ai = getGeminiClient();

    const parts: any[] = [];

    // Add attachments if any
    for (const att of attachments) {
      if (att.mimeType && att.mimeType.startsWith('image/') && att.data) {
        // base64 image
        const cleanBase64 = att.data.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: cleanBase64,
          },
        });
      } else if (att.content) {
        parts.push({
          text: `[Attachment: ${att.name || 'Reference File'}]\n${att.content}\n---`,
        });
      }
    }

    const userPrompt = `
You are Cadence, an elite writing collaborator and master stylist.
The user wants to draft an exceptional, compelling piece of writing.

User Request / Instructions:
${prompt || 'Please synthesize the attached materials into a cohesive piece.'}

Format: ${format}
Desired Tone: ${tone}
Audience: ${audience}

Instructions:
1. Provide a captivating title.
2. Write a well-structured, polished, human-sounding piece of writing. Do NOT use cliché corporate fluff, buzzwords, or generic bullet summaries unless specifically requested.
3. Use pacing, deliberate rhythm, and engaging transitions between paragraphs.
4. Output your response as a JSON object with:
   - title: string
   - content: string (the actual markdown/prose document text, separated by double newlines for paragraphs)
   - summary: string (a 1-sentence synopsis of the thesis)
   - editorialNotes: string (a short note from you as the writing partner on the stylistic angle taken)
`;

    parts.push({ text: userPrompt });

    const response = await generateWithFallback(ai, {
      contents: [{ parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING },
            editorialNotes: { type: Type.STRING },
          },
          required: ['title', 'content'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/draft:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate initial draft.' });
  }
});

// 2. Inline Iteration: Feedback on Selected Sentence / Paragraph / Article Scope
app.post('/api/iterate-inline', async (req, res) => {
  try {
    const {
      selectedText,
      feedback,
      scope = 'selection', // 'selection' | 'paragraph' | 'document'
      paragraphContext = '',
      fullDocument = '',
      documentTitle = 'Untitled',
    } = req.body;

    if (!selectedText && !paragraphContext) {
      return res.status(400).json({ error: 'Selection or context is required for inline iteration.' });
    }
    if (!feedback) {
      return res.status(400).json({ error: 'Feedback prompt is required.' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are Cadence, an elite inline co-writer and thought partner.
The user is writing an essay/document titled "${documentTitle}".
They selected specific text and gave you editorial feedback.
Unlike chat apps where users have to copy-paste the whole text into a box and wait, you perform seamless, context-aware inline rewrites.

Scope requested: "${scope}"
- If scope is "selection": Rewrite ONLY the selected snippet directly, ensuring it slots seamlessly into the sentence and paragraph.
- If scope is "paragraph": Rewrite the surrounding paragraph so the feedback is organically integrated without disrupting tone or flow.
- If scope is "document": Rewrite the entire document so the feedback is woven thoroughly through the arguments, narrative arc, and conclusion.

Return a JSON object conforming to the schema with:
- scope: "${scope}"
- originalText: exact substring from document being replaced
- revisedText: the replacement text ready to drop in
- explanation: 1 concise sentence explaining how the change was woven in
- alternativeVariations: array of 2 varied stylistic options (e.g., one more punchy, one more nuanced)
- notesOnBroaderWeave: if scope is paragraph or document, explain what other adjustments were made
`;

    const promptText = `
Document Title: ${documentTitle}

Full Document Context:
${fullDocument}

Paragraph Context:
${paragraphContext}

Selected Text to Iterate On:
"${selectedText}"

User Feedback / Desired Change:
"${feedback}"

Rewrite target according to scope: "${scope}".
Ensure natural voice, compelling cadence, and zero artificial fluff.
`;

    const response = await generateWithFallback(ai, {
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scope: { type: Type.STRING },
            originalText: { type: Type.STRING },
            revisedText: { type: Type.STRING },
            explanation: { type: Type.STRING },
            alternativeVariations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            notesOnBroaderWeave: { type: Type.STRING },
          },
          required: ['scope', 'originalText', 'revisedText', 'explanation'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/iterate-inline:', error);
    return res.status(500).json({ error: error.message || 'Failed to iterate on selection.' });
  }
});

// 3. Proactive Feedback: Thought Partner Margin Critiques & Inline Improvement Proposals
app.post('/api/proactive-feedback', async (req, res) => {
  try {
    const { documentTitle = 'Untitled', content } = req.body;

    if (!content || content.trim().length < 40) {
      return res.json({ suggestions: [] });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an observant, world-class editor and thought partner reviewing a draft in progress.
You proactively spot genuine editorial opportunities to elevate the writing.
Do NOT nitpick minor punctuation or invent problems.
Find 2 to 4 high-impact moments in the text where:
1. An idea is abstract and needs a concrete anchor or metaphor.
2. A sentence drags or loses musical rhythm.
3. The opening hook or transition could be much sharper.
4. An unsubstantiated claim could anticipate the reader's counter-argument.
5. Passive or corporate filler can be transformed into confident prose.

IMPORTANT:
- "targetSnippet" MUST be an exact, character-accurate substring found verbatim in the provided text.
- "suggestedReplacement" should be a drop-in replacement for that exact snippet.
- Keep "critique" concise, insightful, and collegiate (like a trusted colleague scribbling in the margin).
`;

    const promptText = `
Document Title: ${documentTitle}

Draft Content:
${content}

Identify 2 to 4 proactive editorial suggestions with exact targetSnippets and drop-in replacements.
`;

    const response = await generateWithFallback(ai, {
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description: "e.g. 'Hook', 'Pacing', 'Clarity', 'Metaphor', 'Counterpoint', 'Tighten'",
                  },
                  targetSnippet: {
                    type: Type.STRING,
                    description: 'Exact verbatim substring from the draft content to replace',
                  },
                  critique: {
                    type: Type.STRING,
                    description: 'Insightful editorial observation explaining why this needs attention',
                  },
                  suggestedReplacement: {
                    type: Type.STRING,
                    description: 'Drop-in replacement for the exact targetSnippet',
                  },
                  rationale: {
                    type: Type.STRING,
                    description: 'Why this proposed version improves the reading experience',
                  },
                },
                required: ['id', 'category', 'targetSnippet', 'critique', 'suggestedReplacement', 'rationale'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"suggestions":[]}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/proactive-feedback:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate proactive feedback.' });
  }
});

// 4. Continue Writing / Ghostwrite Next Paragraph
app.post('/api/continue-writing', async (req, res) => {
  try {
    const { documentTitle = 'Untitled', content, instruction = '' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Document content is required.' });
    }

    const ai = getGeminiClient();

    const promptText = `
You are Cadence, the author's co-pilot.
Document Title: ${documentTitle}
Existing Text:
${content}

${instruction ? `User's requested direction: ${instruction}` : 'Ghostwrite the next natural continuation (1 to 2 paragraphs) in the exact cadence, perspective, and voice of the author.'}
`;

    const response = await generateWithFallback(ai, {
      contents: promptText,
      config: {
        systemInstruction: 'Output only the continuation text. Do not preface with conversational chatter or quotes.',
      },
    });

    return res.json({ continuation: response.text?.trim() || '' });
  } catch (error: any) {
    console.error('Error in /api/continue-writing:', error);
    return res.status(500).json({ error: error.message || 'Failed to continue writing.' });
  }
});

// 5. Quick Polish Actions on Selected Text
app.post('/api/quick-action', async (req, res) => {
  try {
    const { selectedText, action, fullDocument = '' } = req.body;

    if (!selectedText) {
      return res.status(400).json({ error: 'Selection is required.' });
    }

    const ai = getGeminiClient();

    const actionDescriptions: Record<string, string> = {
      sharpen: 'Strip all filler words, intensify the verbs, and maximize sentence punch.',
      expand: 'Enrich with a vivid analogy, sensory nuance, or concrete real-world detail.',
      counterpoint: 'Anticipate the strongest objection or introduce thoughtful counter-perspective.',
      conversational: 'Warm up the tone so it sounds like a brilliant founder or writer speaking directly over coffee.',
      provocative: 'Sharpen this into a bold, memorable thesis without sounding arrogant.',
    };

    const instruction = actionDescriptions[action] || 'Improve and elevate the chosen selection.';

    const promptText = `
Document context (for tone and flow):
${fullDocument.slice(-1000)}

Selected text:
"${selectedText}"

Task:
${instruction}

Return a JSON object with:
- replacement: string (the new rewritten replacement for selected text)
- explanation: string (a short 1-line explanation of the craft choice)
`;

    const response = await generateWithFallback(ai, {
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replacement: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['replacement'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/quick-action:', error);
    return res.status(500).json({ error: error.message || 'Quick action failed.' });
  }
});

// Mount Vite or static server
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cadence Writing Studio server running on http://0.0.0.0:${PORT}`);
});

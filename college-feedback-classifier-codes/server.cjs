// BACKEND: Node.js Express server for feedback classification
// Uses Google Gemini (free tier) with few-shot prompting to classify feedback.

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load variables from a .env file in this folder (e.g. GEMINI_API_KEY=...)
try {
    process.loadEnvFile();
} catch (err) {
    // No .env file found — that's fine, will fall back to keyword matching
}

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const CATEGORIES = ['Academics', 'Facilities', 'Administration', 'General'];

// Few-shot examples used to prompt Gemini
const FEW_SHOT_EXAMPLES = [
    { text: 'The professor explains concepts very clearly and assignments are fair.', category: 'Academics' },
    { text: 'The library needs more study spaces and the WiFi is very slow in the hostel.', category: 'Facilities' },
    { text: 'Fee payment process is very complicated and registration takes too long.', category: 'Administration' },
    { text: 'Overall college experience has been great, campus culture is friendly.', category: 'General' },
    { text: 'Lab equipment in the chemistry block is outdated and needs replacement.', category: 'Facilities' },
    { text: 'Exam scheduling was announced very late by the admin office.', category: 'Administration' }
];

function buildPrompt(feedbackText) {
    const examples = FEW_SHOT_EXAMPLES
        .map(e => `Feedback: "${e.text}"\nCategory: ${e.category}`)
        .join('\n\n');

    return `You are a classifier for college feedback (from students, faculty, or staff).
Classify the feedback into exactly one of these categories: Academics, Facilities, Administration, General.

Here are some examples:

${examples}

Now classify this new feedback:
Feedback: "${feedbackText}"

Respond ONLY with a valid JSON object, no markdown, no extra text, in this exact format:
{"category": "<one of Academics, Facilities, Administration, General>", "confidence": <a number 1-5 for how confident you are>, "explanation": "<one sentence explaining why>"}`;
}

// Local keyword-based fallback (used only if Gemini call fails or no API key is set)
function keywordFallback(feedbackText) {
    const text = feedbackText.toLowerCase();
    const keywordMap = {
        Academics: ['professor', 'lecture', 'course', 'assignment', 'exam', 'class', 'syllabus', 'teaching'],
        Facilities: ['library', 'wifi', 'hostel', 'cafeteria', 'lab', 'building', 'infrastructure', 'maintenance'],
        Administration: ['fee', 'registration', 'office', 'staff', 'admission', 'document', 'procedure', 'policy']
    };
    let best = 'General';
    let bestScore = 0;
    for (const [category, keywords] of Object.entries(keywordMap)) {
        const score = keywords.filter(k => text.includes(k)).length;
        if (score > bestScore) {
            bestScore = score;
            best = category;
        }
    }
    return {
        category: best,
        confidence: bestScore || 1,
        explanation: `Fallback keyword match placed this under ${best} (Gemini API unavailable).`
    };
}

async function classifyWithGemini(feedbackText) {
    if (!GEMINI_API_KEY) {
        return keywordFallback(feedbackText);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [{ parts: [{ text: buildPrompt(feedbackText) }] }],
        generationConfig: { temperature: 0.2 }
    };

    const maxAttempts = 3;
    let lastErrorText = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = rawText.replace(/```json|```/g, '').trim();

            try {
                const parsed = JSON.parse(cleaned);
                if (!CATEGORIES.includes(parsed.category)) {
                    parsed.category = 'General';
                }
                return parsed;
            } catch (err) {
                console.error('Failed to parse Gemini response:', rawText);
                return keywordFallback(feedbackText);
            }
        }

        lastErrorText = await res.text();

        // 503 = model temporarily overloaded, worth retrying. Anything else, fail fast.
        if (res.status !== 503 || attempt === maxAttempts) {
            console.error('Gemini API error:', res.status, lastErrorText);
            return keywordFallback(feedbackText);
        }

        console.warn(`Gemini overloaded (attempt ${attempt}/${maxAttempts}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }

    console.error('Gemini API error after retries:', lastErrorText);
    return keywordFallback(feedbackText);
}

// API endpoint for feedback classification
app.post('/api/classify', async (req, res) => {
    try {
        const { studentName, department, feedbackText } = req.body;

        if (!feedbackText || !department) {
            return res.status(400).json({
                error: 'Feedback text and department are required'
            });
        }

        const classification = await classifyWithGemini(feedbackText);

        const result = {
            studentName: studentName || 'Anonymous',
            department,
            feedbackText,
            category: classification.category,
            confidence: classification.confidence,
            explanation: classification.explanation,
            timestamp: new Date().toISOString()
        };

        console.log('Feedback classified:', result);
        res.json(result);

    } catch (error) {
        console.error('Classification error:', error);
        res.status(500).json({
            error: 'Internal server error during classification'
        });
    }
});

app.get('/api/stats', (req, res) => {
    res.json({
        message: 'Statistics endpoint',
        categories: CATEGORIES
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`College Feedback Classifier server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
    console.log(GEMINI_API_KEY ? 'Gemini API key detected.' : 'No GEMINI_API_KEY set — using keyword fallback.');
});

module.exports = app;

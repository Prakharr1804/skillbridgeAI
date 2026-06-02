const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

// ── Gemini response schema ────────────────────────────────────────────────────
const evaluationSchema = {
    type: Type.OBJECT,
    properties: {
        contentAccuracy: {
            type: Type.NUMBER,
            description: 'How accurately the answer addresses the question (0–10)',
        },
        clarity: {
            type: Type.NUMBER,
            description: 'How clear and easy to understand the answer is (0–10)',
        },
        structure: {
            type: Type.NUMBER,
            description: 'How logically organized the answer is (0–10)',
        },
        communication: {
            type: Type.NUMBER,
            description: 'Quality of language and communication style (0–10)',
        },
        overall: {
            type: Type.NUMBER,
            description: 'Overall score out of 10',
        },
        feedback: {
            type: Type.ARRAY,
            description: 'Concise feedback points about the answer',
            items: { type: Type.STRING },
        },
        strengths: {
            type: Type.ARRAY,
            description: 'Specific things the candidate did well',
            items: { type: Type.STRING },
        },
        improvements: {
            type: Type.ARRAY,
            description: 'Specific areas the candidate should improve',
            items: { type: Type.STRING },
        },
        starAnalysis: {
            type: Type.OBJECT,
            description: 'For behavioral questions: whether STAR components are present',
            properties: {
                situation: { type: Type.BOOLEAN, description: 'Did they describe the situation?' },
                task:      { type: Type.BOOLEAN, description: 'Did they describe the task?' },
                action:    { type: Type.BOOLEAN, description: 'Did they describe the actions taken?' },
                result:    { type: Type.BOOLEAN, description: 'Did they describe the result/outcome?' },
            },
            required: ['situation', 'task', 'action', 'result'],
        },
    },
    required: ['contentAccuracy', 'clarity', 'structure', 'communication', 'overall', 'feedback', 'strengths', 'improvements', 'starAnalysis'],
};

/**
 * Evaluates a candidate's answer against the expected answer using Gemini.
 *
 * @param {object} params
 * @param {string} params.question        - The interview question asked
 * @param {string} params.expectedAnswer  - The ideal/model answer from the report
 * @param {string} params.transcript      - The candidate's spoken answer (transcribed)
 * @param {string} params.questionType    - 'technical' | 'behavioral'
 * @returns {Promise<object>} Full evaluation with scores, feedback, STAR analysis
 */
async function evaluateAnswer({ question, expectedAnswer, transcript, questionType }) {
    const isBehavioral = questionType === 'behavioral';

    const prompt = `You are an expert technical interviewer and communication coach.
Evaluate the candidate's answer to the following interview question.

QUESTION TYPE: ${questionType.toUpperCase()}
QUESTION: ${question}

IDEAL ANSWER (for reference):
${expectedAnswer}

CANDIDATE'S ANSWER (from audio transcription):
${transcript || '[No answer provided — candidate did not speak]'}

SCORING CRITERIA (all scores 0–10):
- contentAccuracy: How accurately and completely the answer addresses the question compared to the ideal answer
- clarity: How clear, concise, and easy to understand the answer is
- structure: How logically organized the answer is (intro, main points, conclusion)
- communication: Quality of language, vocabulary, and professional tone
- overall: Weighted overall score considering all dimensions

FEEDBACK GUIDELINES:
- feedback: 2–4 specific, actionable feedback points
- strengths: 2–3 things the candidate did genuinely well (if any)
- improvements: 2–3 specific things to improve
${isBehavioral ? `
STAR ANALYSIS (behavioral questions only):
Analyze whether the answer contains each STAR component:
- situation: Did they describe the context/situation?
- task: Did they explain their specific task or responsibility?
- action: Did they describe the specific actions they took?
- result: Did they share the outcome or result?
If components are missing, reflect that in the improvements array.` : `
STAR ANALYSIS: For this technical question, set all STAR fields to false.`}

Return a JSON evaluation following the exact schema provided.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: evaluationSchema,
        },
    });

    const evaluation = JSON.parse(response.text);

    // For technical questions, forcibly zero out STAR (don't trust Gemini's judgement here)
    if (!isBehavioral) {
        evaluation.starAnalysis = { situation: false, task: false, action: false, result: false };
    }

    // Clamp all scores to 0–10 range
    const scoreFields = ['contentAccuracy', 'clarity', 'structure', 'communication', 'overall'];
    for (const field of scoreFields) {
        if (typeof evaluation[field] === 'number') {
            evaluation[field] = Math.max(0, Math.min(10, parseFloat(evaluation[field].toFixed(1))));
        }
    }

    return evaluation;
}

/**
 * Computes the overall session summary from all completed responses.
 *
 * @param {Array} responses - Array of InterviewResponse documents
 * @returns {{ overallScore, technicalAverage, behavioralAverage, topStrengths, topImprovements }}
 */
function computeSessionSummary(responses) {
    const technical  = responses.filter(r => r.questionType === 'technical');
    const behavioral = responses.filter(r => r.questionType === 'behavioral');

    const avg = (arr) =>
        arr.length > 0
            ? parseFloat((arr.reduce((s, r) => s + (r.scores?.overall || 0), 0) / arr.length).toFixed(1))
            : 0;

    const technicalAverage  = avg(technical);
    const behavioralAverage = avg(behavioral);
    const overallScore      = avg(responses);

    // Collect and deduplicate top strengths / improvements
    const allStrengths    = responses.flatMap(r => r.strengths    || []);
    const allImprovements = responses.flatMap(r => r.improvements || []);

    const dedupe = (arr) => [...new Set(arr)].slice(0, 5);

    return {
        overallScore,
        technicalAverage,
        behavioralAverage,
        topStrengths:    dedupe(allStrengths),
        topImprovements: dedupe(allImprovements),
    };
}

module.exports = { evaluateAnswer, computeSessionSummary };

const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

// ── Gemini schema for transcription response ──────────────────────────────────
const transcriptionSchema = {
    type: Type.OBJECT,
    properties: {
        transcript: {
            type: Type.STRING,
            description: 'Exact word-for-word transcription of the audio',
        },
        estimatedDurationSeconds: {
            type: Type.NUMBER,
            description: 'Total audio duration in seconds',
        },
    },
    required: ['transcript', 'estimatedDurationSeconds'],
};

/**
 * Transcribes an audio file using Gemini multimodal capability.
 * @param {Buffer|string} audioInput - Buffer OR absolute file path
 * @param {string} mimeType - e.g. 'audio/webm', 'audio/mp4'
 * @returns {Promise<{ transcript: string, durationSeconds: number }>}
 */
async function transcribeAudio(audioInput, mimeType) {
    const buffer = Buffer.isBuffer(audioInput)
        ? audioInput
        : fs.readFileSync(audioInput);

    const base64Audio = buffer.toString('base64');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType || 'audio/webm',
                            data: base64Audio,
                        },
                    },
                    {
                        text: `You are a professional transcriptionist.
Transcribe this audio recording exactly as spoken, including any filler words (um, uh, like, etc.).
Also estimate the total duration of the audio in seconds.
Return a JSON object with "transcript" and "estimatedDurationSeconds".`,
                    },
                ],
            },
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: transcriptionSchema,
        },
    });

    const parsed = JSON.parse(response.text);
    return {
        transcript: (parsed.transcript || '').trim(),
        durationSeconds: Math.round(parsed.estimatedDurationSeconds || 0),
    };
}

// ── Filler word regex ─────────────────────────────────────────────────────────
const FILLER_PATTERN = /\b(um|uh|like|basically|actually|you\s+know)\b/gi;

/**
 * Computes speech metrics from transcript + known duration. No AI call — runs synchronously.
 * @param {string} transcript
 * @param {number} durationSeconds
 * @returns {{ speakingRate: number, fillerWords: number, averagePauseSeconds: number, durationSeconds: number }}
 */
function analyzeSpeech(transcript, durationSeconds) {
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const fillerMatches = transcript.match(FILLER_PATTERN) || [];
    const fillerWords = fillerMatches.length;

    const durationMinutes = durationSeconds > 0 ? durationSeconds / 60 : 1;
    const speakingRate = Math.round(wordCount / durationMinutes);

    const sentenceCount = (transcript.match(/[.!?]+\s/g) || []).length + 1;
    const estimatedPauseTime = Math.min(sentenceCount * 0.8, durationSeconds * 0.2);
    const averagePauseSeconds = parseFloat(
        (sentenceCount > 0 ? estimatedPauseTime / sentenceCount : 0).toFixed(2)
    );

    return { speakingRate, fillerWords, averagePauseSeconds, durationSeconds };
}

module.exports = { transcribeAudio, analyzeSpeech };

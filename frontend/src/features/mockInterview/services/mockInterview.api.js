import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true,
});

/** Create a new mock interview session linked to an interview report */
export const createSession = (reportId) =>
    api.post('/api/mock-interview/session', { reportId });

/** Get the next unanswered question for a session */
export const getNextQuestion = (sessionId) =>
    api.get(`/api/mock-interview/session/${sessionId}/question`);

/**
 * Submit an audio answer.
 * @param {{ sessionId, question, questionType, audioBlob }} params
 */
export const submitAudioAnswer = ({ sessionId, question, questionType, audioBlob }) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('question', question);
    formData.append('questionType', questionType);
    formData.append('audio', audioBlob, 'answer.webm');
    return api.post('/api/mock-interview/answer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

/** Get full session details + summary */
export const getSession = (sessionId) =>
    api.get(`/api/mock-interview/session/${sessionId}`);

/** Get all submitted responses for a session */
export const getSessionResponses = (sessionId) =>
    api.get(`/api/mock-interview/session/${sessionId}/responses`);

/** Get all sessions for the logged-in user */
export const getUserSessions = (params) =>
    api.get('/api/mock-interview/sessions', { params });

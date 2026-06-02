import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true
})

export const generateInterviewReport = async({resumeFile, selfDescription, jobDescription}) => {
    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("selfDescription", selfDescription);
    formData.append("jobDescription", jobDescription);

    const response = await api.post("/api/interview/", formData, {
        headers:{
            "Content-Type": "multipart/form-data",
        }
    })

    return response.data;
}

export const getInterviewReportById = async({id}) => {
    const response = await api.get(`/api/interview/report/${id}`);
    return response.data;
}

export const getAllInterviewReports = async() => {
    const response = await api.get(`/api/interview/`);
    return response.data;
}

export const generateResumePdf = async({interviewReportId}) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, {
        responseType: "blob"
    });
    return response.data;
}
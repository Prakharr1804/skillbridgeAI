import { InterviewContext } from "../interview.context";
import { useContext, useEffect } from "react";
import { generateInterviewReport, getInterviewReportById, getAllInterviewReports, generateResumePdf } from "../services/interview.api";
import { syncToGoogleCalendar } from "../services/calendar.api";
import { useParams } from "react-router";

export const useInterview = () => {
    const context = useContext(InterviewContext);

    if(!context){
        throw new Error("useInterview must be used within InterviewProvider")
    }

    // useParams returns {} when there is no matching param — safe to call unconditionally
    const { interviewId } = useParams();

    const { loading, setLoading, report, setReport, reports, setReports } = context;

    const generateReport = async({resumeFile, selfDescription, jobDescription}) => {
        try {
            setLoading(true);
            const res = await generateInterviewReport({ resumeFile, selfDescription, jobDescription });
            // Backend returns { data: interviewReport }
            const created = res.data;
            setReport(created);
            return created;
        } catch (error) {
            console.error("generateReport error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getReportById = async (id) => {
        try {
            setLoading(true);
            const res = await getInterviewReportById({ id });
            setReport(res.interviewReport);
            return res.interviewReport;
        } catch (error) {
            console.error("getReportById error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getReports = async () => {
        try{
            setLoading(true)
            const res = await getAllInterviewReports()
            setReports(res.interviewReports)
            return res.interviewReports;
        }catch(error){
            console.log(error)
        }finally{
            setLoading(false)
        }
    };

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        let response = null
        try {
            response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
        }
        catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    const syncCalendar = async ({ accessToken, interviewReportId }) => {
        try {
            setLoading(true);
            const res = await syncToGoogleCalendar({ interviewReportId, accessToken });
            return res;
        } catch (error) {
            console.error("syncCalendar error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return {
        loading,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        getResumePdf,
        syncCalendar,
    };
};

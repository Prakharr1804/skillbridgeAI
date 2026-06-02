import { createBrowserRouter, Outlet } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";
import MockInterviewSession from "./features/mockInterview/pages/MockInterviewSession";
import MockInterviewResults from "./features/mockInterview/pages/MockInterviewResults";
import { AuthProvider } from "./features/auth/auth.context";
import { InterviewProvider } from "./features/interview/interview.context";

// Layout that provides Auth and Interview contexts to all routes
function RootLayout() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <Outlet />
      </InterviewProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/",
        element: <Protected><Home /></Protected>,
      },
      {
        path: "/interview/:interviewId",
        element: <Protected><Interview /></Protected>,
      },
      {
        path: "/mock-interview/session/:sessionId",
        element: <Protected><MockInterviewSession /></Protected>,
      },
      {
        path: "/mock-interview/session/:sessionId/results",
        element: <Protected><MockInterviewResults /></Protected>,
      },
    ],
  },
]);


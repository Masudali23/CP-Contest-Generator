import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";

import "./index.css";

import Home from "./pages/Home.jsx";
import Setup from "./pages/Setup.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ContestPage from "./pages/ContestPage.jsx";
import ContestHistoryPage from "./pages/ContestHistoryPage.jsx";
import ReportHistoryPage from "./pages/ReportHistoryPage.jsx";
import ContestReportPage from "./pages/ContestReportPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<Home />} />

            {/* Signed in, handle not linked yet. */}
            <Route element={<ProtectedRoute requireHandle={false} />}>
                <Route path="/setup" element={<Setup />} />
            </Route>

            {/* Signed in with a linked Codeforces handle. */}
            <Route element={<ProtectedRoute />}>
                <Route path="/landingpage" element={<LandingPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contest/:contestId" element={<ContestPage />} />
                <Route path="/history" element={<ContestHistoryPage />} />
                <Route path="/reports" element={<ReportHistoryPage />} />
                <Route path="/report/:contestId" element={<ContestReportPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </>
    )
);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);

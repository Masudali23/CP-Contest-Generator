import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import useApiResource from "../hooks/useApiResource.js";
import Spinner from "../components/Spinner.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ContestCard from "../components/ContestCard.jsx";

const fetchHistory = () => api.get("/history").then((response) => response.data.contests ?? []);

export default function ContestHistoryPage() {
    const navigate = useNavigate();

    const { data, loading, error, reload } = useApiResource(fetchHistory, {
        fallbackError: "Failed to load your contest history.",
    });

    const retry = useCallback(() => reload(), [reload]);

    if (loading) return <Spinner label="Loading contest history..." />;

    const contests = data ?? [];

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Contest history</h1>
                        <p className="mt-2 text-lg text-gray-500">Revisit any contest you have generated.</p>
                    </div>

                    <button
                        onClick={() => navigate("/landingpage")}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        ← Dashboard
                    </button>
                </div>

                {error && <ErrorState message={error} onRetry={retry} />}

                {!error && contests.length === 0 && (
                    <div className="rounded-3xl border border-gray-200 bg-white p-16 text-center shadow-sm">
                        <div className="text-6xl">📭</div>
                        <h2 className="mt-5 text-2xl font-bold text-gray-900">No contests yet</h2>
                        <p className="mt-2 text-gray-500">Generate your first personalised Codeforces contest.</p>

                        <button
                            onClick={() => navigate("/dashboard")}
                            className="mt-7 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                            Generate contest
                        </button>
                    </div>
                )}

                <div className="space-y-5">
                    {contests.map((contest, index) => (
                        <ContestCard
                            key={contest.id}
                            contest={contest}
                            index={index}
                            actionLabel="View contest →"
                            onAction={() => navigate(`/contest/${contest.id}`)}
                            secondary={
                                contest.is_ended ? (
                                    <button
                                        onClick={() => navigate(`/report/${contest.id}`)}
                                        className="rounded-xl border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        {contest.has_report ? "View report" : "Generate report"}
                                    </button>
                                ) : null
                            }
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

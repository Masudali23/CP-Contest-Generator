import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import useApiResource from "../hooks/useApiResource.js";
import Spinner from "../components/Spinner.jsx";
import ErrorState from "../components/ErrorState.jsx";

const STATUS_STYLES = {
    solved: { label: "✓ Solved", className: "text-green-600 font-bold" },
    wrong: { label: "✗ Not solved yet", className: "text-red-600 font-bold" },
    pending: { label: "⏳ Pending", className: "text-yellow-600" },
};

const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
};

export default function ContestPage() {
    const { contestId } = useParams();
    const navigate = useNavigate();

    const [timeLeft, setTimeLeft] = useState(0);
    const [actionError, setActionError] = useState("");

    /*
     * `?refresh=true` bypasses the server's three-minute Codeforces cache. It is
     * held in a ref so the fetcher identity stays stable and the resource hook
     * does not refetch on every render.
     */
    const forceRefreshRef = useRef(false);

    const fetchContest = useCallback(() => {
        const params = forceRefreshRef.current ? { refresh: "true" } : undefined;
        forceRefreshRef.current = false;

        return api.get(`/contest/${contestId}`, { params }).then((response) => response.data);
    }, [contestId]);

    const { data: contest, loading, refreshing, error, reload } = useApiResource(fetchContest, {
        fallbackError: "Could not load this contest.",
    });

    const refreshProgress = useCallback(() => {
        forceRefreshRef.current = true;
        reload({ silent: true });
    }, [reload]);

    // Countdown.
    useEffect(() => {
        if (!contest) return undefined;

        const endTime = new Date(contest.createdAt).getTime() + contest.duration * 60 * 1000;

        const tick = () => {
            setTimeLeft(contest.isEnded ? 0 : Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [contest]);

    // Poll Codeforces for progress while the contest is live.
    useEffect(() => {
        if (!contest || contest.isEnded) return undefined;

        const poll = setInterval(() => {
            forceRefreshRef.current = true;
            reload({ silent: true });
        }, 60_000);

        return () => clearInterval(poll);
    }, [contest, reload]);

    const endContest = useCallback(async () => {
        try {
            setActionError("");
            await api.patch(`/contest/${contestId}/end`);
            refreshProgress();
        } catch {
            setActionError("Could not end the contest. Please try again.");
        }
    }, [contestId, refreshProgress]);

    if (loading) return <Spinner label="Loading contest..." />;

    if (error && !contest) {
        return (
            <div className="min-h-screen bg-gray-100 px-4 py-16">
                <ErrorState message={error} onRetry={() => reload()} />
            </div>
        );
    }

    const problems = contest?.problems ?? [];
    const solvedCount = contest?.solvedCount ?? 0;

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate("/landingpage")}
                            className="mb-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            ← Back to dashboard
                        </button>

                        <h1 className="text-3xl font-bold">Contest #{contestId}</h1>

                        <p className="mt-1 text-gray-500">
                            {contest.difficulty} · {contest.duration} minutes · solved {solvedCount} of {problems.length}
                        </p>
                    </div>

                    <div className="rounded-lg border bg-white px-6 py-3 text-right shadow-sm">
                        <p className="text-sm text-gray-500">{contest.isEnded ? "Contest finished" : "Time remaining"}</p>
                        <p className={`text-2xl font-bold ${contest.isEnded ? "text-gray-500" : "text-red-600"}`}>
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                </div>

                {(error || actionError) && (
                    <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">{actionError || error}</div>
                )}

                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                    <table className="w-full min-w-[640px]">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border px-4 py-3 text-left">#</th>
                                <th className="border px-4 py-3 text-left">Name</th>
                                <th className="border px-4 py-3 text-left">Topics</th>
                                <th className="border px-4 py-3 text-left">Rating</th>
                                <th className="border px-4 py-3 text-left">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {problems.map((problem) => {
                                const status = STATUS_STYLES[problem.status] ?? STATUS_STYLES.pending;

                                return (
                                    <tr key={problem.id}>
                                        <td className="border px-4 py-3 font-semibold">{problem.position}</td>

                                        <td className="border px-4 py-3">
                                            <a
                                                href={problem.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {problem.problem_index}. {problem.problem_name}
                                            </a>
                                        </td>

                                        <td className="border px-4 py-3">
                                            {/* Tags stay hidden until the contest ends so they do not spoil the solution. */}
                                            {contest.isEnded ? (
                                                <span className="text-sm text-gray-600">
                                                    {(problem.tags ?? []).join(", ") || "—"}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">hidden during contest</span>
                                            )}
                                        </td>

                                        <td className="border px-4 py-3">{problem.rating ?? "—"}</td>

                                        <td className={`border px-4 py-3 text-lg ${status.className}`}>{status.label}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                    <button
                        onClick={refreshProgress}
                        disabled={refreshing}
                        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {refreshing ? "Checking Codeforces..." : "Check progress"}
                    </button>

                    {!contest.isEnded && (
                        <button
                            onClick={endContest}
                            className="rounded-lg border bg-white px-5 py-2 font-medium transition hover:bg-gray-50"
                        >
                            End contest
                        </button>
                    )}

                    {contest.isEnded && (
                        <button
                            onClick={() => navigate(`/report/${contestId}`)}
                            className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white transition hover:bg-green-700"
                        >
                            View performance report →
                        </button>
                    )}
                </div>

                {!contest.isEnded && (
                    <p className="mt-4 text-sm text-gray-500">
                        Progress refreshes automatically every minute. Codeforces caches submission data for up to three
                        minutes, so a solve can take a moment to appear.
                    </p>
                )}
            </div>
        </div>
    );
}

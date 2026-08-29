import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import useAuth from "../hooks/useAuth.js";
import useApiResource from "../hooks/useApiResource.js";

const fetchHistory = () => api.get("/history").then((response) => response.data.contests ?? []);

const CARDS = [
    {
        icon: "🚀",
        title: "Generate contest",
        body: "Build a personalised Codeforces contest around your topics, difficulty and time budget.",
        to: "/dashboard",
    },
    {
        icon: "📊",
        title: "Performance reports",
        body: "Topic-by-topic analysis of what you solved, what you missed and what to practise next.",
        to: "/reports",
    },
    {
        icon: "📜",
        title: "Contest history",
        body: "Revisit every contest you have generated and pick up where you left off.",
        to: "/history",
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const { data: contests, error } = useApiResource(fetchHistory, {
        fallbackError: "Could not load your contest stats.",
    });

    const stats = {
        contests: contests?.length ?? 0,
        reports: contests?.filter((contest) => contest.has_report).length ?? 0,
        active: contests?.filter((contest) => !contest.is_ended).length ?? 0,
    };

    useEffect(() => {
        const onClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleLogout = useCallback(async () => {
        await logout();
        navigate("/", { replace: true });
    }, [logout, navigate]);

    const name = user?.name ?? "User";
    const avatar = user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10">
            <div className="mx-auto max-w-5xl">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white px-8 py-5 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-600">CP Contest Generator</h1>
                        <p className="mt-1 text-gray-500">Welcome back, {name.split(" ")[0]}.</p>
                    </div>

                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setShowDropdown((previous) => !previous)}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-gray-100"
                        >
                            <img
                                src={avatar}
                                onError={(event) => {
                                    event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                                }}
                                alt=""
                                className="h-12 w-12 rounded-full border border-gray-300 object-cover"
                            />

                            <span className="text-right">
                                <span className="block font-semibold text-gray-800">{name}</span>
                                <span className="block text-sm text-gray-500">
                                    {user?.handle}
                                    {user?.rating ? ` · ${user.rating}` : ""}
                                </span>
                            </span>

                            <svg
                                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                                {user?.handle && (
                                    <a
                                        href={`https://codeforces.com/profile/${user.handle}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex w-full items-center gap-3 px-5 py-3 text-left text-gray-700 transition hover:bg-gray-100"
                                    >
                                        <span aria-hidden="true">🔗</span> Codeforces profile
                                    </a>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 px-5 py-3 text-left text-gray-700 transition hover:bg-gray-100"
                                >
                                    <span aria-hidden="true">🚪</span> Log out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <section className="mb-8 grid gap-4 sm:grid-cols-3">
                    {[
                        { label: "Contests generated", value: stats.contests },
                        { label: "Reports available", value: stats.reports },
                        { label: "Currently running", value: stats.active },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
                            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                        </div>
                    ))}
                </section>

                {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

                <div className="mb-8">
                    <h2 className="text-4xl font-bold text-gray-900">Dashboard</h2>
                    <p className="mt-2 text-lg text-gray-500">Select what you would like to do.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {CARDS.map((card) => (
                        <button
                            key={card.to}
                            onClick={() => navigate(card.to)}
                            className="rounded-3xl border border-gray-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                        >
                            <span className="text-5xl" aria-hidden="true">
                                {card.icon}
                            </span>

                            <h3 className="mt-6 text-2xl font-bold text-gray-900">{card.title}</h3>
                            <p className="mt-3 text-gray-500">{card.body}</p>

                            <span className="mt-8 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
                                Open
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

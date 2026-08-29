import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";

const FALLBACK_TOPICS = [
    "binary search", "bitmasks", "brute force", "combinatorics", "constructive algorithms",
    "data structures", "dfs and similar", "divide and conquer", "dp", "dsu", "games",
    "geometry", "graphs", "greedy", "hashing", "implementation", "math", "number theory",
    "probabilities", "shortest paths", "sortings", "strings", "trees", "two pointers",
].map((tag) => ({ tag, label: tag }));

export default function Dashboard() {
    const navigate = useNavigate();

    const [topics, setTopics] = useState(FALLBACK_TOPICS);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [difficulty, setDifficulty] = useState("balanced");
    const [duration, setDuration] = useState("120");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/user/topics")
            .then(({ data }) => setTopics(data.topics))
            .catch(() => {
                /* keep the bundled list */
            });
    }, []);

    const removeTopic = (tag) => setSelectedTopics((previous) => previous.filter((item) => item !== tag));

    const submit = async (event, endpoint) => {
        event.preventDefault();

        try {
            setLoading(true);
            setError("");

            /*
             * The original page always called /generate-test-contest, so the
             * difficulty and topic pickers above had no effect whatsoever.
             */
            const { data } = await api.post(endpoint, {
                tags: selectedTopics,
                difficulty,
                duration: Number(duration),
            });

            navigate(`/contest/${data.contestId}`);
        } catch (err) {
            setError(errorMessage(err, "Failed to generate the contest."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <button
                        onClick={() => navigate("/landingpage")}
                        className="mb-3 cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        ← Back to dashboard
                    </button>

                    <h1 className="text-4xl font-bold text-blue-600">Generate contest</h1>
                    <p className="mt-2 text-lg text-gray-500">
                        Problems are chosen around your live Codeforces rating and exclude everything you have already solved.
                    </p>
                </div>

                <form className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">Contest settings</h2>
                    <p className="mt-1 text-gray-500">Configure your contest preferences.</p>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="difficulty" className="mb-3 block font-semibold text-gray-800">
                                Difficulty
                            </label>

                            <select
                                id="difficulty"
                                value={difficulty}
                                onChange={(event) => setDifficulty(event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="easy">Easy — rating minus 300 to your rating</option>
                                <option value="balanced">Balanced — rating minus 200 to plus 200</option>
                                <option value="hard">Hard — your rating to plus 400</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="duration" className="mb-3 block font-semibold text-gray-800">
                                Duration
                            </label>

                            <select
                                id="duration"
                                value={duration}
                                onChange={(event) => setDuration(event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="60">60 minutes</option>
                                <option value="90">90 minutes</option>
                                <option value="120">2 hours</option>
                                <option value="180">3 hours</option>
                            </select>
                        </div>
                    </div>

                    <div className="my-10 border-t border-gray-200" />

                    <h2 className="text-2xl font-bold text-gray-900">Focus topics</h2>
                    <p className="mt-1 text-gray-500">Leave empty for a balanced contest across all topics.</p>

                    <select
                        aria-label="Add a focus topic"
                        className="mt-6 w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        value=""
                        onChange={(event) => {
                            const tag = event.target.value;
                            if (tag && !selectedTopics.includes(tag)) {
                                setSelectedTopics((previous) => [...previous, tag]);
                            }
                        }}
                    >
                        <option value="">Select a topic</option>

                        {topics.map((topic) => (
                            <option key={topic.tag} value={topic.tag} disabled={selectedTopics.includes(topic.tag)}>
                                {topic.label}
                            </option>
                        ))}
                    </select>

                    {selectedTopics.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            {selectedTopics.map((tag) => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700"
                                >
                                    {topics.find((topic) => topic.tag === tag)?.label ?? tag}

                                    <button
                                        type="button"
                                        aria-label={`Remove ${tag}`}
                                        onClick={() => removeTopic(tag)}
                                        className="cursor-pointer font-bold hover:text-red-500"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-10 rounded-2xl bg-blue-50 p-6">
                        <h3 className="font-semibold text-blue-700">Contest summary</h3>

                        <dl className="mt-3 space-y-2 text-gray-700">
                            <div className="flex gap-2">
                                <dt className="font-medium">Difficulty:</dt>
                                <dd>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="font-medium">Duration:</dt>
                                <dd>{duration} minutes</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="font-medium">Topics:</dt>
                                <dd>{selectedTopics.length === 0 ? "All topics" : `${selectedTopics.length} selected`}</dd>
                            </div>
                        </dl>
                    </div>

                    {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}

                    <button
                        type="submit"
                        onClick={(event) => submit(event, "/generate-contest")}
                        disabled={loading}
                        className="mt-10 w-full rounded-2xl bg-blue-600 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {loading ? "Generating contest..." : "Generate contest"}
                    </button>

                    <button
                        type="button"
                        onClick={(event) => submit(event, "/generate-test-contest")}
                        disabled={loading}
                        className="mt-3 w-full rounded-2xl border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Quick warm-up (six problems, 800–1000)
                    </button>
                </form>
            </div>
        </div>
    );
}

import { useState } from "react";
import {useNavigate} from 'react-router-dom';
import axios from 'axios';

const topics = [
  "2-sat",
  "binary search",
  "bitmasks",
  "brute force",
  "chinese remainder theorem",
  "combinatorics",
  "constructive algorithms",
  "data structures",
  "dfs and similar",
  "divide and conquer",
  "dp",
  "dsu",
  "expression parsing",
  "fft",
  "flows",
  "games",
  "geometry",
  "graph matchings",
  "graphs",
  "greedy",
  "hashing",
  "implementation",
  "interactive",
  "math",
  "matrices",
  "meet-in-the-middle",
  "number theory",
  "probabilities",
  "schedules",
  "shortest paths",
  "sortings",
  "string suffix structures",
  "strings",
  "ternary search",
  "trees",
  "two pointers",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState("balanced");
  const [duration, setDuration] = useState("120");
  const [loading, setLoading] = useState(false);

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic],
    );
  };

  const generateContest = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const payload = {
        tags: selectedTopics,
        difficulty,
        duration,
      };

      const response = await axios.post(
        "http://localhost:8000/generate-test-contest",
        payload,
        {
          withCredentials: true,
        }
      );

      navigate(`/contest/${response.data.contestId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate contest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/landingpage")}
              className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-4xl font-bold text-blue-600">
              Generate Contest
            </h1>

            <p className="mt-2 text-lg text-gray-500">
              Create a personalized Codeforces contest tailored to your practice.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

          {/* Contest Settings */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Contest Settings
            </h2>

            <p className="mt-1 text-gray-500">
              Configure your contest preferences.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              <div>
                <label className="mb-3 block font-semibold text-gray-800">
                  Difficulty
                </label>

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="easy">Easy</option>
                  <option value="balanced">Balanced</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="mb-3 block font-semibold text-gray-800">
                  Duration
                </label>

                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="90">90 Minutes</option>
                  <option value="120">2 Hours</option>
                  <option value="180">3 Hours</option>
                </select>
              </div>

            </div>
          </div>

          {/* Divider */}
          <div className="my-10 border-t border-gray-200"></div>

          {/* Topics */}
          <div>

            <h2 className="text-2xl font-bold text-gray-900">
              Focus Topics
            </h2>

            <p className="mt-1 text-gray-500">
              Leave empty for a balanced contest across all topics.
            </p>

            <select
              className="mt-6 w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              defaultValue=""
              onChange={(e) => {
                const topic = e.target.value;

                if (topic && !selectedTopics.includes(topic)) {
                  setSelectedTopics((prev) => [...prev, topic]);
                }

                e.target.value = "";
              }}
            >
              <option value="">Select a Topic</option>

              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>

            {selectedTopics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">

                {selectedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700"
                  >
                    {topic}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTopics((prev) =>
                          prev.filter((t) => t !== topic)
                        )
                      }
                      className="font-bold hover:text-red-500 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              </div>
            )}

          </div>

          {/* Summary */}
          <div className="mt-10 rounded-2xl bg-blue-50 p-6">

            <h3 className="font-semibold text-blue-700">
              Contest Summary
            </h3>

            <div className="mt-3 space-y-2 text-gray-700">

              <p>
                <span className="font-medium">Difficulty:</span>{" "}
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </p>

              <p>
                <span className="font-medium">Duration:</span>{" "}
                {duration} Minutes
              </p>

              <p>
                <span className="font-medium">Topics:</span>{" "}
                {selectedTopics.length === 0
                  ? "All Topics"
                  : `${selectedTopics.length} Selected`}
              </p>

            </div>

          </div>

          {/* Button */}
          <button
            onClick={generateContest}
            disabled={loading}
            className="mt-10 w-full rounded-2xl bg-blue-600 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Generating Contest..." : "Generate Contest"}
          </button>

        </div>
      </div>
    </div>
  );
}
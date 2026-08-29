import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ContestHistoryPage() {
  const navigate = useNavigate();
  
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getContestHistory = async () => {
    try {
      setLoading(true);

      const response = await axios.get("http://localhost:8000/history", {
        withCredentials: true,
      });

      setContests(response.data.contests);
    } catch (error) {
      console.error("Error fetching contest history:", error);

      setError("Failed to load contest history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getContestHistory();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-600">
          Loading contest history...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Contest History
            </h1>

            <p className="mt-2 text-lg text-gray-500">
              View and revisit your previously generated contests.
            </p>
          </div>

          <button
            onClick={() => navigate("/landingPage")}
            className="
              rounded-xl
              border
              border-gray-300
              bg-white
              px-5
              py-3
              font-semibold
              text-gray-700
              transition
              hover:bg-gray-50
            "
          >
            ← Dashboard
          </button>
        </div>

        {/* Error */}

        {error && (
          <div className="rounded-2xl bg-red-100 p-5 text-red-700">{error}</div>
        )}

        {/* No contests */}

        {!error && contests.length === 0 && (
          <div
            className="
              rounded-3xl
              border
              border-gray-200
              bg-white
              p-16
              text-center
              shadow-sm
            "
          >
            <div className="text-6xl">📭</div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              No contests yet
            </h2>

            <p className="mt-2 text-gray-500">
              Generate your first personalized Codeforces contest.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
              className="
                mt-7
                rounded-xl
                bg-blue-600
                px-6
                py-3
                font-semibold
                text-white
                hover:bg-blue-700
              "
            >
              Generate Contest
            </button>
          </div>
        )}

        {/* Contest cards */}

        <div className="space-y-5">
          {contests.map((contest, index) => (
            <div
              key={contest.id}
              className="
                flex
                items-center
                justify-between
                rounded-3xl
                border
                border-gray-200
                bg-white
                p-7
                shadow-sm
                transition
                hover:-translate-y-1
                hover:shadow-md
              "
            >
              {/* Contest information */}

              <div>
                <div className="flex items-center gap-4">
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-100
                      text-xl
                      font-bold
                      text-blue-600
                    "
                  >
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Contest #{contest.id}
                    </h2>

                    <p className="mt-1 text-gray-500">
                      Created {formatDate(contest.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <span
                    className="
                      rounded-full
                      bg-gray-100
                      px-4
                      py-2
                      text-sm
                      font-semibold
                      text-gray-600
                    "
                  >
                    ⏱ {contest.duration} minutes
                  </span>

                  <span
                    className={`
                      rounded-full
                      px-4
                      py-2
                      text-sm
                      font-semibold

                      ${
                        contest.is_ended
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }
                    `}
                  >
                    {contest.is_ended ? "Completed" : "Active"}
                  </span>
                </div>
              </div>

              {/* Open contest */}

              <button
                onClick={() => navigate(`/contest/${contest.id}`)}
                className="
                  rounded-xl
                  bg-blue-600
                  px-6
                  py-3
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-700
                "
              >
                View Contest →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

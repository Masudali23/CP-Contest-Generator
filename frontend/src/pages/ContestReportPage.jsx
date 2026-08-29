import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function ContestReportPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);

      // Try fetching existing report
      try {
        const response = await axios.get(
          `http://localhost:8000/contest/${contestId}/report`,
          {
            withCredentials: true,
          }
        );

        setReport(response.data.report);
      }

      catch (err) {
        // If report doesn't exist, generate it

        if (err.response && err.response.status === 404) {
          const response = await axios.post(
            `http://localhost:8000/contest/${contestId}/report`,
            {},
            {
              withCredentials: true,
            }
          );

          setReport(response.data.report);
        } else {
          throw err;
        }
      }
    }

    catch (err) {
      console.error(err);
      setError("Failed to load AI report.");
    }

    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [contestId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-600">
          Loading AI Report...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-red-100 p-8 text-red-700">
          {error}
        </div>
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
              Contest #{contestId} AI Report
            </h1>

            <p className="mt-2 text-lg text-gray-500">
              Personalized performance analysis.
            </p>
          </div>

          <button
            onClick={() => navigate("/reports")}
            className="
              rounded-xl
              border
              border-gray-300
              bg-white
              px-5
              py-3
              font-semibold
              text-gray-700
              hover:bg-gray-50
            "
          >
            ← Reports
          </button>
        </div>

        {/* Overall Score */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Overall Score</h2>

          <div className="mt-5 flex items-center gap-6">
            <div className="text-6xl font-bold text-blue-600">
              {report.overallScore}/10
            </div>

            <div className="flex-1">
              <div className="h-4 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${report.overallScore * 10}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Summary</h2>

          <p className="text-gray-700 leading-8">
            {report.summary}
          </p>
        </div>

        {/* Strengths + Weaknesses */}

        <div className="mb-6 grid gap-6 md:grid-cols-2">

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-green-600">
              Strengths
            </h2>

            <ul className="space-y-3">
              {report.strengths.map((item, index) => (
                <li key={index}>
                  ✅ {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-red-600">
              Weaknesses
            </h2>

            <ul className="space-y-3">
              {report.weaknesses.map((item, index) => (
                <li key={index}>
                  ❌ {item}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Difficulty Analysis */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">
            Difficulty Analysis
          </h2>

          <p className="leading-8 text-gray-700">
            {report.difficultyAnalysis}
          </p>
        </div>

        {/* Problem Analysis */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold">
            Problem Analysis
          </h2>

          <div className="space-y-4">
            {report.problemAnalysis.map((problem, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {problem.index}. {problem.name}
                  </h3>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {problem.rating}
                  </span>
                </div>

                <p className="mt-3 text-gray-600">
                  {problem.comment}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">
            Recommendations
          </h2>

          <ol className="list-decimal space-y-3 pl-6">
            {report.recommendations.map((item, index) => (
              <li key={index}>
                {item}
              </li>
            ))}
          </ol>
        </div>

        {/* Practice Topics */}

        <div className="mb-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">
            Practice Topics
          </h2>

          <div className="flex flex-wrap gap-3">
            {report.practiceTopics.map((topic, index) => (
              <span
                key={index}
                className="rounded-full bg-blue-100 px-4 py-2 font-semibold text-blue-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Motivation */}

        <div className="rounded-3xl bg-linear-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">
            Motivation
          </h2>

          <p className="leading-8">
            {report.motivation}
          </p>
        </div>

      </div>
    </div>
  );
}
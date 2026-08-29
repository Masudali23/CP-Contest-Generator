import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">

        <h1 className="text-center text-5xl font-bold text-blue-600">
          CP Contest Generator
        </h1>

        <p className="mt-4 text-center text-lg text-gray-500">
          Personalized Codeforces contests with AI-powered performance analysis.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="
            mt-10
            flex
            w-full
            items-center
            justify-center
            gap-3
            rounded-2xl
            border
            border-gray-300
            bg-white
            py-4
            text-lg
            font-semibold
            text-gray-700
            transition
            hover:bg-gray-50
          "
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-6 w-6"
          />

          Continue with Google
        </button>

        <div className="mt-12 grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-blue-50 p-5">
            <h3 className="font-semibold text-blue-700">
              Personalized Contests
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Generate contests tailored to your Codeforces profile.
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-5">
            <h3 className="font-semibold text-green-700">
              AI Reports
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Analyze your contest performance using AI.
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-5">
            <h3 className="font-semibold text-purple-700">
              Contest History
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              View all previous contests and reports.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
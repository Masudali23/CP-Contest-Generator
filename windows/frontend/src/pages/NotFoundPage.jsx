import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="text-6xl">🧭</div>
                <h1 className="mt-5 text-3xl font-bold text-gray-900">Page not found</h1>
                <p className="mt-2 text-gray-500">That route does not exist.</p>
                <button
                    onClick={() => navigate("/landingpage")}
                    className="mt-7 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                >
                    Back to dashboard
                </button>
            </div>
        </div>
    );
}

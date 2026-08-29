import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { startGoogleLogin } from "../api/client.js";

const OAUTH_ERRORS = {
    google_login_failed: "Google sign-in did not complete. Please try again.",
    missing_code: "Google did not return an authorisation code. Please try again.",
    no_email: "Your Google account did not share an email address.",
    access_denied: "Sign-in was cancelled.",
};

export default function Home() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [checking, setChecking] = useState(true);

    const oauthError = searchParams.get("error");

    // If a valid session cookie is already present, skip the landing screen.
    useEffect(() => {
        let cancelled = false;

        api.get("/auth/me")
            .then(({ data }) => {
                if (cancelled) return;
                navigate(data.handle ? "/landingpage" : "/setup", { replace: true });
            })
            .catch(() => {
                if (!cancelled) setChecking(false);
            });

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
                <h1 className="text-center text-5xl font-bold text-blue-600">CP Contest Generator</h1>

                <p className="mt-4 text-center text-lg text-gray-500">
                    Personalised Codeforces contests with a detailed, topic-aware performance report.
                </p>

                {oauthError && (
                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-center text-red-700">
                        {OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again."}
                    </div>
                )}

                <button
                    onClick={startGoogleLogin}
                    disabled={checking}
                    className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                    />
                    {checking ? "Checking your session..." : "Continue with Google"}
                </button>

                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl bg-blue-50 p-5">
                        <h3 className="font-semibold text-blue-700">Personalised contests</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Problems picked around your live Codeforces rating, never ones you have already solved.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-green-50 p-5">
                        <h3 className="font-semibold text-green-700">Topic-level reports</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            See exactly which topics cost you problems, with a practice ladder for each one.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-purple-50 p-5">
                        <h3 className="font-semibold text-purple-700">Contest history</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Revisit every contest you generated and the report that came with it.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

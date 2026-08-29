import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";

export default function Setup() {
    const navigate = useNavigate();

    const [handle, setHandle] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const saveHandle = async (event) => {
        event.preventDefault();

        const trimmed = handle.trim();
        if (!trimmed) {
            setError("Please enter your Codeforces handle.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            // The original version navigated even when the request failed,
            // leaving the account without a handle.
            await api.post("/user/setup", { handle: trimmed });

            navigate("/landingpage", { replace: true });
        } catch (err) {
            setError(errorMessage(err, "Could not save your handle."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <form onSubmit={saveHandle} className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">
                <h1 className="text-center text-3xl font-bold">Complete your profile</h1>

                <p className="mt-2 text-center text-gray-500">
                    Enter your Codeforces handle so contests can be matched to your rating and solved problems.
                </p>

                <div className="mt-8">
                    <label htmlFor="handle" className="mb-3 block font-semibold">
                        Codeforces handle
                    </label>

                    <input
                        id="handle"
                        value={handle}
                        onChange={(event) => setHandle(event.target.value)}
                        placeholder="tourist"
                        autoComplete="off"
                        autoFocus
                        className="w-full rounded-2xl border border-gray-300 px-5 py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}

                <button
                    type="submit"
                    disabled={saving}
                    className="mt-8 w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                    {saving ? "Verifying with Codeforces..." : "Continue"}
                </button>
            </form>
        </div>
    );
}

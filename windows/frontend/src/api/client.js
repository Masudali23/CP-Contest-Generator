import axios from "axios";

/*
 * Single axios instance for the whole app.
 *
 * Every page used to hard-code "http://localhost:8000", which made the build
 * impossible to deploy. The base URL now comes from VITE_API_URL, which Vite
 * inlines at build time.
 */
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 60_000,
});

/** Turns any axios failure into a readable sentence for the UI. */
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (error?.message === "Network Error") {
        return `Could not reach the API at ${API_URL}. Is the backend running?`;
    }
    return error?.message || fallback;
};

/** Redirect to the Google sign-in flow (a full page navigation, not XHR). */
export const startGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
};

export default api;

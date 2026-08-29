import { useCallback } from "react";
import api from "../api/client.js";
import useApiResource from "./useApiResource.js";

const fetchMe = () => api.get("/auth/me").then((response) => response.data);

/**
 * Loads the signed-in user. Pages used to call /auth/me with no error handling,
 * so an expired session rendered a blank screen instead of redirecting.
 */
export const useAuth = () => {
    const { data: user, loading, error, reload, setData } = useApiResource(fetchMe, {
        fallbackError: "Could not load your profile.",
    });

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            setData(null);
        }
    }, [setData]);

    return { user, loading, error, refresh: reload, logout };
};

export default useAuth;

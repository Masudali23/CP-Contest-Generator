import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../api/client.js";

/**
 * Loads a resource once on mount and exposes { data, loading, refreshing, error, reload }.
 *
 * `fetcher` must be a stable function (wrap it in useCallback) that returns a
 * promise resolving to the data. Keeping the promise chain inside this effect
 * means the request is cancelled on unmount, so state is never set on a
 * component that has already gone away.
 *
 * `loading`    first load, or a reload that should show the full-page spinner
 * `refreshing` a silent reload, for background polling and refresh buttons
 *
 * @param {() => Promise<unknown>} fetcher
 * @param {{ fallbackError?: string }} [options]
 */
export const useApiResource = (fetcher, { fallbackError } = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [reloadToken, setReloadToken] = useState(0);

    /** Re-runs the fetcher. Safe to call from an event handler or a timer. */
    const reload = useCallback(({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);

        setError("");
        setReloadToken((token) => token + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        fetcher()
            .then((payload) => {
                if (cancelled) return;
                setData(payload);
                setError("");
            })
            .catch((requestError) => {
                if (cancelled) return;
                setError(errorMessage(requestError, fallbackError));
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
                setRefreshing(false);
            });

        return () => {
            cancelled = true;
        };
    }, [fetcher, fallbackError, reloadToken]);

    return { data, loading, refreshing, error, reload, setData };
};

export default useApiResource;

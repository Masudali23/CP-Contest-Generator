import axios from "axios";
import env from "../config/env.js";
import { cacheClient } from "../config/cache.js";

/*
 * Single place where the Codeforces API is called.
 *
 * The original controllers duplicated the fetch-or-cache block four times and
 * each copy logged `err.message` inside a `catch (error)` block - a
 * ReferenceError that turned every cache miss into a 500 response.
 */

const PROBLEMSET_CACHE_KEY = "cf:problemset";
const PROBLEMSET_CACHE_TTL = 60 * 60 * 24; // 24 hours
const USER_STATUS_CACHE_TTL = 60 * 3; // 3 minutes
const USER_INFO_CACHE_TTL = 60 * 10; // 10 minutes

const http = axios.create({
    baseURL: env.CF_API_BASE,
    timeout: 20_000,
    headers: { "User-Agent": "cp-contest-generator" },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Codeforces rate-limits aggressively and intermittently answers with
 * "Call limit exceeded". Retry a couple of times with backoff before failing.
 */
const callCf = async (endpoint, params = {}, { retries = 2 } = {}) => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const { data } = await http.get(endpoint, { params });

            if (data.status !== "OK") {
                throw new Error(data.comment || `Codeforces returned status ${data.status}`);
            }

            return data.result;
        } catch (error) {
            lastError = error;

            const status = error.response?.status;
            const comment = error.response?.data?.comment || error.message;

            // A genuinely bad handle should fail immediately, not after retries.
            if (status === 400 && /not found|should contain|handles/i.test(comment)) {
                const badHandle = new Error(comment);
                badHandle.code = "CF_BAD_REQUEST";
                throw badHandle;
            }

            if (attempt < retries) {
                await sleep(500 * (attempt + 1));
            }
        }
    }

    const failure = new Error(
        `Codeforces API request failed: ${lastError?.response?.data?.comment || lastError?.message}`
    );
    failure.code = "CF_UNAVAILABLE";
    throw failure;
};

const cached = async (key, ttl, producer) => {
    const hit = await cacheClient.get(key);

    if (hit) {
        try {
            return JSON.parse(hit);
        } catch {
            await cacheClient.del(key);
        }
    }

    const fresh = await producer();
    await cacheClient.set(key, JSON.stringify(fresh), ttl);
    return fresh;
};

/** Full Codeforces problemset, tags included. Cached for a day. */
export const getProblemset = async () =>
    cached(PROBLEMSET_CACHE_KEY, PROBLEMSET_CACHE_TTL, async () => {
        const result = await callCf("/problemset.problems");
        return result.problems;
    });

/** Public profile for a handle. Throws CF_BAD_REQUEST for unknown handles. */
export const getUserInfo = async (handle) => {
    const users = await cached(`cf:userinfo:${handle.toLowerCase()}`, USER_INFO_CACHE_TTL, () =>
        callCf("/user.info", { handles: handle })
    );

    if (!users?.length) {
        const error = new Error(`Codeforces handle "${handle}" was not found.`);
        error.code = "CF_BAD_REQUEST";
        throw error;
    }

    return users[0];
};

/** Every submission for a handle, newest first. Short TTL so progress stays live. */
export const getUserSubmissions = async (handle, { fresh = false } = {}) => {
    const key = `cf:userstatus:${handle.toLowerCase()}`;

    if (fresh) {
        await cacheClient.del(key);
    }

    return cached(key, USER_STATUS_CACHE_TTL, () => callCf("/user.status", { handle }));
};

export const problemKey = (contestId, index) => `${contestId}-${index}`;

export const problemUrl = (contestId, index) =>
    // Gym / problemset URLs differ; contests below 100000 live under /problemset/problem.
    contestId >= 100000
        ? `https://codeforces.com/gym/${contestId}/problem/${index}`
        : `https://codeforces.com/problemset/problem/${contestId}/${index}`;

/** Set of "contestId-index" keys the user has an accepted submission for. */
export const buildSolvedSet = (submissions) => {
    const solved = new Set();

    for (const submission of submissions) {
        if (submission.verdict === "OK" && submission.problem?.contestId) {
            solved.add(problemKey(submission.problem.contestId, submission.problem.index));
        }
    }

    return solved;
};

export { PROBLEMSET_CACHE_KEY, USER_STATUS_CACHE_TTL };

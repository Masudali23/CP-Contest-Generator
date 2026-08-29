import { getUserInfo } from "../services/codeforces.service.js";
import { getUserByHandle, updateHandle } from "../model/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ALL_TAGS, topicMeta } from "../utils/topics.js";

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,24}$/;

const setupProfile = asyncHandler(async (req, res) => {
    const handle = (req.body?.handle ?? "").trim();

    if (!handle) {
        return res.status(400).json({ error: "Codeforces handle is required" });
    }

    if (!HANDLE_PATTERN.test(handle)) {
        return res.status(400).json({ error: "That does not look like a valid Codeforces handle" });
    }

    // handle is UNIQUE, so check before writing and return a readable message.
    const existing = await getUserByHandle(handle);
    if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ error: "That Codeforces handle is already linked to another account" });
    }

    let profile;
    try {
        profile = await getUserInfo(handle);
    } catch (error) {
        if (error.code === "CF_BAD_REQUEST") {
            return res.status(404).json({ error: `Codeforces handle "${handle}" was not found` });
        }
        return res.status(503).json({ error: "Codeforces is not responding right now, please try again" });
    }

    const user = await updateHandle({
        id: req.user.id,
        handle: profile.handle,
        rating: profile.rating ?? null,
        maxRating: profile.maxRating ?? null,
        rank: profile.rank ?? null,
    });

    res.status(200).json({
        message: "Profile updated successfully",
        user: {
            handle: user.handle,
            rating: user.rating,
            maxRating: user.max_rating,
            rank: user.rank,
        },
    });
});

/** Tag list for the contest generator UI, so the frontend is not hard-coded. */
const getTopics = asyncHandler(async (req, res) => {
    res.json({ topics: ALL_TAGS.map((tag) => ({ tag, label: topicMeta(tag).label })) });
});

export { setupProfile, getTopics };

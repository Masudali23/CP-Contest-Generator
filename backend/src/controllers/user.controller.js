import axios from "axios";
import { updateHandle } from "../model/user.model.js";

const setupProfile = async (req, res) => {
    try {
        const { handle } = req.body;

        if (!handle) {
            return res.status(400).json({
                error: "Handle is required",
            });
        }

        const userId = req.user.id;

        const response = await axios.get(
            `https://codeforces.com/api/user.info?handles=${handle}`
        );

        const rating = response.data.result[0].rating || 0;

        await updateHandle({
            id: userId,
            handle,
            rating,
        });

        return res.status(200).json({
            message: "Profile updated successfully",
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to setup profile",
        });
    }
};

export { setupProfile };
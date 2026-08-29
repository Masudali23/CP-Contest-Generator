import { useState } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";

export default function Setup() {
  const navigate = useNavigate();

  const [handle, setHandle] = useState("");

  const saveHandle = async () => {
      try {
          await axios.post(
              "http://localhost:8000/user/setup",
              {
                  handle,
              },
              {
                  withCredentials: true,
              }
          );

          navigate("/landingPage");

      } catch (error) {
          console.log(error);
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">

        <h1 className="text-3xl font-bold text-center">
          Complete your profile
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Enter your Codeforces handle to personalize your contests.
        </p>

        <div className="mt-8">

          <label className="mb-3 block font-semibold">
            Codeforces Handle
          </label>

          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="tourist"
            className="
              w-full
              rounded-2xl
              border
              border-gray-300
              px-5
              py-4
              outline-none
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
          />

        </div>

        <button
          onClick={saveHandle}
          className="
            mt-8
            w-full
            rounded-2xl
            bg-blue-600
            py-4
            font-semibold
            text-white
            hover:bg-blue-700
          "
        >
          Continue
        </button>

      </div>

    </div>
  );
}
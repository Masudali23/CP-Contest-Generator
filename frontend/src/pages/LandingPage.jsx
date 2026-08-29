import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useState, useEffect, useRef } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("User");
  const [handle, setHandle] = useState("");
  const [pfp, setPfp] = useState("https://ui-avatars.com/api/?name=User");
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  const getMe = async () => {
    const response = await axios.get("http://localhost:8000/auth/me", {
      withCredentials: true,
    });

    setUsername(response.data.name);
    setPfp(response.data.picture);
    setHandle(response.data.handle);
    console.log(response.data);
    
  };

  useEffect(() => {
    getMe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const logout = async () => {
    await axios.post(
      "http://localhost:8000/auth/logout",
      {},
      { withCredentials: true },
    );

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Navbar */}
        <div className="mb-8 flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-8 py-5 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">
              CP Contest Generator
            </h1>

            <p className="mt-1 text-gray-500">Welcome back!</p>
          </div>

          {/* Placeholder profile */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDropdown((prev) => !prev)}
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                px-3
                py-2
                transition
                hover:bg-gray-100
                "
            >
              <img
                src={pfp}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`;
                }}
                alt="Profile"
                className="h-12 w-12 rounded-full border border-gray-300 object-cover"
              />

              <div className="text-right">
                <p className="font-semibold text-gray-800">{username}</p>

                <p className="text-sm text-gray-500">{handle}</p>
              </div>

              {/* Small chevron */}
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                  showDropdown ? "rotate-180" : ""
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDropdown && (
              <div
                className="
                    absolute
                    right-0
                    mt-2
                    w-48
                    overflow-hidden
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    shadow-lg
                    z-50
                "
              >
                <button
                  onClick={logout}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    px-5
                    py-3
                    text-left
                    text-gray-700
                    transition
                    hover:bg-gray-100
                    "
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900">Dashboard</h2>

          <p className="mt-2 text-lg text-gray-500">
            Select what you'd like to do.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Contest Generator */}
          <div
            onClick={() => navigate("/dashboard")}
            className="
              cursor-pointer
              rounded-3xl
              border
              border-gray-200
              bg-white
              p-8
              shadow-sm
              transition
              hover:-translate-y-1
              hover:shadow-md
            "
          >
            <div className="text-5xl">🚀</div>

            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              Generate Contest
            </h3>

            <p className="mt-3 text-gray-500">
              Build a personalized Codeforces contest based on your preferred
              topics and difficulty.
            </p>

            <button className="mt-8 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Open
            </button>
          </div>

          {/* AI Reports */}
          <div
            onClick={() => navigate("/reports")}
            className="
              cursor-pointer
              rounded-3xl
              border
              border-gray-200
              bg-white
              p-8
              shadow-sm
              transition
              hover:-translate-y-1
              hover:shadow-md
            "
          >
            <div className="text-5xl">📊</div>

            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              AI Reports
            </h3>

            <p className="mt-3 text-gray-500">
              Analyze contest performance, identify weak topics and receive
              AI-powered recommendations.
            </p>

            <button className="mt-8 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Open
            </button>
          </div>

          {/* Contest History */}
          <div
            onClick={() => navigate("/history")}
            className="
              cursor-pointer
              rounded-3xl
              border
              border-gray-200
              bg-white
              p-8
              shadow-sm
              transition
              hover:-translate-y-1
              hover:shadow-md
            "
          >
            <div className="text-5xl">📜</div>

            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              Contest History
            </h3>

            <p className="mt-3 text-gray-500">
              View all previously generated contests, solved problems and
              performance history.
            </p>

            <button className="mt-8 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        // Fail loudly instead of silently moving to 5174, which would break the
        // CORS_ORIGIN and Google redirect URI configured for port 5173.
        strictPort: true,
    },
    preview: {
        port: 4173,
    },
    build: {
        outDir: "dist",
        sourcemap: false,
    },
});

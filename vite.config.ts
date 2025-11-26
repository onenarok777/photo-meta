import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      {
        name: "html-transform",
        transformIndexHtml(html) {
          let newHtml = html.replace(
            /%VITE_GOOGLE_TAG_MANAGER_ID%/g,
            env.VITE_GOOGLE_TAG_MANAGER_ID || ""
          );
          newHtml = newHtml.replace(
            /%VITE_GOOGLE_ADSENSE_ID%/g,
            env.VITE_GOOGLE_ADSENSE_ID || ""
          );
          return newHtml;
        },
      },
    ],
  };
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pipeline: {
          shell: "#0C0D0F",
          panel: "#0F1012",
          card: "#0B0C10",
          border: "#1D2024",
          subtleBorder: "#232527",
          accent: {
            emerald: "#34d399",
            cyan: "#22d3ee",
          },
          text: {
            primary: "#f9fafb",
            secondary: "#d1d5db",
            tertiary: "#9ca3af",
          },
        },
      },
      borderRadius: {
        card: "0.75rem",
        column: "0.9rem",
        pill: "9999px",
      },
      boxShadow: {
        "pipeline-shell": "0 18px 60px rgba(0,0,0,0.45)",
        "pipeline-card": "0 14px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

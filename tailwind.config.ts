import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Microsoft YaHei", "sans-serif"],
        display: ["var(--font-display)", "Microsoft YaHei", "sans-serif"]
      },
      colors: {
        ink: "#152225",
        paper: "#eef4f6",
        moss: "#5d7478",
        jade: "#078f7b",
        persimmon: "#c54838",
        brass: "#a9812c",
        night: "#223135"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(68, 96, 104, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#f2f7f4",
          100: "#dfeee3",
          600: "#2f6b45",
          700: "#255737",
          900: "#173222",
        },
      },
    },
  },
  plugins: [],
};
export default config;

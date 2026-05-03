import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50:  '#fff5f5',
          100: '#ffe0e2',
          200: '#ffc0c4',
          300: '#ff9099',
          400: '#ff5564',
          500: '#f72535',
          600: '#d4162b',
          700: '#b0142a',
          800: '#7B1F2A',
          900: '#671a22',
          950: '#3d0c13',
        },
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

// Palette from the master prompt §5 (mockup color spec). Named tokens, not
// raw hex, so components read intent (`bg-navy-900`, `bg-brand-approve`)
// rather than magic numbers.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0f2338",
          900: "#14304D",
          800: "#1B3A5C",
          700: "#234b73"
        },
        surface: {
          DEFAULT: "#F7F9FC"
        },
        brand: {
          primary: "#2E63E0",
          approve: "#22A559"
        },
        status: {
          urgent: "#DC2626",
          high: "#F97316",
          medium: "#EAB308",
          normal: "#16A34A",
          info: "#2563EB"
        },
        calendar: {
          production: "#2563EB",
          changeover: "#F97316",
          cleaning: "#9333EA",
          maintenance: "#6B7280",
          idle: "#E5E7EB",
          matched: "#16A34A",
          pending: "#EAB308",
          missed: "#DC2626",
          unplanned: "#2563EB"
        }
      },
      fontFamily: {
        thai: ["var(--font-noto-thai)", "IBM Plex Sans Thai", "Prompt", "sans-serif"],
        sans: ["var(--font-inter)", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

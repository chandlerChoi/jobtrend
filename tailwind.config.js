/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        ink: {
          950: "#06060f",
          900: "#0b0b1a",
          800: "#12122a"
        },
        brand: {
          500: "#6366f1",
          600: "#4f46e5"
        }
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeUp: "fadeUp 0.4s ease-out"
      }
    }
  },
  plugins: []
};

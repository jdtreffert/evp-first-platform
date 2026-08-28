
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        // Light mode tokens
        text: "var(--text)",
        textHeading: "var(--text-h)",
        bg: "var(--bg)",
        border: "var(--border)",
        codeBg: "var(--code-bg)",
        accent: "var(--accent)",
        accentBg: "var(--accent-bg)",
        accentBorder: "var(--accent-border)",
        socialBg: "var(--social-bg)",

        // Dark mode equivalents (from your old CSS)
        darkText: "#9ca3af",
        darkTextHeading: "#f3f4f6",
        darkBg: "#16171d",
        darkBorder: "#2e303a",
        darkCodeBg: "#1f2028",
        darkAccent: "#c084fc",
        darkAccentBg: "rgba(192, 132, 252, 0.15)",
        darkAccentBorder: "rgba(192, 132, 252, 0.5)",
        darkSocialBg: "rgba(47, 48, 58, 0.5)",
      },

      boxShadow: {
        brand: "var(--shadow)",
        darkBrand:
          "rgba(0, 0, 0, 0.4) 0 10px 15px -3px, rgba(0, 0, 0, 0.25) 0 4px 6px -2px",
      },

      fontFamily: {
        sans: "var(--sans)",
        heading: "var(--heading)",
        mono: "var(--mono)",
      },
    },
  },

  plugins: [],
}

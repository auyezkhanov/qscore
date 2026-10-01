/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        // Semantic, theme-aware tokens (see src/index.css). Use these instead of raw grays.
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        line: token("line"),
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3") },
        // Brand teal, derived from the Q logo (#17A2B0) via the ui-design-system token generator, hand-tuned for even steps.
        brand: {
          50: "#ecfbfc",
          100: "#cff4f7",
          200: "#a5e8ef",
          300: "#6dd6e2",
          400: "#33bccd",
          500: "#17a2b0",
          600: "#138391",
          700: "#146976",
          800: "#175661",
          900: "#174852",
          950: "#082f37",
          DEFAULT: token("brand"),
          fg: token("brand-fg"),
        },
        live: token("live"),
        win: token("win"),
        draw: token("draw"),
        loss: token("loss"),
        card: { yellow: "#facc15", red: "#ef4444" },
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 30 / 0.04), 0 1px 3px 0 rgb(15 23 30 / 0.06)",
        pop: "0 10px 30px -8px rgb(15 23 30 / 0.25), 0 4px 10px -4px rgb(15 23 30 / 0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "pop-in": "pop-in 160ms ease-out",
      },
    },
  },
  plugins: [],
};

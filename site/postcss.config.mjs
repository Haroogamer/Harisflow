/**
 * PostCSS config — required for Tailwind v4.
 * Without this, `@import "tailwindcss"` in app/globals.css is never compiled
 * and every Tailwind utility class silently does nothing.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

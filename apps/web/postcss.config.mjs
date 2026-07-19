/** PostCSS — Tailwind v4 is loaded via its dedicated plugin.
 *  Only stylesheets that `@import "tailwindcss"` receive Tailwind output;
 *  the public site's globals.css is passed through untouched. */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;

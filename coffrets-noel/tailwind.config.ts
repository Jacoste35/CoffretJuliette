import type { Config } from "tailwindcss";

// Palette issue de la direction artistique décrite dans le brief :
// bordeaux profond, crème, vert sapin, or vieilli, brun chocolat.
// L'image de référence annoncée n'ayant pas été fournie, ces valeurs sont
// une interprétation de la description écrite et restent à ajuster.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1180px" } },
    extend: {
      colors: {
        bordeaux: { DEFAULT: "#6B1F2E", dark: "#4A1420", light: "#8E3145" },
        creme: { DEFAULT: "#F7F1E6", dark: "#EFE5D3", light: "#FCF8F1" },
        sapin: { DEFAULT: "#1F3D2B", light: "#2F5A3F" },
        or: { DEFAULT: "#B08D4F", light: "#CFAE74", dark: "#8A6C38" },
        chocolat: { DEFAULT: "#3D2A1E", light: "#5C4232" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        carte: "0 1px 2px rgba(61,42,30,.06), 0 8px 24px -12px rgba(61,42,30,.18)",
        releve: "0 2px 4px rgba(61,42,30,.08), 0 18px 40px -16px rgba(61,42,30,.28)",
      },
    },
  },
  plugins: [],
};
export default config;

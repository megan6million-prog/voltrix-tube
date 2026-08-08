// Central app configuration
export const API_URL = __DEV__
  ? "http://192.168.1.100:8090/v1"   // ← change to your machine's local IP
  : "https://api.voltrix.ug/v1";     // production URL when deployed

export const APP_NAME = "Voltrix";
export const CURRENCY = "UGX";
export const COUNTRY = "UG";

export const COLORS = {
  background:   "#0f0f0f",
  surface:      "#1a1a1a",
  surfaceLight: "#252525",
  border:       "rgba(255,255,255,0.1)",
  primary:      "#0ea5e9",   // sky blue
  primaryDark:  "#0284c7",
  accent:       "#38bdf8",
  text:         "#ffffff",
  textMuted:    "#9ca3af",
  textDim:      "#6b7280",
  success:      "#22c55e",
  warning:      "#f59e0b",
  error:        "#ef4444",
  red:          "#dc2626",
};

export const FONTS = {
  regular: { fontWeight: "400" as const },
  medium:  { fontWeight: "500" as const },
  semibold:{ fontWeight: "600" as const },
  bold:    { fontWeight: "700" as const },
  black:   { fontWeight: "900" as const },
};

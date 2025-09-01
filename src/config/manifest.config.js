// src/config/manifest.config.ts

// Using 'export const' to ensure it can be imported by the build script.
/** @type {Object.<string, {appName: string, shortName: string, iconPath: string, themeColor: string}>} */
export const manifestConfig = {
  // Config for the 'development' branch
  development: {
    appName: "MatchOps Cloud (Dev)",
    shortName: "Dev Cloud",
    iconPath: "/pepo-logo-dev.png", // We will create this icon
    themeColor: "#4f46e5", // A distinct purple for dev
  },
  // Config for the 'master' branch (production)
  master: {
    appName: "MatchOps Cloud",
    shortName: "MatchOps Cloud",
    iconPath: "/pepo-logo.png",
    themeColor: "#1e293b", // The standard slate color
  },
  // A fallback for any other branch (e.g., feature branches)
  default: {
    appName: "MatchOps Cloud (Preview)",
    shortName: "Preview Cloud",
    iconPath: "/pepo-logo.png",
    themeColor: "#ca8a04", // A yellow/amber for previews
  },
};
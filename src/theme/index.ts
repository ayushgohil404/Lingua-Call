export const colors = {
  // Brand & Primary
  primary: "#00a884",
  primaryDark: "#008069",
  primaryDeep: "#075e54",
  primaryLight: "#128c7e",
  accent: "#25d366",

  // Backgrounds - Light Mode
  bgApp: "#efeae2",
  bgPanel: "#f0f2f5",
  bgWhite: "#ffffff",
  bgHover: "#f5f6f6",
  bgActive: "#e9edef",

  // Backgrounds - Dark Mode
  bgDarkApp: "#111b21",
  bgDarkPanel: "#202c33",
  bgDarkCard: "#182229",
  bgDarkHover: "#222e35",

  // Message Bubbles
  bubbleOutgoing: "#d9fdd3",
  bubbleOutgoingDark: "#005c4b",
  bubbleIncoming: "#ffffff",
  bubbleIncomingDark: "#202c33",
  bubbleSystem: "#ffeecd",

  // Typography & Content
  textPrimary: "#111b21",
  textPrimaryDark: "#e9edef",
  textSecondary: "#667781",
  textSecondaryDark: "#8696a0",
  textMuted: "#8696a0",
  textLink: "#027eb5",
  textLinkDark: "#53bdeb",

  // Status & Indicators
  unreadBadge: "#25d366",
  unreadBadgeText: "#ffffff",
  onlineDot: "#25d366",
  danger: "#ea0038",
  warning: "#f59e0b",
  info: "#3b82f6",

  // Message Status Checkmarks
  tickSent: "#8696a0",
  tickDelivered: "#8696a0",
  tickRead: "#53bdeb",

  // Borders & Dividers
  borderLight: "#e9edef",
  borderMedium: "#d1d7db",
  borderDark: "#222e35",

  // Input Controls
  inputBgLight: "#ffffff",
  inputBgDark: "#2a3942",
  inputBarBgLight: "#f0f2f5",
  inputBarBgDark: "#202c33",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
} as const;

export const typography = {
  fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif',
  sizes: {
    xs: "11px",
    sm: "13px",
    base: "14.2px",
    md: "16px",
    lg: "19px",
    xl: "24px",
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const theme = {
  colors,
  spacing,
  typography,
} as const;

export default theme;

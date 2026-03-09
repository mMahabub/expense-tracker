import type React from "react";

export interface ChatWallpaper {
  name: string;
  label: string;
  previewStyle: React.CSSProperties;
}

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  {
    name: "none",
    label: "None",
    previewStyle: {},
  },
  {
    name: "subtle-dots",
    label: "Polka Dots",
    previewStyle: {
      backgroundImage:
        "radial-gradient(circle, rgba(128,128,128,0.25) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    },
  },
  {
    name: "diagonal-lines",
    label: "Diagonal Lines",
    previewStyle: {
      backgroundImage:
        "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(128,128,128,0.2) 10px, rgba(128,128,128,0.2) 11px)",
    },
  },
  {
    name: "honeycomb",
    label: "Honeycomb",
    previewStyle: {
      backgroundImage: [
        "linear-gradient(30deg, rgba(128,128,128,0.2) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.2) 87.5%, rgba(128,128,128,0.2))",
        "linear-gradient(150deg, rgba(128,128,128,0.2) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.2) 87.5%, rgba(128,128,128,0.2))",
        "linear-gradient(30deg, rgba(128,128,128,0.2) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.2) 87.5%, rgba(128,128,128,0.2))",
        "linear-gradient(150deg, rgba(128,128,128,0.2) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.2) 87.5%, rgba(128,128,128,0.2))",
        "linear-gradient(60deg, rgba(128,128,128,0.15) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.15) 75%, rgba(128,128,128,0.15))",
        "linear-gradient(60deg, rgba(128,128,128,0.15) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.15) 75%, rgba(128,128,128,0.15))",
      ].join(", "),
      backgroundSize: "40px 70px",
      backgroundPosition: "0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px",
    },
  },
  {
    name: "waves",
    label: "Waves",
    previewStyle: {
      backgroundImage: [
        "radial-gradient(ellipse 100% 50% at 50% 0%, transparent 48%, rgba(128,128,128,0.2) 50%, transparent 52%)",
        "radial-gradient(ellipse 100% 50% at 50% 100%, transparent 48%, rgba(128,128,128,0.2) 50%, transparent 52%)",
      ].join(", "),
      backgroundSize: "60px 30px",
      backgroundPosition: "0 0, 30px 15px",
    },
  },
  {
    name: "bubbles",
    label: "Bubbles",
    previewStyle: {
      backgroundImage: [
        "radial-gradient(circle 15px at 20% 30%, rgba(128,128,128,0.15) 0%, transparent 100%)",
        "radial-gradient(circle 25px at 70% 60%, rgba(128,128,128,0.12) 0%, transparent 100%)",
        "radial-gradient(circle 10px at 50% 10%, rgba(128,128,128,0.18) 0%, transparent 100%)",
        "radial-gradient(circle 20px at 85% 20%, rgba(128,128,128,0.14) 0%, transparent 100%)",
        "radial-gradient(circle 35px at 30% 80%, rgba(128,128,128,0.1) 0%, transparent 100%)",
      ].join(", "),
      backgroundSize: "150px 150px",
    },
  },
  {
    name: "geometric",
    label: "Geometric",
    previewStyle: {
      backgroundImage: [
        "linear-gradient(45deg, rgba(128,128,128,0.2) 25%, transparent 25%)",
        "linear-gradient(-45deg, rgba(128,128,128,0.2) 25%, transparent 25%)",
        "linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.2) 75%)",
        "linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.2) 75%)",
      ].join(", "),
      backgroundSize: "30px 30px",
      backgroundPosition: "0 0, 0 15px, 15px -15px, -15px 0",
    },
  },
  {
    name: "stars",
    label: "Starry Night",
    previewStyle: {
      backgroundImage: [
        "radial-gradient(circle 1px at 10% 20%, rgba(200,200,200,0.3) 0%, transparent 100%)",
        "radial-gradient(circle 1.5px at 30% 70%, rgba(200,200,200,0.25) 0%, transparent 100%)",
        "radial-gradient(circle 1px at 50% 40%, rgba(200,200,200,0.3) 0%, transparent 100%)",
        "radial-gradient(circle 2px at 70% 10%, rgba(200,200,200,0.2) 0%, transparent 100%)",
        "radial-gradient(circle 1px at 85% 55%, rgba(200,200,200,0.3) 0%, transparent 100%)",
        "radial-gradient(circle 1.5px at 20% 90%, rgba(200,200,200,0.25) 0%, transparent 100%)",
        "radial-gradient(circle 1px at 60% 85%, rgba(200,200,200,0.3) 0%, transparent 100%)",
        "radial-gradient(circle 2px at 40% 15%, rgba(200,200,200,0.2) 0%, transparent 100%)",
        "radial-gradient(circle 1px at 90% 80%, rgba(200,200,200,0.3) 0%, transparent 100%)",
        "radial-gradient(circle 1.5px at 5% 50%, rgba(200,200,200,0.25) 0%, transparent 100%)",
      ].join(", "),
      backgroundSize: "100px 100px",
    },
  },
  {
    name: "gradient-warm",
    label: "Warm Glow",
    previewStyle: {
      backgroundImage:
        "linear-gradient(135deg, rgba(255,150,100,0.2), rgba(255,100,150,0.2))",
    },
  },
  {
    name: "gradient-cool",
    label: "Cool Breeze",
    previewStyle: {
      backgroundImage:
        "linear-gradient(135deg, rgba(100,150,255,0.2), rgba(100,255,200,0.2))",
    },
  },
  {
    name: "gradient-purple",
    label: "Purple Mist",
    previewStyle: {
      backgroundImage:
        "linear-gradient(135deg, rgba(150,100,255,0.2), rgba(200,100,255,0.2))",
    },
  },
  {
    name: "paper",
    label: "Paper",
    previewStyle: {
      backgroundImage: [
        "linear-gradient(0deg, rgba(128,128,128,0.15) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(128,128,128,0.15) 1px, transparent 1px)",
        "linear-gradient(0deg, rgba(128,128,128,0.08) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(128,128,128,0.08) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "20px 20px, 20px 20px, 4px 4px, 4px 4px",
    },
  },
  {
    name: "doodle-money",
    label: "Finance",
    previewStyle: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "10px",
      color: "rgba(128,128,128,0.3)",
      letterSpacing: "4px",
      overflow: "hidden",
    },
  },
  {
    name: "cloudy",
    label: "Cloudy",
    previewStyle: {
      backgroundImage: [
        "radial-gradient(ellipse 80px 60px at 20% 40%, rgba(128,128,128,0.15) 0%, transparent 70%)",
        "radial-gradient(ellipse 100px 50px at 70% 30%, rgba(128,128,128,0.12) 0%, transparent 70%)",
        "radial-gradient(ellipse 60px 40px at 50% 80%, rgba(128,128,128,0.15) 0%, transparent 70%)",
        "radial-gradient(ellipse 90px 55px at 85% 70%, rgba(128,128,128,0.12) 0%, transparent 70%)",
      ].join(", "),
    },
  },
  {
    name: "aurora",
    label: "Aurora",
    previewStyle: {
      backgroundImage:
        "linear-gradient(135deg, rgba(0,255,100,0.15), rgba(100,150,255,0.15), rgba(180,100,255,0.15))",
    },
  },
];

// ---------------------------------------------------------------------------
// getWallpaperStyles - returns React.CSSProperties for a given wallpaper name
// ---------------------------------------------------------------------------

export function getWallpaperStyles(
  wallpaperName: string
): React.CSSProperties {
  // Custom image wallpaper
  if (wallpaperName.startsWith("custom:")) {
    return {
      backgroundImage: `url(/uploads/wallpapers/${wallpaperName.replace("custom:", "")})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  switch (wallpaperName) {
    case "none":
      return {};

    case "subtle-dots":
      return {
        backgroundImage:
          "radial-gradient(circle, rgba(128,128,128,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      };

    case "diagonal-lines":
      return {
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(128,128,128,0.04) 10px, rgba(128,128,128,0.04) 11px)",
      };

    case "honeycomb":
      return {
        backgroundImage: [
          "linear-gradient(30deg, rgba(128,128,128,0.04) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.04) 87.5%, rgba(128,128,128,0.04))",
          "linear-gradient(150deg, rgba(128,128,128,0.04) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.04) 87.5%, rgba(128,128,128,0.04))",
          "linear-gradient(30deg, rgba(128,128,128,0.04) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.04) 87.5%, rgba(128,128,128,0.04))",
          "linear-gradient(150deg, rgba(128,128,128,0.04) 12%, transparent 12.5%, transparent 87%, rgba(128,128,128,0.04) 87.5%, rgba(128,128,128,0.04))",
          "linear-gradient(60deg, rgba(128,128,128,0.03) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.03) 75%, rgba(128,128,128,0.03))",
          "linear-gradient(60deg, rgba(128,128,128,0.03) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.03) 75%, rgba(128,128,128,0.03))",
        ].join(", "),
        backgroundSize: "40px 70px",
        backgroundPosition: "0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px",
      };

    case "waves":
      return {
        backgroundImage: [
          "radial-gradient(ellipse 100% 50% at 50% 0%, transparent 48%, rgba(128,128,128,0.05) 50%, transparent 52%)",
          "radial-gradient(ellipse 100% 50% at 50% 100%, transparent 48%, rgba(128,128,128,0.05) 50%, transparent 52%)",
        ].join(", "),
        backgroundSize: "60px 30px",
        backgroundPosition: "0 0, 30px 15px",
      };

    case "bubbles":
      return {
        backgroundImage: [
          "radial-gradient(circle 15px at 20% 30%, rgba(128,128,128,0.04) 0%, transparent 100%)",
          "radial-gradient(circle 25px at 70% 60%, rgba(128,128,128,0.03) 0%, transparent 100%)",
          "radial-gradient(circle 10px at 50% 10%, rgba(128,128,128,0.04) 0%, transparent 100%)",
          "radial-gradient(circle 20px at 85% 20%, rgba(128,128,128,0.035) 0%, transparent 100%)",
          "radial-gradient(circle 35px at 30% 80%, rgba(128,128,128,0.03) 0%, transparent 100%)",
        ].join(", "),
        backgroundSize: "150px 150px",
      };

    case "geometric":
      return {
        backgroundImage: [
          "linear-gradient(45deg, rgba(128,128,128,0.05) 25%, transparent 25%)",
          "linear-gradient(-45deg, rgba(128,128,128,0.05) 25%, transparent 25%)",
          "linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.05) 75%)",
          "linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.05) 75%)",
        ].join(", "),
        backgroundSize: "30px 30px",
        backgroundPosition: "0 0, 0 15px, 15px -15px, -15px 0",
      };

    case "stars":
      return {
        backgroundImage: [
          "radial-gradient(circle 1px at 10% 20%, rgba(200,200,200,0.15) 0%, transparent 100%)",
          "radial-gradient(circle 1.5px at 30% 70%, rgba(200,200,200,0.12) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 50% 40%, rgba(200,200,200,0.15) 0%, transparent 100%)",
          "radial-gradient(circle 2px at 70% 10%, rgba(200,200,200,0.1) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 85% 55%, rgba(200,200,200,0.15) 0%, transparent 100%)",
          "radial-gradient(circle 1.5px at 20% 90%, rgba(200,200,200,0.12) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 60% 85%, rgba(200,200,200,0.15) 0%, transparent 100%)",
          "radial-gradient(circle 2px at 40% 15%, rgba(200,200,200,0.1) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 90% 80%, rgba(200,200,200,0.3) 0%, transparent 100%)",
          "radial-gradient(circle 1.5px at 5% 50%, rgba(200,200,200,0.12) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 15% 45%, rgba(200,200,200,0.2) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 75% 35%, rgba(200,200,200,0.25) 0%, transparent 100%)",
          "radial-gradient(circle 1.5px at 45% 65%, rgba(200,200,200,0.15) 0%, transparent 100%)",
          "radial-gradient(circle 1px at 95% 5%, rgba(200,200,200,0.2) 0%, transparent 100%)",
        ].join(", "),
        backgroundSize: "200px 200px",
      };

    case "gradient-warm":
      return {
        backgroundImage:
          "linear-gradient(135deg, rgba(255,150,100,0.05), rgba(255,100,150,0.05))",
      };

    case "gradient-cool":
      return {
        backgroundImage:
          "linear-gradient(135deg, rgba(100,150,255,0.05), rgba(100,255,200,0.05))",
      };

    case "gradient-purple":
      return {
        backgroundImage:
          "linear-gradient(135deg, rgba(150,100,255,0.05), rgba(200,100,255,0.05))",
      };

    case "paper":
      return {
        backgroundImage: [
          "linear-gradient(0deg, rgba(128,128,128,0.04) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(128,128,128,0.04) 1px, transparent 1px)",
          "linear-gradient(0deg, rgba(128,128,128,0.02) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(128,128,128,0.02) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "20px 20px, 20px 20px, 4px 4px, 4px 4px",
      };

    case "doodle-money":
      return {
        position: "relative",
        overflow: "hidden",
      };

    case "cloudy":
      return {
        backgroundImage: [
          "radial-gradient(ellipse 80px 60px at 20% 40%, rgba(128,128,128,0.04) 0%, transparent 70%)",
          "radial-gradient(ellipse 100px 50px at 70% 30%, rgba(128,128,128,0.035) 0%, transparent 70%)",
          "radial-gradient(ellipse 60px 40px at 50% 80%, rgba(128,128,128,0.04) 0%, transparent 70%)",
          "radial-gradient(ellipse 90px 55px at 85% 70%, rgba(128,128,128,0.035) 0%, transparent 70%)",
          "radial-gradient(ellipse 120px 70px at 40% 20%, rgba(128,128,128,0.03) 0%, transparent 70%)",
        ].join(", "),
      };

    case "aurora":
      return {
        backgroundImage:
          "linear-gradient(135deg, rgba(0,255,100,0.05), rgba(100,150,255,0.05), rgba(180,100,255,0.05))",
        backgroundSize: "400% 400%",
        animation: "auroraShift 15s ease infinite",
      };

    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// getWallpaperCSS - returns additional CSS string for pseudo-element effects
// ---------------------------------------------------------------------------

export function getWallpaperCSS(wallpaperName: string): string {
  switch (wallpaperName) {
    case "doodle-money":
      return `
.chat-wallpaper-doodle-money::before {
  content: "$ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3 $ \u20AC \u00A5 \u20B9 \u09F3";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 48px;
  line-height: 1.8;
  letter-spacing: 24px;
  word-spacing: 24px;
  color: currentColor;
  opacity: 0.03;
  overflow: hidden;
  pointer-events: none;
  word-break: break-all;
  z-index: 0;
}`;

    case "aurora":
      return `
@keyframes auroraShift {
  0% {
    background-position: 0% 50%;
  }
  25% {
    background-position: 50% 0%;
  }
  50% {
    background-position: 100% 50%;
  }
  75% {
    background-position: 50% 100%;
  }
  100% {
    background-position: 0% 50%;
  }
}`;

    default:
      return "";
  }
}

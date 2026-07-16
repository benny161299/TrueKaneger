import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    whatsapp?: {
      main: string;
    };
    surface?: {
      dim: string;
      bright: string;
      lowest: string;
      low: string;
      container: string;
      high: string;
      highest: string;
    };
  }
  interface PaletteOptions {
    whatsapp?: {
      main: string;
    };
    surface?: {
      dim: string;
      bright: string;
      lowest: string;
      low: string;
      container: string;
      high: string;
      highest: string;
    };
  }
}

export const theme = createTheme({
  direction: "rtl",
  palette: {
    primary: {
      main: "#152d3b",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#4a6171",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f7fafc",
      paper: "#ffffff",
    },
    error: {
      main: "#ba1a1a",
      contrastText: "#ffffff",
    },
    whatsapp: {
      main: "#25D366",
    },
    divider: "#c3c7cc",
    surface: {
      dim: "#d7dadc",
      bright: "#f7fafc",
      lowest: "#ffffff",
      low: "#f1f4f6",
      container: "#ebeef0",
      high: "#e5e9eb",
      highest: "#e0e3e5",
    },
  },
  typography: {
    fontFamily: '"Work Sans", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Domine", serif',
      fontSize: "48px",
      fontWeight: 700,
      lineHeight: "56px",
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: '"Domine", serif',
      fontSize: "32px",
      fontWeight: 700,
      lineHeight: "40px",
    },
    h3: {
      fontFamily: '"Domine", serif',
      fontSize: "24px",
      fontWeight: 600,
      lineHeight: "32px",
    },
    body1: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: "18px",
      fontWeight: 400,
      lineHeight: "28px",
    },
    body2: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: "16px",
      fontWeight: 400,
      lineHeight: "24px",
    },
    button: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: "14px",
      fontWeight: 600,
      lineHeight: "20px",
      letterSpacing: "0.05em",
      textTransform: "none",
    },
    caption: {
      fontFamily: '"Work Sans", sans-serif',
      fontSize: "12px",
      fontWeight: 400,
      lineHeight: "16px",
    },
  },
  shape: {
    borderRadius: 4, // 4px standard radius for buttons and inputs
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          fontWeight: 600,
          padding: "8px 16px",
          transition:
            "transform 0.2s ease-in-out, background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 8px rgba(21, 45, 59, 0.08)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "8px", // 8px for containers
          border: "1px solid #c3c7cc",
          boxShadow: "none",
          backgroundColor: "#ffffff",
          transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 24px rgba(21, 45, 59, 0.08)", // Ambient shadow (8% opacity of seed primary color)
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          // minimal bottom-border style for inputs
          "&:before": {
            borderBottom: "2px solid #4a6171",
          },
          "&:hover:not(.Mui-disabled):before": {
            borderBottom: "2px solid #152d3b",
          },
          "&:after": {
            borderBottom: "2px solid #152d3b",
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "standard", // Search inputs and forms default to standard (bottom border)
      },
    },
  },
});

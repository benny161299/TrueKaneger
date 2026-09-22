import { Alert, AppBar, Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

// --- Layout ---

export const AppContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f7fafc",
});

export const MainContent = styled(Box)({
  flex: 1,
  padding: "32px 16px",
  maxWidth: "1280px",
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
});

// --- Typography ---

export const PageTitle = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontWeight: 700,
  color: "#152d3b",
  marginBottom: "8px",
});

export const UnderlineBar = styled(Box)({
  width: "60px",
  height: "4px",
  backgroundColor: "#152d3b",
  borderRadius: "9999px",
  marginBottom: "24px",
});

// --- Alerts ---

export const StyledAlert = styled(Alert)({
  marginBottom: "20px",
});

// --- Form Elements ---

export const FormCard = styled(Card)({
  maxWidth: "450px",
  width: "100%",
  margin: "80px auto 0",
  borderRadius: "8px",
});

export const StyledCardContent = styled(CardContent)({
  display: "flex",
  flexDirection: "column",
  padding: "32px",
});

export const InputField = styled(TextField)({
  marginBottom: "20px",
  width: "100%",
});

export const ActionButton = styled(Button)({
  width: "100%",
  marginTop: "10px",
  padding: "12px 16px",
});

export const GoogleButton = styled(Button)({
  width: "100%",
  marginTop: "12px",
  padding: "12px 16px",
  backgroundColor: "#ffffff",
  color: "#181c1e",
  border: "1px solid #c3c7cc",
  "&:hover": {
    backgroundColor: "#ebeef0",
    border: "1px solid #73787c",
  },
});

export const FormFooter = styled(Box)({
  marginTop: "20px",
  textAlign: "center",
  fontSize: "14px",
  color: "#4a6171",
});

export const StyledLink = styled(RouterLink)({
  color: "#152d3b",
  textDecoration: "none",
  fontWeight: 600,
  marginLeft: "4px",
  "&:hover": {
    textDecoration: "underline",
  },
});

// --- Header ---

export const StickyHeader = styled(AppBar)({
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #c3c7cc",
  boxShadow: "none",
  position: "sticky",
  top: 0,
  zIndex: 1000,
});

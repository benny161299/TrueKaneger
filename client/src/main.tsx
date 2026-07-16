import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ContactsProvider } from "./context/ContactsContext";
import { RTL } from "./theme/RTL";
import { theme } from "./theme/theme";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ContactsProvider>
          <RTL>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <App />
            </ThemeProvider>
          </RTL>
        </ContactsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

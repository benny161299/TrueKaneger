import { Box, Button, Toolbar, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StickyHeader } from "../styles/shared";

const CustomToolbar = styled(Toolbar)({
  display: "flex",
  justifyContent: "space-between",
  maxWidth: "1280px",
  width: "100%",
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
});

const LogoText = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontSize: "24px",
  fontWeight: 700,
  color: "#152d3b",
  textDecoration: "none",
  cursor: "pointer",
});

const NavActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "16px",
});

const UserEmailText = styled(Typography)({
  fontSize: "14px",
  color: "#4a6171",
});

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <StickyHeader position="static">
      <CustomToolbar>
        <LogoText variant="h6" onClick={() => navigate("/")}>
          אלפון הישיבה
        </LogoText>
        <NavActions>
          {user ? (
            <>
              {user.role === "admin" && (
                <Button color="secondary" onClick={() => navigate("/admin")}>
                  ניהול
                </Button>
              )}
              <UserEmailText variant="body2">{user.email}</UserEmailText>
              <Button variant="outlined" color="primary" onClick={logout}>
                התנתק
              </Button>
            </>
          ) : (
            <>
              <Button color="primary" onClick={() => navigate("/login")}>
                התחבר
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/register")}
              >
                הרשם
              </Button>
            </>
          )}
        </NavActions>
      </CustomToolbar>
    </StickyHeader>
  );
}

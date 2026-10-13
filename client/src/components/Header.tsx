import { useEffect, useState } from "react";
import { AdminPanelSettings as AdminPanelSettingsIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { Badge, Box, Button, Toolbar, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StickyHeader } from "../styles/shared";
import { adminService, type AdminCounts } from "../services/adminService";

const CustomToolbar = styled(Toolbar)({
  display: "flex",
  justifyContent: "space-between",
  maxWidth: "1280px",
  width: "100%",
  margin: "0 auto",
  padding: "0 12px",
  boxSizing: "border-box",
  "@media (min-width: 600px)": {
    padding: "0 24px",
  },
});

const LogoText = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontSize: "20px",
  fontWeight: 700,
  color: "#152d3b",
  textDecoration: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  "@media (min-width: 600px)": {
    fontSize: "24px",
  },
});

const NavActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  "@media (min-width: 600px)": {
    gap: "16px",
  },
});

const UserEmailText = styled(Typography)({
  fontSize: "14px",
  color: "#4a6171",
  display: "none",
  "@media (min-width: 700px)": {
    display: "block",
  },
});

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminCounts, setAdminCounts] = useState<AdminCounts | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;

    const fetchCounts = async () => {
      try {
        const counts = await adminService.getCounts();
        setAdminCounts(counts);
      } catch {
        // Silently ignore background polling errors
      }
    };

    fetchCounts();

    const handleUpdate = () => fetchCounts();
    window.addEventListener("admin-counts-changed", handleUpdate);
    const interval = setInterval(fetchCounts, 30000);

    return () => {
      window.removeEventListener("admin-counts-changed", handleUpdate);
      clearInterval(interval);
    };
  }, [user?.role]);

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
                <Badge
                  badgeContent={adminCounts?.totalAlerts || 0}
                  color="error"
                  invisible={!adminCounts || adminCounts.totalAlerts === 0}
                  max={99}
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 4px",
                    },
                  }}
                >
                  <Button
                    size="small"
                    color="secondary"
                    onClick={() => navigate("/admin")}
                    startIcon={<AdminPanelSettingsIcon />}
                    style={{ whiteSpace: "nowrap", fontWeight: 600 }}
                  >
                    ניהול
                  </Button>
                </Badge>
              )}
              <UserEmailText variant="body2">{user.email}</UserEmailText>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={logout}
                startIcon={<LogoutIcon />}
                style={{ whiteSpace: "nowrap", minWidth: "auto" }}
              >
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

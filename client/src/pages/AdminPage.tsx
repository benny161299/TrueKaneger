import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  HourglassEmpty as HourglassEmptyIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  ReportProblem as ReportProblemIcon,
} from "@mui/icons-material";
import {
  Badge,
  Box,
  ButtonBase,
  Chip,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminPendingUsersTab } from "../components/AdminPendingUsersTab";
import { AdminPendingTab } from "../components/AdminPendingTab";
import { AdminReportsTab } from "../components/AdminReportsTab";
import { AdminUsersTab } from "../components/AdminUsersTab";
import { useAuth } from "../context/AuthContext";
import { PageTitle, UnderlineBar } from "../styles/shared";
import { adminService, type AdminCounts } from "../services/adminService";

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [counts, setCounts] = useState<AdminCounts>({
    pendingUsers: 0,
    pendingContacts: 0,
    reports: 0,
    totalAlerts: 0,
  });

  const loadCounts = async () => {
    try {
      const data = await adminService.getCounts();
      setCounts(data);
    } catch {
      // Ignore background fetch errors
    }
  };

  useEffect(() => {
    loadCounts();
    const handleUpdate = () => loadCounts();
    window.addEventListener("admin-counts-changed", handleUpdate);
    return () => {
      window.removeEventListener("admin-counts-changed", handleUpdate);
    };
  }, []);

  // Extra safety check in component
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const tabsConfig = [
    {
      label: "אישור משתמשים חדשים",
      icon: <PersonAddIcon fontSize="small" />,
      count: counts.pendingUsers,
      countColor: "warning" as const,
    },
    {
      label: "אישור אנשי קשר",
      icon: <HourglassEmptyIcon fontSize="small" />,
      count: counts.pendingContacts,
      countColor: "info" as const,
    },
    {
      label: "דיווחים פתוחים",
      icon: <ReportProblemIcon fontSize="small" />,
      count: counts.reports,
      countColor: "error" as const,
    },
    {
      label: "ניהול משתמשים",
      icon: <PeopleIcon fontSize="small" />,
      count: 0,
      countColor: "default" as const,
    },
  ];

  return (
    <Box style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <PageTitle variant="h4">פאנל ניהול</PageTitle>
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="מנהל מערכת"
            color="error"
            size="small"
            style={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      <UnderlineBar />

      <Typography variant="body2" style={{ color: "#4a6171", marginBottom: "20px" }}>
        שלום, {user.email}! כאן תוכל לאשר משתמשים חדשים, לנהל דיווחים, לאשר אנשי קשר ולנהל הרשאות.
      </Typography>

      {/* Mobile Navigation (< md): 2x2 Centered Professional Dashboard Controls */}
      <Box
        sx={{
          display: { xs: "grid", md: "none" },
          gridTemplateColumns: "1fr 1fr",
          gap: 1.25,
          mb: 3,
          p: 0.75,
          backgroundColor: "#f8fafc",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        {tabsConfig.map((item, idx) => {
          const isSelected = activeTab === idx;
          return (
            <ButtonBase
              key={idx}
              onClick={() => setActiveTab(idx)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 1.5,
                minHeight: "78px",
                borderRadius: "12px",
                backgroundColor: isSelected ? "#152d3b" : "#ffffff",
                color: isSelected ? "#ffffff" : "#334155",
                border: isSelected ? "1px solid #152d3b" : "1px solid #edf2f7",
                boxShadow: isSelected
                  ? "0 4px 14px rgba(21, 45, 59, 0.22)"
                  : "0 1px 3px rgba(0, 0, 0, 0.04)",
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                textAlign: "center",
                "&:active": {
                  transform: "scale(0.97)",
                },
              }}
            >
              {/* Centered Icon with Badge */}
              <Badge
                badgeContent={item.count}
                color={item.countColor as any}
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: "0.72rem",
                    height: "18px",
                    minWidth: "18px",
                    fontWeight: 700,
                    boxShadow: isSelected ? "0 0 0 2px #152d3b" : "0 0 0 2px #ffffff",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    backgroundColor: isSelected ? "rgba(56, 189, 248, 0.18)" : "#f1f5f9",
                    color: isSelected ? "#38bdf8" : "#152d3b",
                    mb: 0.8,
                    transition: "all 0.18s ease",
                  }}
                >
                  {item.icon}
                </Box>
              </Badge>

              {/* Centered Label */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: "0.84rem",
                  color: isSelected ? "#ffffff" : "#1e293b",
                  textAlign: "center",
                  lineHeight: 1.25,
                }}
              >
                {item.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Desktop Tabs Navigation (>= md) */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          borderBottom: "1px solid #e0e3e7",
          marginBottom: "24px",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newVal) => setActiveTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
          variant="standard"
        >
          {tabsConfig.map((item, idx) => (
            <Tab
              key={idx}
              icon={item.icon}
              iconPosition="start"
              label={
                <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <Chip
                      label={item.count}
                      size="small"
                      color={item.countColor}
                      style={{
                        height: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        minWidth: "22px",
                        padding: "0 2px",
                      }}
                    />
                  )}
                </Box>
              }
              style={{ fontWeight: 600, minHeight: "48px" }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab 0: Pending users approval */}
      {activeTab === 0 && <AdminPendingUsersTab />}

      {/* Tab 1: Pending contacts approval */}
      {activeTab === 1 && <AdminPendingTab />}

      {/* Tab 2: Open Reports */}
      {activeTab === 2 && <AdminReportsTab />}

      {/* Tab 3: User Management */}
      {activeTab === 3 && <AdminUsersTab />}
    </Box>
  );
}

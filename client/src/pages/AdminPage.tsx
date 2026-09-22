import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  People as PeopleIcon,
  ReportProblem as ReportProblemIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminReportsTab } from "../components/AdminReportsTab";
import { AdminUsersTab } from "../components/AdminUsersTab";
import { useAuth } from "../context/AuthContext";
import { PageTitle, UnderlineBar } from "../styles/shared";

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Extra safety check in component
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

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
        שלום, {user.email}! כאן תוכל לנהל דיווחים פתוחים על אנשי קשר, לעדכן פרטים ולנהל הרשאות משתמשים.
      </Typography>

      {/* Tabs navigation for Stage 13 */}
      <Box style={{ borderBottom: "1px solid #e0e3e7", marginBottom: "24px" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newVal) => setActiveTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            icon={<ReportProblemIcon fontSize="small" />}
            iconPosition="start"
            label="דיווחים פתוחים"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
          <Tab
            icon={<PeopleIcon fontSize="small" />}
            iconPosition="start"
            label="ניהול משתמשים"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
        </Tabs>
      </Box>

      {/* Tab 0: Open Reports (13.2 - 13.5) */}
      {activeTab === 0 && <AdminReportsTab />}

      {/* Tab 1: User Management (13.6 - 13.7) */}
      {activeTab === 1 && <AdminUsersTab />}
    </Box>
  );
}

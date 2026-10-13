import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  HourglassEmpty as HourglassEmptyIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
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
import { AdminPendingUsersTab } from "../components/AdminPendingUsersTab";
import { AdminPendingTab } from "../components/AdminPendingTab";
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
        שלום, {user.email}! כאן תוכל לאשר משתמשים חדשים, לנהל דיווחים, לאשר אנשי קשר ולנהל הרשאות.
      </Typography>

      {/* Tabs navigation */}
      <Box style={{ borderBottom: "1px solid #e0e3e7", marginBottom: "24px" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newVal) => setActiveTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            icon={<PersonAddIcon fontSize="small" />}
            iconPosition="start"
            label="אישור משתמשים"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
          <Tab
            icon={<HourglassEmptyIcon fontSize="small" />}
            iconPosition="start"
            label="אישור אנשי קשר"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
          <Tab
            icon={<ReportProblemIcon fontSize="small" />}
            iconPosition="start"
            label="דיווחים פתוחים"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
          <Tab
            icon={<PeopleIcon fontSize="small" />}
            iconPosition="start"
            label="כל המשתמשים"
            style={{ fontWeight: 600, minHeight: "48px" }}
          />
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

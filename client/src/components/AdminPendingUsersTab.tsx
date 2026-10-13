import {
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Snackbar,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  adminService,
  type PendingUserItem,
} from "../services/adminService";

export function AdminPendingUsersTab() {
  const [pendingUsers, setPendingUsers] = useState<PendingUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  // Confirm reject dialog
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getPendingUsers();
      setPendingUsers(data);
    } catch {
      setError("שגיאה בטעינת רשימת המשתמשים הממתינים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await adminService.approveUser(id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      setSnackbarMsg(`המשתמש "${name}" אושר בהצלחה ויכול לגשת לאלפון!`);
      setSnackbarSeverity("success");
    } catch {
      setSnackbarMsg("שגיאה באישור המשתמש");
      setSnackbarSeverity("error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialogId) return;
    const id = rejectDialogId;
    setActionLoading(id);
    setRejectDialogId(null);
    try {
      await adminService.rejectUser(id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      setSnackbarMsg("בקשת המשתמש נדחתה בהצלחה");
      setSnackbarSeverity("success");
    } catch {
      setSnackbarMsg("שגיאה בדחיית המשתמש");
      setSnackbarSeverity("error");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Intl.DateTimeFormat("he-IL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <Box>
      {/* Header bar */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography variant="h6" style={{ fontWeight: 700, color: "#152d3b" }}>
            משתמשים ממתינים לאישור גישה
          </Typography>
          <Chip
            label={pendingUsers.length}
            color={pendingUsers.length > 0 ? "warning" : "default"}
            size="small"
            style={{ fontWeight: 700 }}
          />
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          variant="outlined"
          size="small"
          disabled={loading}
        >
          רענן
        </Button>
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: "16px" }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && pendingUsers.length === 0 && (
        <Box
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "#6b7280",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px dashed #d1d5db",
          }}
        >
          <HourglassEmptyIcon style={{ fontSize: "48px", color: "#9ca3af", marginBottom: "8px" }} />
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            אין משתמשים ממתינים לאישור
          </Typography>
          <Typography variant="body2" style={{ color: "#9ca3af" }}>
            כל המשתמשים הרשומים קיבלו מענה. בקשות חדשות יופיעו כאן.
          </Typography>
        </Box>
      )}

      {!loading && pendingUsers.length > 0 && (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {pendingUsers.map((item) => {
            const displayName =
              item.firstName || item.lastName
                ? `${item.firstName || ""} ${item.lastName || ""}`.trim()
                : "משתמש ללא שם מלא";
            const isProcessing = actionLoading === item._id;

            return (
              <Card
                key={item._id}
                elevation={1}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: "10px",
                  border: "1px solid #e0e3e7",
                }}
              >
                <CardContent style={{ paddingBottom: "12px" }}>
                  {/* Card Title & Machzor */}
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <PersonIcon style={{ color: "#152d3b", fontSize: "24px" }} />
                      <Typography variant="subtitle1" style={{ fontWeight: 700, color: "#152d3b" }}>
                        {displayName}
                      </Typography>
                    </Box>

                    {item.machzor ? (
                      <Chip
                        icon={<SchoolIcon style={{ fontSize: "16px" }} />}
                        label={`מחזור ${item.machzor}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        style={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label="טרם השלים פרטים"
                        size="small"
                        color="default"
                        variant="outlined"
                        style={{ fontSize: "11px" }}
                      />
                    )}
                  </Box>

                  <Divider style={{ marginBottom: "12px" }} />

                  {/* Details List */}
                  <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {item.phone && (
                      <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <PhoneIcon fontSize="small" style={{ color: "#2563eb" }} />
                        <Typography
                          variant="body2"
                          dir="ltr"
                          component="a"
                          href={`tel:${item.phone}`}
                          style={{
                            color: "#2563eb",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {item.phone}
                        </Typography>
                      </Box>
                    )}

                    <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <EmailIcon fontSize="small" style={{ color: "#6b7280" }} />
                      <Typography
                        variant="body2"
                        dir="ltr"
                        style={{ color: "#374151", wordBreak: "break-all" }}
                      >
                        {item.email}
                      </Typography>
                    </Box>

                    {item.createdAt && (
                      <Typography variant="caption" style={{ color: "#9ca3af", marginTop: "4px" }}>
                        תאריך הרשמה: {formatDate(item.createdAt)}
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                {/* Actions */}
                <CardActions
                  style={{
                    padding: "8px 16px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={
                      isProcessing ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />
                    }
                    disabled={isProcessing}
                    onClick={() => handleApprove(item._id, displayName)}
                    style={{ fontWeight: 600, minWidth: "110px" }}
                  >
                    אשר גישה
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CloseIcon />}
                    disabled={isProcessing}
                    onClick={() => setRejectDialogId(item._id)}
                    style={{ fontWeight: 600 }}
                  >
                    דחה
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={Boolean(rejectDialogId)}
        onClose={() => setRejectDialogId(null)}
        PaperProps={{ style: { borderRadius: "10px" } }}
      >
        <DialogTitle style={{ fontWeight: 700 }}>דחיית בקשת גישה</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך לדחות את בקשת הגישה של משתמש זה? המשתמש לא יוכל לצפות באלפון.
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={() => setRejectDialogId(null)} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            style={{ fontWeight: 600 }}
          >
            אישור דחייה
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarMsg(null)}
          severity={snackbarSeverity}
          variant="filled"
          style={{ fontWeight: 600 }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

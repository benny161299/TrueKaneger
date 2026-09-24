import {
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
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
  type PendingContactItem,
} from "../services/adminService";

export function AdminPendingTab() {
  const [pending, setPending] = useState<PendingContactItem[]>([]);
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
      const data = await adminService.getPendingContacts();
      setPending(data);
    } catch {
      setError("שגיאה בטעינת רשימת הממתינים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await adminService.approveContact(id);
      setPending((prev) => prev.filter((p) => p._id !== id));
      setSnackbarSeverity("success");
      setSnackbarMsg("איש הקשר אושר ונוסף למאגר בהצלחה ✓");
    } catch {
      setSnackbarSeverity("error");
      setSnackbarMsg("שגיאה באישור איש הקשר");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialogId) return;
    const id = rejectDialogId;
    setRejectDialogId(null);
    setActionLoading(id);
    try {
      await adminService.rejectContact(id);
      setPending((prev) => prev.filter((p) => p._id !== id));
      setSnackbarSeverity("success");
      setSnackbarMsg("איש הקשר נדחה ונמחק");
    } catch {
      setSnackbarSeverity("error");
      setSnackbarMsg("שגיאה בדחיית איש הקשר");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={load}>
            נסה שוב
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <>
      {/* Header row */}
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
        <Box style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <HourglassEmptyIcon style={{ color: "#b78103" }} />
          <Typography variant="h6" style={{ fontWeight: 700, color: "#152d3b" }}>
            אנשי קשר ממתינים לאישור
          </Typography>
          <Chip
            label={pending.length}
            size="small"
            style={{
              backgroundColor: pending.length > 0 ? "#fff8e1" : "#f0f4f8",
              color: pending.length > 0 ? "#b78103" : "#627d98",
              fontWeight: 700,
              border: `1px solid ${pending.length > 0 ? "#ffe082" : "#d9e2ec"}`,
            }}
          />
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={load}
          style={{ borderColor: "#b0c4de", color: "#486581" }}
        >
          רענן
        </Button>
      </Box>

      {pending.length === 0 ? (
        <Box
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "#627d98",
          }}
        >
          <CheckIcon style={{ fontSize: 48, color: "#68d391", marginBottom: "8px" }} />
          <Typography variant="h6" style={{ fontWeight: 600, color: "#2d6a4f" }}>
            אין ממתינים לאישור
          </Typography>
          <Typography variant="body2" style={{ marginTop: "4px" }}>
            כל אנשי הקשר שנשלחו אושרו או נדחו.
          </Typography>
        </Box>
      ) : (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {pending.map((item) => (
            <Card
              key={item._id}
              variant="outlined"
              style={{
                borderRadius: "12px",
                border: "1px solid #ffe082",
                backgroundColor: "#fffdf0",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent style={{ paddingBottom: "8px" }}>
                {/* Name + status badge */}
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Box
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {item.name.charAt(0)}
                    </Box>
                    <Typography variant="subtitle1" style={{ fontWeight: 700, color: "#152d3b" }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Chip
                    label="ממתין"
                    size="small"
                    icon={<HourglassEmptyIcon style={{ fontSize: "14px" }} />}
                    style={{
                      backgroundColor: "#fff3cd",
                      color: "#856404",
                      border: "1px solid #ffe082",
                      fontSize: "12px",
                    }}
                  />
                </Box>

                <Divider style={{ marginBottom: "12px" }} />

                {/* Phone */}
                <Box style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <PhoneIcon style={{ color: "#627d98", fontSize: "18px" }} />
                  <Typography variant="body2" style={{ direction: "ltr", color: "#243b53" }}>
                    {item.phone}
                  </Typography>
                </Box>

                {/* Email */}
                {item.email && (
                  <Box style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <EmailIcon style={{ color: "#627d98", fontSize: "18px" }} />
                    <Typography variant="body2" style={{ color: "#243b53", wordBreak: "break-all" }}>
                      {item.email}
                    </Typography>
                  </Box>
                )}

                {/* Submitted by */}
                {item.createdBy && (
                  <Box style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                    <PersonIcon style={{ color: "#9fb3c8", fontSize: "16px" }} />
                    <Typography variant="caption" style={{ color: "#829ab1" }}>
                      נשלח ע״י: {item.createdBy.email}
                    </Typography>
                  </Box>
                )}

                {/* Submitted at */}
                <Typography
                  variant="caption"
                  style={{ color: "#9fb3c8", display: "block", marginTop: "4px" }}
                >
                  {new Date(item.createdAt).toLocaleString("he-IL")}
                </Typography>
              </CardContent>

              <CardActions style={{ padding: "8px 16px 16px", gap: "8px" }}>
                {/* Approve */}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    actionLoading === item._id ? (
                      <CircularProgress size={14} style={{ color: "#fff" }} />
                    ) : (
                      <CheckIcon />
                    )
                  }
                  disabled={actionLoading === item._id}
                  onClick={() => handleApprove(item._id)}
                  style={{
                    flexGrow: 1,
                    backgroundColor: "#2d6a4f",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  אשר
                </Button>

                {/* Reject */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    actionLoading === item._id ? (
                      <CircularProgress size={14} />
                    ) : (
                      <CloseIcon />
                    )
                  }
                  disabled={actionLoading === item._id}
                  onClick={() => setRejectDialogId(item._id)}
                  style={{
                    flexGrow: 1,
                    borderColor: "#d32f2f",
                    color: "#d32f2f",
                    fontWeight: 600,
                  }}
                >
                  דחה
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Reject confirmation dialog */}
      <Dialog
        open={Boolean(rejectDialogId)}
        onClose={() => setRejectDialogId(null)}
        PaperProps={{ style: { borderRadius: "12px", direction: "rtl", minWidth: "300px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#c62828" }}>
          אישור דחייה
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך לדחות ולמחוק לצמיתות את איש הקשר הממתין?
            פעולה זו אינה ניתנת לביטול.
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ padding: "8px 16px 16px", gap: "8px" }}>
          <Button
            onClick={() => setRejectDialogId(null)}
            variant="outlined"
            style={{ borderColor: "#b0c4de", color: "#486581" }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            style={{ backgroundColor: "#d32f2f", color: "#fff", fontWeight: 600 }}
          >
            מחק לצמיתות
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarMsg(null)}
          severity={snackbarSeverity}
          variant="filled"
          style={{ borderRadius: "8px" }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

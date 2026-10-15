import {
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  RestartAlt as RestartAltIcon,
  School as SchoolIcon,
  Search as SearchIcon,
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
  InputAdornment,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
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

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog targets
  const [rejectUserTarget, setRejectUserTarget] = useState<PendingUserItem | null>(null);
  const [reidentifyUserTarget, setReidentifyUserTarget] = useState<PendingUserItem | null>(null);
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

  const filteredPendingUsers = useMemo(() => {
    if (!searchQuery.trim()) return pendingUsers;
    const q = searchQuery.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    return pendingUsers.filter((u) => {
      const first = (u.firstName || "").toLowerCase();
      const last = (u.lastName || "").toLowerCase();
      const full = `${first} ${last}`.trim().toLowerCase();
      const reverseFull = `${last} ${first}`.trim().toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "");
      const machzor = (u.machzor || "").toLowerCase();

      if (full.includes(q) || reverseFull.includes(q) || email.includes(q) || phone.includes(q) || machzor.includes(q)) {
        return true;
      }

      return words.every(
        (w) =>
          first.includes(w) ||
          last.includes(w) ||
          full.includes(w) ||
          reverseFull.includes(w) ||
          email.includes(w) ||
          phone.includes(w) ||
          machzor.includes(w)
      );
    });
  }, [pendingUsers, searchQuery]);

  // 1. אשר (Approve)
  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await adminService.approveUser(id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      adminService.notifyCountsChanged();
      setSnackbarMsg(`המשתמש "${name}" אושר בהצלחה ויכול לגשת לאלפון!`);
      setSnackbarSeverity("success");
    } catch {
      setSnackbarMsg("שגיאה באישור המשתמש");
      setSnackbarSeverity("error");
    } finally {
      setActionLoading(null);
    }
  };

  // 2. בקש זיהוי פרטים מחדש (Request Re-identification)
  const handleReidentifyConfirm = async () => {
    if (!reidentifyUserTarget) return;
    const target = reidentifyUserTarget;
    const displayName =
      target.firstName || target.lastName
        ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
        : target.email;
    setActionLoading(target._id);
    setReidentifyUserTarget(null);
    try {
      await adminService.requestUserDetails(target._id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== target._id));
      adminService.notifyCountsChanged();
      setSnackbarMsg(`נשלחה בקשה לזיהוי פרטים מחדש עבור "${displayName}". הפרטים אופסו בהצלחה והמשתמש הוחזר לסטטוס ממתין.`);
      setSnackbarSeverity("success");
    } catch {
      setSnackbarMsg("שגיאה בבקשת זיהוי פרטים מחדש");
      setSnackbarSeverity("error");
    } finally {
      setActionLoading(null);
    }
  };

  // 3. דחה לצמיתות (Permanently Reject)
  const handleRejectConfirm = async () => {
    if (!rejectUserTarget) return;
    const target = rejectUserTarget;
    const displayName =
      target.firstName || target.lastName
        ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
        : target.email;
    setActionLoading(target._id);
    setRejectUserTarget(null);
    try {
      await adminService.rejectUser(target._id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== target._id));
      adminService.notifyCountsChanged();
      setSnackbarMsg(`בקשת המשתמש "${displayName}" נדחתה לצמיתות.`);
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
          gap: "12px",
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

        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: "1 1 220px",
            maxWidth: "380px",
            width: "100%",
          }}
        >
          <TextField
            size="small"
            placeholder="חיפוש לפי שם, אימייל, טלפון או מחזור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" style={{ color: "#73787c" }} />
                </InputAdornment>
              ),
            }}
            style={{ backgroundColor: "#ffffff" }}
          />
          <Button
            startIcon={<RefreshIcon />}
            onClick={load}
            variant="outlined"
            size="small"
            disabled={loading}
            style={{ minWidth: "80px", whiteSpace: "nowrap" }}
          >
            רענן
          </Button>
        </Box>
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

      {!loading && pendingUsers.length > 0 && filteredPendingUsers.length === 0 && (
        <Box
          style={{
            textAlign: "center",
            padding: "40px 16px",
            color: "#6b7280",
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            border: "1px dashed #d1d5db",
          }}
        >
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            לא נמצאו משתמשים ממתינים התואמים לחיפוש "{searchQuery}"
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => setSearchQuery("")}
            sx={{ mt: 1 }}
          >
            נקה חיפוש
          </Button>
        </Box>
      )}

      {!loading && filteredPendingUsers.length > 0 && (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredPendingUsers.map((item) => {
            const displayName =
              item.firstName || item.lastName
                ? `${item.firstName || ""} ${item.lastName || ""}`.trim()
                : "משתמש ללא שם מלא";
            const isProcessing = actionLoading === item._id;
            const hasDetails = Boolean(item.firstName || item.lastName || item.phone || item.machzor);

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
                        label={item.machzor.includes("לא זוכר") ? item.machzor : `מחזור ${item.machzor}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        style={{ fontWeight: 600 }}
                      />
                    ) : item.reidentificationRequested ? (
                      <Chip
                        label="ממתין לזיהוי מחדש"
                        size="small"
                        color="warning"
                        variant="outlined"
                        style={{ fontSize: "11px", fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label="מחזור לא ידוע"
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

                {/* 3 Actions: אשר, בקש זיהוי פרטים מחדש, דחה לצמיתות */}
                <CardActions
                  style={{
                    padding: "12px 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  {/* Option 2: אשר (Approve) */}
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    fullWidth
                    startIcon={
                      isProcessing ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />
                    }
                    disabled={isProcessing}
                    onClick={() => handleApprove(item._id, displayName)}
                    style={{ fontWeight: 700, height: "36px" }}
                  >
                    אשר
                  </Button>

                  {/* Option 1: בקש זיהוי פרטים מחדש (Request Re-identification) */}
                  <Tooltip
                    title={!hasDetails ? "המשתמש טרם הזין פרטים" : ""}
                    placement="top"
                    arrow
                  >
                    <Box component="span" style={{ width: "100%" }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        fullWidth
                        startIcon={<RestartAltIcon />}
                        disabled={isProcessing || !hasDetails}
                        onClick={() => setReidentifyUserTarget(item)}
                        style={{
                          fontWeight: 600,
                          height: "34px",
                          borderColor: !hasDetails ? undefined : "#f59e0b",
                          color: !hasDetails ? undefined : "#b45309",
                        }}
                      >
                        בקש זיהוי פרטים מחדש
                      </Button>
                    </Box>
                  </Tooltip>

                  {/* Option 3: דחה לצמיתות (Permanently Reject) */}
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    fullWidth
                    startIcon={<CloseIcon />}
                    disabled={isProcessing}
                    onClick={() => setRejectUserTarget(item)}
                    style={{ fontWeight: 600, height: "34px" }}
                  >
                    דחה לצמיתות
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Re-identification Confirmation Dialog */}
      <Dialog
        open={Boolean(reidentifyUserTarget)}
        onClose={() => setReidentifyUserTarget(null)}
        PaperProps={{ style: { borderRadius: "12px", maxWidth: "460px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: "8px" }}>
          <RestartAltIcon />
          בקשת זיהוי פרטים מחדש
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: "#374151", marginBottom: "12px" }}>
            האם אתה בטוח שברצונך לבקש ממשתמש זה (
            <strong>
              {reidentifyUserTarget?.firstName || reidentifyUserTarget?.lastName
                ? `${reidentifyUserTarget.firstName || ""} ${reidentifyUserTarget.lastName || ""}`.trim()
                : reidentifyUserTarget?.email}
            </strong>
            ) להזין את פרטי הזיהוי מחדש?
          </DialogContentText>
          <Alert severity="warning" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
            הפרטים שהמשתמש הזין (שם, טלפון, מחזור) יאופסו לחלוטין והמשתמש יוחזר לסטטוס ממתין.
            בהתחברותו הבאה יוצג לו מסך השלמת הפרטים מחדש.
          </Alert>
        </DialogContent>
        <DialogActions style={{ padding: "12px 24px 16px" }}>
          <Button onClick={() => setReidentifyUserTarget(null)} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleReidentifyConfirm}
            color="warning"
            variant="contained"
            style={{ fontWeight: 700 }}
          >
            אישור ואיפוס פרטים
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={Boolean(rejectUserTarget)}
        onClose={() => setRejectUserTarget(null)}
        PaperProps={{ style: { borderRadius: "12px", maxWidth: "460px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
          <CloseIcon />
          דחיית משתמש לצמיתות
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: "#374151", marginBottom: "12px" }}>
            האם אתה בטוח שברצונך לדחות לצמיתות את בקשת הגישה של{" "}
            <strong>
              {rejectUserTarget?.firstName || rejectUserTarget?.lastName
                ? `${rejectUserTarget.firstName || ""} ${rejectUserTarget.lastName || ""}`.trim()
                : rejectUserTarget?.email}
            </strong>
            ?
          </DialogContentText>
          <Alert severity="error" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
            המשתמש יידחה לצמיתות ולא תתאפשר לו גישה לאלפון.
          </Alert>
        </DialogContent>
        <DialogActions style={{ padding: "12px 24px 16px" }}>
          <Button onClick={() => setRejectUserTarget(null)} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            style={{ fontWeight: 700 }}
          >
            דחה לצמיתות
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

import {
  CheckCircle as CheckCircleIcon,
  DeleteOutline as DeleteOutlineIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
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
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  adminService,
  type AdminReportItem,
} from "../services/adminService";

const REASON_LABELS: Record<string, { label: string; color: "error" | "warning" | "info" | "default" }> = {
  WRONG_NUMBER: { label: "מספר לא נכון", color: "error" },
  DOES_NOT_EXIST: { label: "איש קשר לא קיים", color: "error" },
  WRONG_NAME: { label: "שם לא נכון", color: "warning" },
  WRONG_EMAIL: { label: "מייל לא נכון", color: "info" },
  OTHER: { label: "אחר", color: "default" },
};

export function AdminReportsTab() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // Dismiss report modal state
  const [reportToDismiss, setReportToDismiss] = useState<AdminReportItem | null>(null);
  const [dismissing, setDismissing] = useState(false);

  // Full Edit contact modal state
  const [fullEditTarget, setFullEditTarget] = useState<{
    reportId: string;
    contactId: string;
    reportReason: string;
    suggestedCorrection?: string;
    freeTextComment?: string;
    reporterEmail?: string;
    firstName: string;
    lastName: string;
    phone: string;
    kosherPhone: string;
    machzor: string;
    email: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getReports();
      setReports(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בטעינת דיווחים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleConfirmDismiss = async () => {
    if (!reportToDismiss) return;
    setDismissing(true);
    try {
      await adminService.dismissReport(reportToDismiss._id);
      setReports((prev) => prev.filter((r) => r._id !== reportToDismiss._id));
      adminService.notifyCountsChanged();
      setSnackbarMsg("הדיווח נסגר בהצלחה");
      setReportToDismiss(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בסגירת הדיווח");
    } finally {
      setDismissing(false);
    }
  };

  const handleOpenFullEdit = (report: AdminReportItem) => {
    if (!report.contactId) return;
    const contact = report.contactId;

    let firstName = contact.firstName || "";
    let lastName = contact.lastName || "";
    if (!firstName && !lastName && contact.name) {
      const parts = contact.name.trim().split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    let phone = contact.phone || "";
    let kosherPhone = contact.kosherPhone || "";
    let machzor = contact.machzor || "";
    let email = contact.email || "";

    // שיבוץ אוטומטי של ההצעה לשדה המתאים
    if (report.suggestedCorrection) {
      const sc = report.suggestedCorrection.trim();
      if (report.reason === "WRONG_NUMBER") {
        phone = sc;
      } else if (report.reason === "WRONG_NAME") {
        const parts = sc.split(" ");
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      } else if (report.reason === "WRONG_EMAIL") {
        email = sc;
      }
    }

    setEditFormError(null);
    setFullEditTarget({
      reportId: report._id,
      contactId: contact._id,
      reportReason: report.reason,
      suggestedCorrection: report.suggestedCorrection,
      freeTextComment: report.freeTextComment,
      reporterEmail: report.reportedBy?.email,
      firstName,
      lastName,
      phone,
      kosherPhone,
      machzor,
      email,
    });
  };

  const handleSaveFullEdit = async (dismissReport: boolean) => {
    if (!fullEditTarget) return;
    setEditFormError(null);

    if (!fullEditTarget.firstName.trim() && !fullEditTarget.lastName.trim()) {
      setEditFormError("יש להזין שם פרטי או שם משפחה");
      return;
    }

    const cleanPhone = fullEditTarget.phone.trim();
    const cleanKosher = fullEditTarget.kosherPhone.trim();
    if (!cleanPhone && !cleanKosher) {
      setEditFormError("יש להזין לפחות מספר טלפון אחד (רגיל או כשר)");
      return;
    }

    setSavingEdit(true);
    try {
      await adminService.updateContactFull(fullEditTarget.contactId, {
        firstName: fullEditTarget.firstName.trim(),
        lastName: fullEditTarget.lastName.trim(),
        name: `${fullEditTarget.firstName.trim()} ${fullEditTarget.lastName.trim()}`.trim(),
        phone: cleanPhone,
        kosherPhone: cleanKosher,
        machzor: fullEditTarget.machzor.trim(),
        email: fullEditTarget.email.trim(),
        dismissReportId: dismissReport ? fullEditTarget.reportId : undefined,
      });

      setSnackbarMsg(
        dismissReport
          ? "פרטי איש הקשר עודכנו והדיווח נסגר בהצלחה"
          : "פרטי איש הקשר עודכנו בהצלחה"
      );
      setFullEditTarget(null);
      if (dismissReport) {
        adminService.notifyCountsChanged();
      }
      await fetchReports();
    } catch (err: any) {
      setEditFormError(err.response?.data?.message || err.message || "שגיאה בעדכון איש הקשר");
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("he-IL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
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
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Typography variant="h6" style={{ fontWeight: 700, color: "#152d3b" }}>
            דיווחים פתוחים
          </Typography>
          {!loading && (
            <Chip
              label={`${reports.length} דיווחים`}
              color={reports.length > 0 ? "error" : "success"}
              size="small"
              style={{ fontWeight: 600 }}
            />
          )}
        </Box>

        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchReports}
          variant="outlined"
          size="small"
          disabled={loading}
        >
          רענן
        </Button>
      </Box>

      {/* Error alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          style={{ marginBottom: "16px" }}
        >
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "48px 0",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <CircularProgress color="primary" />
          <Typography variant="body2" style={{ color: "#4a6171" }}>
            טוען דיווחים...
          </Typography>
        </Box>
      ) : reports.length === 0 ? (
        /* Empty state */
        <Box
          style={{
            backgroundColor: "#ffffff",
            padding: "48px 24px",
            borderRadius: "12px",
            border: "1px solid #e0e3e7",
            textAlign: "center",
          }}
        >
          <CheckCircleIcon style={{ fontSize: "56px", color: "#2e7d32", marginBottom: "12px" }} />
          <Typography variant="h6" style={{ fontWeight: 700, color: "#152d3b", marginBottom: "6px" }}>
            אין דיווחים פתוחים כרגע!
          </Typography>
          <Typography variant="body2" style={{ color: "#73787c" }}>
            כל הדיווחים טופלו בהצלחה או שלא הוגשו דיווחים חדשים.
          </Typography>
        </Box>
      ) : (
        /* Reports Grid (13.2 + 13.3) */
        <Grid container spacing={2}>
          {reports.map((report) => {
            const reasonMeta =
              REASON_LABELS[report.reason] || { label: report.reason, color: "default" };
            const contact = report.contactId;

            return (
              <Grid item xs={12} md={6} key={report._id}>
                <Card
                  variant="outlined"
                  style={{
                    borderRadius: "12px",
                    borderColor: "#d0d7de",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <CardContent style={{ padding: "16px" }}>
                    {/* Top row: Reason chip & report date */}
                    <Box
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <Chip
                        label={reasonMeta.label}
                        color={reasonMeta.color}
                        size="small"
                        icon={<WarningIcon fontSize="small" />}
                        style={{ fontWeight: 600 }}
                      />
                      <Typography variant="caption" style={{ color: "#73787c" }}>
                        {formatDate(report.createdAt)}
                      </Typography>
                    </Box>

                    {/* Contact Info Header */}
                    <Box
                      style={{
                        backgroundColor: "#f7fafc",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #edf2f7",
                        marginBottom: "12px",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        style={{
                          fontWeight: 700,
                          color: "#152d3b",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginBottom: "4px",
                        }}
                      >
                        <PersonIcon fontSize="small" color="primary" />
                        {contact ? contact.name : "איש קשר שנמחק"}
                      </Typography>

                      {contact && (
                        <Box
                          style={{
                            display: "flex",
                            gap: "14px",
                            flexWrap: "wrap",
                            fontSize: "13px",
                            color: "#546e7a",
                          }}
                        >
                          <Box style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <PhoneIcon style={{ fontSize: "14px" }} />
                            <span dir="ltr">{contact.phone}</span>
                            <Tooltip title="ערוך פרטי איש קשר">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenFullEdit(report)}
                                style={{ padding: "2px", marginRight: "2px" }}
                              >
                                <EditIcon style={{ fontSize: "14px", color: "#1976d2" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {contact.email && (
                            <Box style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <EmailIcon style={{ fontSize: "14px" }} />
                              <span dir="ltr">{contact.email}</span>
                              <Tooltip title="ערוך פרטי איש קשר">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenFullEdit(report)}
                                  style={{ padding: "2px", marginRight: "2px" }}
                                >
                                  <EditIcon style={{ fontSize: "14px", color: "#1976d2" }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      )}

                      {contact?.createdBy?.email && (
                        <Box
                          style={{
                            marginTop: "8px",
                            paddingTop: "6px",
                            borderTop: "1px dashed #cfd8dc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "6px",
                            fontSize: "12px",
                            color: "#455a64",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            🛡️ נוסף ע״י: <strong style={{ color: "#152d3b" }}>{contact.createdBy.email}</strong>
                          </span>
                          {contact.createdAt && (
                            <span style={{ color: "#78909c" }}>
                              {new Date(contact.createdAt).toLocaleDateString("he-IL")}
                            </span>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* 13.3: Suggested Correction */}
                    {report.suggestedCorrection && (
                      <Box
                        style={{
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          marginBottom: "10px",
                        }}
                      >
                        <Typography
                          variant="caption"
                          style={{ color: "#166534", fontWeight: 700, display: "block" }}
                        >
                          תיקון שהוצע על ידי המדווח:
                        </Typography>
                        <Typography
                          variant="body2"
                          style={{
                            fontWeight: 600,
                            color: "#14532d",
                            direction: report.reason === "WRONG_EMAIL" ? "ltr" : "rtl",
                            textAlign: report.reason === "WRONG_EMAIL" ? "left" : "right",
                          }}
                        >
                          {report.suggestedCorrection}
                        </Typography>
                      </Box>
                    )}

                    {/* 13.3: Free text comment */}
                    {report.freeTextComment && (
                      <Box
                        style={{
                          backgroundColor: "#fffbeb",
                          border: "1px solid #fef3c7",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          marginBottom: "10px",
                        }}
                      >
                        <Typography
                          variant="caption"
                          style={{ color: "#92400e", fontWeight: 700, display: "block" }}
                        >
                          הערות נוספות:
                        </Typography>
                        <Typography variant="body2" style={{ color: "#78350f" }}>
                          {report.freeTextComment}
                        </Typography>
                      </Box>
                    )}

                    {/* Reporter info */}
                    <Typography variant="caption" style={{ color: "#94a3b8", display: "block" }}>
                      דווח על ידי: <strong>{report.reportedBy ? report.reportedBy.email : "אנונימי"}</strong>
                    </Typography>
                  </CardContent>

                  <Divider />

                  {/* 13.4: Dismiss button & Quick Edit */}
                  <CardActions style={{ padding: "10px 16px", justifyContent: "space-between" }}>
                    {contact && (
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenFullEdit(report)}
                        color="primary"
                        variant="outlined"
                      >
                        עדכן פרטים
                      </Button>
                    )}

                    <Button
                      size="small"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() => setReportToDismiss(report)}
                      color="error"
                      variant="contained"
                    >
                      סגור דיווח
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Confirmation Dialog for Dismissing Report (13.7) */}
      <Dialog
        open={Boolean(reportToDismiss)}
        onClose={() => !dismissing && setReportToDismiss(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ style: { direction: "rtl", borderRadius: "12px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#152d3b" }}>
          סגירת דיווח
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ color: "#4a6171" }}>
            האם אתה בטוח שברצונך לסגור דיווח זה?
            <br />
            הדיווח יימחק ומספר הדיווחים של איש הקשר יופחת אוטומטית.
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={() => setReportToDismiss(null)} disabled={dismissing} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleConfirmDismiss}
            disabled={dismissing}
            color="error"
            variant="contained"
            startIcon={dismissing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {dismissing ? "סוגר..." : "אישור וסגירה"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Edit Contact Dialog */}
      <Dialog
        open={Boolean(fullEditTarget)}
        onClose={() => !savingEdit && setFullEditTarget(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { direction: "rtl", borderRadius: "16px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#152d3b", paddingBottom: "4px" }}>
          עדכון פרטי איש קשר
        </DialogTitle>

        <DialogContent style={{ paddingTop: "8px" }}>
          {editFormError && (
            <Alert severity="error" style={{ marginBottom: "16px" }}>
              {editFormError}
            </Alert>
          )}

          {/* פרטי הדיווח שהתקבל – מוצגים בראש הטופס */}
          {fullEditTarget && (
            <Box
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <Box style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Typography variant="caption" style={{ color: "#64748b", fontWeight: 700 }}>
                  סיבת הדיווח:
                </Typography>
                <Chip
                  label={REASON_LABELS[fullEditTarget.reportReason]?.label || fullEditTarget.reportReason}
                  color={REASON_LABELS[fullEditTarget.reportReason]?.color || "default"}
                  size="small"
                  style={{ fontWeight: 600, height: "22px" }}
                />
              </Box>

              {fullEditTarget.suggestedCorrection && (
                <Box style={{ marginBottom: "6px" }}>
                  <Typography variant="caption" style={{ color: "#166534", fontWeight: 700, display: "block" }}>
                    תיקון שהוצע ע״י המדווח (שובץ בטופס):
                  </Typography>
                  <Typography variant="body2" style={{ color: "#15803d", fontWeight: 600 }}>
                    {fullEditTarget.suggestedCorrection}
                  </Typography>
                </Box>
              )}

              {fullEditTarget.freeTextComment && (
                <Box style={{ marginBottom: "4px" }}>
                  <Typography variant="caption" style={{ color: "#92400e", fontWeight: 700, display: "block" }}>
                    הערת המדווח:
                  </Typography>
                  <Typography variant="body2" style={{ color: "#78350f" }}>
                    {fullEditTarget.freeTextComment}
                  </Typography>
                </Box>
              )}

              {fullEditTarget.reporterEmail && (
                <Typography variant="caption" style={{ color: "#94a3b8", display: "block" }}>
                  מדווח: {fullEditTarget.reporterEmail}
                </Typography>
              )}
            </Box>
          )}

          {/* שדות הטופס המלאים */}
          {fullEditTarget && (
            <Box style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
              {/* שורה 1: שם פרטי ושם משפחה */}
              <Box style={{ display: "flex", gap: "12px" }}>
                <TextField
                  label="שם פרטי"
                  value={fullEditTarget.firstName}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, firstName: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="שם משפחה"
                  value={fullEditTarget.lastName}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, lastName: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                />
              </Box>

              {/* שורה 2: טלפון רגיל וטלפון כשר */}
              <Box style={{ display: "flex", gap: "12px" }}>
                <TextField
                  label="טלפון רגיל"
                  placeholder="050-1234567"
                  value={fullEditTarget.phone}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                  inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
                />
                <TextField
                  label="טלפון כשר"
                  placeholder="050-1234567"
                  value={fullEditTarget.kosherPhone}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, kosherPhone: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                  inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
                />
              </Box>

              {/* שורה 3: מחזור ואימייל */}
              <Box style={{ display: "flex", gap: "12px" }}>
                <TextField
                  label="מחזור"
                  placeholder='לדוגמה: כ"ח'
                  value={fullEditTarget.machzor}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, machzor: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="כתובת אימייל"
                  placeholder="example@gmail.com"
                  value={fullEditTarget.email}
                  onChange={(e) =>
                    setFullEditTarget((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                  fullWidth
                  size="small"
                  inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          style={{
            padding: "16px 24px",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <Button
            onClick={() => setFullEditTarget(null)}
            disabled={savingEdit}
            color="inherit"
          >
            ביטול
          </Button>

          <Box style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button
              onClick={() => handleSaveFullEdit(false)}
              disabled={savingEdit}
              color="primary"
              variant="outlined"
            >
              שמור שינויים
            </Button>
            <Button
              onClick={() => handleSaveFullEdit(true)}
              disabled={savingEdit}
              color="primary"
              variant="contained"
              style={{ backgroundColor: "#152d3b", color: "#ffffff", fontWeight: 700 }}
              startIcon={savingEdit ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            >
              {savingEdit ? "שומר..." : "שמור שינויים וסגור דיווח"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar notification */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        ContentProps={{
          style: {
            backgroundColor: "#152d3b",
            color: "#ffffff",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
          },
        }}
      />
    </Box>
  );
}

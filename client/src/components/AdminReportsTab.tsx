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

  // Edit contact modal state
  const [editTarget, setEditTarget] = useState<{
    contactId: string;
    field: "name" | "phone" | "email";
    currentValue: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      setSnackbarMsg("הדיווח נסגר בהצלחה");
      setReportToDismiss(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בסגירת הדיווח");
    } finally {
      setDismissing(false);
    }
  };

  const handleOpenEdit = (
    contactId: string,
    field: "name" | "phone" | "email",
    currentValue: string,
    suggestedValue?: string,
  ) => {
    setEditTarget({ contactId, field, currentValue });
    setEditValue(suggestedValue || currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      if (editTarget.field === "name") {
        await adminService.updateContactName(editTarget.contactId, editValue.trim());
      } else if (editTarget.field === "phone") {
        await adminService.updateContactPhone(editTarget.contactId, editValue.trim());
      } else if (editTarget.field === "email") {
        await adminService.updateContactEmail(editTarget.contactId, editValue.trim());
      }

      setSnackbarMsg("פרטי איש הקשר עודכנו בהצלחה");
      setEditTarget(null);
      await fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בעדכון איש הקשר");
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
                            <Tooltip title="ערוך מספר בשידור ישיר">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleOpenEdit(
                                    contact._id,
                                    "phone",
                                    contact.phone,
                                    report.reason === "WRONG_NUMBER" ? report.suggestedCorrection : undefined,
                                  )
                                }
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
                              <Tooltip title="ערוך מייל בשידור ישיר">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleOpenEdit(
                                      contact._id,
                                      "email",
                                      contact.email || "",
                                      report.reason === "WRONG_EMAIL" ? report.suggestedCorrection : undefined,
                                    )
                                  }
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
                        onClick={() =>
                          handleOpenEdit(
                            contact._id,
                            report.reason === "WRONG_NUMBER"
                              ? "phone"
                              : report.reason === "WRONG_EMAIL"
                              ? "email"
                              : "name",
                            report.reason === "WRONG_NUMBER"
                              ? contact.phone
                              : report.reason === "WRONG_EMAIL"
                              ? contact.email || ""
                              : contact.name,
                            report.suggestedCorrection,
                          )
                        }
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

      {/* Edit Contact Direct Dialog (13.5) */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => !savingEdit && setEditTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ style: { direction: "rtl", borderRadius: "12px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#152d3b" }}>
          {editTarget?.field === "name"
            ? "עדכון שם איש קשר"
            : editTarget?.field === "phone"
            ? "עדכון מספר טלפון"
            : "עדכון כתובת מייל"}
        </DialogTitle>
        <DialogContent style={{ paddingTop: "8px" }}>
          <TextField
            label={
              editTarget?.field === "name"
                ? "שם איש קשר"
                : editTarget?.field === "phone"
                ? "מספר טלפון"
                : "כתובת מייל"
            }
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            fullWidth
            size="small"
            style={{ marginTop: "8px" }}
            inputProps={{
              style: {
                direction: editTarget?.field === "name" ? "rtl" : "ltr",
              },
            }}
          />
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={() => setEditTarget(null)} disabled={savingEdit} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={savingEdit || !editValue.trim()}
            color="primary"
            variant="contained"
            startIcon={savingEdit ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {savingEdit ? "שומר..." : "שמור שינויים"}
          </Button>
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

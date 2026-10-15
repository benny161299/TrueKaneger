import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  LockOpen as LockOpenIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
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
  DialogTitle,
  Divider,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  adminService,
  type AdminUserItem,
} from "../services/adminService";

export function AdminUsersTab() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation dialog state (13.7)
  const [targetUserForBan, setTargetUserForBan] = useState<{
    user: AdminUserItem;
    newBannedStatus: boolean;
  } | null>(null);
  const [togglingBan, setTogglingBan] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בטעינת משתמשים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    return users.filter((u) => {
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
  }, [users, searchQuery]);

  const handleConfirmBanToggle = async () => {
    if (!targetUserForBan) return;
    setTogglingBan(true);
    try {
      await adminService.toggleUserBan(
        targetUserForBan.user._id,
        targetUserForBan.newBannedStatus,
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetUserForBan.user._id
            ? {
                ...u,
                isBanned: targetUserForBan.newBannedStatus,
                approvalStatus: targetUserForBan.newBannedStatus ? "rejected" : "pending",
              }
            : u,
        ),
      );

      adminService.notifyCountsChanged();

      setSnackbarMsg(
        targetUserForBan.newBannedStatus
          ? `המשתמש ${targetUserForBan.user.email} נחסם בהצלחה`
          : `חסימת המשתמש ${targetUserForBan.user.email} בוטלה בהצלחה`,
      );
      setTargetUserForBan(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "שגיאה בעדכון מצב החסימה");
    } finally {
      setTogglingBan(false);
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
      {/* Top Header Controls */}
      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Typography variant="h6" style={{ fontWeight: 700, color: "#152d3b" }}>
            ניהול משתמשים
          </Typography>
          {!loading && (
            <Chip
              label={`${users.length} משתמשים`}
              color="primary"
              variant="outlined"
              size="small"
              style={{ fontWeight: 600 }}
            />
          )}
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
          />
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            variant="outlined"
            size="small"
            disabled={loading}
            style={{ whiteSpace: "nowrap" }}
          >
            רענן
          </Button>
        </Box>
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
            טוען משתמשים...
          </Typography>
        </Box>
      ) : filteredUsers.length === 0 ? (
        /* Empty search state */
        <Box
          style={{
            backgroundColor: "#ffffff",
            padding: "36px 24px",
            borderRadius: "12px",
            border: "1px solid #e0e3e7",
            textAlign: "center",
          }}
        >
          <Typography variant="body1" style={{ color: "#73787c" }}>
            {searchQuery
              ? `לא נמצאו משתמשים התואמים את החיפוש "${searchQuery}"`
              : "לא נמצאו משתמשים במערכת."}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Mobile Card View (< md) - מותאם למובייל עם כל פרטי המשתמש */}
          <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: "12px" }}>
            {filteredUsers.map((u) => {
              const isSelf = currentAdmin?.email === u.email;
              const fullName =
                u.firstName || u.lastName
                  ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                  : null;

              return (
                <Card
                  key={u._id}
                  variant="outlined"
                  sx={{
                    borderRadius: "12px",
                    borderColor: "#d0d7de",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <CardContent sx={{ padding: "14px 14px 10px !important" }}>
                    {/* Header: Full Name or Placeholder, Machzor Chip, and 'אתה' */}
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <Box style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <PersonIcon style={{ color: "#152d3b", fontSize: "22px", flexShrink: 0 }} />
                        <Box>
                          <Typography
                            variant="subtitle1"
                            style={{
                              fontWeight: 700,
                              color: fullName ? "#152d3b" : "#64748b",
                              lineHeight: 1.2,
                            }}
                          >
                            {fullName || "משתמש ללא שם מלא"}
                          </Typography>
                          {isSelf && (
                            <Chip
                              label="אתה"
                              size="small"
                              color="info"
                              style={{ height: "18px", fontSize: "10px", marginTop: "4px" }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Machzor Chip */}
                      {u.machzor ? (
                        <Chip
                          icon={<SchoolIcon style={{ fontSize: "15px" }} />}
                          label={u.machzor.includes("לא זוכר") ? u.machzor : `מחזור ${u.machzor}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          style={{ fontWeight: 600, flexShrink: 0 }}
                        />
                      ) : (
                        <Chip
                          label="מחזור לא ידוע"
                          size="small"
                          variant="outlined"
                          style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}
                        />
                      )}
                    </Box>

                    {/* Details Box: Email & Phone */}
                    <Box
                      sx={{
                        backgroundColor: "#f8fafc",
                        p: 1.25,
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        mb: 1.25,
                      }}
                    >
                      {/* Email */}
                      <Box style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <EmailIcon fontSize="small" style={{ color: "#64748b", fontSize: "17px", flexShrink: 0 }} />
                        <Typography
                          variant="body2"
                          style={{
                            color: "#334155",
                            direction: "ltr",
                            textAlign: "right",
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.email}
                        </Typography>
                      </Box>

                      {/* Phone */}
                      {u.phone ? (
                        <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <PhoneIcon fontSize="small" style={{ color: "#2563eb", fontSize: "17px", flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            dir="ltr"
                            component="a"
                            href={`tel:${u.phone}`}
                            style={{
                              color: "#2563eb",
                              textDecoration: "none",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                            }}
                          >
                            {u.phone}
                          </Typography>
                        </Box>
                      ) : (
                        <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <PhoneIcon fontSize="small" style={{ color: "#cbd5e1", fontSize: "17px", flexShrink: 0 }} />
                          <Typography variant="caption" style={{ color: "#94a3b8" }}>
                            לא הוזן מספר טלפון
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Badges: Role and Status & Join Date */}
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <Box style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {u.role === "admin" ? (
                          <Chip
                            icon={<AdminPanelSettingsIcon style={{ fontSize: "14px" }} />}
                            label="מנהל"
                            size="small"
                            color="error"
                            style={{ fontWeight: 600, height: "24px" }}
                          />
                        ) : (
                          <Chip
                            label="משתמש"
                            size="small"
                            variant="outlined"
                            style={{ fontWeight: 500, height: "24px" }}
                          />
                        )}

                        {u.isBanned ? (
                          <Chip
                            icon={<BlockIcon style={{ fontSize: "13px" }} />}
                            label="חסום"
                            size="small"
                            color="error"
                            style={{ fontWeight: 600, height: "24px" }}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircleIcon style={{ fontSize: "13px" }} />}
                            label="פעיל"
                            size="small"
                            color="success"
                            variant="outlined"
                            style={{ fontWeight: 500, height: "24px" }}
                          />
                        )}
                      </Box>

                      {/* Join Date */}
                      <Typography variant="caption" style={{ color: "#73787c" }}>
                        הצטרף/ה: {formatDate(u.createdAt)}
                      </Typography>
                    </Box>
                  </CardContent>

                  {/* Actions */}
                  <Divider />
                  <CardActions sx={{ padding: "8px 14px", justifyContent: "flex-end" }}>
                    {isSelf ? (
                      <Typography variant="caption" style={{ color: "#94a3b8" }}>
                        אינך יכול לחסום את עצמך
                      </Typography>
                    ) : u.isBanned ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<LockOpenIcon />}
                        onClick={() =>
                          setTargetUserForBan({
                            user: u,
                            newBannedStatus: false,
                          })
                        }
                      >
                        בטל חסימה
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<BlockIcon />}
                        onClick={() =>
                          setTargetUserForBan({
                            user: u,
                            newBannedStatus: true,
                          })
                        }
                      >
                        חסום משתמש
                      </Button>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          {/* Desktop Table View (>= md) */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              display: { xs: "none", md: "block" },
              borderRadius: "12px",
              borderColor: "#d0d7de",
              overflowX: "auto",
            }}
          >
            <Table>
              <TableHead style={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>אימייל</TableCell>
                  <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>שם ומחזור</TableCell>
                  <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>תפקיד</TableCell>
                  <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>סטטוס הרשאה</TableCell>
                  <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>תאריך הצטרפות</TableCell>
                  <TableCell align="left" style={{ fontWeight: 700, color: "#152d3b" }}>
                    פעולות
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredUsers.map((u) => {
                  const isSelf = currentAdmin?.email === u.email;

                  return (
                    <TableRow key={u._id} hover>
                      {/* Email */}
                      <TableCell>
                        <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <PersonIcon fontSize="small" style={{ color: "#73787c" }} />
                          <Typography variant="body2" style={{ fontWeight: 600 }}>
                            {u.email}
                          </Typography>
                          {isSelf && (
                            <Chip
                              label="אתה"
                              size="small"
                              color="info"
                              style={{ height: "20px", fontSize: "11px" }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* Name & Machzor */}
                      <TableCell>
                        {u.firstName || u.lastName ? (
                          <Box>
                            <Typography variant="body2" style={{ fontWeight: 600, color: "#152d3b" }}>
                              {`${u.firstName || ""} ${u.lastName || ""}`.trim()}
                            </Typography>
                            <Typography variant="caption" style={{ color: "#64748b" }}>
                              {u.machzor ? `מחזור ${u.machzor}` : "מחזור לא ידוע"} {u.phone ? `• ${u.phone}` : ""}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" style={{ color: "#9ca3af" }}>
                            טרם השלים פרטים
                          </Typography>
                        )}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {u.role === "admin" ? (
                          <Chip
                            icon={<AdminPanelSettingsIcon style={{ fontSize: "16px" }} />}
                            label="מנהל"
                            size="small"
                            color="error"
                            style={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            label="משתמש"
                            size="small"
                            variant="outlined"
                            style={{ fontWeight: 500 }}
                          />
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          {u.isBanned ? (
                            <Chip
                              icon={<BlockIcon style={{ fontSize: "14px" }} />}
                              label="חסום"
                              size="small"
                              color="error"
                              style={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircleIcon style={{ fontSize: "14px" }} />}
                              label="פעיל"
                              size="small"
                              color="success"
                              variant="outlined"
                              style={{ fontWeight: 500 }}
                            />
                          )}

                          {u.role !== "admin" && (
                            u.isApproved ? (
                              <Chip
                                label="מאושר"
                                size="small"
                                color="success"
                                style={{ fontWeight: 600 }}
                              />
                            ) : u.approvalStatus === "rejected" ? (
                              <Chip
                                label="נדחה"
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="ממתין"
                                size="small"
                                color="warning"
                              />
                            )
                          )}
                        </Box>
                      </TableCell>

                      {/* CreatedAt */}
                      <TableCell>
                        <Typography variant="caption" style={{ color: "#73787c" }}>
                          {formatDate(u.createdAt)}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="left">
                        {isSelf ? (
                          <Typography variant="caption" style={{ color: "#94a3b8" }}>
                            אינך יכול לחסום את עצמך
                          </Typography>
                        ) : u.isBanned ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<LockOpenIcon />}
                            onClick={() =>
                              setTargetUserForBan({
                                user: u,
                                newBannedStatus: false,
                              })
                            }
                          >
                            בטל חסימה
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<BlockIcon />}
                            onClick={() =>
                              setTargetUserForBan({
                                user: u,
                                newBannedStatus: true,
                              })
                            }
                          >
                            חסום משתמש
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Confirmation Dialog for Toggling Ban (13.7) */}
      <Dialog
        open={Boolean(targetUserForBan)}
        onClose={() => !togglingBan && setTargetUserForBan(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ style: { direction: "rtl", borderRadius: "12px" } }}
      >
        <DialogTitle style={{ fontWeight: 700, color: "#152d3b" }}>
          {targetUserForBan?.newBannedStatus ? "חסימת משתמש" : "ביטול חסימת משתמש"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ color: "#4a6171", lineHeight: 1.6 }}>
            {targetUserForBan?.newBannedStatus ? (
              <>
                האם אתה בטוח שברצונך לחסום את המשתמש{" "}
                <strong>{targetUserForBan.user.email}</strong>?
                <br />
                משתמש חסום לא יוכל להתחבר למערכת או לבצע חשיפת פרטים.
              </>
            ) : (
              <>
                האם לבטל את החסימה עבור המשתמש{" "}
                <strong>{targetUserForBan?.user.email}</strong>?
                <br />
                המשתמש יוכל להתחבר שוב למערכת.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={() => setTargetUserForBan(null)} disabled={togglingBan} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={handleConfirmBanToggle}
            disabled={togglingBan}
            color={targetUserForBan?.newBannedStatus ? "error" : "success"}
            variant="contained"
            startIcon={togglingBan ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {togglingBan
              ? "מעדכן..."
              : targetUserForBan?.newBannedStatus
              ? "אישור חסימה"
              : "אישור ביטול חסימה"}
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

import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  LockOpen as LockOpenIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
    return users.filter((u) => u.email.toLowerCase().includes(q));
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
            ? { ...u, isBanned: targetUserForBan.newBannedStatus }
            : u,
        ),
      );

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

        <Box style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <TextField
            size="small"
            placeholder="חיפוש לפי אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "240px" }}
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
        /* Users Table (13.6) */
        <TableContainer
          component={Paper}
          variant="outlined"
          style={{ borderRadius: "12px", borderColor: "#d0d7de" }}
        >
          <Table>
            <TableHead style={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>אימייל</TableCell>
                <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>תפקיד</TableCell>
                <TableCell style={{ fontWeight: 700, color: "#152d3b" }}>סטטוס</TableCell>
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

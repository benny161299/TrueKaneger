import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import {
  Block as BlockIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Logout as LogoutIcon,
  PersonOutline as PersonOutlineIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export function ApprovalGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // מנהלי מערכת מאושרים תמיד ועוקפים את כל החסימות
  if (user?.role === "admin") {
    return <>{children}</>;
  }

  // 1. מקרה חסימה או דחייה ע"י מנהל המערכת (שתי החסימות מאוחדות לאותו מסך)
  if (user?.isBanned || user?.approvalStatus === "rejected") {
    return <RejectedView />;
  }

  // 2. משתמש מאושר נכנס חופשי
  if (user?.isApproved) {
    return <>{children}</>;
  }

  // 3. חסרים פרטי פרופיל (שם, טלפון או מחזור)
  if (!user?.isProfileComplete) {
    return <CompleteProfileView />;
  }

  // 4. פרטי הפרופיל מלאים, אך המשתמש ממתין לאישור מנהל
  return <PendingApprovalView />;
}

/**
 * מסך השלמת פרטים (מופיע למשתמשי גוגל, נרשמים חדשים ומשתמשים ותיקים)
 */
function CompleteProfileView() {
  const { user, completeProfile, logout } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [machzor, setMachzor] = useState(user?.machzor || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (firstName.trim().length < 2) {
      setErrorMsg("שם פרטי חייב להכיל לפחות 2 תווים");
      return;
    }
    if (lastName.trim().length < 2) {
      setErrorMsg("שם משפחה חייב להכיל לפחות 2 תווים");
      return;
    }
    const cleanPhone = phone.trim();
    if (!/^05\d-?\d{7}$/.test(cleanPhone)) {
      setErrorMsg("מספר טלפון סלולרי לא חוקי (חייב להתחיל ב-05 ולהכיל 10 ספרות)");
      return;
    }
    const cleanMachzor = machzor.trim();

    setLoading(true);
    try {
      await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanPhone,
        machzor: cleanMachzor ? cleanMachzor : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "שמירת הפרטים נכשלה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "75vh",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: "480px",
          width: "100%",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#e8f0f8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <PersonOutlineIcon sx={{ fontSize: 32, color: "#152d3b" }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#152d3b", mb: 1 }}>
              השלמת פרטים אישיים
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              האלפון הינו מאגר סגור לבני ובוגרי הישיבה. כדי שמנהל המערכת יוכל לאשר את גישתך, אנא הכנס את פרטיך:
            </Typography>
          </Box>

          {user?.reidentificationRequested && (
            <Alert severity="warning" sx={{ mb: 2.5, fontWeight: 600, textAlign: "right" }}>
              לא סיפקת מספיק פרטים, לא הצלחנו לזהות אותך. אנא הכנס פרטים מחדש.
            </Alert>
          )}

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  label="שם פרטי"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="שם משפחה"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
              </Box>

              <TextField
                label="מספר טלפון סלולרי"
                placeholder="050-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                size="small"
                required
                inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
                helperText="ישמש את מנהל המערכת לזיהוי ואימות"
              />

              <TextField
                label="מחזור (אופציונלי)"
                placeholder='לדוגמה: כ"ח'
                helperText="לא חובה - אם אינך בטוח תוכל להשאיר ריק"
                value={machzor}
                onChange={(e) => setMachzor(e.target.value)}
                fullWidth
                size="small"
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: "#152d3b",
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: "15px",
                  "&:hover": { backgroundColor: "#1e3d50" },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "שלח בקשה לאישור מנהל"}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: "center" }}>
            <Button
              onClick={() => logout()}
              size="small"
              startIcon={<LogoutIcon />}
              sx={{ color: "#64748b" }}
            >
              התנתק מהחשבון
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * מסך המתנה לאישור מנהל
 */
function PendingApprovalView() {
  const { user, refreshUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await refreshUser();
    setTimeout(() => setChecking(false), 500);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "75vh",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: "460px",
          width: "100%",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#fff7ed",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <HourglassEmptyIcon sx={{ fontSize: 36, color: "#d97706" }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: "#152d3b", mb: 1 }}>
            חשבונך ממתין לאישור מנהל
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mb: 3, px: 2 }}>
            תודה שהזנת את פרטיך. הפרטים הועברו לבדיקת מנהל המערכת. ברגע שהגישה תאושר, תוכל לצפות באלפון באופן מיידי.
          </Typography>

          <Box
            sx={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              p: 2,
              mb: 3,
              textAlign: "right",
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 0.5 }}>
              פרטי הבקשה שנשלחו:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {user?.firstName} {user?.lastName}
              {user?.machzor
                ? ` (${user.machzor.includes("לא זוכר") ? user.machzor : `מחזור ${user.machzor}`})`
                : " (מחזור לא ידוע)"}
            </Typography>
            {user?.phone && (
              <Typography variant="body2" sx={{ color: "#475569" }} dir="ltr">
                {user.phone}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "12px" }}>
              {user?.email}
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={checking}
              startIcon={checking ? <CircularProgress size={18} /> : <RefreshIcon />}
              sx={{ py: 1, borderColor: "#cbd5e1", color: "#1e293b" }}
            >
              {checking ? "בודק..." : "בדוק מצב אישור"}
            </Button>

            <Button
              onClick={() => logout()}
              size="small"
              startIcon={<LogoutIcon />}
              sx={{ color: "#94a3b8" }}
            >
              התנתק
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * מסך הודעה על בקשה שנדחתה
 */
function RejectedView() {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "75vh",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: "440px",
          width: "100%",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          border: "1px solid #fee2e2",
          textAlign: "center",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <BlockIcon sx={{ fontSize: 32, color: "#ef4444" }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: "#991b1b", mb: 1 }}>
            חשבונך לא אושר או נחסם
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            מנהל המערכת לא אישר את בקשת הגישה לחשבון זה או שחשבונך נחסם. לפניות ושאלות אנא פנה למנהל המערכת.
          </Typography>

          <Button
            variant="contained"
            onClick={() => logout()}
            startIcon={<LogoutIcon />}
            sx={{ backgroundColor: "#152d3b" }}
          >
            התנתק
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

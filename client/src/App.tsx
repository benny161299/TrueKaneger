import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import type React from "react";
import { useEffect, useState } from "react";
import {
  Route,
  Link as RouterLink,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { loginSchema, registerSchema } from "shared";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { useContacts } from "./context/ContactsContext";

// --- Styled Components ---

const AppContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f7fafc",
});

const StickyHeader = styled(AppBar)({
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #c3c7cc",
  boxShadow: "none",
  position: "sticky",
  top: 0,
  zIndex: 1000,
});

const CustomToolbar = styled(Toolbar)({
  display: "flex",
  justifyContent: "space-between",
  maxWidth: "1280px",
  width: "100%",
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
});

const LogoText = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontSize: "24px",
  fontWeight: 700,
  color: "#152d3b",
  textDecoration: "none",
  cursor: "pointer",
});

const NavActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "16px",
});

const UserEmailText = styled(Typography)({
  fontSize: "14px",
  color: "#4a6171",
});

const MainContent = styled(Box)({
  flex: 1,
  padding: "32px 16px",
  maxWidth: "1280px",
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
});

const FormCard = styled(Card)({
  maxWidth: "450px",
  width: "100%",
  margin: "80px auto 0",
  borderRadius: "8px",
});

const StyledCardContent = styled(CardContent)({
  display: "flex",
  flexDirection: "column",
  padding: "32px",
});

const PageTitle = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontWeight: 700,
  color: "#152d3b",
  marginBottom: "8px",
});

const UnderlineBar = styled(Box)({
  width: "60px",
  height: "4px",
  backgroundColor: "#152d3b",
  borderRadius: "9999px",
  marginBottom: "24px",
});

const InputField = styled(TextField)({
  marginBottom: "20px",
  width: "100%",
});

const ActionButton = styled(Button)({
  width: "100%",
  marginTop: "10px",
  padding: "12px 16px",
});

const GoogleButton = styled(Button)({
  width: "100%",
  marginTop: "12px",
  padding: "12px 16px",
  backgroundColor: "#ffffff",
  color: "#181c1e",
  border: "1px solid #c3c7cc",
  "&:hover": {
    backgroundColor: "#ebeef0",
    border: "1px solid #73787c",
  },
});

const FormFooter = styled(Box)({
  marginTop: "20px",
  textAlign: "center",
  fontSize: "14px",
  color: "#4a6171",
});

const StyledLink = styled(RouterLink)({
  color: "#152d3b",
  textDecoration: "none",
  fontWeight: 600,
  marginLeft: "4px",
  "&:hover": {
    textDecoration: "underline",
  },
});

const StyledAlert = styled(Alert)({
  marginBottom: "20px",
});

const ContactsGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "24px",
});

const ContactCard = styled(Card)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
});

const ContactName = styled(Typography)({
  fontFamily: '"Domine", serif',
  fontSize: "18px",
  fontWeight: 600,
  color: "#152d3b",
});

const ContactAvatar = styled(Box)({
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "#cde6f9",
  color: "#041e2b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "16px",
});

const ContactHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
  gap: "12px",
});

const StyledWarningIcon = styled(WarningIcon)({
  color: "#d32f2f",
  cursor: "pointer",
});

const InfoItemBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  backgroundColor: "#f1f4f6",
  borderRadius: "4px",
  border: "1px solid #c3c7cc",
  marginBottom: "12px",
  gap: "12px",
  transition: "background-color 0.2s ease-in-out, transform 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#ebeef0",
    transform: "translateY(-1px)",
  },
});

const CircularIconWrapper = styled(Box)({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: "#cde6f9",
  color: "#041e2b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const InfoValueText = styled(Typography)({
  fontFamily: '"Work Sans", sans-serif',
  fontSize: "15px",
  fontWeight: 500,
  color: "#181c1e",
  direction: "ltr",
  textAlign: "right",
});

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getReportBreakdownTooltip(
  breakdown?: Record<string, number>,
  totalCount = 0,
) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <Typography variant="body2">{`קיימים ${totalCount} דיווחים על איש קשר זה`}</Typography>
    );
  }

  const translations: Record<string, string> = {
    WRONG_NUMBER: "מספר לא נכון",
    DOES_NOT_EXIST: "איש קשר לא קיים",
    WRONG_NAME: "שם לא נכון",
    WRONG_EMAIL: "מייל לא נכון",
    OTHER: "אחר",
  };

  return (
    <Box style={{ padding: "4px" }}>
      <Typography
        variant="subtitle2"
        style={{ fontWeight: 600, marginBottom: "4px" }}
      >
        קיימים דיווחים על איש קשר זה:
      </Typography>
      {Object.entries(breakdown).map(([reason, count]) => {
        const reasonHebrew = translations[reason] || "דיווח אחר";
        return (
          <Typography key={reason} variant="body2" style={{ fontSize: "13px" }}>
            • {count} אנשים דיווחו על {reasonHebrew}
          </Typography>
        );
      })}
    </Box>
  );
}

// --- View Components ---

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <StickyHeader position="static">
      <CustomToolbar>
        <LogoText variant="h6" onClick={() => navigate("/")}>
          אלפון הישיבה
        </LogoText>
        <NavActions>
          {user ? (
            <>
              {user.role === "admin" && (
                <Button color="secondary" onClick={() => navigate("/admin")}>
                  ניהול
                </Button>
              )}
              <UserEmailText variant="body2">{user.email}</UserEmailText>
              <Button variant="outlined" color="primary" onClick={logout}>
                התנתק
              </Button>
            </>
          ) : (
            <>
              <Button color="primary" onClick={() => navigate("/login")}>
                התחבר
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/register")}
              >
                הרשם
              </Button>
            </>
          )}
        </NavActions>
      </CustomToolbar>
    </StickyHeader>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    // Client-side validation using Zod loginSchema
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      const from = location.state?.from || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || "התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <StyledCardContent>
          <PageTitle variant="h5">התחברות</PageTitle>
          <UnderlineBar />
          {errorMsg && <StyledAlert severity="error">{errorMsg}</StyledAlert>}
          <InputField
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            required
          />
          <InputField
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            required
          />
          <ActionButton
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "התחבר"}
          </ActionButton>
          <GoogleButton
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => {
              window.location.href = "/api/auth/google";
            }}
          >
            התחבר עם Google
          </GoogleButton>
          <FormFooter>
            אין לך חשבון?
            <StyledLink to="/register">הרשם כאן</StyledLink>
          </FormFooter>
        </StyledCardContent>
      </form>
    </FormCard>
  );
}

function RegisterScreen() {
  const { register, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});

    // Client-side validation using Zod registerSchema
    const validation = registerSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Register the user
      await register(email, password);
      // 2. Automatically log them in
      await login(email, password);
      // 3. Redirect to home
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message || "הרשמה או התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <StyledCardContent>
          <PageTitle variant="h5">הרשמה</PageTitle>
          <UnderlineBar />
          {errorMsg && <StyledAlert severity="error">{errorMsg}</StyledAlert>}
          {successMsg && (
            <StyledAlert severity="success">{successMsg}</StyledAlert>
          )}
          <InputField
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            required
          />
          <InputField
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            required
          />
          <ActionButton
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "הרשם"}
          </ActionButton>
          <FormFooter>
            כבר יש לך חשבון?
            <StyledLink to="/login">התחבר כאן</StyledLink>
          </FormFooter>
        </StyledCardContent>
      </form>
    </FormCard>
  );
}

function HomeScreen() {
  const { contacts, loading, error, fetchContacts, revealContact } =
    useContacts();
  const [revealedInfo, setRevealedInfo] = useState<
    Record<string, { phone: string; email: string | null }>
  >({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts().catch(console.error);
  }, [fetchContacts]);

  const handleReveal = async (id: string) => {
    setRevealingId(id);
    try {
      const data = await revealContact(id);
      setRevealedInfo((prev) => ({ ...prev, [id]: data }));
    } catch (err: any) {
      alert(err.message || "חריגה ממגבלת הגילויים");
    } finally {
      setRevealingId(null);
    }
  };

  return (
    <Box>
      <PageTitle variant="h4">אנשי קשר</PageTitle>
      <UnderlineBar />

      {error && <StyledAlert severity="error">{error}</StyledAlert>}

      {loading && contacts.length === 0 ? (
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <ContactsGrid>
          {contacts.map((c) => {
            const initial = c.name ? c.name.charAt(0) : "?";
            const isRevealed = !!revealedInfo[c._id];
            const data = revealedInfo[c._id];

            return (
              <ContactCard key={c._id}>
                <StyledCardContent>
                  <ContactHeader>
                    <ContactAvatar>{initial}</ContactAvatar>
                    <ContactName variant="h6">{c.name}</ContactName>
                    {c.reportCount > 0 && (
                      <>
                        <Box style={{ flexGrow: 1 }} />
                        <Tooltip
                          title={getReportBreakdownTooltip(
                            c.reportBreakdown,
                            c.reportCount,
                          )}
                        >
                          <StyledWarningIcon fontSize="medium" />
                        </Tooltip>
                      </>
                    )}
                  </ContactHeader>

                  {isRevealed && data ? (
                    <Box style={{ marginTop: "12px" }}>
                      <InfoItemBox>
                        <CircularIconWrapper>
                          <PhoneIcon fontSize="small" />
                        </CircularIconWrapper>
                        <InfoValueText>{data.phone}</InfoValueText>
                      </InfoItemBox>
                      {data.email && (
                        <InfoItemBox>
                          <CircularIconWrapper>
                            <EmailIcon fontSize="small" />
                          </CircularIconWrapper>
                          <InfoValueText>{data.email}</InfoValueText>
                        </InfoItemBox>
                      )}
                    </Box>
                  ) : null}
                </StyledCardContent>
                <CardActions style={{ padding: "0 32px 32px 32px" }}>
                  {!isRevealed && (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => handleReveal(c._id)}
                      disabled={revealingId === c._id}
                    >
                      {revealingId === c._id ? "גילוי..." : "הצג פרטי איש קשר"}
                    </Button>
                  )}
                </CardActions>
              </ContactCard>
            );
          })}
        </ContactsGrid>
      )}
    </Box>
  );
}

function AdminScreen() {
  return (
    <Box>
      <PageTitle variant="h4">פאנל ניהול (מנהל מערכת)</PageTitle>
      <UnderlineBar />
      <Typography variant="body1">
        שלום מנהל המערכת! זהו דשבורד הניהול המאפשר לך לעקוב אחר דיווחים, לנהל
        משתמשים ולעדכן פרטי קשר.
      </Typography>
    </Box>
  );
}

// --- Main App ---

export function App() {
  return (
    <AppContainer>
      <Header />
      <MainContent>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginScreen />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterScreen />
              </PublicOnlyRoute>
            }
          />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

export default App;

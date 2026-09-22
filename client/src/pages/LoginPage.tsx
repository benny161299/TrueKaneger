import { CircularProgress } from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "shared";
import { GoogleIcon } from "../components/GoogleIcon";
import { useAuth } from "../context/AuthContext";
import {
  ActionButton,
  FormCard,
  FormFooter,
  GoogleButton,
  InputField,
  PageTitle,
  StyledAlert,
  StyledCardContent,
  StyledLink,
  UnderlineBar,
} from "../styles/shared";

export function LoginPage() {
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
      <form onSubmit={handleSubmit} noValidate>
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

import { CircularProgress } from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerSchema } from "shared";
import { useAuth } from "../context/AuthContext";
import {
  ActionButton,
  FormCard,
  FormFooter,
  InputField,
  PageTitle,
  StyledAlert,
  StyledCardContent,
  StyledLink,
  UnderlineBar,
} from "../styles/shared";

export function RegisterPage() {
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
      <form onSubmit={handleSubmit} noValidate>
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

import { PersonAdd as PersonAddIcon } from "@mui/icons-material";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import type React from "react";
import { useState } from "react";
import { createContactSchema } from "shared";
import { useContacts } from "../context/ContactsContext";
import { StyledAlert } from "../styles/shared";

// --- Styled Components ---

const StyledDialogTitle = styled(DialogTitle)({
  fontFamily: '"Domine", serif',
  fontWeight: 700,
  color: "#152d3b",
  paddingBottom: "8px",
});

const StyledDialogContent = styled(DialogContent)({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  paddingTop: "16px !important",
  minWidth: "360px",
});

const StyledDialogActions = styled(DialogActions)({
  padding: "16px 24px",
  gap: "8px",
});

// --- Component ---

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export function AddContactDialog({ open, onClose, onSuccess }: AddContactDialogProps) {
  const { addContact } = useContacts();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setFieldErrors({});
    setErrorMsg("");
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    // Client-side Zod validation
    const validation = createContactSchema.safeParse({ name, phone, email });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0],
        phone: formatted.phone?._errors[0],
        email: formatted.email?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      await addContact(name, phone, email || undefined);
      const addedName = name.trim();
      resetForm();
      onClose();
      onSuccess?.(addedName);
    } catch (err: any) {
      setErrorMsg(err.message || "הוספת איש קשר נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <StyledDialogTitle>הוספת איש קשר</StyledDialogTitle>

        <StyledDialogContent>
          {errorMsg && <StyledAlert severity="error">{errorMsg}</StyledAlert>}

          <TextField
            id="add-contact-name"
            label="שם מלא"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
            required
            autoFocus
            fullWidth
          />

          <TextField
            id="add-contact-phone"
            label="מספר טלפון"
            placeholder="050-1234567"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            error={!!fieldErrors.phone}
            helperText={fieldErrors.phone ?? "פורמט: 05X-XXXXXXX"}
            required
            fullWidth
            inputProps={{ dir: "ltr" }}
          />

          <TextField
            id="add-contact-email"
            label="אימייל (אופציונלי)"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            fullWidth
            inputProps={{ dir: "ltr" }}
          />
        </StyledDialogContent>

        <StyledDialogActions>
          <Button onClick={handleClose} disabled={loading} color="inherit">
            ביטול
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} /> : <PersonAddIcon />
            }
          >
            {loading ? "מוסיף..." : "הוסף"}
          </Button>
        </StyledDialogActions>
      </form>
    </Dialog>
  );
}

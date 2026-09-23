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

const StyledDialogTitle = styled(DialogTitle)({
  fontFamily: '"Domine", serif',
  fontWeight: 700,
  color: "#152d3b",
  padding: "16px 20px 6px",
  fontSize: "1.2rem",
});

const StyledDialogContent = styled(DialogContent)({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "6px 20px 12px !important",
  minWidth: 0,
  overflowX: "hidden",
});

const StyledDialogActions = styled(DialogActions)({
  padding: "8px 20px 16px",
  gap: "8px",
});

// --- Component ---

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export function AddContactDialog({ open, onClose, onSuccess }: AddContactDialogProps) {
  const { addContact } = useContacts();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
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
    const validation = createContactSchema.safeParse({ firstName, lastName, phone, email });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        firstName: formatted.firstName?._errors[0],
        lastName: formatted.lastName?._errors[0],
        phone: formatted.phone?._errors[0],
        email: formatted.email?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      await addContact({ firstName, lastName, phone, email: email || undefined });
      const addedName = `${lastName} ${firstName}`.trim();
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          margin: { xs: "12px", sm: "32px" },
          width: { xs: "calc(100% - 24px)", sm: "100%" },
          maxWidth: "440px",
          borderRadius: "12px",
          overflowX: "hidden",
        },
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <StyledDialogTitle>הוספת איש קשר לאלפון</StyledDialogTitle>

        <StyledDialogContent>
          {errorMsg && <StyledAlert severity="error">{errorMsg}</StyledAlert>}

          <TextField
            id="add-contact-last-name"
            label="שם משפחה"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
            }}
            error={!!fieldErrors.lastName}
            helperText={fieldErrors.lastName}
            size="small"
            required
            autoFocus
            fullWidth
          />

          <TextField
            id="add-contact-first-name"
            label="שם פרטי"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
            }}
            error={!!fieldErrors.firstName}
            helperText={fieldErrors.firstName}
            size="small"
            required
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
            helperText={fieldErrors.phone ?? ""}
            size="small"
            required
            fullWidth
            inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
          />

          <TextField
            id="add-contact-email"
            label="אימייל (אופציונלי)"
            placeholder="example@mail.com"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            size="small"
            fullWidth
            inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
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

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
  kosherPhone?: string;
  nonKosherPhone?: string;
  machzor?: string;
  email?: string;
}

export function AddContactDialog({ open, onClose, onSuccess }: AddContactDialogProps) {
  const { addContact } = useContacts();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [kosherPhone, setKosherPhone] = useState("");
  const [nonKosherPhone, setNonKosherPhone] = useState("");
  const [machzor, setMachzor] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setKosherPhone("");
    setNonKosherPhone("");
    setMachzor("");
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
    const validation = createContactSchema.safeParse({
      firstName,
      lastName,
      kosherPhone: kosherPhone || undefined,
      nonKosherPhone: nonKosherPhone || undefined,
      machzor: machzor || undefined,
      email: email || undefined,
    });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        firstName: formatted.firstName?._errors[0],
        lastName: formatted.lastName?._errors[0],
        kosherPhone: formatted.kosherPhone?._errors[0],
        nonKosherPhone: formatted.nonKosherPhone?._errors[0],
        machzor: formatted.machzor?._errors[0],
        email: formatted.email?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      await addContact({
        firstName,
        lastName,
        kosherPhone: kosherPhone || undefined,
        nonKosherPhone: nonKosherPhone || undefined,
        phone: kosherPhone || nonKosherPhone,
        machzor: machzor || undefined,
        email: email || undefined,
      });
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
            id="add-contact-kosher-phone"
            label="מספר כשר"
            placeholder="050-1234567"
            value={kosherPhone}
            onChange={(e) => {
              setKosherPhone(e.target.value);
              setFieldErrors((prev) => ({ ...prev, kosherPhone: undefined }));
            }}
            error={!!fieldErrors.kosherPhone}
            helperText={fieldErrors.kosherPhone || "חיוג בלבד (ללא SMS)"}
            size="small"
            fullWidth
            inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
          />

          <TextField
            id="add-contact-non-kosher-phone"
            label="מספר לא כשר"
            placeholder="052-1234567"
            value={nonKosherPhone}
            onChange={(e) => {
              setNonKosherPhone(e.target.value);
              setFieldErrors((prev) => ({ ...prev, nonKosherPhone: undefined }));
            }}
            error={!!fieldErrors.nonKosherPhone}
            helperText={fieldErrors.nonKosherPhone || "חיוג, וואטסאפ ו-SMS"}
            size="small"
            fullWidth
            inputProps={{ dir: "ltr", style: { textAlign: "right" } }}
          />

          <TextField
            id="add-contact-machzor"
            label="מחזור (אופציונלי)"
            placeholder='לדוגמה: ל"ב או 32'
            value={machzor}
            onChange={(e) => {
              setMachzor(e.target.value);
              setFieldErrors((prev) => ({ ...prev, machzor: undefined }));
            }}
            error={!!fieldErrors.machzor}
            helperText={fieldErrors.machzor}
            size="small"
            fullWidth
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

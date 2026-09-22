import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useContacts } from "../context/ContactsContext";
import type { ContactData } from "./ContactCard";

export interface ReportContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact: ContactData | null;
  onSuccess?: () => void;
}

type ReportReason =
  | "WRONG_NUMBER"
  | "DOES_NOT_EXIST"
  | "WRONG_NAME"
  | "WRONG_EMAIL";

const phoneRegex = /^05\d-?\d{7}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCorrectionValidationError(
  reason: ReportReason,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // Field is optional!

  if (reason === "WRONG_NUMBER") {
    if (!phoneRegex.test(trimmed)) {
      return "מספר טלפון לא תקין (פורמט: 05X-XXXXXXX או 05XXXXXXXX)";
    }
  } else if (reason === "WRONG_EMAIL") {
    if (!emailRegex.test(trimmed)) {
      return "כתובת אימייל לא תקינה (לדוגמה: name@example.com)";
    }
  }
  return null;
}

const REASON_OPTIONS: {
  value: ReportReason;
  label: string;
  placeholder: string;
  correctionLabel: string;
}[] = [
  {
    value: "WRONG_NUMBER",
    label: "מספר לא נכון",
    placeholder: "לדוגמה: 050-1234567",
    correctionLabel: "מספר טלפון מעודכן (אם ידוע)",
  },
  {
    value: "DOES_NOT_EXIST",
    label: "איש קשר לא קיים",
    placeholder: "פירוט מדוע איש הקשר אינו קיים במערכת...",
    correctionLabel: "הסבר נוסף",
  },
  {
    value: "WRONG_NAME",
    label: "שם לא נכון",
    placeholder: "לדוגמה: ישראל ישראלי",
    correctionLabel: "שם מתוקן (אם ידוע)",
  },
  {
    value: "WRONG_EMAIL",
    label: "מייל לא נכון",
    placeholder: "לדוגמה: name@example.com",
    correctionLabel: "כתובת מייל תקינה (אם ידועה)",
  },
];

export function ReportContactDialog({
  open,
  onClose,
  contact,
  onSuccess,
}: ReportContactDialogProps) {
  const { reportContact } = useContacts();

  const [reason, setReason] = useState<ReportReason>("WRONG_NUMBER");
  const [suggestedCorrection, setSuggestedCorrection] = useState("");
  const [freeTextComment, setFreeTextComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!contact) return null;

  const currentOption =
    REASON_OPTIONS.find((opt) => opt.value === reason) || REASON_OPTIONS[0];

  const correctionError = getCorrectionValidationError(
    reason,
    suggestedCorrection,
  );

  const handleReset = () => {
    setReason("WRONG_NUMBER");
    setSuggestedCorrection("");
    setFreeTextComment("");
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErr = getCorrectionValidationError(
      reason,
      suggestedCorrection,
    );
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);

    try {
      await reportContact(
        contact._id,
        reason,
        suggestedCorrection.trim() || undefined,
        freeTextComment.trim() || undefined,
      );
      handleReset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "שליחת הדיווח נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: "12px",
          direction: "rtl",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          style={{
            fontWeight: 700,
            fontFamily: '"Domine", serif',
            color: "#152d3b",
            paddingBottom: "8px",
          }}
        >
          דיווח על פרטים לא תקינים
        </DialogTitle>

        <DialogContent style={{ paddingTop: "8px" }}>
          <Typography
            variant="body2"
            style={{ color: "#546e7a", marginBottom: "16px" }}
          >
            איש קשר: <strong>{contact.name}</strong>
          </Typography>

          {error && (
            <Alert severity="error" style={{ marginBottom: "16px" }}>
              {error}
            </Alert>
          )}

          {/* 12.1 Radio buttons */}
          <FormControl component="fieldset" style={{ width: "100%", marginBottom: "16px" }}>
            <FormLabel
              component="legend"
              style={{ fontSize: "14px", fontWeight: 600, color: "#152d3b", marginBottom: "6px" }}
            >
              מה הסיבה לדיווח?
            </FormLabel>
            <RadioGroup
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as ReportReason);
                setSuggestedCorrection("");
                setError(null);
              }}
            >
              {REASON_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio size="small" color="error" />}
                  label={<Typography variant="body2">{opt.label}</Typography>}
                />
              ))}
            </RadioGroup>
          </FormControl>

          {/* 12.2 Dynamic field based on reason with format validation */}
          <TextField
            label={currentOption.correctionLabel}
            placeholder={currentOption.placeholder}
            value={suggestedCorrection}
            onChange={(e) => {
              setSuggestedCorrection(e.target.value);
              if (error) setError(null);
            }}
            fullWidth
            size="small"
            error={Boolean(correctionError && suggestedCorrection.trim())}
            helperText={
              (suggestedCorrection.trim() && correctionError) ||
              (reason === "WRONG_NUMBER" || reason === "WRONG_EMAIL"
                ? "אופציונלי — במידה וממלאים, יש להזין פורמט תקין"
                : "אופציונלי")
            }
            style={{ marginBottom: "14px" }}
            inputProps={{ style: { direction: reason === "WRONG_EMAIL" ? "ltr" : "rtl" } }}
          />

          {/* 12.3 Fixed free text comment field */}
          <TextField
            label="הערות נוספות / פירוט חופשי"
            placeholder="פרט מידע שיעזור לצוות לבדוק את הדיווח..."
            value={freeTextComment}
            onChange={(e) => setFreeTextComment(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
        </DialogContent>

        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={handleClose} disabled={submitting} color="inherit">
            ביטול
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={submitting || Boolean(correctionError && suggestedCorrection.trim())}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? "שולח דיווח..." : "שלח דיווח"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

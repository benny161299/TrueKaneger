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
import { useEffect, useMemo, useState } from "react";
import { useContacts } from "../context/ContactsContext";
import type { ContactData } from "./ContactCard";
import type { RevealedContactData } from "./ContactRevealDrawer";

export interface ReportContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact: ContactData | null;
  revealedData?: RevealedContactData | null;
  onSuccess?: () => void;
}

type ReportReason =
  | "WRONG_NON_KOSHER_PHONE"
  | "WRONG_KOSHER_PHONE"
  | "ADD_NON_KOSHER_PHONE"
  | "ADD_KOSHER_PHONE"
  | "WRONG_NUMBER"
  | "DOES_NOT_EXIST"
  | "WRONG_NAME"
  | "WRONG_EMAIL"
  | "ADD_EMAIL"
  | "OTHER";

const phoneRegex = /^05\d-?\d{7}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REASONS: ReportReason[] = [
  "WRONG_NON_KOSHER_PHONE",
  "WRONG_KOSHER_PHONE",
  "ADD_NON_KOSHER_PHONE",
  "ADD_KOSHER_PHONE",
  "WRONG_NUMBER",
];

const EMAIL_REASONS: ReportReason[] = [
  "WRONG_EMAIL",
  "ADD_EMAIL",
];

function getCorrectionValidationError(
  reason: ReportReason,
  value: string,
): string | null {
  const trimmed = value.trim();
  const isAdd = reason.startsWith("ADD_");

  if (!trimmed) {
    if (isAdd) {
      if (EMAIL_REASONS.includes(reason)) {
        return "שדה חובה — יש להזין כתובת אימייל להוספה";
      }
      return "שדה חובה — יש להזין מספר טלפון להוספה";
    }
    return null; // Field is optional for non-add reasons
  }

  if (PHONE_REASONS.includes(reason)) {
    if (!phoneRegex.test(trimmed)) {
      return "מספר טלפון לא תקין (פורמט: 05X-XXXXXXX או 05XXXXXXXX)";
    }
  } else if (EMAIL_REASONS.includes(reason)) {
    if (!emailRegex.test(trimmed)) {
      return "כתובת אימייל לא תקינה (לדוגמה: name@example.com)";
    }
  }
  return null;
}

export function ReportContactDialog({
  open,
  onClose,
  contact,
  revealedData,
  onSuccess,
}: ReportContactDialogProps) {
  const { reportContact } = useContacts();

  // יצירת רשימת האפשרויות הדינמיות לפי הפרטים הקיימים או החסרים
  // כל אפשרויות ההוספה (➕) מוצגות בראש הרשימה, לאחר מכן דיווחי שגיאה, ולבסוף אפשרויות כלליות
  const dynamicOptions = useMemo(() => {
    const hasKosher = Boolean(revealedData?.kosherPhone);
    const hasNonKosher = Boolean(
      revealedData?.nonKosherPhone ||
      (!revealedData?.kosherPhone && revealedData?.phone)
    );
    const hasEmail = Boolean(revealedData?.email);

    type OptionItem = {
      value: ReportReason;
      label: string;
      placeholder: string;
      correctionLabel: string;
    };

    const addOpts: OptionItem[] = [];
    const wrongOpts: OptionItem[] = [];

    // טלפון לא כשר (רגיל): אם אין -> הוספה בראש, אם יש -> דיווח שגוי
    if (!hasNonKosher) {
      addOpts.push({
        value: "ADD_NON_KOSHER_PHONE",
        label: "הוספת מספר לא כשר",
        placeholder: "לדוגמה: 050-1234567",
        correctionLabel: "מספר לא כשר להוספה",
      });
    } else {
      wrongOpts.push({
        value: "WRONG_NON_KOSHER_PHONE",
        label: "מספר לא כשר שגוי",
        placeholder: "לדוגמה: 050-1234567",
        correctionLabel: "מספר לא כשר מתוקן (אם ידוע)",
      });
    }

    // טלפון כשר: אם אין -> הוספה בראש, אם יש -> דיווח שגוי
    if (!hasKosher) {
      addOpts.push({
        value: "ADD_KOSHER_PHONE",
        label: "הוספת מספר כשר",
        placeholder: "לדוגמה: 050-1234567",
        correctionLabel: "מספר כשר להוספה",
      });
    } else {
      wrongOpts.push({
        value: "WRONG_KOSHER_PHONE",
        label: "מספר כשר שגוי",
        placeholder: "לדוגמה: 050-1234567",
        correctionLabel: "מספר כשר מתוקן (אם ידוע)",
      });
    }

    // אימייל: אם אין -> הוספה בראש, אם יש -> דיווח שגוי
    if (!hasEmail) {
      addOpts.push({
        value: "ADD_EMAIL",
        label: "הוספת כתובת מייל",
        placeholder: "לדוגמה: name@example.com",
        correctionLabel: "כתובת מייל להוספה",
      });
    } else {
      wrongOpts.push({
        value: "WRONG_EMAIL",
        label: "מייל לא נכון",
        placeholder: "לדוגמה: name@example.com",
        correctionLabel: "כתובת מייל תקינה (אם ידועה)",
      });
    }

    // אפשרויות קבועות כלליות
    const generalOpts: OptionItem[] = [
      {
        value: "WRONG_NAME",
        label: "שם לא נכון",
        placeholder: "לדוגמה: ישראל ישראלי",
        correctionLabel: "שם מתוקן (אם ידוע)",
      },
      {
        value: "DOES_NOT_EXIST",
        label: "איש קשר לא קיים במערכת",
        placeholder: "פירוט מדוע איש הקשר אינו קיים במערכת...",
        correctionLabel: "הסבר נוסף",
      },
      {
        value: "OTHER",
        label: "אחר",
        placeholder: "פירוט הבקשה או ההערה...",
        correctionLabel: "פרטים נוספים",
      },
    ];

    return [...addOpts, ...wrongOpts, ...generalOpts];
  }, [revealedData]);

  const [reason, setReason] = useState<ReportReason>(dynamicOptions[0]?.value || "WRONG_NON_KOSHER_PHONE");
  const [suggestedCorrection, setSuggestedCorrection] = useState("");
  const [freeTextComment, setFreeTextComment] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // סנכרון הבחירה הראשונית כאשר האפשרויות הדינמיות משתנות
  useEffect(() => {
    if (dynamicOptions.length > 0 && !dynamicOptions.some((o) => o.value === reason)) {
      setReason(dynamicOptions[0].value);
    }
  }, [dynamicOptions, reason]);

  if (!contact) return null;

  const currentOption =
    dynamicOptions.find((opt) => opt.value === reason) || dynamicOptions[0];

  const isAddOption = reason.startsWith("ADD_");
  const isEmail = EMAIL_REASONS.includes(reason);

  const correctionError = getCorrectionValidationError(
    reason,
    suggestedCorrection,
  );

  const isCorrectionInvalid = isAddOption
    ? (!suggestedCorrection.trim() || Boolean(correctionError))
    : Boolean(correctionError && suggestedCorrection.trim());

  const handleReset = () => {
    setReason(dynamicOptions[0]?.value || "WRONG_NON_KOSHER_PHONE");
    setSuggestedCorrection("");
    setFreeTextComment("");
    setTouched(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
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
          דווח על בעיה / הוסף פרטים
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

          {/* אפשרויות בחירה דינמיות */}
          <FormControl component="fieldset" style={{ width: "100%", marginBottom: "16px" }}>
            <FormLabel
              component="legend"
              style={{ fontSize: "14px", fontWeight: 600, color: "#152d3b", marginBottom: "6px" }}
            >
              מה ברצונך לדווח או לעדכן?
            </FormLabel>
            <RadioGroup
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as ReportReason);
                setSuggestedCorrection("");
                setTouched(false);
                setError(null);
              }}
            >
              {dynamicOptions.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio size="small" color={opt.value.startsWith("ADD_") ? "primary" : "error"} />}
                  label={
                    <Typography
                      variant="body2"
                      style={{
                        fontWeight: reason === opt.value ? 600 : 400,
                        color: opt.value.startsWith("ADD_") ? "#1565c0" : "inherit",
                      }}
                    >
                      {opt.value.startsWith("ADD_") ? `➕ ${opt.label}` : opt.label}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          {/* שדה תיקון/הוספה דינמי לפי הבחירה */}
          {currentOption && (
            <TextField
              required={isAddOption}
              label={currentOption.correctionLabel}
              placeholder={currentOption.placeholder}
              value={suggestedCorrection}
              onChange={(e) => {
                setSuggestedCorrection(e.target.value);
                setTouched(true);
                if (error) setError(null);
              }}
              onBlur={() => setTouched(true)}
              fullWidth
              size="small"
              error={Boolean(touched && correctionError)}
              helperText={
                touched && correctionError
                  ? correctionError
                  : isAddOption
                    ? (isEmail ? "שדה חובה — נא להזין כתובת אימייל" : "שדה חובה — נא להזין מספר טלפון")
                    : (PHONE_REASONS.includes(reason) || EMAIL_REASONS.includes(reason)
                      ? "אופציונלי — במידה וממלאים, יש להזין פורמט תקין"
                      : "אופציונלי")
              }
              style={{ marginBottom: "14px" }}
              inputProps={{ style: { direction: isEmail ? "ltr" : "rtl" } }}
            />
          )}

          {/* שדה הערות נוספות קבוע */}
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
            color={isAddOption ? "primary" : "error"}
            disabled={submitting || isCorrectionInvalid}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? "שולח..." : isAddOption ? "הוסף פרטים" : "שלח דיווח"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

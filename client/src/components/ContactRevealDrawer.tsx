import {
  Check as CheckIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Email as EmailIcon,
  IosShare as IosShareIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
  Warning as WarningIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Snackbar,
  SwipeableDrawer,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { ReportBreakdownContent, type ContactData } from "./ContactCard";

// --- Helpers ---

/** Converts Israeli phone (050-1234567) → WhatsApp number (972501234567) */
function toWhatsAppNumber(phone: string): string {
  const cleaned = phone.replace(/[-\s]/g, "");
  return cleaned.startsWith("0") ? "972" + cleaned.slice(1) : cleaned;
}

/** Generates a vCard string for downloading as .vcf */
function generateVCard(
  name: string,
  kosherPhone?: string | null,
  nonKosherPhone?: string | null,
  fallbackPhone?: string | null,
  email?: string | null
): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
  ];
  if (kosherPhone) lines.push(`TEL;TYPE=CELL,KOSHER:${kosherPhone}`);
  if (nonKosherPhone) lines.push(`TEL;TYPE=CELL:${nonKosherPhone}`);
  if (!kosherPhone && !nonKosherPhone && fallbackPhone) {
    lines.push(`TEL;TYPE=CELL:${fallbackPhone}`);
  }
  if (email) lines.push(`EMAIL:${email}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Downloads the contact as a .vcf file — iOS/Android open it as "Add Contact" */
function downloadVCard(
  name: string,
  kosherPhone?: string | null,
  nonKosherPhone?: string | null,
  fallbackPhone?: string | null,
  email?: string | null
): void {
  const vcf = generateVCard(name, kosherPhone, nonKosherPhone, fallbackPhone, email);
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Styled Components ---

const DrawerHandle = styled(Box)({
  width: 40,
  height: 5,
  backgroundColor: "#d0d3d6",
  borderRadius: 99,
  margin: "10px auto 4px",
  flexShrink: 0,
});

const AvatarCircle = styled(Box)({
  width: 52,
  height: 52,
  borderRadius: "50%",
  backgroundColor: "#cde6f9",
  color: "#041e2b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "22px",
  flexShrink: 0,
});

// InfoRow is a clickable row that copies value to clipboard
const InfoRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "14px 16px",
  backgroundColor: "#f7fafc",
  borderRadius: "8px",
  border: "1px solid #e0e3e7",
  marginBottom: "12px",
  cursor: "pointer",
  transition: "background-color 0.15s, transform 0.1s, border-color 0.15s",
  "&:hover": {
    backgroundColor: "#edf2f7",
    borderColor: "#b0c4de",
    transform: "translateY(-1px)",
  },
});

const IconCircle = styled(Box)({
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "#cde6f9",
  color: "#041e2b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const ValueText = styled(Typography)({
  fontFamily: '"Work Sans", sans-serif',
  fontSize: "16px",
  fontWeight: 500,
  color: "#181c1e",
  direction: "ltr",
  flex: 1,
  wordBreak: "break-all",
});

const ActionButtonsRow = styled(Box)({
  display: "flex",
  gap: "8px",
  marginTop: "8px",
  flexWrap: "wrap",
});

export interface RevealedContactData {
  phone: string;
  kosherPhone?: string | null;
  nonKosherPhone?: string | null;
  machzor?: string | null;
  email: string | null;
  hasReported?: boolean;
  adminMeta?: {
    createdByEmail: string;
    createdById: string;
    createdAt?: string;
  };
}

interface DrawerBodyProps {
  contact: ContactData;
  revealedData?: RevealedContactData;
  isRevealing: boolean;
  revealError?: string;
  onClose: () => void;
  onRetry?: () => void;
  onOpenReport?: (contact: ContactData) => void;
}

function DrawerBody({
  contact,
  revealedData,
  isRevealing,
  revealError,
  onClose,
  onRetry,
  onOpenReport,
}: DrawerBodyProps) {
  const initial = contact.name ? contact.name.charAt(0) : "?";
  const kosherPhone = revealedData?.kosherPhone;
  const nonKosherPhone = revealedData?.nonKosherPhone;
  const legacyPhone = !kosherPhone && !nonKosherPhone ? revealedData?.phone : null;
  const machzor = revealedData?.machzor || contact.machzor;
  const email = revealedData?.email;

  const [copiedField, setCopiedField] = useState<"kosher" | "nonKosher" | "phone" | "email" | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [reportsAnchorEl, setReportsAnchorEl] = useState<null | HTMLElement>(null);

  const handleCopyText = async (val: string, field: "kosher" | "nonKosher" | "phone" | "email", msg: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(field);
      setSnackbarMsg(msg);
      setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const buildShareText = () => {
    return [
      contact.name,
      machzor ? `מחזור: ${machzor}` : "",
      kosherPhone ? `מספר כשר: ${kosherPhone}` : "",
      nonKosherPhone ? `מספר לא כשר: ${nonKosherPhone}` : "",
      legacyPhone ? `טלפון: ${legacyPhone}` : "",
      email ? `מייל: ${email}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyAll = async () => {
    setShareAnchorEl(null);
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMsg("פרטי איש הקשר הועתקו ללוח");
    } catch (err) {
      console.error("Failed to copy contact details:", err);
    }
  };

  const handleNativeShare = async () => {
    setShareAnchorEl(null);
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: contact.name, text });
      } catch {
        // User cancelled share or failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setSnackbarMsg("שיתוף אינו נתמך בדפדפן זה — הפרטים הועתקו ללוח");
      } catch (err) {
        console.error("Failed to copy details:", err);
      }
    }
  };

  return (
    <>
      {/* Header */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          padding: "20px 20px 16px",
          gap: "14px",
        }}
      >
        <AvatarCircle>{initial}</AvatarCircle>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            style={{
              fontFamily: '"Domine", serif',
              fontWeight: 700,
              color: "#152d3b",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.name}
          </Typography>
          <Box style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
            {machzor && (
              <Typography
                variant="caption"
                style={{
                  backgroundColor: "#e2ecf4",
                  color: "#152d3b",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                מחזור {machzor}
              </Typography>
            )}
            <Typography variant="body2" style={{ color: "#4a6171" }}>
              {isRevealing
                ? "טוען פרטי קשר..."
                : revealedData
                  ? "פרטי קשר"
                  : revealError
                    ? "שגיאה בטעינה"
                    : ""}
            </Typography>
          </Box>
        </Box>

        {contact.reportCount > 0 && (
          <>
            <Tooltip title="פרטי דיווחים על איש קשר">
              <IconButton
                size="small"
                onClick={(e) => setReportsAnchorEl(e.currentTarget)}
                aria-label="פרטי דיווח על איש קשר"
                style={{
                  padding: "6px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <WarningIcon style={{ color: "#d32f2f", fontSize: "20px" }} />
              </IconButton>
            </Tooltip>

            <Popover
              open={Boolean(reportsAnchorEl)}
              anchorEl={reportsAnchorEl}
              onClose={() => setReportsAnchorEl(null)}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              PaperProps={{
                style: {
                  padding: "16px",
                  borderRadius: "12px",
                  maxWidth: "320px",
                  width: "calc(100vw - 48px)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
                  direction: "rtl",
                },
              }}
            >
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <WarningIcon style={{ color: "#d32f2f", fontSize: "20px" }} />
                  <Typography
                    variant="subtitle2"
                    style={{ fontWeight: 700, color: "#152d3b", fontSize: "15px" }}
                  >
                    דיווחי משתמשים
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setReportsAnchorEl(null)}
                  aria-label="סגור"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <ReportBreakdownContent
                breakdown={contact.reportBreakdown}
                totalCount={contact.reportCount}
              />
            </Popover>
          </>
        )}

        <IconButton onClick={onClose} size="small" aria-label="סגור">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Body */}
      <Box style={{ padding: "20px" }}>
        {/* Loading */}
        {isRevealing && !revealedData && (
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "32px 0",
            }}
          >
            <CircularProgress />
            <Typography variant="body2" style={{ color: "#4a6171" }}>
             
            </Typography>
          </Box>
        )}

        {/* Error */}
        {revealError && !isRevealing && !revealedData && (
          revealError.includes("מגבלת") || revealError.includes("429") ? (
            <Box
              style={{
                backgroundColor: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: "12px",
                padding: "24px 16px",
                textAlign: "center",
                margin: "12px 0 16px",
              }}
            >
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "#ffecb3",
                  color: "#b78103",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <HourglassEmptyIcon fontSize="medium" />
              </Box>
              <Typography
                variant="subtitle1"
                style={{ fontWeight: 700, color: "#8d6e00", marginBottom: "6px" }}
              >
                מגבלת גילויים
              </Typography>
              <Typography
                variant="body2"
                style={{
                  color: "#5d4037",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                {revealError}
              </Typography>
              <Typography
                variant="caption"
                style={{
                  color: "#8d6e00",
                  display: "block",
                  marginBottom: onRetry ? "16px" : "0",
                }}
              >
                כדי להגן על פרטיות המשתמשים, קיימת מגבלה על קצב חשיפת הפרטים.
              </Typography>
              {onRetry && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onRetry}
                  style={{
                    borderColor: "#ffb300",
                    color: "#8d6e00",
                    fontWeight: 600,
                  }}
                >
                  נסה שוב
                </Button>
              )}
            </Box>
          ) : (
            <Alert severity="error" style={{ marginBottom: "12px" }}>
              {revealError}
            </Alert>
          )
        )}

        {/* Revealed data */}
        {revealedData && (kosherPhone || nonKosherPhone || legacyPhone) && (
          <>
            {/* Kosher phone section (CALL ONLY, NO SMS, NO WHATSAPP) */}
            {kosherPhone && (
              <Box style={{ marginBottom: "16px" }}>
                <Typography variant="caption" style={{ color: "#2d6a4f", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  מספר כשר (שיחות בלבד)
                </Typography>
                <Tooltip
                  title={copiedField === "kosher" ? "הועתק ללוח!" : "לחץ להעתקת המספר הכשר"}
                  placement="top"
                >
                  <InfoRow
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopyText(kosherPhone, "kosher", "מספר הטלפון הכשר הועתק ללוח")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyText(kosherPhone, "kosher", "מספר הטלפון הכשר הועתק ללוח");
                      }
                    }}
                    style={{ marginBottom: "6px" }}
                  >
                    <IconCircle style={{ backgroundColor: "#d8f3dc", color: "#1b4332" }}>
                      <PhoneIcon fontSize="small" />
                    </IconCircle>
                    <ValueText>{kosherPhone}</ValueText>
                    <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {copiedField === "kosher" ? (
                        <Box style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2e7d32" }}>
                          <CheckIcon fontSize="small" />
                          <Typography variant="caption" style={{ fontWeight: 600, color: "#2e7d32" }}>
                            הועתק!
                          </Typography>
                        </Box>
                      ) : (
                        <ContentCopyIcon fontSize="small" style={{ color: "#73787c", opacity: 0.6 }} />
                      )}
                    </Box>
                  </InfoRow>
                </Tooltip>
                <ActionButtonsRow style={{ marginTop: 0 }}>
                  <Button
                    component="a"
                    href={`tel:${kosherPhone}`}
                    variant="outlined"
                    color="primary"
                    startIcon={<PhoneIcon />}
                    size="small"
                    style={{ flexGrow: 1 }}
                  >
                    חייג
                  </Button>
                </ActionButtonsRow>
              </Box>
            )}

            {/* Non-kosher phone section (Call, WhatsApp, SMS) */}
            {nonKosherPhone && (
              <Box style={{ marginBottom: "16px" }}>
                <Typography variant="caption" style={{ color: "#152d3b", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  מספר לא כשר
                </Typography>
                <Tooltip
                  title={copiedField === "nonKosher" ? "הועתק ללוח!" : "לחץ להעתקת המספר"}
                  placement="top"
                >
                  <InfoRow
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopyText(nonKosherPhone, "nonKosher", "מספר הטלפון הועתק ללוח")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyText(nonKosherPhone, "nonKosher", "מספר הטלפון הועתק ללוח");
                      }
                    }}
                    style={{ marginBottom: "6px" }}
                  >
                    <IconCircle>
                      <PhoneIcon fontSize="small" />
                    </IconCircle>
                    <ValueText>{nonKosherPhone}</ValueText>
                    <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {copiedField === "nonKosher" ? (
                        <Box style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2e7d32" }}>
                          <CheckIcon fontSize="small" />
                          <Typography variant="caption" style={{ fontWeight: 600, color: "#2e7d32" }}>
                            הועתק!
                          </Typography>
                        </Box>
                      ) : (
                        <ContentCopyIcon fontSize="small" style={{ color: "#73787c", opacity: 0.6 }} />
                      )}
                    </Box>
                  </InfoRow>
                </Tooltip>
                <ActionButtonsRow style={{ marginTop: 0 }}>
                  <Button
                    component="a"
                    href={`tel:${nonKosherPhone}`}
                    variant="outlined"
                    color="primary"
                    startIcon={<PhoneIcon />}
                    size="small"
                    style={{ flexGrow: 1, minWidth: "75px" }}
                  >
                    חייג
                  </Button>
                  <Button
                    component="a"
                    href={`https://wa.me/${toWhatsAppNumber(nonKosherPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    size="small"
                    style={{
                      flexGrow: 1,
                      minWidth: "75px",
                      color: "#25D366",
                      borderColor: "#25D366",
                    }}
                  >
                    וואטסאפ
                  </Button>
                  <Button
                    component="a"
                    href={`sms:${nonKosherPhone}`}
                    variant="outlined"
                    startIcon={<SmsIcon />}
                    size="small"
                    style={{
                      flexGrow: 1,
                      minWidth: "75px",
                      color: "#1565C0",
                      borderColor: "#1565C0",
                    }}
                  >
                    SMS
                  </Button>
                </ActionButtonsRow>
              </Box>
            )}

            {/* Legacy phone section (fallback if contact has legacy phone only) */}
            {legacyPhone && (
              <Box style={{ marginBottom: "16px" }}>
                <Tooltip
                  title={copiedField === "phone" ? "הועתק ללוח!" : "לחץ להעתקת מספר הטלפון"}
                  placement="top"
                >
                  <InfoRow
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopyText(legacyPhone, "phone", "מספר הטלפון הועתק ללוח")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyText(legacyPhone, "phone", "מספר הטלפון הועתק ללוח");
                      }
                    }}
                    style={{ marginBottom: "6px" }}
                  >
                    <IconCircle>
                      <PhoneIcon fontSize="small" />
                    </IconCircle>
                    <ValueText>{legacyPhone}</ValueText>
                    <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {copiedField === "phone" ? (
                        <Box style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2e7d32" }}>
                          <CheckIcon fontSize="small" />
                          <Typography variant="caption" style={{ fontWeight: 600, color: "#2e7d32" }}>
                            הועתק!
                          </Typography>
                        </Box>
                      ) : (
                        <ContentCopyIcon fontSize="small" style={{ color: "#73787c", opacity: 0.6 }} />
                      )}
                    </Box>
                  </InfoRow>
                </Tooltip>
                <ActionButtonsRow style={{ marginTop: 0 }}>
                  <Button
                    component="a"
                    href={`tel:${legacyPhone}`}
                    variant="outlined"
                    color="primary"
                    startIcon={<PhoneIcon />}
                    size="small"
                    style={{ flexGrow: 1, minWidth: "75px" }}
                  >
                    חייג
                  </Button>
                  <Button
                    component="a"
                    href={`https://wa.me/${toWhatsAppNumber(legacyPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    size="small"
                    style={{
                      flexGrow: 1,
                      minWidth: "75px",
                      color: "#25D366",
                      borderColor: "#25D366",
                    }}
                  >
                    וואטסאפ
                  </Button>
                  <Button
                    component="a"
                    href={`sms:${legacyPhone}`}
                    variant="outlined"
                    startIcon={<SmsIcon />}
                    size="small"
                    style={{
                      flexGrow: 1,
                      minWidth: "75px",
                      color: "#1565C0",
                      borderColor: "#1565C0",
                    }}
                  >
                    SMS
                  </Button>
                </ActionButtonsRow>
              </Box>
            )}

            {/* Email row & action */}
            {email && (
              <Box style={{ marginBottom: "16px" }}>
                <Tooltip
                  title={copiedField === "email" ? "הועתק ללוח!" : "לחץ להעתקת כתובת המייל"}
                  placement="top"
                >
                  <InfoRow
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCopyText(email, "email", "כתובת המייל הועתקה ללוח")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyText(email, "email", "כתובת המייל הועתקה ללוח");
                      }
                    }}
                    style={{ marginBottom: "6px" }}
                  >
                    <IconCircle>
                      <EmailIcon fontSize="small" />
                    </IconCircle>
                    <ValueText>{email}</ValueText>
                    <Box style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {copiedField === "email" ? (
                        <Box style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2e7d32" }}>
                          <CheckIcon fontSize="small" />
                          <Typography variant="caption" style={{ fontWeight: 600, color: "#2e7d32" }}>
                            הועתק!
                          </Typography>
                        </Box>
                      ) : (
                        <ContentCopyIcon fontSize="small" style={{ color: "#73787c", opacity: 0.6 }} />
                      )}
                    </Box>
                  </InfoRow>
                </Tooltip>
                <ActionButtonsRow style={{ marginTop: 0 }}>
                  <Button
                    component="a"
                    href={`mailto:${email}`}
                    variant="outlined"
                    color="secondary"
                    startIcon={<EmailIcon />}
                    size="small"
                    style={{ flexGrow: 1 }}
                  >
                    שלח מייל
                  </Button>
                </ActionButtonsRow>
              </Box>
            )}

            <Divider style={{ margin: "16px 0 12px" }} />

            {/* Secondary actions: Share + Save to Contacts */}
            <ActionButtonsRow>
              <Button
                variant="contained"
                color="primary"
                startIcon={<IosShareIcon />}
                size="small"
                style={{ flexGrow: 1 }}
                onClick={(e) => setShareAnchorEl(e.currentTarget)}
                aria-controls={Boolean(shareAnchorEl) ? "share-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(shareAnchorEl) ? "true" : undefined}
              >
                שתף
              </Button>

              <Menu
                id="share-menu"
                anchorEl={shareAnchorEl}
                open={Boolean(shareAnchorEl)}
                onClose={() => setShareAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                PaperProps={{
                  style: {
                    borderRadius: "10px",
                    minWidth: "170px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  },
                }}
              >
                <MenuItem
                  onClick={handleCopyAll}
                  style={{ gap: "10px", padding: "10px 16px" }}
                >
                  <ListItemIcon style={{ minWidth: "auto" }}>
                    <ContentCopyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "14px", fontWeight: 500 }}>
                    העתק ללוח
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={handleNativeShare}
                  style={{ gap: "10px", padding: "10px 16px" }}
                >
                  <ListItemIcon style={{ minWidth: "auto" }}>
                    <IosShareIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: "14px", fontWeight: 500 }}>
                    שיתוף במכשיר
                  </ListItemText>
                </MenuItem>
              </Menu>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<PersonAddIcon />}
                size="small"
                style={{ flexGrow: 1 }}
                onClick={() => downloadVCard(contact.name, kosherPhone, nonKosherPhone, legacyPhone, email)}
              >
                שמור לאנשי קשר
              </Button>
            </ActionButtonsRow>
          </>
        )}

        {/* 11.7: Report Issue button */}
        {!isRevealing && (
          <Box
            style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px dashed #e0e3e7",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Tooltip
              title={
                Boolean(contact.hasReported || revealedData?.hasReported)
                  ? "כבר דיווחת על איש קשר זה"
                  : "דיווח על מספר או פרטים לא תקינים"
              }
            >
              <span>
                <Button
                  id="report-issue-btn"
                  variant="text"
                  color={
                    Boolean(contact.hasReported || revealedData?.hasReported)
                      ? "inherit"
                      : "error"
                  }
                  disabled={Boolean(contact.hasReported || revealedData?.hasReported)}
                  startIcon={
                    Boolean(contact.hasReported || revealedData?.hasReported) ? (
                      <CheckCircleOutlineIcon fontSize="small" style={{ color: "#2e7d32" }} />
                    ) : (
                      <ReportProblemOutlinedIcon fontSize="small" />
                    )
                  }
                  onClick={() => onOpenReport?.(contact)}
                  size="small"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: Boolean(contact.hasReported || revealedData?.hasReported)
                      ? "#2e7d32"
                      : "#d32f2f",
                  }}
                >
                  {Boolean(contact.hasReported || revealedData?.hasReported)
                    ? "דווחת על איש קשר זה"
                    : "דווח על בעיה"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}

        {/* Admin Creator Info (Visible ONLY to Admins) */}
        {revealedData?.adminMeta && (
          <Box
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              backgroundColor: "#f0f4f8",
              borderRadius: "8px",
              border: "1px dashed #486581",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Typography
              variant="caption"
              style={{
                fontWeight: 700,
                color: "#102a43",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🛡️ מידע למנהל מערכת
            </Typography>
            <Typography variant="body2" style={{ fontSize: "13px", color: "#334e68" }}>
              איש הקשר נוסף ע״י: <strong>{revealedData.adminMeta.createdByEmail}</strong>
            </Typography>
            {revealedData.adminMeta.createdAt && (
              <Typography variant="caption" style={{ color: "#627d98" }}>
                תאריך יצירה: {new Date(revealedData.adminMeta.createdAt).toLocaleString("he-IL")}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Snackbar notification */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={2500}
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
            textAlign: "center",
            justifyContent: "center",
          },
        }}
      />
    </>
  );
}

// --- Main Component ---

export interface ContactRevealDrawerProps {
  open: boolean;
  onClose: () => void;
  contact: ContactData | null;
  revealedData?: RevealedContactData;
  isRevealing: boolean;
  revealError?: string;
  onRetry?: () => void;
  onOpenReport?: (contact: ContactData) => void;
}

export function ContactRevealDrawer({
  open,
  onClose,
  contact,
  revealedData,
  isRevealing,
  revealError,
  onRetry,
  onOpenReport,
}: ContactRevealDrawerProps) {
  const theme = useTheme();
  // Mobile: bottom drawer. Desktop: centered dialog.
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!contact) return null;

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        PaperProps={{
          style: {
            borderRadius: "20px 20px 0 0",
            maxHeight: "75vh",
            overflow: "auto",
          },
        }}
      >
        <DrawerHandle />
        <DrawerBody
          contact={contact}
          revealedData={revealedData}
          isRevealing={isRevealing}
          revealError={revealError}
          onClose={onClose}
          onRetry={onRetry}
          onOpenReport={onOpenReport}
        />
      </SwipeableDrawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        style: { borderRadius: "12px", overflow: "hidden" },
      }}
    >
      <DialogContent style={{ padding: 0 }}>
        <DrawerBody
          contact={contact}
          revealedData={revealedData}
          isRevealing={isRevealing}
          revealError={revealError}
          onClose={onClose}
          onRetry={onRetry}
          onOpenReport={onOpenReport}
        />
      </DialogContent>
    </Dialog>
  );
}

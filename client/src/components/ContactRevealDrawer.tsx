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
function generateVCard(name: string, phone: string, email?: string | null): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `TEL;TYPE=CELL:${phone}`,
  ];
  if (email) lines.push(`EMAIL:${email}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Downloads the contact as a .vcf file — iOS/Android open it as "Add Contact" */
function downloadVCard(name: string, phone: string, email?: string | null): void {
  const vcf = generateVCard(name, phone, email);
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
  const phone = revealedData?.phone;
  const email = revealedData?.email;

  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [reportsAnchorEl, setReportsAnchorEl] = useState<null | HTMLElement>(null);

  const handleCopyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedField("phone");
      setSnackbarMsg("מספר הטלפון הועתק ללוח");
      setTimeout(() => {
        setCopiedField((prev) => (prev === "phone" ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy phone:", err);
    }
  };

  const handleCopyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopiedField("email");
      setSnackbarMsg("כתובת המייל הועתקה ללוח");
      setTimeout(() => {
        setCopiedField((prev) => (prev === "email" ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const buildShareText = () => {
    return [
      contact.name,
      phone ? `טלפון: ${phone}` : "",
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
        {revealedData && phone && (
          <>
            {/* Phone row — click to copy */}
            <Tooltip
              title={copiedField === "phone" ? "הועתק ללוח!" : "לחץ להעתקת מספר הטלפון"}
              placement="top"
            >
              <InfoRow
                role="button"
                tabIndex={0}
                onClick={handleCopyPhone}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCopyPhone();
                  }
                }}
              >
                <IconCircle>
                  <PhoneIcon fontSize="small" />
                </IconCircle>
                <ValueText>{phone}</ValueText>
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

            {/* Email row — click to copy */}
            {email && (
              <Tooltip
                title={copiedField === "email" ? "הועתק ללוח!" : "לחץ להעתקת כתובת המייל"}
                placement="top"
              >
                <InfoRow
                  role="button"
                  tabIndex={0}
                  onClick={handleCopyEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCopyEmail();
                    }
                  }}
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
            )}

            <Divider style={{ margin: "16px 0 12px" }} />

            {/* Quick action buttons */}
            <Typography
              variant="caption"
              style={{ color: "#73787c", display: "block", marginBottom: "10px" }}
            >
              פעולות מהירות
            </Typography>

            <ActionButtonsRow>
              {/* Call */}
              <Button
                component="a"
                href={`tel:${phone}`}
                variant="outlined"
                color="primary"
                startIcon={<PhoneIcon />}
                size="small"
                style={{ flexGrow: 1, minWidth: "80px" }}
              >
                חייג
              </Button>

              {/* WhatsApp */}
              <Button
                component="a"
                href={`https://wa.me/${toWhatsAppNumber(phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                size="small"
                style={{
                  flexGrow: 1,
                  minWidth: "80px",
                  color: "#25D366",
                  borderColor: "#25D366",
                }}
              >
                וואטסאפ
              </Button>

              {/* SMS */}
              <Button
                component="a"
                href={`sms:${phone}`}
                variant="outlined"
                startIcon={<SmsIcon />}
                size="small"
                style={{
                  flexGrow: 1,
                  minWidth: "80px",
                  color: "#1565C0",
                  borderColor: "#1565C0",
                }}
              >
                SMS
              </Button>

              {/* Email — only if exists */}
              {email && (
                <Button
                  component="a"
                  href={`mailto:${email}`}
                  variant="outlined"
                  color="secondary"
                  startIcon={<EmailIcon />}
                  size="small"
                  style={{ flexGrow: 1, minWidth: "80px" }}
                >
                  מייל
                </Button>
              )}
            </ActionButtonsRow>

            {/* Secondary actions: Share + Save to Contacts */}
            <ActionButtonsRow style={{ marginTop: "12px" }}>
              {/* Share — menu with "העתק ללוח" and "שיתוף במכשיר" */}
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

              {/* Save to Contacts — downloads .vcf (iOS/Android open as Add Contact) */}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PersonAddIcon />}
                size="small"
                style={{ flexGrow: 1 }}
                onClick={() => downloadVCard(contact.name, phone, email)}
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

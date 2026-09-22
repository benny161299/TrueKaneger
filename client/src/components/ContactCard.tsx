import {
  Close as CloseIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  CardActions,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { StyledCardContent } from "../styles/shared";

// --- Styled Components ---

const ContactCardRoot = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderRadius: "4px",
  border: "1px solid #c3c7cc",
  backgroundColor: "#ffffff",
  overflow: "hidden",
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
});

// --- Helper Component ---

export function ReportBreakdownContent({
  breakdown,
  totalCount = 0,
}: {
  breakdown?: Record<string, number>;
  totalCount?: number;
}) {
  const translations: Record<string, string> = {
    WRONG_NUMBER: "מספר לא נכון",
    DOES_NOT_EXIST: "איש קשר לא קיים",
    WRONG_NAME: "שם לא נכון",
    WRONG_EMAIL: "מייל לא נכון",
    OTHER: "אחר",
  };

  return (
    <Box style={{ minWidth: "220px", direction: "rtl" }}>
      <Typography
        variant="body2"
        style={{ color: "#546e7a", marginBottom: "10px", fontSize: "13px" }}
      >
        סה"כ דיווחים: <strong>{totalCount}</strong>
      </Typography>

      {breakdown && Object.keys(breakdown).length > 0 ? (
        <Box style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(breakdown).map(([reason, count]) => {
            const reasonHebrew = translations[reason] || "דיווח אחר";
            return (
              <Box
                key={reason}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#fff5f5",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #fed7d7",
                }}
              >
                <Typography
                  variant="body2"
                  style={{ fontSize: "13px", fontWeight: 500, color: "#9b2c2c" }}
                >
                  {reasonHebrew}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    fontWeight: 700,
                    color: "#c53030",
                    backgroundColor: "#feb2b2",
                    borderRadius: "10px",
                    padding: "2px 8px",
                  }}
                >
                  {count}
                </Typography>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography variant="body2" style={{ fontSize: "13px", color: "#4a6171" }}>
          קיימים דיווחים על איש קשר זה
        </Typography>
      )}
    </Box>
  );
}

// --- Types ---

export interface ContactData {
  _id: string;
  name: string;
  reportCount: number;
  reportBreakdown?: Record<string, number>;
  hasReported?: boolean;
}

interface ContactCardItemProps {
  contact: ContactData;
  /** Called when the user clicks the reveal button — opens the drawer */
  onOpenDrawer: (contact: ContactData) => void;
}

// --- Component ---

export function ContactCardItem({ contact: c, onOpenDrawer }: ContactCardItemProps) {
  const initial = c.name ? c.name.charAt(0) : "?";
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const handleOpenReports = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPopoverAnchor(event.currentTarget);
  };

  const handleCloseReports = (event?: any) => {
    if (event?.stopPropagation) event.stopPropagation();
    setPopoverAnchor(null);
  };

  const isReportsOpen = Boolean(popoverAnchor);

  return (
    <ContactCardRoot>
      <StyledCardContent>
        <ContactHeader>
          <ContactAvatar>{initial}</ContactAvatar>
          <ContactName variant="h6">{c.name}</ContactName>

          {c.reportCount > 0 && (
            <>
              <Box style={{ flexGrow: 1 }} />
              <Tooltip
                title={isReportsOpen ? "" : "לחץ לצפייה בפרטי הדיווח"}
                enterTouchDelay={1000}
              >
                <IconButton
                  size="small"
                  onClick={handleOpenReports}
                  aria-label="פרטי דיווח על איש קשר"
                  style={{
                    padding: "6px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fee2e2",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <StyledWarningIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Popover
                open={isReportsOpen}
                anchorEl={popoverAnchor}
                onClose={handleCloseReports}
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
                    onClick={handleCloseReports}
                    aria-label="סגור"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <ReportBreakdownContent
                  breakdown={c.reportBreakdown}
                  totalCount={c.reportCount}
                />
              </Popover>
            </>
          )}
        </ContactHeader>
      </StyledCardContent>

      <CardActions style={{ padding: "0 32px 32px 32px" }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => onOpenDrawer(c)}
        >
          הצג פרטי איש קשר
        </Button>
      </CardActions>
    </ContactCardRoot>
  );
}

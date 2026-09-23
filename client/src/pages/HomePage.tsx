import { FilterList as FilterListIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Pagination,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddContactDialog } from "../components/AddContactDialog";
import type { ContactData } from "../components/ContactCard";
import { ContactCardItem } from "../components/ContactCard";
import { ContactRevealDrawer, type RevealedContactData } from "../components/ContactRevealDrawer";
import { ReportContactDialog } from "../components/ReportContactDialog";
import { useContacts } from "../context/ContactsContext";
import { PageTitle, StyledAlert, UnderlineBar } from "../styles/shared";

// --- Styled Components (page-specific) ---

const SearchField = styled(TextField)({
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#ffffff",
  },
});

const AlphabetFilterBar = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: "6px",
  margin: "6px 0 16px",
  padding: "14px",
  backgroundColor: "#f4f8fb",
  borderRadius: "10px",
  border: "1px solid #dbe6ef",
  boxSizing: "border-box",
  width: "100%",
});

const LetterButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  minWidth: "36px",
  height: "36px",
  padding: "0 8px",
  fontSize: "14px",
  fontWeight: active ? 700 : 500,
  borderRadius: "6px",
  backgroundColor: active ? "#152d3b" : "#ffffff",
  color: active ? "#ffffff" : "#244255",
  border: active ? "1px solid #152d3b" : "1px solid #cfdce5",
  boxShadow: active ? "0 2px 4px rgba(0,0,0,0.12)" : "none",
  transition: "all 0.15s ease",
  "&:hover": {
    backgroundColor: active ? "#1d3d50" : "#e4eff7",
    borderColor: "#152d3b",
  },
}));

const HEBREW_LETTERS = [
  "הכל", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"
];

const ContactsGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "20px",
});

const PaginationWrapper = styled(Box)({
  display: "flex",
  justifyContent: "center",
  marginTop: "32px",
  marginBottom: "8px",
});

// --- Component ---

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const { contacts, loading, error, fetchContacts, revealContact } =
    useContacts();

  // Add contact dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reveal drawer state
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
  const [reportContactTarget, setReportContactTarget] = useState<ContactData | null>(null);
  const [revealedInfo, setRevealedInfo] = useState<
    Record<string, RevealedContactData>
  >({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | undefined>(undefined);

  // Alphabetical letter filter state
  const [selectedLetter, setSelectedLetter] = useState("הכל");
  const [showLetterFilter, setShowLetterFilter] = useState(false);

  // Search state — searchInput drives the visible input value,
  // searchQuery is the debounced value used to filter contacts.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1); // reset to first page on new search
    }, 300);
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    setPage(1);
  };

  const filteredContacts = useMemo(() => {
    let list = [...contacts];

    // 1. חיפוש חופשי (בדיקה על שם משפחה, שם פרטי או שם מלא)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => {
        const first = (c.firstName || "").toLowerCase();
        const last = (c.lastName || "").toLowerCase();
        const full = (c.name || "").toLowerCase();
        return first.includes(q) || last.includes(q) || full.includes(q);
      });
    }

    // 2. סינון לפי אות עברית נבחרת
    if (selectedLetter && selectedLetter !== "הכל") {
      list = list.filter((c) => {
        const target = (c.lastName || c.name || "").trim();
        return target.startsWith(selectedLetter);
      });
    }

    // 3. מיון עולה א'-ב' לפי שם משפחה ואז שם פרטי
    list.sort((a, b) => {
      const lastA = (a.lastName || a.name || "").trim();
      const lastB = (b.lastName || b.name || "").trim();
      const cmp = lastA.localeCompare(lastB, "he");
      if (cmp !== 0) return cmp;
      const firstA = (a.firstName || "").trim();
      const firstB = (b.firstName || "").trim();
      return firstA.localeCompare(firstB, "he");
    });

    return list;
  }, [contacts, searchQuery, selectedLetter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContacts.length / ITEMS_PER_PAGE),
  );

  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContacts, page]);

  useEffect(() => {
    fetchContacts().catch(console.error);
  }, [fetchContacts]);

  /** Fetches the contact's reveal data from the API (unless already cached). */
  const handleReveal = async (id: string) => {
    if (revealedInfo[id]) return; // already cached — nothing to do
    setRevealingId(id);
    setRevealError(undefined);
    try {
      const data = await revealContact(id);
      setRevealedInfo((prev) => ({ ...prev, [id]: data }));
    } catch (err: any) {
      setRevealError(err.message || "שגיאה בטעינת פרטי הקשר");
    } finally {
      setRevealingId(null);
    }
  };

  /** Opens the reveal drawer for a contact and triggers the API call if needed. */
  const handleOpenDrawer = (contact: ContactData) => {
    setSelectedContact(contact);
    setRevealError(undefined);
    handleReveal(contact._id);
  };

  const handleCloseDrawer = () => {
    setSelectedContact(null);
    setRevealError(undefined);
  };

  return (
    <Box>
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <PageTitle variant="h4">אנשי קשר</PageTitle>
        <Button
          id="add-contact-btn"
          variant="contained"
          color="primary"
          onClick={() => setDialogOpen(true)}
          style={{ marginBottom: "8px" }}
        >
          + הוסף איש קשר
        </Button>
      </Box>
      <UnderlineBar />

      {/* Dialogs & Overlays */}
      <AddContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={(name) => setSuccessMsg(`"‏${name}‏" נוסף בהצלחה!`)}
      />
      <ReportContactDialog
        open={Boolean(reportContactTarget)}
        onClose={() => setReportContactTarget(null)}
        contact={reportContactTarget}
        onSuccess={() => {
          setSuccessMsg("הדיווח התקבל בהצלחה, תודה!");
        }}
      />
      <ContactRevealDrawer
        open={!!selectedContact}
        onClose={handleCloseDrawer}
        contact={
          selectedContact
            ? contacts.find((c) => c._id === selectedContact._id) || selectedContact
            : null
        }
        revealedData={selectedContact ? revealedInfo[selectedContact._id] : undefined}
        isRevealing={selectedContact ? revealingId === selectedContact._id : false}
        revealError={revealError}
        onRetry={selectedContact ? () => handleReveal(selectedContact._id) : undefined}
        onOpenReport={(c) => setReportContactTarget(c)}
      />

      {error && <StyledAlert severity="error">{error}</StyledAlert>}

      {/* סרגל חיפוש וכפתור סינון */}
      <Box
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: "16px",
          marginBottom: "12px",
        }}
      >
        <Box style={{ flex: "1 1 280px", maxWidth: "480px" }}>
          <SearchField
            id="contacts-search"
            placeholder="חפש לפי שם משפחה או שם פרטי..."
            value={searchInput}
            onChange={handleSearchChange}
            size="small"
            InputProps={{
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  style={{ color: "#73787c", marginLeft: "8px" }}
                />
              ),
            }}
          />
        </Box>

        <Button
          id="toggle-letter-filter-btn"
          variant={selectedLetter !== "הכל" || showLetterFilter ? "contained" : "outlined"}
          onClick={() => setShowLetterFilter((prev) => !prev)}
          startIcon={<FilterListIcon />}
          size="medium"
          style={{
            height: "40px",
            borderColor: selectedLetter !== "הכל" || showLetterFilter ? "#152d3b" : "#cfdce5",
            backgroundColor: selectedLetter !== "הכל" ? "#152d3b" : showLetterFilter ? "#eaf2f8" : "#ffffff",
            color: selectedLetter !== "הכל" ? "#ffffff" : "#244255",
            fontWeight: 600,
            borderRadius: "8px",
          }}
        >
          {selectedLetter !== "הכל" ? `סינון: אות "${selectedLetter}"` : "סינון"}
        </Button>
      </Box>

      {/* תיבת אותיות שנפתחת בלחיצה על כפתור הסינון */}
      <Collapse in={showLetterFilter}>
        <AlphabetFilterBar
          role="toolbar"
          aria-label="סרגל אותיות לסינון לפי א'-ב'"
          style={{
            direction: "rtl",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {HEBREW_LETTERS.map((letter) => (
            <LetterButton
              key={letter}
              active={selectedLetter === letter}
              onClick={() => handleLetterClick(letter)}
              aria-pressed={selectedLetter === letter}
              size="small"
            >
              {letter}
            </LetterButton>
          ))}
        </AlphabetFilterBar>
      </Collapse>

      {searchQuery || selectedLetter !== "הכל" ? (
        <Typography
          variant="body2"
          style={{ color: "#4a6171", marginBottom: "8px" }}
        >
          {filteredContacts.length === 0
            ? `לא נמצאו תוצאות ${selectedLetter !== "הכל" ? `תחת האות "${selectedLetter}"` : ""} ${searchQuery ? `עבור "${searchQuery}"` : ""}`
            : `מוצגים ${filteredContacts.length} אנשי קשר ${selectedLetter !== "הכל" ? `(אות "${selectedLetter}")` : ""} מתוך ${contacts.length}`}
        </Typography>
      ) : (
        contacts.length > 0 && (
          <Typography
            variant="body2"
            style={{ color: "#4a6171", marginBottom: "8px" }}
          >
            {`מוצגים ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, contacts.length)} מתוך ${contacts.length} אנשי קשר (ממוין א'–ת')`}
          </Typography>
        )
      )}

      {loading && contacts.length === 0 ? (
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <ContactsGrid>
          {paginatedContacts.map((c) => (
            <ContactCardItem
              key={c._id}
              contact={c}
              onOpenDrawer={handleOpenDrawer}
            />
          ))}
        </ContactsGrid>
      )}

      {totalPages > 1 && (
        <PaginationWrapper>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => {
              setPage(value);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </PaginationWrapper>
      )}

      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMsg(null)}
          severity="success"
          variant="filled"
          style={{ minWidth: "280px" }}
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

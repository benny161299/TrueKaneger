import { Search as SearchIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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

const SearchBarWrapper = styled(Box)({
  marginTop: "16px",
  marginBottom: "4px",
  maxWidth: "480px",
});

const SearchField = styled(TextField)({
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#ffffff",
  },
});

const ContactsGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "24px",
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

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

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

      <SearchBarWrapper>
        <SearchField
          id="contacts-search"
          placeholder="חפש איש קשר..."
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
      </SearchBarWrapper>

      {searchQuery ? (
        <Typography
          variant="body2"
          style={{ color: "#4a6171", marginBottom: "8px" }}
        >
          {filteredContacts.length === 0
            ? `לא נמצאו תוצאות עבור "${searchQuery}"`
            : `מוצגים ${filteredContacts.length} מתוך ${contacts.length} אנשי קשר`}
        </Typography>
      ) : (
        contacts.length > 0 && (
          <Typography
            variant="body2"
            style={{ color: "#4a6171", marginBottom: "8px" }}
          >
            {`מוצגים ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, contacts.length)} מתוך ${contacts.length} אנשי קשר`}
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

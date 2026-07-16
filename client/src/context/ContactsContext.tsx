import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { api } from "../services/api";

export interface ContactListItem {
  _id: string;
  name: string;
  reportCount: number;
  reportBreakdown?: Record<string, number>;
}

interface ContactsContextType {
  contacts: ContactListItem[];
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (name: string, phone: string, email?: string) => Promise<void>;
  revealContact: (
    id: string,
  ) => Promise<{ phone: string; email: string | null }>;
  reportContact: (
    id: string,
    reason: string,
    suggestedCorrection?: string,
    freeTextComment?: string,
  ) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(
  undefined,
);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/contacts");
      if (response.data?.success) {
        setContacts(response.data.data);
      } else {
        throw new Error(response.data?.message || "שליפת אנשי הקשר נכשלה");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "שליפת אנשי הקשר נכשלה";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const addContact = async (name: string, phone: string, email?: string) => {
    try {
      const response = await api.post("/contacts", { name, phone, email });
      if (response.data?.success) {
        // Optimistically add or simply refetch list
        await fetchContacts();
      } else {
        throw new Error(response.data?.message || "הוספת איש קשר נכשלה");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "הוספת איש קשר נכשלה";
      throw new Error(msg);
    }
  };

  const revealContact = async (id: string) => {
    try {
      const response = await api.get(`/contacts/${id}/reveal`);
      if (response.data?.success && response.data?.data) {
        return response.data.data as { phone: string; email: string | null };
      }
      throw new Error(response.data?.message || "חשיפת איש קשר נכשלה");
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "חשיפת איש קשר נכשלה";
      throw new Error(msg);
    }
  };

  const reportContact = async (
    id: string,
    reason: string,
    suggestedCorrection?: string,
    freeTextComment?: string,
  ) => {
    try {
      const response = await api.post(`/contacts/${id}/report`, {
        reason,
        suggestedCorrection,
        freeTextComment,
      });
      if (response.data?.success) {
        // Optimistically increment reportCount for the contact
        setContacts((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, reportCount: c.reportCount + 1 } : c,
          ),
        );
      } else {
        throw new Error(response.data?.message || "שליחת דיווח נכשלה");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "שליחת דיווח נכשלה";
      throw new Error(msg);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const response = await api.delete(`/contacts/${id}`);
      if (response.data?.success) {
        setContacts((prev) => prev.filter((c) => c._id !== id));
      } else {
        throw new Error(response.data?.message || "מחיקת איש קשר נכשלה");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "מחיקת איש קשר נכשלה";
      throw new Error(msg);
    }
  };

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        loading,
        error,
        fetchContacts,
        addContact,
        revealContact,
        reportContact,
        deleteContact,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
}

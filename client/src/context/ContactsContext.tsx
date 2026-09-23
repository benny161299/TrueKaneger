import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { api } from "../services/api";

export interface ContactListItem {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  reportCount: number;
  hasReported?: boolean;
  reportBreakdown?: Record<string, number>;
}

interface ContactsContextType {
  contacts: ContactListItem[];
  loading: boolean;
  error: string | null;
  fetchContacts: (letter?: string) => Promise<void>;
  addContact: (
    param1: string | { firstName?: string; lastName?: string; name?: string; phone: string; email?: string },
    param2?: string,
    param3?: string,
    param4?: string
  ) => Promise<void>;
  revealContact: (
    id: string,
  ) => Promise<{
    phone: string;
    email: string | null;
    adminMeta?: {
      createdByEmail: string;
      createdById: string;
      createdAt?: string;
    };
  }>;
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

  const fetchContacts = useCallback(async (letter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = letter && letter !== 'הכל' ? `/contacts?letter=${encodeURIComponent(letter)}` : '/contacts';
      const response = await api.get(url);
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

  const addContact = async (
    param1: string | { firstName?: string; lastName?: string; name?: string; phone: string; email?: string },
    param2?: string,
    param3?: string,
    param4?: string
  ) => {
    try {
      let payload: any;
      if (typeof param1 === 'object') {
        payload = param1;
      } else if (param4 !== undefined) {
        payload = { firstName: param1, lastName: param2, phone: param3, email: param4 };
      } else if (param3 !== undefined) {
        if (/^05/.test(param2 || '')) {
          payload = { name: param1, phone: param2, email: param3 };
        } else {
          payload = { firstName: param1, lastName: param2, phone: param3 };
        }
      } else {
        payload = { name: param1, phone: param2 };
      }

      const response = await api.post("/contacts", payload);
      if (response.data?.success) {
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
      if (err.response?.status === 429) {
        const waitTime = err.response?.data?.waitTimeMinutes;
        const msg =
          err.response?.data?.message ||
          (waitTime
            ? `הגעת למגבלת הגילויים. נסה שוב בעוד ${waitTime} דקות`
            : "הגעת למגבלת הגילויים. אנא נסה שוב מאוחר יותר");
        const rateLimitErr: any = new Error(msg);
        rateLimitErr.status = 429;
        rateLimitErr.waitTimeMinutes = waitTime;
        throw rateLimitErr;
      }
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
        // Optimistically increment reportCount and mark hasReported: true
        setContacts((prev) =>
          prev.map((c) =>
            c._id === id
              ? { ...c, reportCount: c.reportCount + 1, hasReported: true }
              : c,
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

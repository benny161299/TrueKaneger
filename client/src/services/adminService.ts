import { api } from "./api";

export interface AdminReportItem {
  _id: string;
  contactId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name: string;
    phone?: string;
    kosherPhone?: string;
    nonKosherPhone?: string;
    machzor?: string;
    email?: string | null;
    createdBy?: {
      _id: string;
      email: string;
    } | null;
    createdAt?: string;
  } | null;
  reportedBy: {
    _id: string;
    email: string;
  } | null;
  reason: string;
  suggestedCorrection?: string;
  freeTextComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserItem {
  _id: string;
  email: string;
  role: "user" | "admin";
  isBanned: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  machzor?: string;
  isApproved?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface PendingUserItem {
  _id: string;
  email: string;
  role: "user" | "admin";
  firstName?: string;
  lastName?: string;
  phone?: string;
  machzor?: string;
  isBanned?: boolean;
  isApproved?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface PendingContactItem {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phone?: string;
  kosherPhone?: string;
  nonKosherPhone?: string;
  machzor?: string;
  email?: string | null;
  status: "pending";
  createdBy?: {
    _id: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const adminService = {
  async getReports(): Promise<AdminReportItem[]> {
    const res = await api.get("/admin/reports");
    return res.data.data;
  },

  async dismissReport(reportId: string): Promise<void> {
    await api.post(`/admin/reports/${reportId}/dismiss`);
  },

  async updateContactName(contactId: string, name: string): Promise<void> {
    await api.patch(`/admin/contacts/${contactId}/name`, { name });
  },

  async updateContactPhone(contactId: string, phone: string): Promise<void> {
    await api.patch(`/admin/contacts/${contactId}/phone`, { phone });
  },

  async updateContactEmail(contactId: string, email: string): Promise<void> {
    await api.patch(`/admin/contacts/${contactId}/email`, { email });
  },

  async updateContactFull(
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      name?: string;
      phone?: string;
      kosherPhone?: string;
      machzor?: string;
      email?: string;
      dismissReportId?: string;
    }
  ): Promise<any> {
    const res = await api.put(`/admin/contacts/${contactId}`, data);
    return res.data;
  },

  async getUsers(): Promise<AdminUserItem[]> {
    const res = await api.get("/admin/users");
    return res.data.data;
  },

  async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
    await api.patch(`/admin/users/${userId}/ban`, { isBanned });
  },

  async getPendingContacts(): Promise<PendingContactItem[]> {
    const res = await api.get("/admin/pending-contacts");
    return res.data.data;
  },

  async approveContact(pendingId: string): Promise<void> {
    await api.post(`/admin/pending-contacts/${pendingId}/approve`);
  },

  async rejectContact(pendingId: string): Promise<void> {
    await api.delete(`/admin/pending-contacts/${pendingId}/reject`);
  },

  async getPendingUsers(): Promise<PendingUserItem[]> {
    const res = await api.get("/admin/pending-users");
    return res.data.data;
  },

  async approveUser(userId: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/approve`);
  },

  async rejectUser(userId: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/reject`);
  },
};

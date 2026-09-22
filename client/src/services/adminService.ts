import { api } from "./api";

export interface AdminReportItem {
  _id: string;
  contactId: {
    _id: string;
    name: string;
    phone: string;
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

  async getUsers(): Promise<AdminUserItem[]> {
    const res = await api.get("/admin/users");
    return res.data.data;
  },

  async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
    await api.patch(`/admin/users/${userId}/ban`, { isBanned });
  },
};

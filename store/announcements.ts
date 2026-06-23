import { BASE_URL } from "@/services/api";
import { create } from "zustand";
import { useAuthStore } from "./auth";

export type AnnouncementCategory =
  | "Timetable"
  | "Exams"
  | "Notices"
  | "Holiday"
  | "Emergency"
  | "Event";

export type AnnouncementScope = "campus" | "department";

export type Announcement = {
  _id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  scope: AnnouncementScope;
  author: { _id: string; fullName: string; role: string; department?: string };
  department?: string;
  pinned: boolean;
  createdAt: string;
};

export type CreateAnnouncementPayload = {
  title: string;
  body: string;
  category: AnnouncementCategory;
  scope?: AnnouncementScope;
  department?: string;
};

type AnnouncementsState = {
  announcements: Announcement[];
  allAnnouncements: Announcement[];
  loading: boolean;
  loadingAll: boolean;
  unread: number;
  fetch: () => Promise<void>;
  fetchAll: () => Promise<void>;
  create: (data: CreateAnnouncementPayload) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addNew: (a: Announcement) => void;
  markRead: () => void;
};

async function apiCall(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export const useAnnouncementsStore = create<AnnouncementsState>((set) => ({
  announcements: [],
  allAnnouncements: [],
  loading: false,
  loadingAll: false,
  unread: 0,

  fetch: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set({ loading: true });
    try {
      const data = await apiCall(`${BASE_URL}/announcements`, token);
      set({ announcements: data.announcements ?? [] });
    } catch {
      // keep stale data
    } finally {
      set({ loading: false });
    }
  },

  fetchAll: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set({ loadingAll: true });
    try {
      const data = await apiCall(`${BASE_URL}/announcements/all`, token);
      set({ allAnnouncements: data.announcements ?? [] });
    } finally {
      set({ loadingAll: false });
    }
  },

  create: async (payload) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Not authenticated");
    const data = await apiCall(`${BASE_URL}/announcements`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    set((s) => {
      const id = data.announcement._id;
      return {
        announcements: s.announcements.some((x) => x._id === id)
          ? s.announcements
          : [data.announcement, ...s.announcements],
        allAnnouncements: s.allAnnouncements.some((x) => x._id === id)
          ? s.allAnnouncements
          : [data.announcement, ...s.allAnnouncements],
      };
    });
  },

  togglePin: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    const toggle = (list: Announcement[]) =>
      list.map((a) => (a._id === id ? { ...a, pinned: !a.pinned } : a));
    set((s) => ({ announcements: toggle(s.announcements), allAnnouncements: toggle(s.allAnnouncements) }));
    try {
      await apiCall(`${BASE_URL}/announcements/${id}/pin`, token, { method: "PATCH" });
    } catch {
      // optimistic stays
    }
  },

  remove: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    const filter = (list: Announcement[]) => list.filter((a) => a._id !== id);
    set((s) => ({ announcements: filter(s.announcements), allAnnouncements: filter(s.allAnnouncements) }));
    try {
      await apiCall(`${BASE_URL}/announcements/${id}`, token, { method: "DELETE" });
    } catch {
      // optimistic stays
    }
  },

  addNew: (a) =>
    set((s) => {
      if (s.announcements.some((x) => x._id === a._id)) return s;
      return { announcements: [a, ...s.announcements], unread: s.unread + 1 };
    }),

  markRead: () => set({ unread: 0 }),
}));

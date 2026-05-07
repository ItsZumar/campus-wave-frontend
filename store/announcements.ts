import { BASE_URL } from "@/services/api";
import { create } from "zustand";
import { useAuthStore } from "./auth";

export type AnnouncementCategory = "Timetable" | "Exams" | "Notices";

export type Announcement = {
  _id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  author: { _id: string; fullName: string; role: string; department?: string };
  pinned: boolean;
  createdAt: string;
};

type AnnouncementsState = {
  announcements: Announcement[];
  loading: boolean;
  unread: number;
  fetch: () => Promise<void>;
  create: (data: { title: string; body: string; category: AnnouncementCategory }) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addNew: (a: Announcement) => void;
  markRead: () => void;
};

export const useAnnouncementsStore = create<AnnouncementsState>((set) => ({
  announcements: [],
  loading: false,
  unread: 0,

  fetch: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) set({ announcements: data.announcements ?? [] });
    } catch {
      // silently keep stale data
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${BASE_URL}/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to create announcement");
    set((s) => ({ announcements: [data.announcement, ...s.announcements] }));
  },

  togglePin: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set((s) => ({
      announcements: s.announcements.map((a) =>
        a._id === id ? { ...a, pinned: !a.pinned } : a,
      ),
    }));
    try {
      await fetch(`${BASE_URL}/announcements/${id}/pin`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic update stays
    }
  },

  remove: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set((s) => ({ announcements: s.announcements.filter((a) => a._id !== id) }));
    try {
      await fetch(`${BASE_URL}/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic update stays
    }
  },

  addNew: (a) =>
    set((s) => ({
      announcements: [a, ...s.announcements],
      unread: s.unread + 1,
    })),

  markRead: () => set({ unread: 0 }),
}));

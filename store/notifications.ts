import { BASE_URL } from "@/services/api";
import { create } from "zustand";
import { useAuthStore } from "./auth";

export type AppNotification = {
  _id: string;
  type: "message" | "dm" | "reply" | "system";
  title: string;
  body: string;
  data?: { groupId?: string; groupName?: string; senderId?: string };
  read: boolean;
  createdAt: string;
};

type NotificationsState = {
  notifications: AppNotification[];
  loading: boolean;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (n: AppNotification) => void;
  remove: (id: string) => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  loading: false,

  fetch: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) set({ notifications: data.notifications ?? [] });
    } catch {
      // silently ignore network errors — stale data stays visible
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n,
      ),
    }));
    try {
      await fetch(`${BASE_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic update already applied — ignore
    }
  },

  markAllRead: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    try {
      await fetch(`${BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic update already applied — ignore
    }
  },

  addNotification: (n) => {
    set((s) => ({ notifications: [n, ...s.notifications] }));
  },

  remove: async (id) => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    set((s) => ({ notifications: s.notifications.filter((n) => n._id !== id) }));
    try {
      await fetch(`${BASE_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic update already applied — ignore
    }
  },
}));

import { create } from "zustand";

type ChatUnreadState = {
  unreadByGroup: Record<string, number>;
  increment: (groupId: string) => void;
  clear: (groupId: string) => void;
};

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  unreadByGroup: {},
  increment: (groupId) =>
    set((s) => ({
      unreadByGroup: { ...s.unreadByGroup, [groupId]: (s.unreadByGroup[groupId] ?? 0) + 1 },
    })),
  clear: (groupId) =>
    set((s) => {
      const next = { ...s.unreadByGroup };
      delete next[groupId];
      return { unreadByGroup: next };
    }),
}));

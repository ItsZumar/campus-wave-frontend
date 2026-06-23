import { create } from "zustand";

type ChatUnreadState = {
  unreadByGroup: Record<string, number>;
  activeGroupId: string | null;
  increment: (groupId: string) => void;
  clear: (groupId: string) => void;
  setActive: (groupId: string) => void;
  clearActive: () => void;
};

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  unreadByGroup: {},
  activeGroupId: null,
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
  setActive: (groupId) => set({ activeGroupId: groupId }),
  clearActive: () => set({ activeGroupId: null }),
}));

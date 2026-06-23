import { create } from "zustand";
import { BASE_URL } from "@/services/api";

export type Attachment = {
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

export type ReplyPreview = {
  _id: string;
  text?: string;
  sender: { _id: string; fullName: string };
};

export type GroupInvite = {
  groupId: string | { _id: string; name: string; type: string };
  groupName: string;
  groupType: string;
};

export type ChatMessage = {
  _id: string;
  text?: string;
  attachment?: Attachment;
  invite?: GroupInvite;
  sender: { _id: string; fullName: string; profileImage?: string };
  group: string;
  replyTo?: ReplyPreview;
  createdAt: string;
  updatedAt?: string;
};

type ChatState = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  fetchHistory: (groupId: string, token: string) => Promise<void>;
  uploadAttachment: (uri: string, name: string, mimeType: string, token: string, groupId?: string) => Promise<Attachment>;
  addMessage: (msg: ChatMessage) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, text: string, updatedAt: string) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,

  fetchHistory: async (groupId, token) => {
    set({ loading: true, error: null, messages: [] });
    try {
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/messages/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error("Cannot reach the server.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to load messages");
      set({ messages: data.messages });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load messages" });
    } finally {
      set({ loading: false });
    }
  },

  uploadAttachment: async (uri, name, mimeType, token, groupId) => {
    const formData = new FormData();
    formData.append("file", { uri, type: mimeType, name } as any);
    if (groupId) formData.append("groupId", groupId);
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/messages/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to upload file");
    return data as Attachment;
  },

  addMessage: (msg) =>
    set((state) =>
      state.messages.some((m) => m._id === msg._id)
        ? state
        : { messages: [...state.messages, msg] }
    ),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    })),

  editMessage: (messageId, text, updatedAt) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, text, updatedAt } : m
      ),
    })),

  clearMessages: () => set({ messages: [], error: null }),
}));

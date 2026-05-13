import { create } from "zustand";
import { BASE_URL, type Group } from "@/services/api";

type CreateGroupData = {
  name: string;
  description?: string;
  type: "study" | "club" | "announcement";
  isPublic?: boolean;
};

type GroupsState = {
  groups: Group[];
  discoverList: Group[];
  loading: boolean;
  refreshing: boolean;
  discoverLoading: boolean;
  error: string | null;
  fetch: (token: string) => Promise<void>;
  refresh: (token: string) => Promise<void>;
  fetchDiscover: (token: string) => Promise<void>;
  joinGroup: (token: string, groupId: string) => Promise<void>;
  joinViaInvite: (token: string, groupId: string) => Promise<void>;
  leaveGroup: (token: string, groupId: string) => Promise<void>;
  requestLeave: (token: string, groupId: string) => Promise<void>;
  createGroup: (token: string, data: CreateGroupData) => Promise<Group>;
  findOrCreateDM: (token: string, targetUserId: string) => Promise<Group>;
};

async function loadMyGroups(token: string): Promise<Group[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/groups/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Cannot reach the server.");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to load groups");
  return (data as { groups: Group[] }).groups;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  discoverList: [],
  loading: true,
  refreshing: false,
  discoverLoading: false,
  error: null,

  fetch: async (token) => {
    if (!get().loading) set({ loading: true });
    try {
      const groups = await loadMyGroups(token);
      set({ groups, error: null });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load groups" });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async (token) => {
    set({ refreshing: true });
    try {
      const groups = await loadMyGroups(token);
      set({ groups, error: null });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load groups" });
    } finally {
      set({ refreshing: false });
    }
  },

  fetchDiscover: async (token) => {
    set({ discoverLoading: true });
    try {
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/groups/discover`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error("Cannot reach the server.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to load groups");
      set({ discoverList: (data as { groups: Group[] }).groups });
    } catch {
      // silently fail — discover is non-critical
    } finally {
      set({ discoverLoading: false });
    }
  },

  joinGroup: async (token, groupId) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups/${groupId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to join group");
    // refresh both lists
    const [myGroups] = await Promise.all([
      loadMyGroups(token),
      get().fetchDiscover(token),
    ]);
    set({ groups: myGroups });
  },

  joinViaInvite: async (token, groupId) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups/${groupId}/join-via-invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to join group");
    const [myGroups] = await Promise.all([
      loadMyGroups(token),
      get().fetchDiscover(token),
    ]);
    set({ groups: myGroups });
  },

  leaveGroup: async (token, groupId) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups/${groupId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to leave group");
    const [myGroups] = await Promise.all([
      loadMyGroups(token),
      get().fetchDiscover(token),
    ]);
    set({ groups: myGroups });
  },

  requestLeave: async (token, groupId) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups/${groupId}/leave-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to submit leave request");
  },

  findOrCreateDM: async (token, targetUserId) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups/dm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to open DM");
    const group = (data as { group: Group }).group;
    set((s) => ({
      groups: s.groups.find((g) => g._id === group._id)
        ? s.groups
        : [group, ...s.groups],
    }));
    return group;
  },

  createGroup: async (token, payload) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to create group");
    const group = (data as { group: Group }).group;
    // optimistically add to my groups
    set((s) => ({ groups: [group, ...s.groups] }));
    return group;
  },
}));

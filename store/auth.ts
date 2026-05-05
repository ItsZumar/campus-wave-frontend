import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { BASE_URL, type AuthUser } from "@/services/api";

export type SignupData = {
  fullName: string;
  email: string;
  password: string;
  department: string;
  semester: string;
  section: string;
};

export type UpdateProfileData = {
  fullName: string;
  department: string;
  semester: string;
  section: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  uploadAvatar: (localUri: string) => Promise<string>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  markSetupDone: () => Promise<void>;
  logout: () => Promise<void>;
};

const STORE_KEY = "campus_wave_auth";

async function postAuth(path: string, body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Make sure the backend is running and EXPO_PUBLIC_API_URL is set correctly."
    );
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Something went wrong");
  return data as { token: string; user: AuthUser };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORE_KEY);
      if (stored) {
        const { token, user } = JSON.parse(stored);
        set({ token, user });
      }
    } catch {
      // ignore corrupt data
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const { token, user } = await postAuth("/auth/signin", { email, password });
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  signup: async (data) => {
    const { token, user } = await postAuth("/auth/signup", data as unknown as Record<string, unknown>);
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  uploadAvatar: async (localUri) => {
    const { user, token } = useAuthStore.getState();
    if (!user || !token) throw new Error("Not authenticated");
    const formData = new FormData();
    formData.append("avatar", {
      uri: localUri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/users/${user.id}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Failed to upload image");
    const imageUrl = json.imageUrl as string;
    const updatedUser: AuthUser = { ...user, profileImage: imageUrl };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ token, user: updatedUser }));
    set({ user: updatedUser });
    return imageUrl;
  },

  updateProfile: async (data) => {
    const { user, token } = useAuthStore.getState();
    if (!user || !token) throw new Error("Not authenticated");
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Failed to update profile");
    const updatedUser: AuthUser = { ...user, ...data };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ token, user: updatedUser }));
    set({ user: updatedUser });
  },

  markSetupDone: async () => {
    const { user, token } = useAuthStore.getState();
    if (!user) return;
    const updatedUser: AuthUser = { ...user, coursesSetupDone: true };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ token, user: updatedUser }));
    set({ user: updatedUser });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORE_KEY);
    set({ user: null, token: null });
  },
}));

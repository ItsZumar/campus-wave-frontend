import { create } from "zustand";
import { BASE_URL } from "@/services/api";

export type Course = {
  _id: string;
  title: string;
  code: string;
  description?: string;
  department?: string;
  semester?: string;
};

type CoursesState = {
  courses: Course[];
  loading: boolean;
  error: string | null;
  fetchCourses: (token: string, department: string, semester: string) => Promise<void>;
  enrollBulk: (token: string, courseIds: string[]) => Promise<void>;
};

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  loading: false,
  error: null,

  fetchCourses: async (token, department, semester) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({ department, semester });
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/courses?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error("Cannot reach the server.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to load courses");
      set({ courses: data.courses });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load courses" });
    } finally {
      set({ loading: false });
    }
  },

  enrollBulk: async (token, courseIds) => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/courses/enroll-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseIds }),
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Failed to enroll");
  },
}));

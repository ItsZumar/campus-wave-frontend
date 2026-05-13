import { create } from "zustand";
import { BASE_URL, type LeaveRequest } from "@/services/api";

export type AdminStats = {
  totalUsers: number;
  totalGroups: number;
  pendingRequests: number;
  totalMessages: number;
  students: number;
  teachers: number;
  admins: number;
};

export type AdminUser = {
  _id: string;
  fullName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  department?: string;
  semester?: string;
  section?: string;
  profileImage?: string;
  blocked?: boolean;
  createdAt: string;
};

export type AdminCourse = {
  _id: string;
  title: string;
  code: string;
  description?: string;
  department?: string;
  semester?: string;
  section?: string;
  teacher?: { _id: string; fullName: string; email: string };
  students?: { _id: string }[];
  createdAt: string;
};

export type Report = {
  _id: string;
  type: "message" | "user" | "group";
  reportedBy: { _id: string; fullName: string; email: string };
  reportedUser?: { _id: string; fullName: string; email: string; blocked?: boolean };
  reportedGroup?: { _id: string; name: string; type: string };
  messageText?: string;
  reason: "abuse" | "spam" | "harassment" | "inappropriate" | "other";
  description?: string;
  status: "pending" | "resolved" | "dismissed";
  adminNote?: string;
  actionTaken: "none" | "warned" | "blocked";
  createdAt: string;
};

export type Department = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  head?: { _id: string; fullName: string; email: string } | null;
  createdAt: string;
};

type AdminState = {
  // Leave requests
  leaveRequests: LeaveRequest[];
  pendingCount: number;
  requestsLoading: boolean;
  // Stats
  stats: AdminStats | null;
  statsLoading: boolean;
  // Users
  users: AdminUser[];
  usersLoading: boolean;
  // Departments
  departments: Department[];
  departmentsLoading: boolean;
  // Courses
  courses: AdminCourse[];
  coursesLoading: boolean;
  // Reports
  reports: Report[];
  reportsLoading: boolean;
  reportsPendingCount: number;

  fetchLeaveRequests: (token: string, status?: "pending" | "approved" | "rejected" | "all") => Promise<void>;
  approveRequest: (token: string, id: string) => Promise<void>;
  rejectRequest: (token: string, id: string, adminNote?: string) => Promise<void>;
  fetchStats: (token: string) => Promise<void>;
  fetchUsers: (token: string, opts?: { search?: string; role?: string }) => Promise<void>;
  updateUserRole: (token: string, userId: string, role: "student" | "teacher" | "admin") => Promise<void>;
  toggleBlockUser: (token: string, userId: string) => Promise<void>;
  assignTeacherCourses: (token: string, userId: string, department: string, courseIds: string[]) => Promise<void>;
  assignStudentInfo: (token: string, userId: string, department: string, semester: string, section: string, courseIds: string[]) => Promise<void>;
  fetchDepartments: (token: string) => Promise<void>;
  createDepartment: (token: string, data: { name: string; code: string; description?: string }) => Promise<void>;
  updateDepartment: (token: string, id: string, data: { name?: string; code?: string; description?: string }) => Promise<void>;
  deleteDepartment: (token: string, id: string) => Promise<void>;
  fetchCourses: (token: string, opts?: { department?: string; semester?: string }) => Promise<void>;
  createCourse: (token: string, data: CoursePayload) => Promise<void>;
  updateCourse: (token: string, id: string, data: Partial<CoursePayload>) => Promise<void>;
  deleteCourse: (token: string, id: string) => Promise<void>;
  fetchReports: (token: string, status?: "pending" | "resolved" | "dismissed" | "all") => Promise<void>;
  resolveReport: (token: string, id: string, action: "warn" | "block" | "dismiss", adminNote?: string) => Promise<void>;
  submitReport: (token: string, data: { type: "message" | "user" | "group"; reportedUser?: string; reportedGroup?: string; message?: string; messageText?: string; reason: Report["reason"]; description?: string }) => Promise<void>;
  importDepartmentsCSV: (token: string, fileUri: string, fileName: string) => Promise<{ imported: number; skipped: number; errors: number; errorDetails: { code: string; reason: string }[] }>;
  importCoursesCSV: (token: string, fileUri: string, fileName: string) => Promise<{ imported: number; skipped: number; errors: number; errorDetails: { code: string; reason: string }[] }>;
};

type CoursePayload = {
  title: string;
  code: string;
  description?: string;
  department?: string;
  semester?: string;
  teacher?: string;
};

async function adminFetch(url: string, token: string, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Cannot reach the server.");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export const useAdminStore = create<AdminState>((set) => ({
  leaveRequests: [],
  pendingCount: 0,
  requestsLoading: false,
  stats: null,
  statsLoading: false,
  users: [],
  usersLoading: false,
  departments: [],
  departmentsLoading: false,
  courses: [],
  coursesLoading: false,
  reports: [],
  reportsLoading: false,
  reportsPendingCount: 0,

  fetchLeaveRequests: async (token, status = "pending") => {
    set({ requestsLoading: true });
    try {
      const data = await adminFetch(`${BASE_URL}/admin/leave-requests?status=${status}`, token);
      const requests = (data as { requests: LeaveRequest[] }).requests;
      const pendingCount = requests.filter((r) => r.status === "pending").length;
      set({ leaveRequests: requests, pendingCount });
    } finally {
      set({ requestsLoading: false });
    }
  },

  approveRequest: async (token, id) => {
    await adminFetch(`${BASE_URL}/admin/leave-requests/${id}/approve`, token, { method: "PUT" });
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) =>
        r._id === id ? { ...r, status: "approved" as const } : r
      ),
      pendingCount: Math.max(0, s.pendingCount - 1),
    }));
  },

  rejectRequest: async (token, id, adminNote) => {
    await adminFetch(`${BASE_URL}/admin/leave-requests/${id}/reject`, token, {
      method: "PUT",
      body: JSON.stringify({ adminNote }),
    });
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) =>
        r._id === id ? { ...r, status: "rejected" as const, adminNote } : r
      ),
      pendingCount: Math.max(0, s.pendingCount - 1),
    }));
  },

  fetchStats: async (token) => {
    set({ statsLoading: true });
    try {
      const data = await adminFetch(`${BASE_URL}/admin/stats`, token);
      set({ stats: (data as { stats: AdminStats }).stats });
    } finally {
      set({ statsLoading: false });
    }
  },

  fetchUsers: async (token, opts = {}) => {
    set({ usersLoading: true });
    try {
      const params = new URLSearchParams();
      if (opts.search) params.set("search", opts.search);
      if (opts.role && opts.role !== "all") params.set("role", opts.role);
      const data = await adminFetch(`${BASE_URL}/admin/users?${params}`, token);
      set({ users: (data as { users: AdminUser[] }).users });
    } finally {
      set({ usersLoading: false });
    }
  },

  updateUserRole: async (token, userId, role) => {
    const data = await adminFetch(`${BASE_URL}/admin/users/${userId}/role`, token, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    const updated = (data as { user: AdminUser }).user;
    set((s) => ({
      users: s.users.map((u) => (u._id === userId ? { ...u, role: updated.role } : u)),
    }));
  },

  toggleBlockUser: async (token, userId) => {
    const data = await adminFetch(`${BASE_URL}/admin/users/${userId}/block`, token, { method: "PUT" });
    const { blocked } = data as { blocked: boolean };
    set((s) => ({
      users: s.users.map((u) => (u._id === userId ? { ...u, blocked } : u)),
    }));
  },

  assignTeacherCourses: async (token, userId, department, courseIds) => {
    const data = await adminFetch(`${BASE_URL}/admin/users/${userId}/assign-courses`, token, {
      method: "PUT",
      body: JSON.stringify({ department, courseIds }),
    });
    const updated = (data as { user: AdminUser }).user;
    set((s) => ({
      users: s.users.map((u) => (u._id === userId ? { ...u, department: updated.department } : u)),
    }));
  },

  assignStudentInfo: async (token, userId, department, semester, section, courseIds) => {
    const data = await adminFetch(`${BASE_URL}/admin/users/${userId}/assign-student`, token, {
      method: "PUT",
      body: JSON.stringify({ department, semester, section, courseIds }),
    });
    const updated = (data as { user: AdminUser }).user;
    set((s) => ({
      users: s.users.map((u) =>
        u._id === userId
          ? { ...u, department: updated.department, semester: updated.semester, section: updated.section }
          : u
      ),
    }));
  },

  fetchDepartments: async (token) => {
    set({ departmentsLoading: true });
    try {
      const data = await adminFetch(`${BASE_URL}/departments/get-departments`, token);
      set({ departments: (data as { departments: Department[] }).departments });
    } finally {
      set({ departmentsLoading: false });
    }
  },

  createDepartment: async (token, data) => {
    const res = await adminFetch(`${BASE_URL}/departments/create-department`, token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const created = (res as { department: Department }).department;
    set((s) => ({ departments: [created, ...s.departments] }));
  },

  updateDepartment: async (token, id, data) => {
    const res = await adminFetch(`${BASE_URL}/departments/update-department/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const updated = (res as { department: Department }).department;
    set((s) => ({
      departments: s.departments.map((d) => (d._id === id ? updated : d)),
    }));
  },

  deleteDepartment: async (token, id) => {
    await adminFetch(`${BASE_URL}/departments/delete-department/${id}`, token, { method: "DELETE" });
    set((s) => ({ departments: s.departments.filter((d) => d._id !== id) }));
  },

  fetchCourses: async (token, opts = {}) => {
    set({ coursesLoading: true });
    try {
      const params = new URLSearchParams();
      if (opts.department) params.set("department", opts.department);
      if (opts.semester)   params.set("semester",   opts.semester);
      const data = await adminFetch(`${BASE_URL}/courses?${params}`, token);
      set({ courses: (data as { courses: AdminCourse[] }).courses });
    } finally {
      set({ coursesLoading: false });
    }
  },

  createCourse: async (token, data) => {
    const res = await adminFetch(`${BASE_URL}/courses`, token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const created = (res as { course: AdminCourse }).course;
    set((s) => ({ courses: [created, ...s.courses] }));
  },

  updateCourse: async (token, id, data) => {
    const res = await adminFetch(`${BASE_URL}/courses/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const updated = (res as { course: AdminCourse }).course;
    set((s) => ({ courses: s.courses.map((c) => (c._id === id ? updated : c)) }));
  },

  deleteCourse: async (token, id) => {
    await adminFetch(`${BASE_URL}/courses/${id}`, token, { method: "DELETE" });
    set((s) => ({ courses: s.courses.filter((c) => c._id !== id) }));
  },

  fetchReports: async (token, status = "pending") => {
    set({ reportsLoading: true });
    try {
      const data = await adminFetch(`${BASE_URL}/admin/reports?status=${status}`, token);
      const { reports, pendingCount } = data as { reports: Report[]; pendingCount: number };
      set({ reports, reportsPendingCount: pendingCount });
    } finally {
      set({ reportsLoading: false });
    }
  },

  resolveReport: async (token, id, action, adminNote) => {
    const data = await adminFetch(`${BASE_URL}/admin/reports/${id}/resolve`, token, {
      method: "PUT",
      body: JSON.stringify({ action, adminNote }),
    });
    const updated = (data as { report: Report }).report;
    set((s) => ({
      reports: s.reports.map((r) => (r._id === id ? updated : r)),
      reportsPendingCount: Math.max(0, s.reportsPendingCount - 1),
    }));
  },

  submitReport: async (token, payload) => {
    await adminFetch(`${BASE_URL}/reports`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  importDepartmentsCSV: async (token, fileUri, fileName) => {
    const formData = new FormData();
    formData.append("file", { uri: fileUri, type: "text/csv", name: fileName } as any);
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/departments/import-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Import failed");
    // Refresh departments list after a successful import
    if (data.imported > 0) {
      const depts = await adminFetch(`${BASE_URL}/departments/get-departments`, token);
      set({ departments: (depts as { departments: Department[] }).departments });
    }
    return data as { imported: number; skipped: number; errors: number; errorDetails: { code: string; reason: string }[] };
  },

  importCoursesCSV: async (token, fileUri, fileName) => {
    const formData = new FormData();
    formData.append("file", { uri: fileUri, type: "text/csv", name: fileName } as any);
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/courses/import-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Import failed");
    // Refresh courses list after a successful import
    if (data.imported > 0) {
      const courses = await adminFetch(`${BASE_URL}/courses`, token);
      set({ courses: (courses as { courses: AdminCourse[] }).courses });
    }
    return data as { imported: number; skipped: number; errors: number; errorDetails: { code: string; reason: string }[] };
  },
}));

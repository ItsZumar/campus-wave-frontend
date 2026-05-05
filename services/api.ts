export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

export type User = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  semester?: string;
  section?: string;
  profileImage?: string;
};

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  semester?: string;
  section?: string;
  profileImage?: string;
  coursesSetupDone?: boolean;
};

export type Group = {
  _id: string;
  name: string;
  description?: string;
  type: "course" | "department" | "class" | "semester" | "study" | "club" | "announcement" | "dm";
  otherUser?: { _id: string; fullName: string; profileImage?: string };
  courseId?: { _id: string; title: string; code: string };
  department?: string;
  semester?: string;
  section?: string;
  autoEnrolled?: boolean;
  createdBy?: string;
  isPublic?: boolean;
  membersCanPost?: boolean;
  memberCount?: number;
  lastMessage?: {
    text?: string;
    attachment?: { name: string };
    sender?: { _id: string; fullName: string };
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

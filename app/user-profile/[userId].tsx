import { BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserDetail = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  semester?: string;
  section?: string;
  profileImage?: string;
};

function roleColor(role: string, C: typeof ColorPalette): string {
  if (role === "teacher") return "#10B981";
  if (role === "admin")   return "#F59E0B";
  return C.primary;
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [user, setUser]       = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load profile");
        setUser(data.user);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, token]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : user ? (
        user.role === "teacher" ? (
          <TeacherProfile user={user} styles={styles} C={C} />
        ) : (
          <StudentProfile user={user} styles={styles} C={C} />
        )
      ) : null}
    </SafeAreaView>
  );
}

type StylesType = ReturnType<typeof makeStyles>;

function StudentProfile({ user, styles, C }: { user: UserDetail; styles: StylesType; C: typeof ColorPalette }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.avatarWrap}>
        {user.profileImage ? (
          <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: roleColor(user.role, C) }]}>
            <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{user.fullName}</Text>
      <View style={[styles.rolePill, { backgroundColor: roleColor(user.role, C) + "1A" }]}>
        <Text style={[styles.roleText, { color: roleColor(user.role, C) }]}>{roleLabel(user.role)}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow icon="✉️" label="Email"      value={user.email} styles={styles} />
        {user.department && <InfoRow icon="🏫" label="Department" value={user.department} styles={styles} />}
        {user.semester   && <InfoRow icon="📅" label="Semester"   value={`Semester ${user.semester}`} styles={styles} />}
        {user.section    && <InfoRow icon="🔖" label="Section"    value={`Section ${user.section}`} styles={styles} />}
      </View>
    </ScrollView>
  );
}

function TeacherProfile({ user, styles }: { user: UserDetail; styles: StylesType; C: typeof ColorPalette }) {
  return (
    <ScrollView contentContainerStyle={styles.teacherScroll} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.teacherBanner}>
        <View style={styles.teacherBannerOverlay} />
        <Text style={styles.teacherBannerLabel}>Faculty Member</Text>
      </View>

      {/* Avatar overlapping the banner */}
      <View style={styles.teacherAvatarWrap}>
        {user.profileImage ? (
          <Image source={{ uri: user.profileImage }} style={styles.teacherAvatarImage} />
        ) : (
          <View style={[styles.teacherAvatarFallback]}>
            <Text style={styles.teacherAvatarText}>{initials(user.fullName)}</Text>
          </View>
        )}
      </View>

      <View style={styles.teacherBody}>
        <Text style={styles.name}>{user.fullName}</Text>

        <View style={styles.teacherBadgeRow}>
          <View style={styles.teacherBadge}>
            <Text style={styles.teacherBadgeText}>🎓  Teacher</Text>
          </View>
          {user.department && (
            <View style={styles.teacherDeptBadge}>
              <Text style={styles.teacherDeptText}>{user.department}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <InfoRow icon="✉️" label="Email"   value={user.email} styles={styles} />
          {user.department && (
            <InfoRow icon="🎓" label="Faculty / Department" value={user.department} styles={styles} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, styles }: { icon: string; label: string; value: string; styles: StylesType }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: 4, width: 40 },
  backIcon: { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: C.textPrimary },
  headerSpacer: { width: 40 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  errorEmoji: { fontSize: 36 },
  errorText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary, borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  scroll: { alignItems: "center", paddingTop: 36, paddingBottom: 40, paddingHorizontal: 20 },

  avatarWrap: { marginBottom: 18 },
  avatarImage: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 3, borderColor: C.border,
  },
  avatarFallback: {
    width: 108, height: 108, borderRadius: 54,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "800" },

  name: {
    fontSize: 24, fontWeight: "800", color: C.textPrimary,
    textAlign: "center", marginBottom: 8,
  },
  rolePill: {
    paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 20, marginBottom: 28,
  },
  roleText: { fontSize: 13, fontWeight: "700" },

  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowIcon: { fontSize: 20 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600", marginBottom: 2 },
  rowValue: { fontSize: 14, color: C.textPrimary, fontWeight: "500" },

  // Teacher-specific
  teacherScroll: { paddingBottom: 40 },
  teacherBanner: {
    width: "100%", height: 110,
    backgroundColor: "#10B981",
    justifyContent: "flex-end",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  teacherBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  teacherBannerLabel: {
    fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)",
    letterSpacing: 1, textTransform: "uppercase",
  },
  teacherAvatarWrap: {
    alignSelf: "center",
    marginTop: -50,
    marginBottom: 12,
    borderRadius: 60,
    borderWidth: 4, borderColor: C.bg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10,
    elevation: 6,
  },
  teacherAvatarImage: { width: 100, height: 100, borderRadius: 50 },
  teacherAvatarFallback: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#10B981",
    alignItems: "center", justifyContent: "center",
  },
  teacherAvatarText: { color: "#fff", fontSize: 34, fontWeight: "800" },
  teacherBody: { alignItems: "center", paddingHorizontal: 20 },
  teacherBadgeRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 8, justifyContent: "center", marginBottom: 24,
  },
  teacherBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: "#10B9811A", borderRadius: 20,
  },
  teacherBadgeText: { fontSize: 13, fontWeight: "700", color: "#10B981" },
  teacherDeptBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: C.primaryLight, borderRadius: 20,
  },
  teacherDeptText: { fontSize: 13, fontWeight: "600", color: C.primary },
  });
}

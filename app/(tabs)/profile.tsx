import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileCardDivider } from "@/components/ProfileCardDivider";
import { ProfileDarkModeRow } from "@/components/ProfileDarkModeRow";
import { ProfileInfoRow } from "@/components/ProfileInfoRow";
import { ProfileNavRow } from "@/components/ProfileNavRow";
import { ProfileOptionRow } from "@/components/ProfileOptionRow";
import { ProfileSectionCard } from "@/components/ProfileSectionCard";
import { ProfileStatCard } from "@/components/ProfileStatCard";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function buildInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Root — branches by role ───────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user } = useAuthStore();
  if (user?.role === "admin") return <AdminProfileScreen />;
  return <StudentTeacherProfileScreen />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

function AdminProfileScreen() {
  const { user, logout, token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeAdminStyles(C), [isDark]);
  const { stats, statsLoading, fetchStats, reportsPendingCount } = useAdminStore();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => { if (token) fetchStats(token); }, [token]);

  const confirmLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace("/auth/login" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <LogoutConfirmModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={{ marginBottom: 16 }}>
            <ProfileAvatar
              name={user?.fullName ?? "A"}
              imageUri={user?.profileImage}
              bgColor="#F59E0B"
              onLongPress={() => user?.profileImage && setPreviewUri(user.profileImage)}
            />
          </View>
          <Text style={styles.heroName}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? "—"}</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>⚙️  Administrator</Text>
          </View>
        </View>

        {/* ── Platform Stats ── */}
        <ProfileSectionCard label="Platform Overview">
          {statsLoading || !stats ? (
            <View style={styles.statsLoadWrap}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <ProfileStatCard label="Total Users"  value={stats.totalUsers}      icon="👥" color="#6366F1" bg="#6366F118" />
              <ProfileStatCard label="Students"     value={stats.students}        icon="🎓" color={C.primary} bg={C.primaryLight} />
              <ProfileStatCard label="Teachers"     value={stats.teachers}        icon="📚" color="#10B981" bg="#10B98118" />
              <ProfileStatCard label="Groups"       value={stats.totalGroups}     icon="💬" color="#F59E0B" bg="#F59E0B18" />
              <ProfileStatCard label="Pending Reqs" value={stats.pendingRequests} icon="📋" color="#EF4444" bg="#EF444418" />
              <ProfileStatCard label="Messages"     value={stats.totalMessages}   icon="✉️"  color="#8B5CF6" bg="#8B5CF618" />
            </View>
          )}
        </ProfileSectionCard>

        {/* ── Quick Access ── */}
        <ProfileSectionCard label="Quick Access">
          <ProfileNavRow icon="🏛️" iconBg="#6366F118" label="Departments"   sub="Manage academic departments"    onPress={() => router.push("/admin/departments" as any)} />
          <ProfileCardDivider indent={68} />
          <ProfileNavRow icon="📖" iconBg="#10B98118" label="Courses"       sub="Create and assign courses"      onPress={() => router.push("/admin/courses" as any)} />
          <ProfileCardDivider indent={68} />
          <ProfileNavRow icon="🚩" iconBg="#EF444418" label="Reports"       sub="Review moderation reports"      badge={reportsPendingCount > 0 ? reportsPendingCount : undefined} onPress={() => router.push("/admin/reports" as any)} />
          <ProfileCardDivider indent={68} />
          <ProfileNavRow icon="📢" iconBg="#F59E0B18" label="Announcements" sub="Post announcements to students" onPress={() => router.push("/admin/announcements" as any)} />
        </ProfileSectionCard>

        {/* ── Account ── */}
        <ProfileSectionCard label="Account">
          <ProfileNavRow icon="✏️" iconBg="#0EA5E918" label="Edit Profile" sub="Update name and photo" onPress={() => router.push("/edit-profile" as any)} />
          <ProfileCardDivider indent={68} />
          <ProfileDarkModeRow />
        </ProfileSectionCard>

        {/* ── Logout ── */}
        <ProfileSectionCard>
          <ProfileNavRow icon="🚪" iconBg="#EF444418" label="Log Out" sub="Sign out of admin account" danger showChevron={false} onPress={() => setShowLogout(true)} />
        </ProfileSectionCard>

        <Text style={styles.version}>CampusWave v1.0.0 · Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeAdminStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 48 },

    hero: {
      alignItems: "center", paddingTop: 32, paddingBottom: 28,
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    heroName:       { fontSize: 22, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    heroEmail:      { fontSize: 13, color: C.textSecondary, marginBottom: 10 },
    adminBadge:     { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, backgroundColor: "#F59E0B22" },
    adminBadgeText: { fontSize: 13, fontWeight: "700", color: "#F59E0B" },

    statsLoadWrap: { height: 80, alignItems: "center", justifyContent: "center" },
    statsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 12 },

    version: { textAlign: "center", fontSize: 12, color: C.placeholder, marginTop: 32, fontWeight: "500" },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT / TEACHER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

function StudentTeacherProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  const initials  = buildInitials(user?.fullName ?? "?");
  const joinedYear = new Date().getFullYear().toString();
  const isTeacher = user?.role === "teacher";

  const confirmLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace("/auth/login" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <LogoutConfirmModal visible={showLogout} onCancel={() => setShowLogout(false)} onConfirm={confirmLogout} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={{ marginBottom: 16 }}>
            <ProfileAvatar
              name={user?.fullName ?? initials}
              imageUri={user?.profileImage}
              onLongPress={() => user?.profileImage && setPreviewUri(user.profileImage)}
            />
          </View>
          <Text style={styles.heroName}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? "—"}</Text>
          {user?.role && (
            <View style={[styles.rolePill, { backgroundColor: C.primary + "22" }]}>
              <Text style={[styles.roleText, { color: C.primary }]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Academic Info ── */}
        <ProfileSectionCard label="Academic Info">
          <ProfileInfoRow icon="🏛️" label="Department" value={user?.department ?? "—"} />
          {!isTeacher && (
            <>
              <ProfileCardDivider />
              <ProfileInfoRow icon="📚" label="Semester" value={user?.semester ? `Semester ${user.semester}` : "—"} />
              <ProfileCardDivider />
              <ProfileInfoRow icon="🏷️" label="Section"  value={user?.section  ? `Section ${user.section}`   : "—"} />
            </>
          )}
          <ProfileCardDivider />
          <ProfileInfoRow icon="🎓" label="Joined" value={joinedYear} />
        </ProfileSectionCard>

        {/* ── Settings ── */}
        <ProfileSectionCard label="Settings">
          <ProfileOptionRow icon="✏️" label="Edit Profile" showChevron onPress={() => router.push("/edit-profile" as any)} />
          <ProfileCardDivider />
          <ProfileDarkModeRow compact />
        </ProfileSectionCard>

        {/* ── Danger zone ── */}
        <ProfileSectionCard>
          <ProfileOptionRow icon="🚪" label="Logout" danger onPress={() => setShowLogout(true)} />
        </ProfileSectionCard>

        <Text style={styles.version}>CampusWave v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 40 },

    hero: {
      alignItems: "center", paddingTop: 32, paddingBottom: 28,
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    heroName:  { fontSize: 22, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    heroEmail: { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
    rolePill:  { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
    roleText:  { fontSize: 12, fontWeight: "700" },

    version: { textAlign: "center", fontSize: 12, color: C.placeholder, marginTop: 32 },
  });
}

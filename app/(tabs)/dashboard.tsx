import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    key: "users",
    emoji: "👥",
    label: "Users",
    sub: "Roles & permissions",
    color: "#6366F1",
    route: "/(tabs)/management",
  },
  {
    key: "departments",
    emoji: "🏛️",
    label: "Departments",
    sub: "Enrollment & groups",
    color: "#0EA5E9",
    route: "/admin/departments",
  },
  {
    key: "courses",
    emoji: "📚",
    label: "Courses",
    sub: "Assignments & teachers",
    color: "#10B981",
    route: "/admin/courses",
  },
  {
    key: "announcements",
    emoji: "📢",
    label: "Announcements",
    sub: "Posts & broadcasts",
    color: "#F59E0B",
    route: "/admin/announcements",
  },
  {
    key: "reports",
    emoji: "📊",
    label: "Reports",
    sub: "Stats & analytics",
    color: "#8B5CF6",
    route: "/admin/reports",
  },
  {
    key: "settings",
    emoji: "⚙️",
    label: "Settings",
    sub: "App & system config",
    color: "#6B7280",
    route: "/admin/settings",
  },
] as const;

export default function DashboardScreen() {
  const { user, token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const { pendingCount, fetchLeaveRequests } = useAdminStore();

  useEffect(() => {
    if (token) fetchLeaveRequests(token, "pending");
  }, [token]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.adminName}>{user?.fullName?.split(" ")[0]} 👋</Text>
          </View>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldEmoji}>🛡️</Text>
          </View>
        </View>

        {/* Pending alert banner */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push("/(tabs)/admin" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.alertEmoji}>⚠️</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>
                {pendingCount} pending leave request{pendingCount > 1 ? "s" : ""}
              </Text>
              <Text style={styles.alertSub}>Tap to review</Text>
            </View>
            <Text style={styles.alertChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Section label */}
        <Text style={styles.sectionLabel}>Admin Panel</Text>

        {/* 2-column section grid */}
        <View style={styles.grid}>
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec.key}
              style={styles.tile}
              onPress={() => router.push(sec.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.tileIconWrap, { backgroundColor: sec.color + "18" }]}>
                <Text style={styles.tileEmoji}>{sec.emoji}</Text>
              </View>
              <Text style={styles.tileLabel}>{sec.label}</Text>
              <Text style={styles.tileSub}>{sec.sub}</Text>
              <View style={[styles.tileAccent, { backgroundColor: sec.color }]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingTop: 20, paddingBottom: 20,
    },
    greeting:  { fontSize: 14, color: C.textSecondary, fontWeight: "500" },
    adminName: { fontSize: 24, fontWeight: "800", color: C.textPrimary, marginTop: 2 },
    shieldBadge: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center",
    },
    shieldEmoji: { fontSize: 24 },

    alertBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A",
      borderRadius: 14, padding: 14, marginBottom: 20,
    },
    alertEmoji:   { fontSize: 22 },
    alertText:    { flex: 1 },
    alertTitle:   { fontSize: 14, fontWeight: "700", color: "#92400E" },
    alertSub:     { fontSize: 12, color: "#B45309", marginTop: 2 },
    alertChevron: { fontSize: 22, color: "#B45309" },

    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase",
      marginBottom: 12,
    },

    grid: {
      flexDirection: "row", flexWrap: "wrap", gap: 12,
    },

    tile: {
      width: "47%",
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1, borderColor: C.border,
      padding: 18,
      overflow: "hidden",
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    tileIconWrap: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
    },
    tileEmoji:  { fontSize: 22 },
    tileLabel:  { fontSize: 16, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    tileSub:    { fontSize: 11, color: C.textSecondary, fontWeight: "500", lineHeight: 16 },
    tileAccent: {
      position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
    },
  });
}

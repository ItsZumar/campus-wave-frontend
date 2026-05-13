import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: "#6366F118" }]}>
              <Text style={styles.rowEmoji}>👤</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{user?.fullName}</Text>
              <Text style={styles.rowSub}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push("/edit-profile" as any)} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: "#0EA5E918" }]}>
              <Text style={styles.rowEmoji}>✏️</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Edit Profile</Text>
              <Text style={styles.rowSub}>Update name and info</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: "#8B5CF618" }]}>
              <Text style={styles.rowEmoji}>{isDark ? "🌙" : "☀️"}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Dark Mode</Text>
              <Text style={styles.rowSub}>{isDark ? "On" : "Off"}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor={C.white}
            />
          </View>
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: "#EF444418" }]}>
              <Text style={styles.rowEmoji}>🚪</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: "#EF4444" }]}>Log Out</Text>
              <Text style={styles.rowSub}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>CampusWave · Admin Panel</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    backIcon:    { fontSize: 22, color: C.primary, fontWeight: "700" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary },

    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase",
      marginBottom: 8, marginTop: 20,
    },

    card: {
      backgroundColor: C.card, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, overflow: "hidden",
      shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 14, gap: 12,
    },
    iconWrap: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    rowEmoji:  { fontSize: 18 },
    rowText:   { flex: 1 },
    rowLabel:  { fontSize: 15, fontWeight: "600", color: C.textPrimary },
    rowSub:    { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    chevron:   { fontSize: 22, color: C.placeholder },
    divider:   { height: 1, backgroundColor: C.border, marginLeft: 66 },

    version: {
      textAlign: "center", fontSize: 12, color: C.placeholder,
      marginTop: 32, fontWeight: "500",
    },
  });
}

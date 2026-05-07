import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const initials =
    user?.fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const joinedYear = user ? new Date().getFullYear().toString() : "—";
  const isTeacher  = user?.role === "teacher";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login" as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={() => user?.profileImage && setPreviewUri(user.profileImage)}
              disabled={!user?.profileImage}
            >
              <View style={styles.avatar}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
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
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Academic Info</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="🏛️" label="Department" value={user?.department ?? "—"} styles={styles} />
            {!isTeacher && (
              <>
                <Divider styles={styles} />
                <InfoRow icon="📚" label="Semester" value={user?.semester ? `Semester ${user.semester}` : "—"} styles={styles} />
                <Divider styles={styles} />
                <InfoRow icon="🏷️" label="Section" value={user?.section ? `Section ${user.section}` : "—"} styles={styles} />
              </>
            )}
            <Divider styles={styles} />
            <InfoRow icon="🎓" label="Joined" value={joinedYear} styles={styles} />
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.infoCard}>
            <OptionRow icon="✏️" label="Edit Profile" onPress={() => router.push("/edit-profile" as any)} showChevron styles={styles} />
            <Divider styles={styles} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoIcon}>{isDark ? "🌙" : "☀️"}</Text>
              </View>
              <Text style={styles.infoLabel}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
            </View>
          </View>
        </View>

        {/* ── Danger zone ── */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <OptionRow icon="🚪" label="Logout" onPress={handleLogout} danger styles={styles} />
          </View>
        </View>

        <Text style={styles.version}>CampusWave v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
type StylesArg = { styles: ReturnType<typeof makeStyles> };

function InfoRow({ icon, label, value, styles }: { icon: string; label: string; value: string } & StylesArg) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function OptionRow({
  icon, label, value, onPress, showChevron, danger, styles,
}: {
  icon: string; label: string; value?: string;
  onPress: () => void; showChevron?: boolean; danger?: boolean;
} & StylesArg) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.infoIconWrap, danger && styles.dangerIconWrap]}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <Text style={[styles.infoLabel, danger && styles.dangerLabel]}>{label}</Text>
      {value && <Text style={styles.infoValue}>{value}</Text>}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function Divider({ styles }: StylesArg) {
  return <View style={styles.divider} />;
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 40 },

    hero: {
      alignItems: "center",
      paddingTop: 32, paddingBottom: 28,
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatarWrap:  { position: "relative", marginBottom: 16 },
    avatar: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
    },
    avatarText:  { color: C.white, fontSize: 34, fontWeight: "800" },
    avatarImage: { width: 96, height: 96, borderRadius: 48 },
    heroName:    { fontSize: 22, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    heroEmail:   { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
    rolePill:    { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
    roleText:    { fontSize: 12, fontWeight: "700" },

    section:      { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: {
      fontSize: 12, fontWeight: "700",
      color: C.textSecondary, letterSpacing: 0.6,
      textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 4,
    },

    infoCard: {
      backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      overflow: "hidden",
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    infoRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    infoIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: C.bg,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    dangerIconWrap: { backgroundColor: "#FEE2E2" },
    infoIcon:       { fontSize: 16 },
    infoLabel:      { flex: 1, fontSize: 14, fontWeight: "600", color: C.textPrimary },
    dangerLabel:    { color: "#EF4444" },
    infoValue:      { fontSize: 13, color: C.textSecondary, maxWidth: "45%", textAlign: "right" },
    chevron:        { fontSize: 20, color: C.placeholder, marginLeft: 2 },

    divider: { height: 1, backgroundColor: C.border, marginLeft: 62 },
    version: { textAlign: "center", fontSize: 12, color: C.placeholder, marginTop: 32 },
  });
}

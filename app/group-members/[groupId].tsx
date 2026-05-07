import { BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Member = {
  _id: string;
  fullName: string;
  email: string;
  department?: string;
  semester?: string;
  section?: string;
  profileImage?: string;
};

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["#1D4ED8", "#7C3AED", "#DB2777", "#059669", "#D97706", "#DC2626"];
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function GroupMembersScreen() {
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name: string }>();
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${BASE_URL}/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load members");
        setMembers(data.group.members ?? []);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, token]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name ?? "Group"}</Text>
          {!loading && !error && (
            <Text style={styles.headerSub}>{members.length} member{members.length !== 1 ? "s" : ""}</Text>
          )}
        </View>
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
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <MemberRow member={item} onPress={() => router.push(`/user-profile/${item._id}` as any)} styles={styles} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

type StylesType = ReturnType<typeof makeStyles>;

function MemberRow({ member, onPress, styles }: { member: Member; onPress: () => void; styles: StylesType }) {
  const sub = [member.department, member.semester ? `Sem ${member.semester}` : null, member.section ? `Sec ${member.section}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {member.profileImage ? (
        <Image source={{ uri: member.profileImage }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: avatarColor(member._id) }]}>
          <Text style={styles.avatarText}>{initials(member.fullName)}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.memberName} numberOfLines={1}>{member.fullName}</Text>
        {sub ? <Text style={styles.memberSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4, width: 40 },
  backIcon: { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  headerSpacer: { width: 40 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  errorEmoji: { fontSize: 36 },
  errorText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyText: { fontSize: 14, color: C.textSecondary },

  list: { paddingVertical: 8, paddingHorizontal: 16 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 68 },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowBody: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
  memberSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}

import { useAuthStore } from "@/store/auth";
import { useGroupsStore } from "@/store/groups";
import { BASE_URL, type User } from "@/services/api";
import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function initials(name: string): string {
  return name
    .split(/[\s–\-·]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(id: string): string {
  const colors = ["#5C4EE5", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#0EA5E9"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function NewDMScreen() {
  const { user, token }       = useAuthStore();
  const { findOrCreateDM }    = useGroupsStore();
  const [users, setUsers]     = useState<User[]>([]);
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers((d.users as User[]).filter((u) => u._id !== user?.id)))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = query.trim()
    ? users.filter((u) =>
        u.fullName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        (u.department ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : users;

  const openDM = async (target: User) => {
    if (!token || opening) return;
    setOpening(target._id);
    try {
      const group = await findOrCreateDM(token, target._id);
      router.replace(`/chat/${group._id}?name=${encodeURIComponent(target.fullName)}` as any);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setOpening(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email…"
            placeholderTextColor={C.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyTitle}>{query ? "No results" : "No users found"}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u._id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isOpening = opening === item._id;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => openDM(item)}
                activeOpacity={0.7}
                disabled={!!opening}
              >
                <View style={[styles.avatar, { backgroundColor: avatarColor(item._id) }]}>
                  <Text style={styles.avatarText}>{initials(item.fullName)}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.role, item.department, item.semester && `Sem ${item.semester}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                {isOpening && <ActivityIndicator size="small" color={C.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { padding: 4 },
  backIcon:    { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary },

  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bg, borderRadius: 12,
    paddingHorizontal: 12, height: 40, gap: 8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  clearIcon:   { fontSize: 13, color: C.textSecondary, paddingHorizontal: 2 },

  errorBanner: {
    margin: 16, padding: 12,
    backgroundColor: "#FEF2F2", borderRadius: 12,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#B91C1C", textAlign: "center" },

  listContent: { paddingBottom: 16 },
  separator:   { height: 1, backgroundColor: C.border, marginLeft: 76 },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card, gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowBody:    { flex: 1 },
  name:       { fontSize: 15, fontWeight: "600", color: C.textPrimary, marginBottom: 2 },
  meta:       { fontSize: 12, color: C.textSecondary },

  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: C.textSecondary },
});

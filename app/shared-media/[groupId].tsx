import { BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type MediaItem = {
  _id: string;
  url: string;
  name: string;
  createdAt: string;
};

const { width: SCREEN_W } = Dimensions.get("window");
const GAP      = 2;
const COLS     = 3;
const CELL_SIZE = (SCREEN_W - GAP * (COLS - 1)) / COLS;

export default function SharedMediaScreen() {
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name: string }>();
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const { bottom } = useSafeAreaInsets();

  const [media, setMedia]         = useState<MediaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${BASE_URL}/messages/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load media");
        const images: MediaItem[] = (data.messages ?? [])
          .filter((m: any) => m.attachment?.mimeType?.startsWith("image/"))
          .map((m: any) => ({
            _id: m._id,
            url: m.attachment.url,
            name: m.attachment.name,
            createdAt: m.createdAt,
          }))
          .reverse();
        setMedia(images);
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
          <Text style={styles.headerTitle} numberOfLines={1}>Shared Media</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{name ?? "Group"}</Text>
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
      ) : media.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🖼️</Text>
          <Text style={styles.emptyTitle}>No shared images yet</Text>
          <Text style={styles.emptySub}>Images sent in this chat will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item._id}
          numColumns={COLS}
          contentContainerStyle={{ paddingBottom: bottom + 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPreview(item.url)}>
              <Image
                source={{ uri: item.url }}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
                resizeMode="cover"
              />
              <View style={styles.cellGap} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      )}

      {/* Full-screen image preview */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreview(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {preview && (
            <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },

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

  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 10, paddingHorizontal: 32, backgroundColor: C.bg,
  },
  errorEmoji: { fontSize: 36 },
  errorText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  emptySub: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },

  cellGap: { width: GAP },

  previewOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center", justifyContent: "center",
  },
  previewClose: {
    position: "absolute", top: 52, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  previewCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewImage: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  });
}

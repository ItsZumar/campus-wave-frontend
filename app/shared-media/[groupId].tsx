import { BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import * as WebBrowser from "expo-web-browser";
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
  size: number;
  mimeType: string;
  createdAt: string;
};

const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 2;
const COLS = 3;
const CELL_SIZE = (SCREEN_W - GAP * (COLS - 1)) / COLS;

function fileIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "🗜️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎥";
  return "📎";
}

function fileColor(mimeType: string): string {
  if (mimeType.includes("pdf")) return "#EF4444";
  if (mimeType.includes("word") || mimeType.includes("document")) return "#2563EB";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "#16A34A";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "#F59E0B";
  if (mimeType.startsWith("audio/")) return "#8B5CF6";
  if (mimeType.startsWith("video/")) return "#EC4899";
  return "#64748B";
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function decodeName(name: string): string {
  try { return decodeURIComponent(name); } catch { return name; }
}

function fileExtLabel(name: string, mimeType: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (ext.length > 0 && ext.length <= 5) return ext;
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "DOCX";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX";
  return "FILE";
}

type Tab = "images" | "docs";

export default function SharedMediaScreen() {
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name: string }>();
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const { bottom } = useSafeAreaInsets();

  const [images, setImages] = useState<MediaItem[]>([]);
  const [docs, setDocs] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("images");

  useEffect(() => {
    if (!groupId || !token) return;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/messages/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load media");

        const all: MediaItem[] = (data.messages ?? [])
          .filter((m: any) => m.attachment?.url)
          .map((m: any) => ({
            _id: m._id,
            url: m.attachment.url,
            name: m.attachment.name ?? "file",
            size: m.attachment.size ?? 0,
            mimeType: m.attachment.mimeType ?? "application/octet-stream",
            createdAt: m.createdAt,
          }))
          .reverse();

        setImages(all.filter((f) => f.mimeType.startsWith("image/")));
        setDocs(all.filter((f) => !f.mimeType.startsWith("image/")));
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, token]);

  const activeList = tab === "images" ? images : docs;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
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

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "images" && styles.tabItemActive]}
          onPress={() => setTab("images")}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabLabel, tab === "images" && styles.tabLabelActive]}>
            🖼️  Images{images.length > 0 ? `  ${images.length}` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "docs" && styles.tabItemActive]}
          onPress={() => setTab("docs")}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabLabel, tab === "docs" && styles.tabLabelActive]}>
            📁  Docs{docs.length > 0 ? `  ${docs.length}` : ""}
          </Text>
        </TouchableOpacity>
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
      ) : activeList.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>{tab === "images" ? "🖼️" : "📁"}</Text>
          <Text style={styles.emptyTitle}>
            {tab === "images" ? "No shared images yet" : "No shared documents yet"}
          </Text>
          <Text style={styles.emptySub}>
            {tab === "images"
              ? "Images sent in this chat will appear here."
              : "Documents sent in this chat will appear here."}
          </Text>
        </View>
      ) : tab === "images" ? (
        <FlatList
          key="images"
          data={images}
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
      ) : (
        <FlatList
          key="docs"
          data={docs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.docList, { paddingBottom: bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.docSeparator} />}
          renderItem={({ item }) => {
            const displayName = decodeName(item.name);
            const color = fileColor(item.mimeType);
            const ext = fileExtLabel(item.name, item.mimeType);
            return (
              <TouchableOpacity
                style={styles.docRow}
                activeOpacity={0.75}
                onPress={() => WebBrowser.openBrowserAsync(item.url)}
              >
                <View style={[styles.docIconBox, { backgroundColor: color + "18" }]}>
                  <Text style={styles.docIconEmoji}>{fileIcon(item.mimeType)}</Text>
                  <Text style={[styles.docExt, { color }]}>{ext}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={2}>{displayName}</Text>
                  <Text style={styles.docMeta}>
                    {[formatSize(item.size), formatDate(item.createdAt)].filter(Boolean).join("  ·  ")}
                  </Text>
                </View>
                <Text style={styles.docChevron}>›</Text>
              </TouchableOpacity>
            );
          }}
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

    tabBar: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabItemActive: {
      borderBottomColor: C.primary,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: C.textSecondary,
    },
    tabLabelActive: {
      color: C.primary,
    },

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

    // Docs list
    docList: { paddingTop: 8, paddingHorizontal: 16 },
    docSeparator: { height: 1, backgroundColor: C.border },
    docRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      gap: 14,
    },
    docIconBox: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    docIconEmoji: { fontSize: 22 },
    docExt: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginTop: 1,
    },
    docInfo: { flex: 1 },
    docName: { fontSize: 14, fontWeight: "600", color: C.textPrimary, lineHeight: 19 },
    docMeta: { fontSize: 11, color: C.textSecondary, marginTop: 3 },
    docChevron: { fontSize: 20, color: C.textSecondary },

    // Image preview
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

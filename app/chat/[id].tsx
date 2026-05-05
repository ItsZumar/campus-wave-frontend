import { useAuthStore } from "@/store/auth";
import { type Attachment, type ChatMessage, useChatStore } from "@/store/chat";
import { getSocket } from "@/services/socket";
import { useGroupsStore } from "@/store/groups";
import { ColorPalette as C } from "@/styles";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/"))       return "🖼️";
  if (mimeType.startsWith("video/"))       return "🎥";
  if (mimeType.startsWith("audio/"))       return "🎵";
  if (mimeType.includes("pdf"))            return "📄";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "🗜️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user, token } = useAuthStore();
  const {
    messages, loading, error,
    fetchHistory, uploadAttachment,
    addMessage, deleteMessage, editMessage, clearMessages,
  } = useChatStore();
  const myGroup = useGroupsStore((s) => s.groups.find((g) => g._id === id));
  const canPost = myGroup?.membersCanPost !== false || myGroup?.createdBy === user?.id;

  const [input, setInput]                         = useState("");
  const [connected, setConnected]                 = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [pendingLocalUri, setPendingLocalUri]     = useState<string | null>(null);
  const [uploading, setUploading]                 = useState(false);
  const [editingMsg, setEditingMsg]               = useState<ChatMessage | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef  = useRef<FlatList>(null);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !id) return;

    fetchHistory(id, token);

    const socket = getSocket(token);

    const onConnect    = () => { setConnected(true); socket.emit("joinGroup", id); };
    const onDisconnect = () => setConnected(false);
    const onMessage    = (msg: ChatMessage) => {
      addMessage(msg);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    };
    const onDeleted = ({ messageId }: { messageId: string }) => deleteMessage(messageId);
    const onEdited  = ({ messageId, text, updatedAt }: { messageId: string; text: string; updatedAt: string }) =>
      editMessage(messageId, text, updatedAt);
    const onError = (err: { message: string }) => console.warn("[socket] messageError:", err.message);

    if (socket.connected) { setConnected(true); socket.emit("joinGroup", id); }

    socket.on("connect",        onConnect);
    socket.on("disconnect",     onDisconnect);
    socket.on("receiveMessage", onMessage);
    socket.on("messageDeleted", onDeleted);
    socket.on("messageEdited",  onEdited);
    socket.on("messageError",   onError);

    return () => {
      socket.emit("leaveGroup", id);
      socket.off("connect",        onConnect);
      socket.off("disconnect",     onDisconnect);
      socket.off("receiveMessage", onMessage);
      socket.off("messageDeleted", onDeleted);
      socket.off("messageEdited",  onEdited);
      socket.off("messageError",   onError);
      clearMessages();
    };
  }, [id, token]);

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const doUpload = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    try {
      const att = await uploadAttachment(uri, name, mimeType, token!);
      setPendingAttachment(att);
      setPendingLocalUri(mimeType.startsWith("image/") ? uri : null);
    } catch {
      Alert.alert("Upload failed", "Could not upload the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photo library to send images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await doUpload(asset.uri, asset.fileName ?? `photo_${Date.now()}.jpg`, asset.mimeType ?? "image/jpeg");
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await doUpload(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
  };

  const openAttachPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo from Library", "Document"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickImage(); else if (idx === 2) pickDocument(); },
      );
    } else {
      Alert.alert("Attach", "Choose what to send", [
        { text: "Photo from Library", onPress: pickImage },
        { text: "Document",           onPress: pickDocument },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  // ── Send / edit submit ──────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = input.trim();
    if (!token || !id) return;

    if (editingMsg) {
      if (!text) return;
      const socket = getSocket(token);
      socket.emit("editMessage", { messageId: editingMsg._id, text });
      cancelEdit();
      return;
    }

    if (!text && !pendingAttachment) return;
    const socket = getSocket(token);
    socket.emit("sendMessage", {
      groupId: id,
      ...(text ? { text } : {}),
      ...(pendingAttachment ? { attachment: pendingAttachment } : {}),
    });
    setInput("");
    setPendingAttachment(null);
    setPendingLocalUri(null);
  };

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const startEdit = (msg: ChatMessage) => {
    setEditingMsg(msg);
    setInput(msg.text ?? "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput("");
  };

  // ── Long-press action sheet ─────────────────────────────────────────────────
  const onLongPress = (msg: ChatMessage, isMine: boolean) => {
    const iOSOptions  = isMine
      ? ["Cancel", "Copy", "Edit", "Delete"]
      : ["Cancel", "Copy"];
    const destructIdx = isMine ? 3 : undefined;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: iOSOptions, cancelButtonIndex: 0, destructiveButtonIndex: destructIdx },
        (idx) => {
          if (idx === 1) handleCopy(msg);
          if (isMine && idx === 2) startEdit(msg);
          if (isMine && idx === 3) handleDelete(msg);
        },
      );
    } else {
      const androidOptions = [
        { text: "Copy",   onPress: () => handleCopy(msg) },
        ...(isMine ? [
          { text: "Edit",   onPress: () => startEdit(msg) },
          { text: "Delete", onPress: () => handleDelete(msg), style: "destructive" as const },
        ] : []),
        { text: "Cancel", style: "cancel" as const },
      ];
      Alert.alert("Message", undefined, androidOptions);
    }
  };

  const handleCopy = (msg: ChatMessage) => {
    if (msg.text) Clipboard.setStringAsync(msg.text);
  };

  const handleDelete = (msg: ChatMessage) => {
    Alert.alert("Delete message", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          const socket = getSocket(token!);
          socket.emit("deleteMessage", { messageId: msg._id });
        },
      },
    ]);
  };

  const canSend = (editingMsg ? input.trim().length > 0 : (input.trim().length > 0 || pendingAttachment !== null)) && !uploading;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{name ?? "Chat"}</Text>
          <Text style={[styles.headerSub, connected && styles.headerSubOnline]}>
            {connected ? "online" : "connecting…"}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerActionText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : error ? (
          <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const prev = messages[index - 1];
              const isMine = item.sender._id === user?.id;
              const showSender = !isMine && item.sender._id !== prev?.sender._id;
              return (
                <MessageBubble
                  message={item}
                  isMine={isMine}
                  showSender={showSender}
                  onLongPress={() => onLongPress(item, isMine)}
                />
              );
            }}
          />
        )}

        {/* Pending attachment preview */}
        {!editingMsg && (pendingAttachment || uploading) && (
          <View style={styles.attachPreview}>
            {uploading ? (
              <>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={styles.attachPreviewName}>Uploading…</Text>
              </>
            ) : pendingAttachment ? (
              <>
                {pendingLocalUri ? (
                  <Image source={{ uri: pendingLocalUri }} style={styles.attachPreviewThumb} />
                ) : (
                  <Text style={styles.attachPreviewIcon}>{fileIcon(pendingAttachment.mimeType)}</Text>
                )}
                <Text style={styles.attachPreviewName} numberOfLines={1}>{pendingAttachment.name}</Text>
                <Text style={styles.attachPreviewSize}>{formatSize(pendingAttachment.size)}</Text>
                <TouchableOpacity
                  onPress={() => { setPendingAttachment(null); setPendingLocalUri(null); }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.attachPreviewRemove}>✕</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {/* Edit mode banner */}
        {editingMsg && (
          <View style={styles.editBanner}>
            <View style={styles.editBannerBody}>
              <Text style={styles.editBannerLabel}>Editing message</Text>
              <Text style={styles.editBannerText} numberOfLines={1}>{editingMsg.text}</Text>
            </View>
            <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.editBannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar / read-only notice */}
        {canPost ? (
          <View style={styles.inputBar}>
            {!editingMsg && (
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={openAttachPicker}
                disabled={uploading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.attachIcon, uploading && styles.attachIconDisabled]}>📎</Text>
              </TouchableOpacity>
            )}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={editingMsg ? "Edit message…" : "Message…"}
              placeholderTextColor={C.placeholder}
              value={input}
              onChangeText={setInput}
              multiline
              returnKeyType="send"
              submitBehavior="newline"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!canSend}
              activeOpacity={0.8}
            >
              <Text style={styles.sendIcon}>{editingMsg ? "✓" : "↑"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.readOnlyBar}>
            <Text style={styles.readOnlyText}>📢 Announcement channel — only the creator can post</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  message, isMine, showSender, onLongPress,
}: {
  message: ChatMessage; isMine: boolean; showSender: boolean; onLongPress: () => void;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isEdited = message.updatedAt && message.updatedAt !== message.createdAt;

  const att = message.attachment;
  const attachmentCard = att ? (
    att.mimeType.startsWith("image/") ? (
      <Image source={{ uri: att.url }} style={styles.inlineImage} resizeMode="cover" />
    ) : (
      <View style={[styles.attachCard, isMine ? styles.attachCardMine : styles.attachCardTheirs]}>
        <Text style={styles.attachCardIcon}>{fileIcon(att.mimeType)}</Text>
        <View style={styles.attachCardBody}>
          <Text style={[styles.attachCardName, isMine && styles.attachCardNameMine]} numberOfLines={2}>
            {att.name}
          </Text>
          <Text style={[styles.attachCardSize, isMine && styles.attachCardSizeMine]}>
            {formatSize(att.size)}
          </Text>
        </View>
      </View>
    )
  ) : null;

  if (isMine) {
    return (
      <TouchableWithoutFeedback onLongPress={onLongPress}>
        <View style={styles.myBubbleWrap}>
          <View style={styles.myBubble}>
            {attachmentCard}
            {message.text ? <Text style={styles.myBubbleText}>{message.text}</Text> : null}
            <View style={styles.bubbleMeta}>
              {isEdited && <Text style={styles.editedLabelMine}>edited</Text>}
              <Text style={styles.myBubbleTime}>{time}</Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <TouchableWithoutFeedback onLongPress={onLongPress}>
      <View style={styles.theirBubbleWrap}>
        <View style={styles.theirAvatar}>
          <Text style={styles.theirAvatarText}>{message.sender.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.theirBubbleBody}>
          {showSender && <Text style={styles.senderName}>{message.sender.fullName}</Text>}
          <View style={styles.theirBubble}>
            {attachmentCard}
            {message.text ? <Text style={styles.theirBubbleText}>{message.text}</Text> : null}
            <View style={styles.bubbleMeta}>
              {isEdited && <Text style={styles.editedLabelTheirs}>edited</Text>}
              <Text style={styles.theirBubbleTime}>{time}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerCenter: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 11, color: C.textSecondary },
  headerSubOnline: { color: "#10B981" },
  headerAction: { padding: 4 },
  headerActionText: { fontSize: 22, color: C.textSecondary, letterSpacing: 2 },

  messageList: { padding: 12, gap: 4, paddingBottom: 8, flexGrow: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  errorText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyText:  { fontSize: 14, color: C.textSecondary, textAlign: "center" },

  // Pending attachment strip
  attachPreview: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.primaryLight,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  attachPreviewThumb:  { width: 36, height: 36, borderRadius: 6 },
  attachPreviewIcon:   { fontSize: 20 },
  attachPreviewName:   { flex: 1, fontSize: 13, color: C.primary, fontWeight: "600" },
  attachPreviewSize:   { fontSize: 11, color: C.primary },
  attachPreviewRemove: { fontSize: 14, color: C.primary, fontWeight: "700" },

  // Edit mode banner
  editBanner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FEF9C3",
    borderTopWidth: 1, borderTopColor: "#FDE68A",
    gap: 12,
  },
  editBannerBody:  { flex: 1 },
  editBannerLabel: { fontSize: 11, fontWeight: "700", color: "#92400E", marginBottom: 1 },
  editBannerText:  { fontSize: 13, color: "#78350F" },
  editBannerClose: { fontSize: 16, color: "#92400E", fontWeight: "700" },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    gap: 8,
  },
  attachBtn:          { paddingBottom: 6 },
  attachIcon:         { fontSize: 20 },
  attachIconDisabled: { opacity: 0.4 },
  textInput: {
    flex: 1, minHeight: 48, maxHeight: 120,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.textPrimary,
    backgroundColor: C.inputBg,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -1 },

  readOnlyBar: {
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    alignItems: "center",
  },
  readOnlyText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },

  // Bubbles
  myBubbleWrap: { alignItems: "flex-end", marginVertical: 2 },
  myBubble: {
    backgroundColor: C.primary, borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    maxWidth: "78%",
  },
  myBubbleText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  bubbleMeta:   { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4, gap: 4 },
  editedLabelMine:   { fontSize: 10, color: "rgba(255,255,255,0.55)" },
  editedLabelTheirs: { fontSize: 10, color: C.placeholder },
  myBubbleTime:   { color: "rgba(255,255,255,0.65)", fontSize: 10 },

  theirBubbleWrap: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2, gap: 6 },
  theirAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginBottom: 2,
  },
  theirAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  theirBubbleBody: { maxWidth: "72%" },
  senderName: { fontSize: 11, fontWeight: "700", color: C.primary, marginBottom: 2, marginLeft: 14 },
  theirBubble: {
    backgroundColor: C.card, borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    borderWidth: 1, borderColor: C.border,
  },
  theirBubbleText: { color: C.textPrimary, fontSize: 14, lineHeight: 20 },
  theirBubbleTime: { color: C.placeholder, fontSize: 10 },

  inlineImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },

  // Attachment card inside bubble
  attachCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 10, marginBottom: 6,
  },
  attachCardMine:     { backgroundColor: "rgba(255,255,255,0.15)" },
  attachCardTheirs:   { backgroundColor: C.bg },
  attachCardIcon:     { fontSize: 24 },
  attachCardBody:     { flex: 1 },
  attachCardName:     { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  attachCardNameMine: { color: "#fff" },
  attachCardSize:     { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  attachCardSizeMine: { color: "rgba(255,255,255,0.7)" },
});

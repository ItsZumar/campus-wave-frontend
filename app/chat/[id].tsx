import { useAuthStore } from "@/store/auth";
import { type Attachment, type ChatMessage, type GroupInvite, type ReplyPreview, useChatStore } from "@/store/chat";
import { getSocket } from "@/services/socket";
import { useChatUnreadStore } from "@/store/chatUnread";
import { useGroupsStore } from "@/store/groups";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { compressImage } from "@/services/compress";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupTypeColor(type?: string): string {
  if (type === "department") return "#F59E0B";
  if (type === "class")      return "#10B981";
  if (type === "dm")         return "#381B7C";
  return "#0EA5E9";
}

function groupTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    dm: "Direct Message", course: "Course", department: "Department",
    class: "Class", study: "Study Group",
    club: "Club", announcement: "Announcement",
  };
  return type ? (map[type] ?? type) : "Group";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "🗜️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user, token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const { messages, loading, error, fetchHistory, uploadAttachment, addMessage, deleteMessage, editMessage, clearMessages } =
    useChatStore();
  const clearUnread = useChatUnreadStore((s) => s.clear);
  const myGroup = useGroupsStore((s) => s.groups.find((g) => g._id === id));
  const leaveGroup = useGroupsStore((s) => s.leaveGroup);
  const canPost   = myGroup?.membersCanPost !== false || myGroup?.createdBy === user?.id;
  const canUpload = !myGroup?.autoEnrolled || user?.role === "teacher" || user?.role === "admin";
  const { bottom: bottomInset, top: topInset } = useSafeAreaInsets();

  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [pendingLocalUri, setPendingLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMsg, setEditingMsg]   = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo]   = useState<ChatMessage | null>(null);
  const [showInfo, setShowInfo]             = useState(false);
  const [menuVisible, setMenuVisible]       = useState(false);
  const [showCourseInfo, setShowCourseInfo] = useState(false);
  const [showReport, setShowReport]         = useState(false);
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl]   = useState<string | null>(null);
  const [ctxMsg, setCtxMsg] = useState<{ msg: ChatMessage; isMine: boolean } | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !id) return;

    clearUnread(id);
    fetchHistory(id, token);

    const socket = getSocket(token);

    const onConnect = () => {
      setConnected(true);
      socket.emit("joinGroup", id);
    };
    const onDisconnect = () => setConnected(false);
    const onMessage = (msg: ChatMessage) => {
      addMessage(msg);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    };
    const onDeleted = ({ messageId }: { messageId: string }) => deleteMessage(messageId);
    const onEdited = ({ messageId, text, updatedAt }: { messageId: string; text: string; updatedAt: string }) =>
      editMessage(messageId, text, updatedAt);
    const onError = (err: { message: string }) => console.warn("[socket] messageError:", err.message);

    if (socket.connected) {
      setConnected(true);
      socket.emit("joinGroup", id);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receiveMessage", onMessage);
    socket.on("messageDeleted", onDeleted);
    socket.on("messageEdited", onEdited);
    socket.on("messageError", onError);

    return () => {
      socket.emit("leaveGroup", id);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receiveMessage", onMessage);
      socket.off("messageDeleted", onDeleted);
      socket.off("messageEdited", onEdited);
      socket.off("messageError", onError);
      clearMessages();
    };
  }, [id, token]);

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const doUpload = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    try {
      const uploadUri = mimeType.startsWith("image/") ? await compressImage(uri) : uri;
      const att = await uploadAttachment(uploadUri, name, mimeType, token!, id ?? undefined);
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
      ActionSheetIOS.showActionSheetWithOptions({ options: ["Cancel", "Photo from Library", "Document"], cancelButtonIndex: 0 }, (idx) => {
        if (idx === 1) pickImage();
        else if (idx === 2) pickDocument();
      });
    } else {
      Alert.alert("Attach", "Choose what to send", [
        { text: "Photo from Library", onPress: pickImage },
        { text: "Document", onPress: pickDocument },
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
      ...(replyingTo ? { replyTo: replyingTo._id } : {}),
    });
    setInput("");
    setPendingAttachment(null);
    setPendingLocalUri(null);
    setReplyingTo(null);
  };

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const startEdit = (msg: ChatMessage) => {
    setReplyingTo(null);
    setEditingMsg(msg);
    setInput(msg.text ?? "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput("");
  };

  const startReply = (msg: ChatMessage) => {
    setEditingMsg(null);
    setInput("");
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => setReplyingTo(null);

  // ── Long-press action sheet ─────────────────────────────────────────────────
  const onLongPress = (msg: ChatMessage, isMine: boolean) => {
    setCtxMsg({ msg, isMine });
  };

  const handleCopy = (msg: ChatMessage) => {
    if (msg.text) Clipboard.setStringAsync(msg.text);
  };

  const translateMessage = async (msg: ChatMessage) => {
    const msgId = msg._id;
    setCtxMsg(null);
    setTranslations((prev) => ({ ...prev, [msgId]: "…" }));
    try {
      const q = encodeURIComponent(msg.text!);
      // Step 1: auto-detect + translate to English
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${q}`
      );
      const data = await res.json();
      const detectedLang: string = data[2] ?? "";
      const joinChunks = (d: any) =>
        (d[0] as any[]).map((c: any[]) => c[0] ?? "").join("").trim();

      let translated: string;
      if (detectedLang === "en") {
        // English → translate to Urdu
        const urRes = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${q}`
        );
        translated = joinChunks(await urRes.json());
      } else {
        // Any other language (Urdu, etc.) → translate to English
        translated = joinChunks(data);
      }

      if (translated) {
        setTranslations((prev) => ({ ...prev, [msgId]: translated }));
      } else {
        setTranslations((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
        Alert.alert("Translation failed", "Could not translate this message.");
      }
    } catch {
      setTranslations((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
      Alert.alert("Translation failed", "Could not reach translation service.");
    }
  };

  const hideTranslation = (msgId: string) =>
    setTranslations((prev) => { const n = { ...prev }; delete n[msgId]; return n; });

  const handleDelete = (msg: ChatMessage) => {
    Alert.alert("Delete message", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const socket = getSocket(token!);
          socket.emit("deleteMessage", { messageId: msg._id });
        },
      },
    ]);
  };

  // ── Chat menu (⋯ dropdown) ──────────────────────────────────────────────────
  const handleInfo = () => {
    setMenuVisible(false);
    if (myGroup?.type === "dm" && myGroup?.otherUser?._id) {
      router.push(`/user-profile/${myGroup.otherUser._id}` as any);
    } else {
      setShowInfo(true);
    }
  };

  const handleViewMembers = () => {
    setMenuVisible(false);
    router.push(`/group-members/${id}?name=${encodeURIComponent(name ?? "")}` as any);
  };

  const handleSharedMedia = () => {
    setMenuVisible(false);
    router.push(`/shared-media/${id}?name=${encodeURIComponent(name ?? "")}` as any);
  };

  const handleCourseInfo = () => {
    setMenuVisible(false);
    setShowCourseInfo(true);
  };

  const handleReport = () => {
    setMenuVisible(false);
    setShowReport(true);
  };

  const handleShareInvite = () => {
    setMenuVisible(false);
    setShowInvitePicker(true);
  };

  const sendInvite = (targetGroupId: string) => {
    if (!token || !id || !myGroup) return;
    const socket = getSocket(token);
    socket.emit("sendMessage", {
      groupId: targetGroupId,
      invite: { groupId: id },
    });
    setShowInvitePicker(false);
  };

  const handleClearChat = () => {
    setMenuVisible(false);
    Alert.alert("Clear Chat", "All messages will be removed locally. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear",  style: "destructive", onPress: () => clearMessages() },
    ]);
  };

  const handleDeleteChat = () => {
    setMenuVisible(false);
    const isDm = myGroup?.type === "dm";
    if (!isDm && myGroup?.autoEnrolled) {
      Alert.alert(
        "Request to Leave",
        "This group is auto-enrolled. Your leave request will be sent to the administrator.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Request",
            onPress: () => Alert.alert("Request Sent", "Your request has been noted. An administrator will process it shortly."),
          },
        ],
      );
      return;
    }
    Alert.alert(
      isDm ? "Delete Chat" : "Leave Group",
      isDm
        ? "This conversation will be removed from your chat list."
        : "You will leave this group and it will be removed from your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDm ? "Delete" : "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(token!, id!);
              router.back();
            } catch {
              Alert.alert("Error", "Could not complete this action. Please try again.");
            }
          },
        },
      ],
    );
  };

  const canSend = (editingMsg ? input.trim().length > 0 : input.trim().length > 0 || pendingAttachment !== null) && !uploading;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        {/* Avatar */}
        {myGroup?.type === "dm" && myGroup?.otherUser?.profileImage ? (
          <Image source={{ uri: myGroup.otherUser.profileImage }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarFallback, { backgroundColor: groupTypeColor(myGroup?.type) }]}>
            <Text style={styles.headerAvatarText}>
              {(name ?? "C").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {name ?? "Chat"}
          </Text>
          <Text style={[styles.headerSub, connected && styles.headerSubOnline]}>{connected ? "online" : "connecting…"}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerActionText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
              return <MessageBubble message={item} isMine={isMine} showSender={showSender} onLongPress={() => onLongPress(item, isMine)} onImagePress={setImagePreviewUrl} translation={translations[item._id]} onHideTranslation={() => hideTranslation(item._id)} styles={styles} />;
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
                <Text style={styles.attachPreviewName} numberOfLines={1}>
                  {pendingAttachment.name}
                </Text>
                <Text style={styles.attachPreviewSize}>{formatSize(pendingAttachment.size)}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPendingAttachment(null);
                    setPendingLocalUri(null);
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.attachPreviewRemove}>✕</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {/* Reply banner */}
        {replyingTo && !editingMsg && (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerAccent} />
            <View style={styles.replyBannerBody}>
              <Text style={styles.replyBannerLabel}>↩ {replyingTo.sender.fullName}</Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {replyingTo.text ?? "📎 Attachment"}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.replyBannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Edit mode banner */}
        {editingMsg && (
          <View style={styles.editBanner}>
            <View style={styles.editBannerBody}>
              <Text style={styles.editBannerLabel}>Editing message</Text>
              <Text style={styles.editBannerText} numberOfLines={1}>
                {editingMsg.text}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.editBannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar / read-only notice */}
        {canPost ? (
          <View style={[styles.inputBar, { paddingBottom: Math.max(bottomInset, 16) }]}>
            {!editingMsg && canUpload && (
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
          <View style={[styles.readOnlyBar, { paddingBottom: Math.max(bottomInset, 16) }]}>
            <Text style={styles.readOnlyText}>📢 Announcement channel — only the creator can post</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ⋯ Dropdown menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, { top: topInset + 52 }]}>
            {myGroup?.type === "dm" ? (
              /* ── DM options ── */
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleInfo}>
                  <Text style={styles.menuItemIcon}>👤</Text>
                  <Text style={styles.menuItemText}>View Profile</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleShareInvite}>
                  <Text style={styles.menuItemIcon}>🔗</Text>
                  <Text style={styles.menuItemText}>Share Group Invite</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                  <Text style={styles.menuItemIcon}>🗑️</Text>
                  <Text style={styles.menuItemText}>Clear Chat</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteChat}>
                  <Text style={styles.menuItemIcon}>🚮</Text>
                  <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Delete Chat</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Group options ── */
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleViewMembers}>
                  <Text style={styles.menuItemIcon}>👥</Text>
                  <Text style={styles.menuItemText}>View Members</Text>
                </TouchableOpacity>
                {myGroup?.courseId && (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={handleCourseInfo}>
                      <Text style={styles.menuItemIcon}>📚</Text>
                      <Text style={styles.menuItemText}>View Course Info</Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleSharedMedia}>
                  <Text style={styles.menuItemIcon}>🖼️</Text>
                  <Text style={styles.menuItemText}>View Shared Media</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleShareInvite}>
                  <Text style={styles.menuItemIcon}>🔗</Text>
                  <Text style={styles.menuItemText}>Share Group Invite</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                  <Text style={styles.menuItemIcon}>🚨</Text>
                  <Text style={styles.menuItemText}>Report Issue</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, styles.menuSectionDivider]} />
                <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                  <Text style={styles.menuItemIcon}>🗑️</Text>
                  <Text style={styles.menuItemText}>Clear Chat</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteChat}>
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, styles.menuItemDestructive]}>
                    {myGroup?.autoEnrolled ? "Request to Leave" : "Leave Group"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Course Info modal */}
      <Modal visible={showCourseInfo} transparent animationType="slide" onRequestClose={() => setShowCourseInfo(false)}>
        <TouchableWithoutFeedback onPress={() => setShowCourseInfo(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoSheet}>
                <View style={styles.infoSheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoScroll}>
                  <View style={[styles.infoAvatarFallback, { backgroundColor: groupTypeColor(myGroup?.type) }]}>
                    <Text style={styles.infoAvatarText}>
                      {(myGroup?.name ?? name ?? "?").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.infoName}>{myGroup?.courseId?.title ?? myGroup?.name ?? name}</Text>
                  {myGroup?.courseId?.code ? (
                    <Text style={styles.infoTypePill}>{myGroup.courseId.code}</Text>
                  ) : (
                    <Text style={styles.infoTypePill}>{groupTypeLabel(myGroup?.type)}</Text>
                  )}
                  <View style={styles.courseInfoCard}>
                    {myGroup?.department ? (
                      <View style={styles.courseInfoRow}>
                        <Text style={styles.courseInfoLabel}>Department</Text>
                        <Text style={styles.courseInfoValue}>{myGroup.department}</Text>
                      </View>
                    ) : null}
                    {myGroup?.semester ? (
                      <View style={styles.courseInfoRow}>
                        <Text style={styles.courseInfoLabel}>Semester</Text>
                        <Text style={styles.courseInfoValue}>{myGroup.semester}</Text>
                      </View>
                    ) : null}
                    {myGroup?.section ? (
                      <View style={styles.courseInfoRow}>
                        <Text style={styles.courseInfoLabel}>Section</Text>
                        <Text style={styles.courseInfoValue}>{myGroup.section}</Text>
                      </View>
                    ) : null}
                    {myGroup?.memberCount != null ? (
                      <View style={styles.courseInfoRow}>
                        <Text style={styles.courseInfoLabel}>Members</Text>
                        <Text style={styles.courseInfoValue}>{myGroup.memberCount}</Text>
                      </View>
                    ) : null}
                  </View>
                  {myGroup?.description ? (
                    <Text style={styles.infoDescription}>{myGroup.description}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowCourseInfo(false)}>
                    <Text style={styles.infoCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Report Issue modal */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <TouchableWithoutFeedback onPress={() => setShowReport(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoSheet}>
                <View style={styles.infoSheetHandle} />
                <Text style={styles.reportTitle}>Report Issue</Text>
                <Text style={styles.reportSubtitle}>What's the issue with this chat?</Text>
                {[
                  { icon: "🔞", label: "Inappropriate Content" },
                  { icon: "📢", label: "Spam or Harassment" },
                  { icon: "⚙️", label: "Technical Problem" },
                  { icon: "📝", label: "Other" },
                ].map((opt, i, arr) => (
                  <View key={opt.label}>
                    <TouchableOpacity
                      style={styles.reportOption}
                      onPress={() => {
                        setShowReport(false);
                        setTimeout(() =>
                          Alert.alert("Report Submitted", `Your report "${opt.label}" has been received. We'll review it shortly.`),
                        300);
                      }}
                    >
                      <Text style={styles.reportOptionIcon}>{opt.icon}</Text>
                      <Text style={styles.reportOptionText}>{opt.label}</Text>
                      <Text style={styles.reportOptionChevron}>›</Text>
                    </TouchableOpacity>
                    {i < arr.length - 1 && <View style={styles.menuDivider} />}
                  </View>
                ))}
                <TouchableOpacity style={[styles.infoCloseBtn, { marginTop: 20, marginHorizontal: 24 }]} onPress={() => setShowReport(false)}>
                  <Text style={styles.infoCloseBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Info / Profile modal */}
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <TouchableWithoutFeedback onPress={() => setShowInfo(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoSheet}>
                <View style={styles.infoSheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoScroll}>
                  <View style={[styles.infoAvatarFallback, { backgroundColor: groupTypeColor(myGroup?.type) }]}>
                    <Text style={styles.infoAvatarText}>
                      {(myGroup?.name ?? name ?? "?").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.infoName}>{myGroup?.name ?? name}</Text>
                  <Text style={styles.infoTypePill}>{groupTypeLabel(myGroup?.type)}</Text>
                  {myGroup?.description ? (
                    <Text style={styles.infoDescription}>{myGroup.description}</Text>
                  ) : null}
                  <View style={styles.infoStats}>
                    {myGroup?.memberCount != null && (
                      <View style={styles.infoStat}>
                        <Text style={styles.infoStatValue}>{myGroup.memberCount}</Text>
                        <Text style={styles.infoStatLabel}>Members</Text>
                      </View>
                    )}
                    <View style={styles.infoStat}>
                      <Text style={styles.infoStatValue}>
                        {myGroup
                          ? new Date(myGroup.createdAt).toLocaleDateString([], { month: "short", year: "numeric" })
                          : "—"}
                      </Text>
                      <Text style={styles.infoStatLabel}>Created</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfo(false)}>
                    <Text style={styles.infoCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Group Invite Picker */}
      <Modal visible={showInvitePicker} transparent animationType="slide" onRequestClose={() => setShowInvitePicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowInvitePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoSheet}>
                <View style={styles.infoSheetHandle} />
                <Text style={styles.reportTitle}>Send Invite To…</Text>
                <Text style={styles.reportSubtitle}>Choose a group or DM to share this group's invite</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  {useGroupsStore.getState().groups
                    .filter((g) => g._id !== id)
                    .map((g, i, arr) => {
                      const label = g.type === "dm" ? (g.otherUser?.fullName ?? "Direct Message") : g.name;
                      return (
                        <View key={g._id}>
                          <TouchableOpacity style={styles.reportOption} onPress={() => sendInvite(g._id)}>
                            <Text style={styles.reportOptionIcon}>{g.type === "dm" ? "👤" : "💬"}</Text>
                            <Text style={styles.reportOptionText} numberOfLines={1}>{label}</Text>
                            <Text style={styles.reportOptionChevron}>›</Text>
                          </TouchableOpacity>
                          {i < arr.length - 1 && <View style={styles.menuDivider} />}
                        </View>
                      );
                    })}
                </ScrollView>
                <TouchableOpacity style={[styles.infoCloseBtn, { marginTop: 16, marginHorizontal: 24 }]} onPress={() => setShowInvitePicker(false)}>
                  <Text style={styles.infoCloseBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Message context menu ─────────────────────────────────────── */}
      <Modal visible={!!ctxMsg} transparent animationType="fade" onRequestClose={() => setCtxMsg(null)}>
        <TouchableOpacity style={styles.ctxBackdrop} activeOpacity={1} onPress={() => setCtxMsg(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.ctxSheet, { paddingBottom: Math.max(bottomInset, 16) }]}>
              <View style={styles.ctxHandle} />
              <TouchableOpacity style={styles.ctxItem} onPress={() => { startReply(ctxMsg!.msg); setCtxMsg(null); }}>
                <Text style={styles.ctxIcon}>↩️</Text>
                <Text style={styles.ctxText}>Reply</Text>
              </TouchableOpacity>
              <View style={styles.ctxDivider} />
              <TouchableOpacity style={styles.ctxItem} onPress={() => { handleCopy(ctxMsg!.msg); setCtxMsg(null); }}>
                <Text style={styles.ctxIcon}>📋</Text>
                <Text style={styles.ctxText}>Copy</Text>
              </TouchableOpacity>
              {ctxMsg?.msg.text && (
                <>
                  <View style={styles.ctxDivider} />
                  {translations[ctxMsg.msg._id] ? (
                    <TouchableOpacity style={styles.ctxItem} onPress={() => { hideTranslation(ctxMsg!.msg._id); setCtxMsg(null); }}>
                      <Text style={styles.ctxIcon}>🌐</Text>
                      <Text style={styles.ctxText}>Hide Translation</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.ctxItem} onPress={() => translateMessage(ctxMsg!.msg)}>
                      <Text style={styles.ctxIcon}>🌐</Text>
                      <Text style={styles.ctxText}>Translate</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {ctxMsg?.isMine && (
                <>
                  <View style={styles.ctxDivider} />
                  <TouchableOpacity style={styles.ctxItem} onPress={() => { startEdit(ctxMsg!.msg); setCtxMsg(null); }}>
                    <Text style={styles.ctxIcon}>✏️</Text>
                    <Text style={styles.ctxText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.ctxDivider} />
                  <TouchableOpacity style={styles.ctxItem} onPress={() => { handleDelete(ctxMsg!.msg); setCtxMsg(null); }}>
                    <Text style={styles.ctxIcon}>🗑️</Text>
                    <Text style={[styles.ctxText, styles.ctxTextDestructive]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ── Full-screen image preview ─────────────────────────────────── */}
      <Modal
        visible={!!imagePreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewUrl(null)}
      >
        <View style={styles.imagePreviewBackdrop}>
          {imagePreviewUrl && (
            <Image
              source={{ uri: imagePreviewUrl }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setImagePreviewUrl(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.imagePreviewCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Reply quote block ────────────────────────────────────────────────────────
type StylesType = ReturnType<typeof makeStyles>;

function ReplyQuote({ reply, isMine, styles }: { reply: ReplyPreview; isMine: boolean; styles: StylesType }) {
  return (
    <View style={[styles.replyQuote, isMine ? styles.replyQuoteMine : styles.replyQuoteTheirs]}>
      <View style={[styles.replyQuoteBar, isMine ? styles.replyQuoteBarMine : styles.replyQuoteBarTheirs]} />
      <View style={styles.replyQuoteContent}>
        <Text style={[styles.replyQuoteSender, isMine ? styles.replyQuoteSenderMine : styles.replyQuoteSenderTheirs]}>
          {reply.sender.fullName}
        </Text>
        <Text
          style={[styles.replyQuoteText, isMine ? styles.replyQuoteTextMine : styles.replyQuoteTextTheirs]}
          numberOfLines={2}
        >
          {reply.text ?? "📎 Attachment"}
        </Text>
      </View>
    </View>
  );
}

// ─── Invite card ──────────────────────────────────────────────────────────────
function InviteCard({ invite, isMine, styles }: { invite: GroupInvite; isMine: boolean; styles: StylesType }) {
  const name = typeof invite.groupId === "object" ? invite.groupId.name : invite.groupName;
  const type = typeof invite.groupId === "object" ? invite.groupId.type : invite.groupType;
  const gid  = typeof invite.groupId === "object" ? invite.groupId._id  : (invite.groupId as string);

  const { token }      = useAuthStore();
  const groups         = useGroupsStore((s) => s.groups);
  const joinViaInvite  = useGroupsStore((s) => s.joinViaInvite);
  const isMember       = groups.some((g) => g._id === gid);

  const typeEmoji: Record<string, string> = {
    dm: "👤", department: "🏢", class: "🎓", course: "📚", study: "📖", club: "🎯", announcement: "📢",
  };

  const handlePress = () => {
    if (isMember) {
      router.push(`/chat/${gid}?name=${encodeURIComponent(name ?? "")}` as any);
      return;
    }
    Alert.alert(
      name ?? "Group Invite",
      "You are not a member of this group yet.",
      [
        {
          text: "Join Group",
          onPress: async () => {
            try {
              await joinViaInvite(token!, gid);
              router.push(`/chat/${gid}?name=${encodeURIComponent(name ?? "")}` as any);
            } catch (err: any) {
              Alert.alert("Could not join", err?.message ?? "Please try again.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.inviteCard, isMine ? styles.inviteCardMine : styles.inviteCardTheirs]}
    >
      <View style={styles.inviteIconWrap}>
        <Text style={styles.inviteIcon}>{typeEmoji[type ?? ""] ?? "💬"}</Text>
      </View>
      <View style={styles.inviteBody}>
        <Text style={[styles.inviteLabel, isMine && styles.inviteLabelMine]}>Group Invite</Text>
        <Text style={[styles.inviteName, isMine && styles.inviteNameMine]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.inviteJoin, isMine && styles.inviteJoinMine]}>
          {isMember ? "Tap to open →" : "Tap to join →"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  isMine,
  showSender,
  onLongPress,
  onImagePress,
  translation,
  onHideTranslation,
  styles,
}: {
  message: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  onLongPress: () => void;
  onImagePress: (url: string) => void;
  translation?: string;
  onHideTranslation?: () => void;
  styles: StylesType;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isEdited = message.updatedAt && message.updatedAt !== message.createdAt;

  const att = message.attachment;
  const attachmentCard = att ? (
    att.mimeType.startsWith("image/") ? (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress(att.url)}>
        <Image source={{ uri: att.url }} style={styles.inlineImage} resizeMode="cover" />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => Linking.openURL(att.url)}
        style={[styles.attachCard, isMine ? styles.attachCardMine : styles.attachCardTheirs]}
      >
        <Text style={styles.attachCardIcon}>{fileIcon(att.mimeType)}</Text>
        <View style={styles.attachCardBody}>
          <Text style={[styles.attachCardName, isMine && styles.attachCardNameMine]} numberOfLines={2}>
            {att.name}
          </Text>
          <Text style={[styles.attachCardSize, isMine && styles.attachCardSizeMine]}>{formatSize(att.size)}</Text>
        </View>
      </TouchableOpacity>
    )
  ) : null;

  if (isMine) {
    return (
      <TouchableWithoutFeedback onLongPress={onLongPress}>
        <View style={styles.myBubbleWrap}>
          <View style={styles.myBubble}>
            {message.replyTo && <ReplyQuote reply={message.replyTo} isMine styles={styles} />}
            {message.invite && <InviteCard invite={message.invite} isMine styles={styles} />}
            {attachmentCard}
            {message.text ? <Text style={styles.myBubbleText}>{message.text}</Text> : null}
            {translation && (
              <View style={styles.translationBlock}>
                <View style={styles.translationDividerMine} />
                <Text style={styles.translationLabel}>🌐 Translation</Text>
                <Text style={styles.translationTextMine}>
                  {translation === "…" ? "Translating…" : translation}
                </Text>
                {translation !== "…" && (
                  <TouchableOpacity onPress={onHideTranslation} style={styles.translationHideBtn}>
                    <Text style={styles.translationHideMine}>Hide</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
        {message.sender.profileImage ? (
          <Image source={{ uri: message.sender.profileImage }} style={styles.theirAvatar} />
        ) : (
          <View style={styles.theirAvatar}>
            <Text style={styles.theirAvatarText}>{message.sender.fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.theirBubbleBody}>
          {showSender && <Text style={styles.senderName}>{message.sender.fullName}</Text>}
          <View style={styles.theirBubble}>
            {message.replyTo && <ReplyQuote reply={message.replyTo} isMine={false} styles={styles} />}
            {message.invite && <InviteCard invite={message.invite} isMine={false} styles={styles} />}
            {attachmentCard}
            {message.text ? <Text style={styles.theirBubbleText}>{message.text}</Text> : null}
            {translation && (
              <View style={styles.translationBlock}>
                <View style={styles.translationDividerTheirs} />
                <Text style={styles.translationLabel}>🌐 Translation</Text>
                <Text style={styles.translationTextTheirs}>
                  {translation === "…" ? "Translating…" : translation}
                </Text>
                {translation !== "…" && (
                  <TouchableOpacity onPress={onHideTranslation} style={styles.translationHideBtn}>
                    <Text style={styles.translationHideTheirs}>Hide</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerCenter: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 11, color: C.textSecondary },
  headerSubOnline: { color: "#10B981" },
  headerAction: { padding: 4 },
  headerActionText: { fontSize: 22, color: C.textSecondary, letterSpacing: 2 },

  messageList: { padding: 12, gap: 4, paddingBottom: 8, flexGrow: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  errorText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyText: { fontSize: 14, color: C.textSecondary, textAlign: "center" },

  // Pending attachment strip
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.primaryLight,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  attachPreviewThumb: { width: 36, height: 36, borderRadius: 6 },
  attachPreviewIcon: { fontSize: 20 },
  attachPreviewName: { flex: 1, fontSize: 13, color: C.primary, fontWeight: "600" },
  attachPreviewSize: { fontSize: 11, color: C.primary },
  attachPreviewRemove: { fontSize: 14, color: C.primary, fontWeight: "700" },

  // Edit mode banner
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEF9C3",
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    gap: 12,
  },
  editBannerBody: { flex: 1 },
  editBannerLabel: { fontSize: 11, fontWeight: "700", color: "#92400E", marginBottom: 1 },
  editBannerText: { fontSize: 13, color: "#78350F" },
  editBannerClose: { fontSize: 16, color: "#92400E", fontWeight: "700" },

  // Reply banner
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.primaryLight,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  replyBannerAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: C.primary,
    flexShrink: 0,
  },
  replyBannerBody: { flex: 1 },
  replyBannerLabel: { fontSize: 11, fontWeight: "700", color: C.primary, marginBottom: 1 },
  replyBannerText:  { fontSize: 13, color: C.textSecondary },
  replyBannerClose: { fontSize: 16, color: C.primary, fontWeight: "700" },

  // Reply quote inside bubble
  replyQuote: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  },
  replyQuoteMine:    { backgroundColor: "rgba(255,255,255,0.18)" },
  replyQuoteTheirs:  { backgroundColor: C.bg },
  replyQuoteBar:     { width: 3, flexShrink: 0 },
  replyQuoteBarMine:   { backgroundColor: "rgba(255,255,255,0.7)" },
  replyQuoteBarTheirs: { backgroundColor: C.primary },
  replyQuoteContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 5 },
  replyQuoteSender:      { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  replyQuoteSenderMine:  { color: "rgba(255,255,255,0.85)" },
  replyQuoteSenderTheirs:{ color: C.primary },
  replyQuoteText:        { fontSize: 12, lineHeight: 16 },
  replyQuoteTextMine:    { color: "rgba(255,255,255,0.7)" },
  replyQuoteTextTheirs:  { color: C.textSecondary },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  attachBtn: { paddingBottom: 6 },
  attachIcon: { fontSize: 20 },
  attachIconDisabled: { opacity: 0.4 },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.inputBg,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -1 },

  readOnlyBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
  },
  readOnlyText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },

  // Bubbles
  myBubbleWrap: { alignItems: "flex-end", marginVertical: 2 },
  myBubble: {
    backgroundColor: C.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    maxWidth: "78%",
  },
  myBubbleText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4, gap: 4 },
  editedLabelMine: { fontSize: 10, color: "rgba(255,255,255,0.55)" },
  editedLabelTheirs: { fontSize: 10, color: C.placeholder },
  myBubbleTime: { color: "rgba(255,255,255,0.65)", fontSize: 10 },

  theirBubbleWrap: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2, gap: 6 },
  theirAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  theirAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  theirBubbleBody: { maxWidth: "72%" },
  senderName: { fontSize: 11, fontWeight: "700", color: C.primary, marginBottom: 2, marginLeft: 14 },
  theirBubble: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  theirBubbleText: { color: C.textPrimary, fontSize: 14, lineHeight: 20 },
  theirBubbleTime: { color: C.placeholder, fontSize: 10 },

  inlineImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },
  imagePreviewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  imagePreviewFull: { width: "100%", height: "100%" },
  imagePreviewClose: {
    position: "absolute", top: 48, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  imagePreviewCloseText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  // Attachment card inside bubble
  attachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  attachCardMine: { backgroundColor: "rgba(255,255,255,0.15)" },
  attachCardTheirs: { backgroundColor: C.bg },
  attachCardIcon: { fontSize: 24 },
  attachCardBody: { flex: 1 },
  attachCardName: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  attachCardNameMine: { color: "#fff" },
  attachCardSize: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  attachCardSizeMine: { color: "rgba(255,255,255,0.7)" },

  // Info / Profile modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  infoSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  infoSheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  infoScroll: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  infoAvatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  infoAvatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  infoName: {
    fontSize: 22, fontWeight: "800", color: C.textPrimary,
    textAlign: "center", marginBottom: 6,
  },
  infoTypePill: {
    fontSize: 12, fontWeight: "700",
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, overflow: "hidden",
    marginBottom: 18,
  },
  infoDescription: {
    fontSize: 14, color: C.textSecondary,
    textAlign: "center", lineHeight: 20,
    marginBottom: 18,
  },
  infoStats: { flexDirection: "row", gap: 32, marginBottom: 24 },
  infoStat: { alignItems: "center", gap: 2 },
  infoStatValue: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
  infoStatLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
  infoCloseBtn: {
    marginTop: 8,
    paddingHorizontal: 40, paddingVertical: 12,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  infoCloseBtnText: { fontSize: 15, fontWeight: "700", color: C.textPrimary },

  // ⋯ Dropdown menu
  menuBackdrop: { flex: 1 },
  menuDropdown: {
    position: "absolute",
    right: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 210,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { fontSize: 15, color: C.textPrimary, fontWeight: "500" },
  menuItemDestructive: { color: C.error },
  menuDivider: { height: 1, backgroundColor: C.border },
  menuSectionDivider: { height: 4, backgroundColor: C.bg },

  // Course Info modal
  courseInfoCard: {
    width: "100%",
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  courseInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  courseInfoLabel: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  courseInfoValue: { fontSize: 13, color: C.textPrimary, fontWeight: "500", flexShrink: 1, textAlign: "right", marginLeft: 12 },

  // Invite card
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    gap: 10,
    minWidth: 180,
  },
  inviteCardMine:   { backgroundColor: "rgba(255,255,255,0.18)" },
  inviteCardTheirs: { backgroundColor: C.primaryLight },
  inviteIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  inviteIcon: { fontSize: 20 },
  inviteBody: { flex: 1 },
  inviteLabel:     { fontSize: 10, fontWeight: "700", color: C.primary,      textTransform: "uppercase", marginBottom: 2 },
  inviteLabelMine: { color: "rgba(255,255,255,0.7)" },
  inviteName:     { fontSize: 13, fontWeight: "700", color: C.textPrimary, marginBottom: 3 },
  inviteNameMine: { color: "#fff" },
  inviteJoin:     { fontSize: 11, color: C.primary,    fontWeight: "600" },
  inviteJoinMine: { color: "rgba(255,255,255,0.8)" },

  // Report Issue modal
  reportTitle: {
    fontSize: 18, fontWeight: "800", color: C.textPrimary,
    paddingHorizontal: 24, marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13, color: C.textSecondary,
    paddingHorizontal: 24, marginBottom: 16,
  },
  reportOption: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, paddingVertical: 15,
    gap: 14,
  },
  reportOptionIcon:    { fontSize: 20 },
  reportOptionText:    { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: "500" },
  reportOptionChevron: { fontSize: 20, color: C.textSecondary },

  ctxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  ctxSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 10,
    overflow: "hidden",
  },
  ctxHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: "center", marginBottom: 10,
  },
  ctxItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 22, paddingVertical: 15, gap: 14,
  },
  ctxDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 22 },
  ctxIcon:    { fontSize: 20 },
  ctxText:    { fontSize: 16, fontWeight: "500", color: C.textPrimary },
  ctxTextDestructive: { color: "#EF4444" },

  // Translation block
  translationBlock: { marginTop: 6 },
  translationDividerMine:   { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 6 },
  translationDividerTheirs: { height: 1, backgroundColor: C.border, marginBottom: 6 },
  translationLabel: { fontSize: 10, fontWeight: "700", color: C.textSecondary, marginBottom: 3, letterSpacing: 0.3 },
  translationTextMine:   { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  translationTextTheirs: { color: C.textSecondary, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  translationHideBtn: { alignSelf: "flex-end", marginTop: 4 },
  translationHideMine:   { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  translationHideTheirs: { fontSize: 11, color: C.primary, fontWeight: "600" },
  });
}

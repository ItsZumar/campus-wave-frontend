import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { MessageBubble, fileIcon, formatSize } from "@/components/MessageBubble";
import { ReportModal } from "@/components/ReportModal";
import { useAuthStore } from "@/store/auth";
import { type Attachment, type ChatMessage, useChatStore } from "@/store/chat";
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
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  if (type === "class") return "#10B981";
  if (type === "dm") return "#381B7C";
  return "#0EA5E9";
}

function groupTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    dm: "Direct Message",
    course: "Course",
    department: "Department",
    class: "Class",
    study: "Study Group",
    club: "Club",
    announcement: "Announcement",
  };
  return type ? (map[type] ?? type) : "Group";
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
  const setActiveGroup = useChatUnreadStore((s) => s.setActive);
  const clearActiveGroup = useChatUnreadStore((s) => s.clearActive);
  const myGroup = useGroupsStore((s) => s.groups.find((g) => g._id === id));
  const leaveGroup    = useGroupsStore((s) => s.leaveGroup);
  const requestLeave  = useGroupsStore((s) => s.requestLeave);
  const canPost = myGroup?.membersCanPost !== false || myGroup?.createdBy === user?.id;
  const canUpload = !myGroup?.autoEnrolled || user?.role === "teacher" || user?.role === "admin";
  const { bottom: bottomInset, top: topInset } = useSafeAreaInsets();

  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [pendingLocalUri, setPendingLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [showCourseInfo, setShowCourseInfo] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ctxMsg, setCtxMsg] = useState<{ msg: ChatMessage; isMine: boolean } | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !id) return;

    clearUnread(id);
    setActiveGroup(id);
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
      clearActiveGroup();
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

  const openAttachPicker = () => setShowAttachPicker(true);

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
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${q}`);
      const data = await res.json();
      const detectedLang: string = data[2] ?? "";
      const joinChunks = (d: any) =>
        (d[0] as any[])
          .map((c: any[]) => c[0] ?? "")
          .join("")
          .trim();

      let translated: string;
      if (detectedLang === "en") {
        // English → translate to Urdu
        const urRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${q}`);
        translated = joinChunks(await urRes.json());
      } else {
        // Any other language (Urdu, etc.) → translate to English
        translated = joinChunks(data);
      }

      if (translated) {
        setTranslations((prev) => ({ ...prev, [msgId]: translated }));
      } else {
        setTranslations((prev) => {
          const n = { ...prev };
          delete n[msgId];
          return n;
        });
        Alert.alert("Translation failed", "Could not translate this message.");
      }
    } catch {
      setTranslations((prev) => {
        const n = { ...prev };
        delete n[msgId];
        return n;
      });
      Alert.alert("Translation failed", "Could not reach translation service.");
    }
  };

  const hideTranslation = (msgId: string) =>
    setTranslations((prev) => {
      const n = { ...prev };
      delete n[msgId];
      return n;
    });

  const handleDelete = (msg: ChatMessage) => {
    setDeleteTarget(msg);
  };

  const confirmDeleteMessage = () => {
    if (!deleteTarget) return;
    const socket = getSocket(token!);
    socket.emit("deleteMessage", { messageId: deleteTarget._id });
    setDeleteTarget(null);
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
      { text: "Clear", style: "destructive", onPress: () => clearMessages() },
    ]);
  };

  const handleDeleteChat = () => {
    setMenuVisible(false);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteChat = async () => {
    setShowDeleteConfirm(false);
    const isDm = myGroup?.type === "dm";
    try {
      if (!isDm && myGroup?.autoEnrolled) {
        await requestLeave(token!, id!);
        setLeaveSuccess(true);
        return;
      }
      await leaveGroup(token!, id!);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not complete this action. Please try again.");
    }
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
            <Text style={styles.headerAvatarText}>{(name ?? "C").charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {name ?? "Chat"}
          </Text>
          <Text style={[styles.headerSub, connected && styles.headerSubOnline]}>{connected ? "online" : "connecting…"}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.headerAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
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
              return (
                <MessageBubble
                  message={item}
                  isMine={isMine}
                  showSender={showSender}
                  onLongPress={() => onLongPress(item, isMine)}
                  onImagePress={setImagePreviewUrl}
                  translation={translations[item._id]}
                  onHideTranslation={() => hideTranslation(item._id)}
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
              <Text style={styles.replyBannerLabel}>Replying to {replyingTo.sender.fullName}</Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {replyingTo.text ?? "📎 Attachment"}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} style={styles.replyBannerCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
          <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : Math.max(bottomInset, 8) }]}>
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
          <View style={[styles.readOnlyBar, { paddingBottom: keyboardVisible ? 8 : Math.max(bottomInset, 8) }]}>
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
                <TouchableOpacity style={styles.menuItem} onPress={handleSharedMedia}>
                  <Text style={styles.menuItemIcon}>🖼️</Text>
                  <Text style={styles.menuItemText}>View Shared Media</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <View style={[styles.menuDivider, styles.menuSectionDivider]} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteChat}>
                  <Text style={styles.menuItemIcon}>🗑️</Text>
                  <Text style={styles.menuItemText}>Delete Chat</Text>
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
                    <Text style={styles.infoAvatarText}>{(myGroup?.name ?? name ?? "?").slice(0, 2).toUpperCase()}</Text>
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
                  {myGroup?.description ? <Text style={styles.infoDescription}>{myGroup.description}</Text> : null}
                  <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowCourseInfo(false)}>
                    <Text style={styles.infoCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Report User modal (three-dot menu → Report Issue, DM only) */}
      {myGroup?.type === "dm" && myGroup?.otherUser?._id && (
        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          type="user"
          reportedUserId={myGroup.otherUser._id}
          reportedUserName={myGroup.otherUser.fullName ?? myGroup.name}
        />
      )}

      {/* Report Group modal (three-dot menu → Report Issue, group chats) */}
      {myGroup?.type !== "dm" && (
        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          type="group"
          reportedGroupId={id ?? ""}
          reportedGroupName={name ?? myGroup?.name}
        />
      )}

      {/* Report Message modal (long-press context menu) */}
      <ReportModal
        visible={!!reportMsg}
        onClose={() => setReportMsg(null)}
        type="message"
        reportedUserId={reportMsg?.sender._id ?? ""}
        reportedUserName={reportMsg?.sender.fullName}
        messageId={reportMsg?._id}
        messageText={reportMsg?.text}
      />

      {/* Info / Profile modal */}
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <TouchableWithoutFeedback onPress={() => setShowInfo(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.infoSheet}>
                <View style={styles.infoSheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoScroll}>
                  <View style={[styles.infoAvatarFallback, { backgroundColor: groupTypeColor(myGroup?.type) }]}>
                    <Text style={styles.infoAvatarText}>{(myGroup?.name ?? name ?? "?").slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.infoName}>{myGroup?.name ?? name}</Text>
                  <Text style={styles.infoTypePill}>{groupTypeLabel(myGroup?.type)}</Text>
                  {myGroup?.description ? <Text style={styles.infoDescription}>{myGroup.description}</Text> : null}
                  <View style={styles.infoStats}>
                    {myGroup?.memberCount != null && (
                      <View style={styles.infoStat}>
                        <Text style={styles.infoStatValue}>{myGroup.memberCount}</Text>
                        <Text style={styles.infoStatLabel}>Members</Text>
                      </View>
                    )}
                    <View style={styles.infoStat}>
                      <Text style={styles.infoStatValue}>
                        {myGroup ? new Date(myGroup.createdAt).toLocaleDateString([], { month: "short", year: "numeric" }) : "—"}
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
                  {useGroupsStore
                    .getState()
                    .groups.filter((g) => g._id !== id)
                    .map((g, i, arr) => {
                      const label = g.type === "dm" ? (g.otherUser?.fullName ?? "Direct Message") : g.name;
                      return (
                        <View key={g._id}>
                          <TouchableOpacity style={styles.reportOption} onPress={() => sendInvite(g._id)}>
                            <Text style={styles.reportOptionIcon}>{g.type === "dm" ? "👤" : "💬"}</Text>
                            <Text style={styles.reportOptionText} numberOfLines={1}>
                              {label}
                            </Text>
                            <Text style={styles.reportOptionChevron}>›</Text>
                          </TouchableOpacity>
                          {i < arr.length - 1 && <View style={styles.menuDivider} />}
                        </View>
                      );
                    })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.infoCloseBtn, { marginTop: 16, marginHorizontal: 24 }]}
                  onPress={() => setShowInvitePicker(false)}
                >
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
              <TouchableOpacity
                style={styles.ctxItem}
                onPress={() => {
                  startReply(ctxMsg!.msg);
                  setCtxMsg(null);
                }}
              >
                <Text style={styles.ctxIcon}>↩️</Text>
                <Text style={styles.ctxText}>Reply</Text>
              </TouchableOpacity>
              <View style={styles.ctxDivider} />
              <TouchableOpacity
                style={styles.ctxItem}
                onPress={() => {
                  handleCopy(ctxMsg!.msg);
                  setCtxMsg(null);
                }}
              >
                <Text style={styles.ctxIcon}>📋</Text>
                <Text style={styles.ctxText}>Copy</Text>
              </TouchableOpacity>
              {ctxMsg?.msg.text && (
                <>
                  <View style={styles.ctxDivider} />
                  {translations[ctxMsg.msg._id] ? (
                    <TouchableOpacity
                      style={styles.ctxItem}
                      onPress={() => {
                        hideTranslation(ctxMsg!.msg._id);
                        setCtxMsg(null);
                      }}
                    >
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
              {!ctxMsg?.isMine && (
                <>
                  <View style={styles.ctxDivider} />
                  <TouchableOpacity
                    style={styles.ctxItem}
                    onPress={() => {
                      setReportMsg(ctxMsg!.msg);
                      setCtxMsg(null);
                    }}
                  >
                    <Text style={styles.ctxIcon}>🚩</Text>
                    <Text style={[styles.ctxText, styles.ctxTextDestructive]}>Report Message</Text>
                  </TouchableOpacity>
                </>
              )}
              {ctxMsg?.isMine && (
                <>
                  <View style={styles.ctxDivider} />
                  <TouchableOpacity
                    style={styles.ctxItem}
                    onPress={() => {
                      startEdit(ctxMsg!.msg);
                      setCtxMsg(null);
                    }}
                  >
                    <Text style={styles.ctxIcon}>✏️</Text>
                    <Text style={styles.ctxText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.ctxDivider} />
                  <TouchableOpacity
                    style={styles.ctxItem}
                    onPress={() => {
                      handleDelete(ctxMsg!.msg);
                      setCtxMsg(null);
                    }}
                  >
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
      <Modal visible={!!imagePreviewUrl} transparent animationType="fade" onRequestClose={() => setImagePreviewUrl(null)}>
        <View style={styles.imagePreviewBackdrop}>
          {imagePreviewUrl && <Image source={{ uri: imagePreviewUrl }} style={styles.imagePreviewFull} resizeMode="contain" />}
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setImagePreviewUrl(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.imagePreviewCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Delete / Leave confirmation modal ──────────────────────── */}
      <DeleteConfirmModal
        visible={showDeleteConfirm}
        variant={myGroup?.type === "dm" ? "dm" : myGroup?.autoEnrolled ? "autoEnrolled" : "group"}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteChat}
      />

      {/* ── Delete message confirmation modal ───────────────────────── */}
      <DeleteConfirmModal
        visible={!!deleteTarget}
        variant="message"
        messagePreview={deleteTarget?.text ?? undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMessage}
      />

      {/* ── Leave request success modal ─────────────────────────────── */}
      <Modal visible={leaveSuccess} transparent animationType="fade" onRequestClose={() => setLeaveSuccess(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLeaveSuccess(false)}>
          <Pressable style={styles.leaveSuccessSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.leaveSuccessHandle} />
            <View style={styles.leaveSuccessBody}>
              <View style={styles.leaveSuccessIcon}>
                <Text style={{ fontSize: 30 }}>✓</Text>
              </View>
              <Text style={styles.leaveSuccessTitle}>Request Sent!</Text>
              <Text style={styles.leaveSuccessMsg}>
                Your leave request has been submitted. An admin will review it shortly.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.leaveSuccessBtn}
              onPress={() => setLeaveSuccess(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.leaveSuccessBtnText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Attach picker bottom sheet ───────────────────────────────── */}
      <Modal
        visible={showAttachPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAttachPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.attachSheet}>
                <View style={styles.attachSheetHandle} />
                <Text style={styles.attachSheetTitle}>Send Attachment</Text>
                <View style={styles.attachOptionRow}>
                  <TouchableOpacity
                    style={styles.attachOption}
                    activeOpacity={0.75}
                    onPress={() => { setShowAttachPicker(false); pickImage(); }}
                  >
                    <View style={[styles.attachOptionIcon, { backgroundColor: "#5C4EE518" }]}>
                      <Text style={styles.attachOptionEmoji}>🖼️</Text>
                    </View>
                    <Text style={styles.attachOptionLabel}>Photo</Text>
                    <Text style={styles.attachOptionSub}>From library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachOption}
                    activeOpacity={0.75}
                    onPress={() => { setShowAttachPicker(false); pickDocument(); }}
                  >
                    <View style={[styles.attachOptionIcon, { backgroundColor: "#F59E0B18" }]}>
                      <Text style={styles.attachOptionEmoji}>📄</Text>
                    </View>
                    <Text style={styles.attachOptionLabel}>Document</Text>
                    <Text style={styles.attachOptionSub}>PDF, Word, etc.</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.attachCancelBtn}
                  activeOpacity={0.75}
                  onPress={() => setShowAttachPicker(false)}
                >
                  <Text style={styles.attachCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
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
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
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

    // Reply banner (above input bar)
    replyBanner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.border,
      gap: 12,
    },
    replyBannerAccent: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2,
      backgroundColor: C.primary,
      flexShrink: 0,
    },
    replyBannerBody: { flex: 1 },
    replyBannerLabel: { fontSize: 12, fontWeight: "700", color: C.primary, marginBottom: 2 },
    replyBannerText: { fontSize: 13, color: C.textSecondary },
    replyBannerCloseBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    replyBannerClose: { fontSize: 12, color: C.textSecondary, fontWeight: "700" },

    // Reply quote inside bubble
    replyQuote: {
      flexDirection: "row",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 6,
    },
    replyQuoteMine: { width: "100%", backgroundColor: "rgba(0,0,0,0.22)" },
    replyQuoteTheirs: { width: "100%", backgroundColor: "rgba(0,0,0,0.06)" },
    replyQuoteBar: { width: 3, flexShrink: 0 },
    replyQuoteBarMine: { backgroundColor: "rgba(255,255,255,0.9)" },
    replyQuoteBarTheirs: { backgroundColor: C.primary },
    replyQuoteContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 5 },
    replyQuoteSender: { fontSize: 11, fontWeight: "700", marginBottom: 1 },
    replyQuoteSenderMine: { color: "rgba(255,255,255,0.9)" },
    replyQuoteSenderTheirs: { color: C.primary },
    replyQuoteText: { fontSize: 11, lineHeight: 15 },
    replyQuoteTextMine: { color: "rgba(255,255,255,0.6)" },
    replyQuoteTextTheirs: { color: C.textSecondary },

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

    imagePreviewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
    imagePreviewFull: { width: "100%", height: "100%" },
    imagePreviewClose: {
      position: "absolute",
      top: 48,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    imagePreviewCloseText: { color: "#fff", fontSize: 18, fontWeight: "600" },

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
      width: 40,
      height: 4,
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
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    infoAvatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
    infoName: {
      fontSize: 22,
      fontWeight: "800",
      color: C.textPrimary,
      textAlign: "center",
      marginBottom: 6,
    },
    infoTypePill: {
      fontSize: 12,
      fontWeight: "700",
      color: C.primary,
      backgroundColor: C.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 18,
    },
    infoDescription: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 18,
    },
    infoStats: { flexDirection: "row", gap: 32, marginBottom: 24 },
    infoStat: { alignItems: "center", gap: 2 },
    infoStatValue: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
    infoStatLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
    infoCloseBtn: {
      marginTop: 8,
      paddingHorizontal: 40,
      paddingVertical: 12,
      backgroundColor: C.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
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
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    courseInfoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    courseInfoLabel: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
    courseInfoValue: { fontSize: 13, color: C.textPrimary, fontWeight: "500", flexShrink: 1, textAlign: "right", marginLeft: 12 },

    // Report Issue modal
    reportTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: C.textPrimary,
      paddingHorizontal: 24,
      marginBottom: 4,
    },
    reportSubtitle: {
      fontSize: 13,
      color: C.textSecondary,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    reportOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 15,
      gap: 14,
    },
    reportOptionIcon: { fontSize: 20 },
    reportOptionText: { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: "500" },
    reportOptionChevron: { fontSize: 20, color: C.textSecondary },

    ctxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    ctxSheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 10,
      overflow: "hidden",
    },
    ctxHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: "center",
      marginBottom: 10,
    },
    ctxItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 22,
      paddingVertical: 15,
      gap: 14,
    },
    ctxDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 22 },
    ctxIcon: { fontSize: 20 },
    ctxText: { fontSize: 16, fontWeight: "500", color: C.textPrimary },
    ctxTextDestructive: { color: "#EF4444" },

    // Attach picker bottom sheet
    attachSheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 36,
      paddingTop: 12,
    },
    attachSheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: "center", marginBottom: 16,
    },
    attachSheetTitle: {
      fontSize: 16, fontWeight: "800", color: C.textPrimary,
      textAlign: "center", marginBottom: 20,
    },
    attachOptionRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
    attachOption: {
      flex: 1, alignItems: "center",
      backgroundColor: C.bg,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      paddingVertical: 20, gap: 6,
    },
    attachOptionIcon: {
      width: 56, height: 56, borderRadius: 16,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    attachOptionEmoji: { fontSize: 28 },
    attachOptionLabel: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
    attachOptionSub: { fontSize: 11, color: C.textSecondary, fontWeight: "500" },
    // Leave request success modal
    leaveSuccessSheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    leaveSuccessHandle: {
      width: 36,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 2,
      alignSelf: "center" as const,
      marginTop: 12,
      marginBottom: 16,
    },
    leaveSuccessBody: { alignItems: "center" as const, paddingVertical: 16, gap: 10 },
    leaveSuccessIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#DCFCE7",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    leaveSuccessTitle: { fontSize: 20, fontWeight: "800" as const, color: C.textPrimary },
    leaveSuccessMsg: { fontSize: 14, color: C.textSecondary, textAlign: "center" as const, lineHeight: 20 },
    leaveSuccessBtn: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    leaveSuccessBtnText: { fontSize: 15, fontWeight: "700" as const, color: C.white },

    attachCancelBtn: {
      backgroundColor: C.bg, borderRadius: 14,
      borderWidth: 1, borderColor: C.border,
      paddingVertical: 14, alignItems: "center",
    },
    attachCancelText: { fontSize: 15, fontWeight: "700", color: C.textSecondary },
  });
}

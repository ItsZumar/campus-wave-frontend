import { useAuthStore } from "@/store/auth";
import { type ChatMessage, type GroupInvite, type ReplyPreview } from "@/store/chat";
import { useGroupsStore } from "@/store/groups";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo } from "react";
import * as WebBrowser from "expo-web-browser";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

// ─── Shared helpers ───────────────────────────────────────────────────────────
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "🗜️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
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

function fileExtLabel(name: string, mimeType: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (ext.length > 0 && ext.length <= 5) return ext;
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "DOCX";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX";
  return "FILE";
}

function decodeName(name: string): string {
  try { return decodeURIComponent(name); } catch { return name; }
}

// ─── Reply quote ──────────────────────────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function ReplyQuote({ reply, isMine, styles }: { reply: ReplyPreview; isMine: boolean; styles: Styles }) {
  return (
    <View style={[styles.replyQuote, isMine ? styles.replyQuoteMine : styles.replyQuoteTheirs]}>
      <View style={[styles.replyQuoteBar, isMine ? styles.replyQuoteBarMine : styles.replyQuoteBarTheirs]} />
      <View style={styles.replyQuoteContent}>
        <Text style={[styles.replyQuoteSender, isMine ? styles.replyQuoteSenderMine : styles.replyQuoteSenderTheirs]} numberOfLines={1}>
          {reply.sender.fullName}
        </Text>
        <Text style={[styles.replyQuoteText, isMine ? styles.replyQuoteTextMine : styles.replyQuoteTextTheirs]} numberOfLines={1}>
          {reply.text ?? "📎 Attachment"}
        </Text>
      </View>
    </View>
  );
}

// ─── Invite card ──────────────────────────────────────────────────────────────
function InviteCard({ invite, isMine, styles }: { invite: GroupInvite; isMine: boolean; styles: Styles }) {
  const name = typeof invite.groupId === "object" ? invite.groupId.name : invite.groupName;
  const type = typeof invite.groupId === "object" ? invite.groupId.type : invite.groupType;
  const gid = typeof invite.groupId === "object" ? invite.groupId._id : (invite.groupId as string);

  const { token } = useAuthStore();
  const groups = useGroupsStore((s) => s.groups);
  const joinViaInvite = useGroupsStore((s) => s.joinViaInvite);
  const isMember = groups.some((g) => g._id === gid);

  const typeEmoji: Record<string, string> = {
    dm: "👤",
    department: "🏢",
    class: "🎓",
    course: "📚",
    study: "📖",
    club: "🎯",
    announcement: "📢",
  };

  const handlePress = () => {
    if (isMember) {
      router.push(`/chat/${gid}?name=${encodeURIComponent(name ?? "")}` as any);
      return;
    }
    Alert.alert(name ?? "Group Invite", "You are not a member of this group yet.", [
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
    ]);
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
        <Text style={[styles.inviteName, isMine && styles.inviteNameMine]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.inviteJoin, isMine && styles.inviteJoinMine]}>{isMember ? "Tap to open →" : "Tap to join →"}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  onLongPress: () => void;
  onImagePress: (url: string) => void;
  translation?: string;
  onHideTranslation?: () => void;
}

export function MessageBubble({
  message,
  isMine,
  showSender,
  onLongPress,
  onImagePress,
  translation,
  onHideTranslation,
}: MessageBubbleProps) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

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
        onPress={() => WebBrowser.openBrowserAsync(att.url)}
        style={[styles.attachCard, isMine ? styles.attachCardMine : styles.attachCardTheirs]}
      >
        <View style={[styles.attachIconBox, { backgroundColor: fileColor(att.mimeType) + (isMine ? "30" : "18") }]}>
          <Text style={styles.attachIconEmoji}>{fileIcon(att.mimeType)}</Text>
        </View>
        <View style={styles.attachCardBody}>
          <Text style={[styles.attachCardName, isMine && styles.attachCardNameMine]} numberOfLines={1}>
            {decodeName(att.name)}
          </Text>
          <Text style={[styles.attachCardMeta, isMine && styles.attachCardMetaMine]}>
            {formatSize(att.size)}{"  ·  "}{fileExtLabel(att.name, att.mimeType)}
          </Text>
        </View>
        <View style={[styles.attachOpenBtn, { backgroundColor: fileColor(att.mimeType) + (isMine ? "30" : "15") }]}>
          <Text style={[styles.attachOpenIcon, { color: isMine ? "rgba(255,255,255,0.9)" : fileColor(att.mimeType) }]}>↗</Text>
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
                <Text style={styles.translationTextMine}>{translation === "…" ? "Translating…" : translation}</Text>
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
                <Text style={styles.translationTextTheirs}>{translation === "…" ? "Translating…" : translation}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    // My bubble
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
    myBubbleTime: { color: "rgba(255,255,255,0.65)", fontSize: 10 },

    // Their bubble
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

    // Shared meta row
    bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4, gap: 4 },
    editedLabelMine: { fontSize: 10, color: "rgba(255,255,255,0.55)" },
    editedLabelTheirs: { fontSize: 10, color: C.placeholder },

    // Inline image
    inlineImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },

    // Attachment card inside bubble
    attachCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginBottom: 6,
      minWidth: 210,
    },
    attachCardMine: { backgroundColor: "rgba(255,255,255,0.15)" },
    attachCardTheirs: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    attachIconBox: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    attachIconEmoji: { fontSize: 22 },
    attachCardBody: { flex: 1, gap: 3 },
    attachCardName: { fontSize: 13, fontWeight: "700", color: C.textPrimary, lineHeight: 16 },
    attachCardNameMine: { color: "#fff" },
    attachCardMeta: { fontSize: 11, color: C.textSecondary, fontWeight: "500" },
    attachCardMetaMine: { color: "rgba(255,255,255,0.65)" },
    attachOpenBtn: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    attachOpenIcon: { fontSize: 15, fontWeight: "700" },

    // Reply quote
    replyQuote: { width: "100%", flexDirection: "row", borderRadius: 6, overflow: "hidden", marginBottom: 6 },
    replyQuoteMine: { width: "100%", backgroundColor: "rgba(0,0,0,0.22)" },
    replyQuoteTheirs: { backgroundColor: "rgba(0,0,0,0.06)" },
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
    inviteCardMine: { backgroundColor: "rgba(255,255,255,0.18)" },
    inviteCardTheirs: { backgroundColor: C.primaryLight },
    inviteIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    inviteIcon: { fontSize: 20 },
    inviteBody: { flex: 1 },
    inviteLabel: { fontSize: 10, fontWeight: "700", color: C.primary, textTransform: "uppercase", marginBottom: 2 },
    inviteLabelMine: { color: "rgba(255,255,255,0.7)" },
    inviteName: { fontSize: 13, fontWeight: "700", color: C.textPrimary, marginBottom: 3 },
    inviteNameMine: { color: "#fff" },
    inviteJoin: { fontSize: 11, color: C.primary, fontWeight: "600" },
    inviteJoinMine: { color: "rgba(255,255,255,0.8)" },

    // Translation block
    translationBlock: { marginTop: 6 },
    translationDividerMine: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 6 },
    translationDividerTheirs: { height: 1, backgroundColor: C.border, marginBottom: 6 },
    translationLabel: { fontSize: 10, fontWeight: "700", color: C.textSecondary, marginBottom: 3, letterSpacing: 0.3 },
    translationTextMine: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 18, fontStyle: "italic" },
    translationTextTheirs: { color: C.textSecondary, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
    translationHideBtn: { alignSelf: "flex-end", marginTop: 4 },
    translationHideMine: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
    translationHideTheirs: { fontSize: 11, color: C.primary, fontWeight: "600" },
  });
}

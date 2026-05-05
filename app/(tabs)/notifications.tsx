import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
type Notification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: string;
  iconBg: string;
};

type Section = {
  title: string;
  data: Notification[];
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const INITIAL_SECTIONS: Section[] = [
  {
    title: "Announcements",
    data: [
      {
        id: "a1",
        title: "Semester Registration Open",
        description: "Spring 2025 course registration is now open. Deadline is Jan 15. Log in to the student portal to enroll.",
        time: "Just now",
        read: false,
        icon: "📢",
        iconBg: "#5C4EE5",
      },
      {
        id: "a2",
        title: "Holiday Notice – Feb 5",
        description: "The university will remain closed on February 5th on account of Kashmir Solidarity Day.",
        time: "2 hrs ago",
        read: false,
        icon: "🏛️",
        iconBg: "#7C3AED",
      },
      {
        id: "a3",
        title: "Fee Submission Deadline",
        description: "Last date to submit semester fees without a late surcharge is January 20, 2025.",
        time: "Yesterday",
        read: true,
        icon: "💳",
        iconBg: "#0EA5E9",
      },
    ],
  },
  {
    title: "Message Alerts",
    data: [
      {
        id: "m1",
        title: "Hassan Ali sent you a message",
        description: "\"Are you coming to the 10 AM class today?\"",
        time: "10 min ago",
        read: false,
        icon: "💬",
        iconBg: "#5C4EE5",
      },
      {
        id: "m2",
        title: "New message in CS301 – DSA",
        description: "Prof. Ali: \"Assignment 3 is due tomorrow at midnight. Submit on LMS.\"",
        time: "42 min ago",
        read: false,
        icon: "📚",
        iconBg: "#7C3AED",
      },
      {
        id: "m3",
        title: "Fatima Khan sent you a message",
        description: "\"Can you send me the lecture notes please?\"",
        time: "Yesterday",
        read: true,
        icon: "💬",
        iconBg: "#EC4899",
      },
    ],
  },
  {
    title: "Exam Updates",
    data: [
      {
        id: "e1",
        title: "Mid-Term Schedule Released",
        description: "Mid-term exams begin February 10. Check the exam portal for your timetable and venue details.",
        time: "3 hrs ago",
        read: false,
        icon: "📝",
        iconBg: "#F59E0B",
      },
      {
        id: "e2",
        title: "CS302 Quiz – Tomorrow",
        description: "Reminder: CS302 Algorithms quiz is scheduled for tomorrow. Chapters 4, 5, and 6.",
        time: "5 hrs ago",
        read: true,
        icon: "⏰",
        iconBg: "#EF4444",
      },
      {
        id: "e3",
        title: "Result Uploaded – OOP Lab",
        description: "Your OOP Lab mid-term result has been uploaded. Check your student portal.",
        time: "2 days ago",
        read: true,
        icon: "✅",
        iconBg: "#10B981",
      },
    ],
  },
  {
    title: "Events",
    data: [
      {
        id: "ev1",
        title: "Hackathon – This Saturday!",
        description: "CampusWave Hackathon 2025 starts this Saturday at 9 AM in the CS Block. Register before Jan 18.",
        time: "8 hrs ago",
        read: false,
        icon: "🚀",
        iconBg: "#5C4EE5",
      },
      {
        id: "ev2",
        title: "Tech Talk: AI in Healthcare",
        description: "Guest lecture by Dr. Sana Mirza on AI applications in healthcare. Jan 22, 2 PM, Auditorium.",
        time: "Yesterday",
        read: true,
        icon: "🎤",
        iconBg: "#0EA5E9",
      },
      {
        id: "ev3",
        title: "Sports Week Begins Jan 27",
        description: "Annual Sports Week starts January 27. Register your team for cricket, football, and futsal.",
        time: "2 days ago",
        read: true,
        icon: "🏆",
        iconBg: "#F59E0B",
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);

  const unreadCount = sections.flatMap((s) => s.data).filter((n) => !n.read).length;

  const markAllRead = () => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        data: s.data.map((n) => ({ ...n, read: true })),
      }))
    );
  };

  const markRead = (id: string) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        data: s.data.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.title === "Announcements" && (
              <TouchableOpacity onPress={() => router.push("/announcements" as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <NotifRow notification={item} onPress={() => markRead(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No new notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Notification row ──────────────────────────────────────────────────────────
function NotifRow({ notification: n, onPress }: { notification: Notification; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, n.read && styles.rowRead]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Unread indicator */}
      {!n.read && <View style={styles.unreadDot} />}

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: n.iconBg + "20" }]}>
        <Text style={styles.iconText}>{n.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.contentTop}>
          <Text style={[styles.title, n.read && styles.titleRead]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.time}>{n.time}</Text>
        </View>
        <Text style={[styles.description, n.read && styles.descriptionRead]} numberOfLines={2}>
          {n.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  unreadBadge: {
    backgroundColor: C.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  markAllText: { fontSize: 13, fontWeight: "700", color: C.primary },

  listContent: { paddingBottom: 24 },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
  },
  seeAll: { fontSize: 12, fontWeight: "700", color: C.primary, marginTop: 14 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionGap: { height: 0 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 76 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    gap: 12,
    position: "relative",
  },
  rowRead: { backgroundColor: C.bg },

  unreadDot: {
    position: "absolute",
    left: 6,
    top: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: { fontSize: 20 },

  content: { flex: 1 },
  contentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    flex: 1,
  },
  titleRead: { fontWeight: "500", color: C.textSecondary },
  time: { fontSize: 11, color: C.placeholder, flexShrink: 0, marginTop: 1 },
  description: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  descriptionRead: { color: C.placeholder },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textSecondary },
});

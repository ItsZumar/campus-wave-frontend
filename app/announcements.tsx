import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "All" | "Timetable" | "Exams" | "Notices";

type Announcement = {
  id: string;
  title: string;
  body: string;
  time: string;
  date: string;
  category: Exclude<Category, "All">;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  authorColor: string;
  pinned?: boolean;
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<Exclude<Category, "All">, { label: string; icon: string; color: string; bg: string }> = {
  Timetable: { label: "Timetable", icon: "📅", color: "#0EA5E9", bg: "#E0F2FE" },
  Exams:     { label: "Exam Alert", icon: "📝", color: "#F59E0B", bg: "#FEF3C7" },
  Notices:   { label: "Notice",     icon: "📢", color: "#EF4444", bg: "#FEE2E2" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an1",
    title: "Mid-Term Exam Schedule – Spring 2025",
    body: "Mid-term examinations for Spring 2025 will commence from February 10. Students are advised to check the exam portal for their individual timetables, hall assignments, and seating plans. Roll number slips must be carried.",
    time: "9:00 AM",
    date: "Today",
    category: "Exams",
    authorName: "Controller of Examinations",
    authorRole: "Exam Dept.",
    authorInitials: "CE",
    authorColor: "#F59E0B",
    pinned: true,
  },
  {
    id: "an2",
    title: "Revised Class Timetable – Week 3",
    body: "Due to the rescheduling of CS302, the timetable for Week 3 has been updated. CS302 will now be held on Tuesdays 11–1 PM in Room 204. All other slots remain unchanged.",
    time: "8:30 AM",
    date: "Today",
    category: "Timetable",
    authorName: "Dr. Kamran Bashir",
    authorRole: "HOD – Computer Science",
    authorInitials: "KB",
    authorColor: "#0EA5E9",
    pinned: true,
  },
  {
    id: "an3",
    title: "Fee Submission Deadline – Jan 20",
    body: "All students are reminded to submit their semester dues by January 20, 2025. A late surcharge of Rs. 500 per day will be applied after the deadline. Visit the accounts office or pay via the student portal.",
    time: "11:00 AM",
    date: "Yesterday",
    category: "Notices",
    authorName: "Accounts Office",
    authorRole: "Admin",
    authorInitials: "AO",
    authorColor: "#EF4444",
  },
  {
    id: "an4",
    title: "CS301 Quiz – Chapters 4–6",
    body: "A class quiz for CS301 Data Structures will be held this Thursday. Topics include heaps, graphs, and sorting algorithms (chapters 4 to 6). No makeup will be given for absentees.",
    time: "3:15 PM",
    date: "Yesterday",
    category: "Exams",
    authorName: "Prof. Ali Hassan",
    authorRole: "CS301 – DSA",
    authorInitials: "AH",
    authorColor: "#7C3AED",
  },
  {
    id: "an5",
    title: "Lab Slot Swap – OOP & SE",
    body: "The OOP lab (Monday 2–4 PM) and SE lab (Wednesday 2–4 PM) have been swapped for this week only due to a scheduling conflict. Please note the change.",
    time: "10:00 AM",
    date: "Mon, Jan 13",
    category: "Timetable",
    authorName: "Dr. Sara Noor",
    authorRole: "SE201 – Software Eng.",
    authorInitials: "SN",
    authorColor: "#10B981",
  },
  {
    id: "an6",
    title: "Semester Registration Deadline",
    body: "Spring 2025 course registration closes on January 15. Students who fail to register will not be enrolled in any courses this semester. Visit the student portal immediately to register your courses.",
    time: "9:00 AM",
    date: "Mon, Jan 13",
    category: "Notices",
    authorName: "Academic Affairs Office",
    authorRole: "Admin",
    authorInitials: "AA",
    authorColor: "#5C4EE5",
  },
  {
    id: "an7",
    title: "Final Term Date Sheet Released",
    body: "The final term date sheet for Spring 2025 has been uploaded to the exam portal. Exams start March 20. Students are advised to prepare accordingly and report any clashes to the exam office within 3 days.",
    time: "5:00 PM",
    date: "Sun, Jan 12",
    category: "Exams",
    authorName: "Controller of Examinations",
    authorRole: "Exam Dept.",
    authorInitials: "CE",
    authorColor: "#F59E0B",
  },
  {
    id: "an8",
    title: "Campus Closed – Feb 5 (Kashmir Day)",
    body: "The university campus will remain closed on February 5, 2025 in observance of Kashmir Solidarity Day. All classes, labs, and administrative offices will be suspended. Online sessions may be held at teacher discretion.",
    time: "12:00 PM",
    date: "Fri, Jan 10",
    category: "Notices",
    authorName: "Vice Chancellor Office",
    authorRole: "Admin",
    authorInitials: "VC",
    authorColor: "#EF4444",
  },
];

const FILTERS: Category[] = ["All", "Timetable", "Exams", "Notices"];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AnnouncementsScreen() {
  const [activeFilter, setActiveFilter] = useState<Category>("All");

  const filtered = activeFilter === "All"
    ? ANNOUNCEMENTS
    : ANNOUNCEMENTS.filter((a) => a.category === activeFilter);

  const pinned = filtered.filter((a) => a.pinned);
  const rest = filtered.filter((a) => !a.pinned);
  const listData = [...pinned, ...rest];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSub}>{listData.length} posts</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              {f !== "All" && <Text style={styles.chipIcon}>{CATEGORY_META[f as Exclude<Category,"All">].icon}</Text>}
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <AnnouncementCard item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No announcements</Text>
            <Text style={styles.emptySub}>Nothing in this category yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────
function AnnouncementCard({ item }: { item: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[item.category];

  return (
    <TouchableOpacity
      style={[styles.card, item.pinned && styles.cardPinned]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        {/* Author avatar */}
        <View style={[styles.authorAvatar, { backgroundColor: item.authorColor + "22" }]}>
          <Text style={[styles.authorInitials, { color: item.authorColor }]}>{item.authorInitials}</Text>
        </View>

        {/* Author info */}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.authorName}</Text>
          <Text style={styles.authorRole}>{item.authorRole}</Text>
        </View>

        {/* Time + pinned indicator */}
        <View style={styles.timeCol}>
          {item.pinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
          <Text style={styles.timeText}>{item.time}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </View>

      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
        <Text style={styles.categoryIcon}>{meta.icon}</Text>
        <Text style={[styles.categoryLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Body */}
      <Text style={styles.cardBody} numberOfLines={expanded ? undefined : 2}>
        {item.body}
      </Text>

      {/* Expand / collapse */}
      <Text style={styles.expandToggle}>{expanded ? "Show less ▲" : "Read more ▼"}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

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
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 12, color: C.textSecondary },

  filterWrap: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  chipTextActive: { color: C.primary },

  feed: { padding: 16, paddingBottom: 32 },
  separator: { height: 12 },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#1E1060",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  cardPinned: {
    backgroundColor: "#F0EEFF",
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },

  pinnedLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.primary,
    marginBottom: 4,
    textAlign: "right",
  },

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  authorInitials: { fontSize: 14, fontWeight: "800" },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  authorRole: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  timeCol: { alignItems: "flex-end" },
  timeText: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
  dateText: { fontSize: 10, color: C.placeholder, marginTop: 1 },

  categoryBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryIcon: { fontSize: 11 },
  categoryLabel: { fontSize: 11, fontWeight: "700" },

  cardTitle: { fontSize: 15, fontWeight: "700", color: C.textPrimary, lineHeight: 22 },
  cardBody: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  expandToggle: { fontSize: 12, fontWeight: "700", color: C.primary, marginTop: -4 },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
  emptySub: { fontSize: 14, color: C.textSecondary },
});

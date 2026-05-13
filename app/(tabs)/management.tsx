import { useAdminStore, type AdminUser } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { BASE_URL } from "@/services/api";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROLES = ["all", "student", "teacher", "admin"] as const;
type RoleFilter = (typeof ROLES)[number];

export default function ManagementScreen() {
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C, isDark), [isDark]);

  const { users, usersLoading, fetchUsers, updateUserRole, toggleBlockUser, assignTeacherCourses, assignStudentInfo } = useAdminStore();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [roleModal, setRoleModal] = useState<AdminUser | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assignModal, setAssignModal] = useState<AdminUser | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignStudentModal, setAssignStudentModal] = useState<AdminUser | null>(null);
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<{ name: string; dept: string; semester?: string; section?: string; courseCount: number } | null>(null);
  const [detailModal, setDetailModal] = useState<AdminUser | null>(null);
  const [blocking, setBlocking] = useState(false);

  const load = (r = roleFilter, s = search) => {
    if (!token) return;
    fetchUsers(token, { role: r, search: s || undefined });
  };

  useEffect(() => {
    load();
  }, [token]);

  const onRoleFilter = (r: RoleFilter) => {
    setRoleFilter(r);
    load(r, search);
  };

  const onSearch = (text: string) => {
    setSearch(text);
    load(roleFilter, text);
  };

  const handleRoleChange = async (newRole: "student" | "teacher" | "admin") => {
    if (!roleModal || !token) return;
    setUpdating(true);
    try {
      await updateUserRole(token, roleModal._id, newRole);
      setRoleModal(null);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleBlock = async (user: AdminUser) => {
    const action = user.blocked ? "Unblock" : "Block";
    Alert.alert(`${action} User`, `${action} ${user.fullName}?${!user.blocked ? " They won't be able to log in." : ""}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action,
        style: "destructive",
        onPress: async () => {
          if (!token) return;
          setBlocking(true);
          try {
            await toggleBlockUser(token, user._id);
            setDetailModal((prev) => (prev?._id === user._id ? { ...prev, blocked: !prev.blocked } : prev));
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setBlocking(false);
          }
        },
      },
    ]);
  };

  const handleAssign = async (department: string, courseIds: string[]) => {
    if (!assignModal || !token) return;
    const teacherName = assignModal.fullName;
    setAssigning(true);
    try {
      await assignTeacherCourses(token, assignModal._id, department, courseIds);
      setAssignModal(null);
      setAssignSuccess({ name: teacherName, dept: department, courseCount: courseIds.length });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignStudent = async (department: string, semester: string, section: string, courseIds: string[]) => {
    if (!assignStudentModal || !token) return;
    const studentName = assignStudentModal.fullName;
    setAssigningStudent(true);
    try {
      await assignStudentInfo(token, assignStudentModal._id, department, semester, section, courseIds);
      setAssignStudentModal(null);
      setAssignSuccess({ name: studentName, dept: department, semester, section, courseCount: courseIds.length });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setAssigningStudent(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSub}>
          {users.length} user{users.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, department…"
          placeholderTextColor={C.placeholder}
          value={search}
          onChangeText={onSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role filter tabs */}
      <View style={styles.filterRow}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterBtn, roleFilter === r && styles.filterBtnActive]}
            onPress={() => onRoleFilter(r)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterBtnText, roleFilter === r && styles.filterBtnTextActive]}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {usersLoading && users.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={usersLoading} onRefresh={() => load()} tintColor={C.primary} />}
        >
          {users.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            users.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                onViewPress={() => setDetailModal(u)}
                onRolePress={() => setRoleModal(u)}
                onAssignPress={
                  u.role === "teacher" ? () => setAssignModal(u) :
                  u.role === "student" ? () => setAssignStudentModal(u) :
                  undefined
                }
                styles={styles}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Role picker modal */}
      <RolePickerModal
        visible={!!roleModal}
        user={roleModal}
        onSelect={handleRoleChange}
        onClose={() => setRoleModal(null)}
        updating={updating}
        styles={styles}
        C={C}
      />

      {/* User detail modal */}
      <UserDetailModal
        visible={!!detailModal}
        user={detailModal}
        onClose={() => setDetailModal(null)}
        onRolePress={() => {
          setDetailModal(null);
          setTimeout(() => setRoleModal(detailModal), 300);
        }}
        onAssignPress={
          detailModal?.role === "teacher"
            ? () => { setDetailModal(null); setTimeout(() => setAssignModal(detailModal), 300); }
            : detailModal?.role === "student"
            ? () => { setDetailModal(null); setTimeout(() => setAssignStudentModal(detailModal), 300); }
            : undefined
        }
        onBlockPress={() => detailModal && handleBlock(detailModal)}
        blocking={blocking}
        styles={styles}
        C={C}
      />

      {/* Assign courses modal (teacher) */}
      <AssignCoursesModal
        visible={!!assignModal}
        user={assignModal}
        token={token!}
        onAssign={handleAssign}
        onClose={() => setAssignModal(null)}
        assigning={assigning}
        styles={styles}
        C={C}
      />

      {/* Assignment success modal */}
      <AssignSuccessModal
        visible={!!assignSuccess}
        data={assignSuccess}
        onClose={() => setAssignSuccess(null)}
        styles={styles}
        C={C}
      />

      {/* Assign profile modal (student) */}
      <AssignStudentModal
        visible={!!assignStudentModal}
        user={assignStudentModal}
        token={token!}
        onAssign={handleAssignStudent}
        onClose={() => setAssignStudentModal(null)}
        assigning={assigningStudent}
        styles={styles}
        C={C}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserCard({
  user,
  onViewPress,
  onRolePress,
  onAssignPress,
  styles,
}: {
  user: AdminUser;
  onViewPress: () => void;
  onRolePress: () => void;
  onAssignPress?: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const ROLE_COLOR: Record<string, string> = { student: "#6366F1", teacher: "#0EA5E9", admin: "#EF4444" };
  const roleColor = ROLE_COLOR[user.role] ?? "#94A3B8";

  return (
    <View style={[styles.card, user.blocked && styles.cardBlocked]}>
      {user.blocked && (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>🚫 Blocked</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        <View style={[styles.avatar, user.blocked && { opacity: 0.5 }]}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.department ? (
            <Text style={styles.userMeta}>
              {user.department}
              {user.semester ? ` · Sem ${user.semester}` : ""}
              {user.section ? ` · ${user.section}` : ""}
            </Text>
          ) : user.role === "teacher" ? (
            <Text style={[styles.userMeta, { color: "#F59E0B" }]}>No department assigned</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.rolePill, { backgroundColor: roleColor + "18", borderColor: roleColor + "44" }]}
          onPress={onRolePress}
          activeOpacity={0.75}
        >
          <Text style={[styles.rolePillText, { color: roleColor }]}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
          <Text style={[styles.rolePillEdit, { color: roleColor }]}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* Card actions row */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={onViewPress} activeOpacity={0.8}>
          <Text style={styles.cardActionText}>👁 View</Text>
        </TouchableOpacity>
        {onAssignPress && (
          <TouchableOpacity style={styles.cardActionBtn} onPress={onAssignPress} activeOpacity={0.8}>
            <Text style={styles.cardActionText}>＋ Assign</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RolePickerModal({
  visible,
  user,
  onSelect,
  onClose,
  updating,
  styles,
  C,
}: {
  visible: boolean;
  user: AdminUser | null;
  onSelect: (role: "student" | "teacher" | "admin") => void;
  onClose: () => void;
  updating: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
}) {
  const ROLE_OPTIONS: { role: "student" | "teacher" | "admin"; emoji: string; label: string; desc: string }[] = [
    { role: "student", emoji: "🎓", label: "Student", desc: "Access to chats, groups, and announcements" },
    { role: "teacher", emoji: "📖", label: "Teacher", desc: "Can create announcement groups" },
    { role: "admin", emoji: "🛡️", label: "Admin", desc: "Full access including admin panel" },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Change Role</Text>
          {user && <Text style={styles.sheetSub}>{user.fullName}</Text>}
          <View style={{ gap: 8, marginTop: 8 }}>
            {ROLE_OPTIONS.map((opt) => {
              const isActive = user?.role === opt.role;
              return (
                <TouchableOpacity
                  key={opt.role}
                  style={[styles.roleOption, isActive && styles.roleOptionActive]}
                  onPress={() => onSelect(opt.role)}
                  disabled={updating || isActive}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleOptionEmoji}>{opt.emoji}</Text>
                  <View style={styles.roleOptionText}>
                    <Text style={[styles.roleOptionLabel, isActive && styles.roleOptionLabelActive]}>{opt.label}</Text>
                    <Text style={styles.roleOptionDesc}>{opt.desc}</Text>
                  </View>
                  {isActive && <Text style={{ color: C.primary, fontSize: 16, fontWeight: "700" }}>✓</Text>}
                  {updating && !isActive && <ActivityIndicator size="small" color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function UserDetailModal({
  visible,
  user,
  onClose,
  onRolePress,
  onAssignPress,
  onBlockPress,
  blocking,
  styles,
  C,
}: {
  visible: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onRolePress: () => void;
  onAssignPress?: () => void;
  onBlockPress: () => void;
  blocking: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
}) {
  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const ROLE_COLOR: Record<string, string> = { student: "#6366F1", teacher: "#0EA5E9", admin: "#EF4444" };
  const roleColor = ROLE_COLOR[user.role] ?? "#94A3B8";
  const joined = new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {/* Avatar + name */}
          <View style={styles.detailHeader}>
            <View style={[styles.detailAvatar, user.blocked && { opacity: 0.5 }]}>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.detailAvatarImg} />
              ) : (
                <Text style={styles.detailAvatarText}>{initials}</Text>
              )}
            </View>
            <Text style={styles.detailName}>{user.fullName}</Text>
            <Text style={styles.detailEmail}>{user.email}</Text>
            <View style={[styles.statusBadge, { backgroundColor: user.blocked ? "#FEE2E2" : "#DCFCE7" }]}>
              <Text style={[styles.statusText, { color: user.blocked ? "#991B1B" : "#166534" }]}>
                {user.blocked ? "🚫 Blocked" : "✓ Active"}
              </Text>
            </View>
          </View>

          {/* Info rows */}
          <View style={styles.detailInfoCard}>
            <DetailRow label="Role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} valueColor={roleColor} />
            <View style={styles.detailDivider} />
            <DetailRow label="Department" value={user.department || "—"} />
            {user.semester ? (
              <>
                <View style={styles.detailDivider} />
                <DetailRow label="Semester" value={`Semester ${user.semester}`} />
              </>
            ) : null}
            {user.section ? (
              <>
                <View style={styles.detailDivider} />
                <DetailRow label="Section" value={user.section} />
              </>
            ) : null}
            <View style={styles.detailDivider} />
            <DetailRow label="Joined" value={joined} />
          </View>

          {/* Actions */}
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.detailActionBtn} onPress={onRolePress} activeOpacity={0.8}>
              <Text style={styles.detailActionText}>✎ Change Role</Text>
            </TouchableOpacity>
            {onAssignPress && (
              <TouchableOpacity style={styles.detailActionBtn} onPress={onAssignPress} activeOpacity={0.8}>
                <Text style={styles.detailActionText}>
                  {user.role === "student" ? "＋ Assign Profile" : "＋ Assign Courses"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.blockBtn, user.blocked && styles.unblockBtn]}
            onPress={onBlockPress}
            disabled={blocking}
            activeOpacity={0.85}
          >
            {blocking ? (
              <ActivityIndicator color={user.blocked ? C.primary : "#EF4444"} size="small" />
            ) : (
              <Text style={[styles.blockBtnText, user.blocked && { color: C.primary }]}>
                {user.blocked ? "✓  Unblock User" : "🚫  Block User"}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 }}>
      <Text style={{ flex: 1, fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: valueColor ?? "#1E293B" }}>{value}</Text>
    </View>
  );
}

const DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Accounting & Finance",
  "Mass Communication",
  "Psychology",
  "Mathematics",
];

type Course = { _id: string; title: string; code: string; semester?: string };

function AssignCoursesModal({
  visible,
  user,
  token,
  onAssign,
  onClose,
  assigning,
  styles,
  C,
}: {
  visible: boolean;
  user: AdminUser | null;
  token: string;
  onAssign: (department: string, courseIds: string[]) => Promise<void>;
  onClose: () => void;
  assigning: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
}) {
  const [step, setStep] = useState<"dept" | "courses">("dept");
  const [department, setDepartment] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCourses, setLoadingCourses] = useState(false);

  const reset = () => {
    setStep("dept");
    setDepartment("");
    setCourses([]);
    setSelected(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDeptSelect = async (dept: string) => {
    setDepartment(dept);
    setLoadingCourses(true);
    setStep("courses");
    try {
      const res = await fetch(`${BASE_URL}/courses?department=${encodeURIComponent(dept)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch {
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleConfirm = async () => {
    await onAssign(department, Array.from(selected));
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.assignSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            {step === "courses" && (
              <TouchableOpacity onPress={() => setStep("dept")} style={{ marginRight: 10 }}>
                <Text style={{ fontSize: 20, color: C.primary }}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sheetTitle}>{step === "dept" ? "Select Department" : "Select Courses"}</Text>
          </View>
          {user && (
            <Text style={styles.sheetSub}>
              {user.fullName}
              {step === "courses" ? ` · ${department}` : ""}
            </Text>
          )}

          {step === "dept" ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.roleOption, department === dept && styles.roleOptionActive]}
                  onPress={() => handleDeptSelect(dept)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleOptionLabel, department === dept && styles.roleOptionLabelActive]}>{dept}</Text>
                  {department === dept && <Text style={{ color: C.primary, fontSize: 16, fontWeight: "700" }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : loadingCourses ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : courses.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 32 }}>📚</Text>
              <Text style={[styles.roleOptionDesc, { textAlign: "center" }]}>No courses found for this department.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {courses.map((c) => {
                const checked = selected.has(c._id);
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.roleOption, { marginBottom: 6 }, checked && styles.roleOptionActive]}
                    onPress={() => toggle(c._id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionText}>
                      <Text style={[styles.roleOptionLabel, checked && styles.roleOptionLabelActive]}>{c.code}</Text>
                      <Text style={styles.roleOptionDesc}>
                        {c.title}
                        {c.semester ? ` · Sem ${c.semester}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.assignCheck, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
                      {checked && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {step === "courses" && (
            <TouchableOpacity
              style={[styles.assignConfirmBtn, assigning && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={assigning}
              activeOpacity={0.85}
            >
              {assigning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.assignConfirmText}>
                  Assign{selected.size > 0 ? ` (${selected.size} course${selected.size > 1 ? "s" : ""})` : " Department Only"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AssignSuccessModal({
  visible,
  data,
  onClose,
  styles,
  C,
}: {
  visible: boolean;
  data: { name: string; dept: string; semester?: string; section?: string; courseCount: number } | null;
  onClose: () => void;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
}) {
  if (!data) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: 32 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 30 }}>✓</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.textPrimary }}>Profile Assigned!</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>{data.name}</Text>
          </View>

          <View style={[styles.detailInfoCard, { marginBottom: 20 }]}>
            <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={{ flex: 1, fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>Department</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.textPrimary }}>{data.dept}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={{ flex: 1, fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>Semester</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.textPrimary }}>Semester {data.semester}</Text>
            </View>
            {data.section ? (
              <>
                <View style={styles.detailDivider} />
                <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11 }}>
                  <Text style={{ flex: 1, fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>Section</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.textPrimary }}>Section {data.section}</Text>
                </View>
              </>
            ) : null}
            <View style={styles.detailDivider} />
            <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={{ flex: 1, fontSize: 13, color: "#94A3B8", fontWeight: "600" }}>Courses Enrolled</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.textPrimary }}>
                {data.courseCount > 0 ? `${data.courseCount} course${data.courseCount > 1 ? "s" : ""}` : "None"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.assignConfirmBtn]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.assignConfirmText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS  = ["A", "B", "C", "D"];

function AssignStudentModal({
  visible,
  user,
  token,
  onAssign,
  onClose,
  assigning,
  styles,
  C,
}: {
  visible: boolean;
  user: AdminUser | null;
  token: string;
  onAssign: (department: string, semester: string, section: string, courseIds: string[]) => Promise<void>;
  onClose: () => void;
  assigning: boolean;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
}) {
  const { departments, fetchDepartments } = useAdminStore();

  const [step, setStep]           = useState<"dept" | "info" | "courses">("dept");
  const [department, setDepartment] = useState("");
  const [semester, setSemester]   = useState("");
  const [section, setSection]     = useState("");
  const [courses, setCourses]     = useState<Course[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (visible && departments.length === 0 && token) {
      fetchDepartments(token);
    }
  }, [visible]);

  const reset = () => {
    setStep("dept"); setDepartment(""); setSemester(""); setSection("");
    setCourses([]); setSelected(new Set());
  };

  const handleClose = () => { reset(); onClose(); };

  const handleDeptSelect = (dept: string) => {
    setDepartment(dept);
    setStep("info");
  };

  const handleInfoNext = async () => {
    if (!semester) return;
    setStep("courses");
    setLoadingCourses(true);
    try {
      const res = await fetch(
        `${BASE_URL}/courses?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch {
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleConfirm = async () => {
    await onAssign(department, semester, section, Array.from(selected));
    reset();
  };

  const stepTitle = step === "dept" ? "Select Department" : step === "info" ? "Semester & Section" : "Select Courses";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.assignSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            {step !== "dept" && (
              <TouchableOpacity
                onPress={() => setStep(step === "courses" ? "info" : "dept")}
                style={{ marginRight: 10 }}
              >
                <Text style={{ fontSize: 20, color: C.primary }}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sheetTitle}>{stepTitle}</Text>
          </View>
          {user && (
            <Text style={styles.sheetSub}>
              {user.fullName}
              {step !== "dept" ? ` · ${department}` : ""}
              {step === "courses" ? ` · Sem ${semester}${section ? ` · ${section}` : ""}` : ""}
            </Text>
          )}

          {step === "dept" ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {departments.map((d) => (
                <TouchableOpacity
                  key={d._id}
                  style={[styles.roleOption, { marginBottom: 6 }, department === d.name && styles.roleOptionActive]}
                  onPress={() => handleDeptSelect(d.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleOptionLabel, department === d.name && styles.roleOptionLabelActive]}>{d.name}</Text>
                  {department === d.name && <Text style={{ color: C.primary, fontSize: 16, fontWeight: "700" }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : step === "info" ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              <Text style={[styles.roleOptionDesc, { fontWeight: "700", marginBottom: 8, color: C.textPrimary }]}>Semester *</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {SEMESTERS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.assignCheck,
                      { width: "auto", height: 38, borderRadius: 10, paddingHorizontal: 16, borderColor: semester === s ? C.primary : undefined },
                      semester === s && { backgroundColor: C.primary },
                    ]}
                    onPress={() => setSemester(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: semester === s ? "#fff" : C.textSecondary }}>
                      Sem {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.roleOptionDesc, { fontWeight: "700", marginBottom: 8, color: C.textPrimary }]}>Section (optional)</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {SECTIONS.map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.assignCheck,
                      { width: 48, height: 48, borderRadius: 12, borderColor: section === sec ? C.primary : undefined },
                      section === sec && { backgroundColor: C.primary },
                    ]}
                    onPress={() => setSection((prev) => (prev === sec ? "" : sec))}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: section === sec ? "#fff" : C.textSecondary }}>{sec}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.assignConfirmBtn, !semester && { opacity: 0.4 }]}
                onPress={handleInfoNext}
                disabled={!semester}
                activeOpacity={0.85}
              >
                <Text style={styles.assignConfirmText}>Next: Select Courses →</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : loadingCourses ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : courses.length === 0 ? (
            <>
              <View style={{ paddingVertical: 32, alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 32 }}>📚</Text>
                <Text style={[styles.roleOptionDesc, { textAlign: "center" }]}>No courses found for Semester {semester}.</Text>
              </View>
              <TouchableOpacity
                style={[styles.assignConfirmBtn, assigning && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={assigning}
                activeOpacity={0.85}
              >
                {assigning
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.assignConfirmText}>Assign Without Courses</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
                {courses.map((c) => {
                  const checked = selected.has(c._id);
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.roleOption, { marginBottom: 6 }, checked && styles.roleOptionActive]}
                      onPress={() => toggle(c._id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.roleOptionText}>
                        <Text style={[styles.roleOptionLabel, checked && styles.roleOptionLabelActive]}>{c.code}</Text>
                        <Text style={styles.roleOptionDesc}>{c.title}{c.semester ? ` · Sem ${c.semester}` : ""}</Text>
                      </View>
                      <View style={[styles.assignCheck, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
                        {checked && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.assignConfirmBtn, { marginTop: 16 }, assigning && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={assigning}
                activeOpacity={0.85}
              >
                {assigning
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.assignConfirmText}>
                      Assign{selected.size > 0 ? ` (${selected.size} course${selected.size > 1 ? "s" : ""})` : " Without Courses"}
                    </Text>}
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette, _isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary },
    headerSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },

    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      margin: 12,
      paddingHorizontal: 14,
      backgroundColor: C.card,
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 14,
      height: 46,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
    clearBtn: { fontSize: 14, color: C.placeholder },

    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    filterBtn: {
      flex: 1,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
    },
    filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterBtnText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    filterBtnTextActive: { color: C.white },

    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 15, color: C.textSecondary, fontWeight: "500" },

    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 10,
      padding: 14,
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarImg: { width: 46, height: 46, borderRadius: 23 },
    avatarText: { fontSize: 16, fontWeight: "800", color: C.white },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    userEmail: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    userMeta: { fontSize: 11, color: C.placeholder, marginTop: 2 },

    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    rolePillText: { fontSize: 12, fontWeight: "700" },
    rolePillEdit: { fontSize: 11 },

    // Sheet modal
    backdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
    sheetSub: { fontSize: 13, color: C.textSecondary, marginTop: 4, marginBottom: 4 },

    roleOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: C.bg,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    roleOptionActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
    roleOptionEmoji: { fontSize: 22 },
    roleOptionText: { flex: 1 },
    roleOptionLabel: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    roleOptionLabelActive: { color: C.primary },
    roleOptionDesc: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

    // Blocked card state
    cardBlocked: { borderColor: "#FECACA", backgroundColor: "#FFF5F5" },
    blockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FEE2E2",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#FECACA",
    },
    blockedBannerText: { fontSize: 12, fontWeight: "700", color: "#991B1B" },

    // Card action buttons row
    cardActions: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    cardActionBtn: {
      flex: 1,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardActionText: { fontSize: 12, fontWeight: "700", color: C.textSecondary },

    // User detail modal
    detailHeader: { alignItems: "center", paddingTop: 8, paddingBottom: 16, gap: 6 },
    detailAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    detailAvatarImg: { width: 72, height: 72, borderRadius: 36 },
    detailAvatarText: { fontSize: 26, fontWeight: "800", color: C.white },
    detailName: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
    detailEmail: { fontSize: 13, color: C.textSecondary },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
    statusText: { fontSize: 12, fontWeight: "700" },

    detailInfoCard: {
      backgroundColor: C.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
      marginBottom: 12,
    },
    detailDivider: { height: 1, backgroundColor: C.border, marginLeft: 14 },

    detailActions: { flexDirection: "row", gap: 10, marginBottom: 10 },
    detailActionBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    detailActionText: { fontSize: 13, fontWeight: "700", color: C.textPrimary },

    blockBtn: {
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FEE2E2",
      borderWidth: 1,
      borderColor: "#FECACA",
      marginBottom: 4,
    },
    unblockBtn: { backgroundColor: C.primaryLight, borderColor: C.primary },
    blockBtnText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },

    // Assign button on teacher card (kept for potential direct use)
    assignBtn: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: 10,
      alignItems: "center",
    },
    assignBtnText: { fontSize: 13, fontWeight: "700", color: "#0EA5E9" },

    // Assign courses modal sheet
    assignSheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 40,
      maxHeight: "80%",
    },
    assignCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    assignConfirmBtn: {
      marginTop: 16,
      height: 50,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    assignConfirmText: { fontSize: 15, fontWeight: "700", color: C.white },
  });
}

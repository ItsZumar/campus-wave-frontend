import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getSocket } from "@/services/socket";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { type Announcement, useAnnouncementsStore } from "@/store/announcements";
import { useChatUnreadStore } from "@/store/chatUnread";
import { type AppNotification, useNotificationsStore } from "@/store/notifications";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const firstName = user?.fullName?.split(" ")[0] ?? "Profile";
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const { fetch: fetchNotifications, addNotification } = useNotificationsStore();
  const { addNew: addNewAnnouncement, unread: unreadAnnouncements } = useAnnouncementsStore();
  const { increment: incrementUnread } = useChatUnreadStore();
  const { pendingCount, fetchLeaveRequests } = useAdminStore();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token) return;

    fetchNotifications();
    if (isAdmin) fetchLeaveRequests(token);

    const socket = getSocket(token);
    const MESSAGE_TYPES = new Set(["message", "dm", "reply"]);

    const onNewNotification = (notif: AppNotification) => {
      const groupId = notif.data?.groupId;
      const { activeGroupId } = useChatUnreadStore.getState();

      // User is currently viewing this chat — message is already visible, skip entirely
      if (groupId && groupId === activeGroupId) return;

      if (MESSAGE_TYPES.has(notif.type) && AppState.currentState === "active") {
        if (groupId) incrementUnread(groupId);
      } else {
        addNotification(notif);
      }
    };

    const onNewAnnouncement = ({ announcement }: { announcement: Announcement }) => {
      addNewAnnouncement(announcement);
    };

    socket.on("newNotification", onNewNotification);
    socket.on("newAnnouncement", onNewAnnouncement);
    return () => {
      socket.off("newNotification", onNewNotification);
      socket.off("newAnnouncement", onNewAnnouncement);
    };
  }, [token]);

  const sharedScreenOptions = {
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarActiveTintColor: C.primary,
    tabBarInactiveTintColor: C.textSecondary,
    tabBarStyle: {
      backgroundColor: C.card,
      borderTopColor: C.border,
      borderTopWidth: 1,
      paddingTop: 6,
      height: 50 + bottom,
      paddingBottom: bottom,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  } as const;

  const profileIcon = ({ color, focused }: { color: string; focused: boolean }) =>
    user?.profileImage ? (
      <View style={{ width: 26, height: 26, borderRadius: 13, overflow: "hidden", borderWidth: focused ? 2 : 1, borderColor: focused ? C.primary : C.border }}>
        <Image source={{ uri: user.profileImage }} style={{ width: "100%", height: "100%" }} />
      </View>
    ) : (
      <IconSymbol size={24} name="person.crop.circle.fill" color={color} />
    );

  if (isAdmin) {
    return (
      <Tabs screenOptions={sharedScreenOptions}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Chats",
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: "Requests",
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="shield.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="announcements"
          options={{
            title: "Board",
            tabBarBadge: unreadAnnouncements > 0 ? unreadAnnouncements : undefined,
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="megaphone.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: firstName, tabBarIcon: profileIcon }}
        />
        {/* hidden — required by Expo Router since these files exist in (tabs)/ */}
        <Tabs.Screen name="groups"     options={{ href: null }} />
        <Tabs.Screen name="management" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={sharedScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "Board",
          tabBarBadge: unreadAnnouncements > 0 ? unreadAnnouncements : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="megaphone.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: firstName, tabBarIcon: profileIcon }}
      />
      {/* hidden — required by Expo Router since these files exist in (tabs)/ */}
      <Tabs.Screen name="dashboard"  options={{ href: null }} />
      <Tabs.Screen name="admin"      options={{ href: null }} />
      <Tabs.Screen name="management" options={{ href: null }} />
    </Tabs>
  );
}

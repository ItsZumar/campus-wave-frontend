import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getSocket } from "@/services/socket";
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

  useEffect(() => {
    if (!token) return;

    fetchNotifications();

    const socket = getSocket(token);

    const MESSAGE_TYPES = new Set(["message", "dm", "reply"]);

    const onNewNotification = (notif: AppNotification) => {
      if (MESSAGE_TYPES.has(notif.type) && AppState.currentState === "active") {
        // App is open — show badge on the chat row, not in Alerts tab
        const groupId = notif.data?.groupId;
        if (groupId) incrementUnread(groupId);
      } else {
        // App was backgrounded when the socket event arrived, or it's a system notif
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

  return (
    <Tabs
      screenOptions={{
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
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
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: firstName,
          tabBarIcon: ({ color, focused }) =>
            user?.profileImage ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, overflow: "hidden", borderWidth: focused ? 2 : 1, borderColor: focused ? C.primary : C.border }}>
                <Image source={{ uri: user.profileImage }} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              <IconSymbol size={24} name="person.crop.circle.fill" color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

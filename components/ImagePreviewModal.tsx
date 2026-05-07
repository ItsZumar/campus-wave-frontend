import { Image, Modal, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  uri: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ uri, onClose }: Props) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {uri && (
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        )}
        <SafeAreaView style={styles.closeWrap} edges={["top"]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  image:    { width: "100%", height: "100%" },
  closeWrap: { position: "absolute", top: 0, right: 20 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});

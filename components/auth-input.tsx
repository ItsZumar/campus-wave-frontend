import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { memo, useMemo } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  error?: string | null;
  secureTextEntry?: boolean;
  togglePassword?: () => void;
  passwordVisible?: boolean;
  keyboardType?: any;
};

function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  focused,
  onFocus,
  onBlur,
  error,
  secureTextEntry,
  togglePassword,
  passwordVisible,
  keyboardType,
}: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, focused && styles.inputFocused, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />

        {togglePassword && (
          <TouchableOpacity style={styles.eyeBtn} onPress={togglePassword}>
            <Text style={styles.eyeText}>{passwordVisible ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export default memo(AuthInput);

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    field: {
      gap: 6,
    },

    label: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textSecondary,
      textTransform: "uppercase",
    },

    inputWrap: {
      position: "relative",
    },

    input: {
      height: 50,
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: C.textPrimary,
      backgroundColor: C.inputBg,
    },

    inputFocused: {
      borderColor: C.borderFocus,
      backgroundColor: C.white,
    },

    inputError: {
      borderColor: C.error,
    },

    eyeBtn: {
      position: "absolute",
      right: 16,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },

    eyeText: {
      color: C.primary,
      fontWeight: "700",
    },

    error: {
      fontSize: 12,
      color: C.error,
    },
  });
}

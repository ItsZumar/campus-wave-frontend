import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo, useState } from "react";
import {
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AuthInputProps {
  label: string;
  labelRight?: React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  secureTextEntry?: boolean;
  error?: boolean;
  hint?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

export function AuthInput({
  label,
  labelRight,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "none",
  autoCorrect = false,
  returnKeyType,
  onSubmitEditing,
  secureTextEntry,
  error,
  hint,
  maxLength,
  autoFocus,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <View>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            error && styles.inputError,
            secureTextEntry && styles.inputWithToggle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry && !passwordVisible}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.eyeLabel}>{passwordVisible ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    field: { gap: 6 },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textSecondary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
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
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    inputError: { borderColor: C.error },
    inputWithToggle: { paddingRight: 68 },
    eyeBtn: {
      position: "absolute",
      right: 16,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    eyeLabel: { fontSize: 12, fontWeight: "700", color: C.primary, letterSpacing: 0.3 },
    hint: { fontSize: 12, color: C.error, marginTop: 2 },
  });
}

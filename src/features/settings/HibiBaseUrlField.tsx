import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Field, Meta, SerifText } from "../../ui";
import { DEFAULT_HIBI_BASE_URL, getHibiBaseUrl, setHibiBaseUrl } from "../mining";

// Where the SDK should POST requests. Defaults to the production URL
// in DEFAULT_HIBI_BASE_URL; override here for staging / dev tunnels.

export function HibiBaseUrlField() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHibiBaseUrl()
      .then(setValue)
      .catch((err) => console.warn("[settings] getHibiBaseUrl failed", err));
  }, []);

  const onSave = async () => {
    setError(null);
    try {
      await setHibiBaseUrl(value || DEFAULT_HIBI_BASE_URL);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <View style={styles.wrap}>
      <Field
        value={value}
        onChangeText={(v) => {
          setValue(v);
          if (status === "saved") setStatus("idle");
        }}
        placeholder={DEFAULT_HIBI_BASE_URL}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.actionsRow}>
        <Pressable onPress={onSave} hitSlop={6}>
          <Meta style={styles.action}>Save</Meta>
        </Pressable>
      </View>
      {status === "saved" ? <Meta style={styles.ok}>Saved.</Meta> : null}
      {error ? (
        <SerifText soft italic>
          {error}
        </SerifText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: theme.space.s2 },
  actionsRow: {
    flexDirection: "row",
    gap: theme.space.s4,
    paddingTop: theme.space.s2,
  },
  action: { color: theme.colors.accent },
  ok: { color: theme.colors.inkSoft },
}));

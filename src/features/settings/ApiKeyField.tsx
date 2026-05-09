import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Field, Meta, SerifText } from "../../ui";
import { clearApiKey, getApiKey, setApiKey } from "../mining";

// Masked input for the OpenRouter API key. Stored in expo-secure-store,
// not in the prefs SQLite table — see src/features/mining/apiKey.ts.

type Status = "idle" | "loaded" | "saving" | "saved" | "error";

export function ApiKeyField() {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [hasStored, setHasStored] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApiKey()
      .then((stored) => {
        if (stored) {
          setValue(stored);
          setHasStored(true);
        }
        setStatus("loaded");
      })
      .catch((err) => {
        console.error("[mining] ApiKeyField getApiKey failed", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  const onSave = async () => {
    setStatus("saving");
    setError(null);
    try {
      await setApiKey(value);
      setHasStored(value.trim().length > 0);
      setStatus("saved");
    } catch (err) {
      console.error("[mining] ApiKeyField setApiKey failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const onClear = async () => {
    setStatus("saving");
    try {
      await clearApiKey();
      setValue("");
      setHasStored(false);
      setStatus("saved");
    } catch (err) {
      console.error("[mining] ApiKeyField clearApiKey failed", err);
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
          if (status === "saved") setStatus("loaded");
        }}
        placeholder="sk-or-v1-…"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!reveal}
      />
      <View style={styles.actionsRow}>
        <Pressable onPress={() => setReveal((v) => !v)} hitSlop={6}>
          <Meta style={styles.action}>{reveal ? "Hide" : "Show"}</Meta>
        </Pressable>
        <Pressable onPress={onSave} hitSlop={6} disabled={status === "saving"}>
          <Meta style={styles.action}>{status === "saving" ? "Saving…" : "Save"}</Meta>
        </Pressable>
        {hasStored ? (
          <Pressable onPress={onClear} hitSlop={6} disabled={status === "saving"}>
            <Meta style={styles.action}>Clear</Meta>
          </Pressable>
        ) : null}
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
  wrap: {
    gap: theme.space.s2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.space.s4,
    paddingTop: theme.space.s2,
  },
  action: {
    color: theme.colors.accent,
  },
  ok: {
    color: theme.colors.inkSoft,
  },
}));

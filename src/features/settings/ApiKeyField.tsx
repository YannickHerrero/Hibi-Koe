import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Field, Meta, SerifText } from "../../ui";

// Masked input for any secure-store-backed API key. Caller supplies the
// accessor — this component is intentionally agnostic about which key
// it's editing.

type Status = "idle" | "loaded" | "saving" | "saved" | "error";

export type ApiKeyAccessor = {
  get: () => Promise<string | null>;
  set: (value: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type ApiKeyFieldProps = {
  accessor: ApiKeyAccessor;
  placeholder?: string;
};

export function ApiKeyField({ accessor, placeholder = "sk-…" }: ApiKeyFieldProps) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [hasStored, setHasStored] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accessor
      .get()
      .then((stored) => {
        if (stored) {
          setValue(stored);
          setHasStored(true);
        }
        setStatus("loaded");
      })
      .catch((err) => {
        console.error("[mining] ApiKeyField get failed", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, [accessor]);

  const onSave = async () => {
    setStatus("saving");
    setError(null);
    try {
      await accessor.set(value);
      setHasStored(value.trim().length > 0);
      setStatus("saved");
    } catch (err) {
      console.error("[mining] ApiKeyField set failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const onClear = async () => {
    setStatus("saving");
    try {
      await accessor.clear();
      setValue("");
      setHasStored(false);
      setStatus("saved");
    } catch (err) {
      console.error("[mining] ApiKeyField clear failed", err);
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
        placeholder={placeholder}
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

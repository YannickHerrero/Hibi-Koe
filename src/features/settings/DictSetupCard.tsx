import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta, SerifText } from "../../ui";
import { dictsAvailable, type InstallProgress, installDictionaries } from "../mining";

type Phase = "idle" | "running" | "ready" | "error";

function formatProgress(p: InstallProgress | null): string {
  if (!p) return "Idle.";
  switch (p.stage) {
    case "fetching-release":
      return "Fetching release manifest…";
    case "downloading-jmdict":
      return p.total
        ? `Downloading JMdict… ${formatBytes(p.current ?? 0)} / ${formatBytes(p.total)}`
        : "Downloading JMdict…";
    case "decompressing-jmdict":
      return "Decompressing JMdict… (this can take ~10s)";
    case "parsing-jmdict":
      return "Parsing JMdict JSON… (this can take ~10s)";
    case "processing-jmdict":
      return p.total
        ? `Indexing JMdict… ${(p.current ?? 0).toLocaleString()} / ${p.total.toLocaleString()}`
        : "Indexing JMdict…";
    case "saving-jmdict":
      return "Saving JMdict bundle…";
    case "downloading-jmnedict":
      return p.total
        ? `Downloading JMnedict… ${formatBytes(p.current ?? 0)} / ${formatBytes(p.total)}`
        : "Downloading JMnedict…";
    case "decompressing-jmnedict":
      return "Decompressing JMnedict… (this can take ~10s)";
    case "parsing-jmnedict":
      return "Parsing JMnedict JSON… (this can take ~15s)";
    case "processing-jmnedict":
      return p.total
        ? `Indexing JMnedict… ${(p.current ?? 0).toLocaleString()} / ${p.total.toLocaleString()}`
        : "Indexing JMnedict…";
    case "saving-jmnedict":
      return "Saving JMnedict bundle…";
    case "done":
      return "Done.";
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DictSetupCard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dictsAvailable()) setPhase("ready");
  }, []);

  const onInstall = async () => {
    setPhase("running");
    setError(null);
    try {
      await installDictionaries((p) => setProgress(p));
      setPhase("ready");
    } catch (err) {
      console.error("[mining] installDictionaries failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const buttonLabel = (() => {
    if (phase === "running") return "Installing…";
    if (phase === "ready") return "Reinstall";
    if (phase === "error") return "Retry";
    return "Set up dictionaries";
  })();

  return (
    <View style={styles.wrap}>
      <SerifText soft>
        {phase === "ready"
          ? "JMdict and JMnedict are installed and ready for mining."
          : phase === "running"
            ? formatProgress(progress)
            : "Download the latest jmdict-simplified release. Approx 30–80 MB; takes 30–60 seconds on a decent connection."}
      </SerifText>
      <Pressable
        onPress={onInstall}
        hitSlop={6}
        disabled={phase === "running"}
        style={styles.action}
      >
        <Meta style={styles.actionLabel}>{buttonLabel}</Meta>
      </Pressable>
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
  action: {
    alignSelf: "flex-start",
    paddingVertical: theme.space.s2,
    paddingHorizontal: theme.space.s3,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  actionLabel: {
    color: theme.colors.ink,
  },
}));

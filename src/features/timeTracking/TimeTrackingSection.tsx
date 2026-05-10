import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Meta, Rule, SerifText } from "../../ui";
import { syncAllPendingSessions } from "./sync";
import { useTodayTotals } from "./useTodayTotals";

function formatHMS(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TimeTrackingSection() {
  const { totals, error, refresh } = useTodayTotals();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setStatus("Syncing…");
    try {
      const res = await syncAllPendingSessions();
      setStatus(
        res.failed > 0 ? `${res.ok} synced, ${res.failed} failed` : `${res.ok} synced`,
      );
      await refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Meta>Today</Meta>
        <SerifText>{totals ? formatHMS(totals.todayMs) : "—"}</SerifText>
      </View>
      <Rule variant="soft" />
      <View style={styles.row}>
        <Meta>Past 7 days</Meta>
        <SerifText>{totals ? formatHMS(totals.weekMs) : "—"}</SerifText>
      </View>
      {totals && totals.unsynced > 0 ? (
        <>
          <Rule variant="soft" />
          <View style={styles.syncRow}>
            <SerifText soft italic style={styles.pendingHint}>
              {totals.unsynced} {totals.unsynced === 1 ? "session" : "sessions"} pending
              upload.
            </SerifText>
            <Pressable onPress={onSync} hitSlop={6} disabled={syncing}>
              <Meta style={styles.action}>{syncing ? "…" : "Sync now"}</Meta>
            </Pressable>
          </View>
        </>
      ) : null}
      {status ? (
        <SerifText soft italic style={styles.status}>
          {status}
        </SerifText>
      ) : null}
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: theme.space.s2,
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.space.s2,
    gap: theme.space.s3,
  },
  pendingHint: { flex: 1 },
  action: { color: theme.colors.accent },
  status: { color: theme.colors.inkSoft, paddingTop: theme.space.s1 },
}));

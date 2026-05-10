import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { countUnsyncedListeningSessions, totalListeningMsBetween } from "../../db";

const MS_PER_DAY = 86_400_000;

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type TodayTotals = {
  todayMs: number;
  weekMs: number;
  unsynced: number;
};

export function useTodayTotals() {
  const [totals, setTotals] = useState<TodayTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const today = startOfTodayMs();
      const now = Date.now();
      const weekAgo = today - 6 * MS_PER_DAY;
      const [todayMs, weekMs, unsynced] = await Promise.all([
        totalListeningMsBetween(today, now),
        totalListeningMsBetween(weekAgo, now),
        countUnsyncedListeningSessions(),
      ]);
      setTotals({ todayMs, weekMs, unsynced });
      setError(null);
    } catch (err) {
      console.error("[time-tracking] useTodayTotals refresh failed", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { totals, error, refresh };
}

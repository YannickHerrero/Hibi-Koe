import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { listSavedWords, type SavedWord } from "../../db";

export function useSavedWords() {
  const [words, setWords] = useState<SavedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listSavedWords();
      setWords(next);
      setError(null);
    } catch (err) {
      console.error("[mining] listSavedWords failed", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { words, error, refresh };
}

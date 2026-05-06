import { useEffect, useState } from "react";
import type { CueIndex } from "./cueIndex";
import { loadSubtitleIndex } from "./loadSubtitles";

type State = {
  index: CueIndex | null;
  loading: boolean;
  error: string | null;
};

const empty: State = { index: null, loading: false, error: null };

export function useSubtitles(path: string | null | undefined): State {
  const [state, setState] = useState<State>(empty);

  useEffect(() => {
    if (!path) {
      setState(empty);
      return;
    }
    let cancelled = false;
    setState({ index: null, loading: true, error: null });

    loadSubtitleIndex(path)
      .then((index) => {
        if (!cancelled) setState({ index, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            index: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

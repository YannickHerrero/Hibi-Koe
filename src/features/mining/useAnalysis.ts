import { useEffect, useState } from "react";
import { readAnalysis } from "./analysisStore";
import type { AnalysisData } from "./types";

type State = {
  analysis: AnalysisData | null;
  loading: boolean;
  error: string | null;
};

const empty: State = { analysis: null, loading: false, error: null };

// Loads the per-track analysis blob from disk. Reactive: when trackId
// changes (e.g. random-mode kicks in a new track), we reload.
export function useAnalysis(trackId: string | null | undefined): State {
  const [state, setState] = useState<State>(empty);

  useEffect(() => {
    if (!trackId) {
      setState(empty);
      return;
    }
    let cancelled = false;
    setState({ analysis: null, loading: true, error: null });

    readAnalysis(trackId)
      .then((analysis) => {
        if (!cancelled) setState({ analysis, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            analysis: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return state;
}

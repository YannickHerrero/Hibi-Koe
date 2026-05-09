import { Component, type ReactNode } from "react";
import { ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Last-ditch error boundary so production crashes surface as on-screen
// text instead of an instant white screen. Catches render errors only;
// async errors / native crashes still need adb logcat.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    console.error("Render crash", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Hibi Koe crashed.</Text>
        <Text style={styles.body}>{error.message}</Text>
        {error.stack ? <Text style={styles.stack}>{error.stack}</Text> : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.paper,
    padding: theme.space.s5,
    paddingTop: theme.space.s8,
    gap: theme.space.s3,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    color: theme.colors.ink,
  },
  body: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    color: theme.colors.ink,
  },
  stack: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: theme.space.s3,
  },
}));

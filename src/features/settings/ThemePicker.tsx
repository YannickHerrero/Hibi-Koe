import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { palettes, type ThemeName, useThemeSwitcher } from "../../theme";

const LABELS: Record<ThemeName, string> = {
  paper: "Paper",
  stone: "Stone",
  sage: "Sage",
  clay: "Clay",
  ink: "Ink",
};

// Five-row picker: each row shows the palette as a tri-stripe swatch
// (paper / paperAlt / accent) plus the variant name. Active row is
// outlined in the accent.
export function ThemePicker() {
  const { theme, setTheme, available } = useThemeSwitcher();

  return (
    <View style={styles.list}>
      {available.map((name) => (
        <Row key={name} name={name} active={name === theme} onPress={() => setTheme(name)} />
      ))}
    </View>
  );
}

function Row({ name, active, onPress }: { name: ThemeName; active: boolean; onPress: () => void }) {
  rowStyles.useVariants({ active: active ? "yes" : "no" });
  const palette = palettes[name];

  return (
    <Pressable style={rowStyles.row} onPress={onPress}>
      <View style={rowStyles.swatch}>
        <View style={[rowStyles.stripe, { flex: 2, backgroundColor: palette.paper }]} />
        <View style={[rowStyles.stripe, { flex: 1, backgroundColor: palette.paperAlt }]} />
        <View style={[rowStyles.stripe, { flex: 1, backgroundColor: palette.accent }]} />
      </View>
      <Text style={rowStyles.label}>{LABELS[name]}</Text>
      <Text style={rowStyles.state}>{active ? "Active" : ""}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    gap: theme.space.s2,
  },
}));

const rowStyles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space.s3,
    paddingHorizontal: theme.space.s3,
    borderWidth: 1,
    gap: theme.space.s4,
    variants: {
      active: {
        yes: { borderColor: theme.colors.accent },
        no: { borderColor: theme.colors.ink },
      },
    },
  },
  swatch: {
    width: 80,
    height: 36,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  stripe: {
    height: "100%",
  },
  label: {
    flex: 1,
    fontFamily: theme.fonts.serifMedium,
    fontSize: 18,
    color: theme.colors.ink,
  },
  state: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.mono.sm,
    letterSpacing: theme.typography.mono.sm * theme.tracking.mono,
    textTransform: "uppercase",
    color: theme.colors.accent,
  },
}));

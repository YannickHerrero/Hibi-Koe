import { router } from "expo-router";
import { Alert, FlatList, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { deleteSavedWord, type SavedWord } from "../src/db";
import { useSavedWords } from "../src/features/mining";
import { Display, Label, Meta, Rule, SafeAreaView, SerifText } from "../src/ui";

export default function VocabScreen() {
  const { words, error, refresh } = useSavedWords();
  const isEmpty = words !== null && words.length === 0;

  const onLongPress = (w: SavedWord) => {
    Alert.alert("Delete entry", `Remove "${w.surface}" from your vocabulary?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSavedWord(w.id);
            refresh();
          } catch (err) {
            console.error("[vocab] deleteSavedWord failed", err);
            Alert.alert("Delete failed", err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Meta>Close</Meta>
        </Pressable>
        <Meta>Vocabulary</Meta>
      </View>
      <Rule variant="solid" />
      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Display size="lg">Mined.</Display>
          <Label num="№ 01">{words ? `${words.length} entries` : "Loading…"}</Label>
        </View>
        <Rule variant="soft" style={styles.rule} />

        {error ? (
          <SerifText soft italic>
            {error}
          </SerifText>
        ) : null}

        {isEmpty ? (
          <SerifText soft italic style={styles.empty}>
            Tap a token in the mining sheet, then ★ Save in the dictionary popup to start your
            vocabulary list.
          </SerifText>
        ) : (
          <FlatList
            data={words ?? []}
            keyExtractor={(w) => w.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/vocab/${item.id}` as never)}
                onLongPress={() => onLongPress(item)}
              >
                <View style={styles.rowText}>
                  <SerifText size={18}>{item.surface}</SerifText>
                  {item.reading && item.reading !== item.surface ? (
                    <Meta style={styles.reading}>{item.reading}</Meta>
                  ) : null}
                  <SerifText soft numberOfLines={2} style={styles.gloss}>
                    {item.glosses.slice(0, 3).join("; ")}
                  </SerifText>
                </View>
              </Pressable>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.s5,
    paddingVertical: theme.space.s4,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.s5,
    paddingTop: theme.space.s5,
    gap: theme.space.s3,
  },
  titleBlock: {
    gap: theme.space.s2,
  },
  rule: {
    marginVertical: theme.space.s2,
  },
  empty: {
    paddingTop: theme.space.s5,
    maxWidth: 320,
  },
  list: {
    paddingBottom: theme.space.s8,
  },
  row: {
    paddingVertical: theme.space.s3,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ruleSoft,
  },
  rowText: {
    gap: 2,
  },
  reading: {
    color: theme.colors.inkSoft,
  },
  gloss: {
    marginTop: theme.space.s1,
  },
}));

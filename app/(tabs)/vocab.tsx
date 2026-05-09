import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { Alert, FlatList, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { deleteSavedWord, listSavedWords, type SavedWord } from "../../src/db";
import { useSavedWords } from "../../src/features/mining";
import { Display, Label, Meta, Rule, SafeAreaView, SerifText } from "../../src/ui";

export default function VocabScreen() {
  const { words, error, refresh } = useSavedWords();
  const isEmpty = words !== null && words.length === 0;

  const onExport = async () => {
    try {
      const all = await listSavedWords();
      if (all.length === 0) {
        Alert.alert("Nothing to export", "Save some entries first.");
        return;
      }
      const file = new File(Paths.cache, `hibi-koe-vocab-${Date.now()}.json`);
      file.write(JSON.stringify(all, null, 2));
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Export ready", `Saved to ${file.uri}`);
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export Hibi Koe vocabulary",
      });
    } catch (err) {
      console.error("[vocab] export failed", err);
      Alert.alert("Export failed", err instanceof Error ? err.message : String(err));
    }
  };

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
        <Meta>Vocabulary</Meta>
        <Pressable onPress={onExport} hitSlop={6}>
          <Meta style={styles.exportLabel}>Export JSON</Meta>
        </Pressable>
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
  exportLabel: {
    color: theme.colors.accent,
  },
}));

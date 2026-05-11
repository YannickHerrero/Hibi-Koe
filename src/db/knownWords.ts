// Local mirror of /v1/known-words. Single source of truth lives on the
// server; this table is rebuilt by refreshKnownWords() and queried in
// the read path that paints the reader underline.

import { getDb } from "./client";

export type WordStatus = "learning" | "known" | "ignored";
export type WordStatusSource = "manual" | "srs";

export type KnownWord = {
  lemma: string;
  reading: string;
  status: WordStatus;
  source: WordStatusSource;
  cardId: string | null;
  intervalDays: number | null;
  updatedAt: number;
};

type Row = {
  lemma: string;
  reading: string;
  status: WordStatus;
  source: WordStatusSource;
  card_id: string | null;
  interval_days: number | null;
  updated_at: number;
};

function fromRow(row: Row): KnownWord {
  return {
    lemma: row.lemma,
    reading: row.reading,
    status: row.status,
    source: row.source,
    cardId: row.card_id,
    intervalDays: row.interval_days,
    updatedAt: row.updated_at,
  };
}

export async function listKnownWords(): Promise<KnownWord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM known_words;");
  return rows.map(fromRow);
}

export async function getKnownWord(
  lemma: string,
  reading: string,
): Promise<KnownWord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    "SELECT * FROM known_words WHERE lemma = ? AND reading = ? LIMIT 1;",
    lemma,
    reading,
  );
  return row ? fromRow(row) : null;
}

// Replace the entire table contents. Used by the periodic refresh
// pulling /v1/known-words; the server is authoritative.
export async function replaceAllKnownWords(rows: KnownWord[]): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM known_words;");
    if (rows.length === 0) return;
    for (const r of rows) {
      await txn.runAsync(
        `INSERT INTO known_words
         (lemma, reading, status, source, card_id, interval_days, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        r.lemma,
        r.reading,
        r.status,
        r.source,
        r.cardId,
        r.intervalDays,
        r.updatedAt,
      );
    }
  });
}

// Optimistic local write before the server round-trip lands. Always
// stamped as 'manual'; if the server later returns an SRS row for the
// same identity, it overwrites this on the next refresh.
export async function upsertManualKnownWord(args: {
  lemma: string;
  reading: string;
  status: WordStatus;
  updatedAt?: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO known_words
     (lemma, reading, status, source, card_id, interval_days, updated_at)
     VALUES (?, ?, ?, 'manual', NULL, NULL, ?)
     ON CONFLICT(lemma, reading) DO UPDATE SET
       status = excluded.status,
       source = excluded.source,
       card_id = excluded.card_id,
       interval_days = excluded.interval_days,
       updated_at = excluded.updated_at;`,
    args.lemma,
    args.reading,
    args.status,
    args.updatedAt ?? Date.now(),
  );
}

export async function deleteKnownWord(lemma: string, reading: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM known_words WHERE lemma = ? AND reading = ?;",
    lemma,
    reading,
  );
}

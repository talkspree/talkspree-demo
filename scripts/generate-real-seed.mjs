/**
 * Generates supabase/migrations/094_seed_real_topics_and_presets.sql from the
 * three source CSVs. Run once with:
 *
 *   node scripts/generate-real-seed.mjs
 *
 * It:
 *   - parses the 37 topics (name + description + canonical order) from the summary CSV
 *   - parses every question and groups it under a topic by its Question ID prefix
 *     (the "Topic #" column in the questions CSV is unreliable, so it is ignored)
 *   - parses the 6 presets and their member topics
 *   - emits an idempotent seed migration that deactivates the old fake defaults and
 *     upserts the real topics + presets with deterministic fixed UUIDs.
 *
 * It asserts the expected counts (37 topics, 6 presets) and fails loudly if any
 * question row cannot be matched to one of the 37 topics, so nothing is dropped.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Source CSVs (live on the user's Desktop, outside the repo)
const DESKTOP = 'c:/Users/Mihail/Desktop';
const SUMMARY_CSV = join(DESKTOP, 'Talkspree_topics_summary.csv');
const PRESETS_CSV = join(DESKTOP, 'Talkspree_presets.csv');
const QUESTIONS_CSV = join(DESKTOP, 'Talkspree_Topics_Rewritten_MH.csv');

const OUT_FILE = join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '094_seed_real_topics_and_presets.sql'
);

// ---------------------------------------------------------------------------
// CSV parsing (handles quoted fields, escaped "" quotes, and newlines in quotes)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

function readCsv(path) {
  return parseCsv(readFileSync(path, 'utf-8'));
}

// ---------------------------------------------------------------------------
// SQL / JSON escaping helpers
// ---------------------------------------------------------------------------
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlJsonb = (arr) => `'${JSON.stringify(arr).replace(/'/g, "''")}'::jsonb`;

const topicUuid = (n) => `33333333-0000-0000-0000-0000${String(n).padStart(8, '0')}`;
const presetUuid = (n) => `44444444-0000-0000-0000-0000${String(n).padStart(8, '0')}`;

// ---------------------------------------------------------------------------
// 1. Parse topics summary -> canonical 37 topics
// ---------------------------------------------------------------------------
const summaryRows = readCsv(SUMMARY_CSV);
const topics = []; // { num, name, description }
const nameToTopic = new Map();
for (let r = 1; r < summaryRows.length; r++) {
  const [num, name, description] = summaryRows[r].map((x) => (x ?? '').trim());
  if (!num || !name) continue;
  const topic = {
    num: parseInt(num, 10),
    name,
    description,
    questions: [],
  };
  topics.push(topic);
  nameToTopic.set(name, topic);
}

if (topics.length !== 37) {
  throw new Error(`Expected 37 topics from summary CSV, got ${topics.length}`);
}

// ---------------------------------------------------------------------------
// 2. Parse questions -> derive prefix->topicName, then assign every question
// ---------------------------------------------------------------------------
const questionRows = readCsv(QUESTIONS_CSV);
const prefixToName = new Map();

// First pass: learn the prefix -> topic-name mapping from rows that have a name
for (let r = 1; r < questionRows.length; r++) {
  const cols = questionRows[r].map((x) => (x ?? '').trim());
  const topicName = cols[1];
  const qid = cols[2];
  if (!qid) continue;
  const prefix = qid.split('-')[0];
  if (topicName && !prefixToName.has(prefix)) {
    prefixToName.set(prefix, topicName);
  }
}

// Second pass: assign every question (including blank-topic-name rows) by prefix
let totalQuestions = 0;
for (let r = 1; r < questionRows.length; r++) {
  const cols = questionRows[r].map((x) => (x ?? '').trim());
  const qid = cols[2];
  const qtext = cols[3];
  if (!qid || !qtext) continue;
  const prefix = qid.split('-')[0];
  const topicName = prefixToName.get(prefix);
  if (!topicName) {
    throw new Error(`Question ${qid} has an unknown prefix "${prefix}" (no topic name found)`);
  }
  const topic = nameToTopic.get(topicName);
  if (!topic) {
    throw new Error(
      `Question ${qid} maps to topic "${topicName}" which is not one of the 37 summary topics`
    );
  }
  topic.questions.push(qtext);
  totalQuestions++;
}

// Every topic must have at least one question
const emptyTopics = topics.filter((t) => t.questions.length === 0);
if (emptyTopics.length > 0) {
  throw new Error(`These topics have no questions: ${emptyTopics.map((t) => t.name).join(', ')}`);
}

// ---------------------------------------------------------------------------
// 3. Parse presets -> member topic names
// ---------------------------------------------------------------------------
const presetRows = readCsv(PRESETS_CSV);
const presets = []; // { num, name, description, topicNames: [] }
let current = null;
let presetNum = 0;
for (let r = 1; r < presetRows.length; r++) {
  const cols = presetRows[r].map((x) => (x ?? '').trim());
  const presetName = cols[0];
  const includedTopic = cols[1];
  const presetDescription = cols[2];
  if (presetName) {
    presetNum++;
    current = {
      num: presetNum,
      name: presetName,
      description: presetDescription,
      topicNames: [],
    };
    presets.push(current);
  }
  if (includedTopic && current) {
    current.topicNames.push(includedTopic);
  }
}

if (presets.length !== 6) {
  throw new Error(`Expected 6 presets, got ${presets.length}`);
}

// Validate every preset topic resolves to a real topic UUID
for (const preset of presets) {
  for (const tn of preset.topicNames) {
    if (!nameToTopic.has(tn)) {
      throw new Error(`Preset "${preset.name}" references unknown topic "${tn}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Emit SQL
// ---------------------------------------------------------------------------
const lines = [];
lines.push('-- ============================================================================');
lines.push('-- SEED REAL DEFAULT TOPICS AND PRESETS');
lines.push('-- Auto-generated by scripts/generate-real-seed.mjs — do not edit by hand.');
lines.push(`-- ${topics.length} topics, ${presets.length} presets, ${totalQuestions} questions.`);
lines.push('--');
lines.push('-- Replaces the fake "Topic N" / "Preset N" test data: those rows are');
lines.push('-- deactivated (is_active = FALSE) and the real data is upserted by name.');
lines.push('-- ============================================================================');
lines.push('');
lines.push('-- Deactivate old fake defaults (keep rows, just hide them from the UI)');
lines.push("UPDATE default_topics  SET is_active = FALSE WHERE id::text LIKE '11111111-%';");
lines.push("UPDATE default_presets SET is_active = FALSE WHERE id::text LIKE '22222222-%';");
lines.push('');
lines.push('-- ============================================================================');
lines.push('-- DEFAULT TOPICS');
lines.push('-- ============================================================================');
lines.push('INSERT INTO default_topics (id, name, description, questions, display_order, is_active)');
lines.push('VALUES');

const topicValues = topics.map((t) => {
  return `    ('${topicUuid(t.num)}', ${sqlStr(t.name)}, ${sqlStr(t.description)}, ${sqlJsonb(
    t.questions
  )}, ${t.num}, TRUE)`;
});
lines.push(topicValues.join(',\n'));
lines.push('ON CONFLICT (name) DO UPDATE');
lines.push('  SET description = EXCLUDED.description,');
lines.push('      questions = EXCLUDED.questions,');
lines.push('      display_order = EXCLUDED.display_order,');
lines.push('      is_active = TRUE;');
lines.push('');
lines.push('-- ============================================================================');
lines.push('-- DEFAULT PRESETS');
lines.push('-- ============================================================================');
lines.push('INSERT INTO default_presets (id, name, description, topic_ids, display_order, is_active)');
lines.push('VALUES');

const presetValues = presets.map((p) => {
  const ids = p.topicNames
    .map((tn) => `'${topicUuid(nameToTopic.get(tn).num)}'::uuid`)
    .join(', ');
  return `    ('${presetUuid(p.num)}', ${sqlStr(p.name)}, ${sqlStr(
    p.description
  )}, ARRAY[${ids}], ${p.num}, TRUE)`;
});
lines.push(presetValues.join(',\n'));
lines.push('ON CONFLICT (name) DO UPDATE');
lines.push('  SET description = EXCLUDED.description,');
lines.push('      topic_ids = EXCLUDED.topic_ids,');
lines.push('      display_order = EXCLUDED.display_order,');
lines.push('      is_active = TRUE;');
lines.push('');
lines.push('-- ============================================================================');
lines.push('-- VERIFICATION (run manually after applying)');
lines.push('-- ============================================================================');
lines.push(`-- SELECT count(*) FROM default_topics WHERE is_active;            -- expect ${topics.length}`);
lines.push(`-- SELECT count(*) FROM default_presets WHERE is_active;           -- expect ${presets.length}`);
lines.push('-- SELECT name, jsonb_array_length(questions) AS q FROM default_topics WHERE is_active ORDER BY display_order;');
lines.push('');

writeFileSync(OUT_FILE, lines.join('\n'), 'utf-8');

// ---------------------------------------------------------------------------
// 5. Summary to stdout
// ---------------------------------------------------------------------------
console.log('Generated:', OUT_FILE);
console.log(`Topics:    ${topics.length} (expected 37)`);
console.log(`Presets:   ${presets.length} (expected 6)`);
console.log(`Questions: ${totalQuestions}`);
console.log('');
console.log('Per-topic question counts:');
for (const t of topics) {
  console.log(`  ${String(t.num).padStart(2, ' ')}. ${t.name}: ${t.questions.length}`);
}
console.log('');
console.log('Presets:');
for (const p of presets) {
  console.log(`  ${p.num}. ${p.name} -> [${p.topicNames.join(', ')}]`);
}

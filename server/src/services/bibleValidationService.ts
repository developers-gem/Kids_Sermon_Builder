/**
 * Bible content validation (Prompt 11).
 *
 * This is deliberately its own module, not folded into aiService, so the
 * Scripture-safety rules are one explicit, independently reviewable and
 * testable place — never inside a React/Flutter component (Prompt 11's own
 * rule), and never just a blanket "review this" string stapled onto every
 * response regardless of what's actually in it.
 *
 * What this can and can't do, honestly: without an integrated Bible-text API
 * to check AI-generated verse wording against a real translation, this
 * module cannot *verify* a quotation is word-for-word accurate. What it CAN
 * do mechanically:
 *   - Catch fabricated references: does the AI's reference name a real book
 *     of the Bible at all?
 *   - Catch passage drift: does the AI's reference still belong to the book
 *     the teacher actually asked for?
 *   - Catch likely age-inappropriate wording via a curated keyword list,
 *     applied more strictly for younger age groups.
 *   - Always label AI-generated verse/story wording as an unverified
 *     paraphrase, since it hasn't been checked against a real translation.
 *
 * Every one of these becomes a specific, actionable warning — not a single
 * generic disclaimer — so a teacher skimming validationWarnings knows
 * exactly what to double-check instead of being told to "review everything."
 */

// A book name -> canonical name map. Not from an external Bible API (none is
// integrated); covers the 66 standard books plus their common abbreviations,
// which is enough to catch genuine fabrications ("Corinthios 3", "Book of
// Mattheus") without being so strict that a legitimate abbreviation the list
// doesn't happen to include gets wrongly flagged as fabricated.
const BOOK_ALIASES: Record<string, string> = {};
const CANONICAL_BOOKS: [string, string[]][] = [
  ["Genesis", ["gen", "ge", "gn"]],
  ["Exodus", ["exo", "ex"]],
  ["Leviticus", ["lev", "lv"]],
  ["Numbers", ["num", "nu", "nm"]],
  ["Deuteronomy", ["deut", "dt"]],
  ["Joshua", ["josh", "jos"]],
  ["Judges", ["judg", "jdg"]],
  ["Ruth", ["ru"]],
  ["1 Samuel", ["1 sam", "1sam", "i samuel", "1st samuel"]],
  ["2 Samuel", ["2 sam", "2sam", "ii samuel", "2nd samuel"]],
  ["1 Kings", ["1 kgs", "1kgs", "i kings"]],
  ["2 Kings", ["2 kgs", "2kgs", "ii kings"]],
  ["1 Chronicles", ["1 chron", "1chr", "i chronicles"]],
  ["2 Chronicles", ["2 chron", "2chr", "ii chronicles"]],
  ["Ezra", ["ezr"]],
  ["Nehemiah", ["neh"]],
  ["Esther", ["esth", "est"]],
  ["Job", []],
  ["Psalm", ["ps", "psa", "psalms"]],
  ["Proverbs", ["prov", "pr"]],
  ["Ecclesiastes", ["eccl", "ecc"]],
  ["Song of Solomon", ["song", "sos", "song of songs"]],
  ["Isaiah", ["isa"]],
  ["Jeremiah", ["jer"]],
  ["Lamentations", ["lam"]],
  ["Ezekiel", ["ezek", "eze"]],
  ["Daniel", ["dan"]],
  ["Hosea", ["hos"]],
  ["Joel", []],
  ["Amos", []],
  ["Obadiah", ["obad", "obd"]],
  ["Jonah", ["jon"]],
  ["Micah", ["mic"]],
  ["Nahum", ["nah"]],
  ["Habakkuk", ["hab"]],
  ["Zephaniah", ["zeph"]],
  ["Haggai", ["hag"]],
  ["Zechariah", ["zech"]],
  ["Malachi", ["mal"]],
  ["Matthew", ["matt", "mt"]],
  ["Mark", ["mk", "mrk"]],
  ["Luke", ["lk"]],
  ["John", ["jn", "jhn"]],
  ["Acts", ["act"]],
  ["Romans", ["rom"]],
  ["1 Corinthians", ["1 cor", "1cor", "i corinthians"]],
  ["2 Corinthians", ["2 cor", "2cor", "ii corinthians"]],
  ["Galatians", ["gal"]],
  ["Ephesians", ["eph"]],
  ["Philippians", ["phil", "php"]],
  ["Colossians", ["col"]],
  ["1 Thessalonians", ["1 thess", "1thess", "i thessalonians"]],
  ["2 Thessalonians", ["2 thess", "2thess", "ii thessalonians"]],
  ["1 Timothy", ["1 tim", "1tim", "i timothy"]],
  ["2 Timothy", ["2 tim", "2tim", "ii timothy"]],
  ["Titus", ["tit"]],
  ["Philemon", ["philem", "phm"]],
  ["Hebrews", ["heb"]],
  ["James", ["jas"]],
  ["1 Peter", ["1 pet", "1pet", "i peter"]],
  ["2 Peter", ["2 pet", "2pet", "ii peter"]],
  ["1 John", ["1 jn", "1jn", "i john"]],
  ["2 John", ["2 jn", "2jn", "ii john"]],
  ["3 John", ["3 jn", "3jn", "iii john"]],
  ["Jude", []],
  ["Revelation", ["rev", "revelations"]],
];
for (const [canonical, aliases] of CANONICAL_BOOKS) {
  BOOK_ALIASES[canonical.toLowerCase()] = canonical;
  for (const a of aliases) BOOK_ALIASES[a.toLowerCase()] = canonical;
}

/**
 * Pulls the book name off the front of a reference or passage string, e.g.
 * "1 Samuel 17:45" -> "1 samuel", "John 3:16-17" -> "john", "Jonah 1-3" ->
 * "jonah". Stops at the first token that looks like a chapter number.
 */
function extractBookToken(text: string): string | null {
  const cleaned = text.trim().toLowerCase();
  if (!cleaned) return null;
  // Book name is everything before the first standalone number.
  const match = cleaned.match(/^([1-3]?\s*[a-z][a-z .]*?)\s*\d/);
  const raw = match ? match[1] : cleaned;
  return raw ? raw.replace(/\s+/g, " ").trim() : null;
}

function resolveCanonicalBook(text: string): string | null {
  const token = extractBookToken(text);
  if (!token) return null;
  return BOOK_ALIASES[token] ?? null;
}

// A deliberately conservative keyword list — this flags for human review,
// it never blocks generation outright, so false positives just mean an
// extra glance rather than a broken feature.
const INTENSE_KEYWORDS = [
  "blood",
  "murder",
  "torture",
  "gore",
  "beheaded",
  "beheading",
  "slaughter",
  "corpse",
  "mutilat",
  "graphic",
];
const YOUNGER_AGE_EXTRA_KEYWORDS = ["kill", "killed", "killing", "death", "died", "dead", "war", "battle"];

function isYoungerAudience(ageGroup: string): boolean {
  // "Ages 3-5", "Ages 3-8", etc. — treat anything starting at age 3-4 as the
  // younger bucket that gets the stricter keyword pass.
  return /ages?\s*[34]\b/i.test(ageGroup) || /3\s*[-–]\s*[5-8]/.test(ageGroup);
}

export interface BibleValidationInput {
  /** What the teacher actually typed in, e.g. "Jonah 1-3" or "Luke 19:1-10". */
  requestedPassage: string;
  ageGroup: string;
  /** The AI's own reference for the content being validated. */
  generatedReference: string;
  memoryVerseText?: string;
  storyParagraphs?: string[];
}

export interface BibleValidationResult {
  reviewRequired: boolean;
  warnings: string[];
  /**
   * True when the generated reference doesn't resolve to any recognized
   * Bible book at all — the strongest fabrication signal this module can
   * detect. Callers (aiService) use this to trigger one extra repair-retry
   * asking the AI to double-check the reference, same as a schema-shape
   * failure, before accepting the content with a warning.
   */
  referenceUnrecognized: boolean;
}

export function validateBibleContent(input: BibleValidationInput): BibleValidationResult {
  const warnings: string[] = [];

  const generatedBook = resolveCanonicalBook(input.generatedReference);
  const referenceUnrecognized = generatedBook === null;
  if (referenceUnrecognized) {
    warnings.push(
      `"${input.generatedReference}" doesn't match a recognized book of the Bible — please double-check this reference before teaching.`,
    );
  }

  const requestedBook = resolveCanonicalBook(input.requestedPassage);
  if (requestedBook && generatedBook && requestedBook !== generatedBook) {
    warnings.push(
      `You asked for ${requestedBook}, but the generated content references ${generatedBook} — please confirm this is the passage you meant.`,
    );
  }

  const combinedText = [input.memoryVerseText ?? "", ...(input.storyParagraphs ?? [])]
    .join(" ")
    .toLowerCase();
  const keywordList = isYoungerAudience(input.ageGroup)
    ? [...INTENSE_KEYWORDS, ...YOUNGER_AGE_EXTRA_KEYWORDS]
    : INTENSE_KEYWORDS;
  const hits = keywordList.filter((k) => combinedText.includes(k));
  if (hits.length > 0) {
    warnings.push(
      `Contains wording that may be intense for ${input.ageGroup} (${hits.join(", ")}) — consider reviewing before teaching.`,
    );
  }

  if (input.memoryVerseText || (input.storyParagraphs && input.storyParagraphs.length > 0)) {
    warnings.push(
      "Memory verse and story wording are AI-generated — treat as a paraphrase and check it against your preferred Bible translation before teaching.",
    );
  }

  return {
    reviewRequired: true, // any AI-touched Scripture content always needs a teacher's eyes
    warnings,
    referenceUnrecognized,
  };
}

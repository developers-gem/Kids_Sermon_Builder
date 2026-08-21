import PDFDocument from "pdfkit";
import type { LessonDoc } from "../../models/Lesson.js";
import { logger } from "../../config/logger.js";

const PAGE_SIZES = { letter: "LETTER", a4: "A4" } as const;
export type PdfPageSize = keyof typeof PAGE_SIZES;

const INK = "#3b2b20";
const MUTED = "#7a6a5c";
const ACCENT = "#c2703d";

/**
 * Fetches an image for embedding in the PDF. Data URLs (what the AI gateway
 * returns for generated illustrations/coloring pages) and absolute http(s)
 * URLs are both supported. Relative paths — which is what a built-in
 * story's image field currently is (e.g. "/assets/story-noah.jpg", a
 * web-bundle-only asset with no backend-reachable host; see README "Object
 * storage for media" gap) — are skipped rather than attempted, since the
 * backend genuinely has no way to fetch them yet. A missing or failed image
 * must never abort the PDF (Prompt 10: media failures can't destroy
 * content) — the PDF just renders without it.
 */
async function fetchImageBuffer(src: string | null | undefined): Promise<Buffer | null> {
  if (!src) return null;
  try {
    if (src.startsWith("data:")) {
      const base64 = src.split(",")[1];
      if (!base64) return null;
      return Buffer.from(base64, "base64");
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const res = await fetch(src);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    return null;
  } catch (err) {
    logger.warn({ err, src }, "Could not fetch image for PDF export; continuing without it");
    return null;
  }
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.6);
  doc.fillColor(ACCENT).fontSize(16).font("Helvetica-Bold").text(text.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.fillColor(INK).font("Helvetica").fontSize(11);
}

function activityBlock(
  doc: PDFKit.PDFDocument,
  activity: { title: string; minutes: number; supplies: string; steps: string[] },
) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(`${activity.title}  ·  ${activity.minutes} min`);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`Supplies: ${activity.supplies}`);
  doc.moveDown(0.2);
  doc.fillColor(INK).fontSize(11);
  activity.steps.forEach((step, i) => doc.text(`${i + 1}. ${step}`));
  doc.moveDown(0.4);
}

/**
 * Renders the full lesson plan matching the layout Prompt 20 specifies:
 * cover, story artwork, reference/age/big idea, story, questions, memory
 * verse, hand motions, games, object lesson, coloring page, closing prayer.
 * Only modules in `activeModules` are included, mirroring what the Builder
 * and Lesson Editor's print view show.
 */
export async function renderLessonPdf(
  lesson: LessonDoc,
  size: PdfPageSize = "letter",
): Promise<Buffer> {
  const doc = new PDFDocument({ size: PAGE_SIZES[size], margin: 54, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const active = new Set(lesson.activeModules as unknown as string[]);

  // --- Cover ---
  const illustration = await fetchImageBuffer(lesson.illustration?.url);
  if (illustration) {
    try {
      doc.image(illustration, { fit: [doc.page.width - 108, 260], align: "center" });
      doc.moveDown(0.5);
    } catch (err) {
      logger.warn({ err }, "Could not embed lesson illustration in PDF");
    }
  }

  doc
    .fillColor(ACCENT)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`${lesson.bibleReference} · ${lesson.ageGroup}`.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.2);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(24).text(lesson.title);
  doc.moveDown(0.2);
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(13).text(`Big idea: ${lesson.bigIdea}`);

  // --- Story ---
  if (active.has("story")) {
    heading(doc, "Tell the story");
    lesson.story.forEach((p, i) => doc.text(`${i + 1}. ${p}`).moveDown(0.15));
    if (lesson.askThem.length > 0) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").text("Ask them");
      doc.font("Helvetica");
      lesson.askThem.forEach((q) => doc.text(`• ${q}`));
    }
  }

  // --- Memory verse ---
  if (active.has("verse") && lesson.memoryVerse) {
    heading(doc, "Memory verse");
    doc.font("Helvetica-BoldOblique").fontSize(13).text(`"${lesson.memoryVerse.text}"`);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(lesson.memoryVerse.reference ?? "");
    doc.fillColor(INK).fontSize(11);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Hand motions");
    doc.font("Helvetica");
    (lesson.memoryVerse.motions ?? []).forEach((m) => doc.text(`• ${m}`));
  }

  // --- Games ---
  if (active.has("games") && lesson.games.length > 0) {
    heading(doc, "Games & activities");
    lesson.games.forEach((g) => activityBlock(doc, g));
  }

  // --- Object lesson ---
  if (active.has("object")) {
    heading(doc, "Object lesson");
    activityBlock(doc, lesson.objectLesson);
  }

  // --- Coloring page ---
  if (active.has("coloring") && lesson.coloringPage) {
    heading(doc, "Coloring page");
    doc.text(lesson.coloringPage.caption ?? "");
    const coloringImg = await fetchImageBuffer(lesson.coloringPage.image);
    if (coloringImg) {
      try {
        doc.moveDown(0.3);
        doc.image(coloringImg, { fit: [doc.page.width - 108, 300], align: "center" });
      } catch (err) {
        logger.warn({ err }, "Could not embed coloring page in PDF");
      }
    } else {
      doc.font("Helvetica-Oblique").fillColor(MUTED).text("(Coloring page image not available in this export.)");
      doc.fillColor(INK).font("Helvetica");
    }
  }

  // --- Closing prayer ---
  if (active.has("prayer")) {
    heading(doc, "Closing prayer");
    doc.font("Helvetica-Bold").fontSize(13).text(lesson.prayer);
  }

  doc.end();
  return done;
}

/** A standalone, single-image printable for the coloring page only. */
export async function renderColoringPagePdf(
  lesson: Pick<LessonDoc, "title" | "coloringPage">,
  size: PdfPageSize = "letter",
): Promise<Buffer> {
  const doc = new PDFDocument({ size: PAGE_SIZES[size], margin: 54, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  if (!lesson.coloringPage) {
    doc.fontSize(14).text("This lesson doesn't have a coloring page yet.");
    doc.end();
    return done;
  }

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(16).text(lesson.title);
  doc.moveDown(0.4);

  const img = await fetchImageBuffer(lesson.coloringPage.image);
  if (img) {
    try {
      doc.image(img, { fit: [doc.page.width - 108, doc.page.height - 220], align: "center" });
    } catch (err) {
      logger.warn({ err }, "Could not embed coloring page image in standalone PDF");
      doc.font("Helvetica-Oblique").text("(Coloring page image not available in this export.)");
    }
  } else {
    doc.font("Helvetica-Oblique").text("(Coloring page image not available in this export.)");
  }

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(11).text(lesson.coloringPage.caption ?? "");

  doc.end();
  return done;
}

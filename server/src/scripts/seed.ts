import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { Story } from "../models/Story.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SeedActivity = { title: string; minutes: number; supplies: string; steps: string[] };
type SeedStory = {
  id: string;
  title: string;
  reference: string;
  theme: string;
  ageRange: string;
  image: string;
  imageAlt: string;
  bigIdea: string;
  tellIt: string[];
  askThem: string[];
  memoryVerse: { text: string; reference: string; motions: string[] };
  games: SeedActivity[];
  objectLesson: SeedActivity;
  coloringPage: { image: string; alt: string; caption: string };
  prayer: string;
  featured: boolean;
};

async function seed() {
  await connectDatabase();

  const raw = readFileSync(path.join(__dirname, "seed-data/stories.json"), "utf-8");
  const stories: SeedStory[] = JSON.parse(raw);

  let upserted = 0;
  for (const s of stories) {
    await Story.findOneAndUpdate(
      { slug: s.id },
      {
        slug: s.id,
        title: s.title,
        reference: s.reference,
        theme: s.theme,
        ageRange: s.ageRange,
        image: s.image,
        imageAlt: s.imageAlt,
        bigIdea: s.bigIdea,
        tellIt: s.tellIt,
        askThem: s.askThem,
        memoryVerse: s.memoryVerse,
        games: s.games,
        objectLesson: s.objectLesson,
        coloringPage: s.coloringPage,
        prayer: s.prayer,
        featured: s.featured,
        status: "published",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    upserted += 1;
  }

  logger.info(`Seeded ${upserted} built-in stories.`);
  await disconnectDatabase();
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});

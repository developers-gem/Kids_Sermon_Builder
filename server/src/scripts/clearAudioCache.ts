import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AudioAsset } from "../models/AudioAsset.js";

import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function clearAudio() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Delete all cached audio assets
    const result = await AudioAsset.deleteMany({});
    console.log(`Deleted ${result.deletedCount} audio asset records from database.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear audio records:", error);
    process.exit(1);
  }
}

clearAudio();
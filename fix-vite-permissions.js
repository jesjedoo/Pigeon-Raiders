import fs from "fs";
import { execSync } from "child_process";

try {
  // Rendre vite exécutable
  execSync("chmod +x ./node_modules/.bin/vite");
  console.log("✅ Permissions fixées pour vite.");
} catch (error) {
  console.log("⚠️ Impossible d'exécuter chmod (probablement sous Windows). Ignoré.");
}

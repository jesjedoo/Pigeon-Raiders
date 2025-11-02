import { exec } from "child_process";
import fs from "fs";

const vitePath = "./node_modules/.bin/vite";

if (fs.existsSync(vitePath)) {
  exec(`chmod +x ${vitePath}`, (error) => {
    if (error) {
      console.log(⚠️ Impossible d'exécuter chmod (probablement sous Windows). Ignoré.");
    } else {
      console.log("✅ Permissions corrigées pour vite");
    }
  });
} else {
  console.log("ℹ️ Vite n'est pas encore installé, rien à corriger.");
}

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyDemoAssets() {
  const rootDir = path.resolve(__dirname, "..");
  const sourceDir = path.resolve(rootDir, "src");
  const demoDistDir = path.resolve(rootDir, "dist/demo");

  try {
    // Create lib directory in demo dist
    await fs.ensureDir(path.join(demoDistDir, "lib"));

    // Copy UMD file
    await fs.copy(
      path.join(rootDir, "dist/lib/sound-manager-ts.umd.js"),
      path.join(demoDistDir, "lib/sound-manager-ts.umd.js")
    );

    // Copy sounds
    const soundsDir = path.join(sourceDir, "sounds");
    if (await fs.pathExists(soundsDir)) {
      await fs.copy(soundsDir, path.join(demoDistDir, "sounds"));
    }

    // Copy demo CSS files
    const demoSourceDir = path.join(sourceDir, "demo");
    const cssFiles = ["demo.css", "shared.css", "sound-control.component.css"];

    for (const file of cssFiles) {
      const sourcePath = path.join(demoSourceDir, file);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, path.join(demoDistDir, "assets", file));
      }
    }

    console.log("Demo assets copied successfully");
  } catch (err) {
    console.error("Error copying demo assets:", err);
    process.exit(1);
  }
}

copyDemoAssets();

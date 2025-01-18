import fs from "fs";
import path from "path";
import { marked } from "marked";
import hljs from "highlight.js";
import { gfmHeadingId } from "marked-gfm-heading-id";

const readmePath = path.resolve("README.md");
const templatePath = path.resolve("src/documentation/index.html");
const isDev = process.env.NODE_ENV === "development" || process.argv.includes("--mode=documentation-dev");
const outputPath = isDev
  ? path.resolve("src/documentation/index-dev.html")
  : path.resolve("dist/documentation/index.html");

// Helper function to copy a folder recursively
function copyFolderSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Function to generate the documentation
function generateDocumentation() {

  // Read the README.md file
  const markdown = fs.readFileSync(readmePath, "utf-8");

  // Configure marked with the GFM heading ID extension (for anchor links)
  marked.use(gfmHeadingId());

  // Configure marked
  marked.setOptions({
    gfm: true,
    breaks: true,
    highlight: function (code, lang) {
      console.log("Highlighting code:", code, "with language:", lang);
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  // Convert markdown to HTML
  const htmlContent = marked(markdown);
  // Read the template - for build mode, read from the dist directory
  const templateToUse = isDev ? templatePath : outputPath;
  let template = fs.readFileSync(templateToUse, "utf-8");

  // Replace the placeholder with content
  template = template.replace("{{MARKDOWN_CONTENT}}", htmlContent);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the final HTML file
  fs.writeFileSync(outputPath, template, "utf-8");
  console.log("Documentation generated at:", outputPath);
}

// Initial generation
generateDocumentation();

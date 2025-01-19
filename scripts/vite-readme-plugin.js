// scripts/vite-readme-plugin.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import hljs from "highlight.js";
import { gfmHeadingId } from "marked-gfm-heading-id";

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

export function readmePlugin() {
  let isProcessing = false;
  let generateDocumentation; // Declare at plugin scope

  return {
    name: "vite-plugin-readme",

    configureServer(server) {
      // Define generateDocumentation at plugin scope
      generateDocumentation = async (isDev = true) => {
        if (isProcessing) return;

        try {
          isProcessing = true;

          const readmePath = path.resolve("README.md");
          const templatePath = path.resolve("src/documentation/index.html");
          const outputPath = isDev ? path.resolve("index-dev.html") : path.resolve("dist/documentation/index.html");

          // Read files
          const markdown = fs.readFileSync(readmePath, "utf-8");
          const template = fs.readFileSync(templatePath, "utf-8");

          // Configure marked
          marked.use(gfmHeadingId());
          marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: function (code, lang) {
              if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
              }
              return hljs.highlightAuto(code).value;
            },
          });

          // Convert markdown to HTML
          const htmlContent = marked(markdown);

          // Replace the placeholder with content
          const finalHtml = template.replace("{{MARKDOWN_CONTENT}}", htmlContent);

          // Ensure output directory exists
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Write the final HTML file
          fs.writeFileSync(outputPath, finalHtml);
          console.log("Documentation generated at:", outputPath);

          return true;
        } catch (error) {
          console.error("Error generating documentation:", error);
          return false;
        } finally {
          isProcessing = false;
        }
      };

      // Initial generation
      generateDocumentation(true);

      // Create a debounced version of the reload function
      let reloadTimeout;
      const debouncedReload = () => {
        clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
          server.ws.send({ type: "full-reload" });
        }, 100);
      };

      // Watch for changes
      server.watcher.add([path.resolve("README.md"), path.resolve("src/documentation/index.html")]);

      server.watcher.on("change", async (filepath) => {
        const resolvedPath = path.resolve(filepath);

        if (resolvedPath.includes("index-dev.html")) {
          return; // Ignore changes to the output file
        }

        console.log(`${filepath} changed, updating documentation...`);

        const success = await generateDocumentation(true);
        if (success) {
          debouncedReload();
        }
      });

      // Handle middleware to serve index-dev.html
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/index-dev.html") {
            try {
              const content = fs.readFileSync(path.resolve("index-dev.html"), "utf-8");
              res.setHeader("Content-Type", "text/html");
              res.end(content);
            } catch (error) {
              next(error);
            }
          } else {
            next();
          }
        });
      };
    },

    // Add this new hook for build mode
    buildStart() {
      // This will run during build
      const readmePath = path.resolve(process.cwd(), "README.md");
      const templatePath = path.resolve(process.cwd(), "src/documentation/index.html");

      if (!fs.existsSync(readmePath)) {
        console.error("README.md not found");
        return;
      }

      const readmeContent = fs.readFileSync(readmePath, "utf-8");
      const htmlContent = fs.readFileSync(templatePath, "utf-8");

      const markdownHtml = marked(readmeContent);
      const updatedHtml = htmlContent.replace("{{MARKDOWN_CONTENT}}", markdownHtml);

      // Write the processed HTML to a temporary file that Vite will use
      const tempPath = path.resolve(process.cwd(), "src/documentation/index.html");
      fs.writeFileSync(tempPath, updatedHtml);
    },

    // Add this hook to clean up after build
    closeBundle() {
      // Restore original template if needed
      const templatePath = path.resolve(process.cwd(), "src/documentation/index.html");
      const originalTemplate = fs
        .readFileSync(templatePath, "utf-8")
        .replace(/<!--.*?-->/gs, "") // Remove any existing content
        .replace(/<div class="markdown-body">[\s\S]*?<\/div>/, '<div class="markdown-body">{{MARKDOWN_CONTENT}}</div>');

      fs.writeFileSync(templatePath, originalTemplate);
    },

    // Handle build mode
    buildEnd() {
      if (process.env.NODE_ENV === "production" && generateDocumentation) {
        generateDocumentation(false);
      }
    },

    // Handle HMR
    handleHotUpdate({ file, server }) {
      if (file.endsWith("index.html") || file.endsWith("README.md")) {
        if (generateDocumentation) {
          generateDocumentation(true).then((success) => {
            if (success) {
              server.ws.send({ type: "full-reload" });
            }
          });
        }
        return [];
      }
    },
  };
}

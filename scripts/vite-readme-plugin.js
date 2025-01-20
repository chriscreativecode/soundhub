import fs from "fs";
import path from "path";
import { marked } from "marked";
import hljs from "highlight.js";
import { gfmHeadingId } from "marked-gfm-heading-id";

export function readmePlugin() {
  let isProcessing = false;
  
  async function generateDocumentation() {
    if (isProcessing) return;

    try {
      isProcessing = true;

      const readmeFilePath = path.resolve("README.md");
      const templateFilePath = path.resolve("src/documentation/template.html");
      const outputFilePath = path.resolve("src/documentation/index.html");

      console.log("\n📝 Updating README documentation...");

      const markdownContent = fs.readFileSync(readmeFilePath, "utf-8");
      const templateContent = fs.readFileSync(templateFilePath, "utf-8");

      marked.use(gfmHeadingId());
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        },
      });

      const htmlContent = marked(markdownContent);
      const wrappedContent = `<article class="markdown-body">${htmlContent}</article>`;
      const finalHtml = templateContent.replace("{{MARKDOWN_CONTENT}}", wrappedContent);

      fs.writeFileSync(outputFilePath, finalHtml, "utf-8");

      return true;
    } catch (error) {
      console.error("\n❌ Error generating documentation:", error);
      return false;
    } finally {
      isProcessing = false;
    }
  }

  return {
    name: "vite-plugin-readme",

    configureServer(server) {
      const outputFilePath = path.resolve("src/documentation/index.html");
      const outputDirectory = path.dirname(outputFilePath);

      try {
        if (!fs.existsSync(outputDirectory)) {
          fs.mkdirSync(outputDirectory, { recursive: true });
        }
        const testFilePath = path.join(outputDirectory, "test-file");
        fs.writeFileSync(testFilePath, "test");
        fs.unlinkSync(testFilePath);
        console.log("Output directory write access confirmed.");
      } catch (error) {
        console.error("Error verifying write permissions:", error);
      }

      const readmeFilePath = path.resolve("README.md");
      console.log("Monitoring README.md at:", readmeFilePath);

      // Initial documentation generation
      generateDocumentation();

      // Watch for changes
      server.watcher.add([
        path.resolve("README.md"),
        path.resolve("src/documentation/template.html"),
      ]);

      server.watcher.on("change", async (filepath) => {
        const normalizedPath = path.normalize(filepath);
        const readmeFilePath = path.normalize(path.resolve("README.md"));
        const templateFilePath = path.normalize(path.resolve("src/documentation/template.html"));

        if (normalizedPath === readmeFilePath || normalizedPath === templateFilePath) {
          await generateDocumentation();
          server.ws.send({ type: 'full-reload' });
        }
      });

      // Middleware handling
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/template.html") {
            try {
              const content = fs.readFileSync(path.resolve("src/documentation/template.html"), "utf-8");
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

    buildStart() {
      return generateDocumentation().then(() => {});
    },

    closeBundle() {
      const outputFilePath = path.resolve("src/documentation/index.html");
      if (!fs.existsSync(outputFilePath)) {
        console.error("Documentation was not generated during the build!");
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith("index.html") || file.endsWith("README.md")) {
        if (generateDocumentation) {
          generateDocumentation().then((success) => {
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

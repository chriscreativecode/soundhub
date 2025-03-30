import fs from "fs";
import path from "path";
import hljs from "highlight.js";
import markdownit from "markdown-it";
import markdownItAnchor from "markdown-it-anchor"
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";

// Register only the languages you need
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);

// enable everything
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    // Fallback: Auto-detect from registered languages
    return hljs.highlightAuto(str, ["javascript", "typescript", "xml", "bash"]).value;
  },
});

md.use(markdownItAnchor, {
  level: [1, 2, 3, 4], // Add IDs to h1, h2, h3, and h4 headings
  slugify: (s) =>
    s
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^\w.\u4e00-\u9fa5]+/g, "-") /// Replace special characters with hyphens
      .replace(/-$/, '') // replace hyphen at the end of the string.
});

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

      const htmlContent = md.render(markdownContent);
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
      server.watcher.add([path.resolve("README.md"), path.resolve("src/documentation/template.html")]);

      server.watcher.on("change", async (filepath) => {
        const normalizedPath = path.normalize(filepath);
        const readmeFilePath = path.normalize(path.resolve("README.md"));
        const templateFilePath = path.normalize(path.resolve("src/documentation/template.html"));

        if (normalizedPath === readmeFilePath || normalizedPath === templateFilePath) {
          await generateDocumentation();
          server.ws.send({ type: "full-reload" });
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

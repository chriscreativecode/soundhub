// scripts/vite-readme-plugin.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import hljs from "highlight.js";
import { gfmHeadingId } from "marked-gfm-heading-id";

export function readmePlugin() {
  let isProcessing = false;
  let generateDocumentation;
  let isWatchingReadme = false;

  return {
    name: "vite-plugin-readme",

    configureServer(server) {
      const outputPath = path.resolve("src/documentation/index-dev.html");
      const outputDir = path.dirname(outputPath);

      // Check directory permissions
      try {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const testFile = path.join(outputDir, "test-write");
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        console.log("Write access confirmed for output directory");
      } catch (error) {
        console.error("Error checking write permissions:", error);
      }

      const readmePath = path.resolve("README.md");
      console.log("Watching README.md at:", readmePath);

      generateDocumentation = async (isDev = true) => {
        if (isProcessing) return;

        try {
          isProcessing = true;
          isWatchingReadme = true;

          const readmePath = path.resolve("README.md");
          const templatePath = path.resolve("src/documentation/index.html"); // Using index.html as template
          const outputPath = isDev
            ? path.resolve("src/documentation/index-dev.html")
            : path.resolve("dist/documentation/index.html");

          console.log("\n📝 Processing README update...");
          
          const markdown = fs.readFileSync(readmePath, "utf-8");
          const template = fs.readFileSync(templatePath, "utf-8");

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

          const htmlContent = marked(markdown);
          const wrappedContent = `<article class="markdown-body">${htmlContent}</article>`;
          const finalHtml = template.replace("{{MARKDOWN_CONTENT}}", wrappedContent);

          fs.writeFileSync(outputPath, finalHtml, { encoding: 'utf-8', flag: 'w' });
          
          return true;
        } catch (error) {
          console.error("\n❌ Error in documentation generation:", error);
          return false;
        } finally {
          isProcessing = false;
          setTimeout(() => {
            isWatchingReadme = false;
          }, 100);
        }
      };

      // Initial generation
      generateDocumentation(true);

      // Watch for changes
      server.watcher.add([
        path.resolve("README.md"),
        path.resolve("src/documentation/index.html")
      ]);

      server.watcher.on("change", async (filepath) => {
        if (isWatchingReadme) return;

        const normalizedPath = path.normalize(filepath);
        const readmePath = path.normalize(path.resolve("README.md"));
        const templatePath = path.normalize(path.resolve("src/documentation/index.html"));

        if (normalizedPath === readmePath || normalizedPath === templatePath) {
          await generateDocumentation(true);
          server.ws.send({ type: 'full-reload' });
        }
      });

      // Handle middleware
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/index-dev.html") {
            try {
              const content = fs.readFileSync(path.resolve("src/documentation/index-dev.html"), "utf-8");
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
        if (!generateDocumentation) {
          // Define generateDocumentation for build if it's not already defined
          generateDocumentation = async (isDev = false) => {
            try {
              const readmePath = path.resolve("README.md");
              const templatePath = path.resolve("src/documentation/index.html");
              const outputPath = isDev
                ? path.resolve("src/documentation/index-dev.html")
                : path.resolve("dist/documentation/index.html");
      
              console.log("\n📝 Processing documentation for build...");
              
              const markdown = fs.readFileSync(readmePath, "utf-8");
              const template = fs.readFileSync(templatePath, "utf-8");
      
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
      
              const htmlContent = marked(markdown);
              const wrappedContent = `<article class="markdown-body">${htmlContent}</article>`;
              const finalHtml = template.replace("{{MARKDOWN_CONTENT}}", wrappedContent);
      
              // Ensure output directory exists
              const outputDir = path.dirname(outputPath);
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }
      
              fs.writeFileSync(outputPath, finalHtml);
              console.log(`✅ Documentation built successfully at: ${outputPath}`);
              return true;
            } catch (error) {
              console.error("\n❌ Error in documentation build:", error);
              return false;
            }
          };
        }
      
        // Call generateDocumentation for build
        return generateDocumentation(false);
      },
      
      // Remove the existing buildEnd hook if you have one, and add these:
      
      closeBundle() {
        // Ensure the documentation was generated
        if (!fs.existsSync(path.resolve("dist/documentation/index.html"))) {
          console.error("Documentation was not generated during build!");
        }
      },
      
      config(config) {
        return {
          build: {
            rollupOptions: {
              input: {
                main: path.resolve(process.cwd(), "src/documentation/index.html"),
              },
            },
          },
        };
      },

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
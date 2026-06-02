# bump-version

Bump the package version across all files in this project.

## Steps

### 1. Determine versions

Read `package.json` and report the current version. If a target version was passed as an argument to this command, use that. Otherwise ask the user: "Huidige versie is X.Y.Z — naar welke versie wil je bumpen?"

### 2. Update all version references

Replace every occurrence of the old version string with the new version in these files:

- `package.json` — `"version"` field
- `src/sound-manager/sound-manager.ts` — `private VERSION = "..."` on line ~51
- `src/readme/template.html` — `"softwareVersion": "..."` JSON-LD field
- `README.md` — two unpkg CDN URL references (`@X.Y.Z/dist/...`)
- `src/demo/pages/main/index.html` — version badge link text
- `src/demo/pages/main/sprite/index.html` — version badge span
- `src/demo/pages/main/spatial/index.html` — version badge span
- `src/demo/pages/main/groups/index.html` — version badge span
- `src/demo/pages/main/multichannel/index.html` — version badge span
- `src/demo/pages/main/general/demo-template.html` — version badge span
- `src/demo/pages/main/general/index.html` — `"softwareVersion"` JSON-LD field

Do NOT edit `src/readme/index.html` — this file gets regenerated in step 4.

### 3. Check README version history

Open `README.md` and find the `## 📋 Version History` section. Check whether a `### <new-version>` entry already exists at the top.

- **If it exists**: continue.
- **If it is missing**: ask the user: "Er ontbreekt nog een versiegeschiedenisvermelding voor X.Y.Z in de README. Kun je een beknopte omschrijving geven van wat er in deze versie is gewijzigd?" Then insert a new entry directly above the previous version's `###` heading using the emoji-prefixed bullet format already used in that section (✨ new feature, 🐛 bug fix, 🔧 fix/improvement, 📖 docs, etc.).

### 4. Regenerate lock file and docs

Run these two commands in sequence:

```bash
npm install
npm run build:docs
```

`npm install` updates `package-lock.json`. `npm run build:docs` regenerates `src/readme/index.html` from the updated README and template.

### 5. Verify

- `package.json` shows the new version
- No files (other than the Version History section entries for old versions) still contain the old version string
- `src/readme/index.html` reflects the new version

### 6. Commit

Stage all modified files and commit with:

```
chore: bump version to X.Y.Z
```

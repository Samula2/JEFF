const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else if (fileMatch(src)) {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log("Copied asset:", src, "->", dest);
  }
}

function fileMatch(file) {
  return (
    file.endsWith(".svg") ||
    file.endsWith(".png") ||
    (file.endsWith(".json") &&
      !file.endsWith("tsconfig.json") &&
      !file.endsWith("package.json"))
  );
}

copyRecursive(
  path.join(__dirname, "nodes"),
  path.join(__dirname, "dist", "nodes"),
);
copyRecursive(
  path.join(__dirname, "credentials"),
  path.join(__dirname, "dist", "credentials"),
);

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const buildDir = path.join(__dirname, "..", "build");

if (!fs.existsSync(buildDir)) {
  console.error(
    "Le dossier build/ n'existe pas. Exécutez d'abord \"npm run package\""
  );
  process.exit(1);
}

const files = fs
  .readdirSync(buildDir)
  .filter((file) => file.endsWith(".vsix"))
  .map((file) => ({
    name: file,
    path: path.join(buildDir, file),
    time: fs.statSync(path.join(buildDir, file)).mtime,
  }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.error("Aucun fichier .vsix trouvé dans le dossier build/");
  process.exit(1);
}

const latestVsix = files[0];
console.log(`Installation de ${latestVsix.name}...`);

try {
  execSync(`code --install-extension "${latestVsix.path}"`, {
    stdio: "inherit",
  });
  console.log(`\n✅ Extension installée avec succès !`);
} catch (error) {
  console.error("\n❌ Erreur lors de l'installation");
  process.exit(1);
}

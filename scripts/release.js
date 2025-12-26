const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const versionType = process.argv[2] || "patch";

if (!["patch", "minor", "major"].includes(versionType)) {
  console.error("Invalid version type. Use: patch, minor, or major");
  process.exit(1);
}

console.log(`🚀 Starting release process (${versionType})...\n`);

try {
  console.log("1️⃣ Running linter...");
  execSync("npm run lint", { stdio: "inherit" });
  console.log("✅ Linter passed\n");

  console.log("2️⃣ Running tests...");
  execSync("npm test", { stdio: "inherit" });
  console.log("✅ Tests passed\n");

  console.log(`3️⃣ Bumping version (${versionType})...`);
  execSync(`node scripts/version.js ${versionType}`, { stdio: "inherit" });

  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const newVersion = updatedPackageJson.version;
  console.log(`✅ Version bumped to ${newVersion}\n`);

  console.log("4️⃣ Committing version change...");
  execSync(`git add package.json`, { stdio: "inherit" });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
    stdio: "inherit",
  });
  console.log("✅ Version change committed\n");

  console.log("5️⃣ Building package...");
  execSync("npm run package", { stdio: "inherit" });
  console.log("✅ Package built\n");

  console.log("6️⃣ Creating git tag...");
  const tagName = `v${newVersion}`;
  execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
    stdio: "inherit",
  });
  console.log(`✅ Tag ${tagName} created\n`);

  console.log("7️⃣ Pushing changes and tag...");
  execSync("git push", { stdio: "inherit" });
  execSync(`git push origin ${tagName}`, { stdio: "inherit" });
  console.log(`✅ Changes and tag ${tagName} pushed\n`);

  console.log(`🎉 Release ${tagName} completed successfully!`);
  console.log(`📦 VSIX file: build/task-time-tracker-${newVersion}.vsix`);
} catch (error) {
  console.error("\n❌ Release failed:", error.message);
  process.exit(1);
}

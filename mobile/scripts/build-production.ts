import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Signing material is supplied outside the repository and never bundled.
const keystore = process.env.DOCSETU_KEYSTORE;
const passwordFile = process.env.DOCSETU_KEY_PASSWORD_FILE;
if (!keystore || !passwordFile || !existsSync(keystore) || !existsSync(passwordFile)) {
  throw new Error("Set DOCSETU_KEYSTORE and DOCSETU_KEY_PASSWORD_FILE to private signing files.");
}
const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "production",
  EXPO_NO_DOTENV: "1",
  DOCSETU_BUILD_PROFILE: "production",
  EXPO_PUBLIC_API_URL: "https://trydocsetu.vercel.app",
  DOCSETU_KEYSTORE: resolve(keystore),
  DOCSETU_KEY_PASSWORD: readFileSync(passwordFile, "utf8").trim(),
};
function run(command: string, args: string[], cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Regenerate ignored native sources so production never inherits the preview ID.
const packageJson = readFileSync("package.json", "utf8");
run("npx", ["expo", "prebuild", "--platform", "android", "--clean", "--no-install"]);
writeFileSync("package.json", packageJson);
// Expo emits an Android 13-only splash attribute into the base resource set.
const stylesPath = "android/app/src/main/res/values/styles.xml";
const styles = readFileSync(stylesPath, "utf8");
const splash = styles.match(/  <style name="Theme.App.SplashScreen"[\s\S]*?<\/style>/)?.[0];
if (splash?.includes("android:windowSplashScreenBehavior")) {
  mkdirSync("android/app/src/main/res/values-v33", { recursive: true });
  writeFileSync("android/app/src/main/res/values-v33/styles.xml", `<resources>\n${splash}\n</resources>\n`);
  writeFileSync(stylesPath, styles.replace(/    <item name="android:windowSplashScreenBehavior">.*?<\/item>\n/, ""));
}
const path = "android/app/build.gradle";
let gradle = readFileSync(path, "utf8");
if (!gradle.includes("signingConfigs {") || !gradle.includes("release {")) {
  throw new Error("Unexpected Android template; inspect signing configuration.");
}
gradle = gradle.replace("signingConfigs {", `signingConfigs {
        production {
            storeFile file(System.getenv("DOCSETU_KEYSTORE"))
            storePassword System.getenv("DOCSETU_KEY_PASSWORD")
            keyAlias "docsetu-production"
            keyPassword System.getenv("DOCSETU_KEY_PASSWORD")
        }`);
gradle = gradle.replace(/(release \{[\s\S]*?signingConfig )signingConfigs\.debug/, "$1signingConfigs.production");
if (!gradle.includes("signingConfig signingConfigs.production")) throw new Error("Production signing was not configured");
writeFileSync(path, gradle);
// Worklets/Reanimated lint crashes in Kotlin KaModule analysis; keep app/release vital checks.
run("./gradlew", ["app:assembleRelease", "app:lintRelease", "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a", "-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=2048m", "--no-parallel", "-x", ":react-native-worklets:lintAnalyzeRelease", "-x", ":react-native-reanimated:lintAnalyzeRelease", "--console=plain"], resolve("android"));

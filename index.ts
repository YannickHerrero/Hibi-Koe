// Custom entry: configure Unistyles before expo-router scans routes.
//
// expo-router pre-evaluates every route module during bundle init, so
// any `StyleSheet.create((theme) => …)` call in src/ or app/ runs at
// module load time. If we wait until app/_layout.tsx to run
// `import "./src/theme/unistyles"`, those creates fire first and throw
// "no theme selected yet". Importing the configure side-effect here
// makes it the very first thing the JS runtime sees.
import "./src/theme/unistyles";
import "expo-router/entry";

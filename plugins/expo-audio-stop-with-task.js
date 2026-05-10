// Local Expo config plugin: tells the AudioControlsService (the
// MediaSessionService that expo-audio registers when
// enableBackgroundPlayback is on) to stop when the user swipes the
// app out of the recents tray.
//
// Without this attribute the foreground service survives the JS
// process death — audio keeps playing and a "zombie" ExoPlayer
// collides with the new player on next launch.
//
// Wanted target behaviour: YouTube Music / Spotify
// - background → audio continues
// - swipe-kill → audio stops cleanly
//
// Must run AFTER expo-audio's plugin (which inserts the <service>
// entry). app.json's plugin order is preserved, so list this plugin
// after "expo-audio".

const { withAndroidManifest } = require("expo/config-plugins");

const SERVICE_NAME = "expo.modules.audio.service.AudioControlsService";

module.exports = function withAudioStopWithTask(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application?.service) return cfg;
    const service = application.service.find(
      (s) => s.$?.["android:name"] === SERVICE_NAME,
    );
    if (!service) return cfg;
    service.$["android:stopWithTask"] = "true";
    return cfg;
  });
};

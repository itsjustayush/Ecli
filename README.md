# Ecli — your little orbit

Ecli is a locally downloadable desktop pet inspired by the interaction vocabulary of [Comnyang’s public motion page](https://comnyang.com/en#motions), but implemented with original SVG artwork, a distinct space-island concept, and a privacy-first local runtime.

## Included in this build

Ecli has a persistent always-on-top desktop window, bounded drag-to-move behavior, eye-following, click-to-pet interaction, snack/play/sleep actions, expressive SVG/CSS motion states, needs meters, local persistence, a 25-minute focus orbit, stretch and water reminders, a pinned note, configurable accent color, attention frequency, sound effects, always-on-top behavior, and a local environment-reaction switch.

The environment layer is intentionally conservative. It can react to local idle/battery context and to an explicit local activity signal. It does not capture or store keystrokes, screenshots, audio, browser contents, URLs, or AI conversation contents. Keyboard typing is observed only as an in-memory event count to trigger a kneading/overheat animation; individual key values are never stored.

## Run from source

```bash
npm install
npm start
```

## Build a local distributable

```bash
npm run dist
```

The `dist/` folder contains the unpacked Linux build. To produce an AppImage:

```bash
npm run dist:appimage
```

The current packaging target is Linux. The Electron project structure is ready for adding macOS and Windows targets on their native build runners.

## Optional local activity protocol

An external local helper may write a JSON file named `activity.json` inside Electron’s user-data directory. The file is read every two seconds and only the following sanitized fields are accepted:

```json
{
  "state": "thinking",
  "label": "Codex task"
}
```

Supported state words include `thinking`, `agent`, `done`, `complete`, `success`, `music`, `listening`, `video`, `reel`, `short`, `coding`, `typing`, and `idle`. Ecli maps these to expressions such as thinking, happy completion, rhythm, peek mode, coding, and quiet idle. This protocol is opt-in and is not active unless a separate local integration writes the file.

## Design notes

The visual language uses a dark, low-contrast space canvas, orbital lines, sparse stars, small status chips, and a floating island. The character is an original SVG mascot rather than a copy of Comnyang’s artwork. Motion is CSS-driven and event-triggered, keeping idle CPU use low. Timers, reminders, settings, and needs are local to the app and persisted in browser storage.

## Roadmap

Future versions can add native notification APIs, a small tray menu, importable skins, a proper reminder editor, platform-specific activity adapters, and signed cross-platform installers. Those additions should preserve the same local-only privacy boundary.

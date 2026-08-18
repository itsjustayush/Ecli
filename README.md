# Ecli — your little orbit

Ecli is a locally downloadable desktop pet inspired by the interaction vocabulary of [Comnyang’s public motion page](https://comnyang.com/en#motions), but implemented with original SVG artwork, a distinct space-island concept, and a privacy-first local runtime.

## What is in the repository

The repository contains the Electron source, renderer UI, original SVG/CSS character art, local state and reminder logic, Linux packaging configuration, and the GitHub Releases update client. The current project supports Linux x64 and Windows x64 packaging. The same Electron source can later be packaged for macOS on a native macOS build runner.

| Path | Purpose |
|---|---|
| `src/main.js` | Electron window, bounded dragging, local context signals, activity bridge, and updater |
| `src/preload.js` | Secure renderer bridge with no Node.js access in the UI |
| `src/renderer/index.html` | Companion UI structure and original inline SVG mascot |
| `src/renderer/styles.css` | Space-island visual system and motion states |
| `src/renderer/app.js` | Needs, timers, reminders, interactions, local persistence, and reactions |
| `package.json` | Scripts, packaging settings, and GitHub Releases update provider |

## Option 1: Run from source

Use this route when developing or editing Ecli.

```bash
git clone https://github.com/itsjustayush/Ecli.git
cd Ecli
npm install
npm start
```

You need Node.js and npm installed. `npm install` installs Electron, Electron Builder, and the updater client. `npm start` opens the desktop pet in development mode. Development mode does not attempt to update itself from GitHub Releases.

To check the source syntax without opening the window:

```bash
npm run check
```

## Option 2: Run the Windows portable app

If you use Windows, download **`Ecli 0.1.2.exe`** from the [v0.1.2 Releases page](https://github.com/itsjustayush/Ecli/releases/tag/v0.1.2). This is a portable Windows application, so no installation wizard is required:

1. Download `Ecli 0.1.2.exe`.
2. Open your Downloads folder.
3. Double-click the file.
4. If Windows SmartScreen appears, choose **More info**, verify that the file is named `Ecli 0.1.2.exe`, and choose **Run anyway** only if you intentionally downloaded it from the official Ecli Releases page.
5. Ecli will open as a floating desktop pet.

The Windows portable build stores its settings locally and can be moved to another folder. To remove it, close Ecli and delete the `.exe` file. Windows may show a security warning because this first build is not code-signed yet; future releases should use a certificate for a smoother installation experience.

## Option 3: Run the Linux AppImage

Download the latest `Ecli-<version>.AppImage` from the repository’s [Releases page](https://github.com/itsjustayush/Ecli/releases). Then run:

```bash
chmod +x Ecli-0.1.0.AppImage
./Ecli-0.1.0.AppImage
```

On some Linux desktop environments, you may also be able to double-click the file after enabling its executable permission. The AppImage is the preferred user-facing format because it bundles Electron and does not require a separate Node.js installation.

If Linux blocks the launch because of a FUSE policy, try:

```bash
./Ecli-0.1.0.AppImage --appimage-extract-and-run
```

## Option 4: Run the unpacked Linux build

Download and extract `Ecli-linux-x64.zip`, then launch the executable inside the extracted `linux-unpacked` directory:

```bash
unzip Ecli-linux-x64.zip
cd linux-unpacked
./Ecli
```

## Build locally

To generate the Windows portable executable:

```bash
npx electron-builder --win portable --publish never
```

To generate the unpacked Linux build:

```bash
npm run dist
```

To generate an AppImage:

```bash
npm run dist:appimage
```

Build outputs are written to `dist/`. Do not commit `node_modules/` or `dist/` to the source branch; publish the AppImage and other large binaries as GitHub Release assets instead.

## How automatic updates work

Ecli uses GitHub Releases as its update channel. When a packaged AppImage starts, it checks the latest public GitHub Release. It does not update merely because someone pushes a commit to `main`; a new release must be created with a higher semantic version and a newly built AppImage attached.

The update flow is intentionally user-controlled:

1. Ecli checks for a newer release in the background.
2. If one exists, a small `update <version>` control appears in the header.
3. Clicking it downloads the release asset.
4. After the download completes, the control changes to `restart to update`.
5. Clicking that control restarts Ecli into the new version.

The updater downloads only the release artifact configured by Electron Builder. It does not execute arbitrary repository files, run source code from `main`, or silently replace the app without the user’s action.

## Publishing a new version

Update the version in `package.json`, commit the source changes, build the AppImage, and create a GitHub Release with a matching tag:

```bash
npm version patch
npm run check
npm run dist:appimage
git push origin main --follow-tags
gh release create "v$(node -p "require('./package.json').version")" \
  dist/Ecli-$(node -p "require('./package.json').version").AppImage \
  --title "Ecli $(node -p "require('./package.json').version")" \
  --generate-notes
```

For a minor feature release, use `npm version minor` instead of `npm version patch`. For a breaking release, use `npm version major`. The tag must begin with `v`, such as `v0.2.0`, and the GitHub Release must contain the AppImage produced from that same version.

For a fully automated release pipeline, add a GitHub Actions workflow that runs on a `v*` tag, executes `npm ci`, runs `npm run check`, builds the AppImage, and attaches `dist/Ecli-<version>.AppImage` to the release. That makes publishing repeatable while keeping local update behavior unchanged.

## “Realtime” update expectations

There are three different meanings of “realtime,” and they behave differently:

| Desired behavior | Recommended mechanism | Result |
|---|---|---|
| Update when you launch Ecli | Startup update check | Works with the current updater implementation |
| Notice a release while Ecli is already open | Periodic update check, such as every 10 minutes | Requires adding a timer around `autoUpdater.checkForUpdates()` |
| Update immediately after a repository push | CI builds a release after the push, then Ecli checks that release | Requires a GitHub Actions release workflow; a raw commit is not a safe update artifact |
| Keep a developer checkout synchronized with `main` | `git pull --rebase` followed by `npm install` and restart | Best for development, not for end users |

The safe production model is **push code → CI builds signed distributables → GitHub Release is created → Ecli checks the release → user approves download and restart**. Pushing directly to `main` should not cause an installed desktop application to execute arbitrary source code.

## Optional local activity protocol

An external local helper may write a JSON file named `activity.json` inside Electron’s user-data directory. The file is read every two seconds and only the following sanitized fields are accepted:

```json
{
  "state": "thinking",
  "label": "Codex task"
}
```

Supported state words include `thinking`, `agent`, `done`, `complete`, `success`, `music`, `listening`, `video`, `reel`, `short`, `coding`, `typing`, and `idle`. Ecli maps these to expressions such as thinking, happy completion, rhythm, peek mode, coding, and quiet idle. This protocol is opt-in and is not active unless a separate local integration writes the file.

## Privacy boundary

Ecli can use local idle and battery context, and it counts typing events only in memory to trigger a kneading/overheat animation. It never records or stores individual key values. It does not capture screenshots, microphone audio, browser contents, URLs, or AI conversation contents. The optional activity file accepts only a short state and label string.

## Roadmap

Future versions can add native notification APIs, a small tray menu, importable skins, a proper reminder editor, platform-specific activity adapters, signed cross-platform installers, and a GitHub Actions release workflow. Those additions should preserve the same local-only privacy boundary.

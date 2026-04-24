# Gmailer

<p align="center">
  <img src="icons/icon128.png" alt="Gmailer icon" width="128">
</p>

Gmailer is a Chrome extension that checks your Gmail inbox for unread messages and alerts you with a badge count, desktop notifications, and optional sound.

## Features

- Shows the unread inbox count on the extension badge
- Checks Gmail automatically in the background
- Plays a notification sound for new unread messages
- Supports desktop notifications that open Gmail when clicked
- Includes a popup with:
  - unread count
  - last checked time
  - sound on/off toggle
  - volume control
  - desktop notification toggle
  - manual refresh button

## Project Structure

```text
.
|-- audios/
|-- icons/
|-- background.js
|-- manifest.example.json
|-- offscreen.html
|-- offscreen.js
|-- popup.html
`-- popup.js
```

## Requirements

- Google Chrome
- A Google Cloud project with the Gmail API enabled
- An OAuth client ID for a Chrome extension

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/anikrahman0/gmailer.git
cd gmailer
```

2. Create your local extension config from the safe template:

```bash
cp manifest.example.json manifest.json
```

On Windows PowerShell you can use:

```powershell
Copy-Item manifest.example.json manifest.json
```

3. Open `manifest.json` and set `oauth2.client_id` to your Chrome extension OAuth client ID from Google Cloud.

4. Load the extension in Chrome:

1. Open `chrome://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

5. Open the popup and click **Refresh** to start the Google authorization flow.

## Setup Details

### 1. Create a Google Cloud project

1. Open the Google Cloud Console.
2. Create a new project or select an existing one.
3. Enable the Gmail API for that project.
4. Create an OAuth client ID for a Chrome extension.

You will need the extension ID when creating the OAuth client. If you do not have it yet, you can load the extension once in developer mode to get the ID from `chrome://extensions/`.

### 2. Configure the manifest

This repo keeps `manifest.json` out of version control, so use the example file as your template.

1. Copy `manifest.example.json` to `manifest.json`.
2. Set `oauth2.client_id` to your real Google OAuth client ID for the Chrome extension.

### 3. Load the extension in Chrome

1. Open `chrome://extensions/`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

### 4. Sign in and grant access

Open the popup and click **Refresh** the first time you use the extension. Chrome will open the Google authorization flow. After you grant access, the extension can check your unread Gmail inbox count in the background.

## How It Works

- `background.js` uses the Gmail API messages list endpoint to count unread inbox messages
- `popup.html` and `popup.js` provide the popup UI and settings
- `offscreen.html` and `offscreen.js` handle audio playback for notification sounds
- Settings are stored with `chrome.storage.local`
- Automatic checks currently run on a timer inside `background.js`
- The current background worker requests an interactive token through `chrome.identity.getAuthToken(...)`

The extension requests read-only Gmail access through this scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

## Permissions Used

- `identity`: Google OAuth sign-in
- `notifications`: desktop alerts
- `storage`: save user settings and last known unread count
- `offscreen`: play audio from an offscreen document
- `https://gmail.googleapis.com/*`: Gmail API access

## Privacy Notes

- The extension requests the `gmail.readonly` scope, which allows read-only Gmail access
- In this codebase, it only requests unread inbox message metadata needed for the badge and notifications
- It does not send your Gmail data to any third-party server
- Local storage is only used for settings, unread count, auth state, and last checked time

## Security Notes

- No external server, remote script, or third-party analytics endpoint is used
- The extension does not expose `externally_connectable` or `onMessageExternal` entry points
- Runtime message handlers are restricted to this extension and the offscreen audio worker only accepts bundled audio files from `audios/`
- Keep `manifest.json` untracked before publishing so your local OAuth client configuration is not accidentally committed

## Development Notes

- `manifest.json` is ignored by Git so you can keep your own OAuth client ID local
- `background.js` contains a `TEST_MODE` flag you can enable for local UI testing without OAuth
- The extension currently checks Gmail every 3 seconds with `setInterval(...)` in `background.js`
- The `alarms` permission is not used in the current implementation and should stay out unless the polling strategy changes

## Change the Notification Sound

The extension currently plays this file from `background.js`:

```js
chrome.runtime.getURL('audios/mixkit-bubble-pop-up-alert-notification-2357.wav')
```

To switch to another bundled sound:

1. Add your sound file to the `audios/` folder
2. Open `background.js`
3. Find this line:

```js
const soundFile = chrome.runtime.getURL('audios/mixkit-bubble-pop-up-alert-notification-2357.wav');
```

4. Replace the filename with your preferred file, for example:

```js
const soundFile = chrome.runtime.getURL('audios/my-custom-sound.wav');
```

5. Reload the extension in `chrome://extensions/`
6. Trigger a new mail check or use the sound test flow if you enable it in the popup

## Add a Custom Sound

When adding your own sound file:

1. Keep the file in the `audios/` folder
2. Prefer a short notification sound so repeated alerts do not feel heavy
3. Use a web-friendly format such as `.wav` or `.mp3`
4. Make sure the file is referenced through `chrome.runtime.getURL(...)`

## Developer Guide

If you want to develop or extend this extension, these are the main places to start:

- `background.js`: Gmail polling, badge updates, notifications, OAuth flow, and sound trigger
- `popup.html` and `popup.js`: popup UI, refresh button, sign-in entry point, and saved settings
- `offscreen.html` and `offscreen.js`: actual audio playback in the offscreen document
- `manifest.example.json`: safe template for sharing the project without exposing your real OAuth client ID

Recommended developer workflow:

1. Copy `manifest.example.json` to `manifest.json`
2. Add your own OAuth client ID
3. Load the extension from `chrome://extensions/`
4. Use **Reload** after every change
5. Open the service worker inspector from the extension details page to debug background logs

Helpful tips:

- Keep `manifest.example.json` and your local `manifest.json` structurally in sync
- If you change permissions or OAuth scopes, reload the extension fully
- You can enable `TEST_MODE` in `background.js` to test badge, notification, and sound behavior without Gmail OAuth
- If you add new popup controls, save their values with `chrome.storage.local` so they persist between sessions
- Before pushing to GitHub, confirm `manifest.json` is untracked and only `manifest.example.json` is included

## Troubleshooting

If unread counts or notifications are not working:

1. Confirm the Gmail API is enabled in Google Cloud
2. Confirm the OAuth client ID in `manifest.json` is correct
3. Confirm the OAuth client is configured for the correct Chrome extension ID
4. Reload the extension from `chrome://extensions/`
5. Open the extension service worker console and check for OAuth or API errors

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

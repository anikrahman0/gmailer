// offscreen.js - Handles audio playback
let audioElement = null;
const AUDIO_PATH_PREFIX = `${chrome.runtime.getURL("audios/")}`;

console.log("Offscreen document loaded");

function clampVolume(volume) {
    const numericVolume = Number(volume);
    if (!Number.isFinite(numericVolume)) {
        return 0.7;
    }

    return Math.min(Math.max(numericVolume, 0), 1);
}

function isAllowedSoundFile(soundFile) {
    return typeof soundFile === "string" && soundFile.startsWith(AUDIO_PATH_PREFIX);
}

// Play sound function
async function playSound(soundFile, volume) {
    console.log("playSound called");

    try {
        if (!isAllowedSoundFile(soundFile)) {
            throw new Error("Blocked sound file");
        }

        // Create audio element if needed
        if (!audioElement) {
            audioElement = new Audio();
            audioElement.preload = "auto";
        }

        // Set source and play
        audioElement.src = soundFile;
        audioElement.volume = clampVolume(volume);
        audioElement.currentTime = 0;

        await audioElement.play();
        console.log("Sound played successfully");
        return true;
    } catch (error) {
        console.error("Audio error:", error.message);
        console.error("Sound file:", soundFile);
        console.error("Volume:", volume);
        throw error;
    }
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender?.id && sender.id !== chrome.runtime.id) {
        sendResponse({ success: false, error: "Untrusted sender" });
        return false;
    }

    console.log("Offscreen received message:", message.type || message.action);

    if (message.type === "PLAY_SOUND" || message.action === "playSound") {
        playSound(message.soundFile, message.volume)
            .then(() => {
                sendResponse({ success: true });
            })
            .catch((err) => {
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }
});

console.log("Offscreen ready");

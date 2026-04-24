console.log("=== Gmailer Started ===");

let lastCount = null;
let offscreenReady = false;
const NOTIFICATION_SOUND = "audios/mixkit-bubble-pop-up-alert-notification-2357.wav";

// ========== TEST MODE (Set to true to test without OAuth) ==========
const TEST_MODE = false; // Change to false when OAuth is working
// ====================================================================

let testCounter = 0;

function clampVolume(volume) {
    const numericVolume = Number(volume);
    if (!Number.isFinite(numericVolume)) {
        return 0.7;
    }

    return Math.min(Math.max(numericVolume, 0), 1);
}

function isTrustedRuntimeMessage(sender) {
    return !sender || !sender.id || sender.id === chrome.runtime.id;
}

// ========== CREATE OFFSCREEN DOCUMENT ==========
async function createOffscreen() {
    try {
        const offscreenUrl = chrome.runtime.getURL("offscreen.html");
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT"],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length > 0) {
            console.log("Offscreen already exists");
            offscreenReady = true;
            return true;
        }

        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["AUDIO_PLAYBACK"],
            justification: "Play notification sounds"
        });

        console.log("Offscreen created");
        await new Promise((resolve) => setTimeout(resolve, 500));
        offscreenReady = true;
        return true;
    } catch (error) {
        console.error("Failed to create offscreen:", error);
        offscreenReady = false;
        return false;
    }
}

// ========== PLAY SOUND ==========
async function playNotificationSound() {
    const settings = await chrome.storage.local.get(["soundEnabled", "volume"]);
    if (settings.soundEnabled === false) return;

    const volume = clampVolume((settings.volume || 70) / 100);
    const soundFile = chrome.runtime.getURL(NOTIFICATION_SOUND);

    try {
        if (!offscreenReady) {
            const ready = await createOffscreen();
            if (!ready) return;
        }

        const response = await chrome.runtime.sendMessage({
            type: "PLAY_SOUND",
            soundFile,
            volume
        });

        console.log("Sound played:", response);
    } catch (error) {
        console.error("Sound failed:", error);
        offscreenReady = false;
    }
}

// ========== TEST SOUND ==========
async function testSound() {
    console.log("Testing sound...");
    await playNotificationSound();
}

// ========== TEST MODE (No OAuth needed) ==========
async function testModeCheckMail() {
    testCounter += 1;

    const mockCount = (lastCount ?? 0) + 1;

    console.log(`[TEST MODE] Unread: ${mockCount}`);

    // Update badge
    chrome.action.setBadgeText({ text: mockCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#d93025" });

    // Instant sound + notification on new email
    if (lastCount !== null && mockCount > lastCount) {
        const newEmails = mockCount - lastCount;
        console.log(`[TEST MODE] ${newEmails} new email(s)!`);

        // Play sound instantly
        await playNotificationSound();

        // Always show desktop notification
        chrome.notifications.create(`gmail-alert-${Date.now()}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: "New Email",
            message: `${newEmails} new message${newEmails !== 1 ? "s" : ""} in your inbox`,
            priority: 2
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error("Notification error:", chrome.runtime.lastError.message);
            } else {
                console.log("Notification shown:", notificationId);
            }
        });
    }

    // Save to storage
    await chrome.storage.local.set({
        unreadCount: mockCount,
        lastChecked: Date.now()
    });

    lastCount = mockCount;
}

// ========== GMAIL AUTH (Real mode) ==========
async function getToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });
}

// ========== CHECK MAIL ==========
async function checkMail() {
    // Use test mode if enabled
    if (TEST_MODE) {
        await testModeCheckMail();
        return;
    }

    // Real Gmail check
    try {
        const token = await getToken();
        const res = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread%20in:inbox&maxResults=100",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const currentCount = data.messages ? data.messages.length : 0;

        if (currentCount !== lastCount) {
            console.log(`Count: ${lastCount} -> ${currentCount}`);

            if (currentCount > 0) {
                chrome.action.setBadgeText({ text: currentCount.toString() });
                chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
            } else {
                chrome.action.setBadgeText({ text: "" });
            }

            if (lastCount !== null && currentCount > lastCount) {
                const newEmails = currentCount - lastCount;
                console.log(`${newEmails} new email(s)!`);

                await playNotificationSound();

                const settings = await chrome.storage.local.get(["desktopNotifications"]);
                if (settings.desktopNotifications !== false) {
                    chrome.notifications.create(`gmail-alert-${Date.now()}`, {
                        type: "basic",
                        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
                        title: "Gmailer",
                        message: `${newEmails} new message${newEmails !== 1 ? "s" : ""} in your inbox`,
                        priority: 2
                    }, (notificationId) => {
                        if (chrome.runtime.lastError) {
                            console.error("Notification error:", chrome.runtime.lastError.message);
                        } else {
                            console.log("Notification shown:", notificationId);
                        }
                    });
                }
            }

            await chrome.storage.local.set({
                unreadCount: currentCount,
                lastChecked: Date.now()
            });

            lastCount = currentCount;
        }
    } catch (error) {
        console.error("Check failed:", error.message || error);

        if (error.message && error.message.includes("OAuth")) {
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
            console.log("OAuth error - Make sure:");
            console.log("   1. Client ID is correct in manifest.json");
            console.log("   2. Extension ID matches Google Cloud Console");
            console.log("   3. Gmail API is enabled");
        }
    }
}

// ========== EVENT HANDLERS ==========
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith("gmail-alert")) {
        chrome.tabs.create({ url: "https://mail.google.com" });
    }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === "gmail-alert" && buttonIndex === 0) {
        chrome.tabs.create({ url: "https://mail.google.com" });
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "https://mail.google.com" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isTrustedRuntimeMessage(sender)) {
        sendResponse({ success: false, error: "Untrusted sender" });
        return false;
    }

    if (request.action === "forceCheck") {
        checkMail().then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (request.action === "testSound") {
        testSound();
        sendResponse({ success: true });
    }
});

// ========== START ==========
setInterval(() => {
    checkMail();
}, 3000);

checkMail();
console.log(`Gmailer running in ${TEST_MODE ? "TEST MODE" : "REAL MODE"}`);
console.log("Click 'Test Sound' button to check audio");

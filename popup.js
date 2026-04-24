function setStatusText(text) {
    document.getElementById("last-checked").textContent = text || "";
}

function clampSliderValue(value) {
    const numericValue = parseInt(value, 10);
    if (!Number.isFinite(numericValue)) {
        return 70;
    }

    return Math.min(Math.max(numericValue, 0), 100);
}

function renderPopupState(data) {
    const soundToggle = document.getElementById("soundToggle");
    const volumeSlider = document.getElementById("volumeSlider");
    const desktopToggle = document.getElementById("desktopNotifications");

    if (soundToggle) soundToggle.checked = data.soundEnabled !== false;
    if (volumeSlider) volumeSlider.value = clampSliderValue(data.volume);
    if (desktopToggle) desktopToggle.checked = data.desktopNotifications !== false;

    const count = data.unreadCount !== undefined ? data.unreadCount : "-";
    document.getElementById("count").textContent = count;

    if (data.authRequired) {
        setStatusText("Sign in required. Click Refresh to connect Gmail.");
        return;
    }

    if (data.lastChecked) {
        const time = new Date(data.lastChecked).toLocaleTimeString();
        setStatusText(`Last checked: ${time}`);
        return;
    }

    setStatusText("Click Refresh to check Gmail.");
}

document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(
        ["soundEnabled", "volume", "desktopNotifications", "unreadCount", "lastChecked", "authRequired"],
        (data) => renderPopupState(data)
    );

    document.getElementById("soundToggle")?.addEventListener("change", (event) => {
        chrome.storage.local.set({ soundEnabled: event.target.checked });
    });

    document.getElementById("volumeSlider")?.addEventListener("input", (event) => {
        chrome.storage.local.set({ volume: clampSliderValue(event.target.value) });
    });

    document.getElementById("desktopNotifications")?.addEventListener("change", (event) => {
        chrome.storage.local.set({ desktopNotifications: event.target.checked });
    });

    document.getElementById("openGmailBtn")?.addEventListener("click", () => {
        chrome.tabs.create({ url: "https://mail.google.com" });
    });

    document.getElementById("refreshBtn")?.addEventListener("click", () => {
        const button = document.getElementById("refreshBtn");
        const originalText = button.textContent;
        button.textContent = "Checking...";
        button.disabled = true;

        chrome.runtime.sendMessage({ action: "forceCheck" }, (response) => {
            if (chrome.runtime.lastError) {
                setStatusText("Refresh failed. Open the service worker log for details.");
            } else if (response?.requiresAuth) {
                setStatusText("Sign in required. Chrome should open the authorization flow.");
            } else if (response?.success) {
                setStatusText("Check completed.");
            } else {
                setStatusText(response?.error || "Check failed.");
            }

            setTimeout(() => {
                chrome.storage.local.get(
                    ["unreadCount", "lastChecked", "authRequired", "soundEnabled", "volume", "desktopNotifications"],
                    (data) => renderPopupState(data)
                );
                button.textContent = originalText;
                button.disabled = false;
            }, 500);
        });
    });

    document.getElementById("testSoundBtn")?.addEventListener("click", () => {
        const button = document.getElementById("testSoundBtn");
        const originalText = button.textContent;
        button.textContent = "Playing...";
        button.disabled = true;

        chrome.runtime.sendMessage({ action: "testSound" }, () => {
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1000);
        });
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.unreadCount) {
            document.getElementById("count").textContent = changes.unreadCount.newValue;
            document.getElementById("count").classList.add("pulse");
            setTimeout(() => document.getElementById("count").classList.remove("pulse"), 500);
        }

        if (changes.authRequired) {
            if (changes.authRequired.newValue) {
                setStatusText("Sign in required. Click Refresh to connect Gmail.");
            } else {
                chrome.storage.local.get(
                    ["soundEnabled", "volume", "desktopNotifications", "unreadCount", "lastChecked", "authRequired"],
                    (data) => renderPopupState(data)
                );
            }
        }

        if (changes.lastChecked && !changes.authRequired?.newValue) {
            const time = new Date(changes.lastChecked.newValue).toLocaleTimeString();
            setStatusText(`Last checked: ${time}`);
        }
    });
});

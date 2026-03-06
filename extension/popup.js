document.getElementById("copyWidgetBtn").addEventListener("click", async () => {
    const widgetUrl = chrome.runtime.getURL("widget.html");
    try {
        await navigator.clipboard.writeText(widgetUrl);
        document.getElementById("copyWidgetBtn").textContent = "Copied!";
        setTimeout(() => {
            document.getElementById("copyWidgetBtn").textContent = "Copy widget link";
        }, 1000);
    } catch (err) {
        document.getElementById("copyWidgetBtn").textContent = "Failed to copy widget link";
        setTimeout(() => {
            document.getElementById("copyWidgetBtn").textContent = "Copy widget link";
        }, 1000);
    }
});
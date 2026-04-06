browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'download') {
        browser.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: message.saveAs
        }).then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            const msg = String(error?.message || error || '');
            const cancelled = /cancell?ed/i.test(msg);
            sendResponse({ success: false, cancelled, error: msg });
        });
        return true; 
    }
}); 
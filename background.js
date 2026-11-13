browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => ({
        requestHeaders: details.requestHeaders
            .filter(h => h.name.toLowerCase() !== 'referer')
            .concat({ name: 'Referer', value: 'https://gelbooru.com/' })
    }),
    { urls: ['*://*.gelbooru.com/images/*'] },
    ['blocking', 'requestHeaders']
);

function waitForDownload(id) {
    return new Promise((resolve) => {
        const finish = (error) => {
            browser.downloads.onChanged.removeListener(onChanged);
            resolve(error);
        };
        const onChanged = (delta) => {
            if (delta.id !== id || !delta.state) return;
            if (delta.state.current === 'complete') finish(null);
            else if (delta.state.current === 'interrupted') finish((delta.error && delta.error.current) || 'INTERRUPTED');
        };
        browser.downloads.onChanged.addListener(onChanged);
        browser.downloads.search({ id }).then(([item]) => {
            if (!item) return;
            if (item.state === 'complete') finish(null);
            else if (item.state === 'interrupted') finish(item.error || 'INTERRUPTED');
        });
    });
}

browser.runtime.onMessage.addListener((message) => (async () => {
    try {
        const id = await browser.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: true
        });
        const error = await waitForDownload(id);
        if (error && error !== 'USER_CANCELED') return { error };
        return {};
    } catch (e) {
        const msg = String(e?.message || e);
        return /cancell?ed/i.test(msg) ? {} : { error: msg };
    }
})());

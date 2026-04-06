function formatTag(tag) {
    return tag.trim()
        .replace(/\s+/g, '_') 
        .replace(/[<>:"/\\|?*]/g, '_'); 
}

function getTagsFromPage() {
    const tagCategories = {
        artist: [],
        character: [],
        copyright: []
    };

    document.querySelectorAll('#tag-list li[class^="tag-type-"]').forEach(tag => {
        const tagLinks = tag.querySelectorAll('a');
        if (tagLinks.length < 2) return;

        const tagText = tagLinks[1].textContent.trim();
        if (!tagText || tagText === '?') return;

        const tagType = tag.className;
        if (tagType.includes('tag-type-artist')) {
            tagCategories.artist.push(tagText);
        } else if (tagType.includes('tag-type-character')) {
            tagCategories.character.push(tagText);
        } else if (tagType.includes('tag-type-copyright')) {
            tagCategories.copyright.push(tagText);
        }
    });

    return tagCategories;
}

function getImageUrl() {
    const imageElement = document.querySelector('#image, #gelcomVideoPlayer');
    return imageElement ? imageElement.src.split('?')[0] : null;
}

function createDownloadButton(postId) {
    if (document.getElementById('gld-download-formatted-btn')) return;

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'gld-download-formatted-btn';
    downloadBtn.textContent = 'Download with Formatted Name';
    downloadBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 15px;background:#0773fb;color:#fff;border:0;border-radius:4px;font-weight:700;cursor:pointer;z-index:9999';

    document.body.appendChild(downloadBtn);

    downloadBtn.addEventListener('click', async function() {
        try {
            const tags = getTagsFromPage();
            const characterPart = tags.character.length > 0 ? tags.character.map(formatTag).join('_') : 'unknown_character';
            const copyrightPart = tags.copyright.length > 0 ? tags.copyright.map(formatTag).join('_') : 'unknown_copyright';
            const artistPart = tags.artist.length > 0 ? tags.artist.map(formatTag).join('_') : 'unknown_artist';

            const filename = `__${characterPart}_${copyrightPart}_drawn_by_${artistPart}__G${postId}`;

            const imageUrl = getImageUrl();
            if (!imageUrl) return;

            const extension = imageUrl.split('.').pop().toLowerCase();

            const result = await browser.storage.local.get('downloadPath');
            const downloadPath = result.downloadPath || '';

            const response = await browser.runtime.sendMessage({
                type: 'download',
                url: imageUrl,
                filename: downloadPath ? `${downloadPath}/${filename}.${extension}` : `${filename}.${extension}`,
                saveAs: !downloadPath
            });

            if (response.success) {
                return;
            } else if (response.cancelled) {
                return;
            } else {
                throw new Error(response.error || 'Unknown error occurred');
            }
        } catch (error) {
            const msg = String(error?.message || error || '');
            if (/cancell?ed/i.test(msg)) return;
            alert('An error occurred while downloading. Check console for details.');
        }
    });
}

function init() {
    const postId = new URLSearchParams(window.location.search).get('id');
    if (!postId) return;
    if (!document.querySelector('#image, #gelcomVideoPlayer')) return;

    const isExpandedNow = () => {
        const resizeLink = document.querySelector('#resize-link');
        return !resizeLink || resizeLink.offsetParent === null || getComputedStyle(resizeLink).display === 'none';
    };

    if (isExpandedNow()) {
        createDownloadButton(postId);
        return;
    }

    const expandAnchor = document.querySelector('#resize-link a');
    if (expandAnchor) {
        expandAnchor.addEventListener('click', () => {
            window.setTimeout(() => {
                if (isExpandedNow()) createDownloadButton(postId);
            }, 0);
        }, { once: true });
    }

    const resizeLink = document.querySelector('#resize-link');
    if (!resizeLink) return;

    const observer = new MutationObserver(() => {
        if (isExpandedNow()) {
            observer.disconnect();
            createDownloadButton(postId);
        }
    });
    observer.observe(resizeLink, { attributes: true, attributeFilter: ['style', 'class'] });
    if (resizeLink.parentElement) {
        observer.observe(resizeLink.parentElement, { childList: true });
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
// ==UserScript==
// @name           Gelbooru Formatted Filename Downloader
// @namespace      https://gelbooru.com/
// @version        1.0
// @description    Download images from Gelbooru with descriptive filenames.
// @author         Ofiuco
// @match          *://*.gelbooru.com/index.php?page=post&s=view&id=*
// @grant          GM_download
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_registerMenuCommand
// @connect        *
// @run-at         document-end
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'downloadPath';

    function formatTag(tag) {
        return tag
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[<>:"/\\|?*]/g, '_');
    }

    function getTagsFromPage() {
        const tagCategories = {
            artist: [],
            character: [],
            copyright: [],
        };

        document.querySelectorAll('#tag-list li[class^="tag-type-"]').forEach((tag) => {
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

    function getStoredDownloadPath() {
        try {
            return GM_getValue(STORAGE_KEY, '') || '';
        } catch {
            return '';
        }
    }

    function normalizePathForDownload(path) {
        return String(path).trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    }

    function downloadWithManager(imageUrl, relativeName, saveAs) {
        const opts = {
            url: imageUrl,
            name: relativeName,
            saveAs: !!saveAs,
            onload: function () {},
            onerror: function (err) {
                console.error('[Gelbooru Downloader]', err);
            },
        };
        GM_download(opts);
    }

    function createDownloadButton(postId) {
        if (document.getElementById('gld-download-formatted-btn')) return;

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'gld-download-formatted-btn';
        downloadBtn.textContent = 'Descargar con nombre formateado';
        downloadBtn.style.cssText =
            'position:fixed;bottom:20px;right:20px;padding:10px 15px;background:#0773fb;color:#fff;border:0;border-radius:4px;font-weight:700;cursor:pointer;z-index:999999';

        document.body.appendChild(downloadBtn);

        downloadBtn.addEventListener(
            'click',
            function () {
                try {
                    const tags = getTagsFromPage();
                    const characterPart =
                        tags.character.length > 0
                            ? tags.character.map(formatTag).join('_')
                            : 'unknown_character';
                    const copyrightPart =
                        tags.copyright.length > 0
                            ? tags.copyright.map(formatTag).join('_')
                            : 'unknown_copyright';
                    const artistPart =
                        tags.artist.length > 0 ? tags.artist.map(formatTag).join('_') : 'unknown_artist';

                    const baseName = `__${characterPart}_${copyrightPart}_drawn_by_${artistPart}__G${postId}`;

                    const imageUrl = getImageUrl();
                    if (!imageUrl) return;

                    const extension = imageUrl.split('.').pop().toLowerCase();
                    const downloadPath = normalizePathForDownload(getStoredDownloadPath());

                    let relativeName;
                    let saveAs;
                    if (downloadPath) {
                        relativeName = `${downloadPath}/${baseName}.${extension}`;
                        saveAs = false;
                    } else {
                        relativeName = `${baseName}.${extension}`;
                        saveAs = true;
                    }

                    downloadWithManager(imageUrl, relativeName, saveAs);
                } catch (error) {
                    const msg = String(error && error.message ? error.message : error || '');
                    if (/cancell?ed/i.test(msg)) return;
                    console.error(error);
                }
            },
            false
        );
    }

    function init() {
        const postId = new URLSearchParams(window.location.search).get('id');
        if (!postId) return;
        if (!document.querySelector('#image, #gelcomVideoPlayer')) return;

        const isExpandedNow = function () {
            const resizeLink = document.querySelector('#resize-link');
            return (
                !resizeLink ||
                resizeLink.offsetParent === null ||
                getComputedStyle(resizeLink).display === 'none'
            );
        };

        if (isExpandedNow()) {
            createDownloadButton(postId);
            return;
        }

        const expandAnchor = document.querySelector('#resize-link a');
        if (expandAnchor) {
            expandAnchor.addEventListener(
                'click',
                function () {
                    window.setTimeout(function () {
                        if (isExpandedNow()) createDownloadButton(postId);
                    }, 0);
                },
                { once: true }
            );
        }

        const resizeLink = document.querySelector('#resize-link');
        if (!resizeLink) return;

        const observer = new MutationObserver(function () {
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

    GM_registerMenuCommand('Gelbooru: carpeta de descarga', function () {
        const current = getStoredDownloadPath();
        const next = window.prompt('Subcarpeta (vacío = diálogo al guardar)', current);
        if (next === null) return;
        GM_setValue(STORAGE_KEY, next.trim());
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

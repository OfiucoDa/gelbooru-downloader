// ==UserScript==
// @name         Gelbooru Formatted Filename Downloader
// @namespace    http://www.75chan.org
// @version      1.2
// @description  Download original images from Gelbooru with descriptive filenames.
// @author       cobrax & ofiuco
// @match        *://*.gelbooru.com/index.php*
// @icon         https://gelbooru.com/favicon.ico
// @grant        GM_download
// @connect      gelbooru.com
// @connect      *.gelbooru.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const MAX_BYTES = 180;
    const ORIGINAL_RE = /\/images\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{32}\.[a-z0-9]{2,5}$/i;
    const bytes = (s) => new TextEncoder().encode(s).length;

    function clean(s) {
        return s.trim()
            .replace(/\s+/g, '_')
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/\.{2,}/g, '.')
            .replace(/[. ]+$/g, '');
    }

    function getTags() {
        const tags = { artist: [], character: [], copyright: [] };
        document.querySelectorAll('#tag-list li[class*="tag-type-"]').forEach(li => {
            const link = [...li.querySelectorAll('a')].reverse().find(a => {
                const t = a.textContent.trim();
                return t && t !== '?';
            });
            if (!link) return;
            for (const type in tags) {
                if (li.className.includes('tag-type-' + type)) tags[type].push(link.textContent.trim());
            }
        });
        return tags;
    }

    function buildName(tags, id) {
        const part = (list, fallback, n) => list.slice(0, n).map(clean).filter(Boolean).join('_') || fallback;
        const make = (n) => `__${part(tags.character, 'unknown_character', n)}_${part(tags.copyright, 'unknown_copyright', n)}_drawn_by_${part(tags.artist, 'unknown_artist', n)}`;
        const suffix = `__G${id}`;

        for (const n of [Infinity, 4, 2, 1]) {
            const name = make(n) + suffix;
            if (bytes(name) <= MAX_BYTES) return name;
        }
        let body = '';
        for (const ch of make(1)) {
            if (bytes(body + ch + suffix) > MAX_BYTES) break;
            body += ch;
        }
        return body + suffix;
    }

    function findOriginalUrl() {
        const els = document.querySelectorAll('a[href*="/images/"], #image, #gelcomVideoPlayer, #gelcomVideoPlayer source');
        for (const el of els) {
            for (const raw of [el.href, el.currentSrc, el.src]) {
                if (!raw) continue;
                const url = new URL(raw, location.href);
                url.search = '';
                url.hash = '';
                if (ORIGINAL_RE.test(url.pathname)) return url;
            }
        }
        return null;
    }

    function init() {
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (params.get('page') !== 'post' || params.get('s') !== 'view' || !id) return;
        if (!document.querySelector('#image, #gelcomVideoPlayer')) return;

        const btn = document.createElement('button');
        btn.textContent = 'Download with Formatted Name';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 15px;background:#0773fb;color:#fff;border:0;border-radius:4px;font-weight:700;cursor:pointer;z-index:9999';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            const url = findOriginalUrl();
            if (!url) {
                alert('Original image not found. Nothing was downloaded.');
                return;
            }
            const ext = url.pathname.split('.').pop().toLowerCase();
            GM_download({
                url: url.href,
                name: `${buildName(getTags(), id)}.${ext}`,
                headers: { Referer: 'https://gelbooru.com/' },
                saveAs: true,
                onerror: (e) => alert('Download error: ' + (e && (e.error || e.details) || 'unknown')),
                ontimeout: () => alert('Download error: timeout')
            });
        });
    }

    init();
})();

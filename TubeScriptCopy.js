// ==UserScript==
// @name         TubeScriptCopy
// @version      1.3.0
// @description  Copy YouTube video transcripts with timestamps
// @author       Hasan Rüzgar
// @match        https://www.youtube.com/watch*
// @grant        GM_setClipboard
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    const { VM } = window;

    console.log('Script loaded: TubeScriptCopy');

    // YouTube uses different panel IDs depending on version
    const transcriptPanelSelectors = [
        'ytd-engagement-panel-section-list-renderer[target-id="PAmodern_transcript_view"]',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
    ];

    function findTranscriptPanel() {
        for (const selector of transcriptPanelSelectors) {
            const panel = document.querySelector(selector);
            if (panel) return panel;
        }
        return null;
    }

    const showTranscriptButtonSelector = 'ytd-video-description-transcript-section-renderer #primary-button button';

    const videoUrlRegex = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+(?:&.*)?$/;

    // --------------------------------------------------
    // Helper: Create SVG Icon for the Copy Button
    // --------------------------------------------------
    function createIconElement() {
        const iconColor = "#ffffff";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("viewBox", "0 0 20 20");
        svg.setAttribute("id", "copy");
        svg.style.width = "20px";
        svg.style.height = "20px";
        svg.style.marginRight = "18px";
        svg.style.marginLeft = "2px";

        const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M15.6 5.5H7.1c-.17 0-.31-.13-.31-.31 0-.17.13-.31.31-.31h8.5c.17 0 .31.13.31.31 0 .17-.13.31-.31.31zM15.6 8.5H7.1c-.17 0-.31-.13-.31-.31 0-.17.13-.31.31-.31h8.5c.17 0 .31.13.31.31 0 .17-.13.31-.31.31zM15.6 11.5H7.1c-.17 0-.31-.13-.31-.31 0-.17.13-.31.31-.31h8.5c.17 0 .31.13.31.31 0 .17-.13.31-.31.31zM15.6 14.5H7.1c-.17 0-.31-.13-.31-.31 0-.17.13-.31.31-.31h8.5c.17 0 .31.13.31.31 0 .17-.13.31-.31.31z");
        path1.setAttribute("fill", iconColor);
        svg.appendChild(path1);

        const group1 = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M18 17.3H4.6c-.17 0-.31-.13-.31-.31V.3C4.3.13 4.43 0 4.6 0h10.8c.08 0 .16.03.22.09l2.68 2.68c.05.05.09.13.09.22v14c0 .17-.13.31-.31.31zM4.9 16.7h12.5V3.1l-2.5-.8h-10V16.7z");
        path2.setAttribute("fill", iconColor);

        const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path3.setAttribute("d", "M18 3.3h-2.7c-.17 0-.31-.13-.31-.31V.3c0-.17.13-.31.31-.31.17 0 .31.13.31.31v2.4h2.4c.17 0 .31.13.31.31 0 .17-.13.31-.31.31z");
        path3.setAttribute("fill", iconColor);
        group1.appendChild(path2);
        group1.appendChild(path3);
        svg.appendChild(group1);

        const group2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path4.setAttribute("d", "M15.4 20H2c-.17 0-.31-.13-.31-.31V3c0-.17.13-.31.31-.31h2.7c.17 0 .31.13.31.31 0 .17-.13.31-.31.31H2.3v16.1h12.8v-2.4c0-.17.13-.31.31-.31.17 0 .31.13.31.31v2.7c0 .17-.13.31-.31.31z");
        path4.setAttribute("fill", iconColor);
        group2.appendChild(path4);
        svg.appendChild(group2);

        return svg;
    }

    // --------------------------------------------------
    // Create the Copy TS button element
    // --------------------------------------------------
    function createCopyButton() {
        const copyButton = document.createElement('button');
        copyButton.id = 'copy-transcript-button';
        Object.assign(copyButton.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            padding: '8px 16px',
            backgroundColor: '#282828',
            color: '#e2e2e2',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '400',
            fontFamily: "'Roboto', Arial, sans-serif",
            fontSize: '14px',
            lineHeight: '20px',
            textAlign: 'left'
        });

        copyButton.addEventListener('mouseenter', () => copyButton.style.backgroundColor = '#535353');
        copyButton.addEventListener('mouseleave', () => copyButton.style.backgroundColor = '#282828');
        copyButton.addEventListener('mousedown', () => copyButton.style.backgroundColor = '#6b6b6b');
        copyButton.addEventListener('mouseup', () => copyButton.style.backgroundColor = '#535353');

        const iconElement = createIconElement();
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Copy TS';

        copyButton.appendChild(iconElement);
        copyButton.appendChild(textSpan);

        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Copy Transcript button clicked.');
            copyTranscript();
        });

        return copyButton;
    }

    // --------------------------------------------------
    // Inject button into the three-dot popup menu
    // --------------------------------------------------
    function injectButtonIntoPopup(popup) {
        if (popup.querySelector('#copy-transcript-button')) return;

        // Find the Report menu item inside this popup
        const menuItems = popup.querySelectorAll('ytd-menu-service-item-renderer');
        let reportItem = null;
        for (const item of menuItems) {
            const text = item.innerText.toLowerCase();
            if (text.includes('report') || text.includes('melden') || text.includes('signaler') || text.includes('denunciar')) {
                reportItem = item;
                break;
            }
        }

        if (!reportItem) {
            console.log('Report menu item not found in popup.');
            return;
        }

        const copyButton = createCopyButton();
        reportItem.parentNode.insertBefore(copyButton, reportItem.nextSibling);
        console.log('Copy TS button injected into popup menu.');
    }

    // --------------------------------------------------
    // Watch for three-dot menu popups opening
    // --------------------------------------------------
    function watchForMenuPopups() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // Check if a menu popup was added or if a popup appeared within the added node
                    const popups = node.tagName === 'YTD-MENU-POPUP-RENDERER'
                        ? [node]
                        : node.querySelectorAll ? [...node.querySelectorAll('ytd-menu-popup-renderer')] : [];

                    for (const popup of popups) {
                        // Only inject into the main video's popup (the one from ytd-watch-metadata)
                        // We check if it contains a Report item to confirm it's the right menu
                        setTimeout(() => injectButtonIntoPopup(popup), 100);
                    }
                }
            }
        });

        const popupContainer = document.querySelector('ytd-popup-container');
        if (popupContainer) {
            observer.observe(popupContainer, { childList: true, subtree: true });
            console.log('Watching popup container for menu opens.');
        } else {
            // Fallback: watch the whole body until popup container appears
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('Watching body for popup container.');
        }
    }

    // --------------------------------------------------
    // Wait for transcript segments to load, then copy
    // --------------------------------------------------
    function findSegments(root) {
        let segments = root.querySelectorAll('transcript-segment-view-model');
        if (segments.length === 0) {
            segments = root.querySelectorAll('ytd-transcript-segment-renderer');
        }
        return segments;
    }

    function waitForTranscriptContent(callback, timeout = 15000) {
        const startTime = Date.now();
        let checkCount = 0;

        const check = () => {
            checkCount++;
            const transcriptPanel = findTranscriptPanel();
            console.log(`[TubeScriptCopy] Check #${checkCount}: panel found =`, !!transcriptPanel,
                transcriptPanel ? `(target-id: ${transcriptPanel.getAttribute('target-id')})` : '');

            if (!transcriptPanel) {
                // Also try searching the entire document for segments
                const globalSegments = findSegments(document);
                console.log(`[TubeScriptCopy] No panel, but global segment search found: ${globalSegments.length}`);

                if (globalSegments.length > 0) {
                    console.log(`[TubeScriptCopy] Found ${globalSegments.length} segments outside expected panel.`);
                    callback(extractTranscriptText(globalSegments));
                    return;
                }

                if (Date.now() - startTime < timeout) {
                    setTimeout(check, 500);
                } else {
                    console.log('[TubeScriptCopy] Transcript panel never appeared. Listing all engagement panels:');
                    document.querySelectorAll('ytd-engagement-panel-section-list-renderer').forEach(p => {
                        console.log(`  - target-id: ${p.getAttribute('target-id')}, visibility: ${p.getAttribute('visibility')}`);
                    });
                    callback(null);
                }
                return;
            }

            const segments = findSegments(transcriptPanel);
            console.log(`[TubeScriptCopy] Segments in panel: ${segments.length}`);

            if (segments.length > 0) {
                console.log(`[TubeScriptCopy] Found ${segments.length} transcript segments.`);
                callback(extractTranscriptText(segments));
                return;
            }

            // Debug: log what IS inside the panel
            if (checkCount <= 3) {
                console.log('[TubeScriptCopy] Panel children:', transcriptPanel.querySelector('#content')?.innerHTML?.substring(0, 500));
            }

            if (Date.now() - startTime < timeout) {
                setTimeout(check, 500);
            } else {
                // Last resort: try finding segments anywhere in the document
                const globalSegments = findSegments(document);
                if (globalSegments.length > 0) {
                    console.log(`[TubeScriptCopy] Found ${globalSegments.length} segments via global search.`);
                    callback(extractTranscriptText(globalSegments));
                } else {
                    console.log('[TubeScriptCopy] Transcript segments never loaded. All engagement panels:');
                    document.querySelectorAll('ytd-engagement-panel-section-list-renderer').forEach(p => {
                        console.log(`  - target-id: ${p.getAttribute('target-id')}, visibility: ${p.getAttribute('visibility')}`);
                    });
                    callback(null);
                }
            }
        };

        check();
    }

    function extractTranscriptText(segments) {
        const lines = [];
        segments.forEach(seg => {
            // New YouTube structure
            const newTimestamp = seg.querySelector('.ytwTranscriptSegmentViewModelTimestamp');
            const newText = seg.querySelector('span[role="text"]');
            if (newTimestamp && newText) {
                lines.push(`${newTimestamp.innerText.trim()} ${newText.innerText.trim()}`);
                return;
            }
            // Old YouTube structure
            const oldTimestamp = seg.querySelector('.segment-timestamp');
            const oldText = seg.querySelector('.segment-text');
            if (oldTimestamp && oldText) {
                lines.push(`${oldTimestamp.innerText.trim()} ${oldText.innerText.trim()}`);
                return;
            }
            // Fallback
            lines.push(seg.innerText.trim());
        });
        return lines.join('\n');
    }

    // --------------------------------------------------
    // Click "Show transcript" and copy content
    // --------------------------------------------------
    function copyTranscript() {
        console.log('[TubeScriptCopy] copyTranscript() called');

        // Check if transcript panel is already open with content
        const existingPanel = findTranscriptPanel();
        console.log('[TubeScriptCopy] Existing panel:', existingPanel?.getAttribute('target-id'), 'visibility:', existingPanel?.getAttribute('visibility'));

        if (existingPanel) {
            const segments = findSegments(existingPanel);
            console.log(`[TubeScriptCopy] Existing panel segments: ${segments.length}`);
            if (segments.length > 0) {
                const text = extractTranscriptText(segments);
                GM_setClipboard('summarize this:\n' + text, 'text');
                alert('Transcript copied to clipboard!');
                return;
            }
        }

        // Also check globally in case panel ID changed
        const globalSegments = findSegments(document);
        console.log(`[TubeScriptCopy] Global segment count: ${globalSegments.length}`);
        if (globalSegments.length > 0) {
            const text = extractTranscriptText(globalSegments);
            GM_setClipboard('summarize this:\n' + text, 'text');
            alert('Transcript copied to clipboard!');
            return;
        }

        // Ensure description is expanded so the transcript button is visible
        const expander = document.querySelector('ytd-text-inline-expander#description-inline-expander');
        if (expander && !expander.hasAttribute('is-expanded')) {
            const expandBtn = expander.querySelector('#expand');
            if (expandBtn) expandBtn.click();
        }

        // Small delay to let description expand
        setTimeout(() => {
            const showTranscriptButton = document.querySelector(showTranscriptButtonSelector);

            if (!showTranscriptButton) {
                console.log('Show Transcript button not found.');
                alert('Transcript button not available for this video.');
                return;
            }

            console.log('Found "Show transcript" button:', showTranscriptButton);
            showTranscriptButton.click();

            waitForTranscriptContent((transcriptText) => {
                if (transcriptText) {
                    GM_setClipboard('summarize this:\n' + transcriptText, 'text');
                    console.log('Transcript copied to clipboard.');
                    alert('Transcript copied to clipboard!');
                } else {
                    alert('Failed to load transcript content.');
                }
            });
        }, 300);
    }

    // --------------------------------------------------
    // Poll: check for open popups and inject button
    // --------------------------------------------------
    function pollForPopups() {
        if (!videoUrlRegex.test(location.href)) return;

        const popups = document.querySelectorAll('ytd-menu-popup-renderer');
        for (const popup of popups) {
            if (popup.offsetParent !== null || popup.style.display !== 'none') {
                injectButtonIntoPopup(popup);
            }
        }
    }

    setInterval(pollForPopups, 2000);
})();

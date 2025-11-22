// ==UserScript==
// @name         TubeScriptCopy
// @version      1.2.4
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

    // XPath to find the "Report" menu item (works for various languages but might have to add more in the future)
    const reportMenuItemXPath = `//ytd-menu-service-item-renderer[
        contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'report') or
        contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'melden') or
        contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'signaler') or
        contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'denunciar')
    ]`;

    // Selector for the transcript panel that shows up after clicking “Show transcript”
    const transcriptPanelSelector = 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]';

    // XPath for the “Show transcript” button
    const showTranscriptButtonXPath = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[4]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[3]/ytd-structured-description-content-renderer/div[3]/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button/yt-touch-feedback-shape/div[2]';

    // Regular expression for YouTube video URLs (e.g. https://www.youtube.com/watch?v=fjySD7_2HJs)
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
    // Wait for the Transcript Panel to Finish Loading
    // --------------------------------------------------
    // This function waits until the transcript panel's inner text stops changing
    // for a specified delay (stableDelay) or until a maximum timeout is reached.
    function waitForTranscriptStability(callback, stableDelay = 1000, timeout = 10000) {
        const transcriptPanel = document.querySelector(transcriptPanelSelector);
        if (!transcriptPanel) {
            console.log("Transcript panel not found for stability check.");
            return;
        }
        let lastText = transcriptPanel.innerText;
        let stableTimer = null;
        const startTime = Date.now();

        const observer = new MutationObserver(() => {
            const currentText = transcriptPanel.innerText;
            // If the text has changed, reset the timer.
            if (currentText !== lastText) {
                lastText = currentText;
                if (stableTimer) {
                    clearTimeout(stableTimer);
                }
                stableTimer = setTimeout(() => {
                    observer.disconnect();
                    console.log("Transcript panel text is stable.");
                    callback();
                }, stableDelay);
            }
            // If waiting too long, give up and proceed.
            if (Date.now() - startTime > timeout) {
                console.log("Transcript stability timeout reached.");
                observer.disconnect();
                if (stableTimer) clearTimeout(stableTimer);
                callback();
            }
        });
        observer.observe(transcriptPanel, { childList: true, subtree: true, characterData: true });

        // In case no mutations occur at all, trigger the callback after stableDelay.
        stableTimer = setTimeout(() => {
            observer.disconnect();
            console.log("Transcript panel text is stable (initial check).");
            callback();
        }, stableDelay);
    }

    // --------------------------------------------------
    // Insert the "Copy Transcript" Button
    // --------------------------------------------------
    function insertCopyButton() {
        const reportMenuItem = document.evaluate(
            reportMenuItemXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;  // Removed erroneous parentheses here

        if (!reportMenuItem) {
            console.log('Report menu item not found. Aborting insertion.');
            return;
        }

        // Avoid duplicate button insertion.
        if (document.getElementById('copy-transcript-button')) {
            console.log('Copy Transcript button already exists.');
            return;
        }

        console.log('Found "Report" menu item:', reportMenuItem);

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
        console.log('Copy Transcript button created:', copyButton);

        reportMenuItem.parentNode.insertBefore(copyButton, reportMenuItem.nextSibling);
        console.log('Copy Transcript button inserted into the page.');

        copyButton.addEventListener('click', () => {
            console.log('Copy Transcript button clicked.');
            copyTranscript();
        });
    }

    // --------------------------------------------------
    // Click the "Show transcript" Button and Copy Transcript
    // --------------------------------------------------
    function copyTranscript() {
        const showTranscriptButton = document.evaluate(
            showTranscriptButtonXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (!showTranscriptButton) {
            console.log('Show Transcript button not found.');
            alert('Transcript button not available.');
            return;
        }

        console.log('Found "Show transcript" button:', showTranscriptButton);
        showTranscriptButton.click();

        // Wait until the transcript panel appears...
        VM.observe(document.body, () => {
            const transcriptPanel = document.querySelector(transcriptPanelSelector);
            if (transcriptPanel) {
                console.log("Transcript panel detected, waiting for it to finish loading...");
                // Once detected, wait until the transcript text stabilizes.
                waitForTranscriptStability(() => {
                    const finalTranscript = transcriptPanel.innerText;
                    console.log('Transcript fully loaded:', finalTranscript);
                    GM_setClipboard(finalTranscript, 'text');
                    console.log('Transcript copied to clipboard.');
                    alert('Transcript copied to clipboard!');
                });
                return true; // Stop observing
            }
        });
    }

    // --------------------------------------------------
    // Handle URL Change: Wait for YouTube Navigation to Finish
    // --------------------------------------------------
    function handleUrlChange() {
        console.log("URL changed to:", location.href);
        if (!videoUrlRegex.test(location.href)) {
            console.log("URL does not match YouTube video URL pattern. Skipping.");
            return;
        }
        console.log("Detected a YouTube video URL. Waiting for the report menu item...");

        // Wait for the "Report" menu item to appear.
        VM.observe(document.body, () => {
            const reportMenuItem = document.evaluate(
                reportMenuItemXPath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;
            if (reportMenuItem) {
                console.log("Report menu item detected:", reportMenuItem);
                // After detecting, wait an extra 2 seconds for the page to settle.
                setTimeout(() => {
                    insertCopyButton();
                }, 1000);
                return true; // Stop further observing.
            }
        });
    }

    // --------------------------------------------------
    // Listen for YouTube's SPA Navigation Event
    // --------------------------------------------------
    document.addEventListener('yt-navigate-finish', () => {
        console.log('yt-navigate-finish event fired.');
        handleUrlChange();
    });

    // Also run on initial page load.
    window.addEventListener('load', () => {
        console.log('Page loaded.');
        if (videoUrlRegex.test(location.href)) {
            handleUrlChange();
        }
    });
})();

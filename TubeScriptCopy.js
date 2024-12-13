// ==UserScript==
// @name         TubeScriptCopy
// @version      1.0.0
// @description  Copy YouTube video transcripts with timestamps
// @author       Hasan Rüzgar
// @match        https://www.youtube.com/watch*
// @grant        GM_setClipboard
// @license      MIT
// ==/UserScript==

// Inspired by https://greasyfork.org/en/scripts/483035-youtube-transcript-copier
// Even though the code was completely changed, I would not have created this without the previous efforts.

(function () {
    'use strict';

    console.log('Tampermonkey script loaded: YouTube Transcript Copier v2.0');

    function insertCopyButton() {
        // Locate the "Report" menu item (to later add the "Copy Transcript" button under it)
        const reportMenuItemXPath = "//ytd-menu-service-item-renderer[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'report')]";
        const reportMenuItem = document.evaluate(reportMenuItemXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (!reportMenuItem) {
            console.log('Report menu item not found. Aborting insertion.');
            return;
        }

        console.log('Found "Report" menu item:', reportMenuItem);

        // Create the Copy Transcript button
        const copyButton = document.createElement('button');
        copyButton.innerText = 'Copy Transcript';
        copyButton.id = 'copy-transcript-button';
        copyButton.style = `
            display: block; /* Ensures the element behaves as a block, taking full width */
            width: 100%; /* Makes it occupy the full width of its container */
            padding: 10px 0;
            background-color: #282828;
            color: white;
            border: none;
            cursor: pointer;
        `;

        // Change background color on hover and click
        copyButton.addEventListener('mouseenter', () => {
            copyButton.style.backgroundColor = '#535353'; // Hover color
        });

        copyButton.addEventListener('mouseleave', () => {
            copyButton.style.backgroundColor = '#282828'; // Original color
        });

        copyButton.addEventListener("mousedown", () => {
            copyButton.style.backgroundColor = "#6b6b6b"; // Click color
        });

        copyButton.addEventListener("mouseup", () => {
            copyButton.style.backgroundColor = "#535353"; // Return to hover color
        });

        console.log('Copy Transcript button created:', copyButton);

        // Insert the button under the "Report" menu item
        reportMenuItem.parentNode.insertBefore(copyButton, reportMenuItem.nextSibling);
        console.log('Copy Transcript button inserted into the page.');


        copyButton.addEventListener('click', function () {
            console.log('Copy Transcript button clicked.');

            // Locate and click the "Show transcript" button
            const showTranscriptButtonXPath = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[2]/ytd-structured-description-content-renderer/div/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button';
            const showTranscriptButton = document.evaluate(showTranscriptButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (!showTranscriptButton) {
                console.log('Show Transcript button not found.');
                alert('Transcript button not available.');
                return;
            }

            console.log('Found "Show transcript" button:', showTranscriptButton);
            showTranscriptButton.click();

            // Wait for the transcript panel to appear
            const checkTranscriptVisible = setInterval(function () {
                const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
                if (transcriptPanel && transcriptPanel.innerText.trim() !== '') {
                    clearInterval(checkTranscriptVisible);
                    console.log('Transcript panel found and loaded:', transcriptPanel);

                    // Copy the transcript text to clipboard
                    GM_setClipboard(transcriptPanel.innerText, 'text');
                    console.log('Transcript copied to clipboard.');

                    // Notify the user
                    alert('Transcript copied to clipboard!');
                } else {
                    console.log('Waiting for transcript panel to load...');
                }
            }, 500);
        });
    }

    // Page Loaded?
    window.addEventListener('load', function () {
        console.log('Page loaded. Attempting to insert Copy Transcript button...');
        const observer = new MutationObserver(() => {
            const reportMenuItemXPath = "//ytd-menu-service-item-renderer[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'report')]";
            const reportMenuItem = document.evaluate(reportMenuItemXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (reportMenuItem) {
                observer.disconnect();
                console.log('Menu popup detected. Inserting Copy Transcript button...');
                insertCopyButton();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
})();

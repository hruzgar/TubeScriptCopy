// ==UserScript==
// @name         TubeScriptCopy
// @version      1.1.0
// @description  Copy YouTube video transcripts with timestamps
// @author       Hasan Rüzgar
// @match        https://www.youtube.com/watch*
// @grant        GM_setClipboard
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @license      MIT
// ==/UserScript==

// Inspired by https://greasyfork.org/en/scripts/483035-youtube-transcript-copier
// Even though the code was completely changed, I would not have created this without the previous efforts.

(function() {
    'use strict';
    const { VM } = window;

    console.log('Script loaded: TubeScriptCopy');

    // "Copy Transcript" will be added under the "Report" menu item.
    // english, german, spanish and french. More languages can be added later.
    // language dependance is not the best. But currently best solution i found.
    const reportMenuItemXPath = `//ytd-menu-service-item-renderer[
            contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'report') or
            contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'melden') or
            contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'signaler') or
            contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'denunciar')
            ]`;
    const titleElementXPath = '//*[@id="title"]/h1/yt-formatted-string';
    const transcriptPanelSelector = 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]';
    const showTranscriptButtonXPath = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[2]/ytd-structured-description-content-renderer/div/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button';

    function insertCopyButton() {
        const reportMenuItem = document.evaluate(reportMenuItemXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (!reportMenuItem) {
            console.log('Report menu item not found. Aborting insertion.');
            return;
        }

        console.log('Found "Report" menu item:', reportMenuItem);

        const copyButton = document.createElement('button');
        copyButton.innerText = 'Copy Transcript';
        copyButton.id = 'copy-transcript-button';
        Object.assign(copyButton.style, {
            display: 'block',
            width: '100%',
            padding: '8px 0',
            backgroundColor: '#282828',
            color: '#e2e2e2',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '400',
            fontFamily: "'Roboto', Arial, sans-serif",
            fontSize: '14px',
            lineHeight: '20px',
        });

        copyButton.addEventListener('mouseenter', () => copyButton.style.backgroundColor = '#535353'); // Hover color
        copyButton.addEventListener('mouseleave', () => copyButton.style.backgroundColor = '#282828'); // Original color
        copyButton.addEventListener('mousedown', () => copyButton.style.backgroundColor = '#6b6b6b'); // Click color
        copyButton.addEventListener('mouseup', () => copyButton.style.backgroundColor = '#535353'); // Return to Hover color

        console.log('Copy Transcript button created:', copyButton);

        reportMenuItem.parentNode.insertBefore(copyButton, reportMenuItem.nextSibling);
        console.log('Copy Transcript button inserted into the page.');

        copyButton.addEventListener('click', () => {
            console.log('Copy Transcript button clicked.');
            copyTranscript();
        });
    }

    function copyTranscript() {
        const showTranscriptButton = document.evaluate(showTranscriptButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (!showTranscriptButton) {
            console.log('Show Transcript button not found.');
            alert('Transcript button not available.');
            return;
        }

        console.log('Found "Show transcript" button:', showTranscriptButton);
        showTranscriptButton.click();

        VM.observe(document.body, () => {
            const transcriptPanel = document.querySelector(transcriptPanelSelector);
            if (transcriptPanel && transcriptPanel.innerText.trim() !== '') {
                console.log('Transcript panel found and loaded:', transcriptPanel);
                GM_setClipboard(transcriptPanel.innerText, 'text');
                console.log('Transcript copied to clipboard.');
                alert('Transcript copied to clipboard!');
                return true;
            } else {
                console.log('Waiting for transcript panel to load...');
            }
        });
    }

    function handleTitleChange() {
        console.log("YouTube video title changed");

        VM.observe(document.body, () => {
            const reportMenuItem = document.evaluate(reportMenuItemXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (reportMenuItem) {
                console.log('Menu popup detected. Inserting Copy Transcript button if not already present...');
                if (!document.getElementById('copy-transcript-button')) {
                    insertCopyButton();
                }
                return true;
            }
        });
    }

    function observeTitleChanges() {
        console.log('Starting to observe for title element changes...');

        const waitForTitleElement = () => {
            const titleElement = document.evaluate(titleElementXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (titleElement) {
                console.log("Title element found:", titleElement);
                let lastTitle = titleElement.textContent;
                handleTitleChange();

                VM.observe(titleElement, () => {
                    if (titleElement.textContent !== lastTitle) {
                        lastTitle = titleElement.textContent;
                        console.log("YouTube video title changed to:", lastTitle);
                        handleTitleChange();
                    }
                });

                return true;
            } else {
                console.log("Body Changed. But title element not found yet, waiting...");
                return false;
            }
        };

        if (!waitForTitleElement()) {
            // Call waitForTitleElement each time document.body changes.
            VM.observe(document.body, waitForTitleElement);
        }
    }

    window.addEventListener('load', function() {
        console.log('Page loaded. Start observing title changes...');
        observeTitleChanges();
    });

})();

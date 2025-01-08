// ==UserScript==
// @name         TubeScriptCopy
// @version      1.2.0
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


    function createIconElement() {
        const iconColor = "#ffffff";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("viewBox", "0 0 20 20");
        svg.setAttribute("id", "copy");
        svg.style.width = "20px";
        svg.style.height = "20px";
        svg.style.marginRight = "18px"; // Add some space between icon and text.
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

    function insertCopyButton() {
        const reportMenuItem = document.evaluate(reportMenuItemXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (!reportMenuItem) {
            console.log('Report menu item not found. Aborting insertion.');
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
            textAlighn: 'left'
        });

        copyButton.addEventListener('mouseenter', () => copyButton.style.backgroundColor = '#535353'); // Hover color
        copyButton.addEventListener('mouseleave', () => copyButton.style.backgroundColor = '#282828'); // Original color
        copyButton.addEventListener('mousedown', () => copyButton.style.backgroundColor = '#6b6b6b'); // Click color
        copyButton.addEventListener('mouseup', () => copyButton.style.backgroundColor = '#535353'); // Return to Hover color

        const iconElement = createIconElement();
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Copy Transcript';

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

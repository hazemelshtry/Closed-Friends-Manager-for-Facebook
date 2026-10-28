(function () {
    'use strict';

    const TOOL_ID = 'closed-friends-manager-v13';
    const CLOSED_ATTR = 'data-cfm-closed-v13';
    const BOX_CLASS = 'cfm-checkbox-v13';

    const restrictedNames = new Set();
    const restrictedIds = new Set();
    const restrictedUrls = new Set();

    const closedAccounts = new Map();
    const scannedAccounts = new Set();
    const selectedAccounts = new Set();

    let running = false;
    let deleting = false;
    let stopDelete = false;
    let currentIndex = 0;
    let mutationTimer = null;

    document.getElementById(TOOL_ID)?.remove();

    document.querySelectorAll(`[${CLOSED_ATTR}]`).forEach(el => {
        el.removeAttribute(CLOSED_ATTR);
        el.style.removeProperty('border');
        el.style.removeProperty('box-shadow');
        el.style.removeProperty('border-radius');
        el.querySelector(`.${BOX_CLASS}`)?.remove();
    });

    const panel = document.createElement('div');

    panel.id = TOOL_ID;

    panel.style.cssText = `
        position:fixed;
        top:18px;
        left:18px;
        z-index:2147483647;
        width:340px;
        background:#18191a;
        color:#e4e6eb;
        border:1px solid #3a3b3c;
        border-radius:14px;
        padding:0;
        font-family:Arial,sans-serif;
        box-shadow:0 8px 30px rgba(0,0,0,.45);
        overflow:hidden;
    `;

    panel.innerHTML = `
        <div id="cfm-drag-handle" style="
            padding:14px 16px;
            background:#242526;
            font-size:19px;
            font-weight:700;
            cursor:move;
            user-select:none;
            border-bottom:1px solid #3a3b3c;
        ">
            Closed Friends Manager
        </div>

        <div style="padding:14px 16px 16px 16px;">
            <div style="
                display:grid;
                grid-template-columns:1fr 1fr 1fr;
                gap:8px;
                margin-bottom:14px;
            ">
                <div style="background:#242526;padding:10px;border-radius:8px;text-align:center;">
                    <div id="cfm-scanned" style="font-size:20px;font-weight:bold;">0</div>
                    <div style="font-size:11px;color:#b0b3b8;">SCANNED</div>
                </div>

                <div style="background:#242526;padding:10px;border-radius:8px;text-align:center;">
                    <div id="cfm-closed" style="font-size:20px;font-weight:bold;color:#ff4d4d;">0</div>
                    <div style="font-size:11px;color:#b0b3b8;">CLOSED</div>
                </div>

                <div style="background:#242526;padding:10px;border-radius:8px;text-align:center;">
                    <div id="cfm-selected" style="font-size:20px;font-weight:bold;color:#2d88ff;">0</div>
                    <div style="font-size:11px;color:#b0b3b8;">SELECTED</div>
                </div>
            </div>

            <button id="cfm-start">Start Scan</button>
            <button id="cfm-stop">Stop Scan</button>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px;">
                <button id="cfm-next">Next Closed</button>
                <button id="cfm-rescan">Rescan Page</button>
                <button id="cfm-select-all">Select All</button>
                <button id="cfm-clear">Clear Selection</button>
            </div>

            <div style="
                height:1px;
                background:#3a3b3c;
                margin:14px 0;
            "></div>

            <button id="cfm-delete-selected">Delete Selected</button>

            <button id="cfm-delete-all">
                Delete All Closed
            </button>

            <button id="cfm-stop-delete">
                STOP DELETE
            </button>

            <div
                id="cfm-status"
                style="
                    margin-top:12px;
                    padding:9px;
                    background:#242526;
                    border-radius:7px;
                    font-size:12px;
                    color:#b0b3b8;
                    min-height:16px;
                    word-break:break-word;
                "
            >
                Ready.
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('button').forEach(button => {
        button.style.cssText += `
            width:100%;
            padding:9px 10px;
            margin-top:7px;
            border:0;
            border-radius:7px;
            cursor:pointer;
            font-size:13px;
            font-weight:600;
            background:#3a3b3c;
            color:#e4e6eb;
        `;
    });

    panel.querySelector('#cfm-start').style.background = '#2374e1';
    panel.querySelector('#cfm-stop').style.background = '#555';
    panel.querySelector('#cfm-delete-selected').style.background = '#e67e22';
    panel.querySelector('#cfm-delete-all').style.background = '#c0392b';
    panel.querySelector('#cfm-stop-delete').style.background = '#8b0000';

    const scannedCounter = panel.querySelector('#cfm-scanned');
    const closedCounter = panel.querySelector('#cfm-closed');
    const selectedCounter = panel.querySelector('#cfm-selected');
    const status = panel.querySelector('#cfm-status');
    const dragHandle = panel.querySelector('#cfm-drag-handle');

    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    dragHandle.addEventListener('mousedown', e => {
        dragging = true;

        const rect = panel.getBoundingClientRect();

        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;

        let left = e.clientX - dragOffsetX;
        let top = e.clientY - dragOffsetY;

        const maxLeft =
            window.innerWidth - panel.offsetWidth;

        const maxTop =
            window.innerHeight - panel.offsetHeight;

        left = Math.max(
            0,
            Math.min(
                left,
                Math.max(0, maxLeft)
            )
        );

        top = Math.max(
            0,
            Math.min(
                top,
                Math.max(0, maxTop)
            )
        );

        panel.style.left =
            `${left}px`;

        panel.style.top =
            `${top}px`;
    });

    document.addEventListener('mouseup', () => {
        dragging = false;
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function text(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function statusText(message, color = '#b0b3b8') {
        status.textContent = message;
        status.style.color = color;
    }

    function normalizeUrl(value) {
        if (!value) return '';

        try {
            const url =
                new URL(
                    value,
                    location.href
                );

            url.hash = '';

            [
                '__cft__',
                '__tn__',
                'ref',
                'refid',
                'mibextid'
            ].forEach(key => {
                url.searchParams.delete(
                    key
                );
            });

            return url.toString();

        } catch {
            return String(value);
        }
    }

    function extractIdentifier(value) {
        if (!value) return '';

        try {
            const url =
                new URL(
                    value,
                    location.href
                );

            const id =
                url.searchParams.get(
                    'id'
                );

            if (id) {
                return id;
            }

            const parts =
                url.pathname
                    .split('/')
                    .filter(Boolean);

            if (
                parts[0] &&
                parts[0] !== 'profile.php' &&
                parts[0] !== 'friends' &&
                parts[0] !== 'groups'
            ) {
                return parts[0];
            }

            return '';

        } catch {
            return '';
        }
    }

    function getCards() {
        const optionButtons =
            Array.from(
                document.querySelectorAll(
                    '[aria-label^="More options for "]'
                )
            ).filter(button => {
                const label =
                    text(
                        button.getAttribute(
                            'aria-label'
                        )
                    );

                return (
                    label &&
                    label !==
                        'More options for friends list'
                );
            });

        const results = [];
        const elementsSeen =
            new Set();

        for (
            const button
            of optionButtons
        ) {
            const label =
                text(
                    button.getAttribute(
                        'aria-label'
                    )
                );

            const name =
                text(
                    label.replace(
                        /^More options for\s+/i,
                        ''
                    )
                );

            if (
                !name ||
                name.toLowerCase() ===
                    'friends list'
            ) {
                continue;
            }

            let element =
                button;

            for (
                let level = 0;
                level < 15 &&
                element;
                level++
            ) {
                const image =
                    element.querySelector?.(
                        'img[width="80"][height="80"]'
                    );

                const personButton =
                    element.querySelector?.(
                        `[aria-label="${CSS.escape(label)}"]`
                    );

                if (
                    image &&
                    personButton
                ) {
                    break;
                }

                element =
                    element.parentElement;
            }

            if (
                !element ||
                elementsSeen.has(
                    element
                )
            ) {
                continue;
            }

            const avatar =
                element.querySelector(
                    'img[width="80"][height="80"]'
                );

            if (!avatar) {
                continue;
            }

            elementsSeen.add(
                element
            );

            const links =
                Array.from(
                    element.querySelectorAll(
                        'a[href*="facebook.com"]'
                    )
                );

            const profileLink =
                links.find(link => {
                    const href =
                        link.getAttribute(
                            'href'
                        ) || '';

                    return (
                        !href.includes(
                            'friends_mutual'
                        ) &&
                        !href.includes(
                            'sk=friends_mutual'
                        )
                    );
                });

            const url =
                profileLink
                    ? normalizeUrl(
                        profileLink.href
                    )
                    : '';

            const identifier =
                extractIdentifier(
                    url
                );

            const key =
                identifier
                    ? `id:${identifier}`
                    : url
                        ? `url:${url}`
                        : `name:${name}`;

            results.push({
                element,
                button,
                name,
                url,
                identifier,
                key
            });
        }

        return results;
    }

    function isRestricted(card) {
        if (
            restrictedNames.has(
                card.name
            )
        ) {
            return true;
        }

        if (
            card.identifier &&
            restrictedIds.has(
                String(
                    card.identifier
                )
            )
        ) {
            return true;
        }

        if (
            card.url &&
            restrictedUrls.has(
                normalizeUrl(
                    card.url
                )
            )
        ) {
            return true;
        }

        return false;
    }

    function visibleMenu() {
        return Array.from(
            document.querySelectorAll(
                '[role="menu"][aria-label="Friend management options"]'
            )
        ).find(menu => {
            const rect =
                menu.getBoundingClientRect();

            return (
                rect.width > 0 &&
                rect.height > 0
            );
        });
    }

    async function waitForMenu(
        timeout = 1800
    ) {
        const start =
            Date.now();

        while (
            Date.now() - start <
            timeout
        ) {
            const menu =
                visibleMenu();

            if (menu) {
                return menu;
            }

            await sleep(60);
        }

        return null;
    }

    function menuOptions(menu) {
        if (!menu) return [];

        const items =
            Array.from(
                menu.querySelectorAll(
                    '[role="menuitem"], [role="button"][aria-pressed]'
                )
            );

        return [
            ...new Set(
                items
                    .map(item =>
                        text(
                            item.textContent
                        )
                    )
                    .filter(Boolean)
            )
        ];
    }

    async function closeMenu(
        button
    ) {
        document.dispatchEvent(
            new KeyboardEvent(
                'keydown',
                {
                    key: 'Escape',
                    code: 'Escape',
                    bubbles: true
                }
            )
        );

        await sleep(80);

        if (visibleMenu()) {
            try {
                button.click();
            } catch {}
        }

        await sleep(100);
    }

    function createBox(
        card
    ) {
        let wrapper =
            card.element
                .querySelector(
                    `.${BOX_CLASS}`
                );

        if (!wrapper) {
            wrapper =
                document.createElement(
                    'label'
                );

            wrapper.className =
                BOX_CLASS;

            wrapper.style.cssText = `
                position:absolute;
                top:7px;
                left:7px;
                width:32px;
                height:32px;
                z-index:9999;
                background:#fff;
                border:3px solid #ff0000;
                border-radius:7px;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
                box-shadow:0 3px 10px rgba(0,0,0,.35);
            `;

            const input =
                document.createElement(
                    'input'
                );

            input.type =
                'checkbox';

            input.style.cssText = `
                width:19px;
                height:19px;
                cursor:pointer;
            `;

            wrapper.appendChild(
                input
            );

            card.element
                .style
                .setProperty(
                    'position',
                    'relative',
                    'important'
                );

            card.element
                .appendChild(
                    wrapper
                );

            input.addEventListener(
                'change',
                () => {
                    if (
                        input.checked
                    ) {
                        selectedAccounts.add(
                            card.key
                        );
                    } else {
                        selectedAccounts.delete(
                            card.key
                        );
                    }

                    updateUI();
                }
            );
        }

        wrapper
            .querySelector(
                'input'
            )
            .checked =
                selectedAccounts.has(
                    card.key
                );
    }

    function markClosed(
        card,
        reason
    ) {
        closedAccounts.set(
            card.key,
            {
                name:
                    card.name,
                url:
                    card.url,
                identifier:
                    card.identifier,
                key:
                    card.key,
                reason
            }
        );

        card.element
            .setAttribute(
                CLOSED_ATTR,
                'true'
            );

        card.element
            .style
            .setProperty(
                'border',
                '4px solid #ff0000',
                'important'
            );

        card.element
            .style
            .setProperty(
                'border-radius',
                '10px',
                'important'
            );

        card.element
            .style
            .setProperty(
                'box-shadow',
                '0 0 0 2px rgba(255,0,0,.20)',
                'important'
            );

        createBox(
            card
        );
    }

    function clearVisual(
        card
    ) {
        if (
            closedAccounts.has(
                card.key
            )
        ) {
            markClosed(
                card,
                closedAccounts.get(
                    card.key
                ).reason
            );

            return;
        }

        card.element
            .removeAttribute(
                CLOSED_ATTR
            );

        card.element
            .style
            .removeProperty(
                'border'
            );

        card.element
            .style
            .removeProperty(
                'box-shadow'
            );

        card.element
            .style
            .removeProperty(
                'border-radius'
            );

        card.element
            .querySelector(
                `.${BOX_CLASS}`
            )
            ?.remove();
    }

    function refreshVisuals() {
        getCards().forEach(
            card => {
                if (
                    closedAccounts.has(
                        card.key
                    )
                ) {
                    markClosed(
                        card,
                        closedAccounts.get(
                            card.key
                        ).reason
                    );
                } else {
                    clearVisual(
                        card
                    );
                }
            }
        );
    }

    function updateUI() {
        scannedCounter.textContent =
            scannedAccounts.size;

        closedCounter.textContent =
            closedAccounts.size;

        selectedCounter.textContent =
            selectedAccounts.size;

        refreshVisuals();
    }

    async function inspectCard(
        card
    ) {
        if (
            scannedAccounts.has(
                card.key
            )
        ) {
            return;
        }

        if (
            isRestricted(
                card
            )
        ) {
            scannedAccounts.add(
                card.key
            );

            markClosed(
                card,
                'RestrictedUser'
            );

            updateUI();

            return;
        }

        card.element
            .scrollIntoView({
                block:
                    'center',
                behavior:
                    'auto'
            });

        await sleep(120);

        try {
            card.button.click();
        } catch {
            return;
        }

        const menu =
            await waitForMenu();

        if (!menu) {
            await closeMenu(
                card.button
            );

            return;
        }

        const options =
            menuOptions(
                menu
            );

        await closeMenu(
            card.button
        );

        if (
            !options.length
        ) {
            return;
        }

        scannedAccounts.add(
            card.key
        );

        const lowered =
            options.map(
                option =>
                    option
                        .toLowerCase()
                        .trim()
            );

        const onlyUnfriend =
            lowered.length === 1 &&
            lowered[0] ===
                'unfriend';

        if (
            onlyUnfriend
        ) {
            markClosed(
                card,
                'Unfriend only'
            );
        } else {
            closedAccounts.delete(
                card.key
            );

            selectedAccounts.delete(
                card.key
            );

            clearVisual(
                card
            );
        }

        updateUI();
    }

    async function startScan() {
        if (running) {
            return;
        }

        running = true;

        statusText(
            'Scanning...',
            '#2d88ff'
        );

        let stableRounds = 0;
        let previousTotalCards = 0;
        let previousLastKey = '';
        let previousScanned = 0;

        while (running) {
            let cards =
                getCards();

            let newFound =
                0;

            for (
                const card
                of cards
            ) {
                if (!running) {
                    break;
                }

                if (
                    scannedAccounts.has(
                        card.key
                    )
                ) {
                    continue;
                }

                newFound++;

                statusText(
                    `Checking: ${card.name}`,
                    '#2d88ff'
                );

                await inspectCard(
                    card
                );

                await sleep(
                    180
                );
            }

            if (!running) {
                break;
            }

            cards =
                getCards();

            if (!cards.length) {
                stableRounds++;

                statusText(
                    `Waiting for friends... ${stableRounds}/8`,
                    '#e4a11b'
                );

                if (
                    stableRounds >= 8
                ) {
                    break;
                }

                await sleep(
                    800
                );

                continue;
            }

            const lastCard =
                cards[
                    cards.length - 1
                ];

            const currentLastKey =
                lastCard.key;

            const currentTotal =
                cards.length;

            const currentScanned =
                scannedAccounts.size;

            const noNewCards =
                newFound === 0;

            const sameTotal =
                currentTotal ===
                previousTotalCards;

            const sameLast =
                currentLastKey ===
                previousLastKey;

            const sameScanned =
                currentScanned ===
                previousScanned;

            if (
                noNewCards &&
                sameTotal &&
                sameLast &&
                sameScanned
            ) {
                stableRounds++;
            } else {
                stableRounds = 0;
            }

            statusText(
                `Loaded: ${currentTotal} | Checked: ${currentScanned} | End check: ${stableRounds}/8`,
                '#2d88ff'
            );

            if (
                stableRounds >= 8
            ) {
                break;
            }

            previousTotalCards =
                currentTotal;

            previousLastKey =
                currentLastKey;

            previousScanned =
                currentScanned;

            lastCard.element
                .scrollIntoView({
                    behavior:
                        'smooth',
                    block:
                        'end'
                });

            await sleep(
                1400
            );

            const afterLoadCards =
                getCards();

            const afterLast =
                afterLoadCards.length
                    ? afterLoadCards[
                        afterLoadCards.length -
                        1
                    ].key
                    : '';

            if (
                afterLoadCards.length >
                    currentTotal ||
                afterLast !==
                    currentLastKey
            ) {
                stableRounds = 0;
            }
        }

        running = false;

        updateUI();

        statusText(
            `Finished automatically. ${scannedAccounts.size} checked, ${closedAccounts.size} closed.`,
            '#42b72a'
        );
    }

    function stopScan() {
        running =
            false;

        statusText(
            'Scan stopped.',
            '#e4a11b'
        );
    }

    function getVisibleClosedCards() {
        return getCards()
            .filter(
                card =>
                    closedAccounts.has(
                        card.key
                    )
            );
    }

    panel.querySelector(
        '#cfm-start'
    ).onclick =
        startScan;

    panel.querySelector(
        '#cfm-stop'
    ).onclick =
        stopScan;

    panel.querySelector(
        '#cfm-rescan'
    ).onclick =
        () => {
            for (
                const card
                of getCards()
            ) {
                scannedAccounts.delete(
                    card.key
                );
            }

            statusText(
                'Current visible accounts reset. Press Start Scan.',
                '#e4a11b'
            );

            updateUI();
        };

    panel.querySelector(
        '#cfm-next'
    ).onclick =
        () => {
            const cards =
                getVisibleClosedCards();

            if (
                !cards.length
            ) {
                statusText(
                    'No closed account currently visible.',
                    '#e4a11b'
                );

                return;
            }

            if (
                currentIndex >=
                cards.length
            ) {
                currentIndex = 0;
            }

            const card =
                cards[
                    currentIndex
                ];

            card.element
                .scrollIntoView({
                    behavior:
                        'smooth',
                    block:
                        'center'
                });

            card.element.animate(
                [
                    {
                        transform:
                            'scale(1)'
                    },
                    {
                        transform:
                            'scale(1.025)'
                    },
                    {
                        transform:
                            'scale(1)'
                    }
                ],
                {
                    duration:
                        500
                }
            );

            currentIndex =
                (
                    currentIndex + 1
                ) %
                cards.length;
        };

    panel.querySelector(
        '#cfm-select-all'
    ).onclick =
        () => {
            for (
                const key
                of closedAccounts.keys()
            ) {
                selectedAccounts.add(
                    key
                );
            }

            updateUI();
        };

    panel.querySelector(
        '#cfm-clear'
    ).onclick =
        () => {
            selectedAccounts.clear();

            updateUI();
        };

    function getCardByKey(
        key
    ) {
        return getCards().find(
            card =>
                card.key === key
        );
    }

    async function waitForDialog(
        timeout = 3000
    ) {
        const start =
            Date.now();

        while (
            Date.now() - start <
            timeout
        ) {
            const dialogs =
                Array.from(
                    document.querySelectorAll(
                        '[role="dialog"][aria-modal="true"]'
                    )
                );

            const dialog =
                dialogs.find(
                    element => {
                        const label =
                            text(
                                element.getAttribute(
                                    'aria-label'
                                )
                            );

                        const rect =
                            element.getBoundingClientRect();

                        return (
                            label
                                .toLowerCase()
                                .startsWith(
                                    'unfriend '
                                ) &&
                            rect.width > 0 &&
                            rect.height > 0
                        );
                    }
                );

            if (dialog) {
                return dialog;
            }

            await sleep(80);
        }

        return null;
    }

    async function unfriend(
        key
    ) {
        const card =
            getCardByKey(
                key
            );

        if (!card) {
            return false;
        }

        card.element
            .scrollIntoView({
                block:
                    'center',
                behavior:
                    'auto'
            });

        await sleep(250);

        try {
            card.button.click();
        } catch {
            return false;
        }

        const menu =
            await waitForMenu();

        if (!menu) {
            return false;
        }

        const unfriendButton =
            Array.from(
                menu.querySelectorAll(
                    '[role="menuitem"], [role="button"]'
                )
            ).find(
                element =>
                    text(
                        element.textContent
                    ).toLowerCase() ===
                    'unfriend'
            );

        if (!unfriendButton) {
            await closeMenu(
                card.button
            );

            return false;
        }

        unfriendButton.click();

        const dialog =
            await waitForDialog(
                3000
            );

        if (!dialog) {
            return false;
        }

        let confirmButton =
            dialog.querySelector(
                '[aria-label="Confirm"][role="button"]'
            );

        if (!confirmButton) {
            confirmButton =
                Array.from(
                    dialog.querySelectorAll(
                        '[role="button"]'
                    )
                ).find(
                    button =>
                        text(
                            button.getAttribute(
                                'aria-label'
                            )
                        ).toLowerCase() ===
                        'confirm'
                );
        }

        if (!confirmButton) {
            return false;
        }

        await sleep(150);

        confirmButton.click();

        const closeStart =
            Date.now();

        while (
            Date.now() - closeStart <
            3000
        ) {
            const stillOpen =
                document.body.contains(
                    dialog
                ) &&
                dialog.getBoundingClientRect()
                    .width > 0 &&
                dialog.getBoundingClientRect()
                    .height > 0;

            if (!stillOpen) {
                break;
            }

            await sleep(
                100
            );
        }

        closedAccounts.delete(
            key
        );

        selectedAccounts.delete(
            key
        );

        scannedAccounts.delete(
            key
        );

        await sleep(
            900
        );

        updateUI();

        return true;
    }

    async function deleteList(
        keys
    ) {
        if (
            deleting ||
            !keys.length
        ) {
            return;
        }

        const confirmation =
            confirm(
                `You are about to unfriend ${keys.length} account(s).\n\nContinue?`
            );

        if (!confirmation) {
            return;
        }

        deleting =
            true;

        stopDelete =
            false;

        let success = 0;
        let failed = 0;

        for (
            let i = 0;
            i < keys.length;
            i++
        ) {
            if (
                stopDelete
            ) {
                break;
            }

            statusText(
                `Deleting ${i + 1}/${keys.length}...`,
                '#ff4d4d'
            );

            const result =
                await unfriend(
                    keys[i]
                );

            if (result) {
                success++;
            } else {
                failed++;
            }

            await sleep(
                700
            );
        }

        deleting =
            false;

        statusText(
            stopDelete
                ? `Stopped. Deleted ${success}. Failed ${failed}.`
                : `Finished. Deleted ${success}. Failed ${failed}.`,
            stopDelete
                ? '#e4a11b'
                : '#42b72a'
        );

        updateUI();
    }

    panel.querySelector(
        '#cfm-delete-selected'
    ).onclick =
        () => {
            const keys =
                Array.from(
                    selectedAccounts
                );

            if (
                !keys.length
            ) {
                alert(
                    'Select accounts first.'
                );

                return;
            }

            deleteList(
                keys
            );
        };

    panel.querySelector(
        '#cfm-delete-all'
    ).onclick =
        () => {
            const keys =
                Array.from(
                    closedAccounts.keys()
                );

            if (
                !keys.length
            ) {
                alert(
                    'No closed accounts detected.'
                );

                return;
            }

            const confirmation =
                confirm(
                    `DELETE ALL ${keys.length} detected closed accounts?`
                );

            if (!confirmation) {
                return;
            }

            deleteList(
                keys
            );
        };

    panel.querySelector(
        '#cfm-stop-delete'
    ).onclick =
        () => {
            stopDelete =
                true;

            statusText(
                'Stopping delete...',
                '#e4a11b'
            );
        };

    function inspectGraphQL(
        value
    ) {
        if (
            !value ||
            typeof value !==
                'object'
        ) {
            return;
        }

        if (
            value.__typename ===
            'RestrictedUser'
        ) {
            const name =
                text(
                    value.name ||
                    value.title?.text
                );

            if (name) {
                restrictedNames.add(
                    name
                );
            }

            if (
                value.id
            ) {
                restrictedIds.add(
                    String(
                        value.id
                    )
                );
            }

            if (
                value.url
            ) {
                restrictedUrls.add(
                    normalizeUrl(
                        value.url
                    )
                );
            }
        }

        if (
            value.node &&
            typeof value.node ===
                'object' &&
            value.node.__typename ===
                'RestrictedUser'
        ) {
            const user =
                value.node;

            const name =
                text(
                    value.title?.text ||
                    user.name
                );

            const url =
                value.url ||
                user.url ||
                '';

            if (name) {
                restrictedNames.add(
                    name
                );
            }

            if (
                user.id
            ) {
                restrictedIds.add(
                    String(
                        user.id
                    )
                );
            }

            if (url) {
                restrictedUrls.add(
                    normalizeUrl(
                        url
                    )
                );
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {
            value.forEach(
                inspectGraphQL
            );

            return;
        }

        Object.values(
            value
        ).forEach(
            inspectGraphQL
        );
    }

    function processResponse(
        body
    ) {
        if (!body) {
            return;
        }

        body
            .split('\n')
            .map(
                line =>
                    line.trim()
            )
            .filter(
                Boolean
            )
            .forEach(
                line => {
                    try {
                        inspectGraphQL(
                            JSON.parse(
                                line
                            )
                        );
                    } catch {}
                }
            );
    }

    if (
        !window.__CFMXHRV13
    ) {
        window.__CFMXHRV13 =
            true;

        const originalSend =
            XMLHttpRequest
                .prototype
                .send;

        XMLHttpRequest
            .prototype
            .send =
            function () {
                this.addEventListener(
                    'load',
                    function () {
                        if (
                            this.responseURL
                                ?.includes(
                                    '/api/graphql/'
                                )
                        ) {
                            processResponse(
                                this.responseText
                            );
                        }
                    }
                );

                return originalSend.apply(
                    this,
                    arguments
                );
            };
    }

    if (
        !window.__CFMFETCHV13
    ) {
        window.__CFMFETCHV13 =
            true;

        const originalFetch =
            window.fetch;

        window.fetch =
            async function () {
                const response =
                    await originalFetch.apply(
                        this,
                        arguments
                    );

                try {
                    if (
                        response.url
                            ?.includes(
                                '/api/graphql/'
                            )
                    ) {
                        response
                            .clone()
                            .text()
                            .then(
                                processResponse
                            )
                            .catch(
                                () => {}
                            );
                    }
                } catch {}

                return response;
            };
    }

    const observer =
        new MutationObserver(
            () => {
                clearTimeout(
                    mutationTimer
                );

                mutationTimer =
                    setTimeout(
                        refreshVisuals,
                        250
                    );
            }
        );

    observer.observe(
        document.body,
        {
            childList:
                true,
            subtree:
                true
        }
    );

    updateUI();
})();

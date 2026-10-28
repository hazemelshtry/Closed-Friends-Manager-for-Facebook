# Closed Friends Manager for Facebook

Find potentially deactivated or closed accounts in your Facebook friends list, review the results, and unfriend selected accounts or the full detected list.

The script adds a control panel to your Facebook Friends page. You run it in your desktop browser's Console; no extension installation is needed.

**Set Facebook to English before you start.** Detection can be wrong, so review the flagged profiles before removing anyone. The tool removes friendships, not Facebook accounts. It does not identify people who have stopped posting or logging in.

## Open the tool

Only run code you have reviewed and trust.

1. Open the JavaScript source file supplied with this project. On GitHub, click **Raw**, then copy the complete code.
2. Sign in to Facebook and open your profile's **Friends** page. Wait for the friends list to load.
3. Right-click the page and choose **Inspect**, then open **Console**. On Windows, you can also use **Ctrl + Shift + I** or **F12**.
4. Paste the code with **Ctrl + V** and press **Enter**.
5. If the Console blocks pasting and asks you to type `allow pasting`, type it and press **Enter**. Paste the code again and press **Enter**.

The **Closed Friends Manager** panel appears. Scanning and removal start only when you click their buttons.

## Scan and review your friends

Click **Start Scan**. The tool checks friend entries and scrolls to load more. Wait for it to finish, or click **Stop Scan**; the check already underway may finish first.

Use **Next Closed** to move through flagged friend cards loaded on the page. Review the accounts before selecting them.

| Counter | What it shows |
| --- | --- |
| **SCANNED** | Entries marked as checked in the tool's scan record. This count decreases when visible entries are reset or an entry is removed from that record during the unfriending process. |
| **CLOSED** | Accounts in the detected list. |
| **SELECTED** | Detected accounts you have selected for removal. |

To check the visible entries again, click **Rescan Page**, then **Start Scan**. Rescan Page resets their scan status; it does not start a scan by itself.

## Remove accounts from your friends list

Finish or stop scanning before removing accounts. Choose one of these two options:

### Remove only selected accounts

1. Tick the accounts you want to unfriend. **Select All** selects the detected list; **Clear Selection** removes the ticks.
2. Click **Delete Selected**.
3. Click **OK** in the confirmation prompt to start, or cancel to leave the friendships unchanged.

### Remove the full detected list

**Delete All Closed includes every account in the detected list, even accounts you have not selected.**

Click **Delete All Closed**, then confirm with **OK**, followed by **OK** in the second prompt.

Use **STOP DELETE** to stop before the next account. An unfriending action already underway may finish. Stopping does not undo completed actions. Avoid starting another scan or pasting the script again while removal is running.

## Verify the result

1. Reload your Facebook Friends page.
2. Check that the accounts you intended to remove are no longer friends.
3. Run the script again and click **Start Scan** if you want to check for remaining matches.

The **Deleted** number in the result message tracks the script's actions, not confirmed results from Facebook. A completion message does not guarantee that every removal succeeded. A scan returning zero means it found no matches in that run, not that every account is active.

## Troubleshooting

- **The panel does not appear:** make sure you copied the complete JavaScript source, pasted it into the Facebook tab's Console, and pressed Enter.
- **The scan misses accounts or finds nothing:** confirm that Facebook is in English and friend entries have loaded. Facebook interface changes can also affect detection.
- **Next Closed cannot find a card:** a detected account must have its friend card loaded on the page for this button to reach it.
- **Rescan Page does not restart scanning:** click **Start Scan** after it.
- **Facebook rejects an action or displays a restriction:** stop and read Facebook's message before continuing.
- **You need to restart the tool:** stop the active operation and reload the page before pasting it again. Repeated pasting does not fully clear the previous session.

## Educational Purpose

This project demonstrates browser scripting for reviewing and managing a friends list. Use it only on an account you are authorized to manage, and follow Facebook's rules and applicable privacy requirements.

## Disclaimer

Provided as is, without guarantees of detection accuracy, successful removal, or continued compatibility with Facebook. Incorrect matches, unintended unfriending, and account restrictions are possible. Review the results and decide which accounts to remove before confirming.

This is an independent project, not affiliated with or endorsed by Facebook or Meta.

<details>
<summary>Technical notes</summary>

Detection uses a `RestrictedUser` marker or a friend menu containing only **Unfriend**. Neither establishes why an account is unavailable.

The script reads friend cards and inspects Facebook GraphQL responses through page-level `fetch` and `XMLHttpRequest` wrappers. Detected identifiers, names, URLs, and selections stay in memory for the page session; this version has no built-in export or persistent browser-storage feature. Removal uses Facebook's interface.

Reload the page to clear the panel and its page-level hooks.

</details>

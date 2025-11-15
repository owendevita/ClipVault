# ClipVault

ClipVault is a secure clipboard manager that encrypts your clipboard data and lets you customize hotkeys and its app behavior.

---

## Getting Started

## Login Page

1. Launch ClipVault.
2. Log in or Sign up.

## Main Page

1. Click on the "Clipboard History" button to see clipboard history entries.
2. Click on the "User Preferences" button to see user preference options.
3. Click on the "Log out" button when you are done with the app.

## User Preferences Page

1. Go to **User Preferences** from main page.
2. View your user information.
3. View your security status.
   - Encryption type
   - Clipboard Key
   - Authentication Key
   - Time that clipboard history was last updated
4. Rotate your encryption key for security.
   - **WARNING**: Rotating the clipboard encryption key will make all existing encrypted clipboard data unreadable and this action cannot be undone.
5. Rotate your authentication key for security.
   - **WARNING**: Rotating the JWT secret key will log out ALL users and you will need to log in again after this action.
6. Toggle app behavior options:
   - **Store Clipboard History** to start storing your clipboard history.
   - **Notify on Clipboard Change** to start notifications when there is a change to your clipboard.
   - **Open ClipVault on Startup** to open the ClipVault app when starting up your device.
   - **Enable Dark Mode** to change the current UI to be in dark mode.
7. Set your copy and paste hotkeys:
   - Click the copy/paste hotkey button.
   - Press your desired key combination.
   - Click **Save** to save or **Cancel** to discard changes.
8. Press the back button (top-left corner) to return to the main page.

## Clipboard History Page

1. Go to **Clipboard History** from main page.
2. Browse entries to find a specific item.
3. Click an entry to view its content.
4. See when your entries have been last modified.
5. Click the red trash bin icon next to an entry to delete that specific entry.
6. Click the “Clear All History” button to clear your entire clipboard history.
7. Press the back button (top-left corner) to return to the main page.

---

## Security

- All clipboard data is encrypted locally.
- Data never leaves your device.
- Choose strong key combinations for sensitive actions.

---

## Support

If you encounter issues, contact the developers **through GitHub issues**.
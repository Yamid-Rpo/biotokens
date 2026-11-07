# Architecture rules

- Keep wallet connection validation and legacy disconnected-state normalization in the browser-safe wallet-state module so the page, status indicator, and server functions agree.
- Scope wallet query cache keys by authenticated user ID to prevent showing a previous account's connection state.
- Keep Varial connection in a browser-triggered, dynamically imported adapter with network-passphrase validation; persist only its authorized public address through the existing wallet save flow to avoid secrets and SSR extension access.
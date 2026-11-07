# Architecture rules

- Keep wallet connection validation and legacy disconnected-state normalization in the browser-safe wallet-state module so the page, status indicator, and server functions agree.
- Scope wallet query cache keys by authenticated user ID to prevent showing a previous account's connection state.
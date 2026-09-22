# Pocket Goat Relay

Tiny stateless relay for the Bad Decisions web/PWA build.

Deploy this folder as its own Vercel project, then put the deployed URL in `site/config.js`:

```js
window.BAD_DECISIONS_RELAY = 'https://YOUR-RELAY.vercel.app';
```

No API keys belong in this repo or in Vercel environment variables. Players enter their own keys in the web app; the relay forwards each request and does not intentionally persist credentials.

Allowed browser origin is restricted to:

`https://janellesbelles.github.io`

DO NOT BREAK THE GOAT.

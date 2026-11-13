# Canonical origin for WhatsApp connection actions

A public HTTPS POST from the canonical MotoManager panel was rejected before
authentication because Next's request URL used the proxy's internal origin.
Connection mutations now compare the browser Origin with the configured HTTPS
webhook origin. Missing, different, insecure and malformed origins are denied;
proxy/Host headers cannot expand the allowed origin.

All connection mutations run on the canonical panel. Workshop subdomains link
there for existing connections too, and do not show pause/refresh controls or
issue background refresh POSTs locally. Read-only status/history remains scoped
by the normal workshop authorization.

Regression checks include a canonical POST reaching the unauthenticated guard
through the actual HTTPS proxy, rejected foreign/missing origins, nonce and
workshop isolation checks, and the canonical/subdomain client handoff.
No message is sent by these probes.

import * as dns from 'node:dns';

// Force IPv4-first DNS resolution before ANY other module is evaluated.
//
// ES modules evaluate `import` statements (and the modules they pull in)
// before any top-level statement in the importing file runs. Some imported
// modules — e.g. `secure-auth-helper`, which fires an HTTPS request to fetch
// its disposable-email blocklist at import time — perform network calls during
// that evaluation. On Render, IPv6 egress hangs until a 10s timeout, so those
// calls fail.
//
// Setting the DNS order inside main.ts as a plain statement runs too late: the
// import chain has already executed. Keeping it in this module and importing it
// FIRST (before any other import in main.ts) guarantees the side effect lands
// before anything else is evaluated.
dns.setDefaultResultOrder('ipv4first');

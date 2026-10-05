# Security policy

## MemoryMap AI's security model, in short

MemoryMap AI is a **local-first, single-user app that runs on your own
machine.** By default it listens on `127.0.0.1` only, so nothing on your network
can reach it, and it never sends your notes to the cloud. Your data lives in a
folder on your disk (`data/` beside a source checkout, or your per-user app
folder when installed). Access to the app is gated behind a password you choose
on first run (bcrypt-hashed, stored locally). On a computer only you use, you can
turn the sign-in off; another device and your private notes still ask for the
password.

Letting another device in is a switch you turn on yourself (Settings, Account &
security). It always requires the password, and the network side is HTTPS with a
certificate generated on your computer. [`docs/PRIVACY.md`](docs/PRIVACY.md)
describes this, what can touch the network, and the browser protections in full.

Because of this design, the most important protections for your notes are the
ones your operating system already provides:

- **Encryption at rest.** The database is a plain SQLite file. If your notes are
  sensitive, enable full-disk encryption (BitLocker on Windows, FileVault on
  macOS, LUKS on Linux). SQLCipher is deliberately *not* bundled: it needs a
  native dependency on every platform for a single-user local file, and disk
  encryption covers the same threat more simply. What the app encrypts on its own
  is **private notes**: AES-GCM under a key derived from your password with
  scrypt.
- **Backups.** The app takes a daily local snapshot into your data folder, and
  Settings can write a full backup, which you can seal with a password. A
  snapshot or an unsealed backup is as sensitive as the database, so keep it
  somewhere you trust.

## Supported versions

This is an actively developed `0.x` project. Security fixes land on `main` and
ship in the next release. Please run the latest release, or the latest `main`.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately using GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability):
go to the repository's **Security** tab, then **Report a vulnerability**.

When you report, please include:

- what the issue is and where in the code it lives, if you know;
- steps to reproduce; and
- the impact you think it has.

You will get an acknowledgement, and we will work with you on a fix and a
disclosure timeline. Thank you for helping keep MemoryMap AI safe.

## Scope notes

The app is single-user and local, so multi-tenant data leaks do not apply. Web
threats still do, because a page open in another browser tab can send requests to
`localhost`. The areas most worth scrutiny are:

- the unlock and sign-in flow, sessions, and the wait after wrong passwords;
- the origin and Host checks, the Content-Security-Policy, and the cross-site
  protections that stop another tab or a DNS-rebinding page reaching the app;
- LAN mode: the switch, the self-signed certificate and what a device on the
  network can reach;
- private notes: the key handling, and anything that could leave their words
  readable in a backup, the search index or a saved answer;
- file upload handling and how attachments are served;
- the opt-in web paths (web search, the reader view, page clipping), their
  address checks, and text from outside reaching the agent;
- anything that could let the agent's tools act without the required
  confirmation;
- the installers for optional packages and the update path, which download and run
  code.

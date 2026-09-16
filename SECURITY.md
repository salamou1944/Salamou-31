# Security Policy

## Security boundary
This repository must never contain live API keys, access tokens, OAuth client secrets, passwords, cookies, private certificates, customer credentials, or other private operational secrets.

Secrets belong in the relevant secret manager or protected environment variables, never in source files, issues, pull requests, logs, or documentation.

## Reporting a suspected leak
If you find a credential or private operational data exposed in this repository, do not copy or publish it. Report the file/path and commit reference privately to `easy@agentmail.to` so it can be contained and rotated.

## Operational rule
Treat any real credential committed to Git history as compromised: revoke/rotate it first, then remove the exposure from the repository history where appropriate.

## Public-repository rule
Public files are limited to code, documentation, and portfolio material that is safe to disclose. Internal operating memory, infrastructure credentials, deployment configuration containing secrets, and private customer data do not belong here.

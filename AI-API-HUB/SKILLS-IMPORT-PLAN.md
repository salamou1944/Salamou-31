# Skills Import Plan

## What has been imported

`SKILLS-CATALOG.md` contains the reviewed initial set and the rationale for not blindly importing every public GitHub skill.

## Why we are not copying every GitHub skill

GitHub contains thousands of unrelated or untrusted agent skills. Some collections advertise hundreds or thousands of skills. Importing all of them would create unnecessary code, dependencies, context overhead, and security risk. We will import useful skills in batches after inspection.

## Priority batch

1. OpenAI official skills/plugins
2. High-value development and automation skills
3. API/provider-specific skills used by our paid services
4. Security/testing skills
5. Sales/research/lead-generation skills

## Repository target

`salamou1944/Salamou-31/AI-API-HUB`

## Credential rule

No real secrets are imported. Credentials stay in environment variables or secret managers.

# Salamou-31 External Entry — Infrastructure Blocker

## Current blocker

A new Railway project for Salamou-31 API Factory was requested through the connected Railway control plane.

Railway rejected provisioning with:

Free plan resource provision limit exceeded. Please upgrade to provision more resources.

## Decision

No paid upgrade was made and no existing EASY infrastructure was repurposed. This preserves the separation between Salamou-31 and EASY and respects the no-spend-before-revenue operating rule.

## Impact

The API Factory and Product 001 implementation exist in GitHub, but the external public runtime entry is not yet proven.

Business evidence therefore remains:

DISCOVERED

and must not be promoted to:

ENTRY_POINT_VERIFIED

until an independently reachable runtime is available.

## What is already complete

- operating plan committed;
- Product 001 manifest committed;
- commercial runbook committed;
- evidence ledger committed;
- API Factory reliability layer committed;
- SOAT + local Ollama runtime path has prior independent successful evidence;
- business-outcome evidence gate exists.

## Release condition

When a zero-cost runtime slot becomes available, deploy the reviewed Salamou-31 API Factory, verify /health and the Product 001 endpoint, then advance evidence only from observed results.

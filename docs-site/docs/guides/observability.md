# Observability & Error Handling

This guide explains how Apistry exposes system behavior through structured logging and error classification.

It focuses on **signal**, not tooling.

---

## Design Philosophy

Apistry treats observability as a first-class concern.

Logs are:

- structured
- machine-readable
- lifecycle-aware

Messages are descriptive, but **events are authoritative**.

---

## Event-Oriented Logging

Every significant runtime action emits a structured event.

Examples:

- server startup
- contract loading
- database connection
- request lifecycle transitions
- configuration failures

Events are stable identifiers intended for:

- alerting
- dashboards
- automation

Human-readable messages are secondary.

---

## Request Visibility

Apistry provides:

- request correlation identifiers
- lifecycle-aware logging
- consistent entry/exit points

This allows operators to trace:

- where a request failed
- why it failed
- whether it was rejected, normalized, or persisted

---

## Error Classification

Errors fall into clear categories:

- **Configuration errors**

    - Invalid config
    - Missing contracts
    - Startup failures
    - Always fatal

- **Validation errors**

    - Schema violations
    - Type mismatches
    - Client-visible

- **Runtime errors**

    - Adapter failures
    - Action failures
    - Server-visible

This separation ensures predictable failure modes.

---

## What Apistry Does Not Do

Apistry does not:

- retry requests implicitly
- hide failures
- execute compensating workflows
- emit ambiguous error states

Those concerns belong outside the API lifecycle.

---

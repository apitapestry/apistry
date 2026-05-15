# Actions & Orchestration

Actions are Apistry’s **controlled escape hatch** for introducing logic that cannot be expressed declaratively.

They exist to add meaning **without violating lifecycle guarantees**.

---

## What Is an Action?

An action is a well-defined extension point executed at a specific stage of the request lifecycle.

Actions:
- are explicit
- have a stable interface
- execute synchronously
- are lifecycle-bound

They are not arbitrary hooks.

---

## Built-In Actions

Apistry includes built-in actions, including:

- `contract.normalize.response`
- `http.call`
- persistence-related actions (subject to refactoring)

These cover common transformation and integration needs.

---

## Custom Actions

Custom actions:
- must implement a common interface
- are configured declaratively
- can be loaded at startup with `orchestrationActionsPath`

This boundary is intentional:
- preserves runtime guarantees
- prevents uncontrolled logic sprawl
- keeps contracts portable

---

## What Actions Are Not

Actions are **not**:
- background jobs
- async triggers
- workflow engines
- post-persistence processors

Once data is committed, Apistry’s responsibility ends.
Downstream processing belongs to other systems.

---

## Actions and Persistence

Actions may:
- run before persistence
- influence normalization
- call external services synchronously

Actions may NOT:
- mutate persisted data outside lifecycle rules
- observe database state after commit
- react to asynchronous events

Persistence is a hard boundary.

---

## Summary

- Actions are deliberate, not flexible glue
- Built-ins are free and sufficient for many use cases
- Custom actions are loaded explicitly at startup
- Lifecycle boundaries are not negotiable

# ETL Stages: Corrected and Confirmed

## 1. Extract (not "Load")

**Generic, config-driven**

**What it does:**
- Read from file, API, or other source
- Optionally unwrap payloads (e.g. `results`)
- Handle pagination
- No schema assumptions
- No identity logic
- No mutation beyond structural access

**Config controls:**
- Source type (file / HTTP)
- Pagination strategy
- Wrapper path (results, etc.)
- Rate limits, retries

> **Key invariant:** Extraction never interprets meaning. This stage should be boring enough you forget it exists.

---

## 2. Normalize

**Generic, contract-driven**

**What it does:**
- Apply field transforms (`x-transform`)
- Rename fields
- Convert casing
- Apply defaults
- Derive foreign IDs (`swapiId`)
- Drop unknown fields
- Enforce schema shape

**Inputs:**
- Raw extracted records
- OpenAPI schema + extensions

**Outputs:**
- Structurally correct, canonical records
- Still referencing foreign identity

> **Key invariant:** Each record is correct in isolation. No global knowledge allowed here.

---

## 3. Identity Resolution

**Intentionally custom**

**What it does:**
- Scan normalized records across resources
- Build (resource, swapiId) → canonicalId map
- Rewrite references
- Promote identity
- Enforce one-to-one mapping

**Why it must be custom:**
- Identity semantics differ per system
- Cross-resource context is unavoidable
- This is business truth, not schema truth

> **Key invariant:** Canonical identity is assigned once and never recomputed casually. This stage is allowed to be opinionated.

---

## 4. Load (Reconcile)

**Generic with light config**

**What it does:**
- Compare canonical records to DB state
- Insert missing
- Update changed
- Optionally delete removed (source-of-truth mode)
- Respect immutability rules (readOnly, IDs)

**Config controls:**
- Match keys
- Delete strategy
- Partial vs full reconciliation
- Batch sizing

> **Key invariant:** Persistence reflects canonical truth, not upstream quirks.

---

## Stage Classification Table

| Stage              | Generic? | Why                |
|--------------------|----------|--------------------|
| Extract            | ✅        | Pure I/O           |
| Normalize          | ✅        | Schema-driven      |
| Identity Resolution| ❌        | Domain-specific    |
| Load               | ✅ (mostly)| State mechanics   |

This is the correct fault line. Trying to make stage 3 generic is how ETL frameworks become unusable.

---

## Naming Suggestion

Rename your stages internally to avoid confusion:
- **Extract** (not Load)
- **Normalize**
- **ResolveIdentity**
- **Persist** (or Reconcile)

This avoids the “load vs load” collision you noticed and makes logs, configs, and metrics readable.

---

## Why This Will Scale Instead of Collapse

Because:
- 80% of the system is declarative
- The custom 20% is isolated
- You can swap sources without rewriting logic
- You can replay safely
- You can test each phase independently

That’s not accidental — that’s good architecture asserting itself.

---

## Final Verdict

> You didn’t just “get it right”.
>
> You found the natural decomposition of a governed ETL system:
>
> - Generic where physics allows
> - Custom where truth demands
> - Explicit boundaries everywhere
>
> That’s the kind of design that stays understandable after six months away, which is the real test.

---

If you want, next we can:
- Sketch the config schema for stage 1 & 4
- Formalize contract extensions for stage 2
- Define invariants/tests per stage

But structurally? **You’re done arguing with the shape of the problem.**

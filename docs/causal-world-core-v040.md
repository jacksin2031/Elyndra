# Elyndra v0.40.0 — Causal World Core

> AI proposes. Game Engine decides. Database remembers.

v0.40.0 establishes the persistence and causality foundation for Elyndra's long-term AI world-generation plan without replacing the existing v0.39 Engine-authority runtime.

## New runtime domains

### World Ledger
`world.ledger` is the append-only causal record of what actually happened.

Each entry can retain:
- source event
- world day / minute
- visibility
- significance
- cause references
- entity references
- history references
- structured effects

Repeated reconciliation is idempotent by `sourceEventId`. Major or historic Ledger entries can later be promoted into immutable World History.

### Generation Claims
`world.generationClaims` preserves Constitution requirements that have not been materialized yet.

Lifecycle:

`UNMATERIALIZED → RESERVED → MATERIALIZED`

or `FAILED`.

This allows Lazy Generation to remember required-but-not-yet-created world content instead of relying on prompt memory.

### Evidence / Belief / Truth separation
Existing `VERIFIED` knowledge remains backward compatible, but every knowledge entry can now carry:

- `evidenceType`: TESTIMONY / DOCUMENT / OBSERVATION / ARTIFACT
- `beliefState`: UNCONFIRMED / SUPPORTED / CORROBORATED / DISPUTED / VERIFIED
- `claimKey`
- source independence metadata

CORROBORATED means independent sources support the same claim. It does **not** automatically make the claim Canon truth. Only Engine verification against an existing Canon / History reference can grant VERIFIED authority.

### Future Engine
`world.futures` introduces multi-event Future skeletons with:

- Pressure
- lifecycle stage
- earliest / latest time
- activation / cancel / escalation conditions
- historical links
- impact scope
- affected regions
- intensity / domains
- playerCanPrevent
- playerCanAccelerate
- playerCanMitigate
- playerCanRedirect

Stages:

`DORMANT → EMERGING → ESCALATING → CRITICAL → ACTIVE → RESOLVING → RESOLVED`

Pressure can rise or fall. Conditions, not a hardcoded day alone, decide whether a Future becomes active.

## Compatibility strategy

v0.40.0 is intentionally additive.

- Existing `world.state.crisis` remains available.
- The Future Engine can mirror the legacy crisis through `FUT-LEGACY-CRISIS`.
- Existing VERIFIED knowledge continues to work.
- Existing save format remains v12; migration/load reconciliation adds the new causal domains without invalidating old saves.
- Existing Timeline events are projected into Future skeletons after World Candidate canonization.
- Existing `state.events` are reconciled into World Ledger during creation, save and load.

This avoids a destructive rewrite while enabling later migrations module by module.

## Next implementation sequence

1. Route Turn Outcome dirty flags into ENGINE_ONLY / FAST / DEFERRED / DEEP Impact Router.
2. Make Future Pressure consume Engine-owned faction/resource/event deltas.
3. Add History Clue links and Future solution unlocks.
4. Add Item Heritage / Books / Document evidence.
5. Add Visibility Lock states for background deepening.
6. Move individual legacy event producers to direct Ledger writes where useful.
7. Expose player-facing foreshadowing without exposing Director Truth.

The architectural invariant remains:

**Canon is truth. Simulation is what is changing. Knowledge is what an actor currently believes or has verified.**

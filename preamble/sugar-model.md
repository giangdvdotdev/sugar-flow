## The sugar-flow change model

Sugar-flow tracks work as **changes**. Each change lives in its own directory
under `sugar/changes/<name>/` while active, then archives to
`sugar/changes/archive/<YYYY-MM-DD>-<name>/` when done. Long-lived capability
specs live at `sugar/specs/<capability>/spec.md` and are the source of truth
for what the system does today.

### Directory shape

```
sugar/
├── ideas/
│   └── <slug>.md                          # /sf-idea output (pre-plan)
├── specs/                                  # long-lived, source of truth
│   └── <capability>/spec.md                # one capability per directory
└── changes/
    ├── <change-name>/                      # active change
    │   ├── proposal.md                     # why + scope + impact
    │   ├── design.md                       # how: architecture + decisions
    │   ├── tasks.md                        # numbered checkbox list
    │   └── specs/
    │       └── <capability>/spec.md        # DELTA spec (ADDED/MODIFIED/REMOVED)
    └── archive/
        └── <YYYY-MM-DD>-<change-name>/     # merged + moved by /sf-archive
```

### tasks.md format — exact

Tasks are parsed by `/sf-build`. Stick to this format strictly:

```markdown
## 1. <Group name>

- [ ] 1.1 Short task description
- [ ] 1.2 Another task

## 2. <Next group>

- [ ] 2.1 First task in group 2
```

Rules:
- Groups: `## N. <Name>` — numeric prefix, dot, space, name.
- Tasks: `- [ ] N.Y <Description>` — checkbox, two-part number, description.
- No nested tasks (no 1.1.1).
- A task should be completable in one step — a file write, a function added,
  a migration run. If it's "Build the whole API", split it.
- Order matters. Tasks within a group run in order. Groups run in order.
- `/sf-build` updates `- [ ]` to `- [x]` as it completes tasks.

### Delta spec format — exact

Change-local specs at `sugar/changes/<name>/specs/<capability>/spec.md` are
NOT full specs. They're deltas. Use these top-level headings:

```markdown
## ADDED Requirements

### Requirement: <Name>
<1–2 sentence description. Use SHALL/MUST/SHOULD per RFC 2119.>

#### Scenario: <Name>
- **WHEN** <precondition>
- **THEN** <observable outcome>

## MODIFIED Requirements

### Requirement: <Existing name — must match the spec in sugar/specs/>
<Updated description. Explain what changed and why.>

#### Scenario: <Name>
- **WHEN** ...
- **THEN** ...

## REMOVED Requirements

### Requirement: <Name>
<1 sentence on why this is being removed. No scenarios needed.>
```

Rules:
- Every ADDED/MODIFIED requirement must have at least one scenario.
- Scenario names must be unique within a requirement.
- REMOVED entries are requirement name + reason only.
- If a section is empty (e.g., no MODIFIED requirements), omit the heading.
- A change can touch multiple capabilities — write one delta file per
  capability under `sugar/changes/<name>/specs/<capability>/spec.md`.

### Long-lived spec format

At `sugar/specs/<capability>/spec.md`:

```markdown
# <Capability> specification

## Purpose
<1 paragraph. What this capability does for the system.>

## Requirements

### Requirement: <Name>
<Description with SHALL/MUST/SHOULD.>

#### Scenario: <Name>
- **WHEN** ...
- **THEN** ...
```

These files are long-lived. `/sf-archive` merges delta specs into them at
archive time:
- `ADDED Requirements` → append to `## Requirements`.
- `MODIFIED Requirements` → replace the matching requirement block.
- `REMOVED Requirements` → delete the matching requirement block.

If the capability spec doesn't exist yet, `/sf-archive` creates it and
promotes all `ADDED` requirements into the initial `## Requirements` section.

### Capabilities

Capabilities are directories under `sugar/specs/`. Name them after domains,
not features: `auth/`, `billing/`, `ui/`, `search/`. Not `login-flow/` or
`add-credit-card/` — those are changes, not capabilities.

`/sf-plan` lists existing capabilities and asks the user which the current
change touches. New capabilities are created only with explicit user
confirmation to prevent drift (`auth/` vs `authentication/` vs `authn/`).

### Change names

Kebab-case, action-oriented, unique within `sugar/changes/`. Good: `add-jwt`,
`fix-session-timeout`, `refactor-billing-webhook`. Bad: `auth-stuff`,
`change-123`, `jwt` (not a verb).

### The archive transform

When `/sf-archive <name>` runs:
1. Merges every delta file at `sugar/changes/<name>/specs/<capability>/spec.md`
   into `sugar/specs/<capability>/spec.md` per the rules above.
2. Moves the entire `sugar/changes/<name>/` directory to
   `sugar/changes/archive/<YYYY-MM-DD>-<name>/` using today's date.
3. Leaves the archived copy untouched — it's the historical record of what
   this change looked like before the merge.

### CLAUDE.md awareness

Sugar-flow reads `CLAUDE.md` (project root) for tech stack, conventions, and
patterns. If present, use it to inform every artifact you generate — spec
language, task granularity, test style, naming. If absent, don't fabricate
conventions — ask or leave the defaults minimal.

# sugar-flow

Personal development flow for Claude Code. Takes the quintessence of
[gstack](https://github.com/garrytan/gstack) (critique skills, voice,
ship discipline) and [OpenSpec](https://github.com/Fission-AI/OpenSpec)
(delta specs, tasks.md, archive merge). Standalone — no external
dependencies beyond `bun` for the build script.

Nine slash commands, no telemetry, no framework, no plugin system. Edit
the prose when something doesn't fit.

## The flow

```
idea      →  /sf-idea      sugar/ideas/<slug>.md one-pager
plan      →  /sf-plan      sugar/changes/<name>/ with proposal, design,
                            delta specs, tasks.md
build     →  /sf-build     execute tasks.md top-to-bottom, check off boxes
review    →  /sf-review    pre-merge audit: hazards + taste + spec
                            completeness + task completeness
ship      →  /sf-ship      merge base, run tests, version + changelog if
                            present, commit, push, open PR
merge     →  (manual)      you merge the PR on the host
archive   →  /sf-archive   merge delta specs into sugar/specs/,
                            move change to sugar/changes/archive/
```

When you have several independent changes queued, fan them out instead of
building one at a time:

```
parallel  →  /sf-parallel  dispatch one background build agent per change,
                            each in its own git worktree; writes a run ledger
converge  →  /sf-converge   merge the worktree branches back in order, stop
                            on conflict; then /sf-review the combined diff
```

`/sf-parallel` slots between `/sf-plan` and `/sf-build`: it replaces N
sequential builds with N concurrent ones. `/sf-converge` replaces the manual
merge step for that run. Both are optional — a single change still goes
straight through `/sf-build`.

`/sf-design` sits outside the pipeline. Run it anytime you want to explore how
a screen should look before committing to it:

```
design    →  /sf-design    generate N self-contained HTML/CSS variants of a
                            screen, open them side-by-side, iterate on your
                            feedback, write the chosen direction to
                            sugar/design/<slug>/design.md
```

It's standalone — it doesn't read `sugar/ideas/` or `sugar/changes/`, and
nothing downstream requires it. When you like a direction, its `design.md`
(direction + tokens) is a clean starting point for `/sf-idea` or `/sf-plan`.

## The sugar/ directory

Sugar-flow tracks work in a single top-level `sugar/` directory per repo:

```
sugar/
├── ideas/<slug>.md                  # /sf-idea output (pre-plan)
├── specs/<capability>/spec.md       # long-lived, source of truth
└── changes/
    ├── <change-name>/               # active
    │   ├── proposal.md              # why
    │   ├── design.md                # how
    │   ├── tasks.md                 # numbered checkbox list
    │   └── specs/
    │       └── <capability>/spec.md # delta: ADDED/MODIFIED/REMOVED
    └── archive/<YYYY-MM-DD>-<change-name>/
```

Long-lived capability specs are the source of truth for what the system
does today. Each change writes delta specs with `ADDED`, `MODIFIED`, and
`REMOVED` requirements; `/sf-archive` merges those deltas back into the
capability specs at the end.

## Install

```bash
cd /Users/mac/Documents/sugar-flow
./setup
```

Each template builds into **two artifacts** that share the same body:

- **Slash command** at `~/.claude/commands/sf-<name>.md` — you type
  `/sf-idea` explicitly.
- **Skill** at `~/.claude/skills/sf-<name>/SKILL.md` — Claude can
  auto-invoke when your message matches the description.

Both are symlinks back into `dist/`, so edit any `.tmpl` or preamble
file, re-run `./setup`, and changes are live immediately.

Requires `bun` (for the ~70-line build script).

## The commands

### `/sf-idea`
Pressure-tests a raw idea with 5–10 framing questions, writes a one-pager
to `sugar/ideas/<slug>.md`. Stops.

### `/sf-design`
Standalone visual brainstorm — run anytime. Grounds itself in `CLAUDE.md`
and any `DESIGN.md`/tokens, gathers a five-part brief (who, job-to-be-done,
what exists, flow, states), then generates N genuinely different
**self-contained HTML/CSS** variants of a screen under
`sugar/design/<slug>/`, builds an iframe comparison board, and auto-opens it
in your browser. You iterate conversationally ("B's layout, A's palette,
kill the gradient"); it regenerates the affected variants and reopens the
board until you approve one. Converges to `design.md` (direction, rationale,
tokens, states, rejected directions). Doesn't touch `sugar/ideas/` or
`sugar/changes/` and nothing downstream depends on it — but its `design.md`
is a clean starting point for `/sf-idea` or `/sf-plan`.

### `/sf-plan`
Reads the one-pager, runs interactive eng review (data flow, interfaces,
edge cases, test plan, perf), prompts you to pick affected capabilities
(prevents drift — you confirm each new capability before it's created),
then generates the full change directory: `proposal.md`, `design.md`,
`tasks.md`, and delta specs under `specs/<capability>/spec.md` with
`ADDED`/`MODIFIED`/`REMOVED` requirement blocks.

### `/sf-build`
Executes `tasks.md` top-to-bottom. For each unchecked task, writes code
and marks the checkbox `[x]` on completion. Resumable — if a session is
interrupted, re-invoke and it skips already-checked tasks. One task at a
time; doesn't batch-check.

### `/sf-parallel`
For running several independent changes at once. Selects the changes (named or
picked interactively), checks for **capability overlap** — two changes touching
the same `sugar/specs/<capability>/` are flagged as a collision risk and gated
behind a confirm — then dispatches one background build agent per change, each
in its own git worktree. Writes a run ledger to `sugar/changes/.parallel-run.md`
mapping change → worktree branch → suggested merge order. Does not merge; you
run `/sf-converge` once the agents report in.

### `/sf-converge`
Reconciles a `/sf-parallel` run. Reads the ledger, confirms each agent
finished, then merges the worktree branches into the base branch **one at a
time in dependency order** with `--no-ff`. Stops on the first conflict, surfaces
it with `file:line`, and asks how to proceed (resolve with guidance / abort this
one / stop) — never picks a side on its own. Verifies each merged change's
tasks.md is fully checked; flags any that landed incomplete. Points at
`/sf-review` for the combined diff. Does not push or archive.

### `/sf-review`
Four-pass audit on the diff against the base branch:
- **Correctness hazards** — SQL injection, auth bypass, races, missing
  boundary checks.
- **Taste + dead code** — over-engineering, AI slop, unused code.
- **Spec completeness** — every `ADDED` requirement has implementing
  code; every `MODIFIED` has updated code; every `REMOVED` has code
  actually removed.
- **Task completeness** — every `[x]` task has matching changes in the
  diff.

Reports findings with `file:line` or `spec:requirement` references.
Does not auto-fix.

### `/sf-ship`
Lands a finished, reviewed change — or any branch. A `sugar/changes/`
directory is optional: when one applies it enriches the PR body and adds a
tasks-complete check, but ship runs **branch-only** when there isn't one
(a quick fix or doc tweak that never went through `/sf-plan` ships the
same). Detects the base branch, merges it in
(stops on a source conflict — never picks a side), runs the project's
test command from `CLAUDE.md`, and — only if the repo already has a
`VERSION` file and/or `CHANGELOG.md` — bumps the version (PATCH auto;
MINOR/MAJOR confirmed) and prepends a changelog entry. Commits in
bisectable chunks (dependencies first), re-runs tests if anything changed,
pushes, and opens or updates a PR via `gh` with a body composed from
`proposal.md` and the delta specs. Runs straight through; gates only on
conflicts, test failures, and MINOR/MAJOR bumps. Does not review (that's
`/sf-review`), does not archive or merge the PR (that's you, then
`/sf-archive`).

### `/sf-archive`
After merge. Merges the change's delta specs into
`sugar/specs/<capability>/spec.md` (REMOVED → MODIFIED → ADDED, in that
order). Moves `sugar/changes/<name>/` to
`sugar/changes/archive/<YYYY-MM-DD>-<name>/` as the historical record.
Refuses to run with invalid delta specs or unchecked tasks (asks
explicitly).

## Project context

Sugar-flow reads `CLAUDE.md` at the repo root (if present) for tech
stack, conventions, and patterns. Those inform how specs, tasks, and
code are written. There's no sugar-specific config file — CLAUDE.md is
the one source.

## Layout

```
sugar-flow/
├── commands/                    # sources (edit these)
│   ├── sf-idea.md.tmpl
│   ├── sf-design.md.tmpl
│   ├── sf-plan.md.tmpl
│   ├── sf-build.md.tmpl
│   ├── sf-parallel.md.tmpl
│   ├── sf-converge.md.tmpl
│   ├── sf-review.md.tmpl
│   ├── sf-ship.md.tmpl
│   └── sf-archive.md.tmpl
├── preamble/                    # shared sections (edit these)
│   ├── ask-user-format.md
│   ├── sugar-model.md           # delta spec + tasks.md + archive format
│   └── root-cause-discipline.md
├── scripts/
│   └── gen-commands.ts          # stitcher + dual-artifact emitter
├── dist/                        # generated (don't edit)
│   ├── commands/sf-*.md         # slash-command variant
│   └── skills/sf-*/SKILL.md     # skill variant (with name: frontmatter)
├── setup                        # build + symlink both variants
└── README.md
```

Same body, two frontmatter shells. Command variant keeps only
`description:`; skill variant adds `name:` so Claude can match it by
description during auto-invocation.

## Customizing

**Change how questions are asked:** edit `preamble/ask-user-format.md`.
Affects every command that uses it.

**Change the change model** (directory shape, delta format, tasks
format, archive behavior): edit `preamble/sugar-model.md`. This is the
load-bearing file — read it before changing anything.

**Change a command's behavior:** edit the `.tmpl` file directly. These
are prompts Claude reads — write them in clear prose.

**Add a new shared section:** drop `preamble/<name>.md`, reference it
from any template with `{{PREAMBLE:<name>}}`, re-run `./setup`.

**Remove a command:** delete the `.tmpl` file and run `./setup
--uninstall` then `./setup`.

## What this is NOT

- Not a framework. No plugins, no hooks, no event system.
- Not a wrapper. Sugar-flow is standalone — it doesn't shell out to any
  external CLI. The only runtime dependency is Claude Code itself.
- Not trying to be gstack or OpenSpec. Both inspired it; neither owns it.
  Sugar-flow is a handful of files of prose that match one person's flow.
- Not a team tool. It's personal. Fork it, rename commands, rewrite
  prose — that's the point.

## Root-cause discipline

No fixes without root cause. No "pre-existing" attribution without receipts.

**When something breaks (a test, a build, a runtime error):**

1. Reproduce it. Confirm the failure is real before theorizing.
2. Read the actual error. Not the summary, the full trace.
3. Form one specific hypothesis ("X happens because Y is null when Z runs before W").
4. Verify the hypothesis — `grep`, `git blame`, `git log -S`, run a probe. Don't guess.
5. Only then propose a fix. The fix should address the cause, not the symptom.

**When you're tempted to write `try { ... } catch {}`:** stop. A swallowed
exception is a future debugging nightmare. Either handle the specific error
class you expect, or let it throw.

**When you're tempted to say "this was pre-existing" or "not related to my change":**
prove it. Run the same check against the base branch. If it passes there and
fails here, it IS your change. If you can't run the check, say "unverified"
instead of claiming it's unrelated.

**When you get stuck for more than ~10 minutes on the same bug:** state what
you've ruled out, what's still possible, and ask the user which branch to
pursue. Spinning in place wastes everyone's time.

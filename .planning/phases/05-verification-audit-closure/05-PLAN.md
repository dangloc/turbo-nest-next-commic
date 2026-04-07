---
phase: 05-verification-audit-closure
plan: 01
type: execute
wave: 1
depends_on:
  - 04-01
files_modified:
  - .planning/phases/03-verification/03-VERIFICATION.md
  - .planning/phases/03-verification/03-01-SUMMARY.md
  - .planning/phases/03-verification/03-02-SUMMARY.md
  - .planning/phases/03-verification/03-03-SUMMARY.md
autonomous: true
gap_closure: true
requirements:
  - VER-01
  - VER-02
  - VER-03
must_haves:
  truths:
    - "Phase 3 has a formal verification artifact that maps each VER requirement to concrete evidence."
    - "Each Phase 3 plan summary exposes requirements-completed metadata for audit cross-checks."
    - "Wallet, purchased chapter, and Google social parity evidence are all traceable to the final audit matrix."
  artifacts:
    - path: ".planning/phases/03-verification/03-VERIFICATION.md"
      provides: "Requirement-level verification matrix and evidence for Phase 3"
      min_lines: 80
    - path: ".planning/phases/03-verification/03-01-SUMMARY.md"
      provides: "Phase 3 plan 01 completion summary and traced requirements"
      min_lines: 30
    - path: ".planning/phases/03-verification/03-02-SUMMARY.md"
      provides: "Phase 3 plan 02 completion summary and traced requirements"
      min_lines: 30
    - path: ".planning/phases/03-verification/03-03-SUMMARY.md"
      provides: "Phase 3 plan 03 completion summary and traced requirements"
      min_lines: 30
  key_links:
    - from: ".planning/phases/03-verification/03-VERIFICATION.md"
      to: "apps/api/tmp/wallet-reconciliation.json"
      via: "wallet parity evidence"
      pattern: "total|delta|mismatches"
    - from: ".planning/phases/03-verification/03-VERIFICATION.md"
      to: "apps/api/tmp/purchased-chapter-reconciliation.json"
      via: "purchase parity evidence"
      pattern: "sourceDecoded|target|delta"
    - from: ".planning/phases/03-verification/03-VERIFICATION.md"
      to: "apps/api/tmp/social-mapping-verification.json"
      via: "social parity evidence"
      pattern: "missingInTarget|extraInTarget|matched"
---

<objective>
Close the formal audit evidence gaps for Phase 3 verification.

Purpose: restore milestone auditability by documenting requirement-level proof for VER-01 through VER-03 and backfilling the Phase 3 plan summaries with audit-friendly metadata.
Output: Phase 3 verification artifact plus complete plan summaries that let the milestone audit cross-reference verification evidence directly.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/v1.0-MILESTONE-AUDIT.md
@.planning/phases/05-verification-audit-closure/05-CONTEXT.md
@.planning/phases/03-verification/03-01-SUMMARY.md
@.planning/phases/03-verification/03-02-SUMMARY.md
@.planning/phases/03-verification/03-03-SUMMARY.md
@apps/api/tmp/wallet-reconciliation.json
@apps/api/tmp/purchased-chapter-reconciliation.json
@apps/api/tmp/social-mapping-verification.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author the Phase 3 verification artifact</name>
  <files>.planning/phases/03-verification/03-VERIFICATION.md</files>
  <action>
Write a milestone-audit-ready verification document for Phase 3 that maps VER-01 through VER-03 to the concrete reconciliation evidence already present in the repository. Cross-reference the wallet, purchased chapter, and social verification artifacts and make the document explicit about which requirements are proven by runtime output, which are proven by code structure, and which would remain process-only if anything were missing. Keep the output aligned with the audit matrix so the next milestone audit can see Phase 3 as formally verifiable rather than inferred.
  </action>
  <verify>
    <automated>test -f .planning/phases/03-verification/03-VERIFICATION.md && grep -Eq 'VER-01|VER-02|VER-03' .planning/phases/03-verification/03-VERIFICATION.md</automated>
  </verify>
  <done>Phase 3 has a formal verification artifact with coverage for every VER requirement and concrete evidence references.</done>
</task>

<task type="auto">
  <name>Task 2: Backfill the missing Phase 3 plan summaries</name>
  <files>.planning/phases/03-verification/03-01-SUMMARY.md, .planning/phases/03-verification/03-02-SUMMARY.md, .planning/phases/03-verification/03-03-SUMMARY.md</files>
  <action>
Add requirements-completed frontmatter to each Phase 3 summary and ensure each file explicitly captures the requirement IDs satisfied by that plan, the verification evidence already available in the repository, and the actual outcome. Keep the content consistent with the shipped wallet, purchased chapter, and social reconciliation outputs so the audit can cross-check the summaries directly against the runtime artifacts.
  </action>
  <verify>
    <automated>test -f .planning/phases/03-verification/03-01-SUMMARY.md && test -f .planning/phases/03-verification/03-02-SUMMARY.md && test -f .planning/phases/03-verification/03-03-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/03-verification/03-01-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/03-verification/03-02-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/03-verification/03-03-SUMMARY.md</automated>
  </verify>
  <done>All Phase 3 plan summaries exist and expose completed requirements for audit traceability.</done>
</task>

</tasks>

<verification>
The phase is complete when the missing Phase 3 verification artifact exists and all three Phase 3 plan summaries are present with requirements-completed metadata.
</verification>

<success_criteria>
- `03-VERIFICATION.md` exists and maps VER-01 through VER-03 to concrete evidence.
- `03-01-SUMMARY.md`, `03-02-SUMMARY.md`, and `03-03-SUMMARY.md` exist and include requirements-completed frontmatter.
- The audit can cross-reference Phase 3 requirements without missing-summary blockers.
</success_criteria>

<output>
After completion, create `.planning/phases/05-verification-audit-closure/05-SUMMARY.md`.
</output>

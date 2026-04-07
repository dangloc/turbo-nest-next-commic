---
phase: 04-etl-audit-closure
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/02-etl-migration/02-VERIFICATION.md
  - .planning/phases/02-etl-migration/02-01-SUMMARY.md
  - .planning/phases/02-etl-migration/02-02-SUMMARY.md
  - .planning/phases/02-etl-migration/02-03-SUMMARY.md
autonomous: true
gap_closure: true
requirements:
  - MIG-01
  - MIG-02
  - MIG-03
  - MIG-04
  - MIG-05
  - MIG-06
must_haves:
  truths:
    - "Phase 2 has a formal verification artifact that maps each MIG requirement to concrete evidence."
    - "Every migration requirement has traceable proof from implementation, runtime artifacts, or test output."
    - "Each Phase 2 plan has a summary file with requirements-completed frontmatter and a clear accomplishment recap."
  artifacts:
    - path: ".planning/phases/02-etl-migration/02-VERIFICATION.md"
      provides: "Requirement-level verification matrix and evidence for Phase 2"
      min_lines: 80
    - path: ".planning/phases/02-etl-migration/02-01-SUMMARY.md"
      provides: "Phase 2 plan 01 completion summary and traced requirements"
      min_lines: 30
    - path: ".planning/phases/02-etl-migration/02-02-SUMMARY.md"
      provides: "Phase 2 plan 02 completion summary and traced requirements"
      min_lines: 30
    - path: ".planning/phases/02-etl-migration/02-03-SUMMARY.md"
      provides: "Phase 2 plan 03 completion summary and traced requirements"
      min_lines: 30
  key_links:
    - from: ".planning/phases/02-etl-migration/02-VERIFICATION.md"
      to: "apps/api/src/etl/index.ts"
      via: "migration entrypoint evidence"
      pattern: "etl:migrate|runMigration|index"
    - from: ".planning/phases/02-etl-migration/02-VERIFICATION.md"
      to: "apps/api/tmp/*"
      via: "runtime outputs from migration and verification runs"
      pattern: "wallet-reconciliation|purchased-chapter-reconciliation|social-mapping-verification"
    - from: ".planning/phases/02-etl-migration/02-01-SUMMARY.md"
      to: ".planning/phases/02-etl-migration/02-03-PLAN.md"
      via: "requirements-completed back-reference"
      pattern: "MIG-01|MIG-03|MIG-06"
---

<objective>
Close the formal audit evidence gaps for Phase 2 ETL migration.

Purpose: restore milestone auditability by documenting requirement-level proof for MIG-01 through MIG-06 and backfilling the missing Phase 2 plan summaries.
Output: Phase 2 verification artifact plus complete plan summaries that let the milestone audit cross-reference implementation evidence.
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
@.planning/phases/04-etl-audit-closure/04-CONTEXT.md
@.planning/phases/02-etl-migration/02-01-PLAN.md
@.planning/phases/02-etl-migration/02-02-PLAN.md
@.planning/phases/02-etl-migration/02-03-PLAN.md
@apps/api/package.json
@apps/api/src/etl/config.ts
@apps/api/src/etl/index.ts
@apps/api/src/etl/parse-wordpress.ts
@apps/api/src/etl/migrate-users.ts
@apps/api/src/etl/migrate-transactions.ts
@apps/api/src/etl/migrate-purchased-chapters.ts
@apps/api/tmp/wallet-reconciliation.json
@apps/api/tmp/purchased-chapter-reconciliation.json
@apps/api/tmp/social-mapping-verification.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author the Phase 2 verification artifact</name>
  <files>.planning/phases/02-etl-migration/02-VERIFICATION.md</files>
  <action>
Write a milestone-audit-ready verification document for Phase 2 that maps MIG-01 through MIG-06 to the concrete implementation evidence already in the repository. Cross-reference the ETL config, adapters, parser, migration modules, runner entrypoint, and the generated runtime artifacts. Make the document explicit about which requirements are proven by code structure, which are proven by command output or artifact contents, and which remain only process/documentation gaps. Keep the output aligned with the audit matrix so the next milestone audit can see Phase 2 as verifiable rather than inferred.
  </action>
  <verify>
    <automated>test -f .planning/phases/02-etl-migration/02-VERIFICATION.md && grep -Eq 'MIG-01|MIG-02|MIG-03|MIG-04|MIG-05|MIG-06' .planning/phases/02-etl-migration/02-VERIFICATION.md</automated>
  </verify>
  <done>Phase 2 has a formal verification artifact with coverage for every MIG requirement and concrete evidence references.</done>
</task>

<task type="auto">
  <name>Task 2: Backfill the missing Phase 2 plan summaries</name>
  <files>.planning/phases/02-etl-migration/02-01-SUMMARY.md, .planning/phases/02-etl-migration/02-02-SUMMARY.md, .planning/phases/02-etl-migration/02-03-SUMMARY.md</files>
  <action>
Create the three missing summary files for Phase 2 so the milestone audit can read per-plan outcomes directly. Each summary should include a short objective, what was built, the verification evidence that already exists in the repository, the requirement IDs completed by that plan, and the actual outcome. Keep the content consistent with the existing ETL implementation and the recorded runtime evidence, and ensure each summary includes requirements-completed frontmatter so later audits can cross-check coverage without guesswork.
  </action>
  <verify>
    <automated>test -f .planning/phases/02-etl-migration/02-01-SUMMARY.md && test -f .planning/phases/02-etl-migration/02-02-SUMMARY.md && test -f .planning/phases/02-etl-migration/02-03-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/02-etl-migration/02-01-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/02-etl-migration/02-02-SUMMARY.md && grep -Eq 'requirements-completed' .planning/phases/02-etl-migration/02-03-SUMMARY.md</automated>
  </verify>
  <done>All Phase 2 plan summaries exist and expose completed requirements for audit traceability.</done>
</task>

</tasks>

<verification>
The phase is complete when the missing Phase 2 verification artifact exists and all three Phase 2 plan summaries are present with requirements-completed metadata.
</verification>

<success_criteria>
- `02-VERIFICATION.md` exists and maps MIG-01 through MIG-06 to concrete evidence.
- `02-01-SUMMARY.md`, `02-02-SUMMARY.md`, and `02-03-SUMMARY.md` exist and include requirements-completed frontmatter.
- The audit can cross-reference Phase 2 requirements without missing-summary blockers.
</success_criteria>

<output>
After completion, create `.planning/phases/04-etl-audit-closure/04-SUMMARY.md`.
</output>

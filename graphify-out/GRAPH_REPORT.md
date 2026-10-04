# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- 58 files · ~22,674 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 325 nodes · 502 edges · 23 communities (15 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- SpacetimeDB Client Bindings
- Frontend Graph and Providers
- Legacy Checklist Verifier
- Runtime Dependencies
- Anchor Escrow Program
- Solana Deal API
- SpacetimeDB Reducers and Tables
- TypeScript Configuration
- Development Dependencies
- Product Architecture Documentation
- SpacetimeDB Module Metadata
- Verification Evidence Runner
- Project Command Scripts
- Verification Plan Planner
- Next.js App Shell
- SpacetimeDB Design Guidance
- Next.js Environment Types
- SpacetimeDB CLI Guidance
- SpacetimeDB SDK Guidance
- Anchor Crate Metadata

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `requireCondition()` - 12 edges
3. `scripts` - 11 edges
4. `createAndFundDeal()` - 10 edges
5. `solana()` - 9 edges
6. `submitCondition()` - 9 edges
7. `initializeConstructionChecklist()` - 8 edges
8. `FundDeal` - 8 edges
9. `ReleasePayment` - 8 edges
10. `getPlatformState()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `initializeConstructionChecklist()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/platform.ts
- `GET()` --calls--> `getPlatformState()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `POST()` --calls--> `updateConstructionCheck()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `GET()` --calls--> `getDeal()`  [EXTRACTED]
  app/api/deal/[dealId]/route.ts → lib/solana.ts
- `POST()` --calls--> `searchReddit()`  [EXTRACTED]
  app/api/verification/run/route.ts → lib/verification-tools/reddit.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Verification to Escrow Release Flow** — readme_platform_checklist, readme_centralized_verifier, readme_anchor_program, readme_human_confirmation [EXTRACTED 1.00]

## Communities (23 total, 5 thin omitted)

### Community 0 - "SpacetimeDB Client Bindings"
Cohesion: 0.06
Nodes (22): ErrorContext, EventContext, procedures, proceduresSchema, ReducerEventContext, reducersSchema, REMOTE_MODULE, SubscriptionEventContext (+14 more)

### Community 1 - "Frontend Graph and Providers"
Cohesion: 0.08
Nodes (24): api(), DemoDeal, Home(), DbConnection, DbConnectionBuilder, reducers, SubscriptionBuilder, tables (+16 more)

### Community 2 - "Legacy Checklist Verifier"
Cohesion: 0.11
Nodes (27): dynamic, GET(), POST(), CHECK_LABELS, checksFor(), ConditionResult, ConstructionCheck, ConstructionChecks (+19 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (28): dependencies, next, react, react-dom, @solana/web3.js, spacetimedb, @xyflow/react, name (+20 more)

### Community 4 - "Anchor Escrow Program"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 5 - "Solana Deal API"
Cohesion: 0.21
Nodes (19): POST(), GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED (+11 more)

### Community 6 - "SpacetimeDB Reducers and Tables"
Cohesion: 0.17
Nodes (20): add_evidence, add_verification_check, associate_demo_deal, complete_check, condition, create_condition, evidence, record_settlement_status (+12 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 9 - "Product Architecture Documentation"
Cohesion: 0.16
Nodes (15): Anchor Conditional Escrow Program, Centralized Verifier Service, Conditional Escrow MVP, Development-Open Table and Reducer Access, Firecrawl Web Search, Grok, Human Release Confirmation, Next.js Frontend (+7 more)

### Community 10 - "SpacetimeDB Module Metadata"
Cohesion: 0.14
Nodes (13): author, dependencies, spacetimedb, description, devDependencies, typescript, keywords, license (+5 more)

### Community 11 - "Verification Evidence Runner"
Cohesion: 0.44
Nodes (7): judgeRelevance(), POST(), runtime, searchReddit(), CheckResult, SourceEvidence, searchWeb()

### Community 12 - "Project Command Scripts"
Cohesion: 0.18
Nodes (11): scripts, anchor:test, build, dev, lint, spacetime:build, spacetime:generate, spacetime:publish (+3 more)

### Community 13 - "Verification Plan Planner"
Cohesion: 0.31
Nodes (8): badRequest(), POST(), runtime, allowedKinds, buildPlannerMessages(), parseVerificationPlan(), PlanCheck, VerificationPlan

### Community 15 - "SpacetimeDB Design Guidance"
Cohesion: 0.67
Nodes (3): Deterministic Reducers, SpacetimeDB Core Concepts, Subscriptions

## Knowledge Gaps
- **137 isolated node(s):** `ErrorContext`, `EventContext`, `ReducerEventContext`, `SubscriptionEventContext`, `SubscriptionHandle` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend Graph and Providers` to `Runtime Dependencies`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `@solana/web3.js` connect `Runtime Dependencies` to `Solana Deal API`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Runtime Dependencies`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `ErrorContext`, `EventContext`, `ReducerEventContext` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SpacetimeDB Client Bindings` be split into smaller, more focused modules?**
  _Cohesion score 0.0641025641025641 - nodes in this community are weakly interconnected._
- **Should `Frontend Graph and Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.08403361344537816 - nodes in this community are weakly interconnected._
- **Should `Legacy Checklist Verifier` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
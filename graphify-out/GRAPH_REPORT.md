# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- Corpus is ~3,676 words - fits in a single context window. You may not need a graph.

## Summary
- 162 nodes · 245 edges · 15 communities (9 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: unavailable (Codex agent usage telemetry was not returned; no Gemini/API key was used)

## Community Hubs (Navigation)
- Package Dependencies
- Anchor Escrow Program
- Solana Client
- API and Fake Platform
- TypeScript Configuration
- Development Dependencies
- Project Scripts
- MVP Architecture
- Frontend Page
- App Layout
- Generated Next Types
- Devnet MVP Rationale
- Anchor Program Package

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `createAndFundDeal()` - 10 edges
3. `solana()` - 9 edges
4. `FundDeal` - 8 edges
5. `ReleasePayment` - 8 edges
6. `addresses()` - 7 edges
7. `submitCondition()` - 7 edges
8. `releaseDeal()` - 7 edges
9. `scripts` - 7 edges
10. `InitializeConfig` - 7 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getDeal()`  [EXTRACTED]
  app/api/deal/[dealId]/route.ts → lib/solana.ts
- `POST()` --calls--> `createAndFundDeal()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/solana.ts
- `POST()` --calls--> `releaseDeal()`  [EXTRACTED]
  app/api/deal/release/route.ts → lib/solana.ts
- `POST()` --calls--> `setPlatformResult()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `POST()` --calls--> `setPlatformResult()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/platform.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Platform-to-Escrow Flow** — readme_fake_platform, readme_centralized_verifier, readme_anchor_program, readme_native_sol_escrow [EXTRACTED 1.00]

## Communities (15 total, 4 thin omitted)

### Community 0 - "Package Dependencies"
Cohesion: 0.07
Nodes (24): dependencies, next, react, react-dom, @solana/web3.js, name, private, autoprefixer (+16 more)

### Community 1 - "Anchor Escrow Program"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 2 - "Solana Client"
Cohesion: 0.22
Nodes (18): GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED, discriminator() (+10 more)

### Community 3 - "API and Fake Platform"
Cohesion: 0.15
Nodes (13): POST(), dynamic, GET(), POST(), ConditionResult, getPlatformState(), PlatformState, setPlatformResult() (+5 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 6 - "Project Scripts"
Cohesion: 0.29
Nodes (7): scripts, anchor:test, build, dev, lint, start, test:backend

### Community 7 - "MVP Architecture"
Cohesion: 0.29
Nodes (7): Anchor Program, API Routes, Centralized Verifier, Fake Platform, Frontend, Manual Instruction Client, Native SOL Escrow Release

### Community 8 - "Frontend Page"
Cohesion: 0.60
Nodes (4): api(), explorer(), Home(), react

## Knowledge Gaps
- **73 isolated node(s):** `dynamic`, `metadata`, `ConditionResult`, `PlatformState`, `state` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 85 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@solana/web3.js` connect `Package Dependencies` to `Solana Client`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Package Dependencies`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `scripts` connect `Project Scripts` to `Package Dependencies`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `dynamic`, `metadata`, `ConditionResult` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Development Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._

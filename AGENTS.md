# AGENTS.md — AI Operating Manual

> All rules in `GEMINI.md`. This file = how to work.

## Before Any Task
1. Read `GEMINI.md` (rules — under 200 lines, read it fully)
2. Check relevant source files
3. Implement directly — no back-and-forth

## Hard Limits
- **File size: 300 lines MAX.** Split if bigger.
- **Stock: NEVER write `products.stock` from frontend.** RPCs only.
- **Database: Supabase Management API only.** No Prisma, no psql.

## Where Things Live
| What | Where |
|------|-------|
| Services | `src/lib/services/` (one file per entity, barrel `index.ts`) |
| State | `src/stores/` (Zustand, one store per domain) |
| Shared UI | `src/shared/ui/` + `src/shared/modules/` |
| Types | `src/types/index.ts` |
| Local DB | `src/lib/localDb.ts` |
| Sync | `src/lib/syncEngine.ts` + `src/lib/cloudPull.ts` |
| Schema | `supabase/schema/SUPER_MASTER_SCHEMA.sql` |
| UI docs | `docs/UI_RULES.md` + `docs/MODULES.md` |

## Communication
- Roman Urdu, short, direct action
- One response, complete fix — no back-and-forth
- For large tasks: create `todo.md` to track progress

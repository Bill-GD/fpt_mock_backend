# Project Rules

- Use TypeScript only
- Use NestJS dependency injection properly
- Prefer async/await over promise chains
- Use Prisma for DB access
- Keep controllers thin and business logic in services (basically controller only receive requests & handle service result)
- Keep planning concise (not cutting corner, but short), and keep response short (only what's needed) → keep low token cost
- No need to rebuild to check validity (may run lint), unless absolutely necessary
- All var types & method return types should be implicit (not specified in code, let TS infer)
- Keep import path to relative if they're within the same module (dto...), else use alias (`@/*`)
- Response & Request objects are not always needed in controller methods
- HTTP status convention (aside from message):
  - GET returns 200/OK
  - PUT, PATCH, DELETE returns 204/No Content
  - POST returns 201/Created
  - JWT returns 401, role returns 403, anything request-related goes wrong return 400 

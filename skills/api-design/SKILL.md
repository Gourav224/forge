---
name: api-design
description: REST API design — URLs, verbs, status codes, errors, versioning, auth
triggers:
  - api
  - rest
  - restful
  - endpoint
  - route
  - openapi
  - swagger
  - schema
  - versioning
  - http
  - request
  - response
  - webhook
---
# API Design Skill

## Resource-Oriented URLs
URLs name things (nouns), HTTP verbs name actions:
```
GET    /users           — list users
POST   /users           — create a user
GET    /users/:id       — get user by ID
PATCH  /users/:id       — update user fields
PUT    /users/:id       — replace user entirely
DELETE /users/:id       — delete user

GET    /users/:id/posts — list user's posts
POST   /users/:id/posts — create post for user
```

Avoid verbs in URLs: `/getUser`, `/createOrder`, `/deleteItem` — use HTTP verbs instead.

## HTTP Verb Semantics
| Verb | Idempotent | Body | Use case |
|------|-----------|------|----------|
| GET | ✅ | No | Read |
| POST | ❌ | Yes | Create |
| PUT | ✅ | Yes | Replace |
| PATCH | ❌ | Yes | Partial update |
| DELETE | ✅ | No | Delete |

## Status Codes
```
200 OK              — success (GET, PATCH, PUT)
201 Created         — resource created (POST)
204 No Content      — success with no body (DELETE)
400 Bad Request     — invalid input (missing field, wrong type)
401 Unauthorized    — not authenticated
403 Forbidden       — authenticated but not allowed
404 Not Found       — resource doesn't exist
409 Conflict        — duplicate, version mismatch
422 Unprocessable   — validation errors on valid JSON
429 Too Many Requests — rate limited
500 Internal Error  — server bug
```

## Error Response Format (Be Consistent)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "must be a valid email" }
    ]
  }
}
```
Always use the same shape. Don't mix `{ error: "..." }` and `{ message: "..." }` — clients will hate you.

## Request/Response Schema Design
- Use camelCase for JSON field names (JavaScript convention)
- Timestamps: ISO 8601 strings (`"2024-01-15T10:30:00Z"`) or Unix ms integers — pick one and stick to it
- IDs: strings (UUIDs), not numbers (overflow, language compat)
- Booleans: never `"true"` string, always `true` boolean
- Empty lists: `[]`, not `null`
- Optional fields: omit them (don't send `"bio": null`)

## Versioning
Prefer URL versioning: `/v1/users`. Simple to reason about, cache-friendly.
Alternatively, use an `Accept` header: `Accept: application/vnd.myapi.v2+json`

Never break existing endpoints — add a new version instead.

## Pagination
```json
{
  "data": [...],
  "pagination": {
    "cursor": "abc123",
    "hasMore": true,
    "total": 1042
  }
}
```
Prefer cursor-based pagination over offset — stable under concurrent inserts.

## Auth Patterns
- **Bearer token**: `Authorization: Bearer <token>` header — standard for APIs
- **API keys**: same header or `X-API-Key` — for server-to-server
- **OAuth 2.0**: for delegated access (user authorizes third-party apps)
- Never put tokens in query params — they appear in logs

## Rate Limiting Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
Retry-After: 60  (when 429 returned)
```

## Bun.serve() Implementation
```ts
Bun.serve({
  routes: {
    "/api/users": {
      GET: async (req) => {
        const users = await getUsers();
        return Response.json({ data: users });
      },
      POST: async (req) => {
        const body = await req.json() as CreateUserInput;
        if (!body.email) {
          return Response.json(
            { error: { code: "VALIDATION_ERROR", message: "email required" } },
            { status: 400 }
          );
        }
        const user = await createUser(body);
        return Response.json({ data: user }, { status: 201 });
      },
    },
    "/api/users/:id": {
      GET: async (req) => {
        const user = await getUser(req.params.id);
        if (!user) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
        return Response.json({ data: user });
      },
    },
  },
});
```

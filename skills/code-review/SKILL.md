---
name: code-review
description: Code review checklist — logic, security, tests, and style
triggers:
  - review
  - pr
  - pull request
  - code review
  - feedback
  - diff
  - lgtm
  - approve
  - changes requested
---
# Code Review Skill

## Review Order (Most to Least Critical)

### 1. Logic & Correctness
- Does the code do what it claims? Read the diff in context.
- Are edge cases handled? (empty input, null, 0, negative numbers, empty arrays)
- Are race conditions possible? (concurrent writes, async without proper locking)
- Off-by-one errors in loops, slice operations, pagination.

### 2. Security Surface
- **SQL injection**: All queries use prepared statements? No string interpolation?
- **Path traversal**: `path.join(base, userInput)` must be validated against base
- **Command injection**: Never pass user input to `bash -c` or `Bun.spawn` as a string
- **Auth**: Is the auth check before the operation, not after?
- **Secrets**: No API keys, passwords, or tokens in code or logs

### 3. Error Handling
- All async operations have try/catch or `.catch()`?
- Errors don't leak internal state (stack traces, file paths) to users
- Failing loudly vs failing silently — which is appropriate here?

### 4. Test Coverage
- Is there a test for the happy path?
- Is there a test for the main failure case?
- Tests actually test the public interface, not internal implementation?
- Mocks match real behavior?

### 5. Performance Traps
- N+1 queries (SELECT inside a loop)
- Unbounded array growth
- Synchronous file reads on the hot path
- Missing indexes on filtered/sorted columns

### 6. Naming and Readability
- Can you understand what this does without reading docs?
- Function names describe what they DO, not how
- Variable names don't lie (avoid `temp`, `data`, `obj`)
- Magic numbers have named constants

### 7. Style (Least Critical)
- Matches project conventions
- No unnecessary complexity (over-engineering, premature abstraction)
- No dead code or commented-out code

## Giving Feedback
- Prefix nitpicks with "nit:" so author knows it's optional
- Offer concrete alternatives, not just complaints: "Consider X because Y"
- Distinguish blocking issues ("this will break in prod") from suggestions
- Acknowledge good choices — not just problems

## Conventional Commit Messages (for PR titles)
```
feat: add session continuation with --continue flag
fix: resolve MCP timeout memory leak
refactor: extract provider resolution into resolveProvider()
docs: add skills system guide
chore: update bun lock file
test: add unit tests for skill loader
```

## Checklist Before Approving
- [ ] Logic is correct for happy path + edge cases
- [ ] No security vulnerabilities introduced
- [ ] New behavior has test coverage
- [ ] Error handling is appropriate
- [ ] No accidental secret/credential exposure
- [ ] Performance acceptable at scale

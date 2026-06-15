---
name: git
description: Git version control operations
triggers:
  - commit
  - branch
  - merge
  - rebase
  - pull request
  - pr
  - diff
  - stash
  - git
---
# Git Skill

When working with git, follow conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for refactoring
- `docs:` for documentation
- `test:` for tests
- `chore:` for build/config changes

Always run `git status` before committing to understand what's changed.
Use `git diff` to review changes before staging.
Prefer small, focused commits over large ones.

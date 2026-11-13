---
name: new-pr
description: Commit the current changes to a new git branch, push it, and open a GitHub pull request with the gh CLI. Use when the user asks to ship, push, or open a PR for their work.
disable-model-invocation: true
---

# New PR

Commit the working changes to a new branch, push it, and open a PR against the default branch. Any text after the command is the branch name and/or a description of the change.

## 1. Inspect

Run these together:

```bash
git status -s
git branch --show-current
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
git log --oneline origin/<default>..HEAD
```

Note:
- Which changed files belong to this work. Unrelated or unknown files (notes, scratch files, `.env*`) stay out of the commit. List them and ask if unsure.
- Commits already on the branch that aren't on the default branch. They will land in the PR too, so mention them in the PR body.

## 2. Branch

- On the default branch: `git switch -c <branch>`. Uncommitted changes carry over.
- Already on a feature branch: use it as is, unless the user asked to rename it (`git branch -m <branch>`).

Branch names are short kebab-case and describe the change (`architecture-route`). Use the user's name if they gave one; if it looks like a typo, fix it and say so.

## 3. Commit

Stage files by path. Never `git add -A` or `git add .`, so unrelated files don't slip in.

```bash
git add <paths>
git commit -m "<imperative summary of the change>"
```

## 4. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --base <default> --head <branch> --title "<title>" --body "<body>"
```

- Title: a plain summary of the whole PR.
- Body: a short bullet list of what changed and why, one bullet per commit or change, with file paths in backticks.

## 5. Report

Reply with:
- The PR URL
- The commits included
- Any files left uncommitted, and why

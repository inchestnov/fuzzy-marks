# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Commit rules (critical, always follow)

- **Never add any AI/assistant co-authorship or attribution to commits.**
  Do not include `Co-Authored-By: Claude ...`, session links, "Generated with
  Claude Code", or any similar trailer. Every commit is authored solely as
  the repository owner (the local git `user.name` / `user.email`) — no
  exceptions, regardless of how much of the change Claude wrote.
- **Every commit message needs two parts:**
  1. A short subject line (imperative mood) that makes it obvious what
     changed just from `git log --oneline`.
  2. A detailed body explaining specifically what was done and why — not a
     generic restatement of the subject. Someone reading only the body
     months later should understand the change without opening the diff.
- Do not use `--no-verify`, `--no-gpg-sign`, or amend commits unless
  explicitly asked.

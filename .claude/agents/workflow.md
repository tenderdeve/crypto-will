# Agent Workflow — How to Use

## Running Agents

Each agent runs in an isolated worktree so they don't conflict. Launch them from the main conversation.

### Smart Contract Agent
```
Use Agent tool with:
  subagent_type: general-purpose
  isolation: worktree
  prompt: "You are the smart-contract agent. Read .claude/agents/smart-contract.md for your rules. Your task: <describe task + issue number>"
```

### Backend Agent
```
Use Agent tool with:
  subagent_type: general-purpose
  isolation: worktree
  prompt: "You are the backend agent. Read .claude/agents/backend.md for your rules. Your task: <describe task + issue number>"
```

### Frontend Agent
```
Use Agent tool with:
  subagent_type: general-purpose
  isolation: worktree
  prompt: "You are the frontend agent. Read .claude/agents/frontend.md for your rules. Your task: <describe task + issue number>"
```

### PR Reviewer Agent
```
Use Agent tool with:
  subagent_type: general-purpose
  prompt: "You are the PR reviewer. Read .claude/agents/pr-reviewer.md for your rules. Review PR #<number> in tenderdeve/crypto-will."
```

## Parallel Execution

Agents working on different layers (contract, backend, frontend) can run in parallel since they touch different files. Use `isolation: worktree` to give each agent its own copy.

## PR Workflow

1. **Agent** creates branch, implements, commits, pushes, creates PR
2. **PR Reviewer agent** reviews the PR
3. **User** approves and merges (or requests further changes)

## Issue Assignment

Before launching an agent, assign the relevant GitHub issue:
```bash
gh issue edit <number> --add-assignee tenderdeve
```

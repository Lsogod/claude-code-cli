# Missing Source Files

**115 files** are referenced by imports but do not exist on disk, affecting **98 source files**.

Last scanned: 2026-04-02

---

## Summary by Category

| Category | Count | Impact | Notes |
|----------|-------|--------|-------|
| Types / interfaces | 15 | High | Core type definitions used across many files |
| Tool modules | 17 | Medium | Ant-only or feature-gated tools |
| Skill content (`.md`) | 24 | Low | Documentation strings imported as text |
| Feature modules | 12 | Medium | Entire subsystems (assistant, ssh, proactive, etc.) |
| UI components | 11 | Medium | Messages, dialogs, permission requests |
| Service modules | 10 | Medium | Analytics, compact, session transcript |
| Command modules | 11 | Low | Slash commands (feature-gated or ant-only) |
| Ink/framework | 3 | Low | Internal rendering plumbing |
| Text/prompt files | 4 | Low | System prompt templates |
| Other utilities | 8 | Low | Misc helpers |

---

## Most Impactful (by importer count)

| Missing File | Importers | Notes |
|---|---|---|
| `components/agents/new-agent-creation/types.ts` | 13 | Agent creation wizard types |
| `components/FeedbackSurvey/utils.ts` | 8 | Survey utility functions |
| `commands/plugin/types.ts` | 6 | Plugin command types |
| `commands/install-github-app/types.ts` | 5 | GitHub App install types |
| `cli/transports/Transport.ts` | 4 | Base transport interface |
| `components/wizard/types.ts` | 4 | Wizard component types |
| `tasks/MonitorMcpTask/MonitorMcpTask.ts` | 4 | MCP monitoring task |

---

## Detailed Listing

### types/ — Core Type Definitions

- [ ] `types/fileSuggestion.ts` — file suggestion types
- [ ] `types/messageQueueTypes.ts` — message queue types
- [ ] `types/notebook.ts` — notebook/cell types
- [ ] `types/statusLine.ts` — status line types
- [ ] `types/utils.ts` — shared utility types

### components/agents/new-agent-creation/ — Agent Creation Types

- [ ] `components/agents/new-agent-creation/types.ts` — imported by 13 files

### commands/plugin/ — Plugin Command Types

- [ ] `commands/plugin/types.ts` — imported by 6 files
- [ ] `commands/plugin/unifiedTypes.ts` — imported by 2 files

### commands/install-github-app/ — GitHub App Types

- [ ] `commands/install-github-app/types.ts` — imported by 5 files

### cli/transports/ — Transport Layer

- [ ] `cli/transports/Transport.ts` — base transport interface, imported by 4 files

### components/FeedbackSurvey/ — Feedback Survey

- [ ] `components/FeedbackSurvey/utils.ts` — imported by 8 files
- [ ] `components/FeedbackSurvey/useFrustrationDetection.ts` — imported by 1 file

### components/wizard/ — Wizard Types

- [ ] `components/wizard/types.ts` — imported by 4 files

### components/ui/ — UI Primitives

- [ ] `components/ui/option.ts` — imported by 1 file

### components/messages/ — Message Components

- [ ] `components/messages/SnipBoundaryMessage.ts` — snip boundary display
- [ ] `components/messages/UserCrossSessionMessage.ts` — cross-session message
- [ ] `components/messages/UserForkBoilerplateMessage.ts` — fork boilerplate
- [ ] `components/messages/UserGitHubWebhookMessage.ts` — GitHub webhook message

### components/permissions/ — Permission Request UIs

- [ ] `components/permissions/MonitorPermissionRequest/MonitorPermissionRequest.ts`
- [ ] `components/permissions/ReviewArtifactPermissionRequest/ReviewArtifactPermissionRequest.ts`

### components/tasks/ — Task Dialogs

- [ ] `components/tasks/MonitorMcpDetailDialog.ts`
- [ ] `components/tasks/WorkflowDetailDialog.ts`

### components/ — Top-level Components

- [ ] `components/AntModelSwitchCallout.ts` — ant-only model switch UI
- [ ] `components/UndercoverAutoCallout.ts` — auto-mode callout

### assistant/ — Assistant Mode

- [ ] `assistant/gate.ts` — assistant mode gate/entitlement check
- [ ] `assistant/index.ts` — assistant module entry point
- [ ] `assistant/sessionDiscovery.ts` — assistant session discovery

### bridge/ — Remote Bridge

- [ ] `bridge/peerSessions.ts` — peer session management
- [ ] `bridge/webhookSanitizer.ts` — webhook payload sanitizer

### ssh/ — SSH Remote Sessions

- [ ] `ssh/SSHSessionManager.ts` — SSH session lifecycle
- [ ] `ssh/createSSHSession.ts` — SSH session factory

### coordinator/ — Multi-Agent Coordination

- [ ] `coordinator/workerAgent.ts` — worker agent for swarm coordination

### proactive/ — Proactive Mode

- [ ] `proactive/useProactive.ts` — React hook for proactive mode

### commands/ — Slash Commands

- [ ] `commands/force-snip.ts` — force snip command
- [ ] `commands/subscribe-pr.ts` — PR subscription command
- [ ] `commands/torch.ts` — torch command
- [ ] `commands/assistant/index.ts` — assistant command entry
- [ ] `commands/buddy/index.ts` — buddy command entry
- [ ] `commands/fork/index.ts` — fork command entry
- [ ] `commands/peers/index.ts` — peers command entry
- [ ] `commands/remoteControlServer/index.ts` — remote control server command
- [ ] `commands/workflows/index.ts` — workflows command entry

### commands/clear/ — Clear Subcommands

- [ ] `commands/clear/clear/caches.ts` — cache clearing
- [ ] `commands/clear/clear/conversation.ts` — conversation clearing

### services/compact/ — Compaction Services

- [ ] `services/compact/cachedMCConfig.ts` — cached microcompact config
- [ ] `services/compact/snipProjection.ts` — snip projection, imported by 3 files

### services/contextCollapse/ — Context Collapse Internals

- [ ] `services/contextCollapse/operations.ts` — collapse operations, imported by 2 files
- [ ] `services/contextCollapse/persist.ts` — collapse persistence, imported by 2 files

### services/sessionTranscript/ — Session Transcript

- [ ] `services/sessionTranscript/sessionTranscript.ts` — imported by 2 files

### services/remoteManagedSettings/ — Enterprise Settings

- [ ] `services/remoteManagedSettings/securityCheck.jsx` — security check UI

### skills/ — Skill System

- [ ] `skills/mcpSkills.ts` — MCP skill integration, imported by 2 files

### skills/bundled/ — Bundled Skills

- [ ] `skills/bundled/dream.ts` — dream skill
- [ ] `skills/bundled/hunter.ts` — hunter skill
- [ ] `skills/bundled/runSkillGenerator.ts` — skill generator

### skills/bundled/claude-api/ — Claude API Skill Content (24 files)

All imported by `skills/bundled/claudeApiContent.ts` as text:

- [ ] `skills/bundled/claude-api/SKILL.md`
- [ ] `skills/bundled/claude-api/shared/claude-api-general-reference.md`
- [ ] `skills/bundled/claude-api/shared/claude-api-tool-use-reference.md`
- [ ] `skills/bundled/claude-api/csharp/README.md`
- [ ] `skills/bundled/claude-api/csharp/examples.md`
- [ ] `skills/bundled/claude-api/curl/README.md`
- [ ] `skills/bundled/claude-api/curl/examples.md`
- [ ] `skills/bundled/claude-api/go/README.md`
- [ ] `skills/bundled/claude-api/go/examples.md`
- [ ] `skills/bundled/claude-api/java/README.md`
- [ ] `skills/bundled/claude-api/java/examples.md`
- [ ] `skills/bundled/claude-api/php/README.md`
- [ ] `skills/bundled/claude-api/php/examples.md`
- [ ] `skills/bundled/claude-api/python/README.md`
- [ ] `skills/bundled/claude-api/python/examples.md`
- [ ] `skills/bundled/claude-api/ruby/README.md`
- [ ] `skills/bundled/claude-api/ruby/examples.md`
- [ ] `skills/bundled/claude-api/typescript/README.md`
- [ ] `skills/bundled/claude-api/typescript/examples.md`
- [ ] `skills/bundled/claude-api/typescript/agent-sdk-examples.md`
- [ ] `skills/bundled/claude-api/typescript/mcp-examples.md`
- [ ] `skills/bundled/claude-api/typescript/sdk-streaming-examples.md`
- [ ] `skills/bundled/claude-api/typescript/sdk-tool-use-reference.md`
- [ ] `skills/bundled/claude-api/typescript/sdk-usage-reference.md`

### tools/ — Tool Modules (17 files)

Ant-only or feature-gated:

- [ ] `tools/CtxInspectTool/CtxInspectTool.ts`
- [ ] `tools/DiscoverSkillsTool/prompt.ts`
- [ ] `tools/ListPeersTool/ListPeersTool.ts`
- [ ] `tools/MonitorTool/MonitorTool.ts`
- [ ] `tools/OverflowTestTool/OverflowTestTool.ts`
- [ ] `tools/PushNotificationTool/PushNotificationTool.ts`
- [ ] `tools/ReviewArtifactTool/ReviewArtifactTool.ts`
- [ ] `tools/SendUserFileTool/SendUserFileTool.ts`
- [ ] `tools/SendUserFileTool/prompt.ts`
- [ ] `tools/SleepTool/SleepTool.ts`
- [ ] `tools/SnipTool/SnipTool.ts`
- [ ] `tools/SnipTool/prompt.ts`
- [ ] `tools/SubscribePRTool/SubscribePRTool.ts`
- [ ] `tools/TerminalCaptureTool/TerminalCaptureTool.ts`
- [ ] `tools/TerminalCaptureTool/prompt.ts`
- [ ] `tools/WebBrowserTool/WebBrowserTool.ts`
- [ ] `tools/WebBrowserTool/prompt.ts`
- [ ] `tools/WorkflowTool/WorkflowTool.ts`
- [ ] `tools/WorkflowTool/prompt.ts`
- [ ] `skills/bundled/index.ts` — bundled skill registry

### tasks/ — Background Tasks

- [ ] `tasks/LocalWorkflowTask/LocalWorkflowTask.ts` — imported by 2 files
- [ ] `tasks/MonitorMcpTask/MonitorMcpTask.ts` — imported by 4 files

### ink/ — Ink Framework Internals

- [ ] `ink/cursor.ts` — cursor management
- [ ] `ink/events/paste-event.ts` — paste event handling
- [ ] `ink/events/resize-event.ts` — resize event handling

### hooks/notifs/ — Notification Hooks

- [ ] `hooks/notifs/useAntOrgWarningNotification.ts` — ant org warning

### memdir/ — Memory Directory

- [ ] `memdir/memoryShapeTelemetry.ts` — memory shape telemetry, imported by 2 files

### utils/ — Utility Modules

- [ ] `utils/taskSummary.ts` — task summary generation
- [ ] `utils/udsClient.ts` — Unix domain socket client
- [ ] `utils/udsMessaging.ts` — UDS messaging layer

### utils/permissions/yolo-classifier-prompts/ — Permission Classifier Prompts

- [ ] `utils/permissions/yolo-classifier-prompts/auto_mode_system_prompt.txt`
- [ ] `utils/permissions/yolo-classifier-prompts/permissions_anthropic.txt`
- [ ] `utils/permissions/yolo-classifier-prompts/permissions_external.txt`

### utils/ultraplan/ — Ultraplan Prompts

- [ ] `utils/ultraplan/prompt.txt`

---

## Coverage by Source Availability

| Source | Files that can use it | Status |
|--------|----------------------|--------|
| Rust port (`claw-code/rust/`) | types, permissions, oauth, lsp, usage, config, hooks, session | **Done** — 19 files implemented |
| Python port (`claw-code/src/`) | query engine, transcript, runtime, execution | **Done** — merged into above |
| Inferred from usage (grep imports) | UI types, command types, tool shells | **Remaining** — 115 files |
| No reference available | Ant-only features, generated content | **Remaining** — needs empty stubs |

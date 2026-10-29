# GitHub.copilot-chat

## Settings

### `github.copilot.chat.agent.modelDetails.enabled`

Show model details (model name and request multiplier) on agent chat responses when using Copilot CLI or Claude agent in VS Code. Requires VS Code reload to update already loaded sessions.

- **Default**: `true`

### `github.copilot.chat.agent.omitFileAttachmentContents`

Omit summarized file contents from file attachments in agent mode, to encourage the agent to properly read and explore.

- **Default**: `false`

### `github.copilot.chat.agent.temperature`

Temperature setting for agent mode requests.

- **Default**: `0`

### `github.copilot.chat.agentDebugLog.enabled`

Deprecated: use github.copilot.chat.agentDebugLog.fileLogging.enabled instead.

- **Default**: `false`

### `github.copilot.chat.agentDebugLog.fileLogging.enabled`

Enable agent debug logging: write chat debug events (tool calls, LLM requests, token usage, errors) to JSONL files for the debug panel and troubleshoot skill. Requires window reload to take effect.

- **Default**: `false`

### `github.copilot.chat.agentDebugLog.fileLogging.flushIntervalMs`

How often (in milliseconds) buffered debug log entries are flushed to disk. Lower values provide more up-to-date logs at the cost of more frequent disk writes.

- **Default**: `4000`

### `github.copilot.chat.agentDebugLog.fileLogging.maxRetainedSessionLogs`

Maximum number of chat debug session log directories to retain on disk. Each chat session produces one directory. Older session logs are automatically deleted when this limit is exceeded.

- **Default**: `50`

### `github.copilot.chat.agentDebugLog.fileLogging.maxSessionLogSizeMB`

Maximum size in megabytes for a single chat debug session log file. When the log exceeds this size, older entries are truncated to retain the most recent data. Defaults to 100 MB.

- **Default**: `100`

### `github.copilot.chat.agentHistorySummarizationMode`

Mode for agent history summarization.

- **Default**: `""`

### `github.copilot.chat.alternateGeminiModelFPrompt.enabled`

Enables an experimental alternate prompt for Gemini Model F instead of the default prompt.

- **Default**: `false`

### `github.copilot.chat.alternateGptPrompt.enabled`

Enables an experimental alternate prompt for GPT models instead of the default prompt.

- **Default**: `false`

### `github.copilot.chat.anthropic.contextEditing.mode`

Select the context editing mode for Anthropic models. Automatically manages conversation context as it grows, helping optimize costs and stay within context window limits.
off: Context editing is disabled.
clear-thinking: Clears thinking blocks while preserving tool uses.
clear-tooluse: Clears tool uses while preserving thinking blocks.
clear-both: Clears both thinking blocks and tool uses.
Note: This is an experimental feature. Context editing may cause additional cache rewrites. Enable with caution.

- **Default**: `"off"`

### `github.copilot.chat.anthropic.promptCaching.extendedTtl`

Use the extended (1 hour) prompt cache TTL on tools and system blocks for the Anthropic Messages API. Applied to Claude Opus 4.5/4.6/4.7 and Sonnet 4.5/4.6 variants; other models keep the default 5 minute TTL even when this setting is enabled. **Note**: This is an experimental feature. Only the main agent conversation is eligible — inline chat, terminal chat, notebook chat, and subagent requests are excluded.

- **Default**: `false`

### `github.copilot.chat.anthropic.promptCaching.extendedTtlMessages`

Also extend the 1 hour prompt cache TTL to message-level breakpoints. Requires `chat.anthropic.promptCaching.extendedTtl` to be enabled; has no effect on its own. **Note**: This is an experimental feature.

- **Default**: `false`

### `github.copilot.chat.anthropic.tools.websearch.allowedDomains`

List of domains to restrict web search results to (e.g., ["example.com", "docs.example.com"]). Domains should not include the HTTP/HTTPS scheme. Subdomains are automatically included. Cannot be used together with #github.copilot.chat.anthropic.tools.websearch.blockedDomains#; configuring both will cause web search requests to fail.

- **Default**: `[]`

### `github.copilot.chat.anthropic.tools.websearch.blockedDomains`

List of domains to exclude from web search results (e.g., ["untrustedsource.com"]). Domains should not include the HTTP/HTTPS scheme. Subdomains are automatically excluded. Cannot be used together with #github.copilot.chat.anthropic.tools.websearch.allowedDomains#; configuring both will cause web search requests to fail.

- **Default**: `[]`

### `github.copilot.chat.anthropic.tools.websearch.enabled`

Enable Anthropic's native web search tool for BYOK Claude models. When enabled, allows Claude to search the web for current information.
Note: This is an experimental feature only available for BYOK Anthropic Claude models.

- **Default**: `false`

### `github.copilot.chat.anthropic.tools.websearch.maxUses`

Maximum number of web searches allowed per request. Valid range is 1 to 20. Prevents excessive API calls within a single interaction. If Claude exceeds this limit, the response returns an error.

- **Default**: `5`

### `github.copilot.chat.anthropic.tools.websearch.userLocation`

User location for personalizing web search results based on geographic context. All fields (city, region, country, timezone) are optional. Example: {"city": "San Francisco", "region": "California", "country": "US", "timezone": "America/Los_Angeles"}

- **Default**: `null`

### `github.copilot.chat.anthropic.useMessagesApi`

Use the Messages API instead of the Chat Completions API when supported.

- **Default**: `true`

### `github.copilot.chat.askAgent.additionalTools`

Additional tools to enable for the Ask agent, on top of built-in read-only tools. Use fully-qualified tool names (e.g., github/issue_read, mcp_server/tool_name).

- **Default**: `[]`

### `github.copilot.chat.askAgent.model`

Override the language model used by the Ask agent. Leave empty to use the default model.

- **Default**: `""`

### `github.copilot.chat.backgroundAgent.enabled`

Enable the Copilot CLI. When disabled, the Copilot CLI will not be available in 'Continue In' context menus.

- **Default**: `true`

### `github.copilot.chat.claude47OpusPrompt.enabled`

Enables the updated system prompt tuned for the Claude Opus 4.7 model.

- **Default**: `false`

### `github.copilot.chat.claudeAgent.allowAutoPermissions`

Allow auto permission mode, which uses a model classifier to approve or deny tool operations automatically. Learn more.

- **Default**: `false`

### `github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions`

Allow bypass permissions mode. Recommended only for sandboxes with no internet access.

- **Default**: `false`

### `github.copilot.chat.claudeAgent.enabled`

Enable Claude Agent sessions in VS Code. Start and resume agentic coding sessions powered by Anthropic's Claude Agent SDK directly in the editor. Uses your existing Copilot subscription.

- **Default**: `true`

### `github.copilot.chat.claudeAgent.sdkExtensionInstallTimeout`

Maximum time in milliseconds to wait for the ms-vscode.vscode-claude-sdk extension to be installed and detected when loading the Claude Agent SDK from the marketplace.

- **Default**: `120000`

### `github.copilot.chat.claudeAgent.useSdkExtension`

Load the Claude Agent SDK from the ms-vscode.vscode-claude-sdk extension (installed on demand) instead of the version bundled with Copilot Chat.

- **Default**: `false`

### `github.copilot.chat.cli.aiGenerateBranchNames.enabled`

Enable AI-generated branch names in Copilot CLI.

- **Default**: `true`

### `github.copilot.chat.cli.autoCommit.enabled`

Enable automatic commit for Copilot CLI. When enabled, changes made by Copilot CLI will be automatically committed to the repository at the end of each turn.

- **Default**: `true`

### `github.copilot.chat.cli.autoModel.enabled`

Enable the Auto model option in Copilot CLI, which automatically selects the best model for each request. Requires VS Code reload.

- **Default**: `true`

### `github.copilot.chat.cli.branchSupport.enabled`

Enable branch support for Copilot CLI.

- **Default**: `false`

### `github.copilot.chat.cli.forkSessions.enabled`

Enable forking sessions in Copilot CLI.

- **Default**: `true`

### `github.copilot.chat.cli.isolationOption.enabled`

Enable the isolation mode option for Copilot CLI. When enabled, users can choose between Worktree and Workspace modes.

- **Default**: `true`

### `github.copilot.chat.cli.lazyLoadSessionItem.enabled`

Enable lazy loading of session items in Copilot CLI. Requires VS Code reload.

- **Default**: `true`

### `github.copilot.chat.cli.mcp.enabled`

Enable Model Context Protocol (MCP) server for Copilot CLI.

- **Default**: `true`

### `github.copilot.chat.cli.planCommand.enabled`

Enable the /plan command in Copilot CLI to create implementation plans before coding.

- **Default**: `true`

### `github.copilot.chat.cli.planExitMode.enabled`

Enable Plan Mode exit handling in Copilot CLI.

- **Default**: `true`

### `github.copilot.chat.cli.remote.enabled`

Enable the /remote command for Copilot CLI sessions, allowing you to view and steer from GitHub.com and the GitHub mobile app.

- **Default**: `true`

### `github.copilot.chat.cli.sandbox.enabled`

Run Copilot CLI tools (such as the terminal) inside a sandbox to limit what they can access on your system.

- **Default**: `"off"`

### `github.copilot.chat.cli.sessionController.enabled`

Enable the new session controller API for Copilot CLI. Requires VS Code reload.

- **Default**: `false`

### `github.copilot.chat.cli.sessionControllerForSessionsApp.enabled`

Enable the new session controller API for Sessions App. Requires VS Code reload.

- **Default**: `false`

### `github.copilot.chat.cli.showExternalSessions`

Show sessions created by other applications.

- **Default**: `true`

### `github.copilot.chat.cli.terminalLinks.enabled`

Enable advanced clickable file links in Copilot CLI terminals. Resolves relative paths against session state directories. Requires VS Code reload.

- **Default**: `true`

### `github.copilot.chat.cli.thinkingEffort.enabled`

Enable thinking effort for Language Models in Copilot CLI.

- **Default**: `true`

### `github.copilot.chat.cloudAgent.enabled`

Enable the Cloud Agent. When disabled, the Cloud Agent will not be available in 'Continue In' context menus.

- **Default**: `true`

### `github.copilot.chat.cloudAgentBackend.version`

Selects which backend the Cloud Agent uses to create and manage cloud sessions. This setting is experimental and may change. Changes take effect after reloading the window.

- **Default**: `"v1"`

### `github.copilot.chat.codeGeneration.instructions`

A set of instructions that will be added to Copilot requests that generate code. Instructions can come from:
a file in the workspace: { "file": "fileName" }
text in natural language: { "text": "Use underscore for field names." }
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's quality and performance.

- **Default**: `[]`

### `github.copilot.chat.codeGeneration.useInstructionFiles`

Controls whether code instructions from .github/copilot-instructions.md are added to Copilot requests.
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's quality and performance. Learn more about customizing Copilot.

- **Default**: `true`

### `github.copilot.chat.codesearch.agent.enabled`

Enable code search capabilities in agent mode.

- **Default**: `true`

### `github.copilot.chat.codesearch.enabled`

Whether to enable agentic codesearch when using #codebase.

- **Default**: `false`

### `github.copilot.chat.commitMessageGeneration.instructions`

A set of instructions that will be added to Copilot requests that generate commit messages. Instructions can come from:
a file in the workspace: { "file": "fileName" }
text in natural language: { "text": "Use conventional commit message format." }
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's quality and performance.

- **Default**: `[]`

### `github.copilot.chat.completionsFetcher`

Sets the fetcher used for the inline completions.

- **Default**: `""`

### `github.copilot.chat.conversationCompaction.model`

Override the model used for conversation-history compaction. When usePrismCompaction is enabled, defaults to trajectory-compaction. When usePrismCompaction is disabled, an empty value preserves the main agent model.

- **Default**: `""`

### `github.copilot.chat.conversationCompaction.prismModelFilter`

Comma-separated list of CAPI model IDs (case-insensitive, substring matched against the agent endpoint's model and family) that opt into prism compaction. Only takes effect when usePrismCompaction is enabled. An empty value applies prism to all models.

- **Default**: `"claude-haiku-4.5,claude-sonnet-4.5,claude-sonnet-4.6,gemini-2.5-pro,gemini-3-flash,gemini-3.5-flash"`

### `github.copilot.chat.conversationCompaction.usePrismCompaction`

Route conversation-history compaction (both foreground /compact and background auto-compaction) to the dedicated trajectory-compaction model instead of the main agent model.

- **Default**: `false`

### `github.copilot.chat.copilotDebugCommand.enabled`

Whether the `copilot-debug` command is enabled in the terminal.

- **Default**: `true`

### `github.copilot.chat.customInstructionsInSystemMessage`

When enabled, custom instructions and mode instructions will be appended to the system message instead of a user message.

- **Default**: `true`

### `github.copilot.chat.debug.promptOverrideFile`

Path to a YAML file that overrides the system prompt and/or tool descriptions sent to the model.
Note: This is an advanced debugging setting.

- **Default**: `null`

### `github.copilot.chat.debug.promptOverrideString`

YAML string that overrides the system prompt and/or tool descriptions sent to the model. When both this setting and github.copilot.chat.debug.promptOverrideFile are configured, this setting takes precedence.
Note: This is an advanced debugging setting.

- **Default**: `null`

### `github.copilot.chat.debug.requestLogger.maxEntries`

Maximum number of entries to keep in the request logger for debugging purposes.

- **Default**: `100`

### `github.copilot.chat.debugTerminalCommandPatterns`

A list of commands for which the "Debug Command" quick fix action should be shown in the debug terminal.

- **Default**: `[]`

### `github.copilot.chat.editRecording.enabled`

Enable edit recording for analysis.

- **Default**: `false`

### `github.copilot.chat.edits.batchReplaceStringDescriptions`

Update tool descriptions to promote multi_replace_string_in_file as the primary multi-edit tool.

- **Default**: `false`

### `github.copilot.chat.edits.gemini3MultiReplaceString`

Enable the modern multi_replace_string_in_file edit tool when generating edits with Gemini 3 models.

- **Default**: `false`

### `github.copilot.chat.enableUserPreferences`

Enable remembering user preferences in agent mode.

- **Default**: `false`

### `github.copilot.chat.executionSubagent.enabled`

Enable the Execution Subagent tool in Copilot Chat. The Execution Subagent is designed to run terminal commands to accomplish an execution-based task. It is powered by Google's Gemini-3-Flash model.

- **Default**: `false`

### `github.copilot.chat.executionSubagent.model`

The model to use for the Execution Subagent tool in Copilot Chat. When useAgenticProxy is enabled, defaults to 'exec-subagent-router-a'. Otherwise defaults to gemini-3-flash.

- **Default**: `"gemini-3-flash"`

### `github.copilot.chat.executionSubagent.toolCallLimit`

Maximum number of tool calls the Execution Subagent can make during execution.

- **Default**: `10`

### `github.copilot.chat.executionSubagent.useAgenticProxy`

Use the agentic proxy endpoint for the execution subagent.

- **Default**: `false`

### `github.copilot.chat.exploreAgent.enabled`

Enable the Explore (Code Research) subagent.

- **Default**: `true`

### `github.copilot.chat.exploreAgent.model`

Override the language model used by the Explore subagent. Defaults to a fast, small model. Leave empty to use the built-in fallback list.

- **Default**: `""`

### `github.copilot.chat.feedback.onChange`

Enable feedback collection on configuration changes.

- **Default**: `false`

### `github.copilot.chat.gemini35FlashReducedToolUsePrompt.enabled`

Enables an experimental prompt for Gemini 3.5 Flash that instructs the model to minimize tool calls to reduce token usage.

- **Default**: `false`

### `github.copilot.chat.gemini3GetChangedFilesTool.enabled`

Enables the Get Changed Files tool for gemini-3 models.

- **Default**: `true`

### `github.copilot.chat.gemini3LowReasoningEffort.enabled`

Sets the reasoning effort to low for gemini-3 models.

- **Default**: `false`

### `github.copilot.chat.getChangedFilesTool.enabled`

Enable the Get Changed Files tool in Copilot Chat. When enabled, the agent can retrieve git diffs of current changes via a dedicated tool.

- **Default**: `false`

### `github.copilot.chat.githubMcpServer.channel`

Select the channel for the GitHub MCP Server. When set to Insiders, enables access to experimental features that may change or be removed based on community feedback. Learn more.

- **Default**: `"stable"`

### `github.copilot.chat.githubMcpServer.enabled`

Enable built-in support for the GitHub MCP Server.

- **Default**: `false`

### `github.copilot.chat.githubMcpServer.lockdown`

Enable lockdown mode for the GitHub MCP Server. When enabled, hides public issue details created by users without push access. Learn more.

- **Default**: `false`

### `github.copilot.chat.githubMcpServer.readonly`

Enable read-only mode for the GitHub MCP Server. When enabled, only read tools are available. Learn more.

- **Default**: `false`

### `github.copilot.chat.githubMcpServer.toolsets`

Specify toolsets to use from the GitHub MCP Server. Learn more.

- **Default**: `[`

### `github.copilot.chat.gpt55EconomicalSearchAndEdit.enabled`

Enables economical search and edit instructions for gpt-5.5 models.

- **Default**: `false`

### `github.copilot.chat.gpt55GetChangedFilesTool.enabled`

Enables the Get Changed Files tool for gpt-5.5 models.

- **Default**: `true`

### `github.copilot.chat.gpt55LargePromptSections.enabled`

Enables additional gpt-5.4 large prompt sections for gpt-5.5 models.

- **Default**: `false`

### `github.copilot.chat.gpt55ReadFileTool.enabled`

Enables the Read File tool for gpt-5.5 models.

- **Default**: `true`

### `github.copilot.chat.gpt5AlternativePatch`

Enable GPT-5 alternative patch format.

- **Default**: `false`

### `github.copilot.chat.imageUpload.enabled`

Enables the use of image upload URLs in chat requests instead of raw base64 strings.

- **Default**: `true`

### `github.copilot.chat.implementAgent.model`

Override the language model used when starting implementation from the Plan agent's handoff. Use the format Model Name (vendor) (e.g., GPT-5 (copilot)). Leave empty to use the default model.

- **Default**: `""`

### `github.copilot.chat.inlineChat.enableThinking`

Controls whether thinking/reasoning is enabled for inline chat requests. When disabled, reasoning summaries are suppressed for faster responses.

- **Default**: `false`

### `github.copilot.chat.inlineChat.reasoningEffort`

Controls the reasoning effort level for inline chat requests. Lower values result in faster responses with fewer reasoning tokens. Supported values depend on the model.

- **Default**: `"low"`

### `github.copilot.chat.inlineEdits.chatSessionContextProvider.enabled`

Enable chat session context provider for next edit suggestions.

- **Default**: `false`

### `github.copilot.chat.inlineEdits.diagnosticsContextProvider.enabled`

Enable diagnostics context provider for next edit suggestions.

- **Default**: `false`

### `github.copilot.chat.inlineEdits.nextCursorPrediction.currentFileMaxTokens`

Maximum tokens for current file in next cursor prediction.

- **Default**: `3000`

### `github.copilot.chat.inlineEdits.nextCursorPrediction.displayLine`

Display predicted cursor line for next edit suggestions.

- **Default**: `true`

### `github.copilot.chat.inlineEdits.renameSymbolSuggestions`

Enable rename symbol suggestions in inline edits.

- **Default**: `true`

### `github.copilot.chat.inlineEdits.triggerOnEditorChangeAfterSeconds`

Trigger inline edits after editor has been idle for this many seconds.

- **Default**: `10`

### `github.copilot.chat.inlineEdits.xtabProvider.modelConfiguration`

Advanced model configuration for the next edit suggestions xtab provider.
Note: This is an advanced setting.

- **Default**: `null`

### `github.copilot.chat.installExtensionSkill.enabled`

Whether to enable the install extension skill for Copilot.

- **Default**: `false`

### `github.copilot.chat.instantApply.shortContextLimit`

Token limit for short context instant apply.

- **Default**: `8000`

### `github.copilot.chat.instantApply.shortContextModelName`

Model name for short context instant apply.

- **Default**: `"gpt-4o-instant-apply-full-ft-v66-short"`

### `github.copilot.chat.languageContext.fix.typescript.enabled`

Enables the TypeScript language context provider for /fix commands

- **Default**: `false`

### `github.copilot.chat.languageContext.inline.typescript.enabled`

Enables the TypeScript language context provider for inline chats (both generate and edit)

- **Default**: `false`

### `github.copilot.chat.languageContext.typescript.cacheTimeout`

The cache population timeout for the TypeScript language context provider in milliseconds. The default is 500 milliseconds.

- **Default**: `500`

### `github.copilot.chat.languageContext.typescript.enabled`

Enables the TypeScript language context provider for inline suggestions

- **Default**: `true`

### `github.copilot.chat.languageContext.typescript.includeDocumentation`

Controls whether to include documentation comments in the generated code snippets.

- **Default**: `false`

### `github.copilot.chat.languageContext.typescript.items`

Controls which kind of items are included in the TypeScript language context provider.

- **Default**: `"double"`

### `github.copilot.chat.localeOverride`

Specify a locale that Copilot should respond in, e.g. en or fr. By default, Copilot will respond using VS Code's configured display language locale.

- **Default**: `"auto"`

### `github.copilot.chat.localIndex.enabled`

Enable local session tracking. When enabled, session data is tracked locally for /chronicle commands.

- **Default**: `false`

### `github.copilot.chat.localWorkspaceRecording.enabled`

Enable local workspace recording for analysis.

- **Default**: `false`

### `github.copilot.chat.modelCapabilityOverrides`

Per-model capability overrides keyed by model id, intended for evaluating preview and tenanted models against an existing model's capability profile. For each model id, declare an aliased family. Setting family to a known production family (e.g. "claude-opus-4.7") makes the model receive that family's full capability profile — Anthropic family detection, latest Opus prompt, multi-replace tools, tool search, context editing, extended cache TTL — without a code change.
Note: This is an advanced setting for evaluation use; it is not intended for regular end-user configuration.

- **Default**: `{}`

### `github.copilot.chat.nesFetcher`

Sets the fetcher used for the next edit suggestions.

- **Default**: `""`

### `github.copilot.chat.newWorkspace.useContext7`

Whether to use the Context7 tools to scaffold project for new workspace creation.

- **Default**: `false`

### `github.copilot.chat.newWorkspaceCreation.enabled`

Whether to enable new agentic workspace creation.

- **Default**: `true`

### `github.copilot.chat.notebook.alternativeFormat`

Alternative document format for notebooks.

- **Default**: `"xml"`

### `github.copilot.chat.notebook.alternativeNESFormat.enabled`

Enable alternative format for Next Edit Suggestions in notebooks.

- **Default**: `false`

### `github.copilot.chat.notebook.enhancedNextEditSuggestions.enabled`

Controls whether to use an enhanced approach for generating next edit suggestions in notebook cells.

- **Default**: `false`

### `github.copilot.chat.notebook.followCellExecution.enabled`

Controls whether the currently executing cell is revealed into the viewport upon execution from Copilot.

- **Default**: `false`

### `github.copilot.chat.notebook.summaryExperimentEnabled`

Enable the notebook summary experiment.

- **Default**: `false`

### `github.copilot.chat.notebook.variableFilteringEnabled`

Enable filtering variables by cell document symbols.

- **Default**: `false`

### `github.copilot.chat.omitBaseAgentInstructions`

Omit base agent instructions from prompts.

- **Default**: `false`

### `github.copilot.chat.organizationCustomAgents.enabled`

When enabled, Copilot will load custom agents defined by your GitHub Organization.

- **Default**: `true`

### `github.copilot.chat.organizationInstructions.enabled`

When enabled, Copilot will load custom instructions defined by your GitHub Organization.

- **Default**: `true`

### `github.copilot.chat.otel.captureContent`

Capture input/output messages, system instructions, and tool definitions in OTel telemetry. Contains potentially sensitive data. Env var COPILOT_OTEL_CAPTURE_CONTENT takes precedence. Requires window reload.

- **Default**: `false`

### `github.copilot.chat.otel.dbSpanExporter.enabled`

Enable SQLite DB span exporter. Persists OTel spans to a local SQLite database. Automatically enables OTel when set to true. Requires window reload.

- **Default**: `false`

### `github.copilot.chat.otel.enabled`

Enable OpenTelemetry trace/metric/log emission for Copilot Chat operations. Env var COPILOT_OTEL_ENABLED takes precedence. Requires window reload.

- **Default**: `false`

### `github.copilot.chat.otel.exporterType`

OTel exporter type for Copilot Chat telemetry. Requires window reload.

- **Default**: `"otlp-http"`

### `github.copilot.chat.otel.maxAttributeSizeChars`

Maximum size in characters for free-form OTel content attributes (prompts, responses, tool arguments/results, hook input/output). 0 (the default) disables truncation so backends without per-attribute size limits receive full JSON payloads. Set to a positive value when your OTel backend caps attribute size — consult your backend's documentation for its per-attribute limit. Truncated values are suffixed with ...[truncated, original N chars]. Env var COPILOT_OTEL_MAX_ATTRIBUTE_SIZE_CHARS takes precedence. Requires window reload.

- **Default**: `0`

### `github.copilot.chat.otel.otlpEndpoint`

OTLP collector endpoint URL for Copilot Chat OTel data. Env var OTEL_EXPORTER_OTLP_ENDPOINT takes precedence. Requires window reload.

- **Default**: `"http://localhost:4318"`

### `github.copilot.chat.otel.outfile`

File path for file-based OTel exporter output (JSON-lines). When set, overrides exporter type to file. Requires window reload.

- **Default**: `""`

### `github.copilot.chat.planAgent.additionalTools`

Additional tools to enable for the Plan agent, on top of built-in tools. Use fully-qualified tool names (e.g., github/issue_read, mcp_server/tool_name).

- **Default**: `[]`

### `github.copilot.chat.projectLabels.chat`

Add project labels in chat requests.

- **Default**: `false`

### `github.copilot.chat.projectLabels.expanded`

Use the expanded format for project labels in prompts.

- **Default**: `false`

### `github.copilot.chat.projectLabels.inline`

Add project labels in inline edit requests.

- **Default**: `false`

### `github.copilot.chat.promptFileContextProvider.enabled`

Enable prompt file context provider.

- **Default**: `true`

### `github.copilot.chat.pullRequestDescriptionGeneration.instructions`

A set of instructions that will be added to Copilot requests that generate pull request titles and descriptions. Instructions can come from:
a file in the workspace: { "file": "fileName" }
text in natural language: { "text": "Always include a list of key changes." }
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's quality and performance.

- **Default**: `[]`

### `github.copilot.chat.rateLimitAutoSwitchToAuto`

Automatically switch to the Auto model and retry when you hit a per-model rate limit.

- **Default**: `false`

### `github.copilot.chat.reasoningEffortOverride`

Overrides the reasoning/thinking effort sent to model APIs. The configured value must match a reasoning-effort value supported by the selected model or endpoint (for example, low, medium, high, or other model-specific values). Used by evals.
Note: This is an advanced debugging setting.

- **Default**: `null`

### `github.copilot.chat.responsesApi.persistentCoT.enabled`

Enables persistent chain of thought for supported Responses API models.

- **Default**: `false`

### `github.copilot.chat.responsesApi.promptCacheKey.enabled`

Enables prompt cache key being set for the Responses API.

- **Default**: `false`

### `github.copilot.chat.responsesApiContextManagement.enabled`

Enables context management for the Responses API. Requires #github.copilot.chat.useResponsesApi#.

- **Default**: `false`

### `github.copilot.chat.responsesApiReasoningSummary`

Sets the reasoning summary style used for the Responses API. Requires #github.copilot.chat.useResponsesApi#.

- **Default**: `"detailed"`

### `github.copilot.chat.review.intent`

Enable intent detection for code review.

- **Default**: `false`

### `github.copilot.chat.reviewAgent.enabled`

Enables the code review agent.

- **Default**: `true`

### `github.copilot.chat.reviewSelection.enabled`

Enables code review on current selection.

- **Default**: `true`

### `github.copilot.chat.reviewSelection.instructions`

A set of instructions that will be added to Copilot requests that provide code review for the current selection. Instructions can come from:
a file in the workspace: { "file": "fileName" }
text in natural language: { "text": "Use underscore for field names." }
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's effectiveness.

- **Default**: `[]`

### `github.copilot.chat.scopeSelection`

Whether to prompt the user to select a specific symbol scope if the user uses /explain and the active editor has no selection.

- **Default**: `false`

### `github.copilot.chat.searchSubagent.enabled`

Enable the search subagent tool for iterative code exploration in the workspace.

- **Default**: `false`

### `github.copilot.chat.searchSubagent.model`

Model to use for the search subagent. When useAgenticProxy is enabled, defaults to 'vscode-agentic-search-router-a'. Otherwise defaults to the main agent model.

- **Default**: `""`

### `github.copilot.chat.searchSubagent.thoroughnessEnabled`

Enable the thoroughness parameter on the search subagent tool. When enabled, the caller can pass 'normal' or 'deep' to adjust the number of allowed tool-call turns (1× or 2× the base toolCallLimit respectively).

- **Default**: `false`

### `github.copilot.chat.searchSubagent.toolCallLimit`

Maximum number of tool calls the search subagent can make during exploration.

- **Default**: `4`

### `github.copilot.chat.searchSubagent.useAgenticProxy`

Use the agentic proxy for the search subagent tool.

- **Default**: `false`

### `github.copilot.chat.setupTests.enabled`

Enables the /setupTests intent and prompting in /tests generation.

- **Default**: `true`

### `github.copilot.chat.skillTool.enabled`

Enable the skill tool in Copilot Chat. When enabled, skills are invoked via a dedicated skill tool instead of readFile.

- **Default**: `false`

### `github.copilot.chat.summarizeAgentConversationHistory.enabled`

Whether to auto-compact agent conversation history once the context window is filled.

- **Default**: `true`

### `github.copilot.chat.summarizeAgentConversationHistoryThreshold`

Threshold at which agent conversation history is compacted. Specify either a ratio of the model's context window (a value greater than 0 and at most 1, e.g. 0.8 to compact at 80%) or an absolute token count (a value of 100 or greater, e.g. 60000). Leave unset to use the model's full context window.

- **Default**: `0`

### `github.copilot.chat.switchAgent.enabled`

Allow agent to switch to the Plan agent for research, exploration, and planning tasks.

- **Default**: `false`

### `github.copilot.chat.terminalChatLocation`

Controls where chat queries from the terminal should be opened.

- **Default**: `"chatView"`

### `github.copilot.chat.testGeneration.instructions`

A set of instructions that will be added to Copilot requests that generate tests. Instructions can come from:
a file in the workspace: { "file": "fileName" }
text in natural language: { "text": "Use underscore for field names." }
Note: Keep your instructions short and precise. Poor instructions can degrade Copilot's quality and performance.

- **Default**: `[]`

### `github.copilot.chat.tools.defaultToolsGrouped`

Group default tools in prompts.

- **Default**: `false`

### `github.copilot.chat.tools.viewImage.enabled`

Enable the view image tool, which allows the agent to view image files such as png, jpg, jpeg, gif, and webp.

- **Default**: `true`

### `github.copilot.chat.updated53CodexPrompt.enabled`

Enables the updated prompt for gpt-5.3-codex model.

- **Default**: `true`

### `github.copilot.chat.useProjectTemplates`

Use relevant GitHub projects as starter projects when using /new

- **Default**: `true`

### `github.copilot.chat.useResponsesApiTruncation`

Use Responses API for truncation.

- **Default**: `false`

### `github.copilot.chat.virtualTools.threshold`

This setting defines the tool count over which virtual tools should be used. Virtual tools group similar sets of tools together and they allow the model to activate them on-demand. Certain tool groups will optimistically be pre-activated. We are actively developing this feature and you experience degraded tool calling once the threshold is hit.
May be set to 0 to disable virtual tools.

- **Default**: `128`

### `github.copilot.chat.workspace.codeSearchExternalIngest.enabled`

Enable external ingest for semantic codebase search in this workspace. This setting can be used to enable/disable external ingest, but your Copilot Enterprise or Copilot subscription policies ultimately control availability. Learn more about external ingest policies.

- **Default**: `true`

### `github.copilot.chat.workspace.enableCodeSearch`

Enable code search in workspace context.

- **Default**: `true`

### `github.copilot.chat.workspace.maxLocalIndexSize`

Maximum size of the local workspace index.

- **Default**: `100000`

### `github.copilot.chat.workspace.preferredEmbeddingsModel`

Preferred embeddings model for semantic search.

- **Default**: `""`

### `github.copilot.chat.workspace.prototypeAdoCodeSearchEndpointOverride`

Override endpoint for Azure DevOps code search prototype.

- **Default**: `""`

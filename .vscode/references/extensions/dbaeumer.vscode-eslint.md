# dbaeumer.vscode-eslint

## Settings

### `eslint.autoFixOnSave`

Turns auto fix on save on or off.

- **Default**: `false`

### `eslint.codeAction.disableRuleComment`

Show disable lint rule in the quick fix menu.

- **Default**:
  ```json
  {
    "enable": true,
    "location": "separateLine",
    "commentStyle": "line"
  }
  ```

### `eslint.codeAction.showDocumentation`

Show open lint rule documentation web page in the quick fix menu.

- **Default**:
  ```json
  {
    "enable": true
  }
  ```

### `eslint.codeActionsOnSave.mode`

Specifies the code action mode.
Possible values are 'all' and 'problems'.

- **Default**: `"all"`

### `eslint.codeActionsOnSave.options`

The ESLint options object to use on save (see https://eslint.org/docs/developer-guide/nodejs-api#eslint-class).
eslint.codeActionsOnSave.rules, if specified, will take priority over any rule options here.

- **Default**: `{}`

### `eslint.codeActionsOnSave.rules`

The rules that should be executed when computing the code actions on save or formatting a file.
Defaults to the rules configured via the ESLint configuration.

- **Default**: `null`

### `eslint.debug`

Enables ESLint debug mode (same as --debug on the command line).

- **Default**: `false`

### `eslint.enable`

Controls whether eslint is enabled or not.

- **Default**: `true`

### `eslint.execArgv`

Additional exec argv argument passed to the runtime.
This can for example be used to control the maximum heap space using --max_old_space_size.

- **Default**: `null`

### `eslint.experimental.useFlatConfig`

Enables support of experimental Flat Config (aka eslint.config.js).
Requires ESLint version >= 8.21 < 8.57.0.

- **Default**: `false`

### `eslint.format.enable`

Enables ESLint as a formatter.

- **Default**: `false`

### `eslint.ignoreUntitled`

If true, untitled files won't be validated by ESLint.

- **Default**: `false`

### `eslint.lintTask.command`

The command to run the task for linting the whole workspace.
Defaults to the found eslint binary for the workspace, or 'eslint' if no binary could be found.

- **Default**: `"eslint"`

### `eslint.lintTask.enable`

Controls whether a task for linting the whole workspace will be available.

- **Default**: `false`

### `eslint.lintTask.options`

Command line options applied when running the task for linting the whole workspace (see https://eslint.org/docs/user-guide/command-line-interface).

- **Default**: `"."`

### `eslint.migration.2_x`

Whether ESlint should migrate auto fix on save settings.

- **Default**: `"on"`

### `eslint.nodeEnv`

The value of NODE_ENV to use when running eslint tasks.

- **Default**: `null`

### `eslint.nodePath`

A path added to NODE_PATH when resolving the eslint module.

- **Default**: `null`

### `eslint.notebooks.rules.customizations`

A special rules customization section for text cells in notebook documents.

- **Default**: `[]`

### `eslint.onIgnoredFiles`

Whether ESLint should issue a warning on ignored files.

- **Default**: `"off"`

### `eslint.options`

The eslint options object to provide args normally passed to eslint when executed from a command line (see https://eslint.org/docs/developer-guide/nodejs-api#eslint-class).

- **Default**: `{}`

### `eslint.packageManager`

The package manager you use to install node modules.

- **Default**: `"npm"`

### `eslint.probe`

An array of language ids for which the extension should probe if support is installed.

- **Default**:
  ```json
  [
    "astro",
    "civet",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "html",
    "mdx",
    "vue",
    "markdown",
    "json",
    "jsonc",
    "css",
    "glimmer-js",
    "glimmer-ts",
    "svelte"
  ]
  ```

### `eslint.problems.shortenToSingleLine`

Shortens the text spans of underlined problems to their first related line.

- **Default**: `false`

### `eslint.provideLintTask`

Controls whether a task for linting the whole workspace will be available.

- **Default**: `false`

### `eslint.quiet`

Turns on quiet mode, which ignores warnings and info diagnostics.

- **Default**: `false`

### `eslint.rules.customizations`

Override the severity of one or more rules reported by this extension, regardless of the project's ESLint config.
Use globs to apply default severities for multiple rules.

- **Default**: `[]`

### `eslint.run`

Run the linter on save (onSave) or on type (onType).

- **Default**: `"onType"`

### `eslint.runtime`

The location of the node binary to run ESLint under.

- **Default**: `null`

### `eslint.timeBudget.onFixes`

The time budget in milliseconds to spend on computing fixes before showing a warning or error.

- **Default**:
  ```json
  {
    "warn": 3000,
    "error": 6000
  }
  ```

### `eslint.timeBudget.onValidation`

The time budget in milliseconds to spend on validation before showing a warning or error.

- **Default**:
  ```json
  {
    "warn": 4000,
    "error": 8000
  }
  ```

### `eslint.trace.server`

Traces the communication between VSCode and the eslint linter service.

- **Default**: `"off"`

### `eslint.useESLintClass`

Since version 7 ESLint offers a new API call ESLint.
Use it even if the old CLIEngine is available.
From version 8 on forward on ESLint class is available.

- **Default**: `false`

### `eslint.useFlatConfig`

Controls whether flat config should be used or not.
This setting requires ESLint version 8.57 or later and is interpreted according to the ESLint Flat Config rollout plan.
This means:

- 8.57.0 <= ESLint version < 9.x: setting is honored and defaults to false
- 9.0.0 <= ESLint version < 10.x: settings is honored and defaults to true
- 10.0.0 <= ESLint version: setting is ignored. Flat configs are the default and can't be turned off.

- **Default**: `null`

### `eslint.useRealpaths`

Whether ESLint should use real paths when resolving files.
This is useful when working with symlinks or when the casing of file paths is inconsistent.

- **Default**: `false`

### `eslint.validate`

An array of language ids which should be validated by ESLint.
If not installed ESLint will show an error.

- **Default**: `null`

### `eslint.workingDirectories`

Specifies how the working directories ESLint is using are computed.
ESLint resolves configuration files (e.g. eslintrc, .eslintignore) relative to a working directory so it is important to configure this correctly.

- **Default**: `[]`

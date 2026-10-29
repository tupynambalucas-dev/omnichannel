# esbenp.prettier-vscode

## Settings

### `prettier.arrowParens`

Include parentheses around a sole arrow function parameter.

- **Default**: `"always"`

### `prettier.bracketSameLine`

Puts the > of a multi-line HTML (HTML, JSX, Vue, Angular) element at the end of the last line instead of being alone on the next line (does not apply to self closing elements).

- **Default**: `false`

### `prettier.bracketSpacing`

Controls the printing of spaces inside object literals.

- **Default**: `true`

### `prettier.configPath`

Path to the prettier configuration file.

- **Default**: `""`

### `prettier.disableLanguages`

A list of languages IDs to disable this extension on.

- **Default**: `[]`

### `prettier.documentSelectors`

A list of glob patterns to register Prettier formatter.

- **Default**: `[]`

### `prettier.embeddedLanguageFormatting`

Control whether Prettier formats quoted code embedded in the file.

- **Default**: `"auto"`

### `prettier.enable`

Controls whether Prettier is enabled or not.
Reload required.

- **Default**: `true`

### `prettier.enableDebugLogs`

Enable debug logs for troubleshooting.

- **Default**: `false`

### `prettier.endOfLine`

Specify the end of line used by prettier.

- **Default**: `"lf"`

### `prettier.experimentalOperatorPosition`

Controls where to break lines around binary operators.
Valid options:

- `end`: Break lines after operators.
- `start`: Break lines before operators.

- **Default**: `"end"`

### `prettier.experimentalTernaries`

Try prettier's new ternary formatting before it becomes the default behavior.

- **Default**: `false`

### `prettier.htmlWhitespaceSensitivity`

Specify the global whitespace sensitivity for HTML files.
Valid options:

- `css`: Respect the default value of CSS display property.
- `strict`: Whitespaces are considered sensitive.
- `ignore`: Whitespaces are considered insensitive.

- **Default**: `"css"`

### `prettier.ignorePath`

Path to a .prettierignore file.

- **Default**: `".prettierignore"`

### `prettier.insertPragma`

Prettier can insert a special `@format` marker at the top of files specifying that the file has been formatted with prettier.
This works well when used in tandem with the `--require-pragma` option.
If there is already a docblock at the top of the file then this option will add a newline to it with the `@format` marker.

- **Default**: `false`

### `prettier.jsxBracketSameLine`

Puts the > of a multi-line jsx element at the end of the last line instead of being alone on the next line (does not apply to self closing elements).

- **Default**: `false`

### `prettier.jsxSingleQuote`

Use single quotes instead of double quotes in JSX.

- **Default**: `false`

### `prettier.objectWrap`

Controls how object literals are wrapped.
Valid options:

- `preserve`: Preserve the original wrapping of object literals.
- `collapse`: Collapse object literals to fit on one line when possible.

- **Default**: `"preserve"`

### `prettier.packageManager`

The package manager you use to install node modules.

- **Default**: `"npm"`

### `prettier.prettierPath`

Path to the prettier module, eg: ./node_modules/prettier.

- **Default**: `""`

### `prettier.printWidth`

Fit code within this line limit.

- **Default**: `80`

### `prettier.proseWrap`

(Markdown) wrap prose over multiple lines.

- **Default**: `"preserve"`

### `prettier.quoteProps`

Change when properties in objects are quoted.
Valid options:

- `"as-needed"`: Only add quotes around object properties where required.
- `"consistent"`: If at least one property in an object requires quotes, quote all properties.
- `"preserve"`: Respect the input use of quotes in object properties.

- **Default**: `"as-needed"`

### `prettier.requireConfig`

Require a prettier configuration file to format.
See documentation for valid configuration files.
Note, untitled files will still be formatted using the VS Code prettier settings even when this setting is set.

- **Default**: `false`

### `prettier.requirePragma`

Prettier can restrict itself to only format files that contain a special comment, called a pragma, at the top of the file.
This is very useful when gradually transitioning large, unformatted codebases to prettier.

- **Default**: `false`

### `prettier.resolveGlobalModules`

When enabled, this extension will attempt to use global npm or yarn modules if local modules cannot be resolved.
This setting can have a negative performance impact, particularly on Windows when you have attached network drives.
Only enable this if you must use global modules.

- **Default**: `false`

### `prettier.semi`

Whether to add a semicolon at the end of every line.

- **Default**: `true`

### `prettier.singleAttributePerLine`

Enforces single attribute per line in HTML, JSX, Vue and Angular.

- **Default**: `false`

### `prettier.singleQuote`

Use single instead of double quotes.

- **Default**: `false`

### `prettier.tabWidth`

Number of spaces it should use per tab.

- **Default**: `2`

### `prettier.trailingComma`

Controls the printing of trailing commas wherever possible.
Valid options:

- `none`: No trailing commas
- `es5`: Trailing commas where valid in ES5 (objects, arrays, etc)
- `all`: Trailing commas wherever possible (function arguments)

- **Default**: `"all"`

### `prettier.useEditorConfig`

Whether or not to take `.editorconfig` into account when parsing configuration.
See the `prettier.resolveConfig` docs for details.

- **Default**: `true`

### `prettier.useTabs`

Indent lines with tabs.

- **Default**: `false`

### `prettier.vueIndentScriptAndStyle`

Whether or not to indent the code inside `<script>` and `<style>` tags in Vue SFC files.

- **Default**: `false`

### `prettier.withNodeModules`

This extension will process files in node_modules.

- **Default**: `false`

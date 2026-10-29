# shd101wyy.markdown-preview-enhanced

## Settings

### `markdown-preview-enhanced.alwaysShowBacklinksInPreview`

Always show backlinks in preview.

- **Default**: `false`

### `markdown-preview-enhanced.automaticallyShowPreviewOfMarkdownBeingEdited`

Automatically show preview of markdown being edited.

- **Default**: `false`

### `markdown-preview-enhanced.breakOnSingleNewLine`

In Markdown, a single newline character doesn't cause a line break in the generated HTML.
In GitHub Flavored Markdown, that is not true.
Enable this config option to insert line breaks in rendered HTML for single newlines in Markdown source.

- **Default**: `true`

### `markdown-preview-enhanced.chromePath`

Chrome executable path, which is used for Puppeteer export.
Leaving it empty means the path will be found automatically.

- **Default**: `""`

### `markdown-preview-enhanced.codeBlockTheme`

Code block theme.
If `auto.css` is chosen, then the code block theme that best matches the current preview theme will be picked.

- **Default**: `"auto.css"`

### `markdown-preview-enhanced.configPath`

Restart is required after changes.
The global configuration directory path.
Leave it empty to use `$HOME/.crossnote` for Windows or `$XDG_CONFIG_HOME/.crossnote` or `$HOME/.local/state/crossnote` as the config path.

- **Default**: `""`

### `markdown-preview-enhanced.d2Layout`

Default D2 layout engine for rendering d2 diagrams.

- **Default**: `"dagre"`

### `markdown-preview-enhanced.d2Path`

Path to the D2 executable.
Defaults to `d2` (i.e. found on PATH).
Not supported in the web extension.

- **Default**: `"d2"`

### `markdown-preview-enhanced.d2Sketch`

Render D2 diagrams in sketch (hand-drawn) style.

- **Default**: `false`

### `markdown-preview-enhanced.d2Theme`

Default D2 theme for rendering d2 diagrams.

- **Default**: `0`

### `markdown-preview-enhanced.disableAutoPreviewForFilePatterns`

A list of file name patterns (e.g., `_.note.md`) to exclude from the `automaticallyShowPreviewOfMarkdownBeingEdited` feature.
Files whose names match any of these patterns won't trigger the automatic preview.
Supports `_` as a wildcard.
Matching is performed against the file's basename (not full path) and is case-insensitive.

- **Default**: `[]`

### `markdown-preview-enhanced.disableAutoPreviewForUriSchemes`

A list of URI schemes (e.g., `vscode-notebook-cell`) to exclude from the `automaticallyShowPreviewOfMarkdownBeingEdited` feature.
Files matching these schemes won't trigger the automatic preview.

- **Default**:
  ```json
  ["vscode-notebook-cell"]
  ```

### `markdown-preview-enhanced.enableCriticMarkupSyntax`

Enable CriticMarkup syntax.
Only works with markdown-it parser.
Please check http://criticmarkup.com/users-guide.php for more information.

- **Default**: `false`

### `markdown-preview-enhanced.enableEmojiSyntax`

Enable emoji & font-awesome plugin.
This only works for markdown-it parser, but not pandoc parser.

- **Default**: `true`

### `markdown-preview-enhanced.enableExtendedTableSyntax`

Enable extended table syntax to support merging table cells.

- **Default**: `false`

### `markdown-preview-enhanced.enableHTML5Embed`

Enables transform audio video link to to html5 embed audio video tags.

- **Default**: `false`

### `markdown-preview-enhanced.enableImageLightbox`

Click an image in the preview to view it in a full-screen lightbox overlay.
Press Escape or click the backdrop to close.

- **Default**: `true`

### `markdown-preview-enhanced.enableLinkify`

Enable or disable conversion of URL-like text to links in the markdown preview.

- **Default**: `true`

### `markdown-preview-enhanced.enablePreviewZenMode`

Enable this option will hide unnecessary UI elements in preview unless your mouse is over it.

- **Default**: `true`

### `markdown-preview-enhanced.enableScriptExecution`

Enables executing code chunks and importing javascript files.

> [!WARNING]
> Please use this feature with caution because it may put your security at risk!
> Your machine can get hacked if someone makes you open a markdown with malicious code while script execution is enabled.

- **Default**: `false`

### `markdown-preview-enhanced.enableTagSyntax`

Enable Obsidian-style #tag syntax.
Renders `#tag-name` (and nested `#parent/child`) as clickable pill-shaped anchors.
Click a tag to open VS Code's "Search in Files" pre-filled with the tag.

- **Default**: `true`

### `markdown-preview-enhanced.enableTypographer`

Enable smartypants and other sweet transforms.

- **Default**: `false`

### `markdown-preview-enhanced.enableWikiLinkSyntax`

Enable Wiki Link syntax support.
More information can be found at https://help.github.com/articles/adding-links-to-wikis/

- **Default**: `true`

### `markdown-preview-enhanced.frontMatterRenderingOption`

Front matter rendering option.

- **Default**: `"none"`

### `markdown-preview-enhanced.hideDefaultVSCodeMarkdownPreviewButtons`

Hide the default VSCode markdown preview extension buttons.
Restarting the editor is required to make this config take effect.

- **Default**: `true`

### `markdown-preview-enhanced.HTML5EmbedAudioAttributes`

HTML attributes to pass to audio tags.

- **Default**: `"controls preload=\"metadata\" width=\"320\""`

### `markdown-preview-enhanced.HTML5EmbedIsAllowedHttp`

When true embed media with http:// schema in URLs.
When false ignore and don't embed them.

- **Default**: `false`

### `markdown-preview-enhanced.HTML5EmbedUseImageSyntax`

Enables video/audio embed with ![](<>) syntax (default).

- **Default**: `true`

### `markdown-preview-enhanced.HTML5EmbedUseLinkSyntax`

Enables video/audio embed with [](<>) syntax.

- **Default**: `false`

### `markdown-preview-enhanced.HTML5EmbedVideoAttributes`

HTML attributes to pass to video tags.

- **Default**: `"controls preload=\"metadata\" width=\"320\" height=\"240\""`

### `markdown-preview-enhanced.imageFolderPath`

When using Image Helper to copy images, by default images will be copied to root image folder path '/assets'.

- **Default**: `"/assets"`

### `markdown-preview-enhanced.imageMagickPath`

ImageMagick command line path.
Should be either `magick` or `convert`.
Leaving it empty means the path will be found automatically.

- **Default**: `""`

### `markdown-preview-enhanced.imageUploader`

You can choose different image uploader to upload image.

- **Default**: `"imgur"`

### `markdown-preview-enhanced.jsdelivrCdnHost`

jsDelivr CDN host.
Example values: cdn.jsdelivr.net, fastly.jsdelivr.net, gcore.jsdelivr.net, testingcf.jsdelivr.net.

- **Default**: `"cdn.jsdelivr.net"`

### `markdown-preview-enhanced.krokiServer`

The URL of the Kroki server to use.

- **Default**: `"https://kroki.io"`

### `markdown-preview-enhanced.latexEngine`

Default latex engine for Pandoc export and latex code chunk.

- **Default**: `"pdflatex"`

### `markdown-preview-enhanced.liveUpdate`

Re-render the preview as the contents of the source changes, without requiring the source buffer to be saved.
If disabled, the preview is re-rendered only when the buffer is saved to disk.

- **Default**: `true`

### `markdown-preview-enhanced.liveUpdateDebounceMs`

Debounce time in milliseconds for live updates.
Higher values reduce CPU usage but may feel less responsive.
Lower values provide more immediate feedback but may impact performance.

- **Default**: `300`

### `markdown-preview-enhanced.markdownFileExtensions`

Markdown file extensions.
This is used to determine whether to show the preview button in the markdown file context menu.

- **Default**:
  ```json
  [".md", ".markdown", ".mdown", ".mkdn", ".mkd", ".rmd", ".qmd", ".mdx"]
  ```

### `markdown-preview-enhanced.markdownParser`

Markdown parser/renderer to use.
'markdown-it' (default) is the built-in renderer.
'pandoc' uses Pandoc (requires Pandoc installed; not available in VS Code web).
'markdown_yo' uses a high-performance WASM renderer (or native binary when markdownYoBinaryPath is set; experimental).

- **Default**: `"markdown-it"`

### `markdown-preview-enhanced.markdownYoBinaryPath`

Path to the markdown_yo native binary.
When set and markdownParser is 'markdown_yo', crossnote will use this binary (via stdin/stdout) instead of the bundled WASM module.
The native binary is faster for files under ~300 KB; WASM is faster for very large files.
Supports $HOME and ~ variable substitution.
Leave empty to use WASM (default).

- **Default**: `""`

### `markdown-preview-enhanced.mathBlockDelimiters`

Use customized Math expression block delimiters.

- **Default**:
  ```json
  [
    ["$$", "$$"],
    ["\\[", "\\]"]
  ]
  ```

### `markdown-preview-enhanced.mathInlineDelimiters`

Use customized Math expression inline delimiters.

- **Default**:
  ```json
  [
    ["$", "$"],
    ["\\(", "\\)"]
  ]
  ```

### `markdown-preview-enhanced.mathjaxScriptSrc`

MathJax script source.
Leave it empty to use the default CDN (MathJax v4).

- **Default**: `"https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js"`

### `markdown-preview-enhanced.mathjaxV3ScriptSrc`

- **Default**: `""`

### `markdown-preview-enhanced.mathRenderingOnlineService`

Choose the Math expression rendering method option for GFM markdown export (Save as Markdown).

- **Default**: `"https://latex.codecogs.com/gif.latex"`

### `markdown-preview-enhanced.mathRenderingOption`

Choose the Math expression rendering method here.
You can also disable math rendering if you want by choosing 'None'.

- **Default**: `"KaTeX"`

### `markdown-preview-enhanced.maxNoteFileSize`

Maximum size (in bytes) of a Markdown file that crossnote will load into the in-memory note index.
Files larger than the cap are skipped during workspace refresh — they won't appear in autocomplete, backlinks, or the tag panel, but you can still open them via wikilink click.
Prevents pathological cases where a checked-in log/data dump with a .md extension would otherwise pin its full content (plus a parsed token tree) in memory.
Set to 0 to disable the cap.

- **Default**: `5242880`

### `markdown-preview-enhanced.mermaidTheme`

Mermaid theme, you can choose one from ["mermaid.css", "mermaid.dark.css", "mermaid.forest.css"].

- **Default**: `"default"`

### `markdown-preview-enhanced.pandocArguments`

Args passed to pandoc command e.g. ["--smart", "--filter=/bin/exe"].
Please use long argument names.

- **Default**: `[]`

### `markdown-preview-enhanced.pandocMarkdownFlavor`

The pandoc markdown flavor you want.

- **Default**: `"markdown-raw_tex+tex_math_single_backslash"`

### `markdown-preview-enhanced.pandocPath`

Pandoc executable path.

- **Default**: `"pandoc"`

### `markdown-preview-enhanced.plantumlJarPath`

Absolute path to the plantuml.jar file (`java` is required in system path).
You can download it from https://plantuml.com/download.

- **Default**: `""`

### `markdown-preview-enhanced.plantumlServer`

Render using PlantUML server instead of binary.
Leave it empty to use the builtin plantuml.jar binary (`java` is required in system path).
Eg: "http://localhost:8080/svg/".

- **Default**: `""`

### `markdown-preview-enhanced.previewColorScheme`

- **Default**: `"selectedPreviewTheme"`

### `markdown-preview-enhanced.previewMode`

Configure the preview mode:

- `Single Preview`: Only one preview will be shown for all editors.
- `Multiple Previews`: Multiple previews will be shown. Each editor has its own preview.
- `Previews Only`: No editor will be shown. Only previews will be shown. You can use the in-preview editor to edit the markdown.

Restart is required after changes.

- **Default**: `"Single Preview"`

### `markdown-preview-enhanced.previewTheme`

Preview Theme.

- **Default**: `"github-light.css"`

### `markdown-preview-enhanced.printBackground`

Whether to print background for file export or not.
If set to `false`, then `github-light` preview theme will be used.
You can also set `print_background` in front-matter for individual files.

- **Default**: `false`

### `markdown-preview-enhanced.protocolsWhiteList`

Accepted protocols for links.

- **Default**: `"http://, https://, atom://, file://, mailto:, tel:"`

### `markdown-preview-enhanced.puppeteerArgs`

Args passed to puppeteer.launch({args: $puppeteerArgs}).

- **Default**: `[]`

### `markdown-preview-enhanced.puppeteerWaitForTimeout`

Puppeteer waits for a certain timeout in milliseconds before the document export.

- **Default**: `0`

### `markdown-preview-enhanced.qiniuAccessKey`

Qiniu AccessKey.

- **Default**: `""`

### `markdown-preview-enhanced.qiniuBucket`

Qiniu Bucket.

- **Default**: `""`

### `markdown-preview-enhanced.qiniuDomain`

Qiniu Domain.

- **Default**: `"http://"`

### `markdown-preview-enhanced.qiniuSecretKey`

Qiniu SecretKey.

- **Default**: `""`

### `markdown-preview-enhanced.revealjsTheme`

RevealJS Presentation Theme.

- **Default**: `"white.css"`

### `markdown-preview-enhanced.scrollSync`

Automatic scroll sync.
This is now partially supported.

- **Default**: `true`

### `markdown-preview-enhanced.useGitHubStylePipedLink`

If checked, we use GitHub style piped wiki links, i.e. [[linkText|wikiLink]].
Otherwise, we use [[wikiLink|linkText]] as the original Wikipedia style.

- **Default**: `false`

### `markdown-preview-enhanced.useVSCodeThemeForContextMenu`

When enabled, the context menu in preview inherits VS Code's theme colors and font instead of the default styling.

- **Default**: `false`

### `markdown-preview-enhanced.webSequenceDiagramsApiKey`

API key for WebSequenceDiagrams.
Required for wider diagram sizes.

- **Default**: `""`

### `markdown-preview-enhanced.webSequenceDiagramsServer`

The URL of the WebSequenceDiagrams server to use for rendering wsd code blocks.

- **Default**: `"https://www.websequencediagrams.com"`

### `markdown-preview-enhanced.wikiLinkResolution`

How bare-filename wiki links (e.g. [[Note]]) are resolved to a file path.

- `relative`: Resolve relative to the current note's directory (default).
- `shortest`: Search all notes by filename, preferring the shortest unique path (with same-directory tiebreaking). Obsidian-style.
- `absolute`: Resolve from the notebook/workspace root.

Links starting with `/` always resolve from the notebook root regardless of this setting.

- **Default**: `"relative"`

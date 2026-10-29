# naumovs.color-highlight

## Settings

### `color-highlight.enable`

Controls if plugin is enabled.

- **Default**: `true`

### `color-highlight.hslWithNoFunctionLanguages`

An array of language ids which should be highlighted by Color Highlight with the rgbWithNoFunction pattern.
`*` to trigger on any language.
Prepend language id with `!` to exclude the language (i.e `!typescript`, `!javascript`).

- **Default**:
  ```json
  ["*"]
  ```

### `color-highlight.languages`

An array of language ids which should be highlighted by Color Highlight.
`*` to trigger on any language.
Prepend language id with `!` to exclude the language (i.e `!typescript`, `!javascript`).

- **Default**:
  ```json
  ["*"]
  ```

### `color-highlight.markerType`

Style of the highlight.
Can be 'dot-before', 'dot-after', 'foreground', 'background', 'outline', 'underline'.

- **Default**: `"background"`

### `color-highlight.markRuler`

Highlight colors on the ruler (scroll bar), true/false.

- **Default**: `true`

### `color-highlight.matchHslWithNoFunction`

Highlight hsl without functions like hsl() ('255, 100%, 80%', [255, 100%, 80%], '255 100% 80%', etc.).

- **Default**: `false`

### `color-highlight.matchRgbWithNoFunction`

Highlight rgb without functions like rgb() ('255, 255, 255', [255, 255, 255], '255 255 255', etc.).

- **Default**: `false`

### `color-highlight.matchWords`

Highlight color words in all files (grey, green, etc.).

- **Default**: `false`

### `color-highlight.rgbWithNoFunctionLanguages`

An array of language ids which should be highlighted by Color Highlight with the rgbWithNoFunction pattern.
`*` to trigger on any language.
Prepend language id with `!` to exclude the language (i.e `!typescript`, `!javascript`).

- **Default**:
  ```json
  ["*"]
  ```

### `color-highlight.sass.includePaths`

Array of absolute paths to search while perform file lookups.

- **Default**: `[]`

### `color-highlight.useARGB`

Highlight HEX values using ARGB instead of RGBA (default).

- **Default**: `false`

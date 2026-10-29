# redhat.vscode-yaml

## Settings

### `redhat.telemetry.enabled`

Enable usage data and errors to be sent to Red Hat servers.
Read our privacy statement.

- **Default**: `null`

### `yaml.completion`

Enable/disable completion feature.

- **Default**: `true`

### `yaml.customTags`

Custom tags for the parser to use.

- **Default**: `[]`

### `yaml.disableAdditionalProperties`

Globally set additionalProperties to false for all objects.
So if its true, no extra properties are allowed inside yaml.

- **Default**: `false`

### `yaml.disableDefaultProperties`

Disable adding not required properties with default values into completion text.

- **Default**: `false`

### `yaml.extension.recommendations`

Suggest additional extensions based on YAML usage.

- **Default**: `"true"`

### `yaml.format.bracketSpacing`

Print spaces between brackets in objects.

- **Default**: `true`

### `yaml.format.enable`

Enable/disable default YAML formatter.

- **Default**: `true`

### `yaml.format.printWidth`

Specify the line length that the printer will wrap on.

- **Default**: `80`

### `yaml.format.proseWrap`

Configure wrapping of prose:

- `always`: Wrap prose if it exceeds the print width.
- `never`: Never wrap the prose.
- `preserve`: Wrap prose as-is.

- **Default**: `"preserve"`

### `yaml.format.singleQuote`

Use single quotes instead of double quotes.

- **Default**: `false`

### `yaml.format.trailingComma`

Specify if trailing commas should be used in JSON-like segments of the YAML.

- **Default**: `true`

### `yaml.hover`

Enable/disable hover feature.

- **Default**: `true`

### `yaml.hoverAnchor`

Enable/disable hover feature for anchors.

- **Default**: `true`

### `yaml.hoverSchemaSource`

Enable/disable showing the schema source in hover tooltips.

- **Default**: `"true"`

### `yaml.keyOrdering`

Enforces alphabetical ordering of keys in mappings when set to true.

- **Default**: `false`

### `yaml.kubernetesCRDStore.enable`

Enable/disable validation of Kubernetes custom resources using schemas from well-known Custom Resource Definitions (CRDs).

- **Default**: `true`

### `yaml.kubernetesCRDStore.url`

The base URL for fetching well-known Custom Resource Definition (CRD) schemas.

- **Default**: `"https://raw.githubusercontent.com/datreeio/CRDs-catalog/main"`

### `yaml.maxItemsComputed`

The maximum number of outline symbols and folding regions computed (limited for performance reasons).

- **Default**: `5000`

### `yaml.schemas`

Associate schemas to YAML files in the current workspace.
The expected value of this configuration option is a string to string map:

- Key: The path or URL of the schema to use.
- Value: A glob pattern or list of glob patterns specifying which files the schema should be used on.

- **Default**: `{}`

### `yaml.schemaStore.enable`

Automatically pull available YAML schemas from JSON Schema Store.

- **Default**: `true`

### `yaml.schemaStore.url`

URL of schema store catalog to use.

- **Default**: `"https://www.schemastore.org/api/json/catalog.json"`

### `yaml.style.flowMapping`

Forbid flow style mappings.

- **Default**: `"allow"`

### `yaml.style.flowSequence`

Forbid flow style sequences.

- **Default**: `"allow"`

### `yaml.suggest.parentSkeletonSelectedFirst`

If true, the user must select some parent skeleton first before autocompletion starts to suggest the rest of the properties.
When yaml object is not empty, autocompletion ignores this setting and returns all properties and skeletons.

- **Default**: `false`

### `yaml.trace.server`

Traces the communication between VSCode and the YAML language service.

- **Default**: `"off"`

### `yaml.validate`

Enable/disable validation feature.

- **Default**: `true`

### `yaml.yamlVersion`

Default YAML spec version.

- **Default**: `"1.2"`

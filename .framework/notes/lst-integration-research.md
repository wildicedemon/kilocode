# OpenRewrite LST Integration Research

## Sources
- [Lossless Semantic Trees (LST)](https://docs.openrewrite.org/concepts-and-explanations/lossless-semantic-trees)
- [openrewrite/rewrite](https://github.com/openrewrite/rewrite)
- [openrewrite/rewrite-javascript README](https://raw.githubusercontent.com/openrewrite/rewrite-javascript/main/README.md)

## Key LST Characteristics
- **Type-attributed**: LST nodes include type information beyond what is in the source code.
- **Format-preserving**: Whitespace and formatting are preserved so code can be reconstituted without clobbering style.

## Language Coverage (OpenRewrite repositories)
- **Java**: `rewrite-java` module in `openrewrite/rewrite`.
- **Kotlin**: `rewrite-kotlin` module in `openrewrite/rewrite`.
- **JavaScript/TypeScript**: `rewrite-javascript` project.

## Node.js Integration Options
### 1) JVM Child Process / CLI Wrapper
- `rewrite-javascript` README states JS/TS support is **only via Moderne CLI or Moderne Platform** at the moment (no native build tool support yet).
- For Java/Kotlin, OpenRewrite is primarily consumed via Java build tool plugins (Gradle/Maven) or Java APIs from `openrewrite/rewrite`.
- **Implication for Node.js**: a practical integration is spawning a Java process (custom wrapper or CLI) that parses a file set and returns a normalized AST/LST payload.

### 2) Remote Service
- The `rewrite-javascript` repo contains `rewrite-javascript-remote-server` and `rewrite-javascript-remote` modules, indicating a remote server/client approach for JS/TS parsing.
- **Implication**: expose a JVM service (REST/IPC) that the VS Code extension can call for LST parsing when enabled.

## Constraints / Notes
- LST type attribution is a core feature (requires type information), so dependency/classpath resolution must be considered in any Java/Kotlin integration.
- JS/TS LST parsing is gated by Moderne CLI/Platform per the `rewrite-javascript` README; this suggests an external tool dependency when using LST for JS/TS.

## Summary for Kilo Code Integration
- **Recommended integration path**: spawn a JVM child process or call a remote LST service for Java/Kotlin, and use Moderne CLI (or a service built on `rewrite-javascript` modules) for JS/TS until native build tool support exists.
- **Supported languages to prioritize**: Java + TypeScript/JavaScript (from OpenRewrite repositories).
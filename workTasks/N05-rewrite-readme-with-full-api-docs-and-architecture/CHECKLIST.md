# N05 Checklist

## Content

- [ ] Header: one-liner + install + peer deps note (keep/trim existing)
- [ ] Quick start: Path A — plugins example
- [ ] Quick start: Path B — modules + `useDebuggerApi` + `updateData` example
- [ ] `<Debugger>` props table corrected (remove `position`, add `modules`, `config`, `onModuleEvent`)
- [ ] `useDebuggerApi()` return values table (`updateData`, `moduleData`, `emit`, `subscribe`)
- [ ] Configuration section: `config.debugger.js` example + inline `config` prop
- [ ] Copy/Export section: explain header button, snapshot shape
- [ ] Development section: verify commands still accurate

## Diagrams (Mermaid)

- [ ] Diagram 1: Component tree (Debugger → providers → panel → accordion items)
- [ ] Diagram 2: Module data flow (registration → runtimeDataRef → snapshot → clipboard/blob)
- [ ] Diagram 3: Module event bus (emit → onModuleEvent, subscribe/send)

## Quality

- [ ] All code snippets are correct TypeScript/TSX (match actual public API)
- [ ] No references to removed/renamed props (`position` at top level, `tabs`, etc.)
- [ ] Mermaid blocks render correctly (valid syntax)
- [ ] README is self-contained — a new user can go from install to working integration

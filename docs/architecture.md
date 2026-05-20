# Architecture

Internal design of `debugger-pro-plus-3000`.

---

## Component tree

```mermaid
graph TD
  Debugger --> DebuggerConfigProvider
  DebuggerConfigProvider --> DebuggerModuleRegistryProvider
  DebuggerModuleRegistryProvider --> DebuggerPanelRoot
  DebuggerPanelRoot --> Header["Header\n⎘ Copy · ▾ Export · ⤢ Fullscreen · ✕ Close"]
  DebuggerPanelRoot --> ModuleStack
  ModuleStack --> AccordionItem_1["AccordionItem (module 1)\nrender() → useDebuggerApi()"]
  ModuleStack --> AccordionItem_N["AccordionItem (module N)"]
  ModuleStack --> Plugin["Plugin AccordionItem\n(render only, no API)"]
```

---

## Module data flow

```mermaid
flowchart LR
  DEF["DebuggerModuleDefinition\n{ id, data, render }"]
  CFG["config.modules[]\n{ id, data, title }"]
  DEF & CFG -->|merged at mount| STATIC["RegisteredModule.data\nstatic slice"]
  CALL["module calls\nupdateData(patch)"]
  CALL -->|no re-render| REF["runtimeDataRef\nMap&lt;moduleId, patch&gt;"]
  STATIC & REF -->|on Copy / Export| SNAP["_getDebugSnapshot()\n{ moduleId: { ...static, ...runtime } }"]
  SNAP -->|writeText| CLIP["Clipboard"]
  SNAP -->|Blob| FILE["debug-snapshot.json / .txt"]
```

`updateData()` writes to a ref — zero re-renders. Runtime patches merge with static data only when the user triggers Copy/Export.

---

## Module event bus

```mermaid
sequenceDiagram
  participant M as Module (useDebuggerApi)
  participant R as DebuggerModuleRegistryProvider
  participant H as onModuleEvent prop

  Note over M,R: Emit up to host app
  M->>R: emit('grantDecision', { granted: true })
  R->>H: onModuleEvent('consent', 'grantDecision', { granted: true })

  Note over M,R: Subscribe to internal messages
  M->>R: subscribe('reload', handler)
  R-->>M: () => unsubscribe
```

---

## Key design decisions

- **`runtimeDataRef` not state** — runtime patches don't cause re-renders; data is only read on-demand at export time.
- **Split plugin / module model** — plugins are zero-setup render slots; modules opt into the API (`useDebuggerApi`) and data registration.
- **Config merge order** — `DebuggerModuleDefinition.data` < `config.modules[].data` < `useDebuggerApi().updateData()` (last write wins per key).
- **`_getDebugSnapshot` closure** — captures `modules[]` from the last render; runtime ref is read at call time, so the snapshot is always fresh.

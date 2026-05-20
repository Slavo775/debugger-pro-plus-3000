# N06 Human Review

**Reviewer:** Human (task-human-review)
**Verdict:** fix-needed

## Feedback

> "please implement module into debugger"

The `deviceInfoModule` export was created and the public API is wired up, but the dev preview app (`src/main.tsx`) does not include `deviceInfoModule` in its `modules` array. The module needs to be added to the `<Debugger>` in `main.tsx` so it is visible in the panel during development and can be manually verified.

## Required Fix

In `src/main.tsx`, import `deviceInfoModule` from `./index` and add it to the `modules` prop of `<Debugger>`:

```tsx
import { Debugger, useDebuggerConfig, useDebuggerApi, deviceInfoModule } from './index'

// ...

<Debugger
  config={debuggerConfig}
  modules={[
    deviceInfoModule,
    { id: 'network', render: () => <NetworkPanel /> },
    { id: 'state', render: () => <StatePanel /> },
    { id: 'config', render: () => <ConfigPanel /> },
  ]}
/>
```

## Blockers

- [ ] `deviceInfoModule` not mounted in the dev preview — cannot visually verify the module renders correctly

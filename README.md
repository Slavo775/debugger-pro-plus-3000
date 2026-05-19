# debugger-pro-plus-3000

A modular, framework-agnostic debugger panel for web applications — distributed as an npm package.

## Install

```bash
npm install debugger-pro-plus-3000
# or
pnpm add debugger-pro-plus-3000
```

React and ReactDOM are peer dependencies (>=18).

## Usage

```tsx
import { Debugger } from 'debugger-pro-plus-3000'

const myPlugin = {
  id: 'state',
  label: 'State',
  render: () => <pre>{JSON.stringify(myState, null, 2)}</pre>,
}

function App() {
  return (
    <>
      <YourApp />
      <Debugger plugins={[myPlugin]} />
    </>
  )
}
```

The `<Debugger>` renders a floating panel with a toggle button — zero impact on your layout.

## Props

| Prop          | Type                                                           | Default          | Description                               |
| ------------- | -------------------------------------------------------------- | ---------------- | ----------------------------------------- |
| `plugins`     | `DebuggerPlugin[]`                                             | `[]`             | Modules rendered as tabs inside the panel |
| `defaultOpen` | `boolean`                                                      | `false`          | Whether the panel starts expanded         |
| `position`    | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Corner the panel anchors to               |

## Plugin interface

```ts
interface DebuggerPlugin {
  id: string
  label: string // tab label
  render: () => ReactNode // tab content
}
```

## Development

```bash
pnpm install
pnpm dev       # start dev server with demo preview
pnpm build     # build the library to dist/
pnpm lint      # ESLint
pnpm format    # Prettier
```

## License

MIT

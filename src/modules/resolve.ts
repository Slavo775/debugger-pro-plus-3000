import type {
  DebuggerModule,
  DebuggerModuleEntry,
  DebuggerModuleEntryObject,
  ResolvedModule,
} from './types'

const warnedUnknownIds = new Set<string>()

function warnOnceUnknown(id: string): void {
  if (warnedUnknownIds.has(id)) return
  warnedUnknownIds.add(id)
  console.warn(`[debugger-pro-plus-3000] Unknown module id: ${id}`)
}

function normalizeEntry(entry: DebuggerModuleEntry): DebuggerModuleEntryObject {
  return typeof entry === 'string' ? { id: entry } : entry
}

function findDescriptor(
  id: string,
  builtIns: Record<string, DebuggerModule<unknown>>,
  customModules: ReadonlyArray<DebuggerModule<unknown>>,
): DebuggerModule<unknown> | undefined {
  if (id in builtIns) return builtIns[id]
  return customModules.find((m) => m.id === id)
}

export function resolveModules(
  configModules: ReadonlyArray<DebuggerModuleEntry>,
  customModules: ReadonlyArray<DebuggerModule<unknown>>,
  builtIns: Record<string, DebuggerModule<unknown>>,
): ResolvedModule[] {
  const resolved: ResolvedModule[] = []
  const consumedIds = new Set<string>()

  for (const rawEntry of configModules) {
    const entry = normalizeEntry(rawEntry)
    const descriptor = findDescriptor(entry.id, builtIns, customModules)
    if (!descriptor) {
      warnOnceUnknown(entry.id)
      continue
    }
    if (consumedIds.has(entry.id)) continue // skip duplicates in the same config
    consumedIds.add(entry.id)

    const title = entry.title ?? descriptor.defaultTitle
    const settings = {
      ...(descriptor.defaultSettings as Record<string, unknown> | undefined),
      ...entry.settings,
    }

    resolved.push({
      id: descriptor.id,
      title,
      instanceKey: descriptor.id,
      render: () => descriptor.render({ settings, title }),
    })
  }

  // Append any custom modules not already consumed by a config entry.
  for (const custom of customModules) {
    if (consumedIds.has(custom.id)) continue
    consumedIds.add(custom.id)
    const title = custom.defaultTitle
    resolved.push({
      id: custom.id,
      title,
      instanceKey: custom.id,
      render: () =>
        custom.render({
          settings: (custom.defaultSettings ?? {}) as unknown,
          title,
        }),
    })
  }

  return resolved
}

import { getCodexAppServerUrl } from './config.js'

function getBunBinary(): string {
  return Bun.which('bun') || process.execPath
}

function spawnManagedProcess(label: string, cmd: string[]): Bun.Subprocess {
  const proc = Bun.spawn(cmd, {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })

  proc.exited.then(code => {
    if (code !== 0) {
      // biome-ignore lint/suspicious/noConsole: stack launcher needs direct process output
      console.error(`[codex-stack] ${label} exited with code ${code}`)
    }
  })

  return proc
}

async function main(): Promise<void> {
  const appServer = spawnManagedProcess('codex app-server', [
    'codex',
    'app-server',
    '--listen',
    getCodexAppServerUrl(),
  ])

  const adapter = spawnManagedProcess('codex adapter', [
    getBunBinary(),
    './packages/codex-anthropic-adapter/src/server.ts',
  ])

  const shutdown = () => {
    appServer.kill()
    adapter.kill()
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await Promise.race([appServer.exited, adapter.exited])
  shutdown()
}

await main()

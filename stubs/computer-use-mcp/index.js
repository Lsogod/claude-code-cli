export const DEFAULT_GRANT_FLAGS = {
  clipboardRead: false,
  clipboardWrite: false,
  systemKeyCombos: false,
}

export const API_RESIZE_PARAMS = {}

export function targetImageSize(width, height) {
  return [width, height]
}

export function buildComputerUseTools() {
  return []
}

export function createComputerUseMcpServer() {
  return {
    setRequestHandler() {},
    async connect() {},
    async close() {},
  }
}

export function bindSessionContext() {
  return async () => ({
    content: [
      {
        type: 'text',
        text: 'Computer Use is unavailable in this reconstructed build.',
      },
    ],
    telemetry: {
      error_kind: 'unavailable',
    },
  })
}

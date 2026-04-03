// Runtime shim for compiled Ink components that side-effect import a
// declaration file path. The original source used `global.d.ts` only for JSX
// intrinsic element typing; the runtime needs a real module to resolve.
export {}

// Registers `@testing-library/jest-dom`'s custom matchers (toBeInTheDocument,
// toHaveAttribute, …) with the type checker. `tsconfig.json` sets an explicit
// `types` allowlist, which otherwise suppresses this global augmentation, so
// `svelte-check` needs the augmentation pulled in from a file under `include`.
import '@testing-library/jest-dom/vitest';

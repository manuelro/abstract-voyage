// Chip is now a shared, global component — see components/Chip/Chip.tsx and
// its config/appearance.{ts,panel.ts} (same split Card.tsx's own
// experiences/abstract/components/Card/{Card.tsx,config/appearance.ts,
// config/appearance.panel.ts} already established). Re-exported here,
// unchanged path, so every existing `from '../components/Chip'` /
// `from './Chip'` import keeps working.
export { default, type ChipProps, type ChipTintAppearance, CHIP_DEFAULT_CLASS_NAME } from './Chip/Chip'

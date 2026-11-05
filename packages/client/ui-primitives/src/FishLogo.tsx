import type { IconProps } from './icons/props.ts'

/** Native viewBox of {@link FISH_LOGO_PATH} (width and height in user units). */
export const FISH_LOGO_VIEWBOX = { width: 24, height: 24 }

/** The ARCline silhouette path data, exported for consumers that compose their own svg around the same geometry. */
export const FISH_LOGO_PATH = 'M12 2C6.48 2 2 6.48 2 12c0 3.31 1.61 6.24 4.09 8.04l1.66-2.02A7.44 7.44 0 0 1 4.5 12c0-4.14 3.36-7.5 7.5-7.5 3.31 0 6.13 2.15 7.09 5.16l2.39-.77A9.99 9.99 0 0 0 12 2zm-1 7.2L6.8 14.4l1.6 1.2 3.6-4.5 3.6 4.5 1.6-1.2L13 9.2c-.5-.6-1.5-.6-2 0zm1 7.8c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z'

/**
 * Render the ARCline logo.
 * @param props.size - width in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg.
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox={`0 0 ${FISH_LOGO_VIEWBOX.width} ${FISH_LOGO_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={FISH_LOGO_PATH} fill="var(--dsw-alias-brand-primary, #6366f1)" />
    </svg>
  )
}

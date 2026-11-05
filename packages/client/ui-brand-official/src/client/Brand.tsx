import { BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the official mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the official ARCline mark.
 */
export function OfficialBrandMark({ size = 24 }: SidebarBrandMarkOwnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arcline-brand-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="url(#arcline-brand-grad)"
        strokeWidth="2.4"
        strokeDasharray="40 18"
        strokeLinecap="round"
      />
      <path
        d="M7 13.5L12 8.5L17 13.5"
        stroke="url(#arcline-brand-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="15.5" r="1.5" fill="#6366f1" />
    </svg>
  )
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} />
}

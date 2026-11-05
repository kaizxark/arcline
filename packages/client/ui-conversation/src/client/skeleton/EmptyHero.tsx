// The composer remains in ConversationRoot so switching out of the blank-draft
// phase does not remount its textarea.

import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  IconChevronDownOutlineRegular, IconFolderCloseRegular, IconFolderOpenRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { workspaceTitleOf } from '@deepseek-ai/dsh-util-workspace-path'
import type { ConversationContentProps } from '../contract/slots.ts'
import css from './HeroShell.module.css'

/** The owner's locale seat type, passed to hero chrome as a plain prop. */
type HeroTranslate = ConversationContentProps['t']

/**
 * Basename label for the workspace chip (the shared derivation);
 * separator-only paths echo the raw cwd.
 * @param cwd - workspace directory path (non-empty).
 * @returns chip label.
 */
export function workspaceLabel(cwd: string): string {
  const base = workspaceTitleOf(cwd)
  return base !== '' ? base : cwd
}

/**
 * The workspace chip (folder + label + chevron), always interactive: before
 * the first message the workspace stays switchable — picking another one
 * moves the New Session flow to that workspace's blank session. Without a
 * label the chip renders its placeholder state: closed folder + the
 * "Choose workspace" call to action.
 * @param props.label - chip label (see {@link workspaceLabel}); omitted → placeholder.
 * @param props.menuOpen - menu expansion echo.
 * @param props.onClick - menu toggle.
 * @returns the chip button element.
 */
export function WorkspaceChip({ buttonRef, label, menuOpen = false, onClick, t }: {
  buttonRef?: RefObject<HTMLButtonElement>
  label?: string | undefined
  menuOpen?: boolean
  onClick?: () => void
  t: HeroTranslate
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={css.workspace}
      aria-label={t('hero.chooseWorkspace')}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={onClick}
    >
      {label === undefined
        ? <IconFolderCloseRegular className={css.folder} size={16} />
        : <IconFolderOpenRegular className={css.folder} size={16} />}
      <span className={css.workspaceLabel}>{label ?? t('hero.chooseWorkspace')}</span>
      <IconChevronDownOutlineRegular className={css.chevron} size={12} />
    </button>
  )
}

/** Hero chrome props. The workspace row rides the InputBar accessory hole, not here. */
export interface HeroShellProps {
  /** The owner's locale seat, passed down as a plain prop. */
  t: HeroTranslate
  /** Authorized renderer for the hero brand-mark slot. */
  renderSlot: ConversationContentProps['renderSlot']
  /** Overlay content after the stack (modals). */
  children?: ReactNode
}

/**
 * The hero brand mark (34px wide), static at rest with gentle hover micro-interaction.
 * @param props.hovering - driven by the hitbox parent's pointer state.
 * @returns the ARCline logo svg element.
 */
function HeroFish({ hovering }: { hovering: boolean }) {
  return (
    <svg
      className={css.fish}
      width={34}
      height={34}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        transform: hovering ? 'scale(1.08) rotate(4deg)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <defs>
        <linearGradient id="hero-arcline-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="url(#hero-arcline-grad)"
        strokeWidth="2.4"
        strokeDasharray="40 18"
        strokeLinecap="round"
      />
      <path
        d="M7 13.5L12 8.5L17 13.5"
        stroke="url(#hero-arcline-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="15.5" r="1.5" fill="#6366f1" />
    </svg>
  )
}

/**
 * Render the hero chrome (headline only; no composer, no workspace row).
 * @param props - see {@link HeroShellProps}.
 * @returns the centered hero element tree.
 */
export function HeroShell({ t, renderSlot, children }: HeroShellProps) {
  const [hovering, setHovering] = useState(false)
  return (
    <div className={css.root}>
      <div className={css.stack}>
        <div className={css.headline}>
          {/* figma 34:10412: fish 34×25 leading the headline, gap 10. */}
          <span
            className={css.fishHitbox}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch'
                && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
                setHovering(true)
              }
            }}
            onPointerLeave={() => { setHovering(false) }}
          >
            {renderSlot('conversation.hero.brand.mark', { size: 34, className: css.fish }, {
              fallback: <HeroFish hovering={hovering} />,
            })}
          </span>
          <span className={css.titleGroup}>
            {/* Own element: keeps the headline text addressable apart from the badge. */}
            <span>{t('hero.headline') || 'ARCline'}</span>
            <span className={css.previewBadge}>{t('hero.preview') || 'Studio'}</span>
          </span>
        </div>
        <div className={css.subtitle}>
          Autonomous agentic coding environment. What would you like to build?
        </div>
        <div className={css.body}>
          {/* The composer remains mounted outside this component. */}
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * Interactive quick commands and starter action cards displayed on the empty session hero.
 * Clicking any suggestion inserts it into the Lexical composer and activates the send flow.
 */
export function HeroSuggestions() {
  const handleInsert = (text: string) => {
    const el = document.querySelector<HTMLElement>('[data-composer-input="true"]')
    if (el) {
      el.focus()
      document.execCommand('insertText', false, text)
    }
  }

  const quickCommands = [
    { label: '/plan', hint: 'Plan tasks step-by-step', text: '/plan ' },
    { label: '/terminal', hint: 'Execute terminal command', text: '/terminal ' },
    { label: '/goal', hint: 'Run autonomous goal', text: '/goal ' },
    { label: '/schedule', hint: 'Schedule recurring automation', text: '/schedule ' },
    { label: '@files', hint: 'Reference project files', text: '@' },
  ]

  const actionCards = [
    {
      icon: '⚡',
      title: 'Explore Architecture',
      desc: 'Map codebase structure, key dependencies, and system entrypoints',
      prompt: 'Explain the architecture of this project, including directory structure, main dependencies, and entrypoints.',
    },
    {
      icon: '🛠️',
      title: 'Build a Feature',
      desc: 'Plan, implement, and verify new capabilities with tests',
      prompt: 'I want to build a new feature. Please help me plan the implementation steps, write clean code, and verify it.',
    },
    {
      icon: '🐞',
      title: 'Debug & Fix Errors',
      desc: 'Diagnose runtime exceptions, failing tests, or unexpected bugs',
      prompt: 'Help me diagnose and fix an issue or test failure in this workspace.',
    },
    {
      icon: '🧪',
      title: 'Test & Refactor',
      desc: 'Increase test coverage, clean up technical debt, and optimize performance',
      prompt: 'Review this project for test coverage and suggest unit tests, optimizations, or refactoring opportunities.',
    },
  ]

  return (
    <div className={css.suggestions}>
      {/* Quick slash command / reference pills */}
      <div className={css.pillsRow} role="group" aria-label="Quick commands">
        <span className={css.pillsLabel}>Quick tools:</span>
        {quickCommands.map(cmd => (
          <button
            key={cmd.label}
            type="button"
            className={css.commandPill}
            title={cmd.hint}
            onClick={() => { handleInsert(cmd.text) }}
          >
            <span className={css.pillCode}>{cmd.label}</span>
          </button>
        ))}
      </div>

      {/* 4 Interactive Starter Cards */}
      <div className={css.cardsGrid}>
        {actionCards.map(card => (
          <button
            key={card.title}
            type="button"
            className={css.starterCard}
            onClick={() => { handleInsert(card.prompt) }}
          >
            <div className={css.cardHeader}>
              <span className={css.cardIcon}>{card.icon}</span>
              <span className={css.cardTitle}>{card.title}</span>
            </div>
            <div className={css.cardDesc}>{card.desc}</div>
          </button>
        ))}
      </div>

      {/* Capabilities feature strip */}
      <div className={css.capabilitiesStrip}>
        <span>Multi-Agent Swarm</span>
        <span className={css.dotSep}>•</span>
        <span>PTC & Persistent Terminals</span>
        <span className={css.dotSep}>•</span>
        <span>Sandboxed Browser</span>
        <span className={css.dotSep}>•</span>
        <span>Extensible Plugins</span>
      </div>
    </div>
  )
}

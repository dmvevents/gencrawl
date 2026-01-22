'use client';

/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for power users:
 * - Cmd/Ctrl + K: Focus search
 * - Cmd/Ctrl + N: New crawl
 * - Cmd/Ctrl + D: Toggle dark mode
 * - Escape: Close modals
 * - 1-8: Switch tabs
 */

import { useEffect, useCallback, useRef } from 'react';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: ShortcutAction[];
  onFocusSearch?: () => void;
  onNewCrawl?: () => void;
  onToggleDarkMode?: () => void;
  onCloseModal?: () => void;
  onSwitchTab?: (tabIndex: number) => void;
  onRefresh?: () => void;
  onToggleSidebar?: () => void;
}

// Default shortcuts
const defaultShortcuts: ShortcutAction[] = [];

/**
 * Check if event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutAction): boolean {
  const key = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  // Check modifier keys
  const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
  const metaMatch = shortcut.meta ? event.metaKey : true;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;

  return key === shortcutKey && ctrlMatch && metaMatch && shiftMatch && altMatch;
}

/**
 * Check if element is an input field
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
}

/**
 * Keyboard shortcuts hook
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    shortcuts = [],
    onFocusSearch,
    onNewCrawl,
    onToggleDarkMode,
    onCloseModal,
    onSwitchTab,
    onRefresh,
    onToggleSidebar,
  } = options;

  // Track registered shortcuts for help display
  const registeredShortcuts = useRef<ShortcutAction[]>([]);

  // Build complete shortcuts list
  const allShortcuts = useCallback((): ShortcutAction[] => {
    const builtInShortcuts: ShortcutAction[] = [];

    // Cmd/Ctrl + K: Focus search
    if (onFocusSearch) {
      builtInShortcuts.push({
        key: 'k',
        ctrl: true,
        action: onFocusSearch,
        description: 'Focus search',
        preventDefault: true,
      });
    }

    // Cmd/Ctrl + N: New crawl
    if (onNewCrawl) {
      builtInShortcuts.push({
        key: 'n',
        ctrl: true,
        action: onNewCrawl,
        description: 'New crawl',
        preventDefault: true,
      });
    }

    // Cmd/Ctrl + D: Toggle dark mode
    if (onToggleDarkMode) {
      builtInShortcuts.push({
        key: 'd',
        ctrl: true,
        action: onToggleDarkMode,
        description: 'Toggle dark mode',
        preventDefault: true,
      });
    }

    // Cmd/Ctrl + R: Refresh
    if (onRefresh) {
      builtInShortcuts.push({
        key: 'r',
        ctrl: true,
        action: onRefresh,
        description: 'Refresh data',
        preventDefault: true,
      });
    }

    // Cmd/Ctrl + B: Toggle sidebar
    if (onToggleSidebar) {
      builtInShortcuts.push({
        key: 'b',
        ctrl: true,
        action: onToggleSidebar,
        description: 'Toggle sidebar',
        preventDefault: true,
      });
    }

    // Escape: Close modal
    if (onCloseModal) {
      builtInShortcuts.push({
        key: 'Escape',
        action: onCloseModal,
        description: 'Close modal',
      });
    }

    // Number keys 1-8: Switch tabs
    if (onSwitchTab) {
      for (let i = 1; i <= 8; i++) {
        builtInShortcuts.push({
          key: String(i),
          action: () => onSwitchTab(i - 1),
          description: `Switch to tab ${i}`,
        });
      }
    }

    return [...builtInShortcuts, ...shortcuts];
  }, [
    shortcuts,
    onFocusSearch,
    onNewCrawl,
    onToggleDarkMode,
    onCloseModal,
    onSwitchTab,
    onRefresh,
    onToggleSidebar,
  ]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      // Exception: Escape should always work
      if (isInputElement(document.activeElement) && event.key !== 'Escape') {
        return;
      }

      const currentShortcuts = allShortcuts();

      for (const shortcut of currentShortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled, allShortcuts]
  );

  // Register event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    registeredShortcuts.current = allShortcuts();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown, allShortcuts]);

  // Return registered shortcuts for help display
  return {
    shortcuts: registeredShortcuts.current,
    enabled,
  };
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutAction): string {
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    // Use Cmd on Mac, Ctrl on others
    const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
    parts.push(isMac ? 'Cmd' : 'Ctrl');
  }

  if (shortcut.shift) {
    parts.push('Shift');
  }

  if (shortcut.alt) {
    const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
    parts.push(isMac ? 'Option' : 'Alt');
  }

  // Format special keys
  let keyDisplay = shortcut.key;
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'ArrowUp') keyDisplay = 'Up';
  if (shortcut.key === 'ArrowDown') keyDisplay = 'Down';
  if (shortcut.key === 'ArrowLeft') keyDisplay = 'Left';
  if (shortcut.key === 'ArrowRight') keyDisplay = 'Right';
  if (shortcut.key === ' ') keyDisplay = 'Space';

  parts.push(keyDisplay.toUpperCase());

  return parts.join(' + ');
}

/**
 * Get all available shortcuts
 */
export function getAvailableShortcuts(): { key: string; description: string }[] {
  return [
    { key: 'Cmd/Ctrl + K', description: 'Focus search' },
    { key: 'Cmd/Ctrl + N', description: 'New crawl' },
    { key: 'Cmd/Ctrl + D', description: 'Toggle dark mode' },
    { key: 'Cmd/Ctrl + R', description: 'Refresh data' },
    { key: 'Cmd/Ctrl + B', description: 'Toggle sidebar' },
    { key: 'Escape', description: 'Close modal / Clear selection' },
    { key: '1-8', description: 'Switch tabs' },
  ];
}

export default useKeyboardShortcuts;

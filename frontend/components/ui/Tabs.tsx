'use client';

/**
 * Tabs Component
 *
 * A flexible tabs component with support for:
 * - Controlled and uncontrolled modes
 * - Badges and icons
 * - Dark mode
 * - Keyboard navigation
 */

import React, { createContext, useContext, useState, useCallback, KeyboardEvent } from 'react';

// Tab context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

// Tabs container
interface TabsProps {
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  children,
  className = '',
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || '');

  const activeTab = controlledActiveTab ?? internalActiveTab;

  const setActiveTab = useCallback(
    (id: string) => {
      if (controlledActiveTab === undefined) {
        setInternalActiveTab(id);
      }
      onTabChange?.(id);
    },
    [controlledActiveTab, onTabChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab list container
interface TabListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'underline' | 'pills' | 'boxed';
}

export function TabList({
  children,
  className = '',
  variant = 'underline',
}: TabListProps) {
  const variantClasses = {
    underline: 'border-b border-gray-200 dark:border-gray-700',
    pills: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
    boxed: 'border border-gray-200 dark:border-gray-700 rounded-lg p-1',
  };

  return (
    <div
      role="tablist"
      className={`flex gap-2 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

// Individual tab
interface TabProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  badge?: number | string;
  icon?: React.ReactNode;
  className?: string;
}

export function Tab({
  id,
  children,
  disabled = false,
  badge,
  icon,
  className = '',
}: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 font-medium text-sm
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${
          isActive
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px'
            : 'text-gray-600 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span
          className={`
            ml-1 px-2 py-0.5 text-xs font-medium rounded-full
            ${
              isActive
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
          `}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Tab panels container
interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanels({ children, className = '' }: TabPanelsProps) {
  return <div className={className}>{children}</div>;
}

// Individual tab panel
interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={`animate-fadeIn ${className}`}
    >
      {children}
    </div>
  );
}

// Simple tabs component (all-in-one)
interface SimpleTab {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SimpleTabsProps {
  tabs: SimpleTab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  tabListClassName?: string;
  tabPanelClassName?: string;
  variant?: 'underline' | 'pills' | 'boxed';
}

export function SimpleTabs({
  tabs,
  defaultTab,
  activeTab,
  onTabChange,
  className = '',
  tabListClassName = '',
  tabPanelClassName = '',
  variant = 'underline',
}: SimpleTabsProps) {
  return (
    <Tabs
      defaultTab={defaultTab || tabs[0]?.id}
      activeTab={activeTab}
      onTabChange={onTabChange}
      className={className}
    >
      <TabList variant={variant} className={tabListClassName}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            badge={tab.badge}
            disabled={tab.disabled}
            icon={tab.icon}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className={`mt-4 ${tabPanelClassName}`}>
        {tabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

export default Tabs;

import { createContext, useContext, type ReactNode } from 'react';
import type { WidgetContextValue } from '../contracts/widget-definition';

const WidgetContext = createContext<WidgetContextValue | null>(null);

export interface WidgetContextProviderProps<TData = unknown> {
  value: WidgetContextValue<TData>;
  children: ReactNode;
}

export function WidgetContextProvider<TData = unknown>({
  value,
  children,
}: WidgetContextProviderProps<TData>) {
  return (
    <WidgetContext.Provider value={value as WidgetContextValue}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgetContext<TData = unknown>(): WidgetContextValue<TData> {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error('useWidgetContext must be used within WidgetContextProvider');
  }
  return ctx as WidgetContextValue<TData>;
}

export { WidgetContext };

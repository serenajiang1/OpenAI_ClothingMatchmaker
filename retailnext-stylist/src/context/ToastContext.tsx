import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastMessage = {
  text: string;
  action?: ToastAction;
};

type ToastFn = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);

  const show = useCallback((msg: string, action?: ToastAction) => {
    setMessage({ text: msg, action });
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div
          className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-soft border border-ink bg-ink px-5 py-3 text-sm text-cream shadow-xl"
          role="status"
        >
          <div className="inline-flex items-center gap-4">
            <span>{message.text}</span>
            {message.action ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:text-accent"
                onClick={() => {
                  message.action?.onClick();
                  setMessage(null);
                }}
              >
                {message.action.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return () => {};
  }
  return ctx;
}

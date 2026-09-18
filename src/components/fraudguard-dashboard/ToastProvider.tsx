"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ToastMessage, ToastTone } from "./types";
import styles from "./SecurityDashboard.module.css";

interface ToastContextValue {
  toast: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((tone: ToastTone, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {messages.length > 0 && (
        <div className={styles.toastContainer} aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.toast} ${styles[`toast_${msg.tone}`]}`}
              role="alert"
            >
              <span>{msg.message}</span>
              <button
                className={styles.toastClose}
                onClick={() =>
                  setMessages((prev) => prev.filter((m) => m.id !== msg.id))
                }
                aria-label="Dismiss"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  titre: string;
  message?: string;
}

interface ToastOptions {
  titre: string;
  message?: string;
  type?: ToastType;
  dureeMs?: number;
}

interface ToastContextValue {
  afficherToast: (options: ToastOptions) => void;
  succes: (titre: string, message?: string, dureeMs?: number) => void;
  erreur: (titre: string, message?: string, dureeMs?: number) => void;
  attention: (titre: string, message?: string, dureeMs?: number) => void;
  info: (titre: string, message?: string, dureeMs?: number) => void;
  fermerToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DUREE_DEFAUT: Record<ToastType, number> = {
  success: 3600,
  info: 3600,
  warning: 4500,
  error: 5000,
};

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fermerToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((precedents) => precedents.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const afficherToast = useCallback(
    ({ titre, message, type = 'info', dureeMs }: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nouveau: ToastItem = { id, type, titre, message };

      setToasts((precedents) => {
        const restants = precedents.slice(-(MAX_TOASTS - 1));
        const supprimes = precedents.slice(0, Math.max(0, precedents.length - (MAX_TOASTS - 1)));
        for (const s of supprimes) {
          const t = timersRef.current.get(s.id);
          if (t) {
            clearTimeout(t);
            timersRef.current.delete(s.id);
          }
        }
        return [...restants, nouveau];
      });

      const delai = dureeMs ?? DUREE_DEFAUT[type];
      if (delai > 0) {
        const timer = setTimeout(() => {
          fermerToast(id);
        }, delai);
        timersRef.current.set(id, timer);
      }
    },
    [fermerToast]
  );

  const succes = useCallback(
    (titre: string, message?: string, dureeMs?: number) =>
      afficherToast({ titre, message, type: 'success', dureeMs }),
    [afficherToast]
  );

  const erreur = useCallback(
    (titre: string, message?: string, dureeMs?: number) =>
      afficherToast({ titre, message, type: 'error', dureeMs }),
    [afficherToast]
  );

  const attention = useCallback(
    (titre: string, message?: string, dureeMs?: number) =>
      afficherToast({ titre, message, type: 'warning', dureeMs }),
    [afficherToast]
  );

  const info = useCallback(
    (titre: string, message?: string, dureeMs?: number) =>
      afficherToast({ titre, message, type: 'info', dureeMs }),
    [afficherToast]
  );

  const valeur = useMemo<ToastContextValue>(
    () => ({ afficherToast, succes, erreur, attention, info, fermerToast }),
    [afficherToast, succes, erreur, attention, info, fermerToast]
  );

  return (
    <ToastContext.Provider value={valeur}>
      {children}

      {/* Conteneur des notifications toasts */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="no-print pointer-events-none fixed left-3 right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[70] flex flex-col gap-2 sm:left-auto sm:right-5 sm:top-5 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => {
          const stylesParType: Record<
            ToastType,
            {
              bordure: string;
              fondIcone: string;
              texteIcone: string;
              Icone: typeof CheckCircle2;
            }
          > = {
            success: {
              bordure: 'border-emerald-200 dark:border-emerald-800/80',
              fondIcone: 'bg-emerald-100 dark:bg-emerald-950/80',
              texteIcone: 'text-emerald-600 dark:text-emerald-400',
              Icone: CheckCircle2,
            },
            error: {
              bordure: 'border-red-200 dark:border-red-800/80',
              fondIcone: 'bg-red-100 dark:bg-red-950/80',
              texteIcone: 'text-red-600 dark:text-red-400',
              Icone: AlertCircle,
            },
            warning: {
              bordure: 'border-amber-200 dark:border-amber-800/80',
              fondIcone: 'bg-amber-100 dark:bg-amber-950/80',
              texteIcone: 'text-amber-600 dark:text-amber-400',
              Icone: AlertTriangle,
            },
            info: {
              bordure: 'border-blue-200 dark:border-blue-800/80',
              fondIcone: 'bg-blue-100 dark:bg-blue-950/80',
              texteIcone: 'text-[#0A3072] dark:text-blue-400',
              Icone: Info,
            },
          };

          const config = stylesParType[toast.type];
          const Icone = config.Icone;

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`toast-slide-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 p-3.5 shadow-lg backdrop-blur-md dark:bg-slate-900/95 ${config.bordure}`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.fondIcone} ${config.texteIcone}`}
              >
                <Icone className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm">
                  {toast.titre}
                </div>
                {toast.message && (
                  <p className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-300">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => fermerToast(toast.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l’intérieur de ToastProvider.');
  }
  return ctx;
}

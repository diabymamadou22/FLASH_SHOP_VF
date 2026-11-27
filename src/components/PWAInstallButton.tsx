import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function PWAInstallButton() {
  const { peutInstaller, estInstalle, estIOS, installer } = usePWAInstall();
  const [aideIOSOuverte, setAideIOSOuverte] = useState(false);

  if (estInstalle) {
    return null;
  }

  if (peutInstaller) {
    return (
      <button
        type="button"
        onClick={installer}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap sm:px-3"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="sm:hidden">Installer</span>
        <span className="hidden sm:inline">Installer l&apos;app</span>
      </button>
    );
  }

  if (estIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAideIOSOuverte(true)}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-semibold text-[#0A3072] hover:bg-blue-100 whitespace-nowrap dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 sm:px-3"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="sm:hidden">App iOS</span>
          <span className="hidden sm:inline">Installer sur iPhone</span>
        </button>

        {aideIOSOuverte && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
            <div className="pb-safe max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Installer FLASH-SHOP sur iPhone
                </h3>
                <button
                  type="button"
                  onClick={() => setAideIOSOuverte(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                1. Ouvrez ce lien dans <strong>Safari</strong> puis appuyez sur le bouton{' '}
                <strong>Partager</strong> (carré avec flèche vers le haut).
                <br />
                2. Faites défiler et appuyez sur <strong>Sur l&apos;écran d&apos;accueil</strong>.
                <br />
                3. Appuyez sur <strong>Ajouter</strong> : l&apos;application s&apos;ouvrira en plein
                écran comme une vraie application mobile.
              </p>
              <button
                type="button"
                onClick={() => setAideIOSOuverte(false)}
                className="mt-4 h-9 w-full rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 sm:text-sm"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

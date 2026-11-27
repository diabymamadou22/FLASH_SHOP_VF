import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import { ParametresBoutique } from '../types';

interface ConnexionPageProps {
  parametres: ParametresBoutique;
  onConnexion: (nomUtilisateur: string, motDePasse: string) => boolean;
}

/**
 * Illustration vectorielle 3D lumineuse du chariot bleu néon avec sac orange sur socle.
 */
function ChariotNeon3D({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#2563EB" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#041538" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bagOrange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB020" />
          <stop offset="55%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="cartBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93E5FF" />
          <stop offset="45%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo sous le socle */}
      <ellipse cx="130" cy="206" rx="108" ry="30" fill="url(#pedestalGlow)" />

      {/* Socle cylindrique lumineux */}
      <ellipse cx="130" cy="198" rx="84" ry="20" fill="#07225A" stroke="#38BDF8" strokeWidth="2.5" />
      <ellipse cx="130" cy="192" rx="84" ry="18" fill="#0B3280" stroke="#7DD3FC" strokeWidth="2" />
      <ellipse cx="130" cy="190" rx="68" ry="12" fill="#072154" stroke="#38BDF8" strokeOpacity="0.7" strokeWidth="1.5" />

      {/* Sac shopping orange à l'intérieur du chariot */}
      <g filter="url(#neonGlow)">
        <path
          d="M116 74 C116 55, 146 55, 146 74"
          stroke="#FDE047"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <polygon points="103,75 162,75 156,144 98,144" rx="6" fill="url(#bagOrange)" />
        <polygon points="162,75 174,84 166,144 156,144" fill="#C2410C" opacity="0.9" />
        <path
          d="M123 76 C123 60, 150 60, 150 76"
          stroke="#FDBA74"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/* Chariot 3D bleu néon */}
      <g filter="url(#neonGlow)">
        {/* Poignée */}
        <path
          d="M42 82 L68 82 L88 152 L176 152"
          stroke="url(#cartBlue)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 82 L54 82"
          stroke="#E0F2FE"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Panier principal */}
        <path
          d="M74 96 L192 96 L176 152 L88 152 Z"
          fill="#1E40AF"
          fillOpacity="0.35"
          stroke="url(#cartBlue)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {/* Barres horizontales et verticales de la grille */}
        <line x1="80" y1="115" x2="186" y2="115" stroke="#7DD3FC" strokeWidth="3" strokeOpacity="0.85" />
        <line x1="84" y1="133" x2="181" y2="133" stroke="#7DD3FC" strokeWidth="3" strokeOpacity="0.85" />
        <line x1="102" y1="96" x2="108" y2="152" stroke="#7DD3FC" strokeWidth="3" strokeOpacity="0.85" />
        <line x1="130" y1="96" x2="132" y2="152" stroke="#7DD3FC" strokeWidth="3" strokeOpacity="0.85" />
        <line x1="158" y1="96" x2="155" y2="152" stroke="#7DD3FC" strokeWidth="3" strokeOpacity="0.85" />

        {/* Base du châssis */}
        <path
          d="M88 152 L78 171 L172 171"
          stroke="url(#cartBlue)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Roues */}
        <circle cx="96" cy="183" r="10" fill="#07225A" stroke="#7DD3FC" strokeWidth="4" />
        <circle cx="96" cy="183" r="3.5" fill="#E0F2FE" />
        <circle cx="160" cy="183" r="10" fill="#07225A" stroke="#7DD3FC" strokeWidth="4" />
        <circle cx="160" cy="183" r="3.5" fill="#E0F2FE" />
      </g>
    </svg>
  );
}

export default function ConnexionPage({ parametres, onConnexion }: ConnexionPageProps) {
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [erreur, setErreur] = useState('');

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    const ok = onConnexion(nomUtilisateur, motDePasse);
    if (!ok) {
      setErreur("Nom d'utilisateur ou mot de passe incorrect.");
    } else {
      setErreur('');
    }
  };

  const nomBoutique = parametres.nomBoutique || 'FLASH-SHOP';
  const indexTiret = nomBoutique.indexOf('-');
  const titreDebut = indexTiret > 0 ? nomBoutique.slice(0, indexTiret) : nomBoutique;
  const titreFin = indexTiret > 0 ? nomBoutique.slice(indexTiret) : '';

  return (
    <div className="pt-safe pb-safe relative flex min-h-[100dvh] items-center justify-center overflow-x-clip overflow-y-auto bg-[#020E2E] p-4 sm:p-6">
      {/* Arrière-plan futuriste bleu & courbes orange */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, #0B3A9E 0%, #051D5C 48%, #020B26 100%)',
        }}
      >
        {/* Vague haut-gauche bleue et orange */}
        <svg
          viewBox="0 0 600 420"
          className="absolute -left-20 -top-16 h-[300px] w-[420px] sm:h-[420px] sm:w-[580px]"
          fill="none"
        >
          <defs>
            <linearGradient id="topBlueWave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#021038" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="topOrangeWave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB020" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          <path
            d="M0 0 H460 C380 120 230 220 0 265 Z"
            fill="url(#topBlueWave)"
          />
          <path
            d="M0 0 H220 C175 78 96 142 0 170 Z"
            fill="url(#topOrangeWave)"
          />
          <path
            d="M0 245 C195 205 335 110 425 0"
            stroke="#38BDF8"
            strokeOpacity="0.45"
            strokeWidth="2.5"
          />
        </svg>

        {/* Vague bas-droite bleue et orange */}
        <svg
          viewBox="0 0 600 420"
          className="absolute -bottom-16 -right-20 h-[280px] w-[400px] sm:h-[420px] sm:w-[580px]"
          fill="none"
        >
          <defs>
            <linearGradient id="botBlueWave" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#031342" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="botOrangeWave" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#FF9E1B" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          <path
            d="M600 420 H140 C225 275 375 180 600 135 Z"
            fill="url(#botBlueWave)"
          />
          <path
            d="M600 420 H340 C405 315 485 245 600 220 Z"
            fill="url(#botOrangeWave)"
          />
          <path
            d="M175 420 C265 290 405 190 600 148"
            stroke="#38BDF8"
            strokeOpacity="0.4"
            strokeWidth="2.5"
          />
        </svg>

        {/* Courbe fluide droite */}
        <div className="absolute -right-24 top-1/4 hidden h-[520px] w-[260px] rounded-full bg-blue-500/10 blur-3xl lg:block" />

        {/* Chariot flouté en arrière-plan gauche (desktop) */}
        <div className="absolute bottom-14 left-[4%] hidden opacity-45 blur-[5px] lg:block">
          <ChariotNeon3D className="h-56 w-56" />
        </div>
      </div>

      {/* Carte centrale glassmorphisme avec bordure cyan lumineuse */}
      <div className="relative z-10 w-full max-w-[740px] rounded-[28px] border border-cyan-300/60 bg-gradient-to-br from-[#07266B]/75 via-[#051B52]/80 to-[#03123A]/85 px-6 py-7 shadow-[0_0_45px_rgba(34,211,238,0.28),inset_0_0_28px_rgba(59,130,246,0.25)] backdrop-blur-xl sm:px-10 sm:py-8">
        {/* Reflet lumineux haut de carte */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent"
        />

        {/* En-tête de marque */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span>{titreDebut}</span>
            {titreFin && <span className="text-[#FF951C]">{titreFin}</span>}
          </h1>

          <div className="mx-auto mt-1.5 flex max-w-md items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-200/60" />
            <p className="text-xs font-medium tracking-wide text-blue-100/95 sm:text-sm">
              {parametres.sousTitre}
            </p>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-200/60" />
          </div>
        </div>

        {/* Corps 2 colonnes (Chariot 3D à gauche sur tablette/desktop + Formulaire à droite) */}
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[215px_1fr] md:gap-8">
          <div className="hidden items-center justify-center md:flex">
            <ChariotNeon3D className="h-52 w-52 drop-shadow-[0_10px_25px_rgba(37,99,235,0.45)]" />
          </div>

          <form onSubmit={soumettre} className="space-y-4">
            {erreur && (
              <div
                role="alert"
                className="rounded-xl border border-red-300/40 bg-red-500/85 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm"
              >
                {erreur}
              </div>
            )}

            <div>
              <label
                htmlFor="login-username"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white sm:text-sm"
              >
                <User className="h-3.5 w-3.5 text-blue-100" />
                <span>Nom utilisateur</span>
                <span className="text-[#FF8A00]">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0A2E7A]">
                  <User className="h-3.5 w-3.5" />
                </span>
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  value={nomUtilisateur}
                  onChange={(e) => setNomUtilisateur(e.target.value)}
                  placeholder="Entrez votre nom d'utilisateur"
                  className="min-h-[46px] w-full rounded-xl border border-blue-300/40 bg-[#1B3E8C]/70 py-2.5 pl-11 pr-3.5 text-sm text-white placeholder:text-blue-200/70 focus:border-cyan-300 focus:bg-[#1E469E]/85 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white sm:text-sm"
              >
                <Lock className="h-3.5 w-3.5 text-blue-100" />
                <span>Mot de passe</span>
                <span className="text-[#FF8A00]">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0A2E7A]">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input
                  id="login-password"
                  type={afficherMotDePasse ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Saisissez votre mot de passe"
                  className="min-h-[46px] w-full rounded-xl border border-blue-300/40 bg-[#1B3E8C]/70 py-2.5 pl-11 pr-11 text-sm text-white placeholder:text-blue-200/70 focus:border-cyan-300 focus:bg-[#1E469E]/85 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAfficherMotDePasse((v) => !v)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-blue-100/85 hover:bg-white/10 hover:text-white"
                  aria-label={
                    afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                  title={afficherMotDePasse ? 'Masquer' : 'Afficher'}
                >
                  {afficherMotDePasse ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF930F] to-[#FF6A00] text-sm font-bold text-white shadow-[0_8px_22px_rgba(255,115,0,0.45)] transition-all hover:from-[#FFA229] hover:to-[#FF7A14] active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4" />
              <span>Se connecter</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

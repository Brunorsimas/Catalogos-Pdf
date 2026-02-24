import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlipBook } from './components/FlipBook';
import { PDFImportScreen } from './components/PDFImportScreen';
import { usePDFPages } from './hooks/usePDFPages';
import {
  hasSavedPDF,
  loadPDFFromStorage,
  savePDFToStorage,
  deleteSavedPDF,
} from './hooks/usePDFStorage';

type AppState = 'checking' | 'import' | 'loading' | 'catalog' | 'error';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; 
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('checking');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [savedPDFName, setSavedPDFName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstallHint, setShowIOSInstallHint] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // ─── Verificar se há PDF salvo ao iniciar ───────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const hasPDF = await hasSavedPDF();
      if (hasPDF) {
        const stored = await loadPDFFromStorage();
        if (stored) {
          setPdfUrl(stored.url);
          setSavedPDFName(stored.name);
          setAppState('loading');
          return;
        }
      }
      // Nenhum PDF salvo → mostrar tela de importação
      setAppState('import');
    };
    init();
  }, []);

  useEffect(() => {
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(isStandalone);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      setShowIOSInstallHint(false);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOSDevice(isIOS);
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      setShowIOSInstallHint(true);
    }
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isInstalled) return;

    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        const choice = await installPromptEvent.userChoice;
        console.log('Resultado instalação PWA:', choice.outcome);
      } catch (err) {
        console.log('Falha ao exibir prompt de instalação:', err);
      } finally {
        setInstallPromptEvent(null);
      }
      return;
    }

    if (isIOSDevice) {
      setShowIOSInstallHint(true);
    }
  }, [installPromptEvent, isIOSDevice, isInstalled]);

  const shouldShowInstallCTA = !isInstalled && (!!installPromptEvent || isIOSDevice);

  const renderIOSInstallHint = () => (
    <AnimatePresence>
      {showIOSInstallHint && isIOSDevice && !isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-6 left-6 right-6 bg-black/60 backdrop-blur border border-neutral-700 text-white/90 rounded-2xl px-4 py-3 text-sm z-40"
          role="alert"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-neutral-200">
              Para instalar no iPhone/iPad: Compartilhar → Adicionar à Tela de Início
            </p>
            <button
              onClick={() => setShowIOSInstallHint(false)}
              className="text-neutral-300 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Handler de importação do PDF ──────────────────────────────────────────
  const handleImport = useCallback(async (file: File) => {
    const url = await savePDFToStorage(file);
    setPdfUrl(url);
    setSavedPDFName(file.name);
    setAppState('loading');
  }, []);

  // ─── Trocar catálogo (deletar atual e reimportar) ───────────────────────────
  const handleChangePDF = useCallback(async () => {
    await deleteSavedPDF();
    if (pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
    setPdfUrl('');
    setSavedPDFName('');
    setShowMenu(false);
    setAppState('import');
  }, [pdfUrl]);

  const handleCloseCatalog = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}

    setShowMenu(false);
    setAppState('import');
  }, []);

  // ─── Fullscreen imersivo ────────────────────────────────────────────────────
  useEffect(() => {
    if (appState !== 'catalog') return;

    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.log('Fullscreen não disponível:', err);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleFirstInteraction = () => {
      enterFullscreen();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [appState]);

  // ─── Prevenir zoom e double-tap ─────────────────────────────────────────────
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart' as any, prevent);
    document.addEventListener('gesturechange' as any, prevent);

    let lastTap = 0;
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap <= 300) e.preventDefault();
      lastTap = now;
    };
    document.addEventListener('touchend', preventDoubleTap);

    return () => {
      document.removeEventListener('gesturestart' as any, prevent);
      document.removeEventListener('gesturechange' as any, prevent);
      document.removeEventListener('touchend', preventDoubleTap);
    };
  }, []);

  // ─── Hook de páginas PDF (só ativa quando há URL) ───────────────────────────
  const { pages, loading, error } = usePDFPages(
    appState === 'loading' || appState === 'catalog' ? pdfUrl : ''
  );

  // Transição loading → catalog / error
  useEffect(() => {
    if (appState !== 'loading') return;
    if (!loading && pages.length > 0) setAppState('catalog');
    if (!loading && error) {
      setErrorMsg(error);
      setAppState('error');
    }
  }, [loading, pages, error, appState]);

  // ─── Renderização por estado ────────────────────────────────────────────────

  // 1. Verificando storage
  if (appState === 'checking') {
    return (
      <div className="size-full flex items-center justify-center bg-neutral-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-neutral-700 border-t-teal-500 rounded-full"
        />
      </div>
    );
  }

  // 2. Tela de importação
  if (appState === 'import') {
    return (
      <div className="fixed inset-0">
        <PDFImportScreen onImport={handleImport} />

        {shouldShowInstallCTA && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onClick={handleInstallClick}
            className="fixed top-4 right-4 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-full text-sm shadow-lg z-40"
          >
            ⬇️ Instalar App
          </motion.button>
        )}

        {renderIOSInstallHint()}
      </div>
    );
  }

  // 3. Carregando páginas do PDF
  if (appState === 'loading') {
    return (
      <div className="size-full flex flex-col items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-neutral-800 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-teal-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
          </div>
          <div className="text-center">
            <p className="text-xl mb-1">Abrindo Catálogo</p>
            <p className="text-sm text-neutral-500">
              {savedPDFName ? `📄 ${savedPDFName}` : 'Renderizando páginas...'}
            </p>
          </div>
          <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-teal-500 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 4. Erro ao carregar
  if (appState === 'error') {
    return (
      <div className="size-full flex flex-col items-center justify-center bg-neutral-950 text-white p-8">
        <div className="max-w-sm text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl mb-3">Erro ao Carregar</h1>
          <p className="text-neutral-400 mb-6 text-sm">{errorMsg}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleChangePDF}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors"
            >
              Importar Outro PDF
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors text-sm"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Catálogo carregado
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ height: '100dvh', width: '100dvw' }}
    >
      <FlipBook pages={pages} />

      {!showMenu && (
        <button
          onClick={handleCloseCatalog}
          className="fixed top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur border border-neutral-700 text-white/80 hover:text-white rounded-full text-sm z-40"
          aria-label="Fechar catálogo"
        >
          ✕ Fechar
        </button>
      )}

      {shouldShowInstallCTA && !showMenu && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          onClick={handleInstallClick}
          className="fixed top-4 right-4 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-full text-sm shadow-lg z-40"
        >
          ⬇️ Instalar App
        </motion.button>
      )}

      {renderIOSInstallHint()}

      {/* Menu discreto (longo toque no canto superior direito) */}
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="fixed top-0 right-0 w-12 h-12 opacity-0 z-40"
        aria-label="Menu"
      />

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />

            {/* Painel do menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed top-4 right-4 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[220px]"
            >
              <div className="px-4 py-3 border-b border-neutral-800">
                <p className="text-white text-sm truncate max-w-[180px]">
                  📄 {savedPDFName || 'Catálogo'}
                </p>
                <p className="text-neutral-500 text-xs">{pages.length} páginas</p>
              </div>

              <button
                onClick={handleChangePDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-teal-400 hover:bg-neutral-800 transition-colors text-sm"
              >
                <span>🔄</span>
                Trocar Catálogo
              </button>

              {!isFullscreen && (
                <button
                  onClick={async () => {
                    try {
                      await document.documentElement.requestFullscreen();
                    } catch {}
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 transition-colors text-sm"
                >
                  <span>⛶</span>
                  Tela Cheia
                </button>
              )}

              {!isInstalled && (!!installPromptEvent || isIOSDevice) && (
                <button
                  onClick={async () => {
                    await handleInstallClick();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800 transition-colors text-sm"
                >
                  <span>⬇️</span>
                  Instalar Aplicativo
                </button>
              )}

              <button
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-neutral-500 hover:bg-neutral-800 transition-colors text-sm border-t border-neutral-800"
              >
                <span>✕</span>
                Fechar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Botão de tela cheia (aparece quando fora do fullscreen, some sozinho) */}
      <AnimatePresence>
        {!isFullscreen && !showMenu && appState === 'catalog' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
            onClick={async () => {
              try {
                await document.documentElement.requestFullscreen();
              } catch {}
            }}
            className="fixed bottom-6 right-6 px-4 py-2 bg-black/50 backdrop-blur border border-neutral-700 text-white/70 rounded-full text-xs z-30"
          >
            ⛶ Tela Cheia
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

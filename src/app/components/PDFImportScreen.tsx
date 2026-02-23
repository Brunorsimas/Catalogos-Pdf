import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import turquesaIcon from 'figma:asset/8231cf14c7fa1738c3b24474f7b560634a962f1c.png';

interface PDFImportScreenProps {
  onImport: (file: File) => Promise<void>;
}

export function PDFImportScreen({ onImport }: PDFImportScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file || file.type !== 'application/pdf') {
        setError('Por favor, selecione um arquivo PDF válido.');
        return;
      }

      const maxSize = 500 * 1024 * 1024; // 500 MB
      if (file.size > maxSize) {
        setError('O arquivo é muito grande. Máximo permitido: 500 MB.');
        return;
      }

      setError(null);
      setIsProcessing(true);
      setProgress('Salvando catálogo no dispositivo...');

      try {
        await onImport(file);
      } catch (err) {
        console.error('Erro ao importar PDF:', err);
        setError('Falha ao importar o PDF. Tente novamente.');
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [onImport]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
      {/* Fundo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-5"
            style={{
              width: `${200 + i * 80}px`,
              height: `${200 + i * 80}px`,
              background: 'radial-gradient(circle, #f97316, transparent)',
              left: `${10 + i * 15}%`,
              top: `${5 + i * 12}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isProcessing ? (
          /* Tela de processamento */
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-8 text-white text-center px-8"
          >
            {/* Animação de livro */}
            <div className="relative w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-lg bg-orange-600"
                style={{ transformOrigin: 'left center' }}
                animate={{ rotateY: [0, -40, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-lg bg-orange-400"
                style={{ transformOrigin: 'left center' }}
                animate={{ rotateY: [0, -25, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                📖
              </div>
            </div>

            <div>
              <p className="text-2xl mb-2">Preparando Catálogo</p>
              <p className="text-neutral-400">{progress}</p>
            </div>

            {/* Barra de progresso animada */}
            <div className="w-64 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        ) : (
          /* Tela de importação */
          <motion.div
            key="import"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-8 w-full max-w-md px-6"
          >
            {/* Logo / Ícone */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-900/50">
                <img src={turquesaIcon} alt="Turquesa Catálogo" className="w-full h-full object-contain p-2" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <span className="text-xs text-white">✓</span>
              </motion.div>
            </motion.div>

            {/* Título */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h1 className="text-3xl text-white mb-2">Catálogo Digital</h1>
              <p className="text-neutral-400">
                Importe seu catálogo PDF para começar
              </p>
            </motion.div>

            {/* Área de Drop */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative w-full rounded-2xl border-2 border-dashed p-10 cursor-pointer
                  flex flex-col items-center gap-4 transition-all duration-200
                  ${isDragging
                    ? 'border-orange-400 bg-orange-500/10 scale-[1.02]'
                    : 'border-neutral-700 bg-neutral-900 hover:border-orange-500/60 hover:bg-neutral-800/50'
                  }
                `}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-5xl"
                >
                  {isDragging ? '📂' : '📄'}
                </motion.div>

                <div className="text-center">
                  <p className="text-white mb-1">
                    {isDragging ? 'Solte aqui!' : 'Toque para selecionar'}
                  </p>
                  <p className="text-neutral-500 text-sm">
                    ou arraste o arquivo PDF
                  </p>
                </div>

                <div className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl transition-colors text-sm">
                  Escolher PDF
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleInputChange}
                className="hidden"
              />
            </motion.div>

            {/* Mensagem de erro */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm text-center"
                >
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
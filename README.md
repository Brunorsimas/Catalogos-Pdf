# 📱 Catálogo Digital - Turq PDF

Aplicativo web offline para exibir catálogo de produtos em formato PDF com efeito 3D de virada de página.

## ✅ Erros Corrigidos

**Problema resolvido:** O worker do PDF.js estava tentando carregar de um CDN externo, causando erros de rede.

**Solução aplicada:** Configurado para usar a versão local do worker incluída no pacote `pdfjs-dist`, garantindo funcionamento 100% offline.

## 🚀 Como Usar

### Passo 1: Adicionar seu PDF

1. Crie a pasta `/public/` na raiz do projeto (se não existir)
2. Coloque o arquivo `turq.pdf` dentro da pasta `/public/`
3. Recarregue a página

### Passo 2: Testar Agora (Sem PDF)

O app já está funcionando! Se você não tiver o `turq.pdf`, ele carrega automaticamente um **PDF de demonstração** com 6 páginas de exemplo.

Você verá um aviso amarelo na parte inferior da tela indicando que está usando o PDF demo.

## 🎮 Funcionalidades

- ✨ **Zero interface**: Sem barras de ferramentas ou botões visíveis
- 📖 **Efeito 3D**: Animação realista de virada de página
- 👆 **Gestos intuitivos**: Swipe para navegar entre páginas
- 🖥️ **Fullscreen imersivo**: Oculta todas as barras do sistema Android
- 📴 **100% offline**: Funciona sem internet após instalação
- ⚡ **Alta performance**: Renderização otimizada em 2.5x resolução

## 🔧 Controles

- **Swipe esquerda/direita**: Navegar entre páginas
- **Clique/Toque na tela**: Ativar modo fullscreen
- **Botão "Tela Cheia"**: Reativar fullscreen se sair acidentalmente

## 📦 Próximos Passos

### Opção 1: Instalar como PWA (Progressive Web App)

1. Abra o app no celular usando Chrome/Edge
2. Clique no menu (⋮) → "Adicionar à tela inicial"
3. O app será instalado e funcionará como app nativo

### Opção 2: Converter para APK Android

1. Use uma ferramenta como [PWABuilder](https://www.pwabuilder.com/)
2. Insira a URL do seu app publicado
3. Gere o APK e distribua para sua equipe

## 📁 Estrutura do Projeto

```
/src/app/
  ├── App.tsx                    # Componente principal
  ├── components/
  │   └── FlipBook.tsx          # Componente de virada de página
  ├── hooks/
  │   └── usePDFPages.ts        # Hook para carregar e renderizar PDF
  └── utils/
      └── createSamplePDF.ts    # Gerador de PDF de demonstração
```

## 🛠️ Tecnologias

- **React** + **TypeScript**: Framework principal
- **pdfjs-dist**: Renderização de PDF (worker local)
- **Motion** (Framer Motion): Animações 3D suaves
- **Tailwind CSS**: Estilização
- **Vite**: Build e desenvolvimento

## ⚙️ Configurações Técnicas

### Worker do PDF.js (Já Configurado)

```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
```

Esta configuração garante que o worker seja carregado localmente, eliminando dependências de CDN externos.

### Escala de Renderização

O PDF é renderizado em **2.5x** a resolução padrão para garantir qualidade em telas retina:

```typescript
const scale = 2.5; // Altere em /src/app/hooks/usePDFPages.ts linha 47
```

## 📝 Notas

- O app previne zoom, scroll e outros gestos padrão do navegador
- As páginas são pré-renderizadas como imagens JPEG de alta qualidade
- O modo fullscreen é ativado automaticamente no primeiro toque/clique
- Compatível com Android, iOS e Desktop

---

**Desenvolvido para a equipe de representantes comerciais**


  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then((registration) => {
          console.log("Service Worker registrado:", registration.scope);
        })
        .catch((err) => {
          console.log("Falha ao registrar Service Worker:", err);
        });
    });
  } else {
    console.log("Service Worker não é suportado neste navegador");
  }

  createRoot(document.getElementById("root")!).render(<App />);
  
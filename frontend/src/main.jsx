import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./lib/theme.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster position="top-center" closeButton richColors />
    </ThemeProvider>
  </StrictMode>
);

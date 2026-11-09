import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { resolveSingleHtmlMount } from "../../entry/resolveSingleHtmlMount";

const rootElement = resolveSingleHtmlMount("root");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

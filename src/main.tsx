import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { resolveSingleHtmlMount } from "./entry/resolveSingleHtmlMount";

declare const __XENSONAR_CORE_TEST_BUILD__: boolean;

if (!__XENSONAR_CORE_TEST_BUILD__) {
  void import("./features/l3lab/spectralForge/integral/carrierStrangeAttractorProbe");
}

const rootElement = resolveSingleHtmlMount("root");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);


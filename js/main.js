"use strict";

(() => {
  const PIX_KEY = "0fec9f1a-698f-46b9-9a8f-533ed1aaa298";
  const PROCESSING_DURATION = 1800;
  const IMPACT_DURATION = 850;

  const screenNames = ["intro", "processing", "reveal", "donation", "journey"];
  const screens = Object.fromEntries(screenNames.map((name) => [
    name,
    document.querySelector(`[data-pix-screen="${name}"]`)
  ]));

  const startButton = document.querySelector("[data-pix-start]");
  const restartButton = document.querySelector("[data-pix-restart]");
  const donationButton = document.querySelector("[data-pix-donation]");
  const journeyButton = document.querySelector("[data-pix-journey]");
  const portfolioButton = document.querySelector("[data-pix-enter-portfolio]");
  const copyButton = document.querySelector("[data-pix-copy]");
  const pixKeyDisplay = document.querySelector("[data-pix-key-display]");
  const pixStatus = document.querySelector("[data-pix-status]");
  const impactOverlay = document.querySelector("[data-pix-impact]");
  const experience = document.querySelector(".pix-page");
  const portfolio = document.getElementById("portfolio");

  let processingTimer = null;
  let impactTimer = null;
  let isProcessing = false;
  let isCopying = false;

  function showScreen(name, withImpact = false) {
    Object.entries(screens).forEach(([screenName, screen]) => {
      const active = screenName === name;
      screen.hidden = !active;
      screen.setAttribute("aria-hidden", String(!active));
    });

    if (impactTimer !== null) window.clearTimeout(impactTimer);
    impactOverlay.hidden = !withImpact;

    if (withImpact) {
      impactTimer = window.setTimeout(() => {
        impactOverlay.hidden = true;
        impactTimer = null;
      }, IMPACT_DURATION);
    }

    const heading = screens[name].querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  function startExperience() {
    if (isProcessing) return;
    isProcessing = true;
    startButton.disabled = true;
    showScreen("processing");

    processingTimer = window.setTimeout(() => {
      processingTimer = null;
      isProcessing = false;
      startButton.disabled = false;
      showScreen("reveal", true);
    }, PROCESSING_DURATION);
  }

  function restartExperience() {
    if (processingTimer !== null) window.clearTimeout(processingTimer);
    processingTimer = null;
    isProcessing = false;
    startButton.disabled = false;
    showScreen("intro");
  }

  function openPortfolio() {
    if (processingTimer !== null) window.clearTimeout(processingTimer);
    if (impactTimer !== null) window.clearTimeout(impactTimer);
    experience.hidden = true;
    portfolio.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const heading = portfolio.querySelector("h1");
    if (heading) heading.focus({ preventScroll: true });
  }

  async function copyPixKey() {
    if (isCopying) return;
    isCopying = true;
    copyButton.disabled = true;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(PIX_KEY);
      } else {
        const input = document.createElement("textarea");
        input.value = PIX_KEY;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Falha ao copiar a chave.");
      }

      pixStatus.textContent = "Chave Pix copiada. Obrigado pelo apoio!";
      copyButton.textContent = "Chave copiada ✓";
    } catch (error) {
      console.error("[A.RISE] Não foi possível copiar a chave Pix:", error);
      pixStatus.textContent = "Não foi possível copiar automaticamente. Selecione a chave acima e copie manualmente.";
    } finally {
      isCopying = false;
      copyButton.disabled = false;
    }
  }

  function initialize() {
    const required = [
      ...Object.values(screens), startButton, restartButton, donationButton,
      journeyButton, portfolioButton, copyButton, pixKeyDisplay, pixStatus,
      impactOverlay, experience, portfolio
    ];

    if (required.some((element) => !element)) {
      console.error("[A.RISE] Estrutura da experiência incompleta.");
      return;
    }

    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });

    pixKeyDisplay.textContent = PIX_KEY;
    startButton.addEventListener("click", startExperience);
    restartButton.addEventListener("click", restartExperience);
    donationButton.addEventListener("click", () => showScreen("donation"));
    journeyButton.addEventListener("click", () => showScreen("journey"));
    portfolioButton.addEventListener("click", openPortfolio);
    copyButton.addEventListener("click", copyPixKey);

    showScreen("intro");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

"use strict";

(() => {
  const PIX_KEY = "0fec9f1a-698f-46b9-9a8f-533ed1aaa298";
  const PROCESSING_STEP_DURATION = 950;
  const PROCESSING_STEPS = [
    "Iniciando consulta",
    "Buscando informações",
    "Analisando dados",
    "Calculando valor",
    "Finalizando consulta"
  ];
  const IMPACT_DURATION = 850;
  const JOKE_REVEAL_DELAY = 3200;

  const screenNames = ["intro", "processing", "reveal", "donation", "journey"];
  const screens = Object.fromEntries(screenNames.map((name) => [
    name,
    document.querySelector(`[data-pix-screen="${name}"]`)
  ]));

  const startButton = document.querySelector("[data-pix-start]");
  const restartButton = document.querySelector("[data-pix-restart]");
  const jokeReveal = document.querySelector("[data-pix-joke-reveal]");
  const donationButton = document.querySelector("[data-pix-donation]");
  const journeyButton = document.querySelector("[data-pix-journey]");
  const portfolioButton = document.querySelector("[data-pix-enter-portfolio]");
  const copyButton = document.querySelector("[data-pix-copy]");
  const pixKeyDisplay = document.querySelector("[data-pix-key-display]");
  const pixStatus = document.querySelector("[data-pix-status]");
  const processingMessage = document.querySelector("[data-pix-processing-message]");
  const processingPercent = document.querySelector("[data-pix-processing-percent]");
  const processingStep = document.querySelector("[data-pix-processing-step]");
  const progressBar = document.querySelector("[data-pix-progress]");
  const progressFill = document.querySelector("[data-pix-progress-fill]");
  const impactOverlay = document.querySelector("[data-pix-impact]");
  const experience = document.querySelector(".pix-page");
  const portfolio = document.getElementById("portfolio");

  let processingTimer = null;
  let impactTimer = null;
  let jokeRevealTimer = null;
  let isProcessing = false;
  let isCopying = false;

  function showScreen(name, withImpact = false) {
    const target = screens[name];
    if (!target) {
      console.error(`[A.RISE] Tela não encontrada: ${name}`);
      return;
    }

    if (jokeRevealTimer !== null) window.clearTimeout(jokeRevealTimer);
    jokeRevealTimer = null;
    if (jokeReveal) {
      jokeReveal.hidden = true;
      jokeReveal.setAttribute("aria-hidden", "true");
      jokeReveal.classList.remove("is-visible");
    }

    Object.entries(screens).forEach(([screenName, screen]) => {
      if (!screen) return;
      const active = screenName === name;
      screen.hidden = !active;
      screen.setAttribute("aria-hidden", String(!active));
    });

    if (impactTimer !== null) window.clearTimeout(impactTimer);
    if (impactOverlay) {
      impactOverlay.hidden = !withImpact;
      if (withImpact) {
        impactTimer = window.setTimeout(() => {
          impactOverlay.hidden = true;
          impactTimer = null;
        }, IMPACT_DURATION);
      }
    }

    if (name === "reveal" && jokeReveal) {
      jokeRevealTimer = window.setTimeout(() => {
        jokeReveal.hidden = false;
        jokeReveal.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => jokeReveal.classList.add("is-visible"));
        jokeRevealTimer = null;
      }, JOKE_REVEAL_DELAY);
    }

    const heading = name === "reveal" ? null : target.querySelector("h1");
    const focusTarget = heading || target;
    focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus();
  }

  function updateProcessingProgress(stepIndex) {
    const percent = Math.round(((stepIndex + 1) / PROCESSING_STEPS.length) * 100);
    if (processingMessage) processingMessage.textContent = PROCESSING_STEPS[stepIndex];
    if (processingPercent) processingPercent.textContent = String(percent).padStart(2, "0") + "%";
    if (processingStep) processingStep.textContent = `ETAPA ${String(stepIndex + 1).padStart(2, "0")} / ${String(PROCESSING_STEPS.length).padStart(2, "0")}`;
    if (progressBar) progressBar.setAttribute("aria-valuenow", String(percent));
    if (progressFill) progressFill.style.width = percent + "%";
  }

  function runProcessingStep(stepIndex = 0) {
    updateProcessingProgress(stepIndex);
    processingTimer = window.setTimeout(() => {
      if (stepIndex + 1 < PROCESSING_STEPS.length) {
        runProcessingStep(stepIndex + 1);
        return;
      }
      processingTimer = null;
      isProcessing = false;
      if (startButton) startButton.disabled = false;
      showScreen("reveal", true);
    }, PROCESSING_STEP_DURATION);
  }

  function startExperience() {
    if (isProcessing || !startButton) return;
    isProcessing = true;
    startButton.disabled = true;
    if (progressFill) progressFill.style.width = "0%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", "0");
    if (processingPercent) processingPercent.textContent = "00%";
    if (processingStep) processingStep.textContent = "ETAPA 00 / 05";
    showScreen("processing");
    runProcessingStep(0);
  }

  function restartExperience() {
    if (processingTimer !== null) window.clearTimeout(processingTimer);
    processingTimer = null;
    isProcessing = false;
    if (startButton) startButton.disabled = false;
    showScreen("intro");
  }

  function openPortfolio() {
    if (!experience || !portfolio) return;
    if (processingTimer !== null) window.clearTimeout(processingTimer);
    if (impactTimer !== null) window.clearTimeout(impactTimer);
    if (jokeRevealTimer !== null) window.clearTimeout(jokeRevealTimer);
    processingTimer = null;
    jokeRevealTimer = null;
    impactTimer = null;
    experience.hidden = true;
    portfolio.hidden = false;
    window.scrollTo(0, 0);
    const heading = portfolio.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }

  function legacyCopy(text) {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.top = "0";
    input.style.left = "-9999px";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      input.remove();
    }
    return copied;
  }

  async function copyPixKey() {
    if (isCopying || !copyButton || !pixStatus) return;
    isCopying = true;
    copyButton.disabled = true;

    try {
      let copied = false;

      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(PIX_KEY);
          copied = true;
        } catch (clipboardError) {
          console.warn("[A.RISE] Clipboard API indisponível; tentando método alternativo.", clipboardError);
        }
      }

      if (!copied) copied = legacyCopy(PIX_KEY);
      if (!copied) throw new Error("O navegador não permitiu copiar automaticamente.");

      pixStatus.textContent = "Chave Pix copiada. Obrigado pelo apoio!";
      copyButton.textContent = "Chave copiada ✓";
    } catch (error) {
      console.error("[A.RISE] Não foi possível copiar a chave Pix:", error);
      pixStatus.textContent = "Não foi possível copiar automaticamente. Toque e segure a chave acima para copiá-la.";
    } finally {
      isCopying = false;
      copyButton.disabled = false;
    }
  }

  function initialize() {
    const required = [
      ...Object.values(screens), startButton, restartButton, donationButton,
      journeyButton, portfolioButton, copyButton, pixKeyDisplay, pixStatus,
      impactOverlay, experience, portfolio, processingMessage, processingPercent, processingStep, progressBar, progressFill
    ];

    const missing = required
      .map((element, index) => element ? null : index)
      .filter((index) => index !== null);

    if (missing.length) {
      console.error("[A.RISE] Estrutura incompleta. Verifique os elementos da experiência.", missing);
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
    console.info("[A.RISE] Experiência Pix inicializada.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

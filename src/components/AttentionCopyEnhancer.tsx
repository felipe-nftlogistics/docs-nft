"use client";

import { useEffect } from "react";

export function initAttentionCopy(root: HTMLElement | Document = document) {
  const blocks = root.querySelectorAll<HTMLElement>(".attention-copy");
  blocks.forEach((block) => {
    // Evita duplicar botões se já existir
    if (block.querySelector(".attention-copy-btn")) return;

    // Garante que o container tenha position relative
    block.style.position = "relative";

    const btn = document.createElement("button");
    btn.className = "attention-copy-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copiar texto");
    btn.title = "Copiar texto";
    btn.innerHTML = `
      <svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <svg class="check-icon hidden" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Copiar</span>
    `;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Clona o bloco para extrair apenas o texto real, sem o texto do botão "Copiar"
      const clone = block.cloneNode(true) as HTMLElement;
      const btnInClone = clone.querySelector(".attention-copy-btn");
      if (btnInClone) btnInClone.remove();

      const textToCopy = clone.innerText.trim();

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const ta = document.createElement("textarea");
          ta.value = textToCopy;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }

        // Altera o estado do botão para "Copiado" em verde
        btn.classList.add("copied");
        const copyIcon = btn.querySelector(".copy-icon");
        const checkIcon = btn.querySelector(".check-icon");
        const label = btn.querySelector("span");

        if (copyIcon) copyIcon.classList.add("hidden");
        if (checkIcon) checkIcon.classList.remove("hidden");
        if (label) label.textContent = "Copiado";

        // Retorna ao estado inicial após 2.5 segundos
        setTimeout(() => {
          btn.classList.remove("copied");
          if (copyIcon) copyIcon.classList.remove("hidden");
          if (checkIcon) checkIcon.classList.add("hidden");
          if (label) label.textContent = "Copiar";
        }, 2500);
      } catch (err) {
        console.error("Falha ao copiar para o clipboard:", err);
      }
    });

    block.appendChild(btn);
  });
}

export function AttentionCopyEnhancer() {
  useEffect(() => {
    initAttentionCopy();

    const observer = new MutationObserver(() => {
      initAttentionCopy();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

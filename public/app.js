// app.js - Lógica da interface Antigravity Jev
document.addEventListener("DOMContentLoaded", () => {
  // Elementos do DOM
  const chatMessages = document.getElementById("chatMessages");
  const promptInput = document.getElementById("promptInput");
  const btnSend = document.getElementById("btnSend");
  const btnNewChat = document.getElementById("btnNewChat");
  const quickButtons = document.querySelectorAll(".quick-btn");

  // Status chips
  const jevStatusVal = document.getElementById("jevStatusVal");
  const llmStatusVal = document.getElementById("llmStatusVal");

  // Modal de Configurações
  const settingsModal = document.getElementById("settingsModal");
  const btnOpenSettings = document.getElementById("btnOpenSettings");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const saveStatus = document.getElementById("saveStatus");

  // Campos de Configuração
  const cfgJevProvider = document.getElementById("cfgJevProvider");
  const cfgJevKey = document.getElementById("cfgJevKey");
  const cfgLlmProvider = document.getElementById("cfgLlmProvider");
  const cfgLlmKey = document.getElementById("cfgLlmKey");
  const cfgLlmModel = document.getElementById("cfgLlmModel");
  const cfgCustomUrl = document.getElementById("cfgCustomUrl");
  const rowCustomUrl = document.getElementById("rowCustomUrl");
  const modelChips = document.querySelectorAll(".m-chip");

  // Estado da conversa
  let messagesHistory = [];
  let isGenerating = false;

  // Carrega configurações salvas
  async function initConfig() {
    try {
      // 1. Busca do servidor
      const res = await fetch("/api/config");
      const serverCfg = await res.json();

      // 2. Busca do localStorage
      const localKeys = JSON.parse(
        localStorage.getItem("antigravity_jev_keys") || "{}",
      );

      cfgJevProvider.value =
        localKeys.jevProvider || serverCfg.jevProvider || "local";
      cfgJevKey.value = localKeys.jevApiKey || "";
      cfgLlmProvider.value =
        localKeys.llmProvider || serverCfg.llmProvider || "openrouter";
      cfgLlmKey.value = localKeys.llmApiKey || "";
      cfgLlmModel.value =
        localKeys.llmModel || serverCfg.llmModel || "google/gemini-2.5-flash";
      cfgCustomUrl.value =
        localKeys.customBaseUrl || serverCfg.customBaseUrl || "";

      updateStatusBadges();
    } catch (err) {
      console.warn(
        "Não foi possível carregar config do servidor, usando defaults:",
        err,
      );
    }
  }

  function updateStatusBadges() {
    const jevP = cfgJevProvider.value;
    const hasJevKey = !!cfgJevKey.value.trim();

    if (jevP === "typesafe" && hasJevKey) {
      jevStatusVal.textContent = "TypeSafe API";
      jevStatusVal.style.color = "#10b981";
    } else if (jevP === "openrouter" && hasJevKey) {
      jevStatusVal.textContent = "OpenRouter Jev";
      jevStatusVal.style.color = "#38bdf8";
    } else {
      jevStatusVal.textContent = "Emulador Local";
      jevStatusVal.style.color = "#94a3b8";
    }

    const hasLlmKey = !!cfgLlmKey.value.trim();
    if (hasLlmKey) {
      const shortModel = cfgLlmModel.value.split("/").pop() || "Conectado";
      llmStatusVal.textContent = shortModel;
      llmStatusVal.style.color = "#38bdf8";
    } else {
      llmStatusVal.textContent = "Demo Mode";
      llmStatusVal.style.color = "#f59e0b";
    }
  }

  function getActiveKeys() {
    return {
      jevProvider: cfgJevProvider.value,
      jevApiKey: cfgJevKey.value.trim(),
      llmProvider: cfgLlmProvider.value,
      llmApiKey: cfgLlmKey.value.trim(),
      llmModel: cfgLlmModel.value.trim(),
      customBaseUrl: cfgCustomUrl.value.trim(),
    };
  }

  // Salvar Configurações
  btnSaveSettings.addEventListener("click", async () => {
    const keys = getActiveKeys();
    localStorage.setItem("antigravity_jev_keys", JSON.stringify(keys));

    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });
      saveStatus.textContent = "✓ Configurações salvas!";
      updateStatusBadges();
      setTimeout(() => {
        saveStatus.textContent = "";
        settingsModal.classList.remove("open");
      }, 1000);
    } catch (err) {
      saveStatus.textContent = "Erro ao sincronizar com servidor";
      console.error(err);
    }
  });

  // Modal Toggles
  btnOpenSettings.addEventListener("click", () =>
    settingsModal.classList.add("open"),
  );
  btnCloseSettings.addEventListener("click", () =>
    settingsModal.classList.remove("open"),
  );
  btnCancelSettings.addEventListener("click", () =>
    settingsModal.classList.remove("open"),
  );
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("open");
  });

  // Toggle visibilidade de senha
  document.querySelectorAll(".btn-toggle-vis").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "👁️" : "🔒";
    });
  });

  // Seleção rápida de modelo
  modelChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      cfgLlmModel.value = chip.getAttribute("data-model");
    });
  });

  // Mostrar custom URL se selecionado custom
  cfgLlmProvider.addEventListener("change", () => {
    rowCustomUrl.style.display =
      cfgLlmProvider.value === "custom" ? "flex" : "none";
  });

  // Auto-resize do textarea
  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 160) + "px";
  });

  // Atalho Enter
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  btnSend.addEventListener("click", handleSend);

  // Nova Sessão
  btnNewChat.addEventListener("click", () => {
    messagesHistory = [];
    chatMessages.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-badge">NOVA SESSÃO INICIADA</div>
        <h2>Antigravity com Motor Jev</h2>
        <p>Pronto para receber instruções. O Jev avaliará sua entrada imediatamente antes da LLM.</p>
      </div>
    `;
  });

  // Quick Prompts
  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.getAttribute("data-prompt");
      promptInput.value = prompt;
      promptInput.dispatchEvent(new Event("input"));
      handleSend();
    });
  });

  // Fluxo de envio
  async function handleSend() {
    const text = promptInput.value.trim();
    if (!text || isGenerating) return;

    // Limpa welcome card se houver
    const welcome = document.querySelector(".welcome-card");
    if (welcome) welcome.remove();

    // 1. Renderiza mensagem do usuário
    appendUserMessage(text);
    messagesHistory.push({ role: "user", content: text });

    promptInput.value = "";
    promptInput.style.height = "auto";
    isGenerating = true;
    btnSend.disabled = true;

    // 2. Prepara contêiner de resposta do Assistente
    const assistantRow = document.createElement("div");
    assistantRow.className = "message-row assistant";

    // Caixa de Pensamentos do Jev (Estado Inicial: Pensando...)
    const jevCard = document.createElement("div");
    jevCard.className = "jev-thought-card";
    jevCard.innerHTML = `
      <div class="jev-thought-header">
        <div class="thought-title-group">
          <svg class="thought-pulse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span class="thought-title">Jev System 1: Avaliando intenção, risco e complexidade...</span>
        </div>
      </div>
    `;
    assistantRow.appendChild(jevCard);

    // Contêiner de conteúdo da LLM
    const contentBox = document.createElement("div");
    contentBox.className = "assistant-content";
    contentBox.innerHTML =
      '<span style="color: #64748b; font-style: italic;">Aguardando validação do Jev...</span>';
    assistantRow.appendChild(contentBox);

    chatMessages.appendChild(assistantRow);
    scrollToBottom();

    const activeKeys = getActiveKeys();

    try {
      // 3. Executa System 1 (Jev Decision Engine)
      const jevRes = await fetch("/api/jev/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, keys: activeKeys }),
      });
      const jevDecision = await jevRes.json();

      // Renderiza as decisões estruturadas do Jev
      renderJevDecision(jevCard, jevDecision);

      // 4. Executa System 2 (LLM Streaming)
      contentBox.innerHTML = "";
      const streamRes = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesHistory,
          jevDecision: jevDecision,
          keys: activeKeys,
        }),
      });

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.text) {
                fullAssistantText += data.text;
                contentBox.innerHTML = formatMarkdown(fullAssistantText);
                scrollToBottom();
              } else if (data.error) {
                fullAssistantText += `\n\n> ⚠️ **${data.error}**`;
                contentBox.innerHTML = formatMarkdown(fullAssistantText);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      messagesHistory.push({ role: "assistant", content: fullAssistantText });
    } catch (err) {
      console.error("Erro no processamento:", err);
      contentBox.innerHTML = `<span style="color: #ef4444;">Erro ao processar: ${err.message}</span>`;
    } finally {
      isGenerating = false;
      btnSend.disabled = false;
      promptInput.focus();
    }
  }

  function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "message-row user";
    row.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(row);
  }

  function renderJevDecision(container, jevData) {
    const answers = jevData.answers || {};
    const latency = jevData.latencyMs || 35;
    const source =
      jevData.source === "typesafe_api"
        ? "TypeSafe API"
        : jevData.source === "openrouter_jev"
          ? "OpenRouter Jev"
          : "Emulador Local Jev";

    // Intent (Choice)
    const intent = answers.intent?.value || answers.intent || "indeterminado";
    const intentConf = answers.intent?.confidence
      ? `(${(answers.intent.confidence * 100).toFixed(0)}% conf)`
      : "";

    // Noul (Urgency / Risk)
    const risk =
      answers.is_urgent_or_risky?.value !== undefined
        ? answers.is_urgent_or_risky.value
        : answers.is_urgent_or_risky;
    const riskConf = answers.is_urgent_or_risky?.confidence
      ? `(${(answers.is_urgent_or_risky.confidence * 100).toFixed(0)}% conf)`
      : "";
    const riskBadgeClass =
      risk === "true"
        ? "color: #ef4444;"
        : risk === "uncertain"
          ? "color: #f59e0b;"
          : "color: #10b981;";

    // Complexity (Score)
    const complexityScore =
      answers.complexity?.value !== undefined
        ? answers.complexity.value
        : answers.complexity || 2;
    const complexityLabel = answers.complexity?.label || `${complexityScore}/5`;

    // Action Route (Choice)
    const route =
      answers.action_route?.value || answers.action_route || "direct_response";

    let scoreDotsHtml = "";
    for (let i = 1; i <= 5; i++) {
      scoreDotsHtml += `<div class="score-dot ${i <= complexityScore ? "active" : ""}"></div>`;
    }

    container.innerHTML = `
      <div class="jev-thought-header" id="thoughtHeader">
        <div class="thought-title-group">
          <svg class="thought-pulse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span class="thought-title">🧠 Pensamento Jev (System 1)</span>
          <span class="thought-latency">⚡ ${latency}ms</span>
          <span style="font-size: 11px; color: #64748b; font-family: var(--font-mono);">[${source}]</span>
        </div>
        <svg class="thought-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="jev-thought-body">
        <div class="decisions-grid">
          <div class="decision-box">
            <span class="box-label">Intenção (Choice)</span>
            <div class="box-value">
              <span class="val-tag" style="color: #38bdf8;">${escapeHtml(String(intent))}</span>
              <span class="confidence-meter">${intentConf}</span>
            </div>
          </div>

          <div class="decision-box">
            <span class="box-label">Risco / Urgência (Noul)</span>
            <div class="box-value">
              <span class="val-tag" style="${riskBadgeClass}">${escapeHtml(String(risk).toUpperCase())}</span>
              <span class="confidence-meter">${riskConf}</span>
            </div>
          </div>

          <div class="decision-box">
            <span class="box-label">Complexidade (Score)</span>
            <div class="box-value">
              <div class="score-bar-wrap">
                <div class="score-dots">${scoreDotsHtml}</div>
                <span class="val-tag" style="color: #c084fc;">${escapeHtml(String(complexityLabel))}</span>
              </div>
            </div>
          </div>

          <div class="decision-box">
            <span class="box-label">Rota de Ação (Choice)</span>
            <div class="box-value">
              <span class="val-tag" style="color: #34d399;">${escapeHtml(String(route))}</span>
            </div>
          </div>
        </div>

        <button class="raw-json-btn">Inspecionar Decisão Bruta (JSON)</button>
        <pre class="raw-json-view">${escapeHtml(JSON.stringify(jevData, null, 2))}</pre>
      </div>
    `;

    // Acordeão toggle
    const header = container.querySelector("#thoughtHeader");
    header.addEventListener("click", () => {
      container.classList.toggle("collapsed");
    });

    // Toggle JSON
    const jsonBtn = container.querySelector(".raw-json-btn");
    const jsonView = container.querySelector(".raw-json-view");
    jsonBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      jsonView.classList.toggle("visible");
    });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Formatador simples de Markdown
  function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Code blocks com ```
    html = html.replace(
      /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        return `<pre><code>${code}</code></pre>`;
      },
    );

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Blockquote
    html = html.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");

    // List items
    html = html.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

    // Line breaks
    html = html.replace(/\n\n/g, "<br><br>");

    return html;
  }

  initConfig();
});

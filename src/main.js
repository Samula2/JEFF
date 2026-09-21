// src/main.js - Antigravity JEFF Experience com Histórico Real
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

marked.setOptions({
  gfm: true,
  breaks: true
});

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const messagesStream = document.getElementById('messagesStream');
  const promptInput = document.getElementById('promptInput');
  const btnSend = document.getElementById('btnSend');
  const btnNewChat = document.getElementById('btnNewChat');
  const chatHistoryList = document.getElementById('chatHistoryList');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnScrollBottom = document.getElementById('btnScrollBottom');
  let isUserScrolledUp = false;

  // Breadcrumbs
  const breadcrumbActive = document.querySelector('.bc-active');
  const telemetryJev = document.getElementById('telemetryJev');
  const telemetryLlm = document.getElementById('telemetryLlm');
  const telemetryMs = document.getElementById('telemetryMs');
  const dockModelLabel = document.getElementById('dockModelLabel');
  const btnDockModel = document.getElementById('btnDockModel');

  // Topbar Elements
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = btnThemeToggle ? btnThemeToggle.querySelector('.theme-icon') : null;
  const themeLabel = btnThemeToggle ? btnThemeToggle.querySelector('.theme-label') : null;

  // Drawer Elements
  const drawerOverlay = document.getElementById('drawerOverlay');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnSettingsBottom = document.getElementById('btnSettingsBottom');
  const btnDrawerClose = document.getElementById('btnDrawerClose');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const drawerStatusMsg = document.getElementById('drawerStatusMsg');

  // Drawer Form Controls
  const cfgLlmProvider = document.getElementById('cfgLlmProvider');
  const cfgLlmKey = document.getElementById('cfgLlmKey');
  const cfgLlmModel = document.getElementById('cfgLlmModel');
  const cfgCustomUrl = document.getElementById('cfgCustomUrl');
  const rowCustomBase = document.getElementById('rowCustomBase');
  const geminiModels = document.getElementById('geminiModels');
  const deepinfraModels = document.getElementById('deepinfraModels');
  const openrouterModels = document.getElementById('openrouterModels');

  const cfgJevProvider = document.getElementById('cfgJevProvider');
  const cfgJevKey = document.getElementById('cfgJevKey');
  const cfgVerbosity = document.getElementById('cfgVerbosity');
  const btnDockVerbosity = document.getElementById('btnDockVerbosity');
  const dockVerbosityIcon = document.getElementById('dockVerbosityIcon');
  const dockVerbosityLabel = document.getElementById('dockVerbosityLabel');

  // View & Tab Navigation Elements
  const tabNavChat = document.getElementById('tabNavChat');
  const tabNavBenchmark = document.getElementById('tabNavBenchmark');
  const sideNavChat = document.getElementById('sideNavChat');
  const sideNavBenchmark = document.getElementById('sideNavBenchmark');
  const viewChat = document.getElementById('viewChat');
  const viewBenchmark = document.getElementById('viewBenchmark');

  // Benchmark Controls & Metrics
  const benchPromptInput = document.getElementById('benchPromptInput');
  const btnRunBenchmark = document.getElementById('btnRunBenchmark');
  const badgeJeffStatus = document.getElementById('badgeJeffStatus');
  const benchJeffJevMs = document.getElementById('benchJeffJevMs');
  const benchJeffTtft = document.getElementById('benchJeffTtft');
  const benchJeffTotal = document.getElementById('benchJeffTotal');
  const benchJeffDecisionBox = document.getElementById('benchJeffDecisionBox');
  const benchJeffDeduction = document.getElementById('benchJeffDeduction');
  const benchJeffIntent = document.getElementById('benchJeffIntent');
  const benchJeffRisk = document.getElementById('benchJeffRisk');
  const benchJeffRoute = document.getElementById('benchJeffRoute');
  const benchJeffOutput = document.getElementById('benchJeffOutput');

  const badgeDirectStatus = document.getElementById('badgeDirectStatus');
  const benchDirectModelTag = document.getElementById('benchDirectModelTag');
  const benchDirectTtft = document.getElementById('benchDirectTtft');
  const benchDirectTotal = document.getElementById('benchDirectTotal');
  const benchDirectOutput = document.getElementById('benchDirectOutput');

  const benchVerdictCard = document.getElementById('benchVerdictCard');
  const verdictTitle = document.getElementById('verdictTitle');
  const verdictText = document.getElementById('verdictText');

  // Token Metrics Elements
  const benchJeffPromptTokens = document.getElementById('benchJeffPromptTokens');
  const benchJeffCompletionTokens = document.getElementById('benchJeffCompletionTokens');
  const benchJeffTotalTokens = document.getElementById('benchJeffTotalTokens');
  const benchJeffTps = document.getElementById('benchJeffTps');

  const benchDirectPromptTokens = document.getElementById('benchDirectPromptTokens');
  const benchDirectCompletionTokens = document.getElementById('benchDirectCompletionTokens');
  const benchDirectTotalTokens = document.getElementById('benchDirectTotalTokens');
  const benchDirectTps = document.getElementById('benchDirectTps');

  // Layer Waterfall Elements (JEFF)
  const benchJeffLayersSum = document.getElementById('benchJeffLayersSum');
  const layerJeffS1 = document.getElementById('layerJeffS1');
  const layerJeffHandshake = document.getElementById('layerJeffHandshake');
  const layerJeffTtft = document.getElementById('layerJeffTtft');
  const layerJeffStream = document.getElementById('layerJeffStream');
  const barJeffS1 = document.getElementById('barJeffS1');
  const barJeffHandshake = document.getElementById('barJeffHandshake');
  const barJeffTtft = document.getElementById('barJeffTtft');
  const barJeffStream = document.getElementById('barJeffStream');

  // Layer Waterfall Elements (Gemini Direto)
  const benchDirectLayersSum = document.getElementById('benchDirectLayersSum');
  const layerDirectHandshake = document.getElementById('layerDirectHandshake');
  const layerDirectTtft = document.getElementById('layerDirectTtft');
  const layerDirectStream = document.getElementById('layerDirectStream');
  const barDirectS1 = document.getElementById('barDirectS1');
  const barDirectHandshake = document.getElementById('barDirectHandshake');
  const barDirectTtft = document.getElementById('barDirectTtft');
  const barDirectStream = document.getElementById('barDirectStream');

  let currentVerbosity = 'concise';
  const verbosityModes = ['concise', 'balanced', 'detailed'];
  const verbosityLabels = {
    concise: { icon: '⚡', label: 'Conciso' },
    balanced: { icon: '⚖️', label: 'Equilibrado' },
    detailed: { icon: '📖', label: 'Detalhado' }
  };

  function updateVerbosityUI(mode) {
    currentVerbosity = verbosityModes.includes(mode) ? mode : 'concise';
    try {
      localStorage.setItem('jeff_verbosity', currentVerbosity);
    } catch {}
    if (cfgVerbosity) cfgVerbosity.value = currentVerbosity;
    if (dockVerbosityIcon && verbosityLabels[currentVerbosity]) {
      dockVerbosityIcon.textContent = verbosityLabels[currentVerbosity].icon;
    }
    if (dockVerbosityLabel && verbosityLabels[currentVerbosity]) {
      dockVerbosityLabel.textContent = verbosityLabels[currentVerbosity].label;
    }
  }

  // Estado das Sessões
  let sessions = [];
  let currentSessionId = null;
  let isStreaming = false;

  // Carrega ou inicializa sessões reais criadas pelo usuário
  function initSessions() {
    try {
      const saved = localStorage.getItem('antigravity_jeff_chat_sessions');
      if (saved) {
        sessions = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao ler sessões:', e);
    }

    // Remove qualquer conversa de demonstração antiga e conversas vazias
    const demoIds = ['sess-active', 'sess-stripe', 'sess-rust', 'sess-eve'];
    if (Array.isArray(sessions)) {
      sessions = sessions.filter(s => 
        s && 
        !demoIds.includes(s.id) && 
        Array.isArray(s.messages) && 
        s.messages.length > 0
      );
    } else {
      sessions = [];
    }

    saveSessions();

    if (sessions.length > 0) {
      currentSessionId = sessions[0].id;
      loadSession(currentSessionId);
    } else {
      currentSessionId = null;
      loadSession(null);
    }
  }

  function saveSessions() {
    try {
      localStorage.setItem('antigravity_jeff_chat_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error('Erro ao salvar sessões:', e);
    }
  }

  function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  function renderSessionsList() {
    chatHistoryList.innerHTML = '';

    if (sessions.length === 0) {
      chatHistoryList.innerHTML = '<div class="empty-history-tip">Nenhuma conversa salva</div>';
      return;
    }

    sessions.forEach(sess => {
      const item = document.createElement('div');
      item.className = `session-item ${sess.id === currentSessionId ? 'active' : ''}`;

      item.innerHTML = `
        <div class="session-main">
          <span class="session-icon">💬</span>
          <span class="session-text" title="${escapeHtml(sess.title)}">${escapeHtml(sess.title)}</span>
        </div>
        <div class="session-meta">
          <span class="session-time">${formatRelativeTime(sess.createdAt)}</span>
          <button class="btn-del-session" title="Excluir conversa">&times;</button>
        </div>
      `;

      item.addEventListener('click', () => {
        if (currentSessionId !== sess.id) {
          loadSession(sess.id);
        }
      });

      const btnDel = item.querySelector('.btn-del-session');
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(sess.id);
      });

      chatHistoryList.appendChild(item);
    });
  }

  function loadSession(id) {
    currentSessionId = id;
    const sess = id ? sessions.find(s => s.id === id) : null;

    if (breadcrumbActive) {
      breadcrumbActive.textContent = sess ? sess.title : 'Nova Conversa';
    }

    renderSessionsList();

    // Renderiza as mensagens da sessão
    messagesStream.innerHTML = '';
    if (!sess || !sess.messages || sess.messages.length === 0) {
      messagesStream.innerHTML = `
        <div class="welcome-card" id="welcomeView">
          <div class="welcome-hero-mark">
            <div class="hero-mega-orb">
              <span class="orb-specular-glare"></span>
              <span class="hero-orb-letter">J</span>
            </div>
          </div>

          <h1 class="welcome-headline">JEFF</h1>
          <p class="welcome-subtext">
            Assistente técnico em computação otimista com motor de reflexo instantâneo e modelos generativos de alta precisão.
          </p>

          <div class="suggestions-grid">
            <button class="suggestion-card scenario-trigger" data-prompt="Como o JEFF decide rotas e intenções antes de acionar a LLM?">
              <span class="card-glass-glare"></span>
              <div class="sugg-header">
                <span class="sugg-badge-orb aqua">&#128167;</span>
                <span class="sugg-category">Arquitetura</span>
              </div>
              <div class="sugg-title">Como o JEFF decide rotas?</div>
              <div class="sugg-desc">Separação entre reflexo rápido de decisão em sub-30ms e o modelo generativo</div>
            </button>

            <button class="suggestion-card scenario-trigger" data-prompt="Como diagnosticar um erro 500 intermitente na API de checkout em produção?">
              <span class="card-glass-glare"></span>
              <div class="sugg-header">
                <span class="sugg-badge-orb green">&#127807;</span>
                <span class="sugg-category">Operações</span>
              </div>
              <div class="sugg-title">Diagnóstico em produção</div>
              <div class="sugg-desc">Contenção de incidentes, idempotência e mitigação de risco de falhas</div>
            </button>

            <button class="suggestion-card scenario-trigger" data-prompt="Implemente uma estrutura de fila concorrente com controle de backpressure em TypeScript">
              <span class="card-glass-glare"></span>
              <div class="sugg-header">
                <span class="sugg-badge-orb gold">&#9889;</span>
                <span class="sugg-category">Engenharia</span>
              </div>
              <div class="sugg-title">Desenvolvimento de código</div>
              <div class="sugg-desc">Fila concorrente com controle de vazão, backpressure e tipagem estrita</div>
            </button>
          </div>
        </div>
      `;
      // Conecta os triggers dos cards
      messagesStream.querySelectorAll('.scenario-trigger').forEach(card => {
        card.addEventListener('click', () => {
          const prompt = card.getAttribute('data-prompt');
          if (prompt) {
            promptInput.value = prompt;
            handleSend();
          }
        });
      });
    } else {
      sess.messages.forEach(msg => {
        if (msg.role === 'user') {
          appendUserMsg(msg.content);
        } else if (msg.role === 'assistant') {
          const botRow = document.createElement('div');
          botRow.className = 'msg-row bot-msg';

          if (msg.jevDecision) {
            const taskBox = document.createElement('div');
            taskBox.className = 'ag-task-box';
            renderJeffTaskBox(taskBox, msg.jevDecision, msg.jevDecision.latencyMs || 24);
            botRow.appendChild(taskBox);
          }

          const botContent = document.createElement('div');
          botContent.className = 'bot-response-text';
          botContent.innerHTML = renderMarkdown(msg.content);
          botRow.appendChild(botContent);

          messagesStream.appendChild(botRow);
          appendReactions(botRow);
        }
      });
      scrollBottom(true);
    }
  }

  function deleteSession(id) {
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = sessions[0]?.id || null;
    }
    saveSessions();
    renderSessionsList();
    loadSession(currentSessionId);
  }

  function createNewSession() {
    currentSessionId = null;
    loadSession(null);
    promptInput.focus();
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Deseja limpar todas as conversas do histórico?')) {
      sessions = [];
      saveSessions();
      createNewSession();
    }
  });

  // Configurações
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const serverCfg = await res.json();
      const localKeys = JSON.parse(localStorage.getItem('antigravity_jeff_keys') || '{}');

      cfgLlmProvider.value = localKeys.llmProvider || serverCfg.llmProvider || 'deepinfra';
      cfgLlmKey.value = localKeys.llmApiKey || '';
      cfgLlmModel.value = localKeys.llmModel || serverCfg.llmModel || 'meta-llama/Meta-Llama-3.1-70B-Instruct';
      cfgCustomUrl.value = localKeys.customBaseUrl || serverCfg.customBaseUrl || '';

      cfgJevProvider.value = localKeys.jevProvider || serverCfg.jevProvider || 'local';
      cfgJevKey.value = localKeys.jevApiKey || '';

      const savedVerbosity = localStorage.getItem('jeff_verbosity') || localKeys.verbosity || serverCfg.verbosity || 'concise';
      updateVerbosityUI(savedVerbosity);

      handleProviderChange();
      updateTelemetryHeader();
    } catch (err) {
      console.warn('Erro ao carregar configurações:', err);
    }
  }

  function handleProviderChange() {
    const p = cfgLlmProvider.value;
    rowCustomBase.style.display = p === 'custom' ? 'flex' : 'none';

    if (p === 'gemini') {
      if (geminiModels) geminiModels.style.display = 'flex';
      if (deepinfraModels) deepinfraModels.style.display = 'none';
      if (openrouterModels) openrouterModels.style.display = 'none';
      if (!cfgLlmModel.value || !cfgLlmModel.value.includes('gemini')) {
        cfgLlmModel.value = 'gemini-2.5-flash';
      }
    } else if (p === 'deepinfra') {
      if (geminiModels) geminiModels.style.display = 'none';
      if (deepinfraModels) deepinfraModels.style.display = 'flex';
      if (openrouterModels) openrouterModels.style.display = 'none';
      if (!cfgLlmModel.value || cfgLlmModel.value.includes('gemini')) {
        cfgLlmModel.value = 'meta-llama/Meta-Llama-3.1-70B-Instruct';
      }
    } else if (p === 'openrouter') {
      if (geminiModels) geminiModels.style.display = 'none';
      if (deepinfraModels) deepinfraModels.style.display = 'none';
      if (openrouterModels) openrouterModels.style.display = 'flex';
      if (!cfgLlmModel.value || cfgLlmModel.value.includes('Meta-Llama')) {
        cfgLlmModel.value = 'google/gemini-2.5-flash';
      }
    } else {
      if (geminiModels) geminiModels.style.display = 'none';
      if (deepinfraModels) deepinfraModels.style.display = 'none';
      if (openrouterModels) openrouterModels.style.display = 'none';
    }
    updateTelemetryHeader();
  }

  function updateTelemetryHeader() {
    const jevP = cfgJevProvider.value;
    const hasJevKey = !!cfgJevKey.value.trim();
    if (jevP === 'typesafe' && hasJevKey) {
      telemetryJev.textContent = 'TypeSafe S1';
      telemetryJev.style.color = 'var(--accent-green)';
    } else if (jevP === 'openrouter' && hasJevKey) {
      telemetryJev.textContent = 'OpenRouter S1';
      telemetryJev.style.color = 'var(--accent-warm)';
    } else {
      telemetryJev.textContent = 'Local S1';
      telemetryJev.style.color = 'var(--text-secondary)';
    }

    const llmP = cfgLlmProvider.value;
    const model = cfgLlmModel.value.split('/').pop() || 'Llama 3.1';
    const hasLlmKey = !!cfgLlmKey.value.trim();

    if (hasLlmKey) {
      const pName = llmP === 'gemini' ? 'Gemini' : (llmP === 'deepinfra' ? 'DeepInfra' : (llmP === 'openrouter' ? 'OpenRouter' : 'OpenAI'));
      telemetryLlm.textContent = `${pName}`;
      dockModelLabel.textContent = `${pName} • ${model}`;
      dockModelLabel.style.color = 'var(--text-primary)';
    } else {
      const pName = llmP === 'gemini' ? 'Gemini' : (llmP === 'deepinfra' ? 'DeepInfra' : (llmP === 'openrouter' ? 'OpenRouter' : llmP));
      telemetryLlm.textContent = `${pName} (Demo)`;
      dockModelLabel.textContent = `${pName.toUpperCase()} (Demo)`;
      dockModelLabel.style.color = 'var(--accent-amber)';
    }
  }

  function getKeysSnapshot() {
    return {
      llmProvider: cfgLlmProvider.value,
      llmApiKey: cfgLlmKey.value.trim(),
      llmModel: cfgLlmModel.value.trim(),
      customBaseUrl: cfgCustomUrl.value.trim(),
      jevProvider: cfgJevProvider.value,
      jevApiKey: cfgJevKey.value.trim(),
      verbosity: currentVerbosity || 'concise'
    };
  }

  if (btnDockVerbosity) {
    btnDockVerbosity.addEventListener('click', () => {
      const idx = verbosityModes.indexOf(currentVerbosity);
      const nextMode = verbosityModes[(idx + 1) % verbosityModes.length];
      updateVerbosityUI(nextMode);
    });
  }

  if (cfgVerbosity) {
    cfgVerbosity.addEventListener('change', () => {
      updateVerbosityUI(cfgVerbosity.value);
    });
  }

  // Salvar Configurações
  btnSaveConfig.addEventListener('click', async () => {
    const keys = getKeysSnapshot();
    localStorage.setItem('antigravity_jeff_keys', JSON.stringify(keys));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      });
      drawerStatusMsg.textContent = '✓ Configurações salvas';
      updateTelemetryHeader();
      setTimeout(() => {
        drawerStatusMsg.textContent = '';
        drawerOverlay.classList.remove('open');
      }, 750);
    } catch (err) {
      drawerStatusMsg.textContent = 'Erro ao salvar';
      console.error(err);
    }
  });

  // Drawer Triggers
  const openDrawer = () => drawerOverlay.classList.add('open');
  const closeDrawer = () => drawerOverlay.classList.remove('open');

  btnOpenSettings.addEventListener('click', openDrawer);
  if (btnSettingsBottom) btnSettingsBottom.addEventListener('click', openDrawer);
  if (btnDockModel) btnDockModel.addEventListener('click', openDrawer);
  btnDrawerClose.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });
  cfgLlmProvider.addEventListener('change', handleProviderChange);

  // Model chips click
  document.querySelectorAll('.chip-model').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-model').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      cfgLlmModel.value = chip.getAttribute('data-model');
      updateTelemetryHeader();
    });
  });

  // Password toggle
  document.querySelectorAll('.btn-eye-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-for');
      const input = document.getElementById(id);
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🔒';
    });
  });

  // Textarea auto-resize (otimizado sem layout thrashing)
  promptInput.addEventListener('input', () => {
    if (promptInput.scrollHeight > promptInput.clientHeight + 4 || promptInput.value.length < 5) {
      promptInput.style.height = 'auto';
      promptInput.style.height = Math.min(promptInput.scrollHeight, 150) + 'px';
    }
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      createNewSession();
    }
  });

  btnSend.addEventListener('click', handleSend);
  btnNewChat.addEventListener('click', createNewSession);

  // Scenario Buttons
  document.querySelectorAll('.scenario-trigger').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      promptInput.value = prompt;
      promptInput.dispatchEvent(new Event('input'));
      handleSend();
    });
  });

  // Envio de Mensagem
  async function handleSend() {
    const text = promptInput.value.trim();
    if (!text || isStreaming) return;

    let currentSess = currentSessionId ? sessions.find(s => s.id === currentSessionId) : null;
    if (!currentSess) {
      const newId = `sess-${Date.now()}`;
      const title = text.length > 32 ? text.slice(0, 32) + '...' : text;
      currentSess = {
        id: newId,
        title: title,
        createdAt: Date.now(),
        messages: []
      };
      sessions.unshift(currentSess);
      currentSessionId = newId;
      if (breadcrumbActive) breadcrumbActive.textContent = title;
      saveSessions();
      renderSessionsList();
    } else if (!currentSess.messages || currentSess.messages.length === 0) {
      currentSess.title = text.length > 32 ? text.slice(0, 32) + '...' : text;
      if (breadcrumbActive) breadcrumbActive.textContent = currentSess.title;
      saveSessions();
      renderSessionsList();
    }

    const welcome = document.getElementById('welcomeView');
    if (welcome) welcome.remove();

    // 1. Renderiza Mensagem do Usuário
    appendUserMsg(text);
    scrollBottom(true);

    promptInput.value = '';
    promptInput.style.height = 'auto';
    isStreaming = true;
    btnSend.disabled = true;

    // 2. Prepara Linha do Assistente
    const botRow = document.createElement('div');
    botRow.className = 'msg-row bot-msg';

    // Box de Pensamento JEFF (Estilo "1 task running" do Antigravity)
    const taskBox = document.createElement('div');
    taskBox.className = 'ag-task-box';
    taskBox.innerHTML = `
      <div class="ag-task-header">
        <div class="task-header-left">
          <div class="task-spinner"></div>
          <span class="task-title">JEFF System 1: Deliberando intenção, risco e rota...</span>
        </div>
        <span class="task-chevron">&#9662;</span>
      </div>
    `;
    botRow.appendChild(taskBox);

    // Contêiner de Resposta da LLM
    const botContent = document.createElement('div');
    botContent.className = 'bot-response-text';
    botContent.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Aguardando validação do JEFF...</span>';
    botRow.appendChild(botContent);

    messagesStream.appendChild(botRow);
    scrollBottom(true);

    const activeKeys = getKeysSnapshot();

    try {
      // 3. Executa JEFF (System 1)
      const t0 = performance.now();
      const jevRes = await fetch('/api/jev/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, keys: activeKeys })
      });
      const jevData = await jevRes.json();
      const clientLatency = Math.round(performance.now() - t0);
      const lat = jevData.latencyMs || clientLatency;
      jevData.latencyMs = lat;

      telemetryMs.textContent = `⚡ ${lat}ms`;
      renderJeffTaskBox(taskBox, jevData, lat);

      // Prepara histórico de mensagens para a LLM
      const messagesForLlm = (currentSess ? currentSess.messages : [])
        .map(m => ({ role: m.role, content: m.content }));
      messagesForLlm.push({ role: 'user', content: text });

      // 4. Executa LLM System 2 (Streaming)
      botContent.innerHTML = '';
      const streamRes = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForLlm,
          jevDecision: jevData,
          keys: activeKeys,
          verbosity: currentVerbosity || 'concise'
        })
      });

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let streamedMarkdown = '';
      let buffer = '';
      let renderPending = false;

      function scheduleRender() {
        if (renderPending) return;
        renderPending = true;
        requestAnimationFrame(() => {
          botContent.innerHTML = renderMarkdown(streamedMarkdown);
          scrollBottom(false);
          renderPending = false;
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.text) {
                streamedMarkdown += data.text;
                scheduleRender();
              } else if (data.error) {
                streamedMarkdown += `\n\n> ⚠️ **${data.error}**`;
                scheduleRender();
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // Render final síncrono para garantir integridade do conteúdo
      botContent.innerHTML = renderMarkdown(streamedMarkdown);
      scrollBottom(false);

      // Salva no histórico da sessão ativa
      if (currentSess) {
        currentSess.messages.push({ role: 'user', content: text });
        currentSess.messages.push({
          role: 'assistant',
          content: streamedMarkdown,
          jevDecision: jevData
        });
        currentSess.createdAt = Date.now();
        saveSessions();
        renderSessionsList();
      }

      appendReactions(botRow);

    } catch (err) {
      console.error('Erro no ciclo de resposta:', err);
      botContent.innerHTML = `<span style="color: var(--accent-red);">Erro ao processar: ${err.message}</span>`;
    } finally {
      isStreaming = false;
      btnSend.disabled = false;
      promptInput.focus();
    }
  }

  function appendUserMsg(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user-msg';
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\n/g, '<br>');
    row.innerHTML = `<div class="msg-bubble-user">${formatted}</div>`;
    messagesStream.appendChild(row);
  }

  function renderJeffTaskBox(boxEl, data, latency) {
    const answers = data.answers || {};
    const source = data.source === 'typesafe_api' ? 'TypeSafe API' : (data.source === 'openrouter_jev' ? 'OpenRouter' : 'Local');

    const intent = answers.intent?.value || answers.intent || 'geral';
    const risk = answers.is_urgent_or_risky?.value !== undefined ? String(answers.is_urgent_or_risky.value) : 'false';
    const isCritical = risk === 'true';
    const isUncertain = risk === 'uncertain';
    const riskLabel = isCritical ? 'Atenção' : (isUncertain ? 'Incerteza' : 'Seguro');
    const riskClass = isCritical ? 'risk-high' : (isUncertain ? 'risk-mid' : 'risk-low');

    const score = answers.complexity?.value !== undefined ? answers.complexity.value : 2;
    const scoreLabel = answers.complexity?.label || `${score}/5`;
    const route = answers.action_route?.value || 'resposta_direta';

    const coreDeduction = answers.core_deduction || '';
    const steps = Array.isArray(answers.execution_steps) ? answers.execution_steps : [];

    boxEl.innerHTML = `
      <div class="ag-task-header" id="taskHeader">
        <div class="task-header-left">
          <span class="task-status-dot"></span>
          <span class="task-title">Raciocínio Deliberado pelo Jev em ${latency}ms (${source})</span>
        </div>
        <div class="task-header-right">
          <span class="badge-role-translator">IA traduzindo</span>
          <span class="task-chevron">&#9662;</span>
        </div>
      </div>

      <div class="ag-task-body">
        <div class="jeff-telemetry-grid">
          <div class="telemetry-cell">
            <span class="cell-label">Intenção</span>
            <span class="cell-value">${escapeHtml(intent)}</span>
          </div>

          <div class="telemetry-cell">
            <span class="cell-label">Risco</span>
            <span class="cell-value ${riskClass}">${escapeHtml(riskLabel)}</span>
          </div>

          <div class="telemetry-cell">
            <span class="cell-label">Complexidade</span>
            <span class="cell-value">${escapeHtml(scoreLabel)}</span>
          </div>

          <div class="telemetry-cell">
            <span class="cell-label">Rota</span>
            <span class="cell-value">${escapeHtml(route)}</span>
          </div>
        </div>

        ${coreDeduction ? `
        <div class="jev-deduction-card">
          <div class="deduction-label">💡 Dedução Lógica do Jev</div>
          <div class="deduction-text">${escapeHtml(coreDeduction)}</div>
        </div>
        ` : ''}

        ${steps.length > 0 ? `
        <div class="jev-steps-card">
          <div class="steps-card-label">📋 Plano de Ação Calculado pelo Jev</div>
          <ol class="jev-steps-list">
            ${steps.map((st, i) => `<li><span class="step-num">${i + 1}</span><span class="step-desc">${escapeHtml(st)}</span></li>`).join('')}
          </ol>
        </div>
        ` : ''}

        <div class="jev-json-toolbar">
          <button class="btn-raw-json">Ver dados completos (JSON)</button>
          <button class="btn-copy-json" title="Copiar JSON do Jev">📋 Copiar JSON</button>
        </div>
        <pre class="panel-json-view">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      </div>
    `;

    const header = boxEl.querySelector('#taskHeader');
    header.addEventListener('click', () => boxEl.classList.toggle('collapsed'));

    const btnJson = boxEl.querySelector('.btn-raw-json');
    const panelJson = boxEl.querySelector('.panel-json-view');
    btnJson.addEventListener('click', (e) => {
      e.stopPropagation();
      panelJson.classList.toggle('active');
    });

    const btnCopyJson = boxEl.querySelector('.btn-copy-json');
    btnCopyJson.addEventListener('click', (e) => {
      e.stopPropagation();
      const rawJson = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(rawJson);
      btnCopyJson.textContent = '✓ Copiado!';
      btnCopyJson.classList.add('copied');
      setTimeout(() => {
        btnCopyJson.textContent = '📋 Copiar JSON';
        btnCopyJson.classList.remove('copied');
      }, 1500);
    });
  }

  function appendReactions(container) {
    const reactions = document.createElement('div');
    reactions.className = 'msg-reactions-row';
    reactions.innerHTML = `
      <button class="btn-reaction" title="Copiar resposta">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button class="btn-reaction" title="Útil">👍</button>
      <button class="btn-reaction" title="Não útil">👎</button>
    `;
    container.appendChild(reactions);

    const btnCopy = reactions.querySelector('.btn-reaction');
    btnCopy.addEventListener('click', () => {
      const text = container.querySelector('.bot-response-text')?.innerText || '';
      navigator.clipboard.writeText(text);
      btnCopy.textContent = '✓';
      setTimeout(() => {
        btnCopy.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 1000);
    });

    scrollBottom(false);
  }

  function updateScrollBtnVisibility() {
    if (!btnScrollBottom) return;
    if (isUserScrolledUp) {
      btnScrollBottom.classList.remove('hidden');
    } else {
      btnScrollBottom.classList.add('hidden');
    }
  }

  function scrollBottom(force = false) {
    if (force) {
      isUserScrolledUp = false;
      messagesStream.scrollTop = messagesStream.scrollHeight;
      updateScrollBtnVisibility();
      return;
    }
    // Não força o scroll para o fim se o usuário rolou pra cima manualmente
    if (!isUserScrolledUp) {
      messagesStream.scrollTop = messagesStream.scrollHeight;
    }
  }

  // Detecta se o usuário rolou para cima durante ou fora da geração
  messagesStream.addEventListener('scroll', () => {
    const distanceFromBottom = messagesStream.scrollHeight - messagesStream.scrollTop - messagesStream.clientHeight;
    // Se afastou mais de 80px da base, o usuário intencionalmente rolou para cima
    isUserScrolledUp = distanceFromBottom > 80;
    updateScrollBtnVisibility();
  }, { passive: true });

  if (btnScrollBottom) {
    btnScrollBottom.addEventListener('click', () => {
      isUserScrolledUp = false;
      updateScrollBtnVisibility();
      messagesStream.scrollTo({ top: messagesStream.scrollHeight, behavior: 'smooth' });
    });
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(md) {
    if (!md) return '';

    // 1. Normaliza marcadores com bullet unicode (•) para markdown (-)
    let text = md.replace(/^(\s*)•\s+/gm, '$1- ');

    // 2. Protege blocos de código (``` e `) para não interferir na extração de fórmulas
    const codeTokens = [];
    text = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      const token = `%%CODE_BLOCK_${codeTokens.length}%%`;
      codeTokens.push(match);
      return token;
    });

    // 3. Extrai e renderiza Fórmulas em Bloco ($$ ... $$) com KaTeX
    const mathBlocks = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const token = `%%MATH_BLOCK_${mathBlocks.length}%%`;
      let rendered = '';
      try {
        rendered = katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false
        });
      } catch {
        rendered = `<div class="katex-error">${escapeHtml(match)}</div>`;
      }
      mathBlocks.push(rendered);
      return `\n\n${token}\n\n`;
    });

    // 4. Extrai e renderiza Fórmulas Inline ($ ... $) com KaTeX
    // Ignora preços como $100 ou $50 e strings sem conteúdo
    const mathInlines = [];
    text = text.replace(/(^|[^\$])\$([^\$\n\s](?:[^\$\n]*?[^\$\n\s])?)\$(?!\$)/g, (match, prefix, formula) => {
      if (/^\d+(?:\.\d+)?$/.test(formula.trim())) {
        return match;
      }
      const token = `%%MATH_INLINE_${mathInlines.length}%%`;
      let rendered = '';
      try {
        rendered = katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false
        });
      } catch {
        rendered = escapeHtml(match);
      }
      mathInlines.push(rendered);
      return `${prefix}${token}`;
    });

    // 5. Restaura os blocos de código protegidos
    text = text.replace(/%%CODE_BLOCK_(\d+)%%/g, (_, i) => codeTokens[Number(i)]);

    // 6. Converte markdown completo com Marked (GFM, quebras de linha, tabelas, etc)
    let html = '';
    try {
      html = marked.parse(text);
    } catch {
      html = escapeHtml(text).replace(/\n/g, '<br>');
    }

    // 7. Reinserir fórmulas matemáticas renderizadas pelo KaTeX
    html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, i) => mathBlocks[Number(i)] || '');
    html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, i) => mathInlines[Number(i)] || '');

    return html;
  }

  // Theme Switcher: Dark Frutiger Aero vs Light Frutiger Aero
  function updateThemeUI(isDark) {
    if (isDark) {
      document.body.classList.add('dark-aero');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeLabel) themeLabel.textContent = 'Light Aero';
      if (btnThemeToggle) btnThemeToggle.title = 'Mudar para Light Aero';
    } else {
      document.body.classList.remove('dark-aero');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeLabel) themeLabel.textContent = 'Dark Aero';
      if (btnThemeToggle) btnThemeToggle.title = 'Mudar para Dark Aero';
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('jeff_theme_mode');
    if (saved) {
      updateThemeUI(saved === 'dark-aero');
    } else {
      // Default to Light Aero for classic Frutiger Aero experience
      updateThemeUI(false);
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.contains('dark-aero');
      const nextDark = !isCurrentlyDark;
      updateThemeUI(nextDark);
      try {
        localStorage.setItem('jeff_theme_mode', nextDark ? 'dark-aero' : 'light-aero');
      } catch (e) {
        console.warn('Falha ao salvar tema no localStorage:', e);
      }
    });
  }

  initTheme();

  // View Switcher (Chat vs Benchmark)
  function switchView(viewName) {
    if (viewName === 'benchmark') {
      if (viewChat) viewChat.style.display = 'none';
      if (viewBenchmark) viewBenchmark.style.display = 'flex';
      if (tabNavChat) tabNavChat.classList.remove('active');
      if (tabNavBenchmark) tabNavBenchmark.classList.add('active');
      if (sideNavChat) sideNavChat.classList.remove('active');
      if (sideNavBenchmark) sideNavBenchmark.classList.add('active');
      if (breadcrumbActive) breadcrumbActive.textContent = 'Comparador de Velocidade';
      if (benchPromptInput) benchPromptInput.focus();
    } else {
      if (viewChat) viewChat.style.display = 'flex';
      if (viewBenchmark) viewBenchmark.style.display = 'none';
      if (tabNavChat) tabNavChat.classList.add('active');
      if (tabNavBenchmark) tabNavBenchmark.classList.remove('active');
      if (sideNavChat) sideNavChat.classList.add('active');
      if (sideNavBenchmark) sideNavBenchmark.classList.remove('active');
      const sess = sessions.find(s => s.id === currentSessionId);
      if (breadcrumbActive) breadcrumbActive.textContent = sess ? sess.title : 'Nova Conversa';
      if (promptInput) promptInput.focus();
    }
  }

  if (tabNavChat) tabNavChat.addEventListener('click', () => switchView('chat'));
  if (tabNavBenchmark) tabNavBenchmark.addEventListener('click', () => switchView('benchmark'));
  if (sideNavChat) sideNavChat.addEventListener('click', () => switchView('chat'));
  if (sideNavBenchmark) sideNavBenchmark.addEventListener('click', () => switchView('benchmark'));

  // Benchmark Runner Logic
  let isBenchmarking = false;

  async function runBenchmark(promptText) {
    if (!promptText || isBenchmarking) return;
    isBenchmarking = true;
    if (btnRunBenchmark) btnRunBenchmark.disabled = true;
    if (benchPromptInput) benchPromptInput.disabled = true;

    // Reset UI
    if (badgeJeffStatus) {
      badgeJeffStatus.className = 'bench-status-badge running';
      badgeJeffStatus.textContent = 'Executando...';
    }
    if (badgeDirectStatus) {
      badgeDirectStatus.className = 'bench-status-badge running';
      badgeDirectStatus.textContent = 'Executando...';
    }

    // Reset Metrics & Tokens UI
    if (benchJeffJevMs) benchJeffJevMs.textContent = '...';
    if (benchJeffTtft) benchJeffTtft.textContent = '...';
    if (benchJeffTotal) benchJeffTotal.textContent = '...';
    if (benchDirectTtft) benchDirectTtft.textContent = '...';
    if (benchDirectTotal) benchDirectTotal.textContent = '...';

    if (benchJeffPromptTokens) benchJeffPromptTokens.textContent = '...';
    if (benchJeffCompletionTokens) benchJeffCompletionTokens.textContent = '...';
    if (benchJeffTotalTokens) benchJeffTotalTokens.textContent = '...';
    if (benchJeffTps) benchJeffTps.textContent = '...';

    if (benchDirectPromptTokens) benchDirectPromptTokens.textContent = '...';
    if (benchDirectCompletionTokens) benchDirectCompletionTokens.textContent = '...';
    if (benchDirectTotalTokens) benchDirectTotalTokens.textContent = '...';
    if (benchDirectTps) benchDirectTps.textContent = '...';

    // Reset Layers UI
    if (benchJeffLayersSum) benchJeffLayersSum.textContent = '...';
    if (layerJeffS1) layerJeffS1.textContent = '...';
    if (layerJeffHandshake) layerJeffHandshake.textContent = '...';
    if (layerJeffTtft) layerJeffTtft.textContent = '...';
    if (layerJeffStream) layerJeffStream.textContent = '...';
    if (barJeffS1) barJeffS1.style.width = '0%';
    if (barJeffHandshake) barJeffHandshake.style.width = '0%';
    if (barJeffTtft) barJeffTtft.style.width = '0%';
    if (barJeffStream) barJeffStream.style.width = '0%';

    if (benchDirectLayersSum) benchDirectLayersSum.textContent = '...';
    if (layerDirectHandshake) layerDirectHandshake.textContent = '...';
    if (layerDirectTtft) layerDirectTtft.textContent = '...';
    if (layerDirectStream) layerDirectStream.textContent = '...';
    if (barDirectS1) barDirectS1.style.width = '0%';
    if (barDirectHandshake) barDirectHandshake.style.width = '0%';
    if (barDirectTtft) barDirectTtft.style.width = '0%';
    if (barDirectStream) barDirectStream.style.width = '0%';

    if (benchJeffOutput) benchJeffOutput.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Disparando System 1 (Jev)...</span>';
    if (benchDirectOutput) benchDirectOutput.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Conectando canal direto com Google Gemini...</span>';
    if (benchJeffDecisionBox) benchJeffDecisionBox.style.display = 'none';
    if (benchVerdictCard) benchVerdictCard.style.display = 'none';

    const activeKeys = getKeysSnapshot();
    const activeModel = cfgLlmModel.value || 'gemini-2.5-flash';
    if (benchDirectModelTag) {
      benchDirectModelTag.textContent = `Gemini Direto (${activeModel.split('/').pop()})`;
    }

    let jeffS1Ms = 0;
    let jeffHandshakeMs = 0;
    let jeffTtftMs = 0;
    let jeffStreamMs = 0;
    let jeffTotalMs = 0;

    let directHandshakeMs = 0;
    let directTtftMs = 0;
    let directStreamMs = 0;
    let directTotalMs = 0;

    let jeffUsage = null;
    let directUsage = null;

    // 1. Pipeline JEFF (System 1 -> System 2)
    const runJeffPipeline = async () => {
      const tStart = performance.now();
      try {
        // Camada 1: Deliberação Jev (S1)
        const jevRes = await fetch('/api/jev/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, keys: activeKeys })
        });
        const jevData = await jevRes.json();
        const tJevDone = performance.now();
        jeffS1Ms = Math.round(tJevDone - tStart);
        if (benchJeffJevMs) benchJeffJevMs.textContent = `${jeffS1Ms} ms`;
        if (layerJeffS1) layerJeffS1.textContent = `${jeffS1Ms} ms`;

        // Render Jev Preview
        const ans = jevData?.answers || {};
        if (benchJeffDeduction) benchJeffDeduction.textContent = ans.core_deduction ? ans.core_deduction.slice(0, 140) + '...' : 'Deliberação concluída';
        if (benchJeffIntent) benchJeffIntent.textContent = ans.intent?.value || ans.intent || 'chat';
        if (benchJeffRisk) benchJeffRisk.textContent = ans.is_urgent_or_risky?.value === 'true' ? 'Crítico' : 'Seguro';
        if (benchJeffRoute) benchJeffRoute.textContent = ans.action_route?.value || 'direct_response';
        if (benchJeffDecisionBox) benchJeffDecisionBox.style.display = 'block';

        if (benchJeffOutput) benchJeffOutput.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Jev concluiu. Traduzindo resposta com Gemini...</span>';

        // Camada 2: Handshake & Despacho para Gemini
        const tFetchStart = performance.now();
        const chatRes = await fetch('/api/llm/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }],
            jevDecision: jevData,
            keys: activeKeys,
            verbosity: currentVerbosity || 'concise'
          })
        });
        const tFetchDone = performance.now();
        jeffHandshakeMs = Math.max(1, Math.round(tFetchDone - tFetchStart));
        if (layerJeffHandshake) layerJeffHandshake.textContent = `${jeffHandshakeMs} ms`;

        const reader = chatRes.body.getReader();
        const decoder = new TextDecoder();
        let streamedMd = '';
        let buffer = '';
        let tFirstToken = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.usage) {
                  jeffUsage = parsed.usage;
                }
                if (parsed.text) {
                  if (tFirstToken === null) {
                    tFirstToken = performance.now();
                    // Camada 3: Inferência Gemini até 1º Token
                    jeffTtftMs = Math.max(1, Math.round(tFirstToken - tFetchDone));
                    const ttftFromStart = Math.round(tFirstToken - tStart);
                    if (benchJeffTtft) benchJeffTtft.textContent = `${ttftFromStart} ms`;
                    if (layerJeffTtft) layerJeffTtft.textContent = `${jeffTtftMs} ms`;
                  }
                  streamedMd += parsed.text;
                  if (benchJeffOutput) benchJeffOutput.innerHTML = renderMarkdown(streamedMd);
                }
              } catch {}
            }
          }
        }

        const tEnd = performance.now();
        jeffTotalMs = Math.round(tEnd - tStart);
        // Camada 4: Geração contínua & Streaming
        jeffStreamMs = tFirstToken ? Math.max(1, Math.round(tEnd - tFirstToken)) : 0;

        if (layerJeffStream) layerJeffStream.textContent = `${jeffStreamMs} ms`;
        if (benchJeffLayersSum) benchJeffLayersSum.textContent = `${jeffTotalMs} ms`;
        if (benchJeffTotal) benchJeffTotal.textContent = `${jeffTotalMs} ms`;

        // Atualiza larguras da barra visual segmentada
        if (jeffTotalMs > 0) {
          const pS1 = Math.round((jeffS1Ms / jeffTotalMs) * 100);
          const pHandshake = Math.round((jeffHandshakeMs / jeffTotalMs) * 100);
          const pTtft = Math.round((jeffTtftMs / jeffTotalMs) * 100);
          const pStream = Math.max(0, 100 - (pS1 + pHandshake + pTtft));
          if (barJeffS1) barJeffS1.style.width = `${pS1}%`;
          if (barJeffHandshake) barJeffHandshake.style.width = `${pHandshake}%`;
          if (barJeffTtft) barJeffTtft.style.width = `${pTtft}%`;
          if (barJeffStream) barJeffStream.style.width = `${pStream}%`;
        }

        if (badgeJeffStatus) {
          badgeJeffStatus.className = 'bench-status-badge completed';
          badgeJeffStatus.textContent = '✓ Concluído';
        }

        if (jeffUsage) {
          if (benchJeffPromptTokens) benchJeffPromptTokens.textContent = jeffUsage.prompt_tokens;
          if (benchJeffCompletionTokens) benchJeffCompletionTokens.textContent = jeffUsage.completion_tokens;
          if (benchJeffTotalTokens) benchJeffTotalTokens.textContent = jeffUsage.total_tokens;
          const tps = jeffTotalMs > 0 ? (jeffUsage.completion_tokens / (jeffTotalMs / 1000)).toFixed(1) : 0;
          if (benchJeffTps) benchJeffTps.textContent = `${tps} t/s`;
        }
      } catch (err) {
        if (badgeJeffStatus) {
          badgeJeffStatus.className = 'bench-status-badge completed';
          badgeJeffStatus.textContent = 'Erro';
        }
        if (benchJeffOutput) benchJeffOutput.innerHTML = `<span style="color: red;">Erro no fluxo JEFF: ${err.message}</span>`;
      }
    };

    // 2. Pipeline Gemini Direto (Raw)
    const runDirectPipeline = async () => {
      const tStart = performance.now();
      try {
        // Camada 2: Handshake & Despacho direto ao Gemini
        const tFetchStart = performance.now();
        const directRes = await fetch('/api/llm/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }],
            keys: activeKeys,
            isDirect: true,
            provider: 'gemini',
            model: activeModel
          })
        });
        const tFetchDone = performance.now();
        directHandshakeMs = Math.max(1, Math.round(tFetchDone - tFetchStart));
        if (layerDirectHandshake) layerDirectHandshake.textContent = `${directHandshakeMs} ms`;

        const reader = directRes.body.getReader();
        const decoder = new TextDecoder();
        let streamedMd = '';
        let buffer = '';
        let tFirstToken = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.usage) {
                  directUsage = parsed.usage;
                }
                if (parsed.text) {
                  if (tFirstToken === null) {
                    tFirstToken = performance.now();
                    // Camada 3: Inferência Gemini até 1º Token
                    directTtftMs = Math.max(1, Math.round(tFirstToken - tFetchDone));
                    const ttftFromStart = Math.round(tFirstToken - tStart);
                    if (benchDirectTtft) benchDirectTtft.textContent = `${ttftFromStart} ms`;
                    if (layerDirectTtft) layerDirectTtft.textContent = `${directTtftMs} ms`;
                  }
                  streamedMd += parsed.text;
                  if (benchDirectOutput) benchDirectOutput.innerHTML = renderMarkdown(streamedMd);
                }
              } catch {}
            }
          }
        }

        const tEnd = performance.now();
        directTotalMs = Math.round(tEnd - tStart);
        // Camada 4: Geração contínua & Streaming
        directStreamMs = tFirstToken ? Math.max(1, Math.round(tEnd - tFirstToken)) : 0;

        if (layerDirectStream) layerDirectStream.textContent = `${directStreamMs} ms`;
        if (benchDirectLayersSum) benchDirectLayersSum.textContent = `${directTotalMs} ms`;
        if (benchDirectTotal) benchDirectTotal.textContent = `${directTotalMs} ms`;

        // Atualiza larguras da barra visual segmentada
        if (directTotalMs > 0) {
          const pHandshake = Math.round((directHandshakeMs / directTotalMs) * 100);
          const pTtft = Math.round((directTtftMs / directTotalMs) * 100);
          const pStream = Math.max(0, 100 - (pHandshake + pTtft));
          if (barDirectHandshake) barDirectHandshake.style.width = `${pHandshake}%`;
          if (barDirectTtft) barDirectTtft.style.width = `${pTtft}%`;
          if (barDirectStream) barDirectStream.style.width = `${pStream}%`;
        }

        if (badgeDirectStatus) {
          badgeDirectStatus.className = 'bench-status-badge completed';
          badgeDirectStatus.textContent = '✓ Concluído';
        }

        if (directUsage) {
          if (benchDirectPromptTokens) benchDirectPromptTokens.textContent = directUsage.prompt_tokens;
          if (benchDirectCompletionTokens) benchDirectCompletionTokens.textContent = directUsage.completion_tokens;
          if (benchDirectTotalTokens) benchDirectTotalTokens.textContent = directUsage.total_tokens;
          const tps = directTotalMs > 0 ? (directUsage.completion_tokens / (directTotalMs / 1000)).toFixed(1) : 0;
          if (benchDirectTps) benchDirectTps.textContent = `${tps} t/s`;
        }
      } catch (err) {
        if (badgeDirectStatus) {
          badgeDirectStatus.className = 'bench-status-badge completed';
          badgeDirectStatus.textContent = 'Erro';
        }
        if (benchDirectOutput) benchDirectOutput.innerHTML = `<span style="color: red;">Erro no canal direto: ${err.message}</span>`;
      }
    };

    // Executa ambos em paralelo
    await Promise.allSettled([runJeffPipeline(), runDirectPipeline()]);

    // Análise e Veredito Comparativo
    if (verdictTitle && verdictText && benchVerdictCard) {
      verdictTitle.textContent = '⚖️ Veredito de Desempenho & Camadas de Latência';

      let speedText = `⏱️ <strong>Decomposição de Latência por Camada:</strong><br>
      • <strong>Camada 1 (Deliberação Jev S1):</strong> <code>${jeffS1Ms}ms</code> no JEFF (vs <code>0ms</code> no Gemini Direto — bypass)<br>
      • <strong>Camada 2 (Handshake / Envio):</strong> <code>${jeffHandshakeMs}ms</code> no JEFF vs <code>${directHandshakeMs}ms</code> no Direto<br>
      • <strong>Camada 3 (Inferência Gemini 1º Token):</strong> <code>${jeffTtftMs}ms</code> no JEFF vs <code>${directTtftMs}ms</code> no Direto<br>
      • <strong>Camada 4 (Transmissão &amp; Streaming):</strong> <code>${jeffStreamMs}ms</code> no JEFF vs <code>${directStreamMs}ms</code> no Direto<br>
      • <strong>Tempo Total:</strong> <code>${jeffTotalMs}ms</code> (JEFF) vs <code>${directTotalMs}ms</code> (Direto)`;

      let tokenText = '';
      if (jeffUsage && directUsage) {
        const outDiff = directUsage.completion_tokens - jeffUsage.completion_tokens;
        if (outDiff > 0) {
          const savings = ((outDiff / directUsage.completion_tokens) * 100).toFixed(0);
          tokenText = `<br><br>📊 <strong>Gestão de Tokens:</strong> O JEFF gerou <strong>${jeffUsage.completion_tokens} tokens</strong> de resposta contra <strong>${directUsage.completion_tokens} tokens</strong> do Gemini Direto (uma <strong>economia de ${savings}%</strong> em tokens de saída graças à síntese focada). Em entrada, o JEFF consumiu ${jeffUsage.prompt_tokens} tokens (devido ao plano do Jev) vs ${directUsage.prompt_tokens} tokens no canal direto.`;
        } else {
          tokenText = `<br><br>📊 <strong>Gestão de Tokens:</strong> JEFF gerou ${jeffUsage.completion_tokens} tokens de saída (${jeffUsage.total_tokens} total) &bull; Gemini Direto gerou ${directUsage.completion_tokens} tokens de saída (${directUsage.total_tokens} total).`;
        }
      }

      verdictText.innerHTML = speedText + tokenText;
      benchVerdictCard.style.display = 'flex';
    }

    isBenchmarking = false;
    if (btnRunBenchmark) btnRunBenchmark.disabled = false;
    if (benchPromptInput) {
      benchPromptInput.disabled = false;
      benchPromptInput.focus();
    }
  }

  // Listeners dos presets do benchmark
  document.querySelectorAll('.bench-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const p = chip.getAttribute('data-bench-prompt');
      if (benchPromptInput) benchPromptInput.value = p;
      runBenchmark(p);
    });
  });

  if (btnRunBenchmark) {
    btnRunBenchmark.addEventListener('click', () => {
      const p = benchPromptInput.value.trim();
      if (p) runBenchmark(p);
    });
  }

  if (benchPromptInput) {
    benchPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const p = benchPromptInput.value.trim();
        if (p) runBenchmark(p);
      }
    });
  }
  initSessions();
  loadConfig();
});

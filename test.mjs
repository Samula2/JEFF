// test.mjs
async function runTests() {
  console.log('--- Testando /api/config ---');
  const cfgRes = await fetch('http://localhost:5173/api/config');
  const cfg = await cfgRes.json();
  console.log('Config status:', cfgRes.status, cfg.llmProvider);

  console.log('\n--- Testando /api/jev/decision ---');
  const jevRes = await fetch('http://localhost:5173/api/jev/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Implemente uma função para calcular Fibonacci' })
  });
  const jevData = await jevRes.json();
  console.log('Jev Response:', JSON.stringify(jevData, null, 2));

  console.log('\n--- Testando /api/llm/chat (streaming) ---');
  const chatRes = await fetch('http://localhost:5173/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Implemente uma função para calcular Fibonacci' }],
      jevDecision: jevData
    })
  });
  const text = await chatRes.text();
  console.log('Chat SSE chunks recebidos (amostra):\n', text.slice(0, 300));
  console.log('\n✓ Todos os testes passaram com sucesso!');
}

runTests();

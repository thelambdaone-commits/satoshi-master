const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function analyzeResult(
  result,
  { apiKey, model = 'openai/gpt-oss-20b', fetchImpl = fetch } = {},
) {
  if (!apiKey) throw new Error('GROQ_API_KEY non configurée.');
  const report = {
    strategy: String(result.strategy || '').slice(0, 20),
    returnPct: Number(result.returnPct) || 0,
    maxDrawdownPct: Number(result.maxDrawdownPct) || 0,
    trades: Number(result.trades) || 0,
    winRatePct: Number(result.winRatePct) || 0,
    sharpeRatio: Number(result.sharpeRatio) || 0,
    benchmarkReturnPct: Number(result.benchmarkReturnPct) || 0,
  };
  const response = await fetchImpl(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Analyse ce backtest en français en 5 phrases maximum. Souligne les limites, les frais, le drawdown et le risque de surajustement. Ne promets aucun gain et ne donne aucun ordre de trading.',
        },
        { role: 'user', content: JSON.stringify(report) },
      ],
      temperature: 0.2,
      max_completion_tokens: 350,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Groq a répondu ${response.status}.`);
  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('Réponse Groq vide.');
  return answer.slice(0, 3500);
}

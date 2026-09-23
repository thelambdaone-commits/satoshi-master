function number(value, digits = 2) {
  return Number(value).toFixed(digits);
}

export function formatResult(coin, result) {
  const start = new Date(result.testStart).toISOString().slice(0, 10);
  const end = new Date(result.testEnd).toISOString().slice(0, 10);
  return (
    `Backtest ${coin} · ${result.strategy}\n` +
    `Période : ${start} → ${end}\n` +
    `Capital : ${number(result.initialCapital)} → ${number(result.finalCapital)} USDC\n` +
    `Rendement : ${number(result.returnPct)} %\n` +
    `Achat-conservation : ${number(result.benchmarkReturnPct)} %\n` +
    `Drawdown maximal : ${number(result.maxDrawdownPct)} %\n` +
    `Transactions : ${result.trades}\n` +
    `Périodes gagnantes : ${number(result.winRatePct)} %\n` +
    `Exposition : ${number(result.exposurePct, 1)} %\n` +
    `Sharpe indicatif : ${number(result.sharpeRatio)}\n\n` +
    'Simulation 1× avec frais et slippage. Aucun ordre réel.'
  );
}

export function formatComparison(coin, results) {
  const sorted = [...results].sort((left, right) => right.returnPct - left.returnPct);
  const lines = sorted.map(
    (result, index) =>
      `${index + 1}. ${result.strategy} : ${number(result.returnPct)} % · ` +
      `DD ${number(result.maxDrawdownPct)} % · ${result.trades} tx`,
  );
  return (
    `Comparaison ${coin}\n\n${lines.join('\n')}\n\n` +
    'Classement historique uniquement. Aucun ordre réel.'
  );
}

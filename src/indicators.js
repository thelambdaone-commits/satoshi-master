function emaSeries(values, period) {
  const multiplier = 2 / (period + 1);
  const output = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    output.push(values[index] * multiplier + output[index - 1] * (1 - multiplier));
  }
  return output;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateIndicators(candles) {
  if (!Array.isArray(candles) || candles.length < 60) {
    throw new Error('Au moins 60 bougies sont requises pour calculer les indicateurs.');
  }
  if (
    candles.some((candle) =>
      ['high', 'low', 'close', 'volume'].some((field) => !Number.isFinite(candle[field])),
    )
  ) {
    throw new Error('Historique de bougies invalide.');
  }

  const closes = candles.map((candle) => candle.close);
  const ema12Series = emaSeries(closes, 12);
  const ema26Series = emaSeries(closes, 26);
  const macdSeries = ema12Series.map((value, index) => value - ema26Series[index]);
  const macdSignalSeries = emaSeries(macdSeries, 9);
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  const recentChanges = changes.slice(-14);
  const averageGain = average(recentChanges.map((change) => Math.max(0, change)));
  const averageLoss = average(recentChanges.map((change) => Math.max(0, -change)));
  const rsi14 = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  const trueRanges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  const ema20 = emaSeries(closes, 20).at(-1);
  const ema50 = emaSeries(closes, 50).at(-1);
  const macd = macdSeries.at(-1);
  const macdSignal = macdSignalSeries.at(-1);
  const trend = ema20 > ema50 && macd > macdSignal ? 'HAUSSIÈRE' :
    ema20 < ema50 && macd < macdSignal ? 'BAISSIÈRE' : 'NEUTRE';

  return {
    price: closes.at(-1),
    change24hPct: (closes.at(-1) / closes.at(-25) - 1) * 100,
    rsi14,
    ema20,
    ema50,
    macd,
    macdSignal,
    macdHistogram: macd - macdSignal,
    atr14: average(trueRanges.slice(-14)),
    trend,
  };
}

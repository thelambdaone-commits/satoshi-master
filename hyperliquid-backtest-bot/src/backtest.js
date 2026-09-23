const STRATEGIES = Object.freeze([
  { id: 'trend', label: 'Tendance EMA 20/50' },
  { id: 'breakout', label: 'Cassure 20 bougies' },
  { id: 'rsi', label: 'Retour à la moyenne RSI 14' },
]);

function ema(values, period) {
  const multiplier = 2 / (period + 1);
  let result = values[0];
  for (const value of values.slice(1)) {
    result = value * multiplier + result * (1 - multiplier);
  }
  return result;
}

function rsi(values, period = 14) {
  const recent = values.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const change = recent[index] - recent[index - 1];
    gains += Math.max(0, change);
    losses += Math.max(0, -change);
  }
  return losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
}

function assertCandles(candles) {
  if (!Array.isArray(candles) || candles.length < 80) {
    throw new Error('Au moins 80 bougies sont requises.');
  }
  for (const candle of candles) {
    if (
      !['time', 'open', 'high', 'low', 'close', 'volume'].every((field) =>
        Number.isFinite(candle[field]),
      ) ||
      candle.close <= 0 ||
      candle.high < candle.low
    ) {
      throw new Error('Historique de bougies invalide.');
    }
  }
}

export function listStrategies() {
  return STRATEGIES.map((strategy) => ({ ...strategy }));
}

export function validateStrategy(value) {
  const id = String(value || 'trend').trim().toLowerCase();
  if (!STRATEGIES.some((strategy) => strategy.id === id)) {
    throw new Error(`Stratégie inconnue. Choix : ${STRATEGIES.map(({ id: item }) => item).join(', ')}.`);
  }
  return id;
}

export function strategySignal(strategyId, candles) {
  const strategy = validateStrategy(strategyId);
  assertCandles(candles);
  const closes = candles.map(({ close }) => close);

  if (strategy === 'trend') {
    const recent = closes.slice(-50);
    const fast = ema(recent, 20);
    const slow = ema(recent, 50);
    return fast > slow ? 1 : fast < slow ? -1 : 0;
  }
  if (strategy === 'breakout') {
    const previous = candles.slice(-21, -1);
    const price = closes.at(-1);
    const high = Math.max(...previous.map((candle) => candle.high));
    const low = Math.min(...previous.map((candle) => candle.low));
    return price > high ? 1 : price < low ? -1 : 0;
  }
  const value = rsi(closes);
  return value < 30 ? 1 : value > 70 ? -1 : 0;
}

export function runBacktest(
  candles,
  strategyId,
  {
    initialCapital = 20,
    feeRate = 0.00045,
    slippageRate = 0.0001,
    leverage = 1,
  } = {},
) {
  assertCandles(candles);
  const strategy = validateStrategy(strategyId);
  if (!Number.isFinite(initialCapital) || initialCapital <= 0 || initialCapital > 1_000_000) {
    throw new Error('Le capital doit être compris entre 0 et 1 000 000.');
  }
  if (![feeRate, slippageRate].every((rate) => Number.isFinite(rate) && rate >= 0 && rate <= 0.02)) {
    throw new Error('Les frais et le slippage doivent être compris entre 0 et 2 %.');
  }
  if (!Number.isFinite(leverage) || leverage < 0.1 || leverage > 3) {
    throw new Error('Le levier doit être compris entre 0,1 et 3.');
  }

  const warmup = 80;
  let capital = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  let position = 0;
  let trades = 0;
  let longPeriods = 0;
  let shortPeriods = 0;
  let winningPeriods = 0;
  const returns = [];
  const executionRate = feeRate + slippageRate;

  for (let index = warmup; index < candles.length - 1 && capital > 0; index += 1) {
    const before = capital;
    const nextPosition = strategySignal(strategy, candles.slice(0, index + 1));
    const turnover = Math.abs(nextPosition - position);
    if (turnover > 0) {
      capital *= Math.max(0, 1 - turnover * executionRate * leverage);
      trades += turnover;
      position = nextPosition;
    }
    const marketReturn = candles[index + 1].close / candles[index].close - 1;
    capital = Math.max(0, capital * (1 + position * leverage * marketReturn));
    if (position === 1) longPeriods += 1;
    if (position === -1) shortPeriods += 1;
    if (capital > before) winningPeriods += 1;
    peak = Math.max(peak, capital);
    maxDrawdown = Math.max(maxDrawdown, (peak - capital) / peak);
    returns.push(capital / before - 1);
  }

  if (position !== 0 && capital > 0) {
    capital *= Math.max(0, 1 - executionRate * leverage);
    trades += 1;
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  const deviation = Math.sqrt(variance);
  const investedPeriods = longPeriods + shortPeriods;

  return {
    strategy,
    initialCapital,
    finalCapital: capital,
    returnPct: (capital / initialCapital - 1) * 100,
    benchmarkReturnPct: (candles.at(-1).close / candles[warmup].close - 1) * 100,
    maxDrawdownPct: maxDrawdown * 100,
    trades,
    longPeriods,
    shortPeriods,
    winRatePct: investedPeriods === 0 ? 0 : (winningPeriods / investedPeriods) * 100,
    exposurePct: (investedPeriods / returns.length) * 100,
    sharpeRatio: deviation === 0 ? 0 : (mean / deviation) * Math.sqrt(8760),
    testStart: candles[warmup].time,
    testEnd: candles.at(-1).time,
    testCandles: candles.length - warmup,
    feeRate,
    slippageRate,
    leverage,
  };
}

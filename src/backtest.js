import { LocalNeuralTrader } from './neural-trader.js';

export function runBacktest(
  candles,
  { trainRatio = 0.7, initialCapital = 1000, feeRate = 0.001 } = {},
) {
  if (!Array.isArray(candles) || candles.length < 120) {
    throw new Error('Au moins 120 bougies sont requises pour le backtest.');
  }
  if (!Number.isFinite(trainRatio) || trainRatio < 0.5 || trainRatio > 0.85) {
    throw new Error("Le ratio d’entraînement doit être compris entre 0,5 et 0,85.");
  }
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new Error('Le capital initial doit être positif.');
  }
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 0.02) {
    throw new Error('Les frais doivent être compris entre 0 et 2 %.');
  }

  const splitIndex = Math.floor(candles.length * trainRatio);
  const training = candles.slice(0, splitIndex);
  const testing = candles.slice(splitIndex);
  const trader = new LocalNeuralTrader({ seed: 42 });
  trader.train(training);

  let capital = initialCapital;
  let position = 0;
  let trades = 0;
  let winningPeriods = 0;
  let investedPeriods = 0;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const periodReturns = [];

  for (let index = splitIndex; index < candles.length - 1; index += 1) {
    const capitalBeforePeriod = capital;
    const prediction = trader.predict(
      candles.slice(Math.max(0, index - trader.windowSize), index + 1),
    );
    const nextPosition = prediction.signal === 'ACHAT' ? 1 : prediction.signal === 'VENTE' ? 0 : position;

    if (nextPosition !== position) {
      capital *= 1 - feeRate;
      trades += 1;
      position = nextPosition;
    }

    if (position === 1) {
      const periodReturn = candles[index + 1].close / candles[index].close - 1;
      capital *= 1 + periodReturn;
      investedPeriods += 1;
      if (periodReturn > 0) winningPeriods += 1;
    }

    peak = Math.max(peak, capital);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - capital) / peak);
    periodReturns.push(capital / capitalBeforePeriod - 1);
  }

  if (position === 1) {
    capital *= 1 - feeRate;
    trades += 1;
  }

  const meanReturn = periodReturns.reduce((sum, value) => sum + value, 0) / periodReturns.length;
  const returnVariance =
    periodReturns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) /
    periodReturns.length;
  const returnDeviation = Math.sqrt(returnVariance);

  return {
    trainingCandles: training.length,
    testCandles: testing.length,
    testStart: testing[0].openTime,
    testEnd: testing.at(-1).openTime,
    initialCapital,
    finalCapital: capital,
    returnPct: (capital / initialCapital - 1) * 100,
    maxDrawdownPct: maxDrawdown * 100,
    trades,
    winRatePct: investedPeriods === 0 ? 0 : (winningPeriods / investedPeriods) * 100,
    exposurePct: (investedPeriods / periodReturns.length) * 100,
    benchmarkReturnPct: (testing.at(-1).close / testing[0].close - 1) * 100,
    sharpeRatio: returnDeviation === 0 ? 0 : (meanReturn / returnDeviation) * Math.sqrt(8760),
  };
}

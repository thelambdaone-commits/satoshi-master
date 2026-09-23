function sigmoid(value) {
  const bounded = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-bounded));
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function featuresForWindow(candles) {
  const first = candles[0];
  const last = candles.at(-1);
  const returns = candles.slice(1).map((candle, index) =>
    (candle.close - candles[index].close) / candles[index].close,
  );
  const meanReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) / returns.length;
  const averageRange =
    candles.reduce((sum, candle) => sum + (candle.high - candle.low) / candle.close, 0) /
    candles.length;
  const averageVolume =
    candles.reduce((sum, candle) => sum + candle.volume, 0) / candles.length;
  const highest = Math.max(...candles.map((candle) => candle.high));
  const lowest = Math.min(...candles.map((candle) => candle.low));

  return [
    (last.close - first.close) / first.close,
    meanReturn,
    Math.sqrt(variance),
    averageRange,
    averageVolume === 0 ? 0 : (last.volume - averageVolume) / averageVolume,
    highest === lowest ? 0.5 : (last.close - lowest) / (highest - lowest),
  ];
}

function assertCandles(candles, minimum) {
  if (!Array.isArray(candles) || candles.length < minimum) {
    throw new Error(`Au moins ${minimum} bougies valides sont requises.`);
  }
  for (const candle of candles) {
    for (const field of ['open', 'high', 'low', 'close', 'volume']) {
      if (!Number.isFinite(candle[field]) || candle[field] < 0) {
        throw new Error('Les bougies contiennent des valeurs invalides.');
      }
    }
    if (candle.close === 0 || candle.high < candle.low) {
      throw new Error('Les bougies contiennent des valeurs invalides.');
    }
  }
}

export function buildDataset(candles, windowSize = 20) {
  assertCandles(candles, windowSize + 2);
  const samples = [];

  for (let index = windowSize; index < candles.length - 1; index += 1) {
    const window = candles.slice(index - windowSize, index + 1);
    samples.push({
      features: featuresForWindow(window),
      target: candles[index + 1].close > candles[index].close ? 1 : 0,
    });
  }

  return { samples };
}

export class LocalNeuralTrader {
  constructor({ windowSize = 20, epochs = 250, learningRate = 0.08, seed = 42 } = {}) {
    this.windowSize = windowSize;
    this.epochs = epochs;
    this.learningRate = learningRate;
    this.random = createRandom(seed);
    this.weights = null;
  }

  train(candles) {
    const { samples } = buildDataset(candles, this.windowSize);
    const featureCount = samples[0].features.length;
    this.means = Array.from({ length: featureCount }, (_, index) =>
      samples.reduce((sum, sample) => sum + sample.features[index], 0) / samples.length,
    );
    this.scales = this.means.map((mean, index) => {
      const variance =
        samples.reduce((sum, sample) => sum + (sample.features[index] - mean) ** 2, 0) /
        samples.length;
      return Math.sqrt(variance) || 1;
    });
    const normalized = samples.map((sample) => ({
      ...sample,
      features: this.normalize(sample.features),
    }));
    this.weights = Array.from({ length: featureCount }, () => (this.random() - 0.5) * 0.1);
    this.bias = 0;

    for (let epoch = 0; epoch < this.epochs; epoch += 1) {
      for (const sample of normalized) {
        const probability = this.forward(sample.features);
        const error = probability - sample.target;
        this.weights = this.weights.map(
          (weight, index) => weight - this.learningRate * error * sample.features[index],
        );
        this.bias -= this.learningRate * error;
      }
    }

    const correct = normalized.filter((sample) =>
      (this.forward(sample.features) >= 0.5 ? 1 : 0) === sample.target,
    ).length;
    return { samples: samples.length, accuracy: correct / samples.length };
  }

  normalize(features) {
    return features.map((value, index) => (value - this.means[index]) / this.scales[index]);
  }

  forward(features) {
    const score = features.reduce(
      (sum, value, index) => sum + value * this.weights[index],
      this.bias,
    );
    return sigmoid(score);
  }

  predict(candles) {
    if (!this.weights) throw new Error("Le modèle doit être entraîné avant de prédire.");
    assertCandles(candles, this.windowSize + 1);
    const window = candles.slice(-(this.windowSize + 1));
    const probability = this.forward(this.normalize(featuresForWindow(window)));
    const signal = probability >= 0.58 ? 'ACHAT' : probability <= 0.42 ? 'VENTE' : 'ATTENDRE';
    return { probability, signal };
  }
}

class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    console.log("NoiseSuppressionProcessor initialized");
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      // Envia os dados para a thread principal
      this.port.postMessage(inputChannel);
    }
    return true;
  }
}

registerProcessor('noise-suppression-processor', NoiseSuppressionProcessor);

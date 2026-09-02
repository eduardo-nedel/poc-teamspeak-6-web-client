import processorUrl from './NoiseSuppressionProcessor.ts?url';

export async function setupAudioWorklet(audioContext: AudioContext): Promise<AudioWorkletNode> {
  await audioContext.audioWorklet.addModule(processorUrl);
  const workletNode = new AudioWorkletNode(audioContext, 'noise-suppression-processor');
  return workletNode;
}

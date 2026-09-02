import { useState, useEffect, useRef, useCallback } from 'react';
import { setupAudioWorklet } from '../audio/AudioWorkletManager';

interface UseVoiceAudioProps {
  isMuted: boolean;
  isDeafened: boolean;
  isPTT: boolean;
  isPTTActive: boolean;
  onTalkingChange: (isTalking: boolean) => void;
  onSendAudio: (data: ArrayBuffer) => void;
}

export function useVoiceAudio({
  isMuted,
  isDeafened,
  isPTT,
  isPTTActive,
  onTalkingChange,
  onSendAudio,
}: UseVoiceAudioProps) {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  const isPTTRef = useRef(isPTT);
  const isPTTActiveRef = useRef(isPTTActive);
  const onTalkingChangeRef = useRef(onTalkingChange);
  const onSendAudioRef = useRef(onSendAudio);

  useEffect(() => {
    isMutedRef.current = isMuted;
    isDeafenedRef.current = isDeafened;
    isPTTRef.current = isPTT;
    isPTTActiveRef.current = isPTTActive;
    onTalkingChangeRef.current = onTalkingChange;
    onSendAudioRef.current = onSendAudio;
  }, [isMuted, isDeafened, isPTT, isPTTActive, onTalkingChange, onSendAudio]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isTalkingRef = useRef<boolean>(false);

  // Audio Playback context for incoming audio streams
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Inicializa contexto de reprodução de áudio
  const getPlaybackContext = useCallback(() => {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      playbackCtxRef.current = new AudioContextClass({ sampleRate: 48000 });
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
    }
    if (playbackCtxRef.current.state === 'suspended') {
      playbackCtxRef.current.resume();
    }
    return playbackCtxRef.current;
  }, []);

  // Iniciar captura de áudio do microfone
  const startAudio = useCallback(async () => {
    try {
      setMicError(null);
      getPlaybackContext();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;
      setHasMicPermission(true);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 48000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // SETUP AudioWorklet
      const workletNode = await setupAudioWorklet(audioCtx);
      workletNodeRef.current = workletNode;

      source.connect(analyser);
      analyser.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      workletNode.port.onmessage = (e) => {
        const inputData = e.data as Float32Array;

        if (isMutedRef.current) {
          if (isTalkingRef.current) {
            isTalkingRef.current = false;
            onTalkingChangeRef.current(false);
          }
          setAudioLevel(0);
          return;
        }

        // Medidor de nível: segue igual, usando o AnalyserNode ligado ao source
        if (analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(dataArray);
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            const abs = v < 0 ? -v : v;
            if (abs > peak) peak = abs;
          }
          const normalizedLevel = Math.min(100, Math.round(peak * 200));
          setAudioLevel(normalizedLevel);

          const talking = normalizedLevel > 1;
          if (talking !== isTalkingRef.current) {
            isTalkingRef.current = talking;
            onTalkingChangeRef.current(talking);
          }
        }

        // Conversão PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        onSendAudioRef.current(pcm16.buffer);
      };
    } catch (err: any) {
      console.error('[VoiceAudio] Erro ao acessar microfone:', err);
      setMicError(err.message || 'Permissão de microfone negada');
      setHasMicPermission(false);
    }
  }, [getPlaybackContext]);

  // Parar captura e limpar recursos
  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    setAudioLevel(0);
    setHasMicPermission(false);
  }, []);

  // Tocar pacote de áudio recebido do TeamSpeak ou outros usuários
  const playIncomingAudio = useCallback((pcmBuffer: ArrayBuffer) => {
    if (isDeafened) return;

    try {
      const ctx = getPlaybackContext();
      const pcm16 = new Int16Array(pcmBuffer);
      if (pcm16.length === 0) return;

      // Áudio decodificado pelo Opus (2 canais estéreo ou 1 canal mono)
      const numChannels = pcm16.length >= 1920 ? 2 : 1;
      const frameCount = Math.floor(pcm16.length / numChannels);

      const audioBuffer = ctx.createBuffer(numChannels, frameCount, 48000);
      if (numChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        for (let i = 0; i < frameCount; i++) {
          left[i] = pcm16[i * 2] / 32768.0;
          right[i] = pcm16[i * 2 + 1] / 32768.0;
        }
      } else {
        const channel = audioBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
          channel[i] = pcm16[i] / 32768.0;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      // Se o atraso for maior que 100ms, resincroniza o relógio para evitar lag acumulado
      if (nextPlayTimeRef.current < currentTime || nextPlayTimeRef.current > currentTime + 0.5) {
        nextPlayTimeRef.current = currentTime;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error('[VoiceAudio] Erro ao reproduzir áudio recebido:', err);
    }
  }, [getPlaybackContext, isDeafened]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    audioLevel,
    hasMicPermission,
    micError,
    startAudio,
    stopAudio,
    playIncomingAudio,
  };
}


// Custom Base64 decoder as required by guidelines
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom PCM audio data decoder for Web Audio API as required by guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


class AudioQueuePlayer {
    private audioContext: AudioContext;
    private nextStartTime = 0;
    private activeSources = new Set<AudioBufferSourceNode>();

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        this.resumeContext();
    }
    
    public resumeContext() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.error("Error resuming AudioContext", e));
        }
    }

    public async queueAudio(base64Audio: string) {
        if (!base64Audio) return;
        this.resumeContext();

        try {
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, this.audioContext, 24000, 1);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            source.onended = () => {
                this.activeSources.delete(source);
            };

            const currentTime = this.audioContext.currentTime;
            const startTime = this.nextStartTime > currentTime ? this.nextStartTime : currentTime;

            source.start(startTime);
            this.nextStartTime = startTime + audioBuffer.duration;
            this.activeSources.add(source);
        } catch (error) {
            console.error("Failed to queue or play audio:", error);
            if (this.audioContext) {
                this.audioContext.close();
            }
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
    }
    
    public stop() {
        this.activeSources.forEach(source => {
            try {
              source.stop();
            } catch (e) {
              // Can throw if already stopped, ignore
            }
        });
        this.activeSources.clear();
        this.nextStartTime = 0;
    }
}

export const audioPlayer = new AudioQueuePlayer();

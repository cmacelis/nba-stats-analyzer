class SoundManager {
  private static instance: SoundManager;
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean;
  private initialized: boolean = false;

  private constructor() {
    this.enabled = true;
    this.initializeOnUserInteraction();
  }

  private initializeOnUserInteraction() {
    const initFunction = async () => {
      await this.initializeContext();
      await this.initSounds();
      this.initialized = true;
      
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, initFunction);
      });
    };

    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, initFunction, { once: true });
    });
  }

  private async initSounds() {
    // Switch sound
    const switchBuffer = this.context?.createBuffer(1, 4410, 44100) || new AudioBuffer({ length: 4410, numberOfChannels: 1, sampleRate: 44100 });
    const switchData = switchBuffer.getChannelData(0);
    for (let i = 0; i < switchData.length; i++) {
      switchData[i] = Math.sin(i * 0.05) * Math.exp(-i * 0.001);
    }
    
    // Hover sound
    const hoverBuffer = this.context?.createBuffer(1, 2205, 44100) || new AudioBuffer({ length: 2205, numberOfChannels: 1, sampleRate: 44100 });
    const hoverData = hoverBuffer.getChannelData(0);
    for (let i = 0; i < hoverData.length; i++) {
      hoverData[i] = Math.sin(i * 0.1) * Math.exp(-i * 0.002);
    }
    
    // Click sound
    const clickBuffer = this.context?.createBuffer(1, 4410, 44100) || new AudioBuffer({ length: 4410, numberOfChannels: 1, sampleRate: 44100 });
    const clickData = clickBuffer.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = Math.sin(i * 0.15) * Math.exp(-i * 0.0015);
    }

    this.sounds.set('switch', switchBuffer);
    this.sounds.set('hover', hoverBuffer);
    this.sounds.set('click', clickBuffer);
  }

  private async initializeContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.context.state === 'suspended') {
        const resumeOnInteraction = () => {
          this.context?.resume();
          ['click', 'touchstart', 'keydown'].forEach(event => {
            document.removeEventListener(event, resumeOnInteraction);
          });
        };
        
        ['click', 'touchstart', 'keydown'].forEach(event => {
          document.addEventListener(event, resumeOnInteraction);
        });
      }
    }
  }

  private playBuffer(buffer: AudioBuffer) {
    const source = this.context?.createBufferSource() || new AudioBufferSourceNode(this.context);
    source.buffer = buffer;
    
    const gainNode = this.context?.createGain() || new GainNode(this.context);
    gainNode.gain.value = 0.1; // Low volume
    
    source.connect(gainNode);
    gainNode.connect(this.context?.destination || new AudioDestinationNode());
    
    source.start(0);
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public play(soundName: string) {
    if (!this.enabled) return;
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (this.context?.state === 'suspended') {
      this.context?.resume();
    }

    const buffer = this.sounds.get(soundName);
    if (buffer) {
      try {
        this.playBuffer(buffer);
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    }
  }

  public toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const soundManager = SoundManager.getInstance();

export const playClickSound = async () => {
  try {
    const audio = new Audio('/sounds/click.mp3');
    await audio.play();
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
};

export const playSelectSound = async () => {
  try {
    const audio = new Audio('/sounds/select.mp3');
    await audio.play();
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
}; 
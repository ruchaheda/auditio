// wavesurfer.d.ts

declare module 'wavesurfer.js' {
    interface WaveSurferParams {
      container: string | HTMLElement;
      waveColor?: string;
      progressColor?: string;
      height?: number;
      backend?: 'WebAudio' | 'MediaElement';
      plugins?: any[];
      [key: string]: any; // Allow any additional parameter
    }
  
    interface WaveSurfer {
      load(url: string): void;
      playPause(): void;
      addRegion(params: any): any;
      on(event: string, callback: (region?: any) => void): void;
      destroy(): void;
      getCurrentTime(): number;
      getDuration(): number;
      seekTo(progress: number): void;
      [key: string]: any; // Allow any additional method
    }
  
    function create(params: WaveSurferParams): WaveSurfer;
  
    export default { create };
  }
  
  declare module 'wavesurfer.js/src/plugin/regions' {
    export default class RegionsPlugin {
      static create(params?: any): any;
    }
  }
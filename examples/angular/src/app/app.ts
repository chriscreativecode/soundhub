import { Component, computed, inject } from '@angular/core';
import { SoundState } from 'soundhub';
import { SoundService, injectSoundState } from './sound/sound.service';

function formatTime(seconds = 0): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

@Component({
  selector: 'app-music-player',
  template: `
    <section class="card">
      <h2>Music</h2>
      <div class="row">
        <button (click)="toggle()">{{ playing() ? 'Pause' : 'Play' }}</button>
        <button class="quiet" (click)="sound.stop('music')">Stop</button>
        <span class="time">{{ time() }}</span>
      </div>
      <input
        type="range"
        aria-label="Position"
        min="0"
        step="0.1"
        [max]="state()?.duration || 1"
        [value]="state()?.currentTime ?? 0"
        (input)="seek($event)"
      />
    </section>
  `,
})
export class MusicPlayer {
  protected readonly sound = inject(SoundService);
  protected readonly state = injectSoundState('music');

  protected readonly playing = computed(() => this.state()?.state === SoundState.Playing);
  protected readonly time = computed(
    () => `${formatTime(this.state()?.currentTime)} / ${formatTime(this.state()?.duration)}`,
  );

  protected toggle(): void {
    const state = this.state()?.state;
    if (state === SoundState.Playing) this.sound.pause('music');
    else if (state === SoundState.Paused) this.sound.resume('music');
    else this.sound.play('music', { loop: true, volume: 0.7, fadeInDuration: 1 });
  }

  protected seek(event: Event): void {
    this.sound.seek('music', Number((event.target as HTMLInputElement).value));
  }
}

@Component({
  selector: 'app-effects',
  template: `
    <section class="card">
      <h2>Effects</h2>
      <p>Click fast. With <code>overlap: true</code> every click starts its own instance.</p>
      <div class="row">
        <button (click)="sound.play('laser', { overlap: true })">Laser</button>
        <button (click)="sound.play('explosion', { overlap: true })">Explosion</button>
      </div>
    </section>
  `,
})
export class Effects {
  protected readonly sound = inject(SoundService);
}

@Component({
  selector: 'app-root',
  imports: [MusicPlayer, Effects],
  template: `
    <main>
      <h1>soundhub + Angular</h1>
      @if (sound.loaded()) {
        <app-music-player />
        <app-effects />
      } @else {
        <p>Loading sounds…</p>
      }
    </main>
  `,
})
export class App {
  protected readonly sound = inject(SoundService);
}

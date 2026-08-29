/** @internal */
interface TickerCallback {
    id: string;
    callback: (deltaTime: number) => void;
    interval?: number;
    lastUpdate?: number;
}
export class Ticker {
    private callbacks: Map<string, TickerCallback> = new Map();
    private animationFrameId: number | null = null;
    private lastTick: number = 0;
    private running: boolean = false;

    constructor() {
        this.tick = this.tick.bind(this);
    }

    private tick(timestamp: number): void {
        // The frame we were scheduled for has fired, so there is no pending id anymore.
        this.animationFrameId = null;
        if (!this.running) return;

        const deltaTime = timestamp - (this.lastTick || timestamp);
        this.lastTick = timestamp;

        this.callbacks.forEach(callback => {
            if (!callback.interval) {
                callback.callback(deltaTime);
                return;
            }

            callback.lastUpdate = callback.lastUpdate || timestamp;
            const elapsed = timestamp - callback.lastUpdate;

            if (elapsed >= callback.interval) {
                callback.callback(deltaTime);
                callback.lastUpdate = timestamp;
            }
        });

        // Callbacks may have called removeCallback/clear/stop on us. Only keep the
        // rAF loop alive while we are still running and still have work to do,
        // otherwise an empty loop would tick forever.
        if (this.running && this.callbacks.size > 0) {
            this.animationFrameId = requestAnimationFrame(this.tick);
        } else {
            this.running = false;
        }
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTick = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    public stop(): void {
        this.running = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public addCallback(id: string, callback: (deltaTime: number) => void, interval?: number): void {
        this.callbacks.set(id, { id, callback, interval });
        this.start();
    }

    public removeCallback(id: string): void {
        this.callbacks.delete(id);
        if (this.callbacks.size === 0) {
            this.stop();
        }
    }

    public clear(): void {
        this.callbacks.clear();
        this.stop();
    }
}
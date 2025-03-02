interface TickerCallback {
    id: string;
    callback: (deltaTime: number) => void;
    interval?: number;
    lastUpdate?: number;
}
/** @internal */
export class Ticker {
    private callbacks: Map<string, TickerCallback> = new Map();
    private animationFrameId: number | null = null;
    private lastTick: number = 0;

    constructor() {
        this.tick = this.tick.bind(this);
    }

    private tick(timestamp: number): void {
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

        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    public start(): void {
        if (!this.animationFrameId) {
            this.lastTick = performance.now();
            this.animationFrameId = requestAnimationFrame(this.tick);
        }
    }

    public stop(): void {
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
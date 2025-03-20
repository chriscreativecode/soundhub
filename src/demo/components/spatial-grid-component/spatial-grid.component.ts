// spatial-grid.component.ts
import { SoundManager } from "../../../sound-manager/sound-manager";
import { SoundPannerConfig } from "../../../sound-manager/sound-panner-config";
import { SoundStateInfo } from "../../../sound-manager/sound-state-info.interface";
import { SoundControlState } from "../sound-control-component/sound-control.component";
/* @ts-ignore */
import spatialGridComponentHtm from "./spatial-grid.component.html?raw";

export class SpatialGrid {
    private grid: HTMLElement;
    private circle: HTMLElement;
    private verticalSlider: HTMLInputElement;
    private coordsDisplay: HTMLElement;
    private isDragging = false;
    private soundState: SoundStateInfo | null;
    private onPositionChange?: (position: { x: number; y: number; z: number }) => void;

    constructor(
        private container: HTMLElement,
        private soundManager: SoundManager,
        private soundId?: string,
        onPositionChange?: (position: { x: number; y: number; z: number }) => void
    ) {
        this.onPositionChange = onPositionChange;
        if (this.soundId) {
            this.soundState = this.soundManager.getSoundState(this.soundId);
        }
        this.container.innerHTML = spatialGridComponentHtm;
        this.grid = this.container.querySelector(".spatial-grid")!;
        this.circle = this.container.querySelector(".spatial-position-circle")!;
        this.verticalSlider = this.container.querySelector(".vertical-slider")!;
        this.coordsDisplay = this.container.querySelector(".spatial-coordinates")!;
        this.initialize();
    }

    private initialize(): void {
        this.initializeEventListeners();
        this.initializePosition();
    }

    private initializeEventListeners(): void {
        this.grid.addEventListener("mousedown", this.handleMouseDown.bind(this));
        document.addEventListener("mouseup", this.handleMouseUp.bind(this));
        document.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.verticalSlider.addEventListener("input", this.handleVerticalSliderInput.bind(this));

        // Add click handler for the grid
        this.grid.addEventListener("click", this.handleGridClick.bind(this));

        // Add touch events for mobile support
        this.circle.addEventListener("touchstart", this.handleTouchStart.bind(this));
        document.addEventListener("touchend", this.handleTouchEnd.bind(this));
        document.addEventListener("touchmove", this.handleTouchMove.bind(this));
    }

    private handleGridClick(e: MouseEvent): void {
        // Only handle clicks directly on the grid (not on the circle)
        if (e.target === this.circle) return;

        const rect = this.grid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const z = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const y = parseFloat(this.verticalSlider.value);

        this.updatePosition(x, y, z);
    }


    private handleMouseDown(e: MouseEvent): void {
        this.isDragging = true;
        e.preventDefault();
    }

    private handleMouseUp(): void {
        this.isDragging = false;
    }

    private throttle(func: (...args: any[]) => void, limit: number): (...args: any[]) => void {
        let inThrottle = false;
        return (...args: any[]) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    private handleMouseMove = this.throttle((e: MouseEvent) => {
        if (!this.isDragging) return;
        const rect = this.grid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const z = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const y = parseFloat(this.verticalSlider.value);
        this.updatePosition(x, y, z);
    }, 25); // Throttle to 25ms
    
    private handleTouchStart(e: TouchEvent): void {
        this.isDragging = true;
        // Prevent scrolling while dragging
        e.preventDefault();
    }

    private handleTouchEnd(): void {
        this.isDragging = false;
    }

    private handleTouchMove(e: TouchEvent): void {
        if (!this.isDragging) return;

        const touch = e.touches[0];
        const rect = this.grid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
        const z = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
        const y = parseFloat(this.verticalSlider.value);

        this.updatePosition(x, y, z);
        // Prevent scrolling while dragging
        e.preventDefault();
    }

    private handleVerticalSliderInput = this.throttle((e: MouseEvent) => {
        const y = parseFloat(this.verticalSlider.value);
        const x = parseFloat(this.circle.style.left);
        const z = parseFloat(this.circle.style.top);
        this.updatePosition(x, y, z);
    }, 25); // Throttle to 25ms

    public updatePosition(x: number, y: number, z: number, skipEvent: boolean = false, visuallyOnly: boolean = false): void {
        const currentPosition = this.getCurrentPosition();
        if (currentPosition.x === x && currentPosition.y === y && currentPosition.z === z) {
            return; // Skip if position hasn't changed
        }
    
        this.circle.style.left = `${x}%`;
        this.circle.style.top = `${z}%`;
        this.verticalSlider.value = y.toString();
    
        if (this.soundId && skipEvent === false && visuallyOnly === false) {
            this.soundManager.setSpatialPosition(
                x / 50 - 1,
                y,
                z / 50 - 1,
                this.soundId,
                undefined,
                true
            );
        } else if(visuallyOnly === false) {
            this.soundManager.setMasterSpatialPosition(
                x / 50 - 1,
                y,
                z / 50 - 1,
                {},
                skipEvent
            );
        }
    
        if (this.onPositionChange && !visuallyOnly) {
            this.onPositionChange({
                x: x / 50 - 1,
                y: y,
                z: z / 50 - 1
            });
        }
    
        this.coordsDisplay.innerHTML = `<strong>Position:</strong><br/>X: ${(x / 50 - 1).toFixed(2)},<br/> Y: ${y.toFixed(2)},<br/>Z: ${(z / 50 - 1).toFixed(2)}`;
    }

    public getCurrentPosition(): { x: number; y: number; z: number } {
        return {
            x: this.roundToTwo(parseFloat(this.circle.style.left)),
            y: this.roundToTwo(parseFloat(this.verticalSlider.value)),
            z: this.roundToTwo(parseFloat(this.circle.style.top))
        };
    }

    public isSamePostion(coordsPrevious: { x: number, y: number, z: number }, coordsCurrent: { x: number, y: number, z: number }): boolean {
        const EPSILON = 0.01;
        
        return (
            Math.abs(this.roundToTwo(coordsPrevious.x) - this.roundToTwo(coordsCurrent.x)) < EPSILON &&
            Math.abs(this.roundToTwo(coordsPrevious.y) - this.roundToTwo(coordsCurrent.y)) < EPSILON &&
            Math.abs(this.roundToTwo(coordsPrevious.z) - this.roundToTwo(coordsCurrent.z)) < EPSILON
        );
    }

    public getPositionFromState(state: SoundControlState): { x: number; y: number; z: number } {
        const roundedX = this.roundToTwo(state.panSpatialPosition.x);
        const roundedY = this.roundToTwo(state.panSpatialPosition.y);
        const roundedZ = this.roundToTwo(state.panSpatialPosition.z);
    
        // Convert to grid coordinates (0-100)
        return {
            x: this.roundToTwo((roundedX + 1) * 50),
            y: roundedY,
            z: this.roundToTwo((roundedZ + 1) * 50)
        };
    }
    
    public roundToTwo(num: number): number {
        return this.soundManager.roundValue(num, 2);
    }

    public setSpatialPositionWithConfig(newConfig: Partial<SoundPannerConfig>) {
        if(this.soundId) {
            let state = this.soundManager.getSoundState(this.soundId);
            this.soundManager.setSpatialPosition(
                state.panSpatialPosition.x,
                state.panSpatialPosition.y,
                state.panSpatialPosition.z,
                this.soundId,
                newConfig
            );
        } else {
            let position: { x: number, y: number, z: number } = this.soundManager.getMasterSpatialPosition();
            this.soundManager.setMasterSpatialPosition(
                position.x,
                position.y,
                position.z,
                newConfig
            );
        }
    }

    private initializePosition(): void {
        this.updatePosition(50, 0, 50, true, true);
    }
}
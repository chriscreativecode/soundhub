export enum PanningModel {
  HRTF = "HRTF",
  EqualPower = "equalpower",
}

export enum DistanceModel {
  Linear = "linear",
  Inverse = "inverse",
  Exponential = "exponential",
}

export interface SoundPannerConfig {
  /**
   * Determines which spatialisation algorithm to use to position the audio in 3D space.
   * - 'HRTF': More accurate, head-related transfer function (default)
   * - 'equalpower': Basic equal-power panning
   */
  panningModel?: PanningModel;

  /**
   * Determines how the volume of the audio source decreases as it moves away from the listener.
   * - 'linear': Volume reduces linearly with distance
   * - 'inverse': Volume reduces inversely with distance (realistic, default)
   * - 'exponential': Volume reduces exponentially with distance
   */
  distanceModel?: DistanceModel;

  /**
   * The reference distance for reducing volume as the audio source moves further from the listener.
   * Default is 1 meter.
   * @min 0
   */
  refDistance?: number;

  /**
   * The maximum distance between the audio source and the listener, after which the volume will not be reduced any further.
   * Default is 10000 meters.
   * @min refDistance
   */
  maxDistance?: number;

  /**
   * Describes how quickly the volume reduces as the source moves away from the listener.
   * - For 'linear': Valid range [0, 1], default 1
   * - For 'inverse': Valid range [0, ∞], default 1
   * - For 'exponential': Valid range [0, ∞], default 1
   */
  rolloffFactor?: number;

  /**
   * The angle, in degrees, of a cone inside which there will be no volume reduction.
   * Default is 360 (no cone).
   * @range [0, 360]
   */
  coneInnerAngle?: number;

  /**
   * The angle, in degrees, of a cone outside which the volume will be reduced by a constant value.
   * Default is 360 (no cone).
   * @range [0, 360]
   */
  coneOuterAngle?: number;

  /**
   * The amount of volume reduction outside the outer cone.
   * Default is 0.
   * @range [0, 1]
   */
  coneOuterGain?: number;
}

export const DEFAULT_PANNER_CONFIG: SoundPannerConfig = {
  panningModel: PanningModel.HRTF,
  distanceModel: DistanceModel.Inverse,
  refDistance: 1,
  maxDistance: 10000,
  rolloffFactor: 1,
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
};

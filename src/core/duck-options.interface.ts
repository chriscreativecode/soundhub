/**
 * Options for hub.duck(): turn one sound or group down while another plays.
 *
 * Every name is matched against a sound id, the id its overlapping instances
 * came from ("laser" for "laser:3"), a sprite's sound ("ui" for the sprite
 * "ui_click"), a group name and a stream id.
 */
export interface DuckOptions {
  /** The sound, group or stream whose playing turns the target down. One name or several. */
  when: string | string[];
  /** The level the target drops to, from 0 (silent) to 1 (no change). Default: 0.3. */
  amount?: number;
  /** Seconds to go down once a trigger starts. Default: 0.05. */
  attack?: number;
  /** Seconds to come back up after the last trigger stops. Default: 0.5. */
  release?: number;
}

/** @internal */
export interface DuckRule {
  target: string;
  triggers: string[];
  amount: number;
  attack: number;
  release: number;
  /** Sits between the target's gain nodes and the master bus. */
  node: GainNode;
  active: boolean;
}

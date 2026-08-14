# Piano samples

Five chromatic octaves plus the closing C, C2 through C7, used by the multichannel demo.
That is 61 notes, the range of a standard 61 key board, so the demo pieces have a real
left hand instead of a bass line folded up into the melody's octave.

## Source

Rendered from the **FluidR3_GM** SoundFont (acoustic grand piano), distributed as
per-note MP3 files by the [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)
project.

- Files: `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/`
- FluidR3_GM by Frank Wen, released under the MIT license.

## Why these

The samples that were here before were all cut to exactly the same length and still had
audible signal at the end, roughly -32 to -42 dB RMS in the last 0.3 seconds for the lower
notes. That made every note stop dead instead of ringing out, which was especially obvious
on E4 and C4.

These decay to the noise floor instead: -60 dB RMS or lower across the whole range, and
below -88 dB at the top. The note fades to nothing on its own, which is what the demo wants
since it deliberately never calls `stop()` on a key release and lets each note play out.

<script lang="ts">
  import { getHub } from './sound/hub';
</script>

<section class="card">
  <h2>Effects</h2>
  <p>Click fast. With <code>overlap: true</code> every click starts its own instance.</p>
  <div class="row">
    <button onclick={() => getHub().play('laser', { overlap: true })}>Laser</button>
    <button onclick={() => getHub().play('explosion', { overlap: true })}>Explosion</button>
  </div>
</section>

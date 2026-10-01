<script setup lang="ts">
import { getHub } from '../sound/hub';
</script>

<template>
  <section class="card">
    <h2>Effects</h2>
    <p>Click fast. With <code>overlap: true</code> every click starts its own instance.</p>
    <div class="row">
      <button @click="getHub().play('laser', { overlap: true })">Laser</button>
      <button @click="getHub().play('explosion', { overlap: true })">Explosion</button>
    </div>
  </section>
</template>

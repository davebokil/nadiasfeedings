<script setup lang="ts">
defineEmits<{ signIn: [] }>()
</script>

<template>
  <div class="card signin">
    <div style="font-size:42px">🍼</div>
    <h2 style="font-size:18px;text-transform:none;letter-spacing:0;color:var(--ink)">Sign in to see the log</h2>
    <p>Use the Google account that's been added to the family list.</p>
    <button @click="$emit('signIn')">Sign in with Google</button>
  </div>
</template>

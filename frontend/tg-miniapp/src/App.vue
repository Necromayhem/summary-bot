<template>
  <div class="wrap">
    <div class="card">
      <AppHeader />

      <BannerMessage v-if="status" kind="status" :text="status" />
      <BannerMessage v-if="error" kind="error" :text="error" />

      <ChatList v-if="!hasChatSelected" :chats="chats" :loading="loading" @select="selectChat" />

      <DigestActions
        v-else
        :chat-id="chatId"
        :loading="loading"
        @digest="startDigest"
        @refresh="refreshLatest"
      />
    </div>

    <ResultCard :title="modeLabel(selectedMode)" :summary="summary" />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import BannerMessage from './components/BannerMessage.vue'
import ChatList from './components/ChatList.vue'
import DigestActions from './components/DigestActions.vue'
import ResultCard from './components/ResultCard.vue'

import { modeLabel, useDigestApp } from './composables/useDigestApp'

const {
  loading,
  error,
  status,
  chats,
  chatId,
  summary,
  selectedMode,
  hasChatSelected,
  selectChat,
  startDigest,
  refreshLatest,
} = useDigestApp()
</script>

<style scoped>
.wrap {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  padding: 14px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
}
</style>

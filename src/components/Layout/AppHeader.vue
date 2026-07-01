<template>
  <header class="site-header">
    <nav class="site-nav">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <img :src="getAssetUrl('assets/icons/gold_crayon.webp')" alt="Crayon" class="brand-icon" />
          <span class="brand-text">金蠟筆筆記本</span>
        </router-link>
      </div>

      <div class="nav-actions">
        <GoogleSyncButton />
        
        <button 
          class="icon-btn" 
          @click="toggleTheme" 
          :title="$t('nav.theme')"
          :aria-label="$t('nav.theme')"
        >
          <svg v-if="currentTheme === 'light'" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <LanguageSelector />
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import LanguageSelector from './LanguageSelector.vue'
import GoogleSyncButton from './GoogleSyncButton.vue'
import { getAssetUrl } from '@/utils/assets'

const themeStore = useThemeStore()
const currentTheme = computed(() => themeStore.currentTheme)

function toggleTheme() {
  themeStore.toggleTheme()
}
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
}

.site-nav {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.25rem;
  transition: opacity 0.2s;
}

.brand-link:hover {
  opacity: 0.9;
}

.brand-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .site-nav {
    padding: 0.75rem 1rem;
    gap: 1rem;
  }

  .brand-link {
    font-size: 1.1rem;
    gap: 0.5rem;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .site-nav {
    padding: 0.5rem 0.75rem;
  }

  .brand-link {
    font-size: 1rem;
  }
}
</style>

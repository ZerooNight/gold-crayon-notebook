<template>
  <div class="cell-header-container">
    <div class="cell-header">
      <div class="cell-title">
        <div class="cell-icon" :class="cellType">
          <img 
            :src="getAssetUrl(cellTypeData.icon)" 
            :alt="$t(`cellTypes.${cellType}`)"
            @error="handleImageError"
          />
        </div>
        <div>
          <h3>{{ $t(`cellTypes.${cellType}`) }}</h3>
          <span class="cell-total">{{ $t(`layers.${boardStore.currentLayer}`) }}</span>
        </div>
      </div>
      <div class="cell-stats">
        <div class="cell-count">{{ activated }} / {{ total }}</div>
        <div class="cell-sub">{{ $t('panel.activated') }}</div>
        <div class="cell-percentages">
          <span class="activation-rate">
            {{ $t('panel.activationRate') }} {{ activationRate }}%
          </span>
          <span class="bonus-percent">
            {{ $t('panel.totalBonus') }} +{{ totalBonusPercent }}%
          </span>
        </div>
      </div>
    </div>

    <!-- 自動移動到此處的統計數據列 -->
    <div class="cell-extra-stats">
      <div class="extra-item">
        <img :src="getIconUrl('gold_crayon')" alt="金蠟筆" class="extra-icon" />
        <span class="extra-label">{{ $t('footer.costPerCell') }}</span>
        <span class="extra-value">{{ costPerCell }}</span>
      </div>
      <div class="extra-item">
        <span class="extra-label">{{ $t('footer.bonusPerCell') }}</span>
        <span class="extra-value bonus">+{{ bonusPerCell }}%</span>
      </div>
      <div class="extra-item">
        <span class="extra-label">{{ $t('footer.totalBonus') }}</span>
        <span class="extra-value bonus">+{{ totalBonus.toFixed(1) }}%</span>
      </div>
      <div class="extra-item">
        <img :src="getIconUrl('gold_crayon')" alt="金蠟筆" class="extra-icon" />
        <span class="extra-label">{{ $t('footer.crayonsNeeded') }}</span>
        <span class="extra-value crayons">{{ crayonsNeeded }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBoardStore } from '@/stores/board'
import { getAssetUrl, getIconUrl } from '@/utils/assets'

const props = defineProps<{
  cellType: string
  activated: number
  total: number
}>()

const boardStore = useBoardStore()

const cellTypeData = computed(() => {
  const types: Record<string, { icon: string; color: string }> = {
    attack: { icon: 'assets/icons/board_atk.webp', color: '#ff6b6b' },
    crit: { icon: 'assets/icons/board_crit.webp', color: '#fab005' },
    hp: { icon: 'assets/icons/board_hp.webp', color: '#ff8787' },
    critResist: { icon: 'assets/icons/board_critResist.webp', color: '#74c0fc' },
    defense: { icon: 'assets/icons/board_def.webp', color: '#da77f2' }
  }
  return types[props.cellType] || { icon: '', color: '#666' }
})

// 激活率百分比
const activationRate = computed(() => {
  return props.total > 0
    ? ((props.activated / props.total) * 100).toFixed(1)
    : '0.0'
})

// 總加成百分比
const totalBonusPercent = computed(() => {
  const bonusPerCellVal = boardStore.boardData?.boardConfig[boardStore.currentLayer]?.bonusPerCell || 0
  return (props.activated * bonusPerCellVal).toFixed(1)
})

// 每格成本
const costMap: Record<string, number> = {
  layer1: 2,
  layer2: 4,
  layer3: 6
}
const costPerCell = computed(() => {
  return costMap[boardStore.currentLayer] || 2
})

// 每格加成
const bonusPerCell = computed(() => {
  const bonuses: Record<string, number> = {
    layer1: 3,
    layer2: 4,
    layer3: 5
  }
  return bonuses[boardStore.currentLayer] || 3
})

// 總加成
const totalBonus = computed(() => {
  return props.activated * bonusPerCell.value
})

// 所需金蠟筆
const crayonsNeeded = computed(() => {
  return (props.total - props.activated) * costPerCell.value
})

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}
</script>

<style scoped>
.cell-header-container {
  margin-bottom: 1rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--border-color);
}

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.cell-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cell-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-image: url('/assets/icons/board_base_3.webp');
  background-size: cover;
  background-position: center;
}

.cell-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.cell-title h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.cell-total {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.cell-stats {
  text-align: right;
}

.cell-count {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.cell-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.cell-percentages {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.activation-rate {
  color: var(--primary-color);
  font-weight: 600;
}

.bonus-percent {
  color: var(--success-color);
  font-weight: 600;
}

/* 額外統計數據列樣式 */
.cell-extra-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px dashed var(--border-color);
  flex-wrap: wrap;
}

.extra-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.extra-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.extra-label {
  font-weight: 500;
}

.extra-value {
  font-weight: 600;
  color: var(--text-primary);
}

.extra-value.bonus {
  color: var(--success-color);
}

.extra-value.crayons {
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .cell-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .cell-stats {
    text-align: left;
    width: 100%;
  }

  .cell-icon {
    width: 40px;
    height: 40px;
  }

  .cell-icon img {
    width: 28px;
    height: 28px;
  }

  .cell-title h3 {
    font-size: 1.125rem;
  }

  .cell-percentages {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.375rem;
  }

  .cell-extra-stats {
    gap: 1rem;
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }
  
  .extra-item {
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .cell-percentages {
    font-size: 0.8125rem;
    gap: 0.5rem;
  }

  .cell-extra-stats {
    gap: 0.75rem;
  }
}
</style>

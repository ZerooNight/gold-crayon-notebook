import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BoardProgressStorage } from '@/utils/storage'
import { Logger } from '@/utils/logger'
import { useCharactersStore } from './characters'

export interface Character {
  name: string
  en: string
  stars: number
  role: string
  personality: string
  race: string
  attackType: string
  deployRow: string
  boardTypes: {
    layer1?: string[]
    layer2?: string[]
    layer3?: string[]
  }
}

export interface BoardData {
  characterBoards: {
    [key: string]: {
      layer1?: string[]
      layer2?: string[]
      layer3?: string[]
    }
  }
  boardConfig: {
    [key: string]: {
      name: string
      bonusPerCell: number
      background: string | null
    }
  }
  cellTypes: {
    [key: string]: {
      name: string
      color: string
      icon: string
      costPerLayer?: {
        [key: string]: number
      }
    }
  }
  personalities: {
    [key: string]: {
      icon: string
    }
  }
  races: string[]
  attackTypes: {
    [key: string]: {
      icon: string
    }
  }
  deployRows: {
    [key: string]: {
      icon: string
    }
  }
  roles: string[]
}

export interface UserProgress {
  ownedCharacters: Set<string>
  activatedCells: Record<string, boolean>
}

export const useBoardStore = defineStore('board', () => {
  const charactersStore = useCharactersStore()
  
  const boardData = ref<BoardData | null>(null)
  const userProgress = ref<UserProgress>({
    ownedCharacters: new Set(),
    activatedCells: {}
  })

  const currentLayer = ref<'layer1' | 'layer2' | 'layer3'>('layer1')
  const currentCellType = ref<string>('attack')

  // 載入遊戲數據
  async function loadGameData() {
    try {
      // 確保角色數據已載入
      await charactersStore.loadCharacters()
      
      const baseUrl = import.meta.env.BASE_URL
      const response = await fetch(`${baseUrl}board/data.json`)
      if (!response.ok) throw new Error('Failed to load board data')
      const data = await response.json()
      
      // 載入本地儲存的自定義著色板
      try {
        const localCustomBoards = localStorage.getItem('custom_character_boards')
        if (localCustomBoards) {
          const customBoards = JSON.parse(localCustomBoards)
          Object.entries(customBoards).forEach(([name, board]) => {
            if (!data.characterBoards) data.characterBoards = {}
            data.characterBoards[name] = board as any
          })
        }
      } catch (e) {
        Logger.error('載入本地自定義著色板資料失敗:', e)
      }

      // 載入已刪除的角色名單，並在 characterBoards 中過濾掉
      try {
        const localDeleted = localStorage.getItem('deleted_characters')
        if (localDeleted) {
          const deletedList: string[] = JSON.parse(localDeleted)
          deletedList.forEach(name => {
            if (data.characterBoards) {
              delete data.characterBoards[name]
            }
          })
        }
      } catch (e) {
        Logger.error('載入已刪除角色名單失敗:', e)
      }

      // 正規化資源路徑
      normalizeAssetPaths(data)
      boardData.value = data
    } catch (error) {
      Logger.error('載入遊戲數據失敗:', error)
      throw error
    }
  }

  // 儲存自定義著色板
  function saveCharacterBoard(name: string, boardTypes: { layer1?: string[]; layer2?: string[]; layer3?: string[] }) {
    if (!boardData.value) return
    
    if (!boardData.value.characterBoards) {
      boardData.value.characterBoards = {}
    }
    
    boardData.value.characterBoards[name] = boardTypes

    // 儲存至 localStorage
    try {
      const localCustomBoards = localStorage.getItem('custom_character_boards')
      const customBoards = localCustomBoards ? JSON.parse(localCustomBoards) : {}
      customBoards[name] = boardTypes
      localStorage.setItem('custom_character_boards', JSON.stringify(customBoards))
    } catch (e) {
      Logger.error('儲存自定義著色板失敗:', e)
    }
  }

  // 刪除自定義著色板
  function deleteCharacterBoard(name: string) {
    if (!boardData.value || !boardData.value.characterBoards) return
    
    delete boardData.value.characterBoards[name]

    try {
      const localCustomBoards = localStorage.getItem('custom_character_boards')
      if (localCustomBoards) {
        const customBoards = JSON.parse(localCustomBoards)
        delete customBoards[name]
        localStorage.setItem('custom_character_boards', JSON.stringify(customBoards))
      }
    } catch (e) {
      Logger.error('刪除自定義著色板失敗:', e)
    }
  }

  // 重置著色板數據
  async function resetBoards() {
    localStorage.removeItem('custom_character_boards')
    boardData.value = null
    await loadGameData()
  }

  // 正規化資源路徑
  function normalizeAssetPaths(data: BoardData) {
    const fix = (p: string | null | undefined): string | null => {
      if (!p || typeof p !== 'string') return p || null
      if (p.startsWith('/assets/')) return p
      if (p.startsWith('../assets/')) return p.replace(/^\.\.\//, '/')
      if (p.startsWith('assets/')) return '/' + p
      return p
    }

    if (data.boardConfig) {
      Object.values(data.boardConfig).forEach(cfg => {
        if (cfg && cfg.background) cfg.background = fix(cfg.background)
      })
    }
    if (data.cellTypes) {
      Object.values(data.cellTypes).forEach(ct => {
        if (ct && ct.icon) ct.icon = fix(ct.icon) || ''
      })
    }
    if (data.personalities) {
      Object.values(data.personalities).forEach(p => {
        if (p && p.icon) p.icon = fix(p.icon) || ''
      })
    }
    if (data.attackTypes) {
      Object.values(data.attackTypes).forEach(a => {
        if (a && a.icon) a.icon = fix(a.icon) || ''
      })
    }
    if (data.deployRows) {
      Object.values(data.deployRows).forEach(d => {
        if (d && d.icon) d.icon = fix(d.icon) || ''
      })
    }
  }

  // 合併角色資訊和格子數據
  const characters = computed(() => {
    if (!boardData.value || !charactersStore.isLoaded) return []

    const result: Character[] = []
    
    for (const [name, boardTypes] of Object.entries(boardData.value.characterBoards)) {
      const charInfo = charactersStore.getCharacter(name)
      if (charInfo) {
        result.push({
          ...charInfo,
          boardTypes
        })
      }
    }

    return result
  })

  // 載入用戶進度
  function loadUserProgress() {
    const saved = BoardProgressStorage.get()
    if (saved) {
      try {
        userProgress.value = {
          ownedCharacters: new Set(saved.ownedCharacters || []),
          activatedCells: saved.activatedCells || {}
        }
      } catch (error) {
        Logger.error('載入用戶進度失敗:', error)
      }
    }
  }

  // 保存用戶進度
  function saveUserProgress() {
    const data = {
      ownedCharacters: Array.from(userProgress.value.ownedCharacters),
      activatedCells: userProgress.value.activatedCells
    }
    BoardProgressStorage.set(data)
  }

  // 切換角色擁有狀態
  function toggleCharacterOwnership(characterName: string) {
    if (userProgress.value.ownedCharacters.has(characterName)) {
      userProgress.value.ownedCharacters.delete(characterName)
      // 移除所有相關的啟動格子
      Object.keys(userProgress.value.activatedCells).forEach(key => {
        if (key.startsWith(characterName + '_')) {
          delete userProgress.value.activatedCells[key]
        }
      })
    } else {
      userProgress.value.ownedCharacters.add(characterName)
    }
    saveUserProgress()
  }

  // 切換格子啟動狀態
  function toggleCellActivation(character: Character, cellType: string) {
    const cellKey = `${character.name}_${currentLayer.value}_${cellType}`
    const isOwned = userProgress.value.ownedCharacters.has(character.name)

    if (!isOwned) {
      userProgress.value.ownedCharacters.add(character.name)
    } else if (!userProgress.value.activatedCells[cellKey]) {
      userProgress.value.activatedCells[cellKey] = true
    } else {
      userProgress.value.activatedCells[cellKey] = false
    }
    
    saveUserProgress()
  }

  // 重置所有進度
  function resetAllProgress() {
    userProgress.value = {
      ownedCharacters: new Set(),
      activatedCells: {}
    }
    saveUserProgress()
  }

  // 全選所有角色
  function selectAllCharacters() {
    characters.value.forEach(char => {
      userProgress.value.ownedCharacters.add(char.name)
    })
    saveUserProgress()
  }

  // 計算統計數據
  const stats = computed(() => {
    if (characters.value.length === 0) return null

    const totalCharacters = characters.value.length
    const ownedCharacters = userProgress.value.ownedCharacters.size
    const ownedRate = totalCharacters ? Math.round((ownedCharacters / totalCharacters) * 100) : 0

    const activatedCells = Object.values(userProgress.value.activatedCells).filter(Boolean).length
    const totalCells = characters.value.reduce((sum, char) => {
      const boards = char.boardTypes || {}
      return sum + Object.values(boards).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
    }, 0)
    const activationRate = totalCells ? Math.round((activatedCells / totalCells) * 100) : 0

    return {
      totalCharacters,
      ownedCharacters,
      ownedRate,
      activatedCells,
      totalCells,
      activationRate
    }
  })

  return {
    boardData,
    characters,
    userProgress,
    currentLayer,
    currentCellType,
    stats,
    loadGameData,
    loadUserProgress,
    saveUserProgress,
    toggleCharacterOwnership,
    toggleCellActivation,
    resetAllProgress,
    selectAllCharacters,
    saveCharacterBoard,
    deleteCharacterBoard,
    resetBoards
  }
})

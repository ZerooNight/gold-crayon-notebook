import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Logger } from '@/utils/logger'

export interface CharacterInfo {
  name: string
  en: string
  personality: string
  stars: number
  attackType: string
  deployRow: string
  role: string
  race: string
}

export interface CharactersData {
  [key: string]: CharacterInfo
}

export const useCharactersStore = defineStore('characters', () => {
  const charactersData = ref<CharactersData>({})
  const isLoaded = ref(false)
  
  // 自定義角色與已刪除角色的本地快取
  const customCharacters = ref<CharactersData>({})
  const deletedCharacters = ref<string[]>([])

  // 載入角色數據
  async function loadCharacters() {
    if (isLoaded.value) return

    try {
      // 1. 載入預設角色數據
      const baseUrl = import.meta.env.BASE_URL
      const response = await fetch(`${baseUrl}shared/characters.json`)
      if (!response.ok) throw new Error('Failed to load characters data')
      const defaultData = await response.json()

      // 2. 載入本地儲存的自定義角色與已刪除角色
      try {
        const localCustom = localStorage.getItem('custom_characters')
        if (localCustom) {
          customCharacters.value = JSON.parse(localCustom)
        }
        
        const localDeleted = localStorage.getItem('deleted_characters')
        if (localDeleted) {
          deletedCharacters.value = JSON.parse(localDeleted)
        }
      } catch (e) {
        Logger.error('載入本地自定義角色資料失敗，使用預設值:', e)
      }

      // 3. 合併數據：先套用預設值，過濾已刪除，再覆蓋自定義
      const merged: CharactersData = { ...defaultData }
      
      deletedCharacters.value.forEach(name => {
        delete merged[name]
      })

      Object.entries(customCharacters.value).forEach(([name, char]) => {
        merged[name] = char
      })

      charactersData.value = merged
      isLoaded.value = true
    } catch (error) {
      Logger.error('載入角色數據失敗:', error)
      throw error
    }
  }

  // 儲存/新增角色
  function saveCharacter(char: CharacterInfo) {
    // 確保已被移出刪除名單
    deletedCharacters.value = deletedCharacters.value.filter(n => n !== char.name)
    localStorage.setItem('deleted_characters', JSON.stringify(deletedCharacters.value))

    // 寫入自定義列表
    customCharacters.value[char.name] = char
    localStorage.setItem('custom_characters', JSON.stringify(customCharacters.value))

    // 更新當前執行期狀態
    charactersData.value[char.name] = char
  }

  // 刪除角色
  function deleteCharacter(name: string) {
    // 移出自定義列表
    delete customCharacters.value[name]
    localStorage.setItem('custom_characters', JSON.stringify(customCharacters.value))

    // 加入刪除名單
    if (!deletedCharacters.value.includes(name)) {
      deletedCharacters.value.push(name)
      localStorage.setItem('deleted_characters', JSON.stringify(deletedCharacters.value))
    }

    // 從當前狀態移除
    delete charactersData.value[name]
  }

  // 重置為預設
  async function resetCharacters() {
    customCharacters.value = {}
    deletedCharacters.value = []
    localStorage.removeItem('custom_characters')
    localStorage.removeItem('deleted_characters')
    isLoaded.value = false
    await loadCharacters()
  }

  // 根據中文名稱獲取角色資訊
  function getCharacter(name: string): CharacterInfo | undefined {
    return charactersData.value[name]
  }

  // 獲取所有角色（以陣列形式）
  function getAllCharacters(): CharacterInfo[] {
    return Object.values(charactersData.value)
  }

  // 根據中文名稱查找角色
  function findByName(name: string): CharacterInfo | undefined {
    return Object.values(charactersData.value).find(char => char.name === name)
  }

  return {
    charactersData,
    isLoaded,
    loadCharacters,
    getCharacter,
    getAllCharacters,
    findByName,
    saveCharacter,
    deleteCharacter,
    resetCharacters,
    customCharacters,
    deletedCharacters
  }
})


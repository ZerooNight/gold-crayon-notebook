/**
 * 獲取資源的完整 URL
 * 自動添加 base path (例如 GitHub Pages 的 /trickcal/)
 */
export function getAssetUrl(path: string): string {
  // 移除開頭的 / (如果有)
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // 使用 Vite 的 BASE_URL 環境變量
  const baseUrl = import.meta.env.BASE_URL
  
  // 組合完整路徑
  return `${baseUrl}${cleanPath}`
}

/**
 * 獲取角色圖片 URL
 * 優先使用本地儲存的自定義頭像，其次使用預設的 WebP 格式
 */
export function getCharacterImageUrl(characterName: string): string {
  try {
    const customAvatars = localStorage.getItem('custom_character_avatars')
    if (customAvatars) {
      const parsed = JSON.parse(customAvatars)
      if (parsed[characterName]) {
        return parsed[characterName]
      }
    }
  } catch (e) {
    // 忽略錯誤
  }
  return getAssetUrl(`assets/characters/${characterName}.webp`)
}

/**
 * 獲取裝備/素材圖片 URL
 * 優先使用 WebP 格式（節省 80% 文件大小）
 */
export function getGearImageUrl(gearName: string): string {
  return getAssetUrl(`assets/gears/${gearName}.webp`)
}

/**
 * 獲取圖標 URL
 * 優先使用 WebP 格式（節省 70% 文件大小）
 */
export function getIconUrl(iconName: string): string {
  return getAssetUrl(`assets/icons/${iconName}.webp`)
}


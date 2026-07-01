const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 映射設定
const personalityMap = {
  '冷静': '冷靜',
  '狂気': '狂亂',
  '純粋': '天真',
  '活発': '活潑',
  '憂鬱': '憂鬱'
};

const raceMap = {
  'エルフ': '精靈',
  '妖精': '妖精',
  '獣人': '獸人',
  '幽霊': '幽靈',
  '魔女': '魔女',
  '精霊': '魔靈',
  '竜族': '龍族'
};

const tileTypeMap = {
  '攻撃': 'attack',
  '会心': 'crit',
  'HP': 'hp',
  '抵抗': 'critResist',
  '防御': 'defense'
};

async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // 使用 sharp 將 PNG 轉換成 WebP 並寫入
  await sharp(buffer)
    .webp({ quality: 90 })
    .toFile(destPath);
}

async function main() {
  const url = 'https://trickcal-strategy.pages.dev/board/manager';
  console.log(`正在從 ${url} 獲取角色資料...`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const html = await res.text();
    
    // 匹配 characters 變量
    const match = html.match(/const\s+characters\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!match) {
      throw new Error('無法在網頁中找到 characters 變量');
    }
    
    const extCharacters = JSON.parse(match[1]);
    console.log(`獲取成功，共找到 ${extCharacters.length} 位使徒。`);
    
    // 讀取本地資料庫
    const charPath = path.join(__dirname, '../public/shared/characters.json');
    const boardPath = path.join(__dirname, '../public/board/data.json');
    
    const chars = JSON.parse(fs.readFileSync(charPath, 'utf8'));
    const boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    
    let addedCount = 0;
    
    for (const extChar of extCharacters) {
      const cnName = extChar.cn_name;
      
      // 比對是否缺失
      if (!chars[cnName]) {
        console.log(`發現新角色: ${cnName} (${extChar.名前})`);
        
        // 1. 轉換基本資料
        const personality = personalityMap[extChar.性格] || '天真';
        const race = raceMap[extChar.種族] || '???';
        
        // 啟發式判定攻擊類型 (魔女/幽靈/妖精 預設為魔法，其他預設為物理)
        const attackType = ['魔女', '幽靈', '妖精'].includes(race) ? '魔法' : '物理';
        
        const newChar = {
          name: cnName,
          en: extChar.名前, // 預設英文名為日文名，用戶可在前台編輯修改
          personality: personality,
          stars: 3,
          attackType: attackType,
          deployRow: '中排',
          role: '輸出',
          race: race
        };
        
        // 2. 轉換著色板配置
        const layer1 = [];
        const layer2 = [];
        const layer3 = [];
        
        if (extChar.tiles) {
          for (const tile of extChar.tiles) {
            const type = tileTypeMap[tile.type];
            if (type) {
              if (tile.board === 1 && !layer1.includes(type)) layer1.push(type);
              if (tile.board === 2 && !layer2.includes(type)) layer2.push(type);
              if (tile.board === 3 && !layer3.includes(type)) layer3.push(type);
            }
          }
        }
        
        const newBoard = { layer1, layer2, layer3 };
        
        // 3. 下載並轉換頭像
        const imgUrl = `https://trickcal-strategy.pages.dev/assets/icons/${encodeURIComponent(extChar.名前)}.png`;
        const destImgPath = path.join(__dirname, `../public/assets/characters/${cnName}.webp`);
        
        try {
          console.log(`下載頭像中: ${imgUrl}`);
          await downloadImage(imgUrl, destImgPath);
          console.log(`頭像下載完成並轉換為 WebP: ${destImgPath}`);
        } catch (err) {
          console.error(`下載 ${cnName} 頭像失敗:`, err.message);
          // 如果頭像下載失敗，仍然新增角色，由使用者手動補齊頭像
        }
        
        // 4. 寫入資料庫
        chars[cnName] = newChar;
        boardData.characterBoards[cnName] = newBoard;
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      fs.writeFileSync(charPath, JSON.stringify(chars, null, 2), 'utf8');
      fs.writeFileSync(boardPath, JSON.stringify(boardData, null, 2), 'utf8');
      console.log(`資料庫同步成功！共新增 ${addedCount} 個角色。`);
    } else {
      console.log('沒有發現新角色，資料庫已是最新狀態。');
    }
    
  } catch (error) {
    console.error('同步過程中發生錯誤:', error);
    process.exit(1);
  }
}

main();

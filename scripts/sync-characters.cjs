const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Personality translation mapping
const personalityMap = {
  '冷静': '冷靜',
  '狂気': '狂亂',
  '純粋': '天真',
  '活発': '活潑',
  '憂鬱': '憂鬱'
};

// Race translation mapping
const raceMap = {
  'エルフ': '精靈',
  '妖精': '妖精',
  '獣人': '獸人',
  '幽霊': '幽靈',
  '魔女': '魔女',
  '精霊': '魔靈',
  '竜族': '龍族'
};

// Board cell type mapping
const tileTypeMap = {
  '攻撃': 'attack',
  '会心': 'crit',
  'HP': 'hp',
  '抵抗': 'critResist',
  '防御': 'defense'
};

// Utility to download image and convert to WebP
async function downloadAndConvertImage(url, destPath) {
  // Force delete existing file first to avoid Windows case-insensitivity overwrite issues
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath);
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await sharp(buffer)
    .webp({ quality: 90 })
    .toFile(destPath);
}

// Convert tiles list from strategy site format to layer lists
function convertTilesToBoard(tiles) {
  const layer1 = [];
  const layer2 = [];
  const layer3 = [];
  
  if (tiles) {
    for (const tile of tiles) {
      const type = tileTypeMap[tile.type];
      if (type) {
        if (tile.board === 1 && !layer1.includes(type)) layer1.push(type);
        if (tile.board === 2 && !layer2.includes(type)) layer2.push(type);
        if (tile.board === 3 && !layer3.includes(type)) layer3.push(type);
      }
    }
  }
  return { layer1, layer2, layer3 };
}

async function main() {
  const strategyUrl = 'https://trickcal-strategy.pages.dev/board/manager';
  const lootUrl = 'https://lootandwaifus.com/trickcal-chibi-go-characters/';
  
  console.log(`Fetching active characters list from: ${strategyUrl}`);
  
  try {
    // 1. Fetch Japanese Strategy Board site
    const strategyRes = await fetch(strategyUrl);
    if (!strategyRes.ok) throw new Error(`HTTP error fetching strategy site: ${strategyRes.status}`);
    const strategyHtml = await strategyRes.text();
    
    const strategyMatch = strategyHtml.match(/const\s+characters\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!strategyMatch) throw new Error('Could not find characters variable in strategy site HTML');
    const extCharacters = JSON.parse(strategyMatch[1]);
    console.log(`Successfully fetched ${extCharacters.length} characters from strategy site.`);
    
    // 2. Fetch Loot & Waifus site for image and name mappings
    let lootList = [];
    try {
      console.log(`Fetching English chibis list from: ${lootUrl}`);
      const lootRes = await fetch(lootUrl);
      if (lootRes.ok) {
        const lootHtml = await lootRes.text();
        const regex = /data-character-name="([^"]+)"[^>]*>[\s\S]*?src="([^"]+)"/g;
        let match;
        while ((match = regex.exec(lootHtml)) !== null) {
          lootList.push({
            enName: match[1].trim(),
            imgRelativeUrl: match[2].trim()
          });
        }
        console.log(`Successfully fetched ${lootList.length} chibis from English strategy site.`);
      } else {
        console.warn(`Loot and Waifus returned status ${lootRes.status}, skipping English sync fallback`);
      }
    } catch (err) {
      console.warn(`Failed to fetch English chibis list, skipping English sync fallback:`, err.message);
    }
    
    // 3. Load local database files
    const charPath = path.join(__dirname, '../public/shared/characters.json');
    const boardPath = path.join(__dirname, '../public/board/data.json');
    
    const chars = JSON.parse(fs.readFileSync(charPath, 'utf8'));
    const boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    
    // Build set of active Chinese names
    const activeCnNames = new Set(extCharacters.map(c => c.cn_name));
    
    // Clean up characters and boards that are no longer active on the strategy site
    let cleanedCount = 0;
    for (const cnName of Object.keys(chars)) {
      if (!activeCnNames.has(cnName)) {
        delete chars[cnName];
        delete boardData.characterBoards[cnName];
        cleanedCount++;
      }
    }
    for (const cnName of Object.keys(boardData.characterBoards)) {
      if (!activeCnNames.has(cnName)) {
        delete boardData.characterBoards[cnName];
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} inactive/variant characters from database.`);
    }
    
    let addedCount = 0;
    let activatedCount = 0;
    
    for (const extChar of extCharacters) {
      const cnName = extChar.cn_name;
      const newBoard = convertTilesToBoard(extChar.tiles);
      
      // Check if character already exists in characters database
      if (chars[cnName]) {
        // Always ensure board configuration is updated/active
        const oldBoardStr = JSON.stringify(boardData.characterBoards[cnName]);
        const newBoardStr = JSON.stringify(newBoard);
        if (oldBoardStr !== newBoardStr) {
          boardData.characterBoards[cnName] = newBoard;
          activatedCount++;
        }
      } else {
        // Character is completely new! Let's add them
        console.log(`New character detected: ${cnName} (${extChar.名前})`);
        
        const personality = personalityMap[extChar.性格] || '天真';
        const race = raceMap[extChar.種族] || '???';
        const attackType = ['魔女', '幽靈', '妖精'].includes(race) ? '魔法' : '物理';
        
        // Search if we have a match in the English chibis list
        const matchedLoot = lootList.find(x => x.enName.toLowerCase() === extChar.名前.toLowerCase() || x.enName.toLowerCase().replace(/[^a-z0-9]/g, '') === extChar.名前.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        let enName = extChar.名前;
        let imageName = cnName;
        let downloaded = false;
        
        const destDir = path.join(__dirname, '../public/assets/characters');
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        if (matchedLoot) {
          enName = matchedLoot.enName;
          imageName = matchedLoot.enName.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        
        // Primary download: download from Japanese strategy site for 100% correct, unswapped portraits
        const imgUrl = `https://trickcal-strategy.pages.dev/assets/icons/${encodeURIComponent(extChar.名前)}.png`;
        const destImgPath = path.join(destDir, `${imageName.toLowerCase()}.webp`);
        try {
          console.log(`Downloading portrait from Japanese strategy site: ${imgUrl}`);
          await downloadAndConvertImage(imgUrl, destImgPath);
        } catch (err) {
          console.error(`Failed to download portrait for ${cnName}:`, err.message);
        }
        
        // Save new character in database
        chars[cnName] = {
          name: cnName,
          en: enName,
          image: imageName.toLowerCase(),
          personality: personality,
          stars: 3,
          attackType: attackType,
          deployRow: '中排',
          role: '輸出',
          race: race,
          zh_tw: cnName,
          zh_cn: cnName // basic simplified placeholder
        };
        
        boardData.characterBoards[cnName] = newBoard;
        addedCount++;
      }
    }
    
    // Write changes back to database files if there are updates or cleanups
    if (addedCount > 0 || activatedCount > 0 || cleanedCount > 0) {
      fs.writeFileSync(charPath, JSON.stringify(chars, null, 2), 'utf8');
      fs.writeFileSync(boardPath, JSON.stringify(boardData, null, 2), 'utf8');
      console.log(`Sync completed successfully! Added ${addedCount} new characters, updated ${activatedCount} characters, cleaned up ${cleanedCount} inactive ones.`);
    } else {
      console.log('No updates found, local database is up to date.');
    }
    
  } catch (error) {
    console.error('An error occurred during character synchronization:', error);
    process.exit(1);
  }
}

main();

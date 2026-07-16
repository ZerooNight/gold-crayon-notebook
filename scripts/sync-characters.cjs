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

const nameOverrides = {
  'イド': 'ed',
  'レイジー': 'layze',
  'ベル': 'veroo',
  'リッツ': 'leets',
  'リニュア': 'renewa',
  'ルポ': 'rufo',
  'パトラ': 'patula',
  'ミンス': 'mynx',
  'ブランセ': 'blanchet',
  'ダーヤ': 'daya',
  'ティグ': 'tig'
};

function katakanaToRomaji(text) {
  const map = {
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'o', 'ン': 'n',
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    'パ': 'pa', 'ピ': 'pi', 'プ': 'po', 'ペ': 'pe', 'ポ': 'po',
    'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o',
    'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo',
    'ッ': 'tsu'
  };

  let res = '';
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    let nextChar = text[i + 1] || '';
    
    if (nextChar === 'ャ' || nextChar === 'ュ' || nextChar === 'ョ' || nextChar === 'ィ' || nextChar === 'ェ') {
      const romajiBase = map[char] || '';
      const romajiSmall = map[nextChar] || '';
      if (romajiBase.endsWith('i') && romajiSmall.startsWith('y')) {
        res += romajiBase.slice(0, -1) + romajiSmall.slice(1);
      } else {
        res += romajiBase + romajiSmall;
      }
      i += 2;
      continue;
    }
    
    if (char === 'ー') {
      if (res.length > 0) {
        res += res[res.length - 1];
      }
      i++;
      continue;
    }
    
    res += map[char] || char;
    i++;
  }
  return res.toLowerCase();
}

function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

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

async function ensurePortraitDownloaded(extChar, enName, imageName, lootList) {
  const destDir = path.join(__dirname, '../public/assets/characters');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const destImgPath = path.join(destDir, `${imageName.toLowerCase()}.webp`);
  if (fs.existsSync(destImgPath)) {
    return { downloaded: true, enName, imageName };
  }
  
  // Search if we have a match in the English chibis list
  let matchedLoot = null;
  
  // 1. Check if we have a hardcoded name override
  const overrideEn = nameOverrides[extChar.名前];
  if (overrideEn) {
    matchedLoot = lootList.find(x => 
      x.enName.toLowerCase().replace(/[^a-z0-9]/g, '') === overrideEn.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
  }
  
  // 2. If not found in override, find using Levenshtein distance on romanized Katakana
  if (!matchedLoot) {
    const romanizedJa = katakanaToRomaji(extChar.名前);
    let bestItem = null;
    let minDistance = Infinity;
    
    for (const item of lootList) {
      const cleanEn = item.enName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dist = getEditDistance(romanizedJa, cleanEn);
      if (dist < minDistance) {
        minDistance = dist;
        bestItem = item;
      }
    }
    
    // Only accept the match if edit distance is low (e.g., <= 3)
    if (minDistance <= 3) {
      matchedLoot = bestItem;
    }
  }
  
  let downloaded = false;
  let finalImageName = imageName;
  let finalEnName = enName;
  
  if (matchedLoot) {
    finalEnName = matchedLoot.enName;
    finalImageName = matchedLoot.enName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const imgUrl = 'https://lootandwaifus.com/characters/trickcal/' + finalImageName + '.webp';
    const finalDestImgPath = path.join(destDir, `${finalImageName}.webp`);
    
    try {
      console.log(`Downloading chibi portrait from lootandwaifus: ${imgUrl}`);
      await downloadAndConvertImage(imgUrl, finalDestImgPath);
      downloaded = true;
    } catch (err) {
      console.error(`Failed to download chibi from lootandwaifus:`, err.message);
    }
  }
  
  // Fallback: download from strategy site if English download failed or was not matched
  if (!downloaded) {
    const imgUrl = `https://trickcal-strategy.pages.dev/assets/icons/${encodeURIComponent(extChar.名前)}.png`;
    const finalDestImgPath = path.join(destDir, `${finalImageName.toLowerCase()}.webp`);
    try {
      console.log(`Fallback: Downloading portrait from Japanese strategy site: ${imgUrl}`);
      await downloadAndConvertImage(imgUrl, finalDestImgPath);
      downloaded = true;
    } catch (err) {
      console.error(`Failed to download fallback portrait for ${extChar.cn_name}:`, err.message);
    }
  }
  
  return { downloaded, enName: finalEnName, imageName: finalImageName };
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
        
        // Ensure image file is present locally
        const existingChar = chars[cnName];
        await ensurePortraitDownloaded(extChar, existingChar.en, existingChar.image, lootList);
      } else {
        // Character is completely new! Let's add them
        console.log(`New character detected: ${cnName} (${extChar.名前})`);
        
        const personality = personalityMap[extChar.性格] || '天真';
        const race = raceMap[extChar.種族] || '???';
        const attackType = ['魔女', '幽靈', '妖精'].includes(race) ? '魔法' : '物理';
        
        // Download portrait and get correct English/image names
        const res = await ensurePortraitDownloaded(extChar, extChar.名前, cnName, lootList);
        
        // Save new character in database
        chars[cnName] = {
          name: cnName,
          en: res.enName,
          image: res.imageName.toLowerCase(),
          ja: extChar.名前,
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

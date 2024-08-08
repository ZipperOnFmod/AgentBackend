import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express.Router();

const VERSION_DATE = new Date('2019-09-25');
const EXCLUDED_TAGS = [
  'Cosmetics.Source.Season10.BattlePass.Paid',
  'Cosmetics.Source.Season10.BattlePass.Free',
  'Cosmetics.Set.KpopFashion',
  'Cosmetics.Set.Celestial'
];

async function fetchRandomCosmetics() {
  try {
    const response = await axios.get('https://fortnite-api.com/v2/cosmetics/br');
    if (response.status === 200 && response.data.data) {
      return response.data.data.filter(item => {
        const addedDate = new Date(item.added);
        const hasExcludedTag = item.gameplayTags && item.gameplayTags.some(tag => EXCLUDED_TAGS.includes(tag));

        return (
          addedDate < VERSION_DATE &&
          !hasExcludedTag
        );
      });
    } else {
      console.error('Error fetching Fortnite cosmetics data');
      return [];
    }
  } catch (error) {
    console.error('Error fetching Fortnite cosmetics:', error);
    return [];
  }
}

const RaritiesMap = {
  "Star Wars Series": {
    AthenaCharacter: 5000,
    AthenaBackpack: 2000,
    AthenaPickaxe: 1500,
    AthenaDance: 1500,
  },
  "Shadow Series": {
    AthenaCharacter: 5000,
    AthenaBackpack: 2000,
    AthenaPickaxe: 1500,
    AthenaDance: 1500,
  },
  "Icon Series": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "DC SERIES": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "MARVEL SERIES": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "Lava SERIES": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "Frozen Series": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "DARK SERIES": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 500,
    AthenaItemWrap: 800,
  },
  "Legendary": {
    AthenaCharacter: 2000,
    AthenaBackpack: 1500,
    AthenaPickaxe: 1500,
    AthenaGlider: 1800,
    AthenaDance: 800,
    AthenaItemWrap: 800,
  },
  "Epic": {
    AthenaCharacter: 1500,
    AthenaBackpack: 1200,
    AthenaPickaxe: 1200,
    AthenaGlider: 1500,
    AthenaDance: 800,
    AthenaItemWrap: 800,
  },
  "Rare": {
    AthenaCharacter: 1200,
    AthenaBackpack: 800,
    AthenaPickaxe: 800,
    AthenaGlider: 800,
    AthenaDance: 500,
    AthenaItemWrap: 600,
  },
  "Uncommon": {
    AthenaCharacter: 800,
    AthenaBackpack: 200,
    AthenaPickaxe: 500,
    AthenaGlider: 500,
    AthenaDance: 200,
    AthenaItemWrap: 300,
  },
  "Common": {
    AthenaCharacter: 500,
    AthenaBackpack: 200,
    AthenaPickaxe: 500,
    AthenaGlider: 500,
    AthenaDance: 200,
    AthenaItemWrap: 300,
  },
};

function getItemValue(rarity, itemType) {
  const rarityValues = RaritiesMap[rarity];
  if (rarityValues && rarityValues[itemType]) {
    return rarityValues[itemType];
  } else {
    return "999999";
  }
}

async function readCatalogFile() {
  const catalogPath = path.join(__dirname, '../../responses/catalog.json');
  try {
    const data = await fs.readFile(catalogPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading catalog file:', error);
    throw error;
  }
}

async function writeCatalogFile(catalogData) {
  const catalogPath = path.join(__dirname, '../../responses/catalog.json');
  try {
    await fs.writeFile(catalogPath, JSON.stringify(catalogData, null, 2));
  } catch (error) {
    console.error('Error writing catalog file:', error);
    throw error;
  }
}

function getRandomSetItems(setItems, count) {
  const validSets = Object.values(setItems).filter(items => {
    return items && items.skins && items.skins.length >= 1 &&
           items.pickaxes && items.pickaxes.length >= 1;
  });

  if (validSets.length < count) {
    return [];
  }

  let selectedSets = [];
  while (selectedSets.length < count) {
    const randomSet = validSets[Math.floor(Math.random() * validSets.length)];
    if (!selectedSets.includes(randomSet)) {
      selectedSets.push(randomSet);
    }
  }

  return selectedSets;
}

app.post("/rotateshop/", async (req, res) => {
  try {
    const allCosmetics = await fetchRandomCosmetics();

    const itemTypeMap = {
      emotes: [],
      pickaxes: [],
      wraps: [],
      skins: [],
      gliders: [],
      bundles: {}
    };

    allCosmetics.forEach(itemData => {
      if (!itemData.rarity || !itemData.type) return;
    
      const rarity = itemData.rarity.displayValue;
      const type = itemData.type.backendValue;
      const bundleTags = itemData.gameplayTags ? itemData.gameplayTags.filter(tag => tag.startsWith('Cosmetics.Set.')) : [];
    
      if (rarity === "Rare" || rarity === "Uncommon") {
        if (type.includes('AthenaCharacter') || type === 'AthenaCharacter') {
          itemTypeMap.skins.push(itemData);
        }
      }
    
      if (rarity === "Rare" || rarity === "Epic" || rarity === "Legendary" || rarity === "Uncommon") {
        if (type.includes('AthenaDance')) itemTypeMap.emotes.push(itemData);
        if (type.includes('AthenaPickaxe')) itemTypeMap.pickaxes.push(itemData);
        if (type.includes('AthenaItemWrap')) itemTypeMap.wraps.push(itemData);
        if (type.includes('AthenaGlider')) itemTypeMap.gliders.push(itemData);
      }
    
      if (bundleTags.length > 0 && (rarity === "Rare" || rarity === "Epic" || rarity === "Legendary") && (type.includes('AthenaCharacter') || type === 'AthenaCharacter')) {
        bundleTags.forEach(bundleTag => {
          if (!itemTypeMap.bundles[bundleTag]) {
            itemTypeMap.bundles[bundleTag] = [];
          }
          itemTypeMap.bundles[bundleTag].push(itemData);
        });
      }
    });

    if (
      itemTypeMap.emotes.length < 2 ||
      itemTypeMap.pickaxes.length < 1 ||
      itemTypeMap.wraps.length < 1 ||
      itemTypeMap.skins.length < 1 ||
      itemTypeMap.gliders.length < 1
    ) {
      throw new Error('Not enough items to rotate daily shop');
    }

    const selectItems = (itemsArray, count) => {
      let selectedItems = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * itemsArray.length);
        selectedItems.push(itemsArray.splice(randomIndex, 1)[0]);
      }
      return selectedItems;
    };

    const selectedEmotes = selectItems(itemTypeMap.emotes, 2);
    const selectedPickaxe = selectItems(itemTypeMap.pickaxes, 1)[0];
    const selectedWrap = selectItems(itemTypeMap.wraps, 1)[0];
    const selectedSkin = selectItems(itemTypeMap.skins, 1)[0];
    const selectedGlider = selectItems(itemTypeMap.gliders, 1)[0];

    const selectedDailyItems = [...selectedEmotes, selectedPickaxe, selectedWrap, selectedSkin, selectedGlider];

    const setItems = {};
    allCosmetics.forEach(item => {
      const setTag = item.gameplayTags ? item.gameplayTags.find(tag => tag.startsWith('Cosmetics.Set.')) : null;
      if (setTag) {
        if (!setItems[setTag]) {
          setItems[setTag] = { skins: [], pickaxes: [], gliders: [] };
        }
        if (item.type.backendValue.includes('AthenaCharacter')) {
          setItems[setTag].skins.push(item);
        }
        if (item.type.backendValue.includes('AthenaPickaxe')) {
          setItems[setTag].pickaxes.push(item);
        }
        if (item.type.backendValue.includes('AthenaGlider')) {
          setItems[setTag].gliders.push(item);
        }
      }
    });

    const validSets = Object.values(setItems).filter(set => 
      set.skins.length > 0 && set.pickaxes.length > 0 && set.gliders.length > 0
    );

    if (validSets.length < 2) {
      throw new Error('Not enough valid sets to create featured panels');
    }

    const selectedSets = selectItems(validSets, 2);

    const catalogData = await readCatalogFile();

    catalogData.storefronts = catalogData.storefronts.map(storefront => {
      if (storefront.name === "BRDailyStorefront") {
        return {
          ...storefront,
          catalogEntries: selectedDailyItems.map((itemData, index) => {
            let templateItem = {
              "offerId": uuidv4(),
              "devName": `Daily Item - ${itemData.name}`,
              "fulfillmentIds": [],
              "dailyLimit": -1,
              "weeklyLimit": -1,
              "monthlyLimit": -1,
              "categories": [
                `Panel ${index + 1}`
              ],
              "prices": [
                {
                  "currencyType": "MtxCurrency",
                  "currencySubType": "",
                  "regularPrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue),
                  "finalPrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue),
                  "saleExpiration": "9999-12-31T23:59:59.999Z",
                  "basePrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue)
                }
              ],
              "meta": {},
              "matchFilter": "",
              "filterWeight": 0,
              "appStoreId": [],
              "requirements": [
                {
                  "requirementType": "DenyOnItemOwnership",
                  "requiredId": `${itemData.type.backendValue}:${itemData.id}`,
                  "minQuantity": 1
                }
              ],
              "offerType": "StaticPrice",
              "giftInfo": {
                "bIsEnabled": true,
                "forcedGiftBoxTemplateId": "",
                "purchaseRequirements": [],
                "giftRecordIds": []
              },
              "refundable": true,
              "metaInfo": [],
              "itemGrants": [
                {
                  "templateId": `${itemData.type.backendValue}:${itemData.id}`,
                  "quantity": 1
                }
              ],
              "sortPriority": 1,
              "catalogGroupPriority": 0
            };

            if (itemData.type.backendValue === 'AthenaCharacter' && itemData.gameplayTags) {
              const setTags = itemData.gameplayTags.filter(tag => tag.startsWith('Cosmetics.Set.'));
              if (setTags.length > 0) {
                const backBling = allCosmetics.find(cosmetic => 
                  cosmetic.type.backendValue === 'AthenaBackpack' &&
                  cosmetic.gameplayTags &&
                  setTags.some(tag => cosmetic.gameplayTags.includes(tag))
                );

                if (backBling) {
                  templateItem.itemGrants.push({
                    "templateId": `AthenaBackpack:${backBling.id}`,
                    "quantity": 1
                  });
                }
              }
            }

            return templateItem;
          })
        };
      } else if (storefront.name === "BRWeeklyStorefront") {
        const catalogEntries = [];

        selectedSets.forEach((set, setIndex) => {
          const randomSkin = selectItems(set.skins, 1)[0];
          const randomPickaxe = selectItems(set.pickaxes, 1)[0];
          const randomGlider = selectItems(set.gliders, 1)[0];

          const bundleItems = [randomSkin, randomPickaxe];
          if (Math.random() > 0.5) {
            bundleItems.push(randomGlider);
          }

          if (set.skins.length > 1 && Math.random() > 0.5) {
            const secondSkin = selectItems(set.skins.filter(skin => skin.id !== randomSkin.id), 1)[0];
            bundleItems.push(secondSkin);
          }

          bundleItems.forEach(itemData => {
            let templateItem = {
              "offerId": uuidv4(),
              "devName": `Featured Item - ${itemData.name}`,
              "fulfillmentIds": [],
              "dailyLimit": -1,
              "weeklyLimit": -1,
              "monthlyLimit": -1,
              "categories": [
                `Panel ${setIndex + 1}`
              ],
              "prices": [
                {
                  "currencyType": "MtxCurrency",
                  "currencySubType": "",
                  "regularPrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue),
                  "finalPrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue),
                  "saleExpiration": "9999-12-31T23:59:59.999Z",
                  "basePrice": getItemValue(itemData.rarity.displayValue, itemData.type.backendValue)
                }
              ],
              "meta": {},
              "matchFilter": "",
              "filterWeight": 0,
              "appStoreId": [],
              "requirements": [
                {
                  "requirementType": "DenyOnItemOwnership",
                  "requiredId": `${itemData.type.backendValue}:${itemData.id}`,
                  "minQuantity": 1
                }
              ],
              "offerType": "StaticPrice",
              "giftInfo": {
                "bIsEnabled": true,
                "forcedGiftBoxTemplateId": "",
                "purchaseRequirements": [],
                "giftRecordIds": []
              },
              "refundable": true,
              "metaInfo": [],
              "DisplayAssetPath": `/Game/Catalog/DisplayAssets/DA_Featured_${itemData.id}.DA_Featured_${itemData.id}`,
              "itemGrants": [
                {
                  "templateId": `${itemData.type.backendValue}:${itemData.id}`,
                  "quantity": 1
                }
              ],
              "sortPriority": 1,
              "catalogGroupPriority": 0
            };

            if (itemData.type.backendValue === 'AthenaCharacter' && itemData.gameplayTags) {
              const setTags = itemData.gameplayTags.filter(tag => tag.startsWith('Cosmetics.Set.'));
              if (setTags.length > 0) {
                const backBling = allCosmetics.find(cosmetic => 
                  cosmetic.type.backendValue === 'AthenaBackpack' &&
                  cosmetic.gameplayTags &&
                  setTags.some(tag => cosmetic.gameplayTags.includes(tag))
                );

                if (backBling) {
                  templateItem.itemGrants.push({
                    "templateId": `AthenaBackpack:${backBling.id}`,
                    "quantity": 1
                  });
                }
              }
            }

            catalogEntries.push(templateItem);
          });
        });

        return {
          ...storefront,
          catalogEntries
        };
      } else {
        return storefront;
      }
    });

    await writeCatalogFile(catalogData);

    res.json("Shop rotated successfully");
  } catch (error) {
    console.error("Error rotating shop:", error);
    res.status(500).send("Failed to rotate shop");
  }
});


export default app;
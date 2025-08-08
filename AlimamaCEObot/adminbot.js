import TelegramBot from "node-telegram-bot-api";
import { getJSON } from "./data.js";
import dotenv from "dotenv";

dotenv.config();

console.log("Telegram Bot Server start...");
const token = process.env.TELEGRAM_BOT_TOKEN; // 正确读取
let bot = new TelegramBot(token, { polling: true });

bot.on("polling_error", (error) => {
  console.log("Polling error:", error.code);
});
function havesineDistance(coords1, coords2, isMiles = false) {
  const toRad = (x) => (x * Math.PI) / 180;

  const lat1 = coords1.latitude;
  const lon1 = coords1.longitude;

  const lat2 = coords2.latitude;
  const lon2 = coords2.longitude;

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;

  if (isMiles) {
    distance /= 1.60934;
  }
  return distance;
}

function printout(products, bot, fromId, resp) {
  products.forEach((item) => {
    resp += `${item.productName_cn}\n`;
    resp += `Category: ${item.category_en} ${item.category_cn}\n`;
    resp += `Price: ${item.price}\n`;
    resp += `Description: ${item.description_cn}\n`;
    resp += `Description: ${item.description_en}\n`;
    resp += `Shop: ${item.shop_en} ${item.shop_cn}\n`;
    resp += `Address: ${item.address_cn}\n`;
    resp += `Address ${item.address_en}\n`;
    resp += `Stock: ${item.stock}\n`;
    resp += `Phone: ${item.shop_tel}\n`;
    resp += `Longitude : ${item.Longitude}\n`;
    resp += `Latitude: ${item.Latitude}\n`;
    resp += `\n`;
    console.log(resp);
    bot.sendMessage(fromId, resp);
    resp = "";
  });
}

// 【幫助指令】
bot.onText(/\/start|help/, function (msg) {
  const chatId = msg.chat.id;
  const helpText = `
📱 *電子產品查詢 Bot 使用指南*

🔍 *產品搜尋*
1. 關鍵字搜尋：/search <產品名稱>
   ➥ 範例類型：/search 手機 /search 電腦 /search 空調
   ➥ 範例：/search Dell /search iPhone /search Samsung ...等
   
          
2. 價格範圍搜尋：/search <名稱>/<最低價>/<最高價>
   ➥ 範例：/search 電腦/5000/10000

📍 *附近分店查詢*
➲ 分享您的位置 → 獲取2公里內的電子產品分店
  分店位置:中環,旺角,荃灣,沙田,九龍灣,銅鑼灣

❓ *常見問答*
➲ /question <關鍵字>
   ➥ 範例：/question 退貨 
          /question 送貨 
          /question 付款 
          /question 保養 
          /question 營業時間

📋 *所有產品列表*
➲ /getproducts
`;

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

bot.onText(/\/search (.+)/, async function (msg, match) {
  try {
    const chatId = msg.chat.id;
    const input = match[1];

    const parts = input.split("/").map((p) => p.trim());
    const hasPriceRange = parts.length === 3;

    const keyword = parts[0];
    const minPrice = hasPriceRange ? parseFloat(parts[1]) : 0;
    const maxPrice = hasPriceRange
      ? parseFloat(parts[2])
      : Number.MAX_SAFE_INTEGER;

    if (hasPriceRange && (isNaN(minPrice) || isNaN(maxPrice))) {
      bot.sendMessage(
        chatId,
        "⚠️ 價格格式錯誤！請使用：/search 關鍵字/最低價/最高價\n範例：/search 手機/3000/8000"
      );
      return;
    }

    const products = await getJSON("http://localhost:8080/getproducts");

    const results = products.data.filter((p) => {
      const keywordMatch =
        p.productName_cn.includes(keyword) ||
        p.productName_en.toLowerCase().includes(keyword.toLowerCase()) ||
        p.category_cn.includes(keyword) ||
        p.category_en.toLowerCase().includes(keyword.toLowerCase());

      const priceInRange =
        parseFloat(p.price) >= minPrice && parseFloat(p.price) <= maxPrice;

      return keywordMatch && (hasPriceRange ? priceInRange : true);
    });

    // 處理結果
    if (results.length > 0) {
      let response = `🔍 找到 ${results.length} 個符合 "${keyword}"`;
      if (hasPriceRange) response += ` (價格範圍: $${minPrice}~$${maxPrice})`;
      response += " 的產品：\n\n";

      bot.sendMessage(chatId, response);

      // 分批次發送結果
      const batchSize = 3;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        let batchMessage = "";

        batch.forEach((p, idx) => {
          batchMessage += `📦 ${p.productName_cn}\n`;
          batchMessage += `🏷️ 價格: $${p.price}\n`;
          batchMessage += `🏬 分店: ${p.shop_cn}\n`;
          batchMessage += `📍 地址: ${p.address_cn}\n`;
          batchMessage += `📱 電話: ${p.shop_tel}\n`;
          if (idx < batch.length - 1) batchMessage += "\n────────────\n\n";
        });

        bot.sendMessage(chatId, batchMessage);
      }
    } else {
      bot.sendMessage(chatId, `🔍 未找到符合 "${keyword}" 的產品`);
    }
  } catch (error) {
    console.error("搜索錯誤:", error);
    bot.sendMessage(msg.chat.id, "⚠️ 搜尋時發生錯誤，請稍後再試");
  }
});

// 【主功能：分享位置獲取附近分店】
bot.on("location", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userCoords = {
      latitude: msg.location.latitude,
      longitude: msg.location.longitude,
    };

    // 獲取產品數據
    const products = await getJSON("http://localhost:8080/getproducts");

    // 計算距離並過濾
    const nearbyShops = products.data
      .map((p) => {
        const shopCoords = { latitude: p.Latitude, longitude: p.Longitude };
        return {
          ...p,
          distance: havesineDistance(userCoords, shopCoords),
        };
      })
      .filter((p) => p.distance <= 2) // 2公里範圍
      .sort((a, b) => a.distance - b.distance);

    // 處理結果
    if (nearbyShops.length > 0) {
      let response = `📍 在您附近找到 ${nearbyShops.length} 間分店（2公里範圍內）：\n\n`;

      nearbyShops.forEach((shop, idx) => {
        response += `🏬 ${shop.shop_cn}\n`;
        response += `📏 距離: ${shop.distance.toFixed(2)} 公里\n`;
        response += `📍 地址: ${shop.address_cn}\n`;
        response += `📱 電話: ${shop.shop_tel}\n`;
        if (idx < nearbyShops.length - 1) response += "\n────────────\n\n";
      });

      bot.sendMessage(chatId, response);
    } else {
      bot.sendMessage(chatId, "📍 您附近2公里範圍內沒有電子產品分店");
    }
  } catch (error) {
    console.error("位置處理錯誤:", error);
    bot.sendMessage(msg.chat.id, "⚠️ 處理位置資訊時發生錯誤");
  }
});

// 【主功能：Q&A問答】
bot.onText(/\/question (.+)/, async function (msg, match) {
  try {
    const chatId = msg.chat.id;
    const keyword = match[1].trim();

    // 問答數據庫（範例）
    const faqData = [
      {
        question: "退貨政策",
        answer: "產品在購買後7天內可憑原始包裝和發票退貨",
      },
      {
        question: "送貨時間",
        answer: "香港本地訂單通常在下單後1-3個工作日送達",
      },
      { question: "付款方式", answer: "支援信用卡、支付寶、微信支付及轉數快" },
      { question: "產品保養", answer: "所有電子產品均提供12個月原廠保養服務" },
      {
        question: "分店營業時間",
        answer: "所有分店營業時間為上午11:00至晚上20:00",
      },
    ];

    // 關鍵字匹配
    const matchedFaqs = faqData.filter(
      (item) => item.question.includes(keyword) || item.answer.includes(keyword)
    );

    // 處理結果
    if (matchedFaqs.length > 0) {
      let response = `❓ 找到與 "${keyword}" 相關的問答：\n\n`;

      matchedFaqs.forEach((faq, idx) => {
        response += `❔ ${faq.question}\n`;
        response += `💡 ${faq.answer}\n`;
        if (idx < matchedFaqs.length - 1) response += "\n────────────\n\n";
      });

      bot.sendMessage(chatId, response);
    } else {
      bot.sendMessage(chatId, `🔍 未找到與 "${keyword}" 相關的問答`);
    }
  } catch (error) {
    console.error("問答錯誤:", error);
    bot.sendMessage(msg.chat.id, "⚠️ 查詢問答時發生錯誤");
  }
});

bot.onText(/\/getproducts/, async function (msg) {
  let fromId = msg.from.id;
  let resp = "";
  try {
    let productJSON = await getJSON("http://localhost:8080/getproducts");
    printout(productJSON.data, bot, fromId, resp);
  } catch (err) {
    console.log(err);
  }
});

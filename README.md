npm i &
npm i axios express mongodb mongoose node-telegram-bot-api & 
npm i dotenv

create .env 
TELEGRAM_BOT_TOKEN=你的Bot_Token_放這裡

node adminbot.js
"Telegram Bot Server start..."

node main.js
"Restful Api Server start at http://localhost:8080/..."


project/

├── .env # 環境變數

├── main.js # REST API 入口

├── adminbot.js # Telegram Bot 入口

├── data.js # 資料處理模組

└── README.md


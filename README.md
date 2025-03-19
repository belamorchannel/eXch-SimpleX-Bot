![666](https://github.com/user-attachments/assets/26d2ac0c-84b6-449b-a2fe-fbab4b593d21)

QR code & Link for test bot/exchange
- ![{DB028E2B-78A4-4F2B-8F3B-3A46510D0C00}](https://github.com/user-attachments/assets/b7c2bef2-d9b7-48b8-b390-84423515e031)

- [Link to BOT](https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2FPQUV2eL0t7OStZOoAsPEV2QYWt4-xilbakvGUGOItUo%3D%40smp6.simplex.im%2FksVNkDCgeW3FJEDN-uwSwYbfm1gpOMj4%23%2F%3Fv%3D1-3%26dh%3DMCowBQYDK2VuAyEAVCz3an-Ptc2rbDYvdelb4SEiNOQd2jT-e2sgQnWhqzk%253D%26srv%3Dbylepyau3ty4czmn77q4fglvperknl4bi2eb2fdy2bh4jxtf32kf73yd.onion)

# eXch SimpleX Bot

A lightweight, secure cryptocurrency exchange bot integrated with SimpleX Chat & eXch API. This bot allows users to perform crypto exchanges directly in a chat interface, leveraging the privacy and security of eXch and SimpleX.

## Installation
Follow these steps to set up and run the bot on your system.

### 1. Clone the Repository
Clone the bot repository from GitHub.
#### Windows/Linux/MacOS:
    git clone https://github.com/belamorchannel/eXch-SimpleX-Bot.git
    cd eXch-SimpleX-Bot

### 2. Install Dependencies
Install the required Node.js packages.

    npm install

### 3. Download SimpleX Chat CLI
Download the latest SimpleX Chat CLI executable from the [releases page](https://github.com/simplex-chat/simplex-chat/releases/).

- Download `simplex-chat-windows-x86-64.exe`.
- Place it in a directory of your choice (e.g., `C:\simplex\`).

### 4. Set Up SimpleX CLI
Run the CLI to create an account and initialize the database.

- Run the downloaded CLI executable:
    ./simplex-chat-<platform>  # Replace <platform> with your OS-specific file
- Follow the prompts to create an account. A database file (e.g., `db_chat.db`) will be generated in the same directory.

### 5. Configure Environment Variables
Rename `env-example` to `.env` and update the paths to the CLI and database.

1. Rename the file:
    ren env-example .env 
2. Edit `.env` with your paths:
  -  SIMPLEX_PATH=C:\path\to\simplex-chat-windows-x86-64.exe
  -  SIMPLEX_DB=C:\path\to\db_chat.db

### 6. Set Up Affiliate ID
Get your affiliate ID from [exch.cx/affiliation](https://exch.cx/affiliation) and add it to `.env`.
![{BD5033A4-2805-4F7A-882B-BDE96E094ABA}](https://github.com/user-attachments/assets/81235cde-2dcb-4622-9382-849631af64d7)


### 7. Run the Bot
Start the bot using Node.js.
```node index.js```   

## Usage
1. Connect to the bot via the SimpleX invitation link shown in the console.
2. Use commands like:
   - `/exchange <from> <to> <address>`: Start an exchange (e.g., `/exchange BTC USDT 0x123...`).
   - `/help`: View all available commands.


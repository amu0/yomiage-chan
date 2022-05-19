# 読み上げちゃん
[VOICEVOX](https://voicevox.hiroshiba.jp/) と [discord.js](https://discord.js.org/) を利用した読み上げBOTです

## 機能
- VOICEVOXを利用したチャットの読み上げ
- 20種類のボイスを利用可能（ユーザーごと）
- ユーザーの入退出の読み上げ
- 単語登録
- 辞書のインポート・エクスポート

## 起動方法
1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリを作成し、トークンを発行する
2. 招待URLを生成し、サーバーに追加する<br>
   **Scopes**
   ```
   bot
   applications.commands
   ```
   **Bot Permissions**
   ```
   Read Messages/View Channels
   Send Messages
   Send Messages in Threads
   Embed Links
   Attach Files
   Connect
   Speak

   (Permission Integer: 274914659328)
   ```
3. .envファイルを用意する<br>
   **【.env】**
   ```
   DISCORD_TOKEN="your_bot_token"
   OWNER_ID="your_user_id"
   ```
4. DockerComposeでコンテナを起動する
   ```
   docker-compose up -d
   ```
5. BOTがオンライン状態になると利用可能です<br>
   まれにVoicevox Engineが正しく起動しないことがあります。その際はコンテナを再起動してください。
6. 終了方法<br>
   Discord内で`/shutdown` コマンドを実行してBOTを終了します。<br>
   `docker-compose down` でコンテナを破棄します。

## Special Thanks
このBOTは [OSS版VOICEVOX Engine](https://github.com/VOICEVOX/voicevox_engine) を利用しています。<br>
[y-chan/voicecvox_discord_tts_bot](https://github.com/y-chan/voicevox_discord_tts_bot) を参考にさせていただきました。

## ライセンス
このBOTは[LGPL](https://github.com/yukki2288/yomiage-chan/blob/main/LICENSE)で公開されています
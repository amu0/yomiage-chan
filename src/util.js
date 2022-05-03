"use strict";
const fs = require("fs");
const readline = require("readline");
const https = require("https");
const Dictionary = require("../models/dictionary");

async function exportDictionary(guildId) {
  const fileName = `${guildId}_${new Date().getTime()}.dict`;

  const stream = fs.createWriteStream(fileName, { encoding: "utf16le" });
  stream.on("error", (err) => {
    console.error(err);
  });

  let promises = [];
  await Dictionary.findAll({
    where: { guildId: guildId },
    attributes: ["word", "reading"]
  }).then((words) => {
    words.forEach((word) => {
      const promise = new Promise((resolve) => {
        const text = word.getDataValue("word") + "," + word.getDataValue("reading");
        stream.write(text + "\n", () => { resolve() });
      });
      promises.push(promise);
    })
  });

  await Promise.all(promises);
  stream.end();
  return fileName;
}

async function importDictionary(url, fileName, guildId) {
  // ファイルをダウンロード
  await new Promise((resolve, reject) => {
    https.request(url, (res) => {
      res
        .pipe(fs.createWriteStream(fileName))
        .on("close", resolve)
        .on("error", reject);
    })
      .end();
  });

  const stream = fs.createReadStream(fileName, { encoding: "utf16le" });
  stream.on("error", (err) => console.error(err));

  const reader = readline.createInterface({ input: stream });

  let words = [];
  reader.on("line", (data) => {
    if (data.split(",").length !== 2) return;
    words.push({
      guildId: guildId,
      word: data.split(",")[0].trim(),
      reading: data.split(",")[1].trim()
    });
  });

  await new Promise((resolve) => {
    reader.on("close", () => {
      Dictionary.bulkCreate(words, {
        updateOnDuplicate: ["guildId", "word"]
      }).then(resolve);
    });
  });

  return;
}

module.exports = {
  exportDictionary,
  importDictionary
};
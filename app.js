const express = require("express");
const ytdl = require("ytdl-core");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");
const process = require("child_process");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const path = require("path");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET");
    return res.status(200).json({});
  }

  next();
});

app.get("/convertToMP3", async (req, res) => {
  const url = req.query.url;

  try {
    await new Promise((resolve, reject) => {
      ytdl(url, { filter: "audioonly" })
        .pipe(fs.createWriteStream("video.mp4"))
        .on("finish", resolve)
        .on("error", reject);
    });

    await new Promise((resolve, reject) => {
      let stderr = "";
      const ffmpegProcess = process.spawn(ffmpegPath, [
        "-y",
        "-i",
        "video.mp4",
        "-vn",
        "-acodec",
        "libmp3lame",
        "output.mp3",
      ]);
      ffmpegProcess.stderr.on("data", (data) => (stderr += data.toString()));
      ffmpegProcess.on("exit", (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(`ffmpeg process exited with code ${code} : ${stderr}`)
          );
      });
    });

    res.setHeader("Content-Disposition", 'attachment; filename="file.mp3"');
    res.status(200).sendFile(path.resolve("./output.mp3"));
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Error 500 request couldn't be granted " + error,
    });
  }
});

app.use((req, res, next) => {
  const error = new Error("Error 404 request couldn't be granted");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    error: {
      message: error.message,
    },
  });
});

module.exports = app;

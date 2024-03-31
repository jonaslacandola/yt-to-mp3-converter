const express = require("express");
const ytdl = require("ytdl-core");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");
const { spawn } = require("child_process");
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
    const videoStream = ytdl(url, { filter: "audioonly" });

    const ffmpegProcess = spawn(ffmpegPath, [
      "-y",
      "-i",
      "pipe:0",
      "-vn",
      "-acodec",
      "libmp3lame",
      "pipe:1",
    ]);

    videoStream.pipe(ffmpegProcess.stdin);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="file.mp3"');

    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.on("exit", (code, signal) => {
      if (code !== 0) {
        console.error(
          `ffmpeg process exited with code ${code} and signal ${signal}`
        );
        res.status(500).send("Conversion failed!");
      }
    });
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

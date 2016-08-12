
"use strict";

const EventEmitter = require("events").EventEmitter;

const VoiceSocket = require("../../voice/networking/ws/VoiceSocket");
const IVoiceConnection = require("../../voice/interfaces/IVoiceConnection");


class Player extends EventEmitter {

  constructor(guildId, token) {
    super();

    this.guildId = guildId;
    this.token = token;

    this.voiceSocket = null;
    this.voiceConnection = null;
    this.playing = false;
  }


  createVoiceSocket(endpoint, guildId, channelId, userId, sessionId, token) {
    const canReconnect = endpoint ? true : false;

    if (!canReconnect) return;

    let voiceSocket = new VoiceSocket(guildId);
    this.voiceSocket = voiceSocket;

    const serverId = guildId || channelId;
    voiceSocket.connect(
      endpoint.split(":")[0],
      serverId, userId, sessionId, token
    );

    return voiceSocket;
  }

  createVoiceConnection(endpoint, guildId, channelId, userId, sessionId, token, callback) {
    if (this.voiceConnection) {
      return this.voiceConnection;
    }

    let voiceSocket = createVoiceSocket(endpoint, guildId, channelId, userId, sessionId, token, callback);
    let voiceConnection = new IVoiceConnection(voiceSocket);
    this.voiceConnection = voiceConnection;

    return voiceConnection;
  }

  getVoiceConnection(endpoint, channelId, userId, sessionId) {
    if (this.voiceConnection) {
      return this.voiceConnection;
    }

    let self = this;

    return new Promise((resolve) => {
      createVoiceConnection(endpoint, this.guildId, channelId, userId, sessionId, this.token, () => {
        resolve(self.voiceConnection);
      });
    });
  }

  play(data) {
    let self = this;

    if (this.playing) {
      this.stop();
    }

    let voiceConnection = this.getVoiceConnection(data.endpoint, data.channelId, data.userId, data.sessionId).then((voiceConnection) => {
      let encoder = voiceConnection.createExternalEncoder({
        type: "ffmpeg",
        format: "opus",
        source: data.url,
        frameDuration: 60,
        debug: false
      });

      let encoderStream = encoder.play();

      encoder.once("end", () => {
        self.ended();
      });
    });
  }

  stop() {
    if (!this.playing) return;

    if (!this.voiceSocket || !this.voiceConnection) {
      this.playing = false;
      return;
    }

    let encoderStream = this.voiceConnection.getEncoderStream();

    if (!encoderStream) {
      this.playing = false;
      return;
    }

    encoderStream.unpipeAll();

    this.playing = false;
  }

  setVolume(volume) {
    if (!this.voiceConnection) return;

    let encoder = this.voiceConnection.getEncoder();
    encoder.setVolume(volume);
  }

  pause() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.cork();
  }

  resume() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.uncork();
  }

  ended() {
    this.emit("ended");
  }

}


module.exports = Player;

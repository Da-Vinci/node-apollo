
"use strict";

const EventEmitter = require("events").EventEmitter;

const VoiceSocket = require("../../voice/networking/ws/VoiceSocket");
const IVoiceConnection = require("../../voice/interfaces/IVoiceConnection");


/**
 * Manages the voice connection and playing audio
 * @class Player
 * @extends EventEmitter
 * @param {Number} guildId The guild id of the connection
 * @param {String} token The token of the bot
 * @prop {VoiceSocket} voiceSocket The VoiceSocket of the player
 * @prop {VoiceConnection} voiceConnection The VoiceConnection of the player
 * @prop {Boolean} playing Whether the player is currently playing
 */
class Player extends EventEmitter {

  constructor(guildId, token) {
    super();

    this.guildId = guildId;
    this.token = token;

    this.voiceSocket = null;
    this.voiceConnection = null;
    this.playing = false;
  }


  /**
   * Create the VoiceSocket
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} guildId The guild id of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @param {String} token The token of the bot
   * @returns VoiceSocket
   * @private
   */
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

  /**
   * Create the VoiceConnection
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} guildId The guild id of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @param {String} token The token of the bot
   * @param {Function} callback Called when the VoiceSocket successfully connects
   * @returns VoiceConnection
   * @private
   */
  createVoiceConnection(endpoint, guildId, channelId, userId, sessionId, token, callback) {
    if (this.voiceConnection) {
      return this.voiceConnection;
    }

    let voiceSocket = this.createVoiceSocket(endpoint, guildId, channelId, userId, sessionId, token, callback);
    let voiceConnection = new IVoiceConnection(voiceSocket);
    this.voiceConnection = voiceConnection;

    return voiceConnection;
  }


  /**
   * Get or create the VoiceConnection if it doesn't exist
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @returns Promise
   * @private
   */
  getVoiceConnection(endpoint, channelId, userId, sessionId) {
    if (this.voiceConnection) {
      return this.voiceConnection;
    }

    let self = this;

    return new Promise((resolve) => {
      this.createVoiceConnection(endpoint, this.guildId, channelId, userId, sessionId, this.token, () => {
        resolve(self.voiceConnection);
      });
    });
  }

  /**
   * Start playing audio from a URL
   * @param {String} url The URL source of the audio to play
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @private
   */
  play(data) {
    if (this.playing) {
      this.stop();
    }

    this.getVoiceConnection(data.endpoint, data.channelId, data.userId, data.sessionId).then((voiceConnection) => {
      let encoder = voiceConnection.createExternalEncoder({
        type: "ffmpeg",
        format: "opus",
        source: data.url,
        frameDuration: 60,
        debug: false
      });

      let encoderStream = encoder.play();
      this.started();

      encoder.once("end", () => {
        this.ended();
      });
    });
  }

  /**
   * Stop playing audio
   * @private
   */
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

  /**
   * Disconnect the VoiceConnection
   * @private
   */
  disconnect() {
    if (!this.voiceConnection) return;

    let voiceConnection = this.voiceConnection;
    let encoderStream = voiceConnection.encoderStream();

    encoderStream.unpipeAll();
    voiceConnection.disconnect();
  }

  /**
   * Set the volume of the audio
   * @param {Number} volume The new volume
   * @private
   */
  setVolume(volume) {
    if (!this.voiceConnection) return;

    let encoder = this.voiceConnection.getEncoder();
    encoder.setVolume(volume);
  }

  /**
   * Pause the audio playback
   * @private
   */
  pause() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.cork();
  }

  /**
   * Start the audio playback
   * @private
   */
  resume() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.uncork();
  }


  /**
   * Called when audio starts
   * @private
   */
  started() {
    this.playing = true;
    this.emit("start");
  }

  /**
   * Called when audio ends
   * @private
   */
  ended() {
    this.playing = false;
    this.emit("end");
  }

}


module.exports = Player;


"use strict";

const Constants = require("../Constants");
const Operations = Constants.Operations;
const Events = Constants.Events;

const Player = require("./Player");

/**
 * VoiceConnection manager process
 * @class Connection
 * @param {String} endpoint gateway endpoint
 * @param {String} guildId The guild id of the connection
 * @param {String} channelId The channel id for this connection
 * @param {String} userId The user id of the client
 * @param {String} sessionId The session id for this connection
 * @param {String} token The voice connection token
 * @prop {Player} player The player for this connection
 */
class Connection {

  constructor(endpoint, guildId, channelId, userId, sessionId, token) {
    this.player = new Player(...arguments);

    this.voiceData = {
      endpoint:  endpoint,
      guildId:   guildId,
      channelId: channelId,
      userId:    userId,
      sessionId: sessionId,
      token:     token
    };
  }

  /**
   * Start the audio player and IPC listener
   * @private
   */
  start() {
    process.on("message", (message) => {
      const type = message.type;
      const data = message.data;

      switch (type) {

      case Operations.AUDIO_PLAY:
        this.player.play(data);

        break;

      case Operations.AUDIO_STOP:
        this.player.stop();
        this.player.disconnect();
        this.destroy();

        break;

      case Operations.AUDIO_VOLUME:
        this.player.setVolume(data.volume);

        break;

      case Operations.AUDIO_PAUSE:
        this.player.pause();

        break;

      case Operations.AUDIO_RESUME:
        this.player.resume();

        break;

      default:
        console.log(`Unknown IPC type: ${type}`);
        break;

      }
    });

    this.player.on("ready", () => {
      let data = {
        type: Events.AUDIO_READY,
        data: {
          guildId: this.voiceData.guildId
        }
      };

      process.send(data);
    });

    this.player.on("start", () => {
      let data = {
        type: Events.AUDIO_START,
        data: {
          guildId: this.voiceData.guildId
        }
      };

      process.send(data);
    });

    this.player.on("end", () => {
      let data = {
        type: Events.AUDIO_END,
        data: {
          guildId: this.voiceData.guildId
        }
      };

      process.send(data);
    });
  }

  /**
   * Kill this process
   * @private
   */
  destroy() {
    process.kill("SIGINT");
  }

}


module.exports = Connection;

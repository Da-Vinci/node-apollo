
"use strict";

const Constants = require("../Constants");
const Operations = Constants.Operations;
const Events = Constants.Events;

const Player = require("./Player");


/**
 * VoiceConnection manager process
 * @class Connection
 * @param {Number} guildId The guild id of the connection
 * @param {String} token The token of the bot
 * @prop {Player} player The player for this connection
 */
class Connection {

  constructor(guildId, token) {
    this.guildId = guildId;
    this.token = token;

    this.player = new Player(guildId, token);
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

    this.player.on("start", () => {
      let data = {
        type: Events.AUDIO_START,
        data: {
          guildId: this.guildId
        }
      };

      process.send(data);
    });

    this.player.on("end", () => {
      let data = {
        type: Events.AUDIO_END,
        data: {
          guildId: this.guildId
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

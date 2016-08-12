
"use strict";

const Constants = require("../Constants");


class Connection {

  constructor(guildId, token) {
    this.guildId = guildId;
    this.token = token;

    this.player = new Player(guildId, token);
  }

  start() {
    let self = this;

    const Operations = Constants.Operations;
    const Events = Constants.Events;

    process.on("message", (message) => {
      const type = message.type;
      const data = message.data;

      switch (type) {

        case Operations.AUDIO_PLAY:
          self.player.play(data);

          break;

        case Operations.AUDIO_STOP:
          self.player.stop();
          self.player.disconnect();
          self.destroy();

          break;

        case Operations.AUDIO_VOLUME:
          self.player.setVolume(data.volume);

          break;

        case Operations.AUDIO_PAUSE:
          self.player.pause();

          break;

        case Operations.AUDIO_RESUME:
          self.player.resume();

          break;

        default:
          console.log(`Unknown IPC type: ${type}`);
          break;

      }
    });

    this.player.on("ended", () => {
      let data = {
        type: Events.AUDIO_ENDED,
        data: {}
      };

      process.send(data);
    });
  }

  destroy() {
    process.kill("SIGINT");
  }

}


module.exports = Connection;

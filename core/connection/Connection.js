
"use strict";

const Constants = require("../Constants");


class Connection {

  constructor(guildId) {
    this.guildId = guildId;
  }

  start() {
    var self = this;

    const Operations = Consants.Operations;

    process.on("message", (message) => {
      const type = message.type;
      const data = message.data;

      switch (type) {

        case Operations.AUDIO_PLAY:

          break;

        case Operations.AUDIO_STOP:

          break;

        case Operations.AUDIO_VOLUME:

          break;

        case Operations.AUDIO_PAUSE:

          break;

        case Operations.AUDIO_RESUME:

          break;

        default:
          console.log(`Unknown IPC type: ${type}`);
          break;

      }
    });
  }

}


module.exports = Connection;

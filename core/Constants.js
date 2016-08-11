
"use strict";

const Constants = {
  OPCodes: {
    DISPATCH: 0,
    IDENTIFY: 1,
    CONNECTED: 2
  },

  Operations: {
    AUDIO_PLAY: 0,
    AUDIO_STOP: 1,
    AUDIO_VOLUME: 2,
    AUDIO_PAUSE: 3,
    AUDIO_RESUME: 4
  },

  Events: {
    AUDIO_ENDED: 0
  }
}


module.exports = Constants;

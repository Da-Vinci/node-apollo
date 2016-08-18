
"use strict";

const Connection = require("./Connection");

const data = JSON.parse(process.argv[2]);
const GUILD_ID = data.guildId;

var connection = new Connection(GUILD_ID);
connection.start();


"use strict";

const Connection = require("./Connection");
const Constants = require("../Constants");

const GUILD_ID = process.argv[2];
const TOKEN = process.argv[3];

var connection = new Connection(GUILD_ID, TOKEN);
connection.start();

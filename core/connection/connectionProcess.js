
"use strict";

const Connection = require("./Connection");
const Constants = require("../Constants");

const GUILD_ID = process.argv[2];

var connection = new Connection(GUILD_ID);

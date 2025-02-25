const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String
});

const dataSchema = new mongoose.Schema({
    liveMatch: {
        team1: String,
        team2: String,
        league: String
    },
    newsUpdate: {
        image: String,
        headline: String
    }
});

const User = mongoose.model("User", userSchema);
const Data = mongoose.model("Data", dataSchema);

module.exports = { User, Data };


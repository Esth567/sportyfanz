const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: {
    auth: String,
    p256dh: String,
  },
});

module.exports = mongoose.model("Subscription", subscriptionSchema);

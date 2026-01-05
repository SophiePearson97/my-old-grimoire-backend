const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
  },
  { versionKey: false }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
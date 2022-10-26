const mongoose = require('mongoose');
const { hash } = require('../libs/auth');

const schema = new mongoose.Schema({
  username: { type: String, required: true },
  favouriteGenre: { type: String, required: true },
  password: { type: String, set: (pw) => hash(pw) },
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
    }
  }
})

const User = mongoose.model('User', schema);

User.createCollection();

module.exports = User;
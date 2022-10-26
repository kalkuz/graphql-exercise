const { createHash } = require('crypto');
const { encode, decode } = require('jwt-simple');

const hash = (input) => createHash('sha256').update(input).digest('hex');

const JWT_SECRET = "ANO4ASSKK22";

const authorize = (usr) => encode(
  {
    usr,
    iss: 'test',
    iat: new Date().getTime(),
    exp: new Date().getTime() + (60 * 60 * 24 * 365 * 1000),
  },
  JWT_SECRET,
);

const auth = (token) => {
  try {
    const { usr, exp } = decode(token, JWT_SECRET);

    if (exp > new Date().getTime()) {
      return usr;
    } else throw new Error('Expired token.');
  } catch (e) { throw new Error('You need a valid token.') }
};

module.exports = {
  hash,
  auth,
  authorize,
};

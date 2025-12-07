// backend/hashingComparison.js
const bcrypt = require('bcrypt');
const argon2 = require('argon2');

class HashingComparison {
  static async hashAll(password) {
    const startBcrypt = Date.now();
    const bcryptHash = await bcrypt.hash(password, 12);
    const bcryptTime = Date.now() - startBcrypt;
    
    const startArgon2 = Date.now();
    const argon2Hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3,
      parallelism: 1
    });
    const argon2Time = Date.now() - startArgon2;
    
    return {
      bcrypt: { hash: bcryptHash, time: bcryptTime },
      argon2: { hash: argon2Hash, time: argon2Time }
    };
  }
  
  static async verifyAll(password, hashes) {
    const bcryptValid = await bcrypt.compare(password, hashes.bcrypt);
    const argon2Valid = await argon2.verify(hashes.argon2, password);
    
    return { bcrypt: bcryptValid, argon2: argon2Valid };
  }
}
import jswt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  return jswt.sign(payload, process.env.JWT_SECRET_ACCESSTOKEN, 
    { 
      expiresIn: '15d',
      issuer: '2ndev' 
    });
}

const generateVerifyEmailToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    // tokenVersion: user.tokenVersion ?? 0,
    purpose: 'verify-email',
  };
  return jswt.sign(
    payload,
    // ✅ fallback nếu bạn chưa set JWT_SECRET_VERIFYEMAIL
    process.env.JWT_SECRET_VERIFYEMAIL || process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    tokenVersion: user.tokenVersion,
  }
  const token = jswt.sign(
    payload,
    process.env.JWT_SECRET_REFRESHTOKEN,
    {
      expiresIn: "15d",
      issuer: '2ndev',
    },
  );
  return token
}

export {
  generateAccessToken, generateRefreshToken, generateVerifyEmailToken
}

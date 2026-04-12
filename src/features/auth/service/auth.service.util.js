import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../../common/config/index.js";

export const createToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const decodeToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (e) {
    return null;
  }
};

export const generateOtpCode = (length = 6, type = "numeric") => {
  const numericChars = "0123456789";
  const alphaNumericChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const characters = type === "numeric" ? numericChars : alphaNumericChars;

  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return otp;
};

export const generatePasswordHash = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

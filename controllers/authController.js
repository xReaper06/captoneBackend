require("dotenv").config();

const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const db = require("../config/dbConnection");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
async function updateUserDetailsBackup(user_id, user_details) {
  let conn;
  try {
    conn = await db.getConnection();
    let [backupA] = await conn.query(
      "SELECT * FROM  userbackup_a WHERE user_id = ?",
      [user_id]
    );
    let [backupB] = await conn.query(
      "SELECT * FROM  userbackup_b WHERE user_id = ?",
      [user_id]
    );
    if (backupA) {
      await conn.query(
        "UPDATE userbackup_a SET user_details = ? WHERE user_id = ?",
        [user_details, user_id]
      );
    } else {
      await conn.query(
        "UPDATE userbackup_b SET user_details = ? WHERE user_id = ?",
        [user_details, user_id]
      );
    }
    const response = await conn.query(
      "UPDATE userbackup_main SET user_details = ? WHERE user_id = ?",
      [user_details, user_id]
    );

    if (response) {
      console.log("Inserted Successfull");
    }
  } catch (error) {
    console.log("Failed Insertion", error);
  } finally {
    conn.release();
  }
}
async function userBackup(user_id, user_details) {
  let conn;
  try {
    conn = await db.getConnection();
    let [backupA] = await conn.query(
      "SELECT COUNT(*) AS count FROM  userbackup_a"
    );
    let [backupB] = await conn.query(
      "SELECT COUNT(*) AS count FROM  userbackup_b"
    );
    const { count: countAValue } = backupA[0];
    const { count: countBValue } = backupB[0];
    if (countAValue > countBValue) {
      await conn.query(
        "INSERT INTO userbackup_b(user_id,user_details,created)VALUES(?,?,now())",
        [user_id, user_details]
      );
    } else if (countAValue < countBValue) {
      await conn.query(
        "INSERT INTO userbackup_a(user_id,user_details,created)VALUES(?,?,now())",
        [user_id, user_details]
      );
    } else {
      await conn.query(
        "INSERT INTO userbackup_a(user_id,user_details,created)VALUES(?,?,now())",
        [user_id, user_details]
      );
    }
    const response = await conn.query(
      "INSERT INTO userbackup_main(user_id,user_details,created)VALUES(?,?,now())",
      [user_id, user_details]
    );

    if (response) {
      console.log("Inserted Successfull");
    }
  } catch (error) {
    console.log("Failed Insertion", error);
  } finally {
    conn.release();
  }
}

function generateRandomVerificationCode() {
  const min = 1000; // Minimum 6-digit number (100000)
  const max = 9999; // Maximum 6-digit number (999999)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const userRegistration = async (req, res) => {
  let conn; // Declare the connection variable outside the try-catch block.
  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const [existingNickname] = await conn.query(
      `SELECT * FROM users WHERE LOWER(nickname) = LOWER(?);`,
      [req.body.nickname]
    );

    if (existingNickname.length > 0) {
      // Check if there are existing nicknames.
      return res.status(409).json({
        msg: "This Nickname is already in use. Please try another one.",
      });
    }

    const [existingUser] = await conn.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER(?);`,
      [req.body.email]
    );

    if (existingUser.length > 0) {
      // Check if there are existing users with the same email.
      return res.status(409).json({
        msg: "This Email is already in use.",
      });
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const newUserResult = await conn.query(
        `INSERT INTO users (nickname,email, password, user_role, createdAt) VALUES (?, ?, ?, 'user', NOW());`,
        [req.body.nickname, req.body.email, hashedPassword]
      );

      await conn.query("INSERT INTO profile_pictures(user_id)VALUES(?);", [
        newUserResult[0].insertId,
      ]);
      // Insert the new user into the database

      // Ensure there is an insertId in the result
      if (!newUserResult[0].insertId) {
        return res.status(500).json({
          msg: "Failed to insert user data.",
        });
      }

      const verificationToken = generateToken(newUserResult[0].insertId);
      const verificationCode = generateRandomVerificationCode();
      await conn.query(
        "INSERT INTO verification_code(user_id,verification_code)VALUES(?,?)",
        [newUserResult[0].insertId, verificationCode]
      );

      const verificationLink = `http://localhost:8080/verifyEmail/${verificationToken}`;

      const mailOptions = {
        from: process.env.MAIL_USER,
        to: req.body.email,
        subject: "Account Verification",
        text: `To verify your account This is your verification code ${verificationCode}, click on the following link: ${verificationLink}`,
      };

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
      const currentTimestamp = Date.now();

      // Create a new Date object using the timestamp
      const currentDate = new Date(currentTimestamp);

      // Use Date methods to get individual components (year, month, day, hours, minutes, seconds)
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Adding 1 because months are zero-based
      const day = currentDate.getDate().toString().padStart(2, "0");
      const hours = currentDate.getHours().toString().padStart(2, "0");
      const minutes = currentDate.getMinutes().toString().padStart(2, "0");
      const seconds = currentDate.getSeconds().toString().padStart(2, "0");

      // Create a formatted date string
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      const user_details = {
        id: newUserResult[0].insertId,
        nickname: req.body.nickname,
        email: req.body.email,
        password: hashedPassword,
        createdAt: formattedDate,
        flag: 1,
        profile_pic: "default.png",
      };
      userBackup(newUserResult[0].insertId, JSON.stringify(user_details));
      return res.status(200).json({
        msg: "The user has been registered with us. Please verify your account.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const login = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const [user] = await conn.query(
      `SELECT id, nickname,email,email_verified, password, user_role,flag FROM users WHERE email = ?`,
      [req.body.email]
    );

    if (!user) {
      return res.status(401).json({
        msg: "Email is incorrect",
      });
    }
    const [profile_pic] = await conn.query(
      "SELECT profile_pic FROM profile_pictures WHERE user_id =?",
      [user[0].id]
    );

    const hashedPassword = user[0].password; // Retrieve hashed password from the database

    if (!hashedPassword) {
      return res.status(404).json({
        msg: "Account is not Registered",
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      hashedPassword
    );

    if (!passwordMatch) {
      return res.status(401).json({
        msg: "Password is incorrect",
      });
    }

    const accessToken = generateAccessToken(user);

    // Generate a refresh token with a longer expiration time
    const refreshToken = jwt.sign(
      { id: user[0].id },
      process.env.REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    // Store the refresh token in your database
    await conn.query(
      `INSERT INTO tokens (user_id, refresh_token, flag) VALUES (?, ?, '1');`,
      [user[0].id, refreshToken]
    );

    // Update last logged in time
    await conn.query(
      `UPDATE users SET lastloggedin = NOW(), status = LOWER('online') WHERE id = ?;`,
      [user[0].id]
    );

    return res.status(200).json({
      msg: "Logged in",
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user[0].id,
        profile_pic: profile_pic[0].profile_pic,
        nickname: user[0].nickname,
        email: user[0].email,
        email_verified: user[0].email_verified,
        user_role: user[0].user_role,
        flag: user[0].flag,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Account is Not Registered",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const generateToken = (user) => {
  return jwt.sign({ id: user }, process.env.ACCESS_TOKEN, { expiresIn: "24h" });
};

const generateAccessToken = (user) => {
  return jwt.sign({ id: user[0].id }, process.env.ACCESS_TOKEN, {
    expiresIn: "30m",
  });
};
const Token = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();
    const refreshTokenResult = await conn.query(
      `SELECT * FROM tokens WHERE refresh_token = ?;`,
      [req.body.token]
    );

    if (!refreshTokenResult || refreshTokenResult.length === 0) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const refreshToken = refreshTokenResult[0][0].refresh_token;
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    const [user] = await conn.query(`SELECT * FROM users WHERE id = ?;`, [
      decoded.id,
    ]);
    const [profile_pic] = await conn.query(
      "SELECT profile_pic FROM profile_pictures WHERE user_id =?;",
      [decoded.id]
    );

    if (!user) {
      return res.status(403).json({
        msg: "User Not Found",
      });
    }

    // Generate a new access token
    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      accessToken: accessToken,
      user: {
        id: user[0].id,
        profile_pic: profile_pic[0].profile_pic,
        nickname: user[0].nickname,
        email: user[0].email,
        email_verified: user[0].email_verified,
        user_role: user[0].user_role,
        flag: user[0].flag,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const logout = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { id } = req.body;
    const removeTokenResult = await conn.query(
      `DELETE FROM tokens WHERE user_id = ?;`,
      [id]
    );
    const updateLogin = await conn.query(
      `UPDATE users SET lastloggedin = now(), status = 'offline' WHERE id = ?`,
      [id]
    );

    if (!removeTokenResult && !updateLogin) {
      return res.status(400).json({
        msg: "Error Logout",
      });
    }

    return res.status(200).json({
      msg: "Logout Successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const forgot_password = async (req, res) => {
  let conn;
  try {
    const { email } = req.body;
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query1 = "SELECT id FROM users WHERE email = ?";
    const result1 = await conn.query(query1, [email]);
    if (result1[0][0]) {
      const verificationToken = generateToken(result1[0][0].id);

      const verificationLink = `http://localhost:8080/change-forgot-password/${verificationToken}`;

      const mailOptions = {
        from: process.env.MAIL_USER,
        to: req.body.email,
        subject: "Forgot Password",
        text: `To change your account Password, click on the following link: ${verificationLink}`,
      };

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
      return res.status(200).json({
        msg: "Goto your email and click the link for change New Password.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const change_forgot_password = async (req, res) => {
  let conn;
  const { password } = req.body;
  try {
    conn = await db.getConnection();
    const query1 = "UPDATE users SET password =? WHERE id = ?";
    const authHeaders = req.headers["authorization"]; // Use lowercase 'authorization'
    const token = authHeaders && authHeaders.split(" ")[1];

    if (token === null) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    if (decoded) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result1 = conn.query(query1, [hashedPassword, decoded.id]);
      if (result1) {
        const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [
          decoded.id,
        ]);
        const [profile] = await conn.query(
          "SELECT * FROM profile_pictures WHERE user_id =?",
          [decoded.id]
        );
        const user_details = {
          id: user[0].id,
          nickname: user[0].nickname,
          email: user[0].email,
          password: hashedPassword,
          createdAt: user[0].createdAt,
          flag: user[0].flag,
          profile_pic: profile[0].profile_pic,
        };
        updateUserDetailsBackup(decoded.id, JSON.stringify(user_details));
        return res.status(200).json({
          msg: "your Password has been Change please Proceed to the log in page",
        });
      }
      return res.status(404).json({
        msg: "Your account is not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const enforcerRegistration = async (req, res) => {
  let conn; // Declare the connection variable outside the try-catch block.
  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const authHeaders = req.headers["authorization"]; // Use lowercase 'authorization'
    const token = authHeaders && authHeaders.split(" ")[1];

    if (token === null) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, process.env.REGISTRATION_TOKEN, (err, decoded) => {
      if (err) {
        // Token is invalid or has expired
        res.status(401).json({ msg: "Invalid or expired token" });
      }
    });
    const [existingNickname] = await conn.query(
      `SELECT * FROM users WHERE LOWER(nickname) = LOWER(?);`,
      [req.body.nickname]
    );

    if (existingNickname.length > 0) {
      // Check if there are existing nicknames.
      return res.status(409).json({
        msg: "This Nickname is already in use. Please try another one.",
      });
    }

    const [existingUser] = await conn.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER(?);`,
      [req.body.email]
    );

    if (existingUser.length > 0) {
      // Check if there are existing users with the same email.
      return res.status(409).json({
        msg: "This Email is already in use.",
      });
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Insert the new user into the database
      const newUserResult = await conn.query(
        `INSERT INTO users (nickname,email, password, user_role, createdAt) VALUES (?, ?, ?, 'enforcer', NOW());`,
        [req.body.nickname, req.body.email, hashedPassword]
      );
      await conn.query("INSERT INTO profile_pictures(user_id)VALUES(?);", [
        newUserResult[0].insertId,
      ]);

      // Ensure there is an insertId in the result
      if (!newUserResult[0].insertId) {
        return res.status(500).json({
          msg: "Failed to insert user data.",
        });
      }

      const verificationToken = generateToken(newUserResult[0].insertId);
      const verificationCode = generateRandomVerificationCode();
      await conn.query(
        "INSERT INTO verification_code(user_id,verification_code)VALUES(?,?)",
        [newUserResult[0].insertId, verificationCode]
      );

      const verificationLink = `http://localhost:8080/verifyEmail/${verificationToken}`;

      const mailOptions = {
        from: process.env.MAIL_USER,
        to: req.body.email,
        subject: "Account Verification",
        text: `To verify your account This is your verification code ${verificationCode}, click on the following link: ${verificationLink}`,
      };

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
      const currentTimestamp = Date.now();

      // Create a new Date object using the timestamp
      const currentDate = new Date(currentTimestamp);

      // Use Date methods to get individual components (year, month, day, hours, minutes, seconds)
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Adding 1 because months are zero-based
      const day = currentDate.getDate().toString().padStart(2, "0");
      const hours = currentDate.getHours().toString().padStart(2, "0");
      const minutes = currentDate.getMinutes().toString().padStart(2, "0");
      const seconds = currentDate.getSeconds().toString().padStart(2, "0");

      // Create a formatted date string
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      const user_details = {
        id: newUserResult[0].insertId,
        nickname: req.body.nickname,
        email: req.body.email,
        password: req.body.password,
        createdAt: formattedDate,
        flag: 1,
        profile_pic: "default.png",
      };
      userBackup(newUserResult[0].insertId, JSON.stringify(user_details));
      return res.status(200).json({
        msg: "The Enforcer has been registered with us. Please verify your account.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const sendRegistrationForm = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const query1 = " SELECT email FROM users WHERE email = ?";
    const result = await conn.query(query1, [req.body.email]);
    if (result[0][0]) {
      return res.status(403).json({
        msg: "This Email is already Registered",
      });
    }
    const token = jwt.sign(
      {
        email: req.body.email,
      },
      process.env.REGISTRATION_TOKEN, // Your JWT secret key
      { expiresIn: "1h" } // Set the expiration time (e.g., 1 hour)
    );

    const verificationLink = `http://localhost:8080/enforcer-registration/${token}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: req.body.email,
      subject: "Enforcer Registration",
      text: `To Hello ${req.body.email}, click the following link to Register: ${verificationLink}`,
    };

    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
    return res.status(200).json({
      msg: `The Link has been Sent to this Email ${req.body.email}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const sendEmailtoVerify = async (req, res) => {
  let conn;
  const { id, email } = req.body;
  try {
    conn = await db.getConnection();
    const verificationToken = generateToken(id);
    let verificationCode = generateRandomVerificationCode();
    const [result] = await conn.query(
      "SELECT * FROM verification_code WHERE verification_code = ?",
      [verificationCode]
    );
    if (result) {
      verificationCode = generateRandomVerificationCode();
    }
    await conn.query(
      "INSERT INTO verification_code(user_id,verification_code)VALUES(?,?)",
      [id, verificationCode]
    );

    const verificationLink = `http://localhost:8080/verifyEmail/${verificationToken}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Account Verification",
      text: `To verify your account This is your verification code ${verificationCode}, click on the following link: ${verificationLink}`,
    };

    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
    return res.status(200).json({
      msg: "The check your Email. Please verify your account.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

module.exports = {
  userRegistration,
  login,
  Token,
  logout,
  forgot_password,
  change_forgot_password,
  enforcerRegistration,
  sendRegistrationForm,
  sendEmailtoVerify,
};

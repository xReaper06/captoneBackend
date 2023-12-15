const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const db = require("../config/dbConnection");
const jwt = require("jsonwebtoken");

async function violationBackup(violation_id, violation_details) {
  let conn;
  try {
    conn = await db.getConnection();
    let [backupA] = await conn.query(
      "SELECT COUNT(*) AS count FROM violationbackup_a"
    );
    let [backupB] = await conn.query(
      "SELECT COUNT(*) AS count FROM violationbackup_b"
    );
    const { count: countAValue } = backupA[0];
    const { count: countBValue } = backupB[0];
    if (countAValue < countBValue) {
      await conn.query(
        "INSERT INTO violationbackup_a(violation_id,violation_details,created)VALUES(?,?,now())",
        [violation_id, violation_details]
      );
    } else if (countAValue > countBValue) {
      await conn.query(
        "INSERT INTO violationbackup_b(violation_id,violation_details,created)VALUES(?,?,now())",
        [violation_id, violation_details]
      );
    } else {
      await conn.query(
        "INSERT INTO violationbackup_a(violation_id,violation_details,created)VALUES(?,?,now())",
        [violation_id, violation_details]
      );
    }
    const response = await conn.query(
      "INSERT INTO violationbackup_main(violation_id,violation_details,created)VALUES(?,?,now())",
      [violation_id, violation_details]
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
async function licenseBackup(user_id, license_details) {
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
        "UPDATE userbackup_a SET license_details = ? WHERE user_id = ?",
        [license_details, user_id]
      );
    } else {
      await conn.query(
        "UPDATE userbackup_b SET license_details = ? WHERE user_id = ?",
        [license_details, user_id]
      );
    }
    const response = await conn.query(
      "UPDATE userbackup_main SET license_details = ? WHERE user_id = ?",
      [license_details, user_id]
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
const updateLicense = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const result = await conn.query(
      "UPDATE driverslicense SET front_pic = ?, back_pic = ?, expiration_date = ? WHERE user_id = ?",
      [
        `images/${req.files.front_pic[0].originalname}`,
        `images/${req.files.back_pic[0].originalname}`,
        req.body.expiration_date,
        req.body.user_id,
      ]
    );
    const [license] = await conn.query(
      "SELECT * FROM driverslicense WHERE user_id = ?",
      [req.body.user_id]
    );
    if (result) {
      const licenseDetails = {
        user_id: license[0].user_id,
        front_pic: license[0].front_pic,
        back_pic: license[0].back_pic,
        license_no: license[0].license_no,
        expiration_date: license[0].expiration_date,
        agency_code: license[0].agency_code,
        blood_type: license[0].blood_type,
        eye_color: license[0].eye_color,
        restrictions: license[0].restrictions,
        conditions: license[0].conditions,
        first_name: license[0].first_name,
        last_name: license[0].last_name,
        middle_name: license[0].middle_name,
        nationality: license[0].nationality,
        sex: license[0].sex,
        date_of_birth: license[0].date_of_birth,
        weight: license[0].weight,
        height: license[0].height,
        street: license[0].street,
        baranggay: license[0].baranggay,
        city: license[0].city,
        province: license[0].province,
      };
      licenseBackup(license[0].user_id, JSON.stringify(licenseDetails));
      return res.status(200).json({
        msg: "Updated Successfully",
      });
    } else {
      return res.status(403).json({
        msg: "Updated Failed",
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
// verifyLicense
const verifyLicense = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if the license number is already in use
    const [existingLicense] = await conn.query(
      `SELECT license_no FROM driverslicense WHERE license_no = ?`,
      [req.body.license_no]
    );

    if (existingLicense[0] > -1) {
      return res.status(403).json({
        msg: "This License Number is Already in Use",
      });
    } else {
      // Insert the new license data into the database
      const insertQuery = `
                INSERT INTO driverslicense (
                    user_id,
                    front_pic,
                    back_pic,
                    license_no,
                    expiration_date,
                    agency_code,
                    blood_type,
                    eye_color,
                    restrictions,
                    conditions,
                    first_name,
                    last_name,
                    middle_name,
                    nationality,
                    sex,
                    date_of_birth,
                    weight,
                    height,
                    street,
                    baranggay,
                    city,
                    province,
                    is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`;

      const insertValues = [
        req.body.user_id,
        `images/${req.files.front_pic[0].originalname}`,
        `images/${req.files.back_pic[0].originalname}`,
        req.body.license_no,
        req.body.expiration_date,
        req.body.agency_code,
        req.body.blood_type,
        req.body.eye_color,
        req.body.restrictions,
        req.body.conditions,
        req.body.first_name,
        req.body.last_name,
        req.body.middle_name,
        req.body.nationality,
        req.body.sex,
        req.body.date_of_birth,
        `${req.body.weight}kg`,
        `${req.body.height}m`,
        req.body.street,
        req.body.baranggay,
        req.body.city,
        req.body.province,
      ];

      const [resultInsert] = await conn.query(insertQuery, insertValues);

      // Insert a notification
      const notificationQuery = `
                INSERT INTO notifications (receiver, message, date_release)
                VALUES (?, ?, NOW());`;

      const notificationValues = [
        req.body.user_id,
        "Your Drivers License has been processed for Verification",
      ];

      const resultInsert2 = await conn.query(
        notificationQuery,
        notificationValues
      );
      const licenseDetails = {
        user_id: req.body.user_id,
        front_pic: `images/${req.files.front_pic[0].originalname}`,
        back_pic: `images/${req.files.back_pic[0].originalname}`,
        license_no: req.body.license_no,
        expiration_date: req.body.expiration_date,
        agency_code: req.body.agency_code,
        blood_type: req.body.blood_type,
        eye_color: req.body.eye_color,
        restrictions: req.body.restrictions,
        conditions: req.body.conditions,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        middle_name: req.body.middle_name,
        nationality: req.body.nationality,
        sex: req.body.sex,
        date_of_birth: req.body.date_of_birth,
        weight: req.body.weight,
        height: req.body.height,
        street: req.body.street,
        baranggay: req.body.baranggay,
        city: req.body.city,
        province: req.body.province,
      };

      licenseBackup(req.body.user_id, JSON.stringify(licenseDetails));

      return res.status(200).json({
        msg: "Successful",
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

const notification = async (req, res) => {
  let conn;
  const errors = validationResult(req);
  const { user_id } = req.body;

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT * FROM notifications WHERE receiver = ${user_id}`
    );
    return res.status(200).json({
      notifications: result,
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

const myLicense = async (req, res) => {
  let conn;
  const errors = validationResult(req);
  const { user_id } = req.body;

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    conn = await db.getConnection();

    const [result] = await conn.query(
      `SELECT * FROM driverslicense WHERE user_id = ?`,
      [user_id]
    );

    return res.status(200).json({
      myLicense: result,
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
const getAllLicenseVerified = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    const [results] = await conn.query(
      "SELECT * FROM driverslicense WHERE is_verified = 2;"
    );
    res.status(200).json({ msg: "success", licenses: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const getAllLicenseNotYetVerified = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    const [results] = await conn.query(
      "SELECT * FROM driverslicense WHERE is_verified = 0;"
    );
    res.status(200).json({ msg: "success", licenses: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const getAllLicenseByID = async (req, res) => {
  const id = req.params.id;
  let conn;

  try {
    conn = await db.getConnection();

    const [results] = await conn.query(
      "SELECT * FROM driverslicense WHERE id = ?",
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ msg: "License not found" });
    }

    res.status(200).json({ msg: "success", license: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const verifiedLicense = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const updateQuery =
      "UPDATE driverslicense SET is_verified = 2, date_verified = NOW() WHERE id = ?";
    const [result] = await conn.query(updateQuery, [req.body.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "License Invalid" });
    }

    const notificationQuery =
      "INSERT INTO notifications (receiver, message, date_release) VALUES (?, ?, NOW())";
    await conn.query(notificationQuery, [
      req.body.user_id,
      "Your Drivers License is Verified",
    ]);

    res.status(200).json({ msg: "License Verified" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const denyVerification = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const deleteQuery = "DELETE FROM driverslicense WHERE id = ?";
    const [result] = await conn.query(deleteQuery, [req.body.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Invalid Verification" });
    }

    const notificationQuery =
      "INSERT INTO notifications (receiver, message, date_release) VALUES (?, ?, NOW())";
    await conn.query(notificationQuery, [
      req.body.user_id,
      "Your Drivers License has been Deny",
    ]);

    res.status(200).json({ msg: "Denying Verification Successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const insertViolations = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const selectQuery = "SELECT * FROM violations WHERE UPPER(code) = UPPER(?)";
    const [result] = await conn.query(selectQuery, [req.body.code]);

    if (result.length) {
      return res
        .status(409)
        .json({ msg: "This Violation is already inserted" });
    }

    const insertQuery =
      'INSERT INTO violations (code, name, fine, status, date_created) VALUES (?, ?, ?, "newlyInserted", NOW())';
    await conn.query(insertQuery, [
      req.body.code,
      req.body.name,
      req.body.fine,
    ]);

    return res.status(201).json({ msg: "Violation Inserted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const updateViolationStatus = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const { id, status } = req.body;

    const updateQuery =
      "UPDATE violations SET status = ?, date_updated = NOW() WHERE id = ?";
    const [result] = await conn.query(updateQuery, [status, id]);
    if (result) {
      return res.status(200).json({ msg: "Updated Successfully" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const deleteViolationList = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const deleteQuery = "DELETE FROM violations WHERE id = ?";
    const [result] = await conn.query(deleteQuery, [req.body.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Error Deletion" });
    }

    return res.status(200).json({ msg: "Deleted Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const getAllViolationsList = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const getQuery = `SELECT * FROM violations WHERE status = 'implemented';`;
    const [result] = await conn.query(getQuery);
    return res.status(200).json({ violationList: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const AllViolationsList = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const getQuery = "SELECT * FROM violations;";
    const [result] = await conn.query(getQuery);
    return res.status(200).json({ violationList: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const markNotificationAsRead = async (req, res) => {
  let conn;
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    conn = await db.getConnection();
    const updateQuery = "UPDATE notifications SET isRead = 1 WHERE id = ?";
    const [result] = await conn.query(updateQuery, [req.body.id]);
    if (result) {
      return res.status(200).json({
        msg: "Read Successfully",
      });
    } else {
      return res.status(404).json({
        msg: "Read Failed",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const getAllUsers = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const getQuery = 'SELECT * FROM users WHERE user_role = "user";';
    const [result] = await conn.query(getQuery);
    console.log(!result);
    return res.status(200).json({ allUsers: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const getAllEnforcer = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const getQuery = 'SELECT * FROM users WHERE user_role = "enforcer";';
    const [result] = await conn.query(getQuery);
    console.log(!result);
    return res.status(200).json({ allEnforcers: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const removeEnforcer = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const deleteQuery =
      "UPDATE users SET status = 'deleted', flag = 2 WHERE id = ?";
    const [result] = await conn.query(deleteQuery, [req.body.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Removing Unsuccessful" });
    }
    const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [
      req.body.id,
    ]);
    const [profile] = await conn.query(
      "SELECT * FROM profile_pictures WHERE user_id =?",
      [req.body.id]
    );
    const user_details = {
      id: user[0].id,
      nickname: user[0].nickname,
      email: user[0].email,
      password: req.body.password,
      createdAt: user[0].createdAt,
      flag: 2,
      profile_pic: profile[0].profile_pic,
    };
    updateUserDetailsBackup(req.body.id, JSON.stringify(user_details));
    res
      .status(200)
      .json({ msg: "Successfully Removed from the Enforcers List" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
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

    // Check if the username is already in use
    const existingUser = await conn.query(
      `SELECT * FROM users WHERE LOWER(username) = LOWER(?);`,
      [req.body.username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        msg: "This Username is already in Use!",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Insert the new user into the database
    const newUserResult = await conn.query(
      `INSERT INTO users (username, password, user_role, createdAt) VALUES (?, ?, 'user', NOW());`,
      [req.body.username, hashedPassword]
    );

    // Insert the user's password into the savepasswords table
    await conn.query(
      `INSERT INTO savepasswords (user_id, last_password, date_created) VALUES (?, ?, NOW());`,
      [newUserResult.insertId, req.body.password]
    );

    return res.status(200).json({
      msg: "The user has been registered with us!",
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

const getAllViolators = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const dbQuery = "SELECT * from violators";
    const [result] = await conn.query(dbQuery);
    if (result) {
      res.status(200).json({ violators: result });
    } else {
      res.status(401).json({ msg: "Error" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const getAllViolatorsNormal = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const dbQuery = `SELECT * FROM violators WHERE status = 'normal'`;
    const [result] = await conn.query(dbQuery);
    if (result) {
      res.status(200).json({ violators: result });
    } else {
      res.status(401).json({ msg: "Error" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const getAllPaidViolatorsNormal = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const dbQuery = `SELECT * FROM violators WHERE status = 'normal' AND is_paid = 1`;
    const [result] = await conn.query(dbQuery);
    if (result) {
      res.status(200).json({ violators: result });
    } else {
      res.status(401).json({ msg: "Error" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
};
const getAllViolatorsImpound = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const dbQuery = `SELECT * FROM violators WHERE status = 'impound'`;
    const [result] = await conn.query(dbQuery);
    if (result) {
      res.status(200).json({ violators: result });
    } else {
      res.status(401).json({ msg: "Error" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const getUserViolation = async (req, res) => {
  let conn;
  const { violations_id } = req.body;
  try {
    conn = await db.getConnection();
    const dbQuery1 =
      "SELECT * FROM specific_violations WHERE violations_id = ?";
    const dbQuery2 = "SELECT * FROM evidences WHERE violations_id = ?";
    const [result1] = await conn.query(dbQuery1, [violations_id]);
    const [result2] = await conn.query(dbQuery2, [violations_id]);
    if (result1 && result2) {
      res.status(200).json({
        userViolations: result1,
        evidences: result2,
      });
    } else {
      res.status(401).json({ msg: "Error" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

const insertViolators = async (req, res) => {
  let conn;
  const {
    ticket_no,
    license_no,
    unit,
    specific_violations,
    fines,
    place_of_violation,
    apprehending_officer,
    name_of_driver,
  } = req.body;
  const { evidences } = req.files;
  try {
    conn = await db.getConnection();
    const check = await conn.query(
      `SELECT ticket_no FROM violators WHERE ticket_no = ${ticket_no}`
    );
    if (check[0] && check[0].length > 0) {
      return res.status(400).json({
        msg: "Ticket Number is already used",
      });
    } else {
      const query1 =
        'INSERT INTO violators(ticket_no,license_no,unit,place_of_violation,date_and_time,apprehending_officer,name_of_driver,status)VALUES(?,?,?,?,now(),?,?,"normal")';
      const query2 =
        'INSERT INTO specific_violations(violations_id,name,fine,status)VALUES(?,?,?,"notpaid")';
      const query3 =
        "INSERT INTO evidences(violations_id,images,date_created)VALUES(?,?,now())";
      const result1 = await conn.query(query1, [
        ticket_no,
        license_no,
        unit,
        place_of_violation,
        apprehending_officer,
        name_of_driver,
      ]);
      let result2;
      let result3;
      if (Array.isArray(specific_violations)) {
        for (let i = 0; i < specific_violations.length && fines.length; i++) {
          const data = specific_violations[i];
          const fine = fines[i];
          result2 = await conn.query(query2, [result1[0].insertId, data, fine]);
        }
      } else {
        result2 = await conn.query(query2, [
          result1[0].insertId,
          specific_violations,
          fines,
        ]);
      }

      if (Array.isArray) {
        for (let i = 0; i < evidences.length; i++) {
          result3 = await conn.query(query3, [
            result1[0].insertId,
            `images/${evidences[i].originalname}`,
          ]);
        }
      } else {
        result3 = await conn.query(query3, [
          result1[0].insertId,
          `images/${evidences[0].originalname}`,
        ]);
      }

      if (
        result1[0].affectedRows > 0 &&
        result2[0].affectedRows > 0 &&
        result3[0].affectedRows > 0
      ) {
        const [violationsData] = await conn.query(
          "SELECT * FROM specific_violations WHERE violations_id = ?",
          [result1[0].insertId]
        );
        const [evidencesData] = await conn.query(
          "SELECT * FROM evidences WHERE violations_id = ?",
          [result1[0].insertId]
        );

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
        const violations_details = {
          id: result1[0].insertId,
          ticket_no: ticket_no,
          license_no: license_no,
          unit: unit,
          place_of_violation: place_of_violation,
          date_and_time: formattedDate,
          apprehending_officer: apprehending_officer,
          name_of_driver: name_of_driver,
          status: "notpaid",
          specific_violations: violationsData,
          evidences: evidencesData,
        };
        violationBackup(
          result1[0].insertId,
          JSON.stringify(violations_details)
        );
        return res.status(201).json({
          msg: "Inserted Successfully",
        });
      } else {
        return res.status(404).json({
          msg: "Error Inserted",
        });
      }
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
const impoundCitation = async (req, res) => {
  let conn;
  try {
    const {
      ticket_no,
      unit,
      place_of_violation,
      apprehending_officer,
      specific_violations,
      fines,
      name_of_driver,
    } = req.body;
    const { evidences } = req.files;

    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const check = await conn.query(
      `SELECT ticket_no FROM violators WHERE ticket_no = ${ticket_no}`
    );
    if (check[0] && check[0].length > 0) {
      return res.status(400).json({
        msg: "Ticket Number is already used",
      });
    } else {
      const query1 =
        'INSERT INTO violators(ticket_no,unit,place_of_violation,date_and_time,apprehending_officer,name_of_driver,status)VALUES(?,?,?,now(),?,?,"impound");';
      const query2 =
        'INSERT INTO specific_violations(violations_id,name,fine,status)VALUES(?,?,?,"notpaid")';
      const query3 =
        "INSERT INTO evidences(violations_id,images,date_created)VALUES(?,?,now())";
      const result1 = await conn.query(query1, [
        ticket_no,
        unit,
        place_of_violation,
        apprehending_officer,
        name_of_driver,
      ]);
      let result2;
      let result3;
      console.log(specific_violations);
      if (Array.isArray(specific_violations)) {
        for (let i = 0; i < specific_violations.length && fines.length; i++) {
          const data = specific_violations[i];
          const fine = fines[i];
          result2 = await conn.query(query2, [result1[0].insertId, data, fine]);
        }
      } else {
        result2 = await conn.query(query2, [
          result1[0].insertId,
          specific_violations,
          fines,
        ]);
      }

      result3 = await conn.query(query3, [
        result1[0].insertId,
        `images/${evidences[0].originalname}`,
      ]);
      if (
        result1[0].affectedRows > 0 &&
        result2[0].affectedRows > 0 &&
        result3[0].affectedRows > 0
      ) {
        const [violationsData] = await conn.query(
          "SELECT * FROM specific_violations WHERE violations_id = ?",
          [result1[0].insertId]
        );
        const [evidencesData] = await conn.query(
          "SELECT * FROM evidences WHERE violations_id = ?",
          [result1[0].insertId]
        );

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
        const violations_details = {
          id: result1[0].insertId,
          ticket_no: ticket_no,
          unit: unit,
          place_of_violation: place_of_violation,
          date_and_time: formattedDate,
          apprehending_officer: apprehending_officer,
          name_of_driver: name_of_driver,
          status: "notpaid",
          specific_violations: violationsData,
          evidences: evidencesData,
        };
        violationBackup(
          result1[0].insertId,
          JSON.stringify(violations_details)
        );
        return res.status(201).json({
          msg: "Inserted Successfully",
        });
      } else {
        return res.status(404).json({
          msg: "Error Inserted",
        });
      }
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
const myViolation = async (req, res) => {
  let conn;
  const { license_no } = req.body;
  try {
    conn = await db.getConnection();
    const [result1] = await conn.query(
      "SELECT date_verified FROM driverslicense WHERE license_no =?",
      [license_no]
    );
    if (result1[0].date_verified == null) {
      return res.status(203).json({
        msg: "Your License is not Verified by Admin",
      });
    } else {
      const query1 = `SELECT * FROM violators WHERE license_no = ?;`;
      const [result] = await conn.query(query1, [license_no]);
      if (result) {
        return res.status(200).json({
          myViolation: result,
        });
      }
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

const verifyEmail = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { verification_code } = req.body;
    const query1 = "UPDATE users SET email_verified = NOW() WHERE id = ?";
    const query2 =
      "SELECT * FROM verification_code WHERE verification_code = ?";

    const result = await conn.query(query2, [verification_code]);
    if (result.length > 0) {
      const result2 = await conn.query(query1, [result[0][0].user_id]);

      if (result2[0].affectedRows > 0) {
      }
      return res.status(200).json({
        msg: "Email Successfully Verified",
      });
    } else {
      return res.status(404).json({
        msg: "Error",
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
const changeProfilePic = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const [response] = await conn.query(
      "UPDATE profile_pictures SET profile_pic = ? WHERE user_id = ?",
      [req.files.profile_pic[0].originalname, req.body.user_id]
    );
    if (response.affectedRows > 0) {
      const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [
        req.body.user_id,
      ]);
      const user_details = {
        id: user[0].id,
        nickname: user[0].nickname,
        email: user[0].email,
        password: user[0].password,
        createdAt: user[0].createdAt,
        flag: user[0].flag,
        profile_pic: req.files.profile_pic[0].originalname,
      };
      updateUserDetailsBackup(req.body.user_id, JSON.stringify(user_details));
      return res.status(200).json({
        msg: "Changing Profile Successfully log Out first to view Results",
      });
    } else {
      return res.status(403).json({
        msg: "Failed to change Profile",
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

const changePassword = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const [response1] = await conn.query("SELECT * FROM users WHERE id = ?", [
      req.body.user_id,
    ]);
    const comparePassword = await bcrypt.compare(
      req.body.password,
      response1[0].password
    );
    if (comparePassword == true) {
      return res.status(401).json({
        msg: "Password is already in use",
      });
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const [response2] = await conn.query(
        "UPDATE users SET password=? WHERE id = ?",
        [hashedPassword, req.body.user_id]
      );
      if (response2.affectedRows > 0) {
        const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [
          req.body.user_id,
        ]);
        const [profile] = await conn.query(
          "SELECT * FROM profile_pictures WHERE user_id =?",
          [req.body.user_id]
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
        updateUserDetailsBackup(req.body.user_id, JSON.stringify(user_details));
        return res.status(200).json({
          msg: "Change Password Successfully",
        });
      }
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
const disableUser = async (req, res) => {
  let conn;
  const { id } = req.body;
  try {
    conn = await db.getConnection();
    const [result] = await conn.query(
      "UPDATE users SET flag = 0 WHERE id = ?",
      [id]
    );
    if (result) {
      const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [id]);
      const [profile] = await conn.query(
        "SELECT * FROM profile_pictures WHERE user_id =?",
        [id]
      );
      const user_details = {
        id: user[0].id,
        nickname: user[0].nickname,
        email: user[0].email,
        password: user[0].password,
        createdAt: user[0].createdAt,
        flag: 0,
        profile_pic: profile[0].profile_pic,
      };
      updateUserDetailsBackup(id, JSON.stringify(user_details));
      return res.status(200).json({
        msg: "Account is Temporary Banned",
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
const enableUser = async (req, res) => {
  let conn;
  const { id } = req.body;
  try {
    conn = await db.getConnection();
    const [result] = await conn.query(
      "UPDATE users SET flag = 1 WHERE id = ?",
      [id]
    );
    if (result) {
      const [user] = await conn.query("SELECT * FROM users WHERE id = ?", [id]);
      const [profile] = await conn.query(
        "SELECT * FROM profile_pictures WHERE user_id =?",
        [id]
      );
      const user_details = {
        id: user[0].id,
        nickname: user[0].nickname,
        email: user[0].email,
        password: user[0].password,
        createdAt: user[0].createdAt,
        flag: 1,
        profile_pic: profile[0].profile_pic,
      };
      updateUserDetailsBackup(id, JSON.stringify(user_details));
      return res.status(200).json({
        msg: "Account is Enabled",
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
const getAllViolationsbyYear = async(req,res)=>{
  let conn;
  try {
    const {year} = req.body;
    console.log(year)
    conn = await db.getConnection();
    const [data] = await conn.query('SELECT * FROM violators WHERE YEAR(date_and_time)=?',[year])
    console.log(data)
    if(!data){
      return res.status(404).json({
        msg:'Not Found'
      })
    }else{
      return res.status(200).json({
        dateViolators:data
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally{
    if (conn) {
      conn.release();
    }
  }
}
const paidThisViolation = async(req,res)=>{
  let conn;
  try {
    const {violations_id,or_no} = req.body;
    conn = await db.getConnection();
    const [status] = await conn.query('SELECT * FROM violators WHERE id = ?',[violations_id]);
    if(status[0].status == 'normal'){
      const data = await conn.query('UPDATE violators SET is_paid = 1,or_no = ?,date_paid = now() WHERE id = ?',[or_no,violations_id])
      if(data){
        return res.status(200).json({
          msg:'Violation Paid'
        })
      }else{
        return res.status(404).json({
          msg:'id not found'
        })
      }
    }else{
      const data = await conn.query('UPDATE violators SET is_paid = 1, date_release = now() WHERE id = ?',[violations_id])
      if(data){
        return res.status(200).json({
          msg:'Vioaltion Paid'
        })
      }else{
        return res.status(404).json({
          msg:'id not found'
        })
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally{
    if (conn) {
      conn.release();
    }
  }
}
const adminNormalCitation = async(req,res)=>{
  let conn;
  const {
    ticket_no,
    license_no,
    unit,
    specific_violations,
    fines,
    place_of_violation,
    apprehending_officer,
    name_of_driver,
  } = req.body;
  console.log(req.body)
  try {
    conn = await db.getConnection();
    const check = await conn.query(
      `SELECT ticket_no FROM violators WHERE ticket_no = ${ticket_no}`
    );
    if (check[0] && check[0].length > 0) {
      return res.status(400).json({
        msg: "Ticket Number is already used",
      });
    } else {
      const query1 =
        'INSERT INTO violators(ticket_no,license_no,unit,place_of_violation,date_and_time,apprehending_officer,name_of_driver,status)VALUES(?,?,?,?,now(),?,?,"normal")';
      const query2 =
        'INSERT INTO specific_violations(violations_id,name,fine,status)VALUES(?,?,?,"notpaid")';
      
      const result1 = await conn.query(query1, [
        ticket_no,
        license_no,
        unit,
        place_of_violation,
        apprehending_officer,
        name_of_driver,
      ]);
      let result2;
      if (Array.isArray(specific_violations)) {
        for (let i = 0; i < specific_violations.length && fines.length; i++) {
          const data = specific_violations[i];
          const fine = fines[i];
          result2 = await conn.query(query2, [result1[0].insertId, data, fine]);
        }
      } else {
        result2 = await conn.query(query2, [
          result1[0].insertId,
          specific_violations,
          fines,
        ]);
      }
      if (
        result1[0].affectedRows > 0 &&
        result2[0].affectedRows > 0 
      ) {
        const [violationsData] = await conn.query(
          "SELECT * FROM specific_violations WHERE violations_id = ?",
          [result1[0].insertId]
        );

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
        const violations_details = {
          id: result1[0].insertId,
          ticket_no: ticket_no,
          license_no: license_no,
          unit: unit,
          place_of_violation: place_of_violation,
          date_and_time: formattedDate,
          apprehending_officer: apprehending_officer,
          name_of_driver: name_of_driver,
          status: "notpaid",
          specific_violations: violationsData,
        };
        violationBackup(
          result1[0].insertId,
          JSON.stringify(violations_details)
        );
        return res.status(201).json({
          msg: "Inserted Successfully",
        });
      } else {
        return res.status(404).json({
          msg: "Error Inserted",
        });
      }
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
}
const adminImpoundCitation = async(req,res)=>{
  let conn;
  const {
    ticket_no,
    license_no,
    unit,
    specific_violations,
    fines,
    place_of_violation,
    apprehending_officer,
    name_of_driver,
  } = req.body;
  try {
    conn = await db.getConnection();
    const check = await conn.query(
      `SELECT ticket_no FROM violators WHERE ticket_no = ${ticket_no}`
    );
    if (check[0] && check[0].length > 0) {
      return res.status(400).json({
        msg: "Ticket Number is already used",
      });
    } else {
      const query1 =
        'INSERT INTO violators(ticket_no,unit,place_of_violation,date_and_time,apprehending_officer,name_of_driver,status)VALUES(?,?,?,now(),?,?,"impound")';
      const query2 =
        'INSERT INTO specific_violations(violations_id,name,fine,status)VALUES(?,?,?,"notpaid")';
      
      const result1 = await conn.query(query1, [
        ticket_no,
        license_no,
        unit,
        place_of_violation,
        apprehending_officer,
        name_of_driver,
      ]);
      let result2;
      if (Array.isArray(specific_violations)) {
        for (let i = 0; i < specific_violations.length && fines.length; i++) {
          const data = specific_violations[i];
          const fine = fines[i];
          result2 = await conn.query(query2, [result1[0].insertId, data, fine]);
        }
      } else {
        result2 = await conn.query(query2, [
          result1[0].insertId,
          specific_violations,
          fines,
        ]);
      }
      if (
        result1[0].affectedRows > 0 &&
        result2[0].affectedRows > 0 
      ) {
        const [violationsData] = await conn.query(
          "SELECT * FROM specific_violations WHERE violations_id = ?",
          [result1[0].insertId]
        );

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
        const violations_details = {
          id: result1[0].insertId,
          ticket_no: ticket_no,
          license_no: license_no,
          unit: unit,
          place_of_violation: place_of_violation,
          date_and_time: formattedDate,
          apprehending_officer: apprehending_officer,
          name_of_driver: name_of_driver,
          status: "notpaid",
          specific_violations: violationsData,
        };
        violationBackup(
          result1[0].insertId,
          JSON.stringify(violations_details)
        );
        return res.status(201).json({
          msg: "Inserted Successfully",
        });
      } else {
        return res.status(404).json({
          msg: "Error Inserted",
        });
      }
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
}
const enforcerRecentAdded = async(req,res)=>{
  let conn;
  try {
    const {apprehending_officer} = req.body;
    conn = await db.getConnection()
    const [result] = await conn.query('SELECT * FROM violators WHERE apprehending_officer = ? ORDER BY date_and_time DESC',[apprehending_officer])
    if(result){
      return res.status(200).json({
        recentAdded:result
      })
    }else{
      return res.status(404).json({
        msg:'Data Not Found'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const createAnnouncement = async(req,res)=>{
  let conn;
  try {
    const {title,content} = req.body;
    conn = await db.getConnection();
    const result = await conn.query('INSERT INTO announcement(title,content,created)VALUES(?,?,now())',[title,content]);
    if(result){
      return res.status(201).json({
        msg:'Announcement Created'
      })
    }else{
      return res.status(400).json({
        msg:'Error Insert'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const updateAnnouncement = async(req,res)=>{
  let conn;
  try {
    const {title,content,id} = req.body;
    conn = await db.getConnection();
    const result = await conn.query('UPDATE announcement SET title = ?, content = ?, updated = now() WHERE id = ?',[title,content,id]);
    if(result){
      return res.status(201).json({
        msg:'Announcement Updated'
      })
    }else{
      return res.status(400).json({
        msg:'Error Update'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const getAnnouncement = async(req,res)=>{
  let conn;
  try {
    conn = await db.getConnection();
    const [result] = await conn.query('SELECT * FROM announcement ORDER BY id DESC')
    if(result){
      return res.status(200).json({
        announcement:result
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const removeAnnouncement = async(req,res)=>{
  let conn;
  try {
    conn = await db.getConnection();
    const {id} = req.body
    const [result] = await conn.query('DELETE FROM announcement WHERE id = ?',[id])
    if(result){
      return res.status(200).json({
        msg:'Announcement is Removed'
      })
    }else{
      return res.status(404).json({
        msg:'Announcement is notFound'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const enforcerInfo = async(req,res)=>{
  let conn;
  try {
    const {user_id,first_name,last_name,middle_name,birthday,sex} = req.body;
    conn = await db.getConnection();
    const result = await conn.query('INSERT INTO enforcers_info(user_id,first_name,last_name,middle_name,birthday,sex)VALUES(?,?,?,?,?,?)',[
      user_id,first_name,last_name,middle_name,birthday,sex
    ])
    if(result){
      return res.status(201).json({
        msg:'Info Inserted'
      })
    }else{
      return res.status(400).json({
        msg:'Error Info'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const getEnforcerInfo = async(req,res)=>{
  let conn;
  try {
    const {user_id} = req.body;
    conn = await db.getConnection();
    const [result] = await conn.query('SELECT * FROM enforcers_info WHERE user_id = ?',[
      user_id
    ])
    if(result){
      return res.status(200).json({
        info:result
      })
    }else{
      return res.status(404).json({
        msg:'Enforcer Info Not Found'
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const updateRecent = async(req,res)=>{
  let conn;
  try {
    const {id,ticket_no,license_no,unit,place_of_violation,name_of_driver,status} = req.body;
    conn = await db.getConnection();
    if(status == 'normal'){   
      const result = await conn.query('UPDATE violators SET ticket_no = ?,license_no = ?, unit = ?, place_of_violation = ?, name_of_driver = ? WHERE id = ?',[
        ticket_no,license_no,unit,place_of_violation,name_of_driver,id
      ])
      if(result){
        return res.status(201).json({
          msg:'Updated Successfully'
        })
      }else{
        return res.status(400).json({
          msg:'Error Update'
        })
      }
    }else{
      const result = await conn.query('UPDATE violators SET ticket_no = ?,unit = ?, place_of_violation = ?, name_of_driver = ? WHERE id = ?',[
        ticket_no,unit,place_of_violation,name_of_driver,id
      ])
      if(result){
        return res.status(201).json({
          msg:'Updated Successfully'
        })
      }else{
        return res.status(400).json({
          msg:'Error Update'
        })
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}
const getSpecificViolation = async(req,res)=>{
  let conn;
  try {
    conn = await db.getConnection()
    const [result] = await conn.query('SELECT * FROM specific_violations')
    if(result){
      return res.status(200).json({
        specific_violations:result
      })
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
    });
  }finally {
    if (conn) {
      conn.release();
    }
  }
}


module.exports = {
  verifyLicense,
  myLicense,
  getAllLicenseVerified,
  getAllLicenseNotYetVerified,
  notification,
  verifiedLicense,
  denyVerification,
  insertViolations,
  getAllViolationsList,
  getAllUsers,
  updateViolationStatus,
  deleteViolationList,
  getAllEnforcer,
  removeEnforcer,
  enforcerRegistration,
  getAllLicenseByID,
  getAllViolators,
  getAllViolatorsImpound,
  getAllViolatorsNormal,
  getAllPaidViolatorsNormal,
  insertViolators,
  impoundCitation,
  myViolation,
  verifyEmail,
  changeProfilePic,
  changePassword,
  markNotificationAsRead,
  getUserViolation,
  disableUser,
  enableUser,
  AllViolationsList,
  updateLicense,
  getAllViolationsbyYear,
  paidThisViolation,
  adminImpoundCitation,
  adminNormalCitation,
  enforcerRecentAdded,
  createAnnouncement,
  getAnnouncement,
  updateAnnouncement,
  removeAnnouncement,
  enforcerInfo,
  getEnforcerInfo,
  updateRecent,
  getSpecificViolation,
};

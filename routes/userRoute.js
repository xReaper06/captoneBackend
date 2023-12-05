const express = require('express')
const router = express.Router();
const path = require('path')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/images'); // Adjust the destination folder as needed
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname);
    },
  });
  const fileFilter = (req, file, cb) => {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };

  const upload = multer({ storage: storage, fileFilter: fileFilter });

const {
  signUpValidation,
  verifyLicenseValidation,
  user_idValidation,
  verifiedLicense,
  denyVerification,
  insertViolations,
  updateViolationStatus,
  idValidation,
  verifyEmail,
  impoundCitation,
  changePasswordValidation,
  checkUpdateLicense,
 
 } = require('../helpers/validator')
const userController = require('../controllers/userController')
const TokenValidity = require('../middleware/tokenValidity')

router.post('/verifyLicense',
    upload.fields([
    {name: 'front_pic', maxCount: 1},
    {name: 'back_pic', maxCount: 1},
    ]),
    TokenValidity.verifyToken,  
    verifyLicenseValidation,
    userController.verifyLicense
  );
  router.post('/verifiedLicense/',TokenValidity.verifyToken, verifiedLicense, userController.verifiedLicense);
  router.post('/denyVerification/',TokenValidity.verifyToken, denyVerification, userController.denyVerification);
  router.post('/notifications/',TokenValidity.verifyToken,user_idValidation,  userController.notification);
  router.post('/getMyLicense/', TokenValidity.verifyToken,user_idValidation, userController.myLicense);
  router.post('/getMyViolation', TokenValidity.verifyToken, userController.myViolation);
router.post('/verifyEmail',TokenValidity.verifyToken,verifyEmail, userController.verifyEmail);

router.post('/changeProfile',upload.fields([
  {name: 'profile_pic', maxCount: 1},
  ]),TokenValidity.verifyToken,user_idValidation,userController.changeProfilePic);

  router.post('/changePassword',TokenValidity.verifyToken,changePasswordValidation,userController.changePassword);
  router.post('/markNotificationAsRead',TokenValidity.verifyToken,idValidation,userController.markNotificationAsRead);

  router.post('/updateLicense',upload.fields([
    {name: 'front_pic', maxCount: 1},
    {name: 'back_pic', maxCount: 1},
  ]),TokenValidity.verifyToken,checkUpdateLicense,userController.updateLicense)

//Admin
router.post('/insertViolations',TokenValidity.verifyToken, insertViolations, userController.insertViolations);
router.post('/updateViolationStatus',TokenValidity.verifyToken, updateViolationStatus, userController.updateViolationStatus);
router.post('/deleteViolationList',TokenValidity.verifyToken, idValidation, userController.deleteViolationList);
router.post('/enforcerRegistration', TokenValidity.verifyToken, signUpValidation, userController.enforcerRegistration);
router.post('/removeEnforcer',TokenValidity.verifyToken, idValidation, userController.removeEnforcer);
router.post('/disableUser',TokenValidity.verifyToken,idValidation,userController.disableUser);
router.post('/enableUser',TokenValidity.verifyToken,idValidation,userController.enableUser);
router.get('/getAllLicenseVerified', TokenValidity.verifyToken, userController.getAllLicenseVerified);
router.get('/getAllLicenseNotYetVerified', TokenValidity.verifyToken, userController.getAllLicenseNotYetVerified);
router.get('/getAllViolationList', TokenValidity.verifyToken, userController.getAllViolationsList);
router.get('/AllViolationsList',TokenValidity.verifyToken,userController.AllViolationsList);
router.get('/getAllEnforcers', TokenValidity.verifyToken, userController.getAllEnforcer);
router.get('/getAllUsers', TokenValidity.verifyToken, userController.getAllUsers);
router.get('/getAllLicensebyID/:id', TokenValidity.verifyToken,idValidation,userController.getAllLicenseByID);
//Enforcer
router.post('/normalCitation',upload.fields([
    {
      name: 'evidences', maxCount:10
    },
]),TokenValidity.verifyToken,userController.insertViolators);
router.post('/impoundCitation',upload.fields([
  {
    name: 'evidences', maxCount:1
  },
]), TokenValidity.verifyToken,impoundCitation,userController.impoundCitation);
router.get('/getAllViolators',TokenValidity.verifyToken,userController.getAllViolators);
router.get('/getAllViolatorsImpound',TokenValidity.verifyToken,userController.getAllViolatorsImpound);
router.get('/getAllViolatorsNormal',TokenValidity.verifyToken,userController.getAllViolatorsNormal);
router.post('/getUserViolations',TokenValidity.verifyToken,userController.getUserViolation);
router.post('/getAllViolationsByYear',TokenValidity.verifyToken,userController.getAllViolationsbyYear);
router.post('/paid-this',TokenValidity.verifyToken,userController.paidThisViolation);
router.post('/adminNormalCitation',TokenValidity.verifyToken,userController.adminNormalCitation);
router.post('/adminImpoundCitation',TokenValidity.verifyToken,userController.adminImpoundCitation);



module.exports = router;
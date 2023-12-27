const express = require('express');
const authRouter = express.Router();
const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/images');
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
    loginValidation,
    idValidation,
    emailValidation,
    changePasswordValidation,
    emailVerify
   } = require('../helpers/validator')
const authController = require('../controllers/authController');

authRouter.post('/userRegistration', signUpValidation, authController.userRegistration);
authRouter.post('/login', loginValidation, authController.login);
authRouter.post('/refresh-token', authController.Token);
authRouter.post('/logout', idValidation, authController.logout);
authRouter.post('/forgot-password',emailValidation,authController.forgot_password)
authRouter.post('/change-forgot-password',changePasswordValidation, authController.change_forgot_password);
authRouter.post('/send-registration-form',emailValidation,authController.sendRegistrationForm)
authRouter.post('/enforcer-registration',signUpValidation,authController.enforcerRegistration)
authRouter.post('/sendEmailtoVerify',authController.sendEmailtoVerify);

module.exports = authRouter;
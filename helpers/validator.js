const { check } = require('express-validator');
const { isStrongPassword } = require('validator');

exports.signUpValidation = [
    check('nickname', 'Nickname is required')
    .not().isEmpty()
        .custom((value) => {
            if (value.includes(' ')) {
                throw new Error('Nickname should not contain spaces');
            }
            return true;
        }),
    check('email', 'Email is required').not().isEmpty().isEmail(),
    check('password', 'Password is required')
        .isLength({ min: 6 })
        .custom((value) => {
            if (!isStrongPassword(value)) {
                throw new Error('Password must be strong.');
            }
            return true;
        }),
]
exports.verifyEmail =[
  check('verification_code','verification_code is Required').not().isEmpty(),
]
exports.loginValidation = [
    check('email','email is required').not().isEmpty().isEmail(),
    check('password','password min 6 length').isLength({ min:6 })
]
exports.checkUpdateLicense =[
  check('user_id','user_id is required').not().isEmpty(),
    check('front_pic').custom((value, { req }) => {
        if (req.files && req.files['front_pic']) {
          return true;
        }
        return false;
      }).withMessage('Please upload a front picture (PNG, JPG)'),
    
      // Check 'back_pic' files
      check('back_pic').custom((value, { req }) => {
        if (req.files && req.files['back_pic']) {
          return true;
        }
        return false;
      }).withMessage('Please upload a back picture (PNG, JPG)'),
    check('expiration_date','expiration_date is required').not().isEmpty(),

]
exports.verifyLicenseValidation = [
    check('user_id','user_id is required').not().isEmpty(),
    check('front_pic').custom((value, { req }) => {
        if (req.files && req.files['front_pic']) {
          return true;
        }
        return false;
      }).withMessage('Please upload a front picture (PNG, JPG)'),
    
      // Check 'back_pic' files
      check('back_pic').custom((value, { req }) => {
        if (req.files && req.files['back_pic']) {
          return true;
        }
        return false;
      }).withMessage('Please upload a back picture (PNG, JPG)'),
    
    check('license_no','license_no is required').not().isEmpty(),
    check('expiration_date','expiration_date is required').not().isEmpty(),
    check('agency_code','agency_code is required').not().isEmpty(),
    check('blood_type','blood_type is required').not().isEmpty(),
    check('eye_color','eye_color is required').not().isEmpty(),
    check('restrictions','restrictions is required').not().isEmpty(),
    check('conditions','conditions is required').not().isEmpty(),
    check('first_name','first_name is required').not().isEmpty(),
    check('last_name','last_name is required').not().isEmpty(),
    check('middle_name','middle_name is required').not().isEmpty(),
    check('nationality','nationality is required').not().isEmpty(),
    check('sex','sex is required').not().isEmpty(),
    check('date_of_birth','date_of_birth is required').not().isEmpty(),
    check('weight','weight is required').not().isEmpty(),
    check('height','height is required').not().isEmpty(),
    check('street','street is required').not().isEmpty(),
    check('baranggay','baranggay is required').not().isEmpty(),
    check('city','city is required').not().isEmpty(),
    check('province','province is required').not().isEmpty(),
]
exports.user_idValidation =[
  check('user_id','user_id is Required').not().isEmpty()
]
exports.license_Validation=[
  check('license_no','license_no is Required').not().isEmpty()
]

exports.verifiedLicense =[
  check('id','id is required').not().isEmpty(),
  check('user_id','user_id is required').not().isEmpty(),
]
exports.denyVerification =[
  check('id','id is required').not().isEmpty(),
  check('user_id','user_id is required').not().isEmpty(),
]
exports.insertViolations =[
  check('code','code is required').not().isEmpty(),
  check('name','name is required').not().isEmpty(),
  check('fine','fine is required').not().isEmpty(),
]
exports.updateViolationStatus =[
  check('id','id is required').not().isEmpty(),
  check('status','status is required').not().isEmpty(),
]
exports.idValidation =[
  check('id','id is required').not().isEmpty(),
]
exports.emailValidation = [
  check('email','Email is required').not().isEmpty().isEmail()
]
exports.emailVerify = [
  check('id','id is required').not().isEmpty(),
  check('email','Email is required').not().isEmpty().isEmail()
]
exports.changePasswordValidation=[
  check('user_id','user_id is Required').not().isEmpty(),
  check('password', 'Password is required')
        .isLength({ min: 6 })
        .custom((value) => {
            if (!isStrongPassword(value)) {
                throw new Error('Password must be strong.');
            }
            return true;
        }),
]
exports.impoundCitation = [
  check('ticket_no','ticket number is Required').not().isEmpty(),
  check('unit','Unit is Required').not().isEmpty(),
  check('place_of_violation','place Of Violation is Required').not().isEmpty(),
  check('apprehending_officer','Apprehending Officer is Required').not().isEmpty(),
  check('specific_violations','Specific Violation is Required').not().isEmpty(),
  check('name_of_driver','Name of Driver is required').not().isEmpty(),
]
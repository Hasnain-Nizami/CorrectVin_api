import {body} from "express-validator"
import bcrypt from "bcrypt"


const validateEmailFields = [
    body('from').optional().isEmail().withMessage('Invalid email format for "from"'),
    body('to').optional().isEmail().withMessage('Invalid email format for "to"'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('text').optional(),
  ];

  const pswCompare = async(bodyPsw,dbPsw)=>{
          const password = await bcrypt.compare(bodyPsw,dbPsw)
          return password
  }
 

  export {
    validateEmailFields,
    pswCompare
  }
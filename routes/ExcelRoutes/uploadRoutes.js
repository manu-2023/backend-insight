import express from 'express';
import {FileUploadController} from '../../controller/Excel/fileUploadController.js'; 
const router = express.Router();

router.post('/',FileUploadController)

export default router;
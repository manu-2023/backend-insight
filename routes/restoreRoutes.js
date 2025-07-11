import express from 'express';
import restore from  '../controller/restore.js';
const router = express.Router();


router.get('/',restore)

export default router;
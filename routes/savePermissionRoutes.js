import express from 'express';
import savePermission from '../controller/savePermission.js';
const router = express.Router();

router.post('/',savePermission);

export default router;
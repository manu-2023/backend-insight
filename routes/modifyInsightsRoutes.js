import express from 'express';
import modifyInsights from '../controller/modifyInsights.js';
const router = express.Router();

router.post('/', modifyInsights);

export default router;
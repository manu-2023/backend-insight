import express from 'express'
import { getInsight } from '../controller/getInsight.js'
const router = express.Router();

router.get('/',getInsight);

export default router;
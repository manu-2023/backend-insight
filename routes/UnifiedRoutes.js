// secondRoutes.js
import express from 'express';
import { unifiedHandler } from '../controller/UnifiedHandler.js';

const router = express.Router();

router.post('/', unifiedHandler);

export default router;

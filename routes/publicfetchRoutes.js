import express from 'express';
import  getPublicFetch from '../controller/publicFetch.js';
const router = express.Router();

router.post('/', getPublicFetch);

export default router;
import express from 'express';
import { getSelectedColumns } from '../../controller/Excel/getSelectedCells.js'; 
const router = express.Router();

router.post('/', getSelectedColumns); // ✅ Use the function inside the object

export default router;
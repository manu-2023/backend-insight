import express from 'express'
import getCellValuesSQL from '../../controller/SQL/getCellValuesSQL.js'
const router = express .Router();

router.post('/',getCellValuesSQL);

export default router;
import express from 'express'
import {getTableController} from '../../controller/SQL/getTableController.js'
const router = express.Router();

router.get('/',getTableController)

export default router;
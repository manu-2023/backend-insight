import express from 'express'
import {getColumnsSQL} from '../../controller/SQL/getColumnsSQL.js'
const router = express.Router()

router.post('/',getColumnsSQL)
export default router;
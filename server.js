import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';

import mainRoutes from './routes/UnifiedRoutes.js';
import uploadRoutes from './routes/ExcelRoutes/uploadRoutes.js';
import getSelectedColumnsRouter from './routes/ExcelRoutes/getColumnsRoutes.js';
import getInsightRoutes from './routes/getInsightRoutes.js'
import getTableRouter from './routes/SQLRoutes/getTableRouter.js'
import getColumnsSql from './routes/SQLRoutes/getColumnsRouterSql.js'
import savePermissionRoutes from  './routes/savePermissionRoutes.js'
import getCellValuesSQLRoutes from './controller/SQL/getCellValuesSQL.js';
import getPublicFetch from './routes/publicfetchRoutes.js';
import  modifyInsightsRoutes  from './routes/modifyInsightsRoutes.js';
import restoreRoutes from './routes/restoreRoutes.js';
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/submit', mainRoutes);
app.use('/api/uploadFile', uploadRoutes);
app.use('/api/getColumnValues', getSelectedColumnsRouter);
app.use('/api/get-insights',getInsightRoutes)
app.use('/api/get-table',getTableRouter)
app.use('/api/get-columns-sql',getColumnsSql)

app.use('/api/save-permission',savePermissionRoutes)


app.use('/api/get-cell-values-sql',getCellValuesSQLRoutes);
app.use('/public-fetch', getPublicFetch);

app.use('/api/modify-insights', modifyInsightsRoutes);

app.use('/api/restore', restoreRoutes);



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

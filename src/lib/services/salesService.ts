import { createSale } from './saleCreate';
import { deleteSale } from './saleDelete';
import { returnSale } from './saleReturn';
import { editSaleAtomic } from './saleEdit';
import {
  getAllSales,
  fetchRemoteSales,
  searchSales,
  updateSale,
  getReportSalesLocal,
  getReportSales,
  getReportRefundsLocal,
  getReportRefunds,
  patchLegacySales,
} from './saleQueries';

// Slim composition facade. Each method body lives in its own focused module
// (saleCreate / saleDelete / saleReturn / saleEdit / saleQueries) to keep every
// file under the 400-line limit. Logic is identical to the previous single-file
// implementation — only the file layout changed.
export const salesService = {
  getAll: getAllSales,
  fetchRemote: fetchRemoteSales,
  searchSales,
  create: createSale,
  update: updateSale,
  delete: deleteSale,
  editSaleAtomic,
  getReportSalesLocal,
  getReportSales,
  getReportRefundsLocal,
  getReportRefunds,
  returnSale,
  patchLegacySales,
};

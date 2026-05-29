const XLSX = require('xlsx'); // 用于解析Excel文件
const mammoth = require('mammoth'); // 用于解析Word文件


async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // 获取第一个工作表的名称
  const worksheet = workbook.Sheets[sheetName]; // 获取工作表
  const data = XLSX.utils.sheet_to_json(worksheet); // 将工作表转换为JSON数组
  return data;
}


async function parseWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value; // 获取Word文档的文本内容
}


module.exports = {
  parseExcel,
  parseWord
}

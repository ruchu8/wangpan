const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataFile = path.join(__dirname, 'data.json');

// 确保数据目录存在
const dataDir = path.dirname(dataFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 默认数据结构
const defaultData = {
  comments: [],
  files: [],
  admin_credentials: null,
  admin_token: null
};

// 读取数据
function readData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data file:', error);
  }
  return { ...defaultData };
}

// 写入数据
function writeData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// 初始化数据文件
function initializeDataFile() {
  if (!fs.existsSync(dataFile)) {
    writeData(defaultData);
  }
}

// 获取指定键的值
function get(key) {
  const data = readData();
  return data[key];
}

// 设置指定键的值
function set(key, value) {
  const data = readData();
  data[key] = value;
  return writeData(data);
}

// 检查键是否存在
function exists(key) {
  const data = readData();
  return data[key] !== undefined && data[key] !== null;
}

// 删除指定键
function del(key) {
  const data = readData();
  delete data[key];
  return writeData(data);
}

// 初始化数据文件
initializeDataFile();

module.exports = {
  get,
  set,
  exists,
  del
};
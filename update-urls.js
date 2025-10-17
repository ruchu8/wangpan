const fs = require('fs');
const path = require('path');

// 检查命令行参数
const useTestData = process.argv.includes('--test');

// 数据文件路径
const dataFile = useTestData 
    ? path.join(__dirname, 'test-data.json')
    : path.join(__dirname, 'data.json');

console.log(`使用数据文件: ${dataFile}`);

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
    return null;
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

// 替换URL的函数
function replaceUrl(oldUrl) {
    if (!oldUrl) return oldUrl;
    
    console.log(`检查URL: ${oldUrl}`);
    
    // 检查是否匹配要替换的模式
    const ysepanPattern = /^https?:\/\/ys-?[gG]\.ysepan\.com\/.*\.(jpg|jpeg|png|gif|bmp|webp)(\?.*)?$/i;
    const match = oldUrl.match(ysepanPattern);
    
    if (match) {
        // 提取文件名
        const fileName = oldUrl.split('/').pop().split('?')[0];
        const newUrl = `data/${fileName}`;
        console.log(`替换URL: ${oldUrl} -> ${newUrl}`);
        return newUrl;
    }
    
    return oldUrl;
}

// 递归处理文件和文件夹
function processFiles(files) {
    if (!Array.isArray(files)) return files;
    
    return files.map(file => {
        // 处理当前文件/文件夹的URL
        if (file.url) {
            const oldUrl = file.url;
            file.url = replaceUrl(file.url);
            if (oldUrl !== file.url) {
                console.log(`文件 "${file.name}" 的URL已更新`);
            }
        }
        
        // 如果是文件夹，递归处理子文件
        if (file.children && Array.isArray(file.children)) {
            file.children = processFiles(file.children);
        }
        
        return file;
    });
}

// 主函数
function main() {
    console.log('开始更新URL...');
    
    // 读取数据
    const data = readData();
    if (!data) {
        console.error('无法读取数据文件');
        return;
    }
    
    // 处理文件列表
    if (data.files && Array.isArray(data.files)) {
        console.log(`处理 ${data.files.length} 个文件/文件夹...`);
        const originalFiles = JSON.stringify(data.files);
        data.files = processFiles(data.files);
        const updatedFiles = JSON.stringify(data.files);
        
        if (originalFiles !== updatedFiles) {
            console.log('检测到URL变更');
        } else {
            console.log('未检测到需要更新的URL');
        }
    }
    
    // 写入更新后的数据
    if (writeData(data)) {
        console.log('URL更新完成！');
    } else {
        console.error('更新失败！');
    }
}

// 执行主函数
main();
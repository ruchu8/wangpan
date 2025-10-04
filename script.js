// 全局变量
let files = [];
let comments = [];
let expandedFolderIndex = -1; // 记录当前展开的文件夹索引
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let totalComments = 0; // 总留言数
let filteredFiles = []; // 用于存储过滤后的文件列表

// 从API获取文件列表
async function fetchFiles() {
    console.log('Fetching files...');
    try {
        const response = await fetch('/api/files');
        console.log('Files API response status:', response.status);
        if (response.ok) {
            const rawData = await response.json();
            console.log('Raw files data from API:', rawData);
            
            // 直接使用服务器返回的数据，不再重新组织
            files = rawData;
            filteredFiles = [...files]; // 初始化过滤后的文件列表
            console.log('Files to render:', files);
        } else {
            // 如果API不可用，使用默认数据
            console.warn('Failed to fetch files from API, using default data');
            files = [
                {
                    name: '文件夹1',
                    type: 'folder',
                    url: '#',
                    note: '这是一个示例备注',
                    children: [
                        { name: '晚上我打大大撒打算.txt', type: 'file', url: 'https://www.baidu.com' },
                        { name: '文件2.jpg', type: 'file', url: 'https://www.qq.com' },
                        { name: '文件3.pdf', type: 'file', url: '#' }
                    ],
                    expanded: false
                },
                {
                    name: '文件夹2',
                    type: 'folder',
                    url: '#',
                    children: [
                        { name: '文件4.doc', type: 'file', url: '#' },
                        { name: '文件5.png', type: 'file', url: '#' }
                    ],
                    expanded: false
                },
                {
                    name: '文件夹3',
                    type: 'folder',
                    url: '#',
                    children: [
                        { name: '文件6.mp3', type: 'file', url: '#' },
                        { name: '文件7.zip', type: 'file', url: '#' }
                    ],
                    expanded: false
                }
            ];
            filteredFiles = [...files]; // 初始化过滤后的文件列表
        }
        renderFileList();
    } catch (error) {
        console.error('Error fetching files:', error);
        // 使用默认数据
        files = [
            {
                name: '文件夹1 (默认)',
                type: 'folder',
                url: '#',
                children: [
                    { name: '示例文件.txt', type: 'file', url: '#' }
                ],
                expanded: false
            }
        ];
        filteredFiles = [...files]; // 初始化过滤后的文件列表
        renderFileList();
    }
}

function renderFileList() {
    console.log('Rendering file list...');
    const fileList = document.getElementById('fileList');
    const noFiles = document.getElementById('noFiles');
    
    if (!fileList) {
        console.error('File list element not found!');
        return;
    }
    
    fileList.innerHTML = '';
    
    console.log('Files to render:', filteredFiles); // 使用过滤后的文件列表

    function renderItem(item, index, isChild = false) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        
        const a = document.createElement('a');
        a.href = item.url || '#';
        a.className = 'file-name';
        
        // 根据文件类型设置图标
        let iconClass = '';
        if (item.type === 'folder') {
            iconClass = 'bi-folder2-open folder-icon';
        } else {
            // 根据文件扩展名设置不同的图标
            const extension = item.name.split('.').pop().toLowerCase();
            switch(extension) {
                case 'txt':
                    iconClass = 'bi-file-text';
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'svg':
                    iconClass = 'bi-file-image';
                    break;
                case 'pdf':
                    iconClass = 'bi-file-pdf';
                    break;
                case 'doc':
                case 'docx':
                    iconClass = 'bi-file-word';
                    break;
                case 'xls':
                case 'xlsx':
                    iconClass = 'bi-file-excel';
                    break;
                case 'ppt':
                case 'pptx':
                    iconClass = 'bi-file-ppt';
                    break;
                case 'zip':
                case 'rar':
                case '7z':
                case 'tar':
                case 'gz':
                    iconClass = 'bi-file-zip';
                    break;
                case 'mp3':
                case 'wav':
                case 'ogg':
                case 'flac':
                    iconClass = 'bi-file-music';
                    break;
                case 'mp4':
                case 'avi':
                case 'mkv':
                case 'mov':
                case 'wmv':
                    iconClass = 'bi-file-play';
                    break;
                default:
                    iconClass = 'bi-file-earmark';
            }
        }
        
        // 构建显示内容
        let displayContent = '';
        
        if (item.type === 'folder') {
            // 文件夹保持原来的图标
            displayContent = `<i class="bi ${iconClass}"></i> ${item.name}`;
        } else {
            // 文件使用tu.png图标
            displayContent = `<img src="tu.png" alt="文件图标" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"> ${item.name}`;
        }
        
        // 如果有备注，添加备注
        if (item.note) {
            displayContent += ` <span class="file-note">${item.note}</span>`;
        }
        
        // 只有文件才显示创建时间
        if (item.type === 'file') {
            let displayDate = item.date;
            // 如果没有日期或日期格式不正确，使用当前日期
            if (!displayDate) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                displayDate = `${year}-${month}-${day}`;
            }
            displayContent += ` <span class="file-date">新增日期${displayDate}</span>`;
        }
        
        a.innerHTML = displayContent;
        
        if (item.type === 'folder') {
            a.href += '/';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // 实现互斥展开：点击当前展开的文件夹则关闭，点击其他文件夹则展开该文件夹并关闭其他文件夹
                if (expandedFolderIndex === index) {
                    // 点击当前展开的文件夹，关闭它
                    expandedFolderIndex = -1;
                } else {
                    // 点击其他文件夹，展开它并关闭之前展开的文件夹
                    expandedFolderIndex = index;
                }
                renderFileList();
            });
        }
        li.appendChild(a);
        fileList.appendChild(li);

        // 检查是否有需要展开的文件夹（从后台添加文件后设置的）
        if (window.expandedFolderIndex !== undefined && window.expandedFolderIndex === index) {
            expandedFolderIndex = window.expandedFolderIndex;
            delete window.expandedFolderIndex; // 清除标记
        }

        // 只有当前文件夹是展开状态时才显示子文件
        if (item.type === 'folder' && expandedFolderIndex === index && item.children) {
            // 确保 children 是数组
            const childrenArray = Array.isArray(item.children) ? item.children : [];
            if (childrenArray.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'ms-3 mt-1';
                childrenArray.forEach((child, childIndex) => {
                    const childLi = renderItem(child, childIndex, true);
                    ul.appendChild(childLi);
                });
                li.appendChild(ul);
            }
        }
        return li;
    }

    // 确保 filteredFiles 是数组
    if (Array.isArray(filteredFiles)) {
        if (filteredFiles.length === 0) {
            console.log('No files to display');
            fileList.classList.add('d-none');
            noFiles.classList.remove('d-none');
        } else {
            fileList.classList.remove('d-none');
            noFiles.classList.add('d-none');
            filteredFiles.forEach((item, index) => renderItem(item, index));
        }
    } else {
        console.error('filteredFiles is not an array:', filteredFiles);
        // 如果不是数组，设置为空数组
        filteredFiles = [];
        fileList.classList.add('d-none');
        noFiles.classList.remove('d-none');
    }
}

// 搜索文件功能
function searchFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // 如果搜索框为空，显示所有文件
        filteredFiles = [...files];
    } else {
        // 过滤文件
        filteredFiles = [];
        
        function filterItems(items) {
            items.forEach(item => {
                // 检查当前项是否匹配搜索词
                if (item.name.toLowerCase().includes(searchTerm)) {
                    filteredFiles.push(item);
                }
                
                // 如果是文件夹，递归检查其子项
                if (item.type === 'folder' && item.children && item.children.length > 0) {
                    const childrenMatch = filterItems(item.children);
                    if (childrenMatch.length > 0) {
                        // 如果子项有匹配，则包含该文件夹
                        filteredFiles.push({
                            ...item,
                            children: childrenMatch
                        });
                    }
                }
            });
            
            return filteredFiles.filter(f => f.name.toLowerCase().includes(searchTerm) || 
                                            (f.children && f.children.length > 0));
        }
        
        filteredFiles = filterItems(files);
    }
    
    // 重置展开状态
    expandedFolderIndex = -1;
    
    // 重新渲染文件列表
    renderFileList();
}

// 添加搜索事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', searchFiles);
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                searchFiles();
            }
        });
        
        // 实时搜索（可选）
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchFiles, 300); // 300ms延迟
        });
    }
    
    // 定期刷新文件列表以确保同步
    setInterval(fetchFiles, 30000); // 每30秒刷新一次
});

// 从API获取留言列表
async function fetchComments(page = 1) {
    try {
        const response = await fetch(`/api/comments?page=${page}&limit=10`);
        if (response.ok) {
            const data = await response.json();
            comments = data.comments;
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            totalComments = data.totalComments;
            renderComments();
            renderCommentsStats();
            renderPagination();
        } else {
            console.warn('Failed to fetch comments from API');
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">加载留言失败</p>';
    }
}

// 渲染留言列表
function renderComments() {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    // 显示所有留言（包括未审核的）
    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        
        const date = new Date(comment.date).toLocaleString();
        
        // 解析并处理联系方式隐私保护
        let contactDisplay = comment.name;
        if (comment.name.includes(':')) {
            const [contactType, contactInfo] = comment.name.split(':', 2);
            // 对联系方式进行部分隐藏处理
            const maskedContactInfo = maskContactInfo(contactInfo);
            contactDisplay = `${contactType}: ${maskedContactInfo}`;
        }
        
        // 对IP地址进行隐私保护处理（前台隐藏最后一位）
        let ipDisplay = comment.ip || '未知';
        if (ipDisplay !== '未知' && ipDisplay.length > 3) {
            // 隐藏IP地址的最后一位
            ipDisplay = ipDisplay.substring(0, ipDisplay.length - 1) + '*';
        }
        
        // 构建留言内容
        let commentContent = `
            <div class="comment-header">
                <span class="comment-name">${contactDisplay}</span>
                <span class="comment-date">${date}</span>
            </div>
        `;
        
        // 留言内容区域
        let contentHtml = '';
        
        // 如果留言未公开，显示提示信息
        if (!comment.approved) {
            contentHtml = `<em>此留言不公开，管理员回复后才能公开留言</em>`;
        } else {
            contentHtml = comment.content;
        }
        
        // 如果有管理员回复，则显示
        if (comment.reply) {
            contentHtml += `
                <div class="admin-reply mt-2 p-2 bg-light rounded">
                    <strong>管理员回复:</strong> ${comment.reply}
                </div>
            `;
        }
        
        // 添加IP地址到留言内容的右下角
        contentHtml += `<div class="comment-ip">IP: ${ipDisplay}</div>`;
        
        commentContent += `<div class="comment-content">${contentHtml}</div>`;
        
        commentItem.innerHTML = commentContent;
        
        commentsList.appendChild(commentItem);
    });
}

// 渲染留言统计信息
function renderCommentsStats() {
    const statsElement = document.getElementById('totalCommentsCount');
    if (!statsElement) return;
    
    statsElement.textContent = totalComments;
}

// 渲染分页控件
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    // 如果只有一页或没有留言，不显示分页控件
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<ul class="pagination">';
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">上一页</span></li>`;
    }
    
    // 页码按钮（最多显示5个页码）
    let startPage, endPage;
    if (totalPages <= 5) {
        // 如果总页数小于等于5，显示所有页码
        startPage = 1;
        endPage = totalPages;
    } else {
        // 如果总页数大于5，显示当前页和前后各2页
        if (currentPage <= 3) {
            startPage = 1;
            endPage = 5;
        } else if (currentPage + 2 >= totalPages) {
            startPage = totalPages - 4;
            endPage = totalPages;
        } else {
            startPage = currentPage - 2;
            endPage = currentPage + 2;
        }
    }
    
    // 显示第一页和省略号
    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // 显示页码
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }
    
    // 显示最后一页和省略号
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">下一页</span></li>`;
    }
    
    paginationHTML += '</ul>';
    
    pagination.innerHTML = paginationHTML;
    
    // 添加分页点击事件
    pagination.querySelectorAll('.page-link:not(.disabled)').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentPage) {
                fetchComments(page);
            }
        });
    });
}

// 联系方式隐私保护函数
function maskContactInfo(contactInfo) {
    if (!contactInfo) return contactInfo;
    
    // 如果是邮箱
    if (contactInfo.includes('@')) {
        const [localPart, domain] = contactInfo.split('@');
        if (localPart.length <= 2) {
            return contactInfo; // 太短无法隐藏
        }
        // 隐藏邮箱前缀中间部分
        const maskedLocalPart = localPart.substring(0, 2) + '**' + localPart.substring(localPart.length - 1);
        return `${maskedLocalPart}@${domain}`;
    }
    
    // 如果是QQ号或微信号
    if (contactInfo.length <= 3) {
        return contactInfo; // 太短无法隐藏
    }
    
    // 隐藏中间部分
    const start = contactInfo.substring(0, 2);
    const end = contactInfo.substring(contactInfo.length - 2);
    return `${start}**${end}`;
}

// 获取客户端IP地址
async function getClientIP() {
    try {
        // 尝试使用第一种方法 - ip.sb (对中国国内友好)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://api.ip.sb/ip', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const ip = await response.text();
                if (ip && ip.trim()) {
                    console.log('IP obtained from ip.sb:', ip.trim());
                    return ip.trim();
                }
            }
        } catch (error) {
            console.warn('Failed to get IP from ip.sb:', error);
        }
        
        // 如果第一种方法失败，尝试第二种方法 - ipapi.co (对中国国内友好)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    console.log('IP obtained from ipapi.co:', data.ip);
                    return data.ip;
                }
            }
        } catch (error) {
            console.warn('Failed to get IP from ipapi.co:', error);
        }
        
        // 如果前两种方法都失败，尝试第三种方法 - ipinfo.io (对中国国内友好)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://ipinfo.io/json', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    console.log('IP obtained from ipinfo.io:', data.ip);
                    return data.ip;
                }
            }
        } catch (error) {
            console.warn('Failed to get IP from ipinfo.io:', error);
        }
        
        // 如果前三种方法都失败，尝试第四种方法 - 通过服务器端获取
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
            
            const response = await fetch('/api/ip', {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    console.log('IP obtained from server:', data.ip);
                    return data.ip;
                }
            }
        } catch (error) {
            console.warn('Failed to get IP from server:', error);
        }
        
        // 如果所有方法都失败，使用本地存储的IP（如果有）
        const storedIP = localStorage.getItem('clientIP');
        if (storedIP) {
            console.log('Using stored IP:', storedIP);
            return storedIP;
        }
        
        console.error('All IP detection methods failed');
        return '未知';
    } catch (error) {
        console.error('Unexpected error in getClientIP:', error);
        return '未知';
    }
}

// 提交留言
async function submitComment(event) {
    event.preventDefault();
    
    const contactType = document.getElementById('contactType').value;
    const contactInfo = document.getElementById('contactInfo').value;
    const content = document.getElementById('commentContent').value;
    const submitButton = document.getElementById('submitCommentBtn');
    
    console.log('Submitting comment:', { contactType, contactInfo, content });
    
    if (!contactType || !contactInfo || !content) {
        showCommentStatus('请填写完整信息', 'error');
        return;
    }
    
    // 禁用提交按钮并显示加载状态，防止重复提交
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';
    }
    
    // 显示提交状态
    showCommentStatus('正在提交留言...', 'info');
    
    try {
        // 并行获取IP地址和提交留言，减少等待时间
        const ipPromise = getClientIP();
        
        // 组合联系方式显示名称
        const name = `${contactType}:${contactInfo}`;
        
        // 等待IP地址获取完成
        const ip = await ipPromise;
        console.log('Client IP:', ip);
        
        // 提交留言，包含IP地址
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, content, ip })
        });
        
        console.log('Comment API response:', response.status);
        
        if (response.ok) {
            document.getElementById('commentForm').reset();
            showCommentStatus('留言提交成功，等待审核后显示', 'success');
            fetchComments(); // 刷新留言列表
        } else {
            const error = await response.json();
            showCommentStatus(error.error || '提交失败', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showCommentStatus('提交失败，请稍后再试', 'error');
    } finally {
        // 恢复提交按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '提交留言';
        }
    }
}

// 显示留言状态
function showCommentStatus(message, type) {
    const statusElement = document.getElementById('commentStatus');
    statusElement.textContent = message;
    
    // 清除之前的类名
    statusElement.className = 'comment-status';
    
    // 添加新的类名
    if (type) {
        statusElement.classList.add(type);
    }
    
    // 如果是info类型，不自动隐藏
    if (type !== 'info') {
        setTimeout(() => {
            statusElement.className = 'comment-status';
        }, 5000);
    }
}

// 返回顶部功能
function setupBackToTop() {
    const backToTopButton = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) { // 当页面滚动超过300px时显示按钮
            backToTopButton.classList.remove('d-none');
        } else {
            backToTopButton.classList.add('d-none');
        }
    });
    
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // 平滑滚动
        });
    });
}

// 平滑滚动到锚点
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // 考虑固定导航栏的高度
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded');
    
    // 获取文件列表
    fetchFiles();
    
    // 获取留言列表
    fetchComments();
    
    // 添加留言表单提交事件
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', submitComment);
    } else {
        console.error('Comment form not found!');
    }
    
    // 设置返回顶部按钮
    setupBackToTop();
    
    // 设置平滑滚动
    setupSmoothScroll();
    
    // 定期刷新文件列表以确保同步
    setInterval(fetchFiles, 30000); // 每30秒刷新一次
});

// 添加一个窗口加载事件作为备选方案
window.addEventListener('load', function() {
    console.log('Window loaded');
});

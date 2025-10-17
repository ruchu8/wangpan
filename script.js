// 全局变量
let files = [];
let comments = [];
let expandedFolderIndex = -1; // 记录当前展开的文件夹索引
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let totalComments = 0; // 总留言数
let filteredFiles = []; // 用于存储过滤后的文件列表
let commentsCache = new Map(); // 留言缓存
let isCommentsLoading = false; // 留言是否正在加载
let commentsLoadStartTime = 0; // 留言加载开始时间

// 从API获取文件列表
async function fetchFiles() {
    try {
        // 首先尝试从API获取文件列表（无需认证）
        const response = await fetch('/api/files');
        if (response.ok) {
            const rawData = await response.json();
            
            // 直接使用服务器返回的数据
            files = rawData;
            filteredFiles = [...files]; // 初始化过滤后的文件列表
        } else if (response.status === 401) {
            // 如果是认证问题，尝试使用默认数据
            useDefaultFiles();
        } else {
            // 其他错误情况，使用默认数据
            useDefaultFiles();
        }
        renderFileList();
    } catch (error) {
        // 使用默认数据
        useDefaultFiles();
        renderFileList();
    }
}

// 使用默认文件数据
function useDefaultFiles() {
    files = [
        {
            name: 'BOSS计时器下载专区-',
            type: 'folder',
            url: '#',
            note: 'BOSS计时器下载专区【部分杀毒会报毒介意的勿下载】',
            children: [
                { name: '晚上我打大大撒打算.txt', type: 'file', url: 'https://www.baidu.com' },
                { name: '文件2.jpg', type: 'file', url: 'https://www.qq.com' },
                { name: '文件3.pdf', type: 'file', url: '#' }
            ],
            expanded: false
        },
        {
            name: '辅助类相关工具下载（易语言编写部分杀毒会报毒）',
            type: 'folder',
            url: '#',
            note: '部分杀毒会误报毒。介意勿下载',
            children: [
                { name: '文件4.doc', type: 'file', url: '#' },
                { name: '文件5.png', type: 'file', url: '#' }
            ],
            expanded: false
        },
        {
            name: '石墓祖玛阁不迷路补丁(带房间补丁版)',
            type: 'folder',
            url: '#',
            note: '祖玛阁石墓阵带房间编号带每个房间GPS导航',
            children: [
                { name: '文件6.mp3', type: 'file', url: '#' },
                { name: '文件7.zip', type: 'file', url: '#' }
            ],
            expanded: false
        },
        {
            name: '怪物以及BOSS射线提示补丁',
            type: 'folder',
            url: '#',
            note: '【怪物专区】',
            children: [
                { name: '文件8.txt', type: 'file', url: '#' },
                { name: '文件9.jpg', type: 'file', url: '#' }
            ],
            expanded: false
        },
        {
            name: '蓝盾、小火墙、小冰咆哮 等技能类 补丁-',
            type: 'folder',
            url: '#',
            note: '【技能补丁专区】',
            children: [
                { name: '文件10.doc', type: 'file', url: '#' },
                { name: '文件11.png', type: 'file', url: '#' }
            ],
            expanded: false
        },
        {
            name: '大小地板砖贴图',
            type: 'folder',
            url: '#',
            note: '【地砖专区】',
            children: [
                { name: '文件12.pdf', type: 'file', url: '#' },
                { name: '文件13.zip', type: 'file', url: '#' }
            ],
            expanded: false
        }
    ];
    filteredFiles = [...files]; // 初始化过滤后的文件列表
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    const noFiles = document.getElementById('noFiles');
    
    if (!fileList) {
        return;
    }
    
    fileList.innerHTML = '';
    
    // 创建预览模态框（如果还不存在）
    if (!document.getElementById('filePreviewModal')) {
        const modalHTML = `
            <div class="modal fade" id="filePreviewModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="filePreviewModalLabel">文件预览</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="textPreviewContent" style="max-height: 70vh; overflow-y: auto; white-space: pre-wrap; font-family: monospace;"></div>
                            <img id="imagePreviewContent" src="" alt="预览图片" class="img-fluid" style="max-height: 70vh; display: none;">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <a id="downloadFileBtn" href="#" class="btn btn-primary" download>下载文件</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function renderItem(item, index, isChild = false) {
        const li = document.createElement('li');
        
        // 根据文件类型添加不同的CSS类
        if (item.type === 'folder') {
            li.className = 'list-group-item folder-item';
        } else if (item.type === 'file') {
            li.className = 'list-group-item file-item';
        } else {
            // 处理分割线类型
            if (item.type === 'divider') {
                li.className = 'list-group-item py-1';
                li.innerHTML = '<div class="divider-line">' + (item.name || '=================') + '</div>';
                fileList.appendChild(li);
                return li;
            }
            li.className = 'list-group-item';
        }
        
        const a = document.createElement('a');
        a.href = item.url || '#';
        a.className = 'file-name';
        // 对于图片和文本文件，不使用新窗口打开，而是显示预览
        const isImage = item.type === 'file' && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(item.name);
        const isText = item.type === 'file' && /\.(txt|log|md|csv)$/i.test(item.name);
        if (!isImage && !isText) {
            a.target = '_blank';  // 非图片和非文本文件在新窗口打开
        }
        
        // 根据文件类型设置图标
        let iconClass = '';
        if (item.type === 'folder') {
            iconClass = 'bi-folder2-open folder-icon';
        } else {
            // 根据文件扩展名设置不同的图标
            const extension = item.name.split('.').pop().toLowerCase();
            switch(extension) {
                case 'txt':
                case 'log':
                case 'md':
                case 'csv':
                    iconClass = 'bi-file-text';
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'webp':
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
        
        // 检查是否是24小时内新增的文件或文件夹
        let isNewItem = false;
        if (item.type === 'file') {
            // 对于文件，检查 date 或 createdAt 字段
            const itemDate = item.date || item.createdAt;
            if (itemDate) {
                // 解析日期字符串
                let dateObj;
                if (itemDate.includes('T')) {
                    // ISO格式日期
                    dateObj = new Date(itemDate);
                } else if (itemDate.includes(' ')) {
                    // YYYY-MM-DD HH:MM格式
                    const [datePart, timePart] = itemDate.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    dateObj = new Date(year, month - 1, day, hours, minutes);
                } else {
                    // 只有日期
                    dateObj = new Date(itemDate);
                }
                
                // 检查是否在24小时内
                const now = new Date();
                const diffHours = (now - dateObj) / (1000 * 60 * 60);
                isNewItem = diffHours <= 24;
            }
        } else {
            // 对于文件夹，我们可以通过检查子文件来确定是否是新文件夹
            // 如果文件夹有子文件，且其中有24小时内新增的文件，则认为文件夹是新的
            if (item.children && item.children.length > 0) {
                // 检查子文件中是否有24小时内新增的
                isNewItem = item.children.some(child => {
                    const childDate = child.date || child.createdAt;
                    if (childDate) {
                        // 解析日期字符串
                        let dateObj;
                        if (childDate.includes('T')) {
                            // ISO格式日期
                            dateObj = new Date(childDate);
                        } else if (childDate.includes(' ')) {
                            // YYYY-MM-DD HH:MM格式
                            const [datePart, timePart] = childDate.split(' ');
                            const [year, month, day] = datePart.split('-');
                            const [hours, minutes] = timePart.split(':');
                            dateObj = new Date(year, month - 1, day, hours, minutes);
                        } else {
                            // 只有日期
                            dateObj = new Date(childDate);
                        }
                        
                        // 检查是否在24小时内
                        const now = new Date();
                        const diffHours = (now - dateObj) / (1000 * 60 * 60);
                        return diffHours <= 24;
                    }
                    return false;
                });
            }
        }
        
        if (item.type === 'folder') {
            // 文件夹保持原来的图标
            const displayName = item._highlightedName || item.name;
            displayContent = `<i class="bi ${iconClass}"></i> ${displayName}`;
        } else {
            // 文件使用特定图标
            const displayName = item._highlightedName || item.name;
            
            // 检查URL是否以特定参数结尾
            let iconSrc = "img/tu.png"; // 默认图标
            
            // 从URL中提取文件名部分
            let fileName = item.url;
            if (item.url && item.url.includes('/')) {
                // 如果是URL，获取最后一部分
                fileName = item.url.split('/').pop() || item.url;
            }
            
            // 检查URL是否以特定参数结尾
            if (fileName && fileName.includes('.jpg')) {
                iconSrc = "img/jpg.png";
            } else if (fileName && fileName.includes('.gif')) {
                iconSrc = "img/gif.png";
            } else if (fileName && fileName.includes('.txt')) {
                iconSrc = "img/txt.png";
            }
            
            displayContent = `<img src="${iconSrc}" alt="文件图标" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"> ${displayName}`;
        }
        
        // 如果有备注，添加备注
        if (item.note) {
            displayContent += ` <span class="file-note">${item.note}</span>`;
        }
        
        // 只有文件才显示创建时间
        if (item.type === 'file') {
            // 检查 date 或 createdAt 字段
            let displayDate = item.date || item.createdAt;
            // 如果没有日期或日期格式不正确，使用当前日期
            if (!displayDate) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                displayDate = `${year}-${month}-${day} ${hours}:${minutes}`;
            }
            displayContent += ` <span class="file-date">${displayDate}</span>`;
        }
        
        a.innerHTML = displayContent;
        
        // 设置新项目样式
        if (isNewItem) {
            a.classList.add('new-item');
        } else {
            a.classList.remove('new-item');
        }
        
        // 为图片和文本文件添加预览功能
        if (isImage || isText) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                showFilePreview(item.url, item.name, isImage);
            });
        } else if (item.type === 'folder') {
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
        // 在搜索模式下，如果文件夹被标记为expanded，则展开它
        const shouldExpand = item.type === 'folder' && 
                            ((expandedFolderIndex === index) || 
                             (item.expanded === true));
                             
        if (shouldExpand && item.children) {
            // 确保 children 是数组
            const childrenArray = Array.isArray(item.children) ? item.children : [];
            if (childrenArray.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'ms-2 mt-1';
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
            fileList.classList.add('d-none');
            noFiles.classList.remove('d-none');
        } else {
            fileList.classList.remove('d-none');
            noFiles.classList.add('d-none');
            filteredFiles.forEach((item, index) => renderItem(item, index));
        }
    } else {
        // 如果不是数组，设置为空数组
        filteredFiles = [];
        fileList.classList.add('d-none');
        noFiles.classList.remove('d-none');
    }
}

// 显示文件预览
function showFilePreview(fileUrl, fileName, isImage) {
    const modal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const textPreviewContent = document.getElementById('textPreviewContent');
    const imagePreviewContent = document.getElementById('imagePreviewContent');
    const downloadBtn = document.getElementById('downloadFileBtn');
    const modalTitle = document.getElementById('filePreviewModalLabel');
    
    // 设置下载链接
    downloadBtn.href = fileUrl;
    downloadBtn.download = fileName;
    modalTitle.textContent = fileName;
    
    if (isImage) {
        // 显示图片预览
        textPreviewContent.style.display = 'none';
        imagePreviewContent.style.display = 'block';
        imagePreviewContent.src = fileUrl;
        imagePreviewContent.alt = fileName;
    } else {
        // 显示文本内容
        textPreviewContent.style.display = 'block';
        imagePreviewContent.style.display = 'none';
        textPreviewContent.textContent = '加载中...';
        
        // 获取文本文件内容
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.text();
            })
            .then(text => {
                textPreviewContent.textContent = text;
            })
            .catch(error => {
                textPreviewContent.textContent = '无法加载文件内容: ' + error.message;
            });
    }
    
    // 显示模态框
    modal.show();
}

// 高亮显示搜索关键词
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 搜索文件功能
function searchFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // 如果搜索框为空，显示所有文件
        filteredFiles = [...files];
    } else {
        // 过滤文件，只显示匹配的文件和文件夹
        filteredFiles = [];
        
        function filterItems(items) {
            const filteredItems = [];
            
            items.forEach(item => {
                // 检查当前项是否匹配搜索词
                if (item.name.toLowerCase().includes(searchTerm)) {
                    // 创建一个带有高亮名称的新对象
                    const filteredItem = {
                        ...item,
                        _highlightedName: highlightSearchTerm(item.name, searchTerm)
                    };
                    
                    // 如果是文件夹，过滤其子项
                    if (item.type === 'folder' && item.children && item.children.length > 0) {
                        const filteredChildren = filterItems(item.children);
                        filteredItem.children = filteredChildren;
                        // 如果有匹配的子项，标记文件夹为展开状态
                        if (filteredChildren.length > 0) {
                            filteredItem.expanded = true;
                        }
                    }
                    
                    filteredItems.push(filteredItem);
                } else if (item.type === 'folder' && item.children && item.children.length > 0) {
                    // 如果当前文件夹名称不匹配，但其子项可能匹配
                    const filteredChildren = filterItems(item.children);
                    if (filteredChildren.length > 0) {
                        // 只有当有匹配的子项时才包含此文件夹
                        const filteredItem = {
                            ...item,
                            _highlightedName: highlightSearchTerm(item.name, searchTerm),
                            children: filteredChildren,
                            expanded: true // 自动展开包含匹配子项的文件夹
                        };
                        filteredItems.push(filteredItem);
                    }
                }
            });
            
            return filteredItems;
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
    // 检查缓存
    const cacheKey = `page_${page}`;
    if (commentsCache.has(cacheKey)) {
        console.log('Using cached comments for page', page);
        const cachedData = commentsCache.get(cacheKey);
        comments = cachedData.comments;
        currentPage = cachedData.currentPage;
        totalPages = cachedData.totalPages;
        totalComments = cachedData.totalComments;
        renderComments();
        renderCommentsStats();
        renderPagination();
        return;
    }
    
    // 避免重复请求
    if (isCommentsLoading) {
        console.log('Comments are already loading, skipping duplicate request');
        return;
    }
    
    isCommentsLoading = true;
    commentsLoadStartTime = Date.now(); // 记录开始时间
    
    const commentsList = document.getElementById('commentsList');
    
    // 显示加载状态
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="text-center py-5" id="commentsLoading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在加载留言... <span id="loadingTime">0.0</span>s</p>
            </div>
        `;
        
        // 实时更新加载时间
        const loadingTimeElement = document.getElementById('loadingTime');
        const loadingInterval = setInterval(() => {
            if (loadingTimeElement && isCommentsLoading) {
                const elapsed = ((Date.now() - commentsLoadStartTime) / 1000).toFixed(1);
                loadingTimeElement.textContent = elapsed;
            } else {
                clearInterval(loadingInterval);
            }
        }, 100);
    }
    
    try {
        // 设置8秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 8000);
        
        const response = await fetch(`/api/comments?page=${page}&limit=8`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            comments = data.comments;
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            totalComments = data.totalComments;
            
            // 缓存数据
            commentsCache.set(cacheKey, data);
            
            renderComments();
            renderCommentsStats();
            renderPagination();
            
            // 记录加载时间
            const loadTime = ((Date.now() - commentsLoadStartTime) / 1000).toFixed(2);
            console.log(`Comments loaded in ${loadTime} seconds`);
        } else {
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        if (error.name === 'AbortError') {
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">加载超时，请检查网络连接或刷新页面重试</p>';
        } else {
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">加载留言失败，请稍后重试</p>';
        }
    } finally {
        isCommentsLoading = false;
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
        commentItem.className = 'bg-white rounded-lg p-4 message-shadow message-hover';
        
        const date = new Date(comment.date).toLocaleString();
        
        // 解析并处理联系方式隐私保护
        let contactDisplay = '访客';
        let contactInfo = '';
        let contactType = '';
        
        if (comment.name.includes(':')) {
            const [type, infoRaw] = comment.name.split(':', 2);
            contactType = type;
            // 对联系方式进行部分隐藏处理
            contactInfo = maskContactInfo(infoRaw);
            contactDisplay = '访客';
        }
        
        // 构建留言内容
        let commentContent = '';
        
        // 留言头部信息
        let contactIcon = '';
        if (contactType === 'QQ') {
            contactIcon = '<i class="fa fa-qq mr-1 text-gray-400" aria-hidden="true"></i>';
        } else if (contactType === '微信') {
            contactIcon = '<i class="fa fa-weixin mr-1 text-gray-400" aria-hidden="true"></i>';
        } else if (contactType === '邮箱') {
            contactIcon = '<i class="fa fa-envelope mr-1 text-gray-400" aria-hidden="true"></i>';
        }
        
        commentContent += `
            <div class="comment-item-header">
                <div class="comment-item-user">
                    <div class="comment-item-avatar">
                        <i class="fa fa-user text-xs" aria-hidden="true"></i>
                    </div>
                    <div>
                        <div class="comment-item-name">${contactDisplay}</div>
                        <div class="comment-item-contact">
                            ${contactIcon}
                            ${contactInfo || '访客'}
                        </div>
                    </div>
                </div>
                <div class="comment-item-date">
                    <i class="fa fa-clock-o mr-1" aria-hidden="true"></i>
                    ${date}
                </div>
            </div>
        `;
        
        // 留言内容区域
        let contentHtml = '';
        
        // 如果留言未公开，显示提示信息
        if (!comment.approved) {
            contentHtml = '此留言不公开，管理员回复后才能公开留言';
        } else {
            contentHtml = comment.content;
        }
        
        commentContent += `
            <div class="comment-item-content">
                <p class="text-gray-700 text-sm leading-tight">
                    ${contentHtml}
                </p>
            </div>
        `;
        
        // 如果有管理员回复，则显示
        if (comment.reply) {
            // 获取管理员回复时间
            let replyTime = '';
            if (comment.reply_date) {
                const replyDate = new Date(comment.reply_date);
                replyTime = replyDate.toLocaleString();
            }
            
            commentContent += `
                <div class="comment-item-reply">
                    <div class="comment-item-reply-header">
                        <div class="comment-item-reply-title">
                            <i class="fa fa-shield mr-1" aria-hidden="true"></i>
                            管理员回复
                        </div>
                        <div class="comment-item-reply-time">
                            ${replyTime}
                        </div>
                    </div>
                    <div class="comment-item-reply-content">
                        <p class="text-gray-700 text-sm leading-tight">
                            ${comment.reply}
                        </p>
                    </div>
                </div>
            `;
        }
        
        // 如果留言未公开，添加待回复标签
        if (!comment.approved) {
            commentItem.classList.add('border', 'border-amber-100');
            commentContent = `
                <div class="comment-item-header">
                    <div class="comment-item-user">
                        <div class="comment-item-avatar">
                            <i class="fa fa-user text-xs" aria-hidden="true"></i>
                        </div>
                        <div>
                            <div class="comment-item-name">${contactDisplay}</div>
                            <div class="comment-item-contact">
                                ${contactIcon}
                                ${contactInfo || '访客'}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <span class="comment-item-pending-tag">
                            待回复
                        </span>
                        <div class="comment-item-date">
                            <i class="fa fa-clock-o mr-1" aria-hidden="true"></i>
                            ${date}
                        </div>
                    </div>
                </div>
                <div class="comment-item-content">
                    <p class="text-gray-700 text-sm leading-tight">
                        ${contentHtml}
                    </p>
                </div>
            `;
        }
        
        commentItem.innerHTML = commentContent;
        
        commentsList.appendChild(commentItem);
    });
    
    // 添加留言项的动画效果
    const commentItems = document.querySelectorAll('.bg-white.rounded-lg.p-4');
    commentItems.forEach((item, index) => {
        // 添加延迟，创建逐个出现的效果
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            
            // 触发动画
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}

// 渲染留言统计信息
function renderCommentsStats() {
    const totalElement = document.getElementById('totalCommentsCount');
    const repliedElement = document.getElementById('repliedCommentsCount');
    const pendingElement = document.getElementById('pendingCommentsCount');
    
    if (!totalElement) return;
    
    totalElement.textContent = totalComments;
    
    // 计算已回复和待回复的数量（基于当前页面数据）
    let repliedCount = 0;
    let pendingCount = 0;
    
    comments.forEach(comment => {
        if (comment.reply && comment.reply.trim() !== '') {
            repliedCount++;
        } else {
            pendingCount++;
        }
    });
    
    // 更新统计信息
    if (repliedElement) {
        // 显示所有留言中已回复的总数，而不是当前页面的回复数量
        // 通过API获取真实的已回复总数
        fetchRepliedCommentsCount().then(count => {
            repliedElement.textContent = count;
        }).catch(error => {
            console.error('Error fetching replied comments count:', error);
            repliedElement.textContent = repliedCount; // 回退到当前页面的计算
        });
    }
    
    if (pendingElement) {
        pendingElement.textContent = pendingCount;
    }
}

// 获取已回复留言的总数
async function fetchRepliedCommentsCount() {
    try {
        const response = await fetch('/api/comments?action=replied-count');
        if (response.ok) {
            const data = await response.json();
            return data.count;
        } else {
            throw new Error('Failed to fetch replied comments count');
        }
    } catch (error) {
        console.error('Error fetching replied comments count:', error);
        throw error;
    }
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
    
    let paginationHTML = '';
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${currentPage - 1}">
                <i class="fa fa-chevron-left text-xs" aria-hidden="true"></i>
            </a>
        `;
    } else {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500" disabled>
                <i class="fa fa-chevron-left text-xs" aria-hidden="true"></i>
            </a>
        `;
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
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="1">1</a>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
            `;
        }
    }
    
    // 显示页码
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-primary text-sm font-medium text-white" data-page="${i}">${i}</a>
            `;
        } else {
            paginationHTML += `
                <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${i}">${i}</a>
            `;
        }
    }
    
    // 显示最后一页和省略号
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
            `;
        }
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${totalPages}">${totalPages}</a>
        `;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${currentPage + 1}">
                <i class="fa fa-chevron-right text-xs" aria-hidden="true"></i>
            </a>
        `;
    } else {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500" disabled>
                <i class="fa fa-chevron-right text-xs" aria-hidden="true"></i>
            </a>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // 添加分页点击事件
    pagination.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentPage && !this.hasAttribute('disabled')) {
                fetchComments(page);
            }
        });
    });
    
    // 预加载下一页（如果存在）
    if (currentPage < totalPages) {
        preloadNextPage(currentPage + 1);
    }
}

// 预加载下一页留言
async function preloadNextPage(page) {
    const cacheKey = `page_${page}`;
    // 如果已经缓存了下一页，不需要预加载
    if (commentsCache.has(cacheKey)) {
        return;
    }
    
    try {
        console.log('Preloading comments for page', page);
        const response = await fetch(`/api/comments?page=${page}&limit=8`);
        if (response.ok) {
            const data = await response.json();
            // 缓存数据
            commentsCache.set(cacheKey, data);
            console.log('Preloaded comments for page', page);
        }
    } catch (error) {
        console.error('Error preloading comments for page', page, error);
    }
}

// 联系方式隐私保护函数
function maskContactInfo(contactInfo) {
    if (!contactInfo) return contactInfo;
    
    // 如果是邮箱
    if (contactInfo.includes('@')) {
        const [localPart, domain] = contactInfo.split('@');
        if (localPart.length <= 5) { // 如果本地部分太短，无法显示前2后3，可以返回原字符串或根据需求处理
            return contactInfo;
        }
        // 邮箱显示前2位+**+后3位@域名，如1234567@qq.com显示为12**567@qq.com
        const start = localPart.substring(0, 4); // 获取前2位
        const end = localPart.substring(localPart.length - 4); // 获取后3位
        const maskedLocalPart = `${start}**${end}`;
        return `${maskedLocalPart}@${domain}`;
    }
    // 如果是QQ号或微信号
    if (contactInfo.length <= 3) {
        return contactInfo; // 太短无法隐藏
    }
    
    // QQ/微信隐藏规则：显示前3位和后3位，5位数显示前2后2位
    if (contactInfo.length === 5) {
        // 5位数显示前2位和后2位
        const start = contactInfo.substring(0, 3);
        const end = contactInfo.substring(contactInfo.length - 3);
        return `${start}**${end}`;
    } else {
        // 其他长度显示前3位和后3位
        const start = contactInfo.substring(0, 3);
        const end = contactInfo.substring(contactInfo.length - 5);
        return `${start}**${end}`;
    }
}

// 获取客户端IP地址
async function getClientIP() {
    try {

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

        // 尝试使用第二种方法 - ip.sb (对中国国内友好)
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
        
        // 如果前两种方法失败，尝试第三种方法 - ipinfo.io (对中国国内友好)
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
    
    // 验证联系方式类型
    if (!contactType) {
        showCommentStatus('请选择联系方式类型', 'error');
        return;
    }
    
    // 验证联系方式
    if (!contactInfo || contactInfo.trim().length === 0) {
        showCommentStatus('请输入联系方式', 'error');
        return;
    }
    
    // 根据不同的联系方式类型进行验证
    if (contactType === 'QQ') {
        // QQ号码验证：5-15位数字
        if (!/^[1-9][0-9]{4,14}$/.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的QQ号码（5-15位数字，不能以0开头）', 'error');
            return;
        }
    } else if (contactType === '微信') {
        // 微信号验证：6-20位，可包含字母、数字、下划线、减号，不能纯数字
        if (!/^[a-zA-Z0-9_-]{6,20}$/.test(contactInfo.trim()) || /^\d+$/.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的微信号（6-20位，可包含字母、数字、下划线、减号，不能纯数字）', 'error');
            return;
        }
    } else if (contactType === '邮箱') {
        // 邮箱验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的邮箱地址', 'error');
            return;
        }
    }
    
    // 验证留言内容长度（至少3个字）
    if (!content || content.trim().length <= 3) {
        showCommentStatus('留言内容至少需要3个字', 'error');
        return;
    }
    
    // 禁用提交按钮并显示加载状态，防止重复提交
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>提交中...';
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
            submitButton.innerHTML = '<i class="bi bi-send me-2"></i>提交留言';
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
    
    // 首先获取文件列表
    fetchFiles().then(() => {
        console.log('Files loaded');
        // 文件列表加载完成后再获取留言列表
        return fetchComments();
    }).then(() => {
        console.log('Comments loaded');
    }).catch((error) => {
        console.error('Error loading content:', error);
    });
    
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
    
    // 为留言项添加渐入动画效果
    setTimeout(() => {
        const commentItems = document.querySelectorAll('.comment-item');
        commentItems.forEach((item, index) => {
            // 添加延迟，创建逐个出现的效果
            setTimeout(() => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                
                // 触发动画
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
    }, 500);
    
    // 定期刷新文件列表以确保同步（仅在页面可见时刷新）
    let filesRefreshInterval;
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时清除定时器
            if (filesRefreshInterval) {
                clearInterval(filesRefreshInterval);
                filesRefreshInterval = null;
            }
        } else {
            // 页面显示时重新启动定时器
            if (!filesRefreshInterval) {
                filesRefreshInterval = setInterval(fetchFiles, 60000); // 每60秒刷新一次
            }
        }
    });
    
    // 初始设置定时器
    filesRefreshInterval = setInterval(fetchFiles, 60000); // 每60秒刷新一次
    
    // 添加联系方式类型变化事件监听器
    const contactTypeSelect = document.getElementById('contactType');
    const contactInfoInput = document.getElementById('contactInfo');
    const contactInfoHelp = document.getElementById('contactInfoHelp');
    
    if (contactTypeSelect && contactInfoInput && contactInfoHelp) {
        contactTypeSelect.addEventListener('change', function() {
            updateContactInfoPlaceholderAndHelp(this.value);
        });
        
        // 实时验证联系方式
        contactInfoInput.addEventListener('input', function() {
            validateContactInfo();
        });
    }
});

// 更新联系方式输入框的占位符和帮助文本
function updateContactInfoPlaceholderAndHelp(contactType) {
    const contactInfoInput = document.getElementById('contactInfo');
    const contactInfoHelp = document.getElementById('contactInfoHelp');
    
    if (!contactInfoInput || !contactInfoHelp) return;
    
    switch(contactType) {
        case 'QQ':
            contactInfoInput.placeholder = '请输入您的QQ号码（5-15位数字）';
            contactInfoHelp.textContent = '请输入有效的QQ号码，例如：1234567';
            contactInfoHelp.className = 'form-text text-muted';
            break;
        case '微信':
            contactInfoInput.placeholder = '请输入您的微信号（6-20位字母或数字）';
            contactInfoHelp.textContent = '请输入有效的微信号，例如：weixin123';
            contactInfoHelp.className = 'form-text text-muted';
            break;
        case '邮箱':
            contactInfoInput.placeholder = '请输入您的邮箱地址';
            contactInfoHelp.textContent = '请输入有效的邮箱地址，例如：example@qq.com';
            contactInfoHelp.className = 'form-text text-muted';
            break;
        default:
            contactInfoInput.placeholder = '请输入您的QQ号/微信号/邮箱地址';
            contactInfoHelp.textContent = '';
            contactInfoHelp.className = 'form-text';
    }
}

// 验证联系方式
function validateContactInfo() {
    const contactType = document.getElementById('contactType').value;
    const contactInfo = document.getElementById('contactInfo').value;
    const contactInfoHelp = document.getElementById('contactInfoHelp');
    
    if (!contactType || !contactInfo || contactInfo.trim().length === 0) {
        return; // 没有选择类型或没有输入内容时不显示错误
    }
    
    let isValid = true;
    let helpText = '';
    
    if (contactType === 'QQ') {
        // QQ号码验证：5-15位数字，不能以0开头
        if (!/^[1-9][0-9]{4,14}$/.test(contactInfo.trim())) {
            isValid = false;
            helpText = 'QQ号码格式不正确，请输入5-15位数字（不能以0开头）';
        }
    } else if (contactType === '微信') {
        // 微信号验证：6-20位，可包含字母、数字、下划线、减号，不能纯数字
        if (!/^[a-zA-Z0-9_-]{6,20}$/.test(contactInfo.trim()) || /^\d+$/.test(contactInfo.trim())) {
            isValid = false;
            helpText = '微信号格式不正确，请输入6-20位（可包含字母、数字、下划线、减号，不能纯数字）';
        }
    } else if (contactType === '邮箱') {
        // 邮箱验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactInfo.trim())) {
            isValid = false;
            helpText = '邮箱地址格式不正确，请输入有效的邮箱地址';
        }
    }
    
    if (contactInfoHelp) {
        contactInfoHelp.textContent = helpText;
        if (isValid) {
            if (helpText) {
                contactInfoHelp.className = 'form-text text-success';
            } else {
                contactInfoHelp.className = 'form-text text-muted';
            }
        } else {
            contactInfoHelp.className = 'form-text text-danger';
        }
    }
}

// 添加一个窗口加载事件作为备选方案
window.addEventListener('load', function() {
});

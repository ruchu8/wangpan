// 全局变量
let authToken = localStorage.getItem('adminToken');
let filesList = [];
let commentsList = [];
let currentCommentsPage = 1;
let totalCommentsPages = 1;
let totalCommentsCount = 0;
let currentFolderIndex = -1;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    checkAuth();

    // 侧边栏切换功能
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('show');
    });

    // 侧边栏菜单点击事件
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => {
                l.classList.remove('active');
            });
            
            // 添加当前活动状态
            this.classList.add('active');
            
            // 隐藏所有页面内容
            document.querySelectorAll('.page-content').forEach(page => {
                page.style.display = 'none';
            });
            
            // 显示选中的页面
            const target = this.getAttribute('data-target');
            document.getElementById(target).style.display = 'block';
            
            // 根据页面加载数据
            if (target === 'files') {
                loadFiles();
            } else if (target === 'comments') {
                loadComments();
            } else if (target === 'dashboard') {
                loadDashboardStats();
            } else if (target === 'settings') {
                loadSettings();
            }
        });
    });

    // 退出登录按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 刷新按钮事件
    document.getElementById('refreshBtn').addEventListener('click', function() {
        const activePage = document.querySelector('.sidebar-menu .nav-link.active').getAttribute('data-target');
        if (activePage === 'files') {
            loadFiles();
        } else if (activePage === 'comments') {
            loadComments();
        } else if (activePage === 'dashboard') {
            loadDashboardStats();
        }
    });

    // 添加文件夹按钮事件
    document.getElementById('addFolderBtn').addEventListener('click', function() {
        document.getElementById('folderModalTitle').textContent = '添加文件夹';
        document.getElementById('folderForm').reset();
        document.getElementById('folderIndex').value = '';
        
        const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
        folderModal.show();
    });
    
    // 添加文件夹按钮事件（第二个按钮）
    document.getElementById('addFolderBtn2').addEventListener('click', function() {
        document.getElementById('folderModalTitle').textContent = '添加文件夹';
        document.getElementById('folderForm').reset();
        document.getElementById('folderIndex').value = '';
        
        const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
        folderModal.show();
    });

    // 保存文件夹按钮事件
    document.getElementById('saveFolderBtn').addEventListener('click', saveFolder);
    
    // 保存文件按钮事件
    document.getElementById('saveFileModalBtn').addEventListener('click', saveFolderFile);

    // 添加文件按钮事件
    document.getElementById('addFileBtn').addEventListener('click', function() {
        if (currentFolderIndex === -1) {
            alert('请先选择一个文件夹');
            return;
        }
        
        document.getElementById('fileModalTitle').textContent = '添加文件';
        document.getElementById('fileFormModal').reset();
        document.getElementById('folderIndex').value = currentFolderIndex;
        document.getElementById('fileIndex').value = '';
        
        // 设置默认时间为当前时间
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('fileCreatedAt').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
        fileModal.show();
    });

    // 发送回复按钮事件
    document.getElementById('sendReplyBtn').addEventListener('click', sendReply);

    // 导出数据按钮事件
    document.getElementById('exportDataBtn').addEventListener('click', exportData);

    // 刷新留言按钮事件
    document.getElementById('refreshCommentsBtn').addEventListener('click', function() {
        loadComments(currentCommentsPage);
    });

    // 管理员设置表单提交事件
    document.getElementById('adminSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        changePassword();
    });
    
    // 备份按钮事件
    document.getElementById('backupBtn').addEventListener('click', backupDatabase);
    
    // 还原按钮事件
    document.getElementById('confirmRestoreBtn').addEventListener('click', restoreDatabase);
    
    // 默认加载仪表板数据
    loadDashboardStats();
});

// 检查认证状态
function checkAuth() {
    if (authToken) {
        loadDashboardStats();
    } else {
        // 重定向到登录页面
        window.location.href = 'login.html';
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('adminToken');
    authToken = null;
    window.location.href = 'login.html';
}

// 加载仪表板统计数据
async function loadDashboardStats() {
    try {
        // 加载文件统计
        const filesResponse = await fetch('/api/files', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (filesResponse.ok) {
            const files = await filesResponse.json();
            document.getElementById('fileCount').textContent = files.length;
            
            // 计算文件总数（包括子文件）
            let totalFileCount = 0;
            files.forEach(file => {
                if (file.children && Array.isArray(file.children)) {
                    totalFileCount += file.children.length;
                }
            });
            
            // 这里可以显示更多统计信息
        }
        
        // 加载留言统计 - 使用专门的API获取准确的全局统计数据
        try {
            // 获取留言总数
            const commentsResponse = await fetch('/api/comments', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                document.getElementById('commentCount').textContent = commentsData.totalComments || commentsData.comments.length;
            }
            
            // 获取待回复留言数量
            const pendingResponse = await fetch('/api/comments?action=pending-count', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (pendingResponse.ok) {
                const pendingData = await pendingResponse.json();
                document.getElementById('pendingCommentCount').textContent = pendingData.count;
            }
            
            // 获取已回复留言数量
            const repliedResponse = await fetch('/api/comments?action=replied-count', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (repliedResponse.ok) {
                const repliedData = await repliedResponse.json();
                document.getElementById('repliedCommentCount').textContent = repliedData.count;
            }
        } catch (commentsError) {
            console.error('Error loading comment stats:', commentsError);
        }
        
        // 获取最近活动
        try {
            const recentCommentsResponse = await fetch('/api/comments?page=1&limit=5', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (recentCommentsResponse.ok) {
                const recentData = await recentCommentsResponse.json();
                renderRecentActivities(recentData.comments);
            }
        } catch (activityError) {
            console.error('Error loading recent activities:', activityError);
        }
        
        // 获取系统信息
        const uptimeElement = document.getElementById('uptime');
        const versionElement = document.getElementById('version');
        
        // 设置运行时间
        uptimeElement.textContent = new Date().toLocaleString();
        
        // 设置版本信息
        if (versionElement) {
            versionElement.textContent = 'v1.2.0';
        }
        
        // 获取存储空间信息（模拟）
        const storageElement = document.getElementById('storage');
        if (storageElement) {
            // 模拟存储空间使用情况
            const used = Math.floor(Math.random() * 50) + 50; // 50-100%
            storageElement.innerHTML = `
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${used}%" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="100">${used}%</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// 渲染最近活动
function renderRecentActivities(comments) {
    const activityContainer = document.querySelector('#dashboard .list-group-flush');
    if (!activityContainer) return;
    
    // 清空现有内容
    activityContainer.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        activityContainer.innerHTML = `
            <div class="list-group-item">
                <div class="text-center py-3 text-muted">
                    暂无活动记录
                </div>
            </div>
        `;
        return;
    }
    
    // 显示最近的留言活动
    comments.slice(0, 5).forEach(comment => {
        const date = new Date(comment.date);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let timeAgo = '';
        if (diffHours < 1) {
            timeAgo = '刚刚';
        } else if (diffHours < 24) {
            timeAgo = `${diffHours}小时前`;
        } else {
            timeAgo = `${diffDays}天前`;
        }
        
        // 检查是否有回复
        if (comment.reply) {
            // 已回复的留言
            const replyDate = new Date(comment.reply_date);
            const replyDiffMs = now - replyDate;
            const replyDiffHours = Math.floor(replyDiffMs / (1000 * 60 * 60));
            const replyDiffDays = Math.floor(replyDiffMs / (1000 * 60 * 60 * 24));
            
            let replyTimeAgo = '';
            if (replyDiffHours < 1) {
                replyTimeAgo = '刚刚';
            } else if (replyDiffHours < 24) {
                replyTimeAgo = `${replyDiffHours}小时前`;
            } else {
                replyTimeAgo = `${replyDiffDays}天前`;
            }
            
            const activityItem = document.createElement('div');
            activityItem.className = 'list-group-item';
            activityItem.innerHTML = `
                <div class="d-flex">
                    <div class="flex-shrink-0">
                        <div class="file-icon" style="background: rgba(247, 37, 133, 0.1); color: #f72585;">
                            <i class="bi bi-reply"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-1">留言回复</h6>
                        <p class="mb-1 text-muted">管理员回复了用户留言</p>
                        <small class="text-muted">${replyTimeAgo}</small>
                    </div>
                </div>
            `;
            activityContainer.appendChild(activityItem);
        } else {
            // 新留言
            const activityItem = document.createElement('div');
            activityItem.className = 'list-group-item';
            activityItem.innerHTML = `
                <div class="d-flex">
                    <div class="flex-shrink-0">
                        <div class="file-icon file-icon-bg">
                            <i class="bi bi-chat-dots"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-1">新留言</h6>
                        <p class="mb-1 text-muted">用户提交了新留言</p>
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                </div>
            `;
            activityContainer.appendChild(activityItem);
        }
    });
}

// 加载文件列表
async function loadFiles() {
    try {
        const response = await fetch('/api/files', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            filesList = await response.json();
            renderFolderList();
            // 默认选中第一个文件夹
            if (filesList.length > 0) {
                selectFolder(0);
            } else {
                // 如果没有文件夹，清空文件列表
                renderFileList();
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        alert('加载文件列表失败: ' + error.message);
    }
}

// 渲染文件夹列表
function renderFolderList() {
    const folderList = document.getElementById('folderList');
    folderList.innerHTML = '';
    
    if (filesList.length === 0) {
        folderList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder"></i>
                <p>暂无文件夹</p>
            </div>
        `;
        return;
    }
    
    filesList.forEach((folder, index) => {
        const li = document.createElement('li');
        li.className = 'folder-item';
        li.innerHTML = `
            <div class="folder-name">
                <i class="bi bi-folder"></i>
                ${folder.name}
            </div>
            <div class="file-count">
                ${folder.children ? folder.children.length + ' 个文件' : '空文件夹'}
            </div>
            <div class="folder-actions">
                <button class="btn btn-sm btn-outline-primary edit-folder" data-index="${index}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-folder" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        li.addEventListener('click', (e) => {
            // 只有点击非按钮区域才选择文件夹
            if (!e.target.closest('.folder-actions')) {
                selectFolder(index);
            }
        });
        folderList.appendChild(li);
    });
    
    // 添加编辑和删除事件
    document.querySelectorAll('.edit-folder').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            editFolder(index);
        });
    });
    
    document.querySelectorAll('.delete-folder').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            deleteFolder(index);
        });
    });
}

// 选择文件夹
function selectFolder(folderIndex) {
    // 更新文件夹列表的选中状态
    document.querySelectorAll('.folder-item').forEach((item, index) => {
        if (index === folderIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 保存当前选中的文件夹索引
    currentFolderIndex = folderIndex;
    
    // 更新文件列表标题
    document.getElementById('fileListTitle').textContent = filesList[folderIndex].name;
    
    // 显示添加文件按钮
    document.getElementById('addFileBtn').style.display = 'block';
    
    // 渲染文件列表
    renderFileList();
}

// 渲染文件列表
function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    if (currentFolderIndex === -1) {
        fileList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder"></i>
                <p>请选择一个文件夹</p>
            </div>
        `;
        return;
    }
    
    const folder = filesList[currentFolderIndex];
    
    if (!folder.children || folder.children.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-file-earmark"></i>
                <p>该文件夹为空</p>
            </div>
        `;
        return;
    }
    
    folder.children.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-url">${file.url}</div>
                <div class="file-meta">
                    类型: ${file.type || 'file'} | 
                    创建时间: ${file.createdAt || '未知'}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-sm btn-outline-primary edit-file" data-folder-index="${currentFolderIndex}" data-file-index="${index}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-file" data-folder-index="${currentFolderIndex}" data-file-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        fileList.appendChild(li);
    });
    
    // 添加编辑和删除事件
    document.querySelectorAll('.edit-file').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const folderIndex = parseInt(this.getAttribute('data-folder-index'));
            const fileIndex = parseInt(this.getAttribute('data-file-index'));
            editFolderFile(folderIndex, fileIndex);
        });
    });
    
    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const folderIndex = parseInt(this.getAttribute('data-folder-index'));
            const fileIndex = parseInt(this.getAttribute('data-file-index'));
            deleteFolderFile(folderIndex, fileIndex);
        });
    });
}

// 编辑文件夹
function editFolder(folderIndex) {
    const folder = filesList[folderIndex];
    
    document.getElementById('folderModalTitle').textContent = '编辑文件夹';
    document.getElementById('folderIndex').value = folderIndex;
    document.getElementById('folderName').value = folder.name;
    document.getElementById('folderNote').value = folder.note || '';
    
    const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
    folderModal.show();
}

// 保存文件夹
async function saveFolder() {
    const index = document.getElementById('folderIndex').value;
    const name = document.getElementById('folderName').value;
    const note = document.getElementById('folderNote').value;
    
    if (!name) {
        alert('请输入文件夹名称');
        return;
    }
    
    const folder = {
        name: name,
        type: 'folder',
        url: '',
        note: note,
        children: index !== '' ? filesList[index].children : [],
        expanded: false
    };
    
    try {
        let response;
        
        if (index === '') {
            // 添加新文件夹
            response = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({file: folder})
            });
        } else {
            // 更新现有文件夹
            response = await fetch('/api/files', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    index: parseInt(index),
                    file: folder
                })
            });
        }
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('folderModal')).hide();
            loadFiles();
            loadDashboardStats(); // 更新仪表板统计
        } else {
            let errorMessage = '保存失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `保存失败: ${response.status} ${response.statusText}`;
            } catch (jsonError) {
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || `保存失败: ${response.status} ${response.statusText}`;
                } catch (textError) {
                    errorMessage = `保存失败: ${response.status} ${response.statusText}`;
                }
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error saving folder:', error);
        alert('保存文件夹失败: ' + error.message);
    }
}

// 删除文件夹
async function deleteFolder(folderIndex) {
    if (!confirm('确定要删除这个文件夹及其所有文件吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/files', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ index: folderIndex })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            loadFiles();
            loadDashboardStats(); // 更新仪表板统计
        } else {
            try {
                const errorData = await response.json();
                alert(errorData.error || '删除失败');
            } catch (parseError) {
                const errorText = await response.text();
                alert(`删除失败: ${response.status} ${response.statusText}\n${errorText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        alert('删除文件夹失败: ' + error.message);
    }
}

// 编辑文件夹内的文件
function editFolderFile(folderIndex, fileIndex) {
    const folder = filesList[folderIndex];
    const file = folder.children[fileIndex];
    
    // 设置索引
    document.getElementById('folderIndex').value = folderIndex;
    document.getElementById('fileIndex').value = fileIndex;
    
    // 填充表单数据
    document.getElementById('fileName').value = file.name;
    document.getElementById('fileUrl').value = file.url || '';
    
    // 设置时间字段
    if (file.createdAt) {
        // 将 YYYY-MM-DD HH:MM 格式转换为 YYYY-MM-DDTHH:MM 格式
        const dateTime = file.createdAt.replace(' ', 'T');
        document.getElementById('fileCreatedAt').value = dateTime;
    } else {
        // 如果没有创建时间，设置为当前时间
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('fileCreatedAt').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // 设置模态框标题
    document.getElementById('fileModalTitle').textContent = '编辑文件';
    
    // 显示模态框
    const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
    fileModal.show();
}

// 保存文件夹内的文件
async function saveFolderFile() {
    const folderIndex = document.getElementById('folderIndex').value;
    const fileIndex = document.getElementById('fileIndex').value;
    const name = document.getElementById('fileName').value;
    const url = document.getElementById('fileUrl').value;
    const createdAt = document.getElementById('fileCreatedAt').value;
    
    if (!name) {
        alert('请输入文件名称');
        return;
    }
    
    // 检查是否是分割线（包含〓）
    const isDivider = url.includes('〓');
    
    // 将 datetime-local 格式转换为要求的格式 YYYY-MM-DD HH:MM
    let formattedCreatedAt = '';
    if (createdAt) {
        const date = new Date(createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        formattedCreatedAt = `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    let file;
    
    if (isDivider) {
        // 分割线类型文件
        file = {
            name: name,
            type: 'divider',
            url: url,
            createdAt: formattedCreatedAt
        };
    } else {
        // 普通文件类型
        if (!url) {
            alert('请输入文件URL');
            return;
        }
        
        // 确定文件类型（根据URL后缀简单判断）
        let fileType = 'file';
        if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
            fileType = 'image';
        } else if (url.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
            fileType = 'video';
        } else if (url.match(/\.(mp3|wav|ogg|flac)$/i)) {
            fileType = 'audio';
        } else if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
            fileType = 'document';
        } else if (url.match(/\.(zip|rar|7z|tar|gz)$/i)) {
            fileType = 'archive';
        }
        
        file = {
            name: name,
            type: fileType,
            url: url,
            createdAt: formattedCreatedAt
        };
    }
    
    try {
        let response;
        
        if (fileIndex === '') {
            // 添加新文件
            response = await fetch('/api/file-manager', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    folderIndex: parseInt(folderIndex),
                    file: file
                })
            });
        } else {
            // 更新现有文件
            response = await fetch('/api/file-manager', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    folderIndex: parseInt(folderIndex),
                    fileIndex: parseInt(fileIndex),
                    file: file
                })
            });
        }
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('fileModal')).hide();
            loadFiles();
            loadDashboardStats(); // 更新仪表板统计
        } else {
            const errorData = await response.json();
            alert(errorData.error || '保存失败');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        alert('保存文件失败: ' + error.message);
    }
}

// 删除文件夹内的文件
async function deleteFolderFile(folderIndex, fileIndex) {
    if (!confirm('确定要删除这个文件吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/file-manager', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                folderIndex: parseInt(folderIndex),
                fileIndex: parseInt(fileIndex)
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            loadFiles();
            loadDashboardStats(); // 更新仪表板统计
        } else {
            const errorData = await response.json();
            alert(errorData.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('删除文件失败: ' + error.message);
    }
}

// 加载留言列表
async function loadComments(page = 1) {
    try {
        const response = await fetch(`/api/comments?page=${page}&limit=10`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            commentsList = data.comments;
            currentCommentsPage = data.currentPage;
            totalCommentsPages = data.totalPages;
            totalCommentsCount = data.totalComments;
            renderCommentsList();
            renderCommentsPagination();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        alert('加载留言列表失败: ' + error.message);
    }
}

// 渲染留言列表
function renderCommentsList() {
    const tbody = document.getElementById('commentsList');
    tbody.innerHTML = '';
    
    if (commentsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">暂无留言</td>
            </tr>
        `;
        return;
    }
    
    commentsList.forEach(comment => {
        const tr = document.createElement('tr');
        const date = new Date(comment.date).toLocaleString();
        
        // 显示完整的联系方式给管理员
        let contactDisplay = comment.name;
        
        // 显示原始IP地址
        let ipDisplay = comment.ip || '未知';
        
        // 显示原始留言内容
        let contentDisplay = comment.content;
        
        // 显示管理员回复
        let replySection = '';
        if (comment.reply) {
            const replyTime = comment.reply_date ? new Date(comment.reply_date).toLocaleString() : '';
            replySection = `
                <div class="bg-light rounded p-2 mt-2">
                    <small class="text-muted">管理员回复 (${replyTime}):</small>
                    <div class="mt-1">${comment.reply}</div>
                </div>
            `;
        }
        
        tr.innerHTML = `
            <td>
                <div>${contactDisplay}</div>
                <small class="text-muted">${ipDisplay}</small>
            </td>
            <td>
                <div>${contentDisplay}</div>
                ${replySection}
            </td>
            <td>${date}</td>
            <td>
                ${comment.approved ? '<span class="badge bg-success badge-sm">已公开</span>' : '<span class="badge bg-warning badge-sm">待审核</span>'}
                ${comment.reply ? '<span class="badge bg-info badge-sm ms-1">已回复</span>' : '<span class="badge bg-secondary badge-sm ms-1">未回复</span>'}
            </td>
            <td>
                ${!comment.approved ? `<button class="btn btn-sm btn-success btn-action approve-comment" data-id="${comment.id}">公开</button>` : ''}
                <button class="btn btn-sm btn-info btn-action reply-comment" data-id="${comment.id}">回复</button>
                <button class="btn btn-sm btn-danger btn-action delete-comment" data-id="${comment.id}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加审核、回复和删除事件
    document.querySelectorAll('.approve-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            approveComment(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.reply-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            replyComment(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteComment(this.getAttribute('data-id'));
        });
    });
}

// 回复留言
function replyComment(id) {
    const comment = commentsList.find(c => c.id === id);
    if (!comment) return;
    
    document.getElementById('replyCommentId').value = id;
    document.getElementById('userCommentContent').textContent = comment.content;
    document.getElementById('replyContent').value = comment.reply || '';
    
    // 修改模态框标题
    document.querySelector('#replyModal .modal-title').textContent = '回复/编辑留言';
    
    const replyModal = bootstrap.Modal.getInstance(document.getElementById('replyModal')) || 
                      new bootstrap.Modal(document.getElementById('replyModal'));
    replyModal.show();
}

// 发送回复
async function sendReply() {
    const id = document.getElementById('replyCommentId').value;
    const userContent = document.getElementById('userCommentContent').textContent;
    const replyContent = document.getElementById('replyContent').value;
    
    // 检查是否修改了用户留言内容
    const comment = commentsList.find(c => c.id === id);
    const isContentModified = comment && comment.content !== userContent;
    
    try {
        let updateData = {
            id: id
        };
        
        // 如果修改了回复内容，则更新回复
        if (replyContent.trim()) {
            updateData.reply = replyContent;
            updateData.approved = true;  // 自动设置为公开
            updateData.reply_date = new Date().toISOString();  // 添加回复时间
        }
        
        // 如果修改了用户留言内容，则更新留言
        if (isContentModified) {
            updateData.content = userContent;
        }
        
        // 同时更新回复内容和设置为已公开
        const response = await fetch('/api/comments', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
            loadComments(currentCommentsPage);
            loadDashboardStats(); // 更新仪表板统计
            
            // 重置模态框标题
            document.querySelector('#replyModal .modal-title').textContent = '回复留言';
        } else {
            const error = await response.json();
            alert(error.error || '操作失败');
        }
    } catch (error) {
        alert('操作失败');
    }
}

// 审核留言
async function approveComment(id) {
    try {
        const response = await fetch('/api/comments', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                id,
                approved: true
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            loadComments(currentCommentsPage);
            loadDashboardStats(); // 更新仪表板统计
        } else {
            const error = await response.json();
            alert(error.error || '公开留言失败');
        }
    } catch (error) {
        console.error('Error approving comment:', error);
        alert('公开留言失败');
    }
}

// 删除留言
async function deleteComment(id) {
    if (!confirm('确定要删除这条留言吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/comments', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ id })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            loadComments(currentCommentsPage);
            loadDashboardStats(); // 更新仪表板统计
        } else if (response.status === 404) {
            alert('留言不存在，可能已被删除');
            loadComments(currentCommentsPage);
        } else {
            const error = await response.json();
            alert(error.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('删除留言失败: ' + error.message);
    }
}

// 渲染留言分页控件
function renderCommentsPagination() {
    const paginationContainer = document.getElementById('commentsPagination');
    if (!paginationContainer) return;
    
    // 如果只有一页或没有留言，不显示分页控件
    if (totalCommentsPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    if (currentCommentsPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentCommentsPage - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">上一页</span></li>`;
    }
    
    // 页码按钮（最多显示5个页码）
    let startPage, endPage;
    if (totalCommentsPages <= 5) {
        // 如果总页数小于等于5，显示所有页码
        startPage = 1;
        endPage = totalCommentsPages;
    } else {
        // 如果总页数大于5，显示当前页和前后各2页
        if (currentCommentsPage <= 3) {
            startPage = 1;
            endPage = 5;
        } else if (currentCommentsPage + 2 >= totalCommentsPages) {
            startPage = totalCommentsPages - 4;
            endPage = totalCommentsPages;
        } else {
            startPage = currentCommentsPage - 2;
            endPage = currentCommentsPage + 2;
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
        if (i === currentCommentsPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }
    
    // 显示最后一页和省略号
    if (endPage < totalCommentsPages) {
        if (endPage < totalCommentsPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalCommentsPages}">${totalCommentsPages}</a></li>`;
    }
    
    // 下一页按钮
    if (currentCommentsPage < totalCommentsPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentCommentsPage + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">下一页</span></li>`;
    }
    
    paginationContainer.innerHTML = paginationHTML;
    
    // 添加分页点击事件
    paginationContainer.querySelectorAll('.page-link:not(.disabled)').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentCommentsPage) {
                loadComments(page);
            }
        });
    });
}

// 导出数据
function exportData() {
    // 创建包含所有数据的对象
    const dataToExport = {
        files: filesList,
        comments: commentsList,
        exportDate: new Date().toISOString()
    };
    
    // 转换为JSON字符串
    const dataStr = JSON.stringify(dataToExport, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `website_data_${new Date().toISOString().slice(0, 10)}.json`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 加载系统设置
function loadSettings() {
    // 这里可以加载系统设置信息
    document.getElementById('uptime').textContent = new Date().toLocaleString();
}

// 备份数据库
async function backupDatabase() {
    try {
        const response = await fetch('/api/backup', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('数据库备份成功！');
        } else if (response.status === 401) {
            logout();
        } else {
            const errorData = await response.json();
            alert('备份失败: ' + (errorData.error || '未知错误'));
        }
    } catch (error) {
        console.error('Backup error:', error);
        alert('备份失败: ' + error.message);
    }
}

// 还原数据库
async function restoreDatabase() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择备份文件');
        return;
    }
    
    if (!confirm('警告：这将覆盖当前所有数据！确认要还原吗？')) {
        return;
    }
    
    try {
        const fileContent = await readFileAsText(file);
        const backupData = JSON.parse(fileContent);
        
        const response = await fetch('/api/restore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(backupData)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('数据库还原成功！页面将重新加载。');
            // 关闭模态框
            const restoreModal = bootstrap.Modal.getInstance(document.getElementById('restoreModal'));
            restoreModal.hide();
            // 重新加载页面
            location.reload();
        } else if (response.status === 401) {
            logout();
        } else {
            const errorData = await response.json();
            alert('还原失败: ' + (errorData.error || '未知错误'));
        }
    } catch (error) {
        console.error('Restore error:', error);
        alert('还原失败: ' + error.message);
    }
}

// 读取文件内容为文本
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

// 修改密码
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('请填写所有密码字段');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('新密码和确认密码不匹配');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('新密码至少需要6个字符');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        if (response.ok) {
            alert('密码修改成功！请重新登录。');
            // 清空表单
            document.getElementById('adminSettingsForm').reset();
            // 退出登录
            logout();
        } else if (response.status === 401) {
            logout();
        } else {
            const errorData = await response.json();
            alert('密码修改失败: ' + (errorData.error || '未知错误'));
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('密码修改失败: ' + error.message);
    }
}
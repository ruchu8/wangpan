// 全局变量
let authToken = localStorage.getItem('adminToken');
let filesList = [];
let commentsList = [];
let currentCommentsPage = 1;
let totalCommentsPages = 1;
let totalCommentsCount = 0;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    checkAuth();

    // 登录按钮事件
    document.getElementById('loginBtn').addEventListener('click', login);

    // 退出登录按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 添加文件夹按钮事件
    document.getElementById('addFileBtn').addEventListener('click', () => {
        document.getElementById('fileModalTitle').textContent = '添加文件夹';
        document.getElementById('fileForm').reset();
        document.getElementById('fileIndex').value = '';
        document.getElementById('fileType').value = 'folder';
        document.getElementById('fileType').disabled = true; // 禁用类型选择
        document.getElementById('fileUrl').closest('.form-group').style.display = 'none'; // 隐藏URL字段
        document.getElementById('childrenContainer').style.display = 'none'; // 隐藏子文件容器
        
        const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
        fileModal.show();
    });
    
    // 导出数据按钮事件
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    
    // 导入数据按钮事件
    document.getElementById('importFile').addEventListener('change', importData);

    // 文件类型变更事件（虽然禁用了，但保留以防需要）
    document.getElementById('fileType').addEventListener('change', function() {
        const childrenContainer = document.getElementById('childrenContainer');
        if (this.value === 'folder') {
            childrenContainer.style.display = 'block';
        } else {
            childrenContainer.style.display = 'none';
        }
    });

    // 添加子文件按钮事件
    document.getElementById('addChildBtn').addEventListener('click', addChildField);

    // 保存文件按钮事件
    document.getElementById('saveFileBtn').addEventListener('click', saveFile);

    // 标签切换事件
    document.querySelectorAll('#adminTabs a').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.add('active');
            
            const tabId = this.getAttribute('href');
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            document.querySelector(tabId).classList.add('show', 'active');
            
            // 加载对应的数据
            if (tabId === '#filesTab') {
                loadFiles();
            } else if (tabId === '#commentsTab') {
                loadComments();
            }
        });
    });
    
    // 定期刷新文件列表
    setInterval(() => {
        if (document.getElementById('adminContent').style.display !== 'none') {
            loadFiles();
        }
    }, 30000); // 每30秒刷新一次
});

// 检查认证状态
function checkAuth() {
    if (authToken) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadFiles();
        loadComments();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
    }
}

// 登录
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('请输入用户名和密码');
        return;
    }
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            checkAuth();
        } else {
            showLoginError(data.message || '登录失败');
        }
    } catch (error) {
        showLoginError('登录请求失败，请稍后再试');
        console.error('Login error:', error);
    }
}

// 显示登录错误
function showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

// 退出登录
function logout() {
    localStorage.removeItem('adminToken');
    authToken = null;
    checkAuth();
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
            renderFilesList();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        alert('加载文件列表失败: ' + error.message);
    }
}

// 渲染文件列表
function renderFilesList() {
    const tbody = document.getElementById('filesList');
    tbody.innerHTML = '';
    
    filesList.forEach((file, index) => {
        const tr = document.createElement('tr');
        
        // 为文件夹添加"添加文件"按钮
        let addFileButton = '';
        if (file.type === 'folder') {
            addFileButton = `<button class="btn btn-sm btn-info btn-action add-file" data-index="${index}">添加文件</button>`;
        }
        
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>${file.type === 'folder' ? '文件夹' : '文件'}</td>
            <td>${file.url || '-'}</td>
            <td>${file.note || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-action edit-file" data-index="${index}">编辑</button>
                ${addFileButton}
                <button class="btn btn-sm btn-danger btn-action delete-file" data-index="${index}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加编辑、添加文件和删除事件
    document.querySelectorAll('.edit-file').forEach(btn => {
        btn.addEventListener('click', function() {
            editFile(parseInt(this.getAttribute('data-index')));
        });
    });
    
    document.querySelectorAll('.add-file').forEach(btn => {
        btn.addEventListener('click', function() {
            const folderIndex = parseInt(this.getAttribute('data-index'));
            showAddFileModal(folderIndex);
        });
    });
    
    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteFile(parseInt(this.getAttribute('data-index')));
        });
    });
}

// 显示添加文件到文件夹的模态框
function showAddFileModal(folderIndex) {
    // 创建模态框HTML
    const modalHtml = `
        <div class="modal fade" id="addFileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">添加文件到文件夹</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addFileForm">
                            <input type="hidden" id="folderIndex" value="${folderIndex}">
                            <div class="form-group">
                                <label for="addFileName">文件名称</label>
                                <input type="text" class="form-control" id="addFileName" required>
                            </div>
                            <div class="form-group">
                                <label for="addFileUrl">文件URL</label>
                                <input type="text" class="form-control" id="addFileUrl" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveAddFileBtn">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加模态框到页面
    if (document.getElementById('addFileModal')) {
        document.getElementById('addFileModal').remove();
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // 显示模态框
    const addFileModal = new bootstrap.Modal(document.getElementById('addFileModal'));
    addFileModal.show();
    
    // 保存文件事件
    document.getElementById('saveAddFileBtn').addEventListener('click', function() {
        const fileName = document.getElementById('addFileName').value;
        const fileUrl = document.getElementById('addFileUrl').value;
        const folderIndex = parseInt(document.getElementById('folderIndex').value);
        
        if (!fileName || !fileUrl) {
            alert('请填写完整的文件信息');
            return;
        }
        
        addFileToFolder(folderIndex, fileName, fileUrl);
        addFileModal.hide();
    });
}

// 编辑文件
function editFile(index) {
    const file = filesList[index];
    
    document.getElementById('fileModalTitle').textContent = '编辑文件/文件夹';
    document.getElementById('fileIndex').value = index;
    document.getElementById('fileName').value = file.name;
    document.getElementById('fileType').value = file.type;
    document.getElementById('fileUrl').value = file.url || '';
    document.getElementById('fileNote').value = file.note || '';
    
    const childrenContainer = document.getElementById('childrenContainer');
    const childrenList = document.getElementById('childrenList');
    childrenList.innerHTML = '';
    
    if (file.type === 'folder') {
        childrenContainer.style.display = 'block';
        
        if (file.children && file.children.length > 0) {
            file.children.forEach((child, childIndex) => {
                addChildField(child, childIndex);
            });
        }
    } else {
        childrenContainer.style.display = 'none';
    }
    
    const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
    fileModal.show();
}

// 添加子文件字段
function addChildField(child = null, childIndex = null) {
    const childrenList = document.getElementById('childrenList');
    const childDiv = document.createElement('div');
    childDiv.className = 'child-item border p-2 mb-2';
    
    // 格式化日期，如果存在的话
    // 检查 createdAt 或 date 字段
    let childDate = '';
    if (child && (child.createdAt || child.date)) {
        childDate = child.createdAt || child.date;
    } else {
        // 创建当前日期时间的格式化字符串
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        childDate = `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    childDiv.innerHTML = `
        <div class="row">
            <div class="col-3">
                <input type="text" class="form-control form-control-sm child-name" placeholder="名称" value="${child ? child.name : ''}">
            </div>
            <div class="col-3">
                <input type="text" class="form-control form-control-sm child-url" placeholder="URL" value="${child ? child.url : ''}">
            </div>
            <div class="col-3">
                <input type="text" class="form-control form-control-sm child-date" placeholder="YYYY-MM-DD HH:MM" value="${childDate}">
            </div>
            <div class="col-3">
                <button type="button" class="btn btn-sm btn-danger remove-child">删除</button>
            </div>
        </div>
    `;
    
    childrenList.appendChild(childDiv);
    
    // 添加删除子文件事件
    childDiv.querySelector('.remove-child').addEventListener('click', function() {
        childDiv.remove();
    });
}

// 保存文件
async function saveFile() {
    const index = document.getElementById('fileIndex').value;
    const name = document.getElementById('fileName').value;
    const note = document.getElementById('fileNote').value;
    
    if (!name) {
        alert('请输入文件夹名称');
        return;
    }
    
    // 强制设置为文件夹类型
    const type = 'folder';
    
    // 收集子文件数据
    const childrenList = document.getElementById('childrenList');
    const children = [];
    
    if (childrenList && childrenList.children.length > 0) {
        Array.from(childrenList.children).forEach(childDiv => {
            const childName = childDiv.querySelector('.child-name').value;
            const childUrl = childDiv.querySelector('.child-url').value;
            const childDate = childDiv.querySelector('.child-date').value;
            
            if (childName && childUrl) {
                children.push({
                    name: childName,
                    type: 'file',
                    url: childUrl,
                    createdAt: childDate || (() => {
                        // 创建当前日期时间的格式化字符串
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day} ${hours}:${minutes}`;
                    })() // 使用 createdAt 字段以保持一致性
                });
            }
        });
    }
    
    let file = {
        name: name,
        type,
        url: '', // 文件夹不需要URL
        note,
        children: children,
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
                body: JSON.stringify({ file }) // 修复：将file包装在file对象中
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
                    file
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
            // 同时刷新前台页面的文件列表
            refreshFrontendFileList();
        } else {
            let errorMessage = '保存失败';
            try {
                // 先尝试解析JSON
                const errorData = await response.json();
                errorMessage = errorData.error || `保存失败: ${response.status} ${response.statusText}`;
            } catch (jsonError) {
                // 如果JSON解析失败，尝试获取文本
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || `保存失败: ${response.status} ${response.statusText}`;
                } catch (textError) {
                    // 如果都失败了，使用默认消息
                    errorMessage = `保存失败: ${response.status} ${response.statusText}`;
                }
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error saving file:', error);
        alert('保存文件失败: ' + error.message);
    }
}

// 添加一个新函数来处理向现有文件夹添加文件
async function addFileToFolder(folderIndex, fileName, fileUrl) {
    try {
        // 获取现有文件列表
        const response = await fetch('/api/files', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            let errorMessage = '无法获取文件列表';
            try {
                // 先尝试解析JSON
                const errorData = await response.json();
                errorMessage = errorData.error || `无法获取文件列表: ${response.status} ${response.statusText}`;
            } catch (jsonError) {
                // 如果JSON解析失败，尝试获取文本
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || `无法获取文件列表: ${response.status} ${response.statusText}`;
                } catch (textError) {
                    // 如果都失败了，使用默认消息
                    errorMessage = `无法获取文件列表: ${response.status} ${response.statusText}`;
                }
            }
            alert(errorMessage);
            return;
        }
        
        const files = await response.json();
        
        if (folderIndex < 0 || folderIndex >= files.length || files[folderIndex].type !== 'folder') {
            alert('无效的文件夹索引');
            return;
        }
        
        // 添加文件到文件夹（不添加时间戳到文件名）
        const newFile = {
            name: fileName,
            type: 'file',
            url: fileUrl,
            createdAt: (() => {
                // 创建当前日期时间的格式化字符串
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            })() // 使用 createdAt 字段以保持与现有数据一致
        };
        
        // 确保children数组存在
        if (!files[folderIndex].children) {
            files[folderIndex].children = [];
        }
        
        files[folderIndex].children.push(newFile);
        
        // 更新文件夹
        const updateResponse = await fetch('/api/files', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                index: folderIndex,
                file: files[folderIndex]
            })
        });
        
        if (updateResponse.ok) {
            // 成功添加后，确保文件夹处于展开状态以便看到新添加的文件
            // 这里我们设置一个全局变量来记住应该展开的文件夹索引
            window.expandedFolderIndex = folderIndex;
            loadFiles();
            // 同时刷新前台页面的文件列表
            refreshFrontendFileList();
        } else {
            let errorMessage = '添加文件失败';
            try {
                // 先尝试解析JSON
                const errorData = await updateResponse.json();
                errorMessage = errorData.error || `添加文件失败: ${updateResponse.status} ${updateResponse.statusText}`;
            } catch (jsonError) {
                // 如果JSON解析失败，尝试获取文本
                try {
                    const errorText = await updateResponse.text();
                    errorMessage = errorText || `添加文件失败: ${updateResponse.status} ${updateResponse.statusText}`;
                } catch (textError) {
                    // 如果都失败了，使用默认消息
                    errorMessage = `添加文件失败: ${updateResponse.status} ${updateResponse.statusText}`;
                }
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error adding file to folder:', error);
        alert('添加文件失败: ' + error.message);
    }
}

// 删除文件
async function deleteFile(index) {
    if (!confirm('确定要删除这个文件/文件夹吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/files', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ index })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            loadFiles();
            // 同时刷新前台页面的文件列表
            refreshFrontendFileList();
        } else {
            // 安全地解析错误响应
            try {
                const errorData = await response.json();
                alert(errorData.error || '删除失败');
            } catch (parseError) {
                // 如果无法解析JSON，显示状态文本
                const errorText = await response.text();
                alert(`删除失败: ${response.status} ${response.statusText}\n${errorText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('删除文件失败: ' + error.message);
    }
}

// 刷新前台页面的文件列表
function refreshFrontendFileList() {
    // 通过向所有打开的窗口发送消息来刷新文件列表
    if (window.opener) {
        window.opener.postMessage('refresh-files', '*');
    }
    
    // 如果是在同一个标签页中打开的，尝试直接调用刷新函数
    if (window !== window.parent) {
        try {
            window.parent.postMessage('refresh-files', '*');
        } catch (e) {
            console.log('无法向父窗口发送消息:', e);
        }
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
            renderAdminCommentsStats();
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
    
    commentsList.forEach(comment => {
        const tr = document.createElement('tr');
        const date = new Date(comment.date).toLocaleString();
        
        // 显示完整的联系方式给管理员（不进行隐私保护处理）
        let contactDisplay = comment.name;
        
        // 后台显示原始IP地址（完整）
        let ipDisplay = comment.ip || '未知';
        
        // 后台显示原始留言内容，不显示提示信息
        let contentDisplay = comment.content;
        
        // 显示管理员回复
        let replySection = '';
        if (comment.reply) {
            const replyTime = comment.reply_date ? new Date(comment.reply_date).toLocaleString() : '';
            replySection = `
                <div class="bg-gray-50 rounded p-3 border-l-3 border-accent">
                    <div class="flex justify-between items-center mb-1">
                        <div class="font-medium text-accent flex items-center text-xs">
                            <i class="fa fa-shield mr-1" aria-hidden="true"></i>
                            管理员回复
                        </div>
                        <div class="text-xs text-gray-400">
                            ${replyTime}
                        </div>
                    </div>
                    <p class="text-gray-600 text-xs leading-tight">
                        ${comment.reply}
                    </p>
                </div>
            `;
        }
        
        tr.innerHTML = `
            <td>${contactDisplay}</td>
            <td>${ipDisplay}</td>
            <td>
                ${contentDisplay}
                ${replySection}
            </td>
            <td>${date}</td>
            <td>
                ${comment.approved ? '<span class="badge bg-success">已公开</span>' : '<span class="badge bg-warning">待审核</span>'}
                ${comment.reply ? '<span class="badge bg-info ms-1">已回复</span>' : '<span class="badge bg-secondary ms-1">未回复</span>'}
            </td>
            <td>
                ${!comment.approved ? `<button class="btn btn-sm btn-success btn-action approve-comment" data-id="${comment.id}">公开</button>` : ''}
                <button class="btn btn-sm btn-info btn-action reply-comment" data-id="${comment.id}">回复</button>
                <button class="btn btn-sm btn-danger btn-action delete-comment" data-id="${comment.id}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加审核和删除事件
    document.querySelectorAll('.approve-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            approveComment(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteComment(this.getAttribute('data-id'));
        });
    });
    
    // 添加回复事件
    document.querySelectorAll('.reply-comment').forEach(btn => {
        btn.addEventListener('click', function() {
            replyComment(this.getAttribute('data-id'));
        });
    });
}

// 渲染后台留言统计信息
function renderAdminCommentsStats() {
    const statsElement = document.getElementById('adminCommentsStats');
    if (!statsElement) return;
    
    statsElement.innerHTML = `<small class="text-muted">共 <strong>${totalCommentsCount}</strong> 条留言</small>`;
}

// 渲染留言分页控件
function renderCommentsPagination() {
    const paginationContainer = document.querySelector('#commentsTab .pagination');
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

// 回复留言
function replyComment(id) {
    const comment = commentsList.find(c => c.id === id);
    if (!comment) return;
    
    // 创建回复模态框
    const modalHtml = `
        <div class="modal fade" id="replyModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">回复留言</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label"><strong>用户留言:</strong></label>
                            <div class="p-2 bg-light rounded">${comment.content}</div>
                        </div>
                        <div class="mb-3">
                            <label for="replyContent" class="form-label">回复内容:</label>
                            <textarea class="form-control" id="replyContent" rows="3">${comment.reply || ''}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveReplyBtn">保存回复</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加模态框到页面
    if (document.getElementById('replyModal')) {
        document.getElementById('replyModal').remove();
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // 显示模态框
    const replyModal = new bootstrap.Modal(document.getElementById('replyModal'));
    replyModal.show();
    
    // 保存回复事件
    document.getElementById('saveReplyBtn').addEventListener('click', function() {
        const replyContent = document.getElementById('replyContent').value;
        saveReply(id, replyContent);
        replyModal.hide();
    });
}

// 保存回复
async function saveReply(id, replyContent) {
    try {
        const response = await fetch('/api/comments', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                id,
                reply: replyContent
            })
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            const result = await response.json();
            console.log('Reply saved successfully:', result);
            loadComments();
        } else {
            const error = await response.json();
            console.error('Error saving reply:', error);
            alert(error.error || '回复保存失败');
        }
    } catch (error) {
        console.error('Error saving reply:', error);
        alert('回复保存失败');
    }
}


// 审核留言 (修改为公开留言)
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
            loadComments();
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
            loadComments();
        } else if (response.status === 404) {
            alert('留言不存在，可能已被删除');
            loadComments(); // 刷新列表
        } else {
            const error = await response.json();
            alert(error.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('删除留言失败: ' + error.message);
    }
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

// 导入数据
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('导入数据将覆盖现有数据，确定继续吗？')) {
        event.target.value = ''; // 清空文件输入
        return;
    }
    
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!importedData.files || !importedData.comments) {
                    alert('无效的数据格式');
                    return;
                }
                
                // 确认导入
                if (!confirm(`确定要导入数据吗？\n文件数量: ${importedData.files.length}\n留言数量: ${importedData.comments.length}`)) {
                    return;
                }
                
                // 导入文件数据
                try {
                    const filesResponse = await fetch('/api/files', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            filesList: importedData.files || []
                        })
                    });
                    
                    if (!filesResponse.ok) {
                        const errorData = await filesResponse.json();
                        throw new Error(errorData.error || '导入文件数据失败');
                    }
                    
                    const result = await filesResponse.json();
                    console.log('Files imported successfully:', result);
                } catch (error) {
                    console.error('Error importing files:', error);
                    alert('导入文件数据失败: ' + error.message);
                    return;
                }
                
                // 导入留言数据
                try {
                    const commentsResponse = await fetch('/api/comments', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            commentsList: importedData.comments
                        })
                    });
                    
                    if (!commentsResponse.ok) {
                        const errorData = await commentsResponse.json();
                        throw new Error(errorData.error || '导入留言数据失败');
                    }
                    
                    const result = await commentsResponse.json();
                    console.log('Comments imported successfully:', result);
                } catch (error) {
                    console.error('Error importing comments:', error);
                    alert('导入留言数据失败: ' + error.message);
                    return;
                }
                
                // 刷新数据
                loadFiles();
                loadComments();
                // 同时刷新前台页面的文件列表
                refreshFrontendFileList();
                
                alert('数据导入成功！');
                event.target.value = ''; // 清空文件输入
            } catch (error) {
                console.error('Error parsing import file:', error);
                alert('导入文件解析失败，请检查文件格式');
            }
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error reading import file:', error);
        alert('读取导入文件失败');
    }
}

// 提交留言
async function submitComment(event) {
    event.preventDefault();
    
    const name = document.getElementById('commentName').value;
    const content = document.getElementById('commentContent').value;
    const statusElement = document.getElementById('commentStatus');
    
    if (!name || !content) {
        showCommentStatus('请填写完整信息', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, content })
        });
        
        if (response.ok) {
            document.getElementById('commentForm').reset();
            showCommentStatus('留言提交成功，等待审核后显示', 'success');
            fetchComments(); // 刷新留言列表
        } else {
            const errorData = await response.json();
            showCommentStatus(errorData.error || '提交失败', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showCommentStatus('提交失败，请稍后再试', 'error');
    }
}

// 显示留言状态
function showCommentStatus(message, type) {
    const statusElement = document.getElementById('commentStatus');
    statusElement.textContent = message;
    statusElement.className = 'comment-status ' + (type || '');
    
    setTimeout(() => {
        statusElement.className = 'comment-status';
    }, 3000);
}

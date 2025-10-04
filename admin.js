// 全局变量
let authToken = localStorage.getItem('adminToken');
let filesList = [];
let commentsList = [];

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    checkAuth();

    // 登录按钮事件
    document.getElementById('loginBtn').addEventListener('click', login);

    // 退出登录按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 添加文件按钮事件
    document.getElementById('addFileBtn').addEventListener('click', () => {
        document.getElementById('fileModalTitle').textContent = '添加文件/文件夹';
        document.getElementById('fileForm').reset();
        document.getElementById('fileIndex').value = '';
        document.getElementById('childrenContainer').style.display = 'none';
        document.getElementById('childrenList').innerHTML = '';
        
        const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
        fileModal.show();
    });

    // 文件类型变更事件
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
        
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>${file.type === 'folder' ? '文件夹' : '文件'}</td>
            <td>${file.url || '-'}</td>
            <td>${file.note || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-action edit-file" data-index="${index}">编辑</button>
                <button class="btn btn-sm btn-danger btn-action delete-file" data-index="${index}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加编辑和删除事件
    document.querySelectorAll('.edit-file').forEach(btn => {
        btn.addEventListener('click', function() {
            editFile(parseInt(this.getAttribute('data-index')));
        });
    });
    
    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteFile(parseInt(this.getAttribute('data-index')));
        });
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
    
    childDiv.innerHTML = `
        <div class="row">
            <div class="col-5">
                <input type="text" class="form-control form-control-sm child-name" placeholder="名称" value="${child ? child.name : ''}">
            </div>
            <div class="col-5">
                <input type="text" class="form-control form-control-sm child-url" placeholder="URL" value="${child ? child.url : ''}">
            </div>
            <div class="col-2">
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
    const type = document.getElementById('fileType').value;
    const url = document.getElementById('fileUrl').value;
    const note = document.getElementById('fileNote').value;
    
    if (!name) {
        alert('请输入名称');
        return;
    }
    
    let file = {
        name,
        type,
        url,
        note
    };
    
    if (type === 'folder') {
        file.children = [];
        file.expanded = false;
        
        document.querySelectorAll('.child-item').forEach(childItem => {
            const childName = childItem.querySelector('.child-name').value;
            const childUrl = childItem.querySelector('.child-url').value;
            
            if (childName) {
                file.children.push({
                    name: childName,
                    type: 'file',
                    url: childUrl
                });
            }
        });
    }
    
    try {
        let response;
        
        if (index === '') {
            // 添加新文件
            response = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(file)
            });
        } else {
            // 更新现有文件
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
        } else {
            const error = await response.json();
            alert(error.error || '保存失败');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        alert('保存文件失败');
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
        } else {
            const error = await response.json();
            alert(error.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('删除文件失败');
    }
}

// 加载留言列表
async function loadComments() {
    try {
        const response = await fetch('/api/comments', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (response.ok) {
            commentsList = await response.json();
            renderCommentsList();
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
        
        tr.innerHTML = `
            <td>${comment.name}</td>
            <td>${comment.content}</td>
            <td>${date}</td>
            <td>${comment.approved ? '<span class="badge bg-success">已审核</span>' : '<span class="badge bg-warning">待审核</span>'}</td>
            <td>
                ${!comment.approved ? `<button class="btn btn-sm btn-success btn-action approve-comment" data-id="${comment.id}">通过</button>` : ''}
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
            loadComments();
        } else {
            const error = await response.json();
            alert(error.error || '审核失败');
        }
    } catch (error) {
        console.error('Error approving comment:', error);
        alert('审核留言失败');
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
        } else {
            const error = await response.json();
            alert(error.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('删除留言失败');
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

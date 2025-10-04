// 全局变量
let files = [];
let comments = [];

// 从API获取文件列表
async function fetchFiles() {
    try {
        const response = await fetch('/api/files');
        if (response.ok) {
            files = await response.json();
        } else {
            // 如果API不可用，使用默认数据
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
        renderFileList();
    }
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    function renderItem(item) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url;
        a.className = 'file-name';
        
        // 将文件名和备注放在同一行显示
        if (item.note) {
            a.innerHTML = `${item.name} <span class="file-note">${item.note}</span>`;
        } else {
            a.textContent = item.name;
        }
        
        if (item.type === 'folder') {
            a.href += '/';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                item.expanded = !item.expanded;
                renderFileList();
            });
        }
        li.appendChild(a);
        fileList.appendChild(li);

        if (item.type === 'folder' && item.expanded && item.children) {
            const ul = document.createElement('ul');
            ul.style.display = 'block';
            // 将这里 padding-left 设置为 0 或者移除这一行
            ul.style.paddingLeft = '0px';
            ul.style.marginTop = '0px';
            item.children.forEach(child => {
                const childLi = renderItem(child);
                ul.appendChild(childLi);
            });
            li.appendChild(ul);
        }
        return li;
    }

    files.forEach(item => renderItem(item));
}

// 从API获取留言列表
async function fetchComments() {
    try {
        const response = await fetch('/api/comments');
        if (response.ok) {
            comments = await response.json();
            renderComments();
        } else {
            document.getElementById('commentsList').innerHTML = '<p>暂无留言</p>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        document.getElementById('commentsList').innerHTML = '<p>加载留言失败</p>';
    }
}

// 渲染留言列表
function renderComments() {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    // 只显示已审核的留言
    const approvedComments = comments.filter(comment => comment.approved);
    
    if (approvedComments.length === 0) {
        commentsList.innerHTML = '<p>暂无留言</p>';
        return;
    }
    
    approvedComments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        
        const date = new Date(comment.date).toLocaleString();
        
        commentItem.innerHTML = `
            <div class="comment-header">
                <span class="comment-name">${comment.name}</span>
                <span class="comment-date">${date}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
        `;
        
        commentsList.appendChild(commentItem);
    });
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
            const error = await response.json();
            showCommentStatus(error.error || '提交失败', 'error');
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
    statusElement.className = 'comment-status ' + type;
    
    setTimeout(() => {
        statusElement.className = 'comment-status';
    }, 3000);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取文件列表
    fetchFiles();
    
    // 获取留言列表
    fetchComments();
    
    // 添加留言表单提交事件
    document.getElementById('commentForm').addEventListener('submit', submitComment);
});
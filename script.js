// 全局变量
let files = [];
let comments = [];
let expandedFolderIndex = -1; // 记录当前展开的文件夹索引
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let totalComments = 0; // 总留言数

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
    console.log('Rendering file list...');
    const fileList = document.getElementById('fileList');
    if (!fileList) {
        console.error('File list element not found!');
        return;
    }
    fileList.innerHTML = '';
    
    console.log('Files to render:', files); // 添加调试日志

    function renderItem(item, index) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url || '#';
        a.className = 'file-name';
        
        // 构建显示内容
        let displayContent = item.name;
        
        // 如果有备注，添加备注
        if (item.note) {
            displayContent += ` <span class="file-note">${item.note}</span>`;
        }
        
        // 只有文件才显示创建时间
        if (item.type === 'file' && item.createdAt) {
            displayContent += ` <span class="file-date">新增日期${item.createdAt}</span>`;
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

        // 只有当前文件夹是展开状态时才显示子文件
        if (item.type === 'folder' && expandedFolderIndex === index && item.children && Array.isArray(item.children)) {
            const ul = document.createElement('ul');
            ul.style.display = 'block';
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

    // 确保 files 是数组
    if (Array.isArray(files)) {
        if (files.length === 0) {
            console.log('No files to display');
            fileList.innerHTML = '<li>暂无文件</li>';
        } else {
            files.forEach((item, index) => renderItem(item, index));
        }
    } else {
        console.error('Files is not an array:', files);
    }
}

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
    
    // 显示所有留言（包括未审核的）
    if (comments.length === 0) {
        commentsList.innerHTML = '<p>暂无留言</p>';
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
        
        // 构建留言内容
        let commentContent = `
            <div class="comment-header">
                <span class="comment-name">${contactDisplay}</span>
                <span class="comment-date">${date}</span>
            </div>
        `;
        
        // 如果留言未公开，显示提示信息
        if (!comment.approved) {
            commentContent += `<div class="comment-content"><em>此留言不公开，管理员回复后才能公开留言</em></div>`;
        } else {
            commentContent += `<div class="comment-content">${comment.content}</div>`;
            
            // 如果有管理员回复，则显示
            if (comment.reply) {
                commentContent += `
                    <div class="admin-reply mt-2 p-2 bg-light rounded">
                        <strong>管理员回复:</strong> ${comment.reply}
                    </div>
                `;
            }
        }
        
        commentItem.innerHTML = commentContent;
        
        commentsList.appendChild(commentItem);
    });
}

// 渲染留言统计信息
function renderCommentsStats() {
    const statsElement = document.getElementById('commentsStats');
    if (!statsElement) return;
    
    statsElement.innerHTML = `<p>共 <strong>${totalComments}</strong> 条留言</p>`;
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
    
    let paginationHTML = '<nav aria-label="留言分页"><ul class="pagination">';
    
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
    
    paginationHTML += '</ul></nav>';
    
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

// 提交留言
async function submitComment(event) {
    event.preventDefault();
    
    const contactType = document.getElementById('contactType').value;
    const contactInfo = document.getElementById('contactInfo').value;
    const content = document.getElementById('commentContent').value;
    const statusElement = document.getElementById('commentStatus');
    
    console.log('Submitting comment:', { contactType, contactInfo, content });
    
    if (!contactType || !contactInfo || !content) {
        showCommentStatus('请填写完整信息', 'error');
        return;
    }
    
    // 组合联系方式显示名称
    const name = `${contactType}:${contactInfo}`;
    
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, content })
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
});

// 添加一个窗口加载事件作为备选方案
window.addEventListener('load', function() {
    console.log('Window loaded');
});
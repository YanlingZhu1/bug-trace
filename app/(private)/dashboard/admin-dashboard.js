"use client";

import {useEffect, useState} from "react";
import {
    Table,
    Button,
    Input,
    Select,
    Modal,
    message,
    Tag,
    Space,
    Avatar,
    Card,
    Divider,
    Popconfirm,
    Col, Row, Segmented,

} from "antd";
import {
    MessageOutlined,
    EyeOutlined,
    UserOutlined,
    SendOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    CloseOutlined
} from "@ant-design/icons";

const {TextArea} = Input;

const STATUS_OPTIONS = [
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "closed",
];

export default function AdminDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [descTimers, setDescTimers] = useState({});
    const [assigningId, setAssigningId] = useState(null);
    const [devOptions, setDevOptions] = useState([]);
    const [viewMode, setViewMode] = useState("table");// table or card+

    // History modal state
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

    // Comment modal states
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBug, setSelectedBug] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);

    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState("");

    const currentUser = {
        id: "current-user-id",
        role: "admin"
    };

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?page=1&pageSize=50`);
            const data = await res.json();
            setList(data.items || []);
        } catch (err) {
            message.error("Failed to load bugs");
        } finally {
            setLoading(false);
        }
    };

    const loadDevelopers = async () => {
        try {
            const res = await fetch(`/api/users?roles=developer`);
            const data = await res.json();
            setDevOptions(
                (data.data || []).map((d) => ({
                    value: d.id,
                    label: d.displayName || d.username,
                }))
            );
        } catch (err) {
            message.error("Failed to load developers");
        }
    };

    useEffect(() => {
        load();
        loadDevelopers();
    }, []);

    const assign = async (id, developerId) => {
        try {
            setAssigningId(id);
            const res = await fetch(`/api/bugs/${id}/assign`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({developerId}),
            });

            if (!res.ok) {
                const {error} = await res.json().catch(() => ({}));
                throw new Error(error || "Assign failed");
            }

            message.success("Assigned");
            await load();
        } catch (err) {
            message.error(err.message);
        } finally {
            setAssigningId(null);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/bugs/${id}/status`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({status: newStatus}),
            });

            if (!res.ok) {
                const {error} = await res.json().catch(() => ({}));
                throw new Error(error || "Update status failed");
            }

            message.success("Status updated");
            await load();
        } catch (err) {
            message.error(err.message);
        }
    };

    const loadComments = async (bugId) => {
        try {
            setCommentLoading(true);
            const res = await fetch(`/api/bugs/${bugId}/comments`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to load comments");
            }

            const data = await res.json();
            setComments(data.data || []);
        } catch (err) {
            message.error("Failed to load comments: " + err.message);
            setComments([]);
        } finally {
            setCommentLoading(false);
        }
    };

    const openDetail = async (bug) => {
        setSelectedBug(bug);
        setDetailOpen(true);
        await loadComments(bug.id);
    };

    const addComment = async () => {
        if (!newComment.trim()) {
            message.error("Please enter comment content");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: newComment.trim()})
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to add comment");
            }

            message.success("Comment added");
            setNewComment("");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const startEditComment = (comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
    };

    const saveEditComment = async (commentId) => {
        if (!editContent.trim()) {
            message.error("Comment content cannot be empty");
            return;
        }

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    commentId: commentId,
                    content: editContent.trim()
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update comment");
            }

            message.success("Comment updated");
            setEditingComment(null);
            setEditContent("");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const cancelEditComment = () => {
        setEditingComment(null);
        setEditContent("");
    };

    const deleteComment = async (commentId) => {
        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({commentId: commentId})
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to delete comment");
            }

            message.success("Comment deleted");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const showDeleteConfirm = (id) => {
        Modal.confirm({
            title: "Are you sure delete this bug?",
            content: "This action cannot be undone.",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            getContainer: () => document.body,   // ⭐⭐ 必加！关键点 ⭐⭐
            onOk: () => handleDelete(id)
        });
    };


    async function handleDelete(id) {
        try {
            const res = await fetch(`/api/bugs/${id}`, {
                method: "DELETE",
                credentials: "include"
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                message.error("Delete failed: " + (data.error || "Unknown error"));
                return;
            }

            setList(prev => prev.filter(item => item.id !== id));

            message.success("Bug deleted successfully");
        } catch (err) {
            message.error("Delete error: " + err.message);
        }
    }


    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'red';
            case 'developer':
                return 'blue';
            case 'tester':
                return 'green';
            default:
                return 'default';
        }
    };

    const getUserDisplayName = (comment) => {
        if (comment.user) {
            return comment.user.displayName || comment.user.username || 'Unknown User';
        }
        return comment.userId ? comment.userId.slice(-8) : 'Unknown';
    };

    const canEditComment = (comment) => {
        return comment.userId === currentUser.id || currentUser.role === 'admin';
    };
    // Get color for status tag+
        const getStatusColor = (status) => {
        switch (status) {
            case "open":
                return "default";
            case "assigned":
                return "purple";
            case "in_progress":
                return "blue";
            case "resolved":
                return "green";
            case "rejected":
                return "red";
            case "closed":
                return "gray";
            default:
                return "default";
        }
    };
        // Format status label+
    const getStatusLabel = (status) => {
        return status.replace("_", " ");
    };

    //  Card view rendering: Group by status+
    const groupedByStatus = STATUS_OPTIONS.reduce((acc, status) => {
        acc[status] = [];
        return acc;
    }, {});

    list.forEach((bug) => {
        const key = bug.status || "open";
        if (!groupedByStatus[key]) groupedByStatus[key] = [];
        groupedByStatus[key].push(bug);
    });

    const columns = [
        {title: "Title", dataIndex: "title", width: 200, ellipsis: true},
        {
            title: "Status",
            dataIndex: "status",
            width: 100,
            render: (value, record) => (
                <Select
                    style={{width: '100%'}}
                    value={value}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({value: s, label: s}))}
                />
            ),
        },
        {title: "Priority", dataIndex: "priority", width: 100},
        {title: "Severity", dataIndex: "severity", width: 100},
        {
            title: "Assign",
            width: 120,
            render: (_, r) => (
                <Select
                    style={{width: '100%'}}
                    value={r?.assignee?.id || undefined}
                    loading={assigningId === r.id}
                    disabled={assigningId === r.id}
                    onChange={(v) => assign(r.id, v)}
                    options={devOptions}
                />
            ),
        },
        {
            title: "Comments",
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    danger
                    icon={<EyeOutlined/>}
                    onClick={() => openDetail(record)}
                >
                    view
                </Button>
            ),
        },
        {
            title: "Delete",
            width: 50,
            render: (_, record) => (
                <Popconfirm
                    title="Delete this bug?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes"
                    cancelText="No"
                    okType="danger"
                    getPopupContainer={(triggerNode) => triggerNode.parentElement}
                >
                    <Button danger>Delete</Button>
                </Popconfirm>

            ),
        },
    ];
        return (
        <div style={{ padding: 24 }}>
            {/* 顶部标题 + 视图切换 */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <h2 style={{ margin: 0 }}>Bug List</h2>
                <Segmented
                    options={[
                        { label: "Table", value: "table" },
                        { label: "Card View", value: "card" },
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                />
            </div>

            {/* 根据 viewMode 决定展示哪一种布局 */}
            {viewMode === "table" ? (
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={list}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                    }}
                />
            ) : (
                // ===== 卡片式看板布局 =====
                <Row gutter={[16, 16]}>
                    {STATUS_OPTIONS.map((status) => {
                        const bugs = groupedByStatus[status] || [];
                        return (
                            <Col xs={24} sm={12} md={8} lg={4} key={status}>
                                <Card
                                    size="small"
                                    style={{ height: "100%" }}
                                    title={
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>{getStatusLabel(status)}</span>
                                            <Tag color={getStatusColor(status)}>
                                                {bugs.length}
                                            </Tag>
                                        </div>
                                    }
                                >
                                    {bugs.length === 0 ? (
                                        <div style={{ color: "#999", fontSize: 12 }}>No bugs</div>
                                    ) : (
                                        bugs.map((bug) => (
                                            <Card
                                                key={bug.id}
                                                size="small"
                                                hoverable
                                                style={{ marginBottom: 8 }}
                                                onClick={() => openDetail(bug)}
                                            >
                                                {/* 标题 */}
                                                <div
                                                    style={{
                                                        fontWeight: "bold",
                                                        marginBottom: 4,
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span style={{ flex: 1 }}>{bug.title}</span>
                                                </div>

                                                {/* 优先级 + 严重程度 */}
                                                <div style={{ marginBottom: 4 }}>
                                                    <Tag color="orange">{bug.priority}</Tag>
                                                    <Tag color="red">{bug.severity}</Tag>
                                                </div>

                                                {/* 指派人 + 详情按钮 */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        fontSize: 12,
                                                        color: "#999",
                                                    }}
                                                >
                                                    <span>
                                                        {bug.assignee
                                                            ? bug.assignee.displayName || bug.assignee.username
                                                            : "Unassigned"}
                                                    </span>
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // 避免触发外层 onClick
                                                            openDetail(bug);
                                                        }}
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* ===== 下面两个 Modal 保持不变，直接放在同一个 return 里 ===== */}

            <Modal
                open={historyOpen}
                onCancel={() => setHistoryOpen(false)}
                title="History"
                footer={null}
                width={600}
            >
                {historyList.map((h) => (
                    <div
                        key={h.id}
                        style={{
                            padding: "10px 0",
                            borderBottom: "1px solid #eee",
                        }}
                    >
                        <div><b>Action:</b> {h.action}</div>
                        <div><b>Old:</b> {h.oldValue ?? "-"}</div>
                        <div><b>New:</b> {h.newValue ?? "-"}</div>
                        <div>
                            <b>User:</b>{" "}
                            {h?.user?.displayName || h?.user?.username || h.userId}
                        </div>
                        <div>
                            <b>Time:</b>{" "}
                            {new Date(h.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </Modal>

            <Modal
                open={detailOpen}
                onCancel={() => {
                    setDetailOpen(false);
                    setSelectedBug(null);
                    setComments([]);
                    setNewComment("");
                    setEditingComment(null);
                    setEditContent("");
                }}
                title={
                    selectedBug ? (
                        <div>
                            <MessageOutlined style={{ marginRight: 8 }} />
                            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                                {selectedBug.title}
                            </div>
                        </div>
                    ) : "Bug Details"
                }
                footer={null}
                width={900}
                style={{ top: 20 }}
            >
                {/* 这里保持你原来的评论区域代码不变 */}
                {selectedBug && (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* ... 你原来的 Card + Comments 内容 ... */}
                    </div>
                )}
            </Modal>
        </div>
    );
}
"use client";

import {useEffect, useState} from "react";
import {
    Table,
    Button,
    Input,
    Modal,
    message,
    Tag,
    Space,
    Avatar,
    Card,
    Divider,
    Select, Popconfirm,
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

export default function DeveloperDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 切换表格 / 卡片视图+
    const [viewMode, setViewMode] = useState("table"); // "table" | "card"

    // Comment modal states
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBug, setSelectedBug] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);

    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState("");

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/me");
                const data = await res.json();
                setCurrentUser(data.user);
            } catch {
                message.error("Failed to load user info");
            }
        })();
    }, []);

    const load = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?assigneeId=${currentUser.id}&page=1&pageSize=50`);
            const data = await res.json();
            setList(data.items || []);
        } catch (err) {
            message.error("Failed to load bugs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) load();
    }, [currentUser]);

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/bugs/${id}/status`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({status: newStatus}),
            });

            if (!res.ok) throw new Error("Status update failed");

            message.success("Status updated");
            await load();
        } catch (err) {
            message.error("Update failed");
        }
    };

    const loadComments = async (bugId) => {
        try {
            setCommentLoading(true);
            const res = await fetch(`/api/bugs/${bugId}/comments`);
            const data = await res.json();
            setComments(data.data || []);
        } catch (err) {
            message.error("Failed to load comments");
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
        if (!newComment.trim()) return message.error("Enter comment content");
        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({content: newComment.trim()}),
            });

            if (!res.ok) throw new Error("Failed to add comment");

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
        if (!editContent.trim()) return message.error("Comment cannot be empty");

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    commentId,
                    content: editContent.trim(),
                }),
            });

            if (!res.ok) throw new Error("Failed to update comment");

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
                body: JSON.stringify({commentId}),
            });

            if (!res.ok) throw new Error("Failed to delete comment");

            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const canEditComment = (comment) => {
        return comment.userId === currentUser?.id;
    };

    const getRoleColor = (role) => ({
        admin: "red",
        developer: "blue",
        tester: "green",
    }[role] || "default");

    const getUserDisplayName = (comment) =>
        comment.user?.displayName ||
        comment.user?.username ||
        comment.userId?.slice(-8);
    // —— 状态颜色 & 文本 —— +//
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

    const getStatusLabel = (status) => status.replace("_", " ");

    // —— 卡片视图用：按状态分组 —— +//
    const groupedByStatus = STATUS_OPTIONS.reduce((acc, status) => {
        acc[status] = [];
        return acc;
    }, {});

    list.forEach((bug) => {
        const key = bug.status || "open";
        if (!groupedByStatus[key]) groupedByStatus[key] = [];
        groupedByStatus[key].push(bug);
    });
    

    // ---------------- COLUMNS (Admin columns minus Assign & Delete)
    const columns = [
        {title: "Title", dataIndex: "title", width: 200, ellipsis: true},
        {
            title: "Status",
            dataIndex: "status",
            width: 100,
            render: (value, record) => (
                <Select
                    style={{width: "100%"}}
                    value={value}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({value: s, label: s}))}
                />
            ),
        },
        {title: "Priority", dataIndex: "priority", width: 100},
        {title: "Severity", dataIndex: "severity", width: 100},
        {
            title: "Comments",
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EyeOutlined/>}
                    onClick={() => openDetail(record)}
                >
                    view
                </Button>
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
                <h2 style={{ margin: 0 }}>My Bugs</h2>
                <Segmented
                    options={[
                        { label: "Table", value: "table" },
                        { label: "Card View", value: "card" },
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                />
            </div>

            {viewMode === "table" ? (
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={list}
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
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span>{getStatusLabel(status)}</span>
                                            <Tag color={getStatusColor(status)}>
                                                {bugs.length}
                                            </Tag>
                                        </div>
                                    }
                                >
                                    {bugs.length === 0 ? (
                                        <div
                                            style={{
                                                color: "#999",
                                                fontSize: 12,
                                            }}
                                        >
                                            No bugs
                                        </div>
                                    ) : (
                                        bugs.map((bug) => (
                                            <Card
                                                key={bug.id}
                                                size="small"
                                                hoverable
                                                style={{ marginBottom: 8 }}
                                                onClick={() => openDetail(bug)}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: "bold",
                                                        marginBottom: 4,
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span style={{ flex: 1 }}>
                                                        {bug.title}
                                                    </span>
                                                </div>

                                                <div style={{ marginBottom: 4 }}>
                                                    <Tag color="orange">
                                                        {bug.priority}
                                                    </Tag>
                                                    <Tag color="red">
                                                        {bug.severity}
                                                    </Tag>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        fontSize: 12,
                                                        color: "#999",
                                                    }}
                                                >
                                                    <span>{getStatusLabel(bug.status)}</span>
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
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

            {/* COMMENT MODAL */}
            <Modal
                open={detailOpen}
                onCancel={() => {
                    setDetailOpen(false);
                    setSelectedBug(null);
                    setComments([]);
                    setNewComment("");
                    setEditContent("");
                    setEditingComment(null);
                }}
                title={
                    selectedBug ? (
                        <div>
                            <MessageOutlined style={{ marginRight: 8 }} />
                            {selectedBug.title}
                        </div>
                    ) : (
                        "Bug Details"
                    )
                }
                footer={null}
                width={900}
                style={{ top: 20 }}
            >
                {selectedBug && (
                    <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <div>
                                <strong>Description:</strong>{" "}
                                {selectedBug.description}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <Tag color="blue">
                                    Status: {selectedBug.status}
                                </Tag>
                                <Tag color="orange">
                                    Priority: {selectedBug.priority}
                                </Tag>
                                <Tag color="red">
                                    Severity: {selectedBug.severity}
                                </Tag>
                            </div>
                        </Card>

                        <Divider>Comments ({comments.length})</Divider>

                        <Card size="small" style={{ marginBottom: 16 }}>
                            <TextArea
                                value={newComment}
                                placeholder="Write a comment..."
                                onChange={(e) => setNewComment(e.target.value)}
                                autoSize={{ minRows: 3 }}
                                style={{ marginBottom: 12 }}
                            />
                            <div style={{ textAlign: "right" }}>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    disabled={!newComment.trim()}
                                    onClick={addComment}
                                >
                                    Add Comment
                                </Button>
                            </div>
                        </Card>

                        {commentLoading ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: 20,
                                }}
                            >
                                Loading...
                            </div>
                        ) : comments.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: 20,
                                    color: "#999",
                                }}
                            >
                                No comments yet.
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <Card
                                    key={comment.id}
                                    size="small"
                                    style={{ marginBottom: 12 }}
                                >
                                    <div
                                        style={{ display: "flex", gap: 12 }}
                                    >
                                        <Avatar
                                            size="small"
                                            icon={<UserOutlined />}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {getUserDisplayName(comment)}
                                                </span>
                                                {comment.user?.role && (
                                                    <Tag
                                                        color={getRoleColor(
                                                            comment.user.role
                                                        )}
                                                        size="small"
                                                    >
                                                        {comment.user.role}
                                                    </Tag>
                                                )}
                                                <span
                                                    style={{
                                                        color: "#999",
                                                        fontSize: "12px",
                                                    }}
                                                >
                                                    {new Date(
                                                        comment.createdAt
                                                    ).toLocaleString()}
                                                </span>
                                            </div>

                                            {editingComment === comment.id ? (
                                                <div
                                                    style={{
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <TextArea
                                                        value={editContent}
                                                        onChange={(e) =>
                                                            setEditContent(
                                                                e.target.value
                                                            )
                                                        }
                                                        autoSize={{
                                                            minRows: 2,
                                                            maxRows: 6,
                                                        }}
                                                        style={{
                                                            marginBottom: 8,
                                                        }}
                                                    />
                                                    <Space>
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            onClick={() =>
                                                                saveEditComment(
                                                                    comment.id
                                                                )
                                                            }
                                                            icon={
                                                                <SaveOutlined />
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            onClick={
                                                                cancelEditComment
                                                            }
                                                            icon={
                                                                <CloseOutlined />
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Space>
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        marginBottom: 8,
                                                        lineHeight: "1.6",
                                                    }}
                                                >
                                                    {comment.content}
                                                </div>
                                            )}

                                            {editingComment !==
                                                comment.id &&
                                                canEditComment(comment) && (
                                                    <Space size="small">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            onClick={() =>
                                                                startEditComment(
                                                                    comment
                                                                )
                                                            }
                                                            icon={
                                                                <EditOutlined />
                                                            }
                                                            style={{
                                                                padding: 0,
                                                                height: "auto",
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>

                                                        <Popconfirm
                                                            title="Delete comment"
                                                            description="Are you sure you want to delete this comment?"
                                                            onConfirm={() =>
                                                                deleteComment(
                                                                    comment.id
                                                                )
                                                            }
                                                            okText="Yes"
                                                            cancelText="No"
                                                        >
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                danger
                                                                icon={
                                                                    <DeleteOutlined />
                                                                }
                                                                style={{
                                                                    padding: 0,
                                                                    height: "auto",
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </Popconfirm>
                                                    </Space>
                                                )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
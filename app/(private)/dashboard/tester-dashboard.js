"use client";

import { useEffect, useState } from "react";
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
    Select,
    Form,
    Popconfirm,
    Col,
    Row,
    Segmented,
} from "antd";
import {
    MessageOutlined,
    EyeOutlined,
    UserOutlined,
    SendOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    CloseOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;

const PRIORITY = ["low", "medium", "high", "critical"];
const SEVERITY = ["minor", "major", "critical"];
const STATUS_OPTIONS = [
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "closed",
];

export default function TesterDashboard() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    const [devOptions, setDevOptions] = useState([]);
    // view mode: "table" or "card"+
    const [viewMode, setViewMode] = useState("table");
    // Create Bug
    const [openCreate, setOpenCreate] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createForm] = Form.useForm();

    // Detail Modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBug, setSelectedBug] = useState(null);

    // Comments
    const [comments, setComments] = useState([]);
    const [commentLoading, setCommentLoading] = useState(false);
    const [newComment, setNewComment] = useState("");

    // comment edit/delete
    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState("");

    // History
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

    // Current user
    const [currentUser, setCurrentUser] = useState(null);

    // -----------------------------------------------------
    // Load user
    // -----------------------------------------------------
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

    // -----------------------------------------------------
    // Load bugs & developers
    // -----------------------------------------------------
    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bugs?page=1&pageSize=50`);
            const data = await res.json();
            setList(data.items || []);
        } catch {
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
        } catch {
            message.error("Failed to load developers");
        }
    };

    useEffect(() => {
        load();
        loadDevelopers();
    }, []);

    // -----------------------------------------------------
    // Assign
    // -----------------------------------------------------
    const assign = async (id, developerId) => {
        try {
            const res = await fetch(`/api/bugs/${id}/assign`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ developerId }),
            });

            if (!res.ok) throw new Error("Assign failed");

            message.success("Assigned");
            await load();
        } catch (err) {
            message.error(err.message);
        }
    };

    // -----------------------------------------------------
    // Update Status
    // -----------------------------------------------------
    const updateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/bugs/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Update status failed");

            message.success("Updated");
            await load();
        } catch (err) {
            message.error(err.message);
        }
    };

    // -----------------------------------------------------
    // Comments
    // -----------------------------------------------------
    const loadComments = async (bugId) => {
        try {
            setCommentLoading(true);
            const res = await fetch(`/api/bugs/${bugId}/comments`);
            const data = await res.json();
            setComments(data.data || []);
        } catch {
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
        if (!newComment.trim()) return;

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment.trim() }),
            });

            if (!res.ok) throw new Error("Failed to add");

            setNewComment("");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const canEditComment = (comment) =>
        comment.userId === currentUser?.id || currentUser?.role === "admin";

    const startEditComment = (comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
    };

    const cancelEditComment = () => {
        setEditingComment(null);
        setEditContent("");
    };

    const saveEditComment = async (commentId) => {
        if (!editContent.trim())
            return message.error("Comment content cannot be empty");

        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    commentId,
                    content: editContent.trim(),
                }),
            });

            if (!res.ok) throw new Error("Failed to update comment");

            message.success("Comment updated");
            setEditingComment(null);
            setEditContent("");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    const deleteComment = async (commentId) => {
        try {
            const res = await fetch(`/api/bugs/${selectedBug.id}/comments`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId }),
            });

            if (!res.ok) throw new Error("Failed to delete comment");

            message.success("Comment deleted");
            await loadComments(selectedBug.id);
        } catch (err) {
            message.error(err.message);
        }
    };

    // -----------------------------------------------------
    // History
    // -----------------------------------------------------
    const openHistory = async (bugId) => {
        try {
            const res = await fetch(`/api/bugs/${bugId}/history`);
            const data = await res.json();
            setHistoryList(data || []);
            setHistoryOpen(true);
        } catch {
            message.error("Failed to load history");
        }
    };

    // -----------------------------------------------------
    // Create bug
    // -----------------------------------------------------
    const createBug = async () => {
        try {
            const values = await createForm.validateFields();
            setCreateSubmitting(true);

            const res = await fetch(`/api/bugs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Create failed");

            message.success("Bug created");
            setOpenCreate(false);
            createForm.resetFields();
            await load();
        } catch (err) {
            message.error(err.message);
        } finally {
            setCreateSubmitting(false);
        }
    };
    // -----------------------------------------------------
    // Card view helpers & grouping
    // -----------------------------------------------------
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

    const groupedByStatus = STATUS_OPTIONS.reduce((acc, status) => {
        acc[status] = [];
        return acc;
    }, {});

    list.forEach((bug) => {
        const key = bug.status || "open";
        if (!groupedByStatus[key]) groupedByStatus[key] = [];
        groupedByStatus[key].push(bug);
    });
    // -----------------------------------------------------
    // Columns
    // -----------------------------------------------------
    const columns = [
        {title: "Title", dataIndex: "title", width: 200, ellipsis: true},
        {
            title: "Status",
            dataIndex: "status",
            width: 100,
            render: (value, record) => (
                <Select
                    value={value}
                    style={{width: '100%'}}
                    onChange={(v) => updateStatus(record.id, v)}
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
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
                    value={r?.assignee?.id}
                    placeholder="Pick developer"
                    onChange={(v) => assign(r.id, v)}
                    options={devOptions}
                />
            ),
        },
        {
            title: "Comments",
            width: 100,
            render: (_, r) => (
                <Button type="link" onClick={() => openDetail(r)}>
                    <EyeOutlined /> View
                </Button>
            ),
        },
    ];

    // -----------------------------------------------------
    // UI Render
    // -----------------------------------------------------
     return (
        <div style={{ padding: 24 }}>
            {/* 顶部：新建按钮 + 视图切换 */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <Button
                    type="primary"
                    onClick={() => setOpenCreate(true)}
                >
                    New Bug
                </Button>

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
                // 卡片式看板视图
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
                                                        justifyContent:
                                                            "space-between",
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
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        fontSize: 12,
                                                        color: "#999",
                                                    }}
                                                >
                                                    <span>
                                                        {bug.assignee
                                                            ? bug.assignee
                                                                  .displayName ||
                                                              bug.assignee
                                                                  .username
                                                            : "Unassigned"}
                                                    </span>
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

            {/* Create Bug Modal */}
            <Modal
                open={openCreate}
                onCancel={() => setOpenCreate(false)}
                onOk={createBug}
                confirmLoading={createSubmitting}
                title="Create New Bug"
            >
                <Form layout="vertical" form={createForm}>
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="Priority"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={PRIORITY.map((p) => ({
                                value: p,
                                label: p,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="severity"
                        label="Severity"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={SEVERITY.map((s) => ({
                                value: s,
                                label: s,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail + Comments Modal */}
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
                width={900}
                footer={null}
                title={
                    selectedBug ? (
                        <div>
                            <MessageOutlined style={{ marginRight: 8 }} />
                            {selectedBug.title}
                        </div>
                    ) : (
                        "Detail"
                    )
                }
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
                            <div style={{ marginTop: 8 }}>
                                <Button
                                    type="link"
                                    onClick={() => openHistory(selectedBug.id)}
                                >
                                    View History
                                </Button>
                            </div>
                        </Card>

                        <Divider>Comments ({comments.length})</Divider>

                        <Card size="small" style={{ marginBottom: 16 }}>
                            <TextArea
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) =>
                                    setNewComment(e.target.value)
                                }
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
                                        style={{
                                            display: "flex",
                                            gap: 12,
                                        }}
                                    >
                                        <Avatar
                                            size="small"
                                            icon={<UserOutlined />}
                                        />

                                        <div style={{ flex: 1 }}>
                                            {/* Header */}
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
                                                    {comment.user
                                                        ?.displayName ||
                                                        comment.user?.username ||
                                                        "Unknown"}
                                                </span>

                                                {comment.user?.role && (
                                                    <Tag
                                                        color={
                                                            comment.user
                                                                .role === "admin"
                                                                ? "red"
                                                                : comment.user
                                                                      .role ===
                                                                  "developer"
                                                                ? "blue"
                                                                : "green"
                                                        }
                                                    >
                                                        {comment.user.role}
                                                    </Tag>
                                                )}

                                                <span
                                                    style={{
                                                        color: "#999",
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {new Date(
                                                        comment.createdAt
                                                    ).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* 内容 or 编辑框 */}
                                            {editingComment ===
                                            comment.id ? (
                                                <div>
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
                                                            icon={
                                                                <SaveOutlined />
                                                            }
                                                            onClick={() =>
                                                                saveEditComment(
                                                                    comment.id
                                                                )
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            icon={
                                                                <CloseOutlined />
                                                            }
                                                            onClick={
                                                                cancelEditComment
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
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {comment.content}
                                                </div>
                                            )}

                                            {/* 编辑/删除 */}
                                            {editingComment !==
                                                comment.id &&
                                                canEditComment(comment) && (
                                                    <Space size="small">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={
                                                                <EditOutlined />
                                                            }
                                                            onClick={() =>
                                                                startEditComment(
                                                                    comment
                                                                )
                                                            }
                                                            style={{
                                                                padding: 0,
                                                                height: "auto",
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>

                                                        <Popconfirm
                                                            title="Delete comment?"
                                                            okText="Yes"
                                                            cancelText="No"
                                                            onConfirm={() =>
                                                                deleteComment(
                                                                    comment.id
                                                                )
                                                            }
                                                        >
                                                            <Button
                                                                type="text"
                                                                danger
                                                                size="small"
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

            {/* History Modal */}
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
                        <div>
                            <b>Action:</b> {h.action}
                        </div>
                        <div>
                            <b>Old:</b> {h.oldValue ?? "-"}
                        </div>
                        <div>
                            <b>New:</b> {h.newValue ?? "-"}
                        </div>
                        <div>
                            <b>User:</b>{" "}
                            {h.user?.displayName || h.user?.username}
                        </div>
                        <div>
                            <b>Time:</b>{" "}
                            {new Date(h.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </Modal>
        </div>
    );
}
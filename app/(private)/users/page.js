"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Input, Radio, Popconfirm,Col,Segmented,Row,Tag,Card, } from "antd";
import CreateOrEditUserModal from "./create-or-edit-user.modal";

const columns = (onEdit, onDelete) => [
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    { title: "Roles", dataIndex: "roles", key: "roles" },
    {
        title: "Action",
        key: "action",
        render: (_, record) => (
            <>
                <Button type="link" onClick={() => onEdit(record)}>
                    Edit
                </Button>
                <Popconfirm
                    title="Delete the user"
                    description="Are you sure to delete this user?"
                    onConfirm={() => onDelete(record)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button danger type="link">
                        Delete
                    </Button>
                </Popconfirm>
            </>
        ),
    },
];

const UserTable = () => {
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [editUser, setEditUser] = useState(null);
    // 视图模式：table / card+
    const [viewMode, setViewMode] = useState("table");

    const fetchData = useCallback(
        async ({ current, pageSize }) => {
            setLoading(true);
            const values = form.getFieldsValue();
            const query = new URLSearchParams({
                page: current,
                pageSize,
                username: values.username || "",
                displayName: values.displayName || "",
                roles: values.roles || "",
            }).toString();

            const res = await fetch(`/api/users?${query}`);
            const json = await res.json();

            setData(json.data);
            setPagination({ current, pageSize, total: json.pagination.total });
            setLoading(false);
        },
        [form]
    );

    useEffect(() => {
        fetchData({ current: 1, pageSize: 10 });
    }, [fetchData]);

    const handleTableChange = (pager) => {
        fetchData({ current: pager.current, pageSize: pager.pageSize });
    };

    const onFinish = () => {
        fetchData({ current: 1, pageSize: pagination.pageSize });
    };

    const handleEdit = (user) => {
        setEditUser(user);
        setModalVisible(true);
    };

    const handleDelete = (user) => {
        fetch(`/api/users/${user.id}`, { method: "DELETE" }).then(() => {
            fetchData({ current: 1, pageSize: pagination.pageSize });
        });
    };

    const handleModalOk = async (values) => {
        if (editUser) {
            await fetch(`/api/users/${editUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
        } else {
            await fetch(`/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
        }
        setModalVisible(false);
        setEditUser(null);
        fetchData({ current: 1, pageSize: pagination.pageSize });
    };
        // --------- Card view helpers & grouping by roles ----------
const ROLE_OPTIONS = ["admin", "developer", "tester"];

    const getRoleColor = (role) => {
        switch (role) {
            case "admin":
                return "red";
            case "developer":
                return "blue";
            case "tester":
                return "green";
            default:
                return "default";
        }
    };

    const getRoleLabel = (role) =>
        role ? role.charAt(0).toUpperCase() + role.slice(1) : "Unknown";

    // 根据当前 data，按 roles 分组 （你的 user.roles 是 "admin"/"developer"/"tester" 这样的字符串）
    const groupedByRole = ROLE_OPTIONS.reduce((acc, role) => {
        acc[role] = [];
        return acc;
    }, {});

    data.forEach((user) => {
        const key = user.roles || "developer"; // 你的数据里是 roles: "admin"/"developer"/"tester"
        if (!groupedByRole[key]) groupedByRole[key] = [];
        groupedByRole[key].push(user);
    });

    return (
        <>
            {/* 顶部：Add User + 视图切换 */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <Button
                    type="primary"
                    className="mb-4"
                    onClick={() => handleEdit(null)}
                >
                    Add User
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

            {/* 搜索表单 */}
            <Form
                form={form}
                layout="inline"
                initialValues={{ roles: "" }}
                onFinish={onFinish}
            >
                <Form.Item label="Username" name="username">
                    <Input />
                </Form.Item>
                <Form.Item label="Display Name" name="displayName">
                    <Input />
                </Form.Item>
                <Form.Item label="Roles" name="roles">
                    <Radio.Group>
                        <Radio value="">All</Radio>
                        <Radio value="admin">Admin</Radio>
                        <Radio value="developer">Developer</Radio>
                        <Radio value="tester">Tester</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>

            {/* 表格 / 卡片视图 */}
            {viewMode === "table" ? (
                <Table
                    className="pt-4"
                    columns={columns(handleEdit, handleDelete)}
                    dataSource={data}
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                    }}
                    onChange={handleTableChange}
                    rowKey="id"
                />
            ) : (
                <div className="pt-4">
                    <Row gutter={[16, 16]}>
                        {ROLE_OPTIONS.map((role) => {
                            const users = groupedByRole[role] || [];
                            return (
                                <Col xs={24} sm={12} md={8} lg={6} key={role}>
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
                                                <span>{getRoleLabel(role)}</span>
                                                <Tag color={getRoleColor(role)}>
                                                    {users.length}
                                                </Tag>
                                            </div>
                                        }
                                    >
                                        {users.length === 0 ? (
                                            <div
                                                style={{
                                                    color: "#999",
                                                    fontSize: 12,
                                                }}
                                            >
                                                No users
                                            </div>
                                        ) : (
                                            users.map((u) => (
                                                <Card
                                                    key={u.id}
                                                    size="small"
                                                    hoverable
                                                    style={{ marginBottom: 8 }}
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
                                                            {u.displayName ||
                                                                u.username ||
                                                                "Unknown"}
                                                        </span>
                                                    </div>

                                                    <div
                                                        style={{
                                                            marginBottom: 8,
                                                            fontSize: 12,
                                                            lineHeight: 1.6,
                                                        }}
                                                    >
                                                        <div>
                                                            <strong>Username: </strong>
                                                            {u.username}
                                                        </div>
                                                        {u.email && (
                                                            <div>
                                                                <strong>Email: </strong>
                                                                {u.email}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        <span>
                                                            Role:{" "}
                                                            <Tag
                                                                color={getRoleColor(
                                                                    u.roles
                                                                )}
                                                            >
                                                                {getRoleLabel(u.roles)}
                                                            </Tag>
                                                        </span>

                                                        <span>
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                onClick={() =>
                                                                    handleEdit(u)
                                                                }
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Popconfirm
                                                                title="Delete the user"
                                                                description="Are you sure to delete this user?"
                                                                onConfirm={() =>
                                                                    handleDelete(u)
                                                                }
                                                                okText="Yes"
                                                                cancelText="No"
                                                            >
                                                                <Button
                                                                    danger
                                                                    type="link"
                                                                    size="small"
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </Popconfirm>
                                                        </span>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </div>
            )}

            <CreateOrEditUserModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleModalOk}
                user={editUser}
            />
        </>
    );
};

export default UserTable;

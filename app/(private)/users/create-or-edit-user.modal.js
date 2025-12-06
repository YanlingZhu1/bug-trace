"use client";
import React, { useEffect } from "react";
import { Modal, Form, Input, Radio, } from "antd";

const EditUserModal = ({ visible, onCancel, onOk, user }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (user) {
                form.setFieldsValue({
                    displayName: user.displayName,
                    roles: user.roles,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({ roles: "developer" });
            }
        }
    }, [visible, user, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        onOk(values);
        form.resetFields();
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={user ? "Edit User" : "Add User"}
            open={visible}
            onCancel={handleCancel}
            onOk={handleOk}
        >
            <Form form={form} layout="vertical">
                {!user && (
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[
                            {
                                required: true,
                                message: "Please input username",
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                )}
                <Form.Item
                    label="Display Name"
                    name="displayName"
                    rules={[
                        {
                            required: true,
                            message: "Please input display name",
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Roles"
                    name="roles"
                    rules={[{ required: true, message: "Please select role" }]}
                >
                    <Radio.Group>
                        <Radio value="admin">Admin</Radio>
                        <Radio value="developer">Developer</Radio>
                        <Radio value="tester">Tester</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default EditUserModal;

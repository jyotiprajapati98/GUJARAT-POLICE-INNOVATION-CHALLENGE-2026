import { Modal, Form, Input, Button, message, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { streamingAPI } from '../../services/api.js'

const { Text } = Typography
const { TextArea } = Input

export default function AddStreamModal({ open, onClose, onSuccess, initialValues, editId }) {
  const [form] = Form.useForm()
  const isEdit = Boolean(editId)

  const handleOpen = () => {
    if (initialValues) {
      form.setFieldsValue(initialValues)
    } else {
      form.resetFields()
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Remove blank optional fields
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined && v !== '')
      )

      if (isEdit) {
        await streamingAPI.updateStream(editId, payload)
        message.success('Stream updated successfully')
      } else {
        await streamingAPI.createStream(payload)
        message.success('Stream registered successfully')
      }

      form.resetFields()
      onSuccess?.()
      onClose()
    } catch (err) {
      if (err?.errorFields) return // antd validation error, already shown
      const detail = err?.response?.data?.detail
      message.error(detail || (isEdit ? 'Failed to update stream' : 'Failed to register stream'))
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Edit Stream' : 'Register New Stream'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={isEdit ? 'Update' : 'Register'}
      cancelText="Cancel"
      width={600}
      destroyOnClose
      afterOpenChange={(visible) => { if (visible) handleOpen() }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        style={{ marginTop: 8 }}
      >
        <Form.Item
          name="name"
          label="Stream Name"
          rules={[{ required: true, message: 'Please enter a stream name' }]}
        >
          <Input placeholder="e.g. Main Gate Camera" />
        </Form.Item>

        <Form.Item
          name="rtsp_url"
          label="RTSP URL"
          rules={[
            { required: true, message: 'Please enter the RTSP URL' },
            {
              pattern: /^rtsp:\/\/.+/,
              message: 'URL must start with rtsp://',
            },
          ]}
          extra={
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Credentials are stored securely and masked in the UI
            </span>
          }
        >
          <Input
            placeholder="rtsp://admin:password@192.168.1.1:554"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item name="camera_id_label" label="Camera ID (optional)">
          <Input placeholder="e.g. MCD-TFC-001" />
        </Form.Item>

        <Form.Item name="department_name" label="Department (optional)">
          <Input placeholder="e.g. Traffic Control" />
        </Form.Item>

        <Form.Item name="main_stream_suffix" label="Main Stream Path Suffix (optional)">
          <Input placeholder="e.g. /Streaming/Channels/101" />
        </Form.Item>

        <Form.Item name="sub_stream_suffix" label="Sub Stream Path Suffix (optional)">
          <Input placeholder="e.g. /Streaming/Channels/102" />
        </Form.Item>

        <Form.Item name="description" label="Description (optional)">
          <TextArea rows={3} placeholder="Optional notes about this stream" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-title">
        <el-icon :size="28"><ChatDotRound /></el-icon>
        <span>AI Chat</span>
      </div>
      <div class="model-selector">
        <span class="label">模型：</span>
        <el-select v-model="selectedModel" placeholder="选择模型" size="default" :loading="modelsLoading">
          <el-option
            v-for="model in models"
            :key="model.id"
            :label="model.id"
            :value="model.id"
          >
            <span>{{ model.id }}</span>
            <span style="color: #999; font-size: 12px; margin-left: 8px;">{{ model.owned_by }}</span>
          </el-option>
        </el-select>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <el-icon :size="64" color="#c0c4cc"><ChatDotRound /></el-icon>
        <p>开始与AI对话吧</p>
      </div>
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
        <div class="message-avatar">
          <el-avatar v-if="msg.role === 'user'" :size="36">
            <el-icon><User /></el-icon>
          </el-avatar>
          <el-avatar v-else :size="36" style="background: #409eff;">
            <el-icon><Monitor /></el-icon>
          </el-avatar>
        </div>
        <div class="message-content">
          <div class="message-role">{{ msg.role === 'user' ? '你' : 'AI助手' }}</div>
          <div class="message-text">
            <pre v-if="msg.role === 'assistant'">{{ msg.content }}</pre>
            <span v-else>{{ msg.content }}</span>
          </div>
        </div>
      </div>
      <div v-if="loading" class="message assistant">
        <div class="message-avatar">
          <el-avatar :size="36" style="background: #409eff;">
            <el-icon><Monitor /></el-icon>
          </el-avatar>
        </div>
        <div class="message-content">
          <div class="message-role">AI助手</div>
          <div class="message-text loading-text">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="输入消息..."
        @keydown.enter.ctrl="sendMessage"
        :disabled="loading"
      />
      <div class="input-actions">
        <span class="tip">Ctrl + Enter 发送</span>
        <el-button type="primary" @click="sendMessage" :loading="loading" :disabled="!inputMessage.trim()">
          <el-icon><Position /></el-icon>
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { chatApi } from '../api/chat'

const messages = ref([])
const inputMessage = ref('')
const loading = ref(false)
const selectedModel = ref('')
const models = ref([])
const modelsLoading = ref(false)
const messagesContainer = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const fetchModels = async () => {
  modelsLoading.value = true
  try {
    const data = await chatApi.getModels()
    models.value = data || []
    if (models.value.length > 0 && !selectedModel.value) {
      selectedModel.value = models.value[0].id
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    ElMessage.error('获取模型列表失败')
  } finally {
    modelsLoading.value = false
  }
}

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || loading.value) return

  messages.value.push({
    role: 'user',
    content: message
  })
  inputMessage.value = ''
  loading.value = true
  scrollToBottom()

  const assistantMessage = {
    role: 'assistant',
    content: ''
  }
  messages.value.push(assistantMessage)
  scrollToBottom()

  try {
    await chatApi.sendMessageStream(
      message,
      selectedModel.value,
      (chunk) => {
        assistantMessage.content += chunk
        scrollToBottom()
      },
      (error) => {
        console.error('发送消息失败:', error)
        ElMessage.error('发送消息失败，请重试')
        loading.value = false
      },
      () => {
        loading.value = false
        scrollToBottom()
      }
    )
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败，请重试')
    loading.value = false
  }
}

onMounted(() => {
  fetchModels()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-selector .label {
  color: #606266;
  font-size: 14px;
}

.model-selector .el-select {
  width: 220px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-role {
  font-size: 12px;
  color: #909399;
}

.message.user .message-role {
  text-align: right;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.message.user .message-text {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-text {
  background: #fff;
  color: #303133;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.message.assistant .message-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

.loading-text {
  display: flex;
  gap: 4px;
  padding: 16px 20px !important;
}

.dot {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.chat-input {
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.tip {
  font-size: 12px;
  color: #909399;
}
</style>
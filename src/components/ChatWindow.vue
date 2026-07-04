<template>
    <div class="chat-container">
        <div class="chat-header">
            <h2>AI Chat</h2>
            <el-select v-model="selectedModel" placeholder="选择模型" class="model-select">
                <el-option v-for="model in models" :key="model" :label="model" :value="model"/>
            </el-select>
        </div>

        <div class="chat-messages" ref="messagesContainer">
            <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
                <div class="message-content">
                    <div v-if="msg.reasoning" class="reasoning-section">
                        <div class="reasoning-header" @click="toggleReasoning(index)">
                            <span class="reasoning-toggle">{{ msg.showReasoning ? '▼' : '▶' }}</span>
                            <span>思考过程</span>
                        </div>
                        <div v-show="msg.showReasoning" class="reasoning-content"
                             v-html="renderMarkdown(msg.reasoning)"></div>
                    </div>
                    <div v-html="renderMarkdown(msg.content)"></div>
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
            <el-button type="primary" @click="sendMessage" :loading="loading"
                       :disabled="!inputMessage.trim() || !selectedModel">
                发送
            </el-button>
        </div>
    </div>
</template>

<script setup>
    import {nextTick, onMounted, ref} from 'vue'
    import {api} from '../api/api.js'
    import {marked} from 'marked'
    import hljs from 'highlight.js'

    const messages = ref([])
    const inputMessage = ref('')
    const selectedModel = ref('')
    const models = ref([])
    const loading = ref(false)
    const messagesContainer = ref(null)

    marked.setOptions({
        highlight: function (code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, {language: lang}).value
            }
            return hljs.highlightAuto(code).value
        },
        breaks: true
    })

    const renderMarkdown = (content) => {
        return marked.parse(content)
    }

    const scrollToBottom = async () => {
        await nextTick()
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    }

    const toggleReasoning = (index) => {
        messages.value[index].showReasoning = !messages.value[index].showReasoning
    }

    const parseSSE = (text) => {
        const events = []
        const lines = text.split('\n')
        let currentEvent = null

        for (const line of lines) {
            if (line.startsWith('event:')) {
                if (currentEvent) events.push(currentEvent)
                currentEvent = {event: line.slice(6).trim(), data: ''}
            } else if (line.startsWith('data:')) {
                if (currentEvent) {
                    currentEvent.data = line.slice(5).trim()
                }
            } else if (line === '' && currentEvent) {
                events.push(currentEvent)
                currentEvent = null
            }
        }
        if (currentEvent) events.push(currentEvent)
        return events
    }

    const sendMessage = async () => {
        const message = inputMessage.value.trim()
        if (!message || !selectedModel.value || loading.value) return

        messages.value.push({role: 'user', content: message})
        inputMessage.value = ''
        loading.value = true
        await scrollToBottom()

        try {
            const response = await api.sendMessageStream(message, selectedModel.value)

            if (!response.ok) {
                throw new Error('请求失败')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let assistantMessage = {role: 'assistant', content: '', reasoning: '', showReasoning: false}
            messages.value.push(assistantMessage)
            const assistantIndex = messages.value.length - 1

            while (true) {
                const {done, value} = await reader.read()
                if (done) break

                buffer += decoder.decode(value, {stream: true})
                const events = parseSSE(buffer)
                buffer = ''

                for (const event of events) {
                    if (event.event === 'raw' && event.data) {
                        try {
                            const data = JSON.parse(event.data)
                            const delta = data.choices?.[0]?.delta

                            if (delta) {
                                if (delta.reasoning_content) {
                                    messages.value[assistantIndex].reasoning += delta.reasoning_content
                                    messages.value[assistantIndex].showReasoning = true
                                }
                                if (delta.content) {
                                    messages.value[assistantIndex].content += delta.content
                                }
                                await scrollToBottom()
                            }
                        } catch (e) {
                            // JSON解析失败，忽略
                        }
                    }
                }
            }

            if (messages.value[assistantIndex].reasoning) {
                messages.value[assistantIndex].showReasoning = false
            }
        } catch (error) {
            console.error('发送消息失败:', error)
            messages.value.push({role: 'assistant', content: '抱歉，发生了错误，请重试。'})
        } finally {
            loading.value = false
        }
    }

    onMounted(async () => {
        try {
            const data = await api.getModels()
            models.value = data.models || data || []
            if (models.value.length > 0) {
                selectedModel.value = models.value[0].id
            }
        } catch (error) {
            console.error('获取模型列表失败:', error)
        }
    })
</script>

<style scoped>
    .chat-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #f5f5f5;
    }

    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #fff;
        border-bottom: 1px solid #e4e4e4;
    }

    .chat-header h2 {
        margin: 0;
        font-size: 20px;
    }

    .model-select {
        width: 200px;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }

    .message {
        margin-bottom: 16px;
        display: flex;
    }

    .message.user {
        justify-content: flex-end;
    }

    .message.user .message-content {
        background: #409eff;
        color: #fff;
    }

    .message.assistant .message-content {
        background: #fff;
        color: #333;
    }

    .message-content {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 8px;
        line-height: 1.6;
        word-wrap: break-word;
    }

    .message-content :deep(pre) {
        background: #282c34;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        color: #abb2bf;
    }

    .message-content :deep(code) {
        font-family: 'Fira Code', monospace;
        font-size: 14px;
    }

    .message-content :deep(p) {
        margin: 8px 0;
    }

    .reasoning-section {
        margin-bottom: 12px;
        border-left: 3px solid #e6a23c;
        padding-left: 12px;
    }

    .reasoning-header {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: #e6a23c;
        font-size: 14px;
        font-weight: 500;
        user-select: none;
    }

    .reasoning-toggle {
        font-size: 12px;
    }

    .reasoning-content {
        margin-top: 8px;
        padding: 10px 12px;
        background: #fdf6ec;
        border-radius: 4px;
        color: #666;
        font-size: 14px;
    }

    .reasoning-content :deep(p) {
        margin: 4px 0;
    }

    .loading {
        color: #999;
    }

    .chat-input {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        background: #fff;
        border-top: 1px solid #e4e4e4;
    }

    .chat-input .el-textarea {
        flex: 1;
    }
</style>
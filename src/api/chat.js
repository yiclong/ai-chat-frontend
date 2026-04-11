import axios from 'axios'

const API_BASE = '/api/chat'

export const chatApi = {
  async getConfig() {
    const response = await axios.get(`${API_BASE}/config`)
    return response.data
  },

  async getModels() {
    const response = await axios.get(`${API_BASE}/models`)
    return response.data
  },

  sendMessageStream(message, model, onChunk, onError, onComplete) {
    return fetch(`${API_BASE}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, model })
    })
      .then(response => {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentEvent = ''

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              if (onComplete) onComplete()
              return
            }
            buffer += decoder.decode(value, { stream: true })
            
            while (true) {
              const newlineIndex = buffer.indexOf('\n')
              if (newlineIndex === -1) break
              
              const line = buffer.slice(0, newlineIndex).trim()
              buffer = buffer.slice(newlineIndex + 1)
              
              if (!line) continue

              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim()
                continue
              }

              if (line.startsWith('data:')) {
                const data = line.slice(5).trim()
                if (!data) continue

                if (currentEvent === 'raw') {
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.choices && parsed.choices[0]?.delta?.content) {
                      onChunk(parsed.choices[0].delta.content)
                    }
                  } catch (e) {}
                  currentEvent = ''
                }
              }
            }
            read()
          }).catch(onError)
        }
        read()
      })
      .catch(onError)
  }
}
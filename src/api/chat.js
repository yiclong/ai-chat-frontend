import axios from 'axios'
import { EventSourcePolyfill } from 'event-source-polyfill'

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

  sendMessage(message, model, onMessage, onError, onComplete) {
    const eventSource = new EventSourcePolyfill(`${API_BASE}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, model })
    })

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close()
        if (onComplete) onComplete()
        return
      }
      try {
        const data = JSON.parse(event.data)
        if (data.choices && data.choices[0]?.delta?.content) {
          onMessage(data.choices[0].delta.content)
        }
      } catch (e) {
        onMessage(event.data)
      }
    }

    eventSource.onerror = (error) => {
      eventSource.close()
      if (onError) onError(error)
    }

    return eventSource
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

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              if (onComplete) onComplete()
              return
            }
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  if (onComplete) onComplete()
                  return
                }
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.choices && parsed.choices[0]?.delta?.content) {
                    onChunk(parsed.choices[0].delta.content)
                  }
                } catch (e) {
                  if (data) onChunk(data)
                }
              }
            })
            read()
          }).catch(onError)
        }
        read()
      })
      .catch(onError)
  }
}
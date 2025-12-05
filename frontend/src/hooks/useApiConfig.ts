import { useState, useEffect } from 'react'

const API_CONFIG_KEY = 'prism-api-config'

interface ApiConfig {
  baseUrl: string
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:3000/api'
}

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    const savedConfig = localStorage.getItem(API_CONFIG_KEY)
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setConfig({ ...DEFAULT_CONFIG, ...parsed })
      } catch (error) {
        console.error('Failed to parse saved API config:', error)
      }
    }
  }, [])

  const updateConfig = (newConfig: Partial<ApiConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(updatedConfig))
  }

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
    localStorage.removeItem(API_CONFIG_KEY)
  }

  return {
    config,
    updateConfig,
    resetConfig
  }
}
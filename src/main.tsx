import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DataProvider } from './contexts/DataContext'

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
)
